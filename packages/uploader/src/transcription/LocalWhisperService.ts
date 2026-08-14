import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import readline from 'readline';
import path from 'path';
import { TranscriptResult, TranscriptionService } from './TranscriptionService';

const WHISPER_SCRIPT = path.join(__dirname, '../../python/whisper_transcribe.py');
const MAX_SPAWN_ATTEMPTS = 3;
const SPAWN_RETRY_DELAY_MS = 500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface PendingRequest {
  resolve: (result: TranscriptResult) => void;
  reject: (err: Error) => void;
}

// Keeps a single long-lived Python worker alive for the life of a sync run,
// so the ~3GB large-v3 model is loaded into VRAM once instead of once per
// file (the previous design spawned a fresh interpreter + model per call).
export class LocalWhisperService implements TranscriptionService {
  private pythonBin: string;
  private worker: ChildProcessWithoutNullStreams | null = null;
  private workerReady: Promise<void> | null = null;
  private pending: PendingRequest[] = [];

  constructor(pythonBin = 'python') {
    this.pythonBin = pythonBin;
  }

  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn(this.pythonBin, [WHISPER_SCRIPT, '--check'], { stdio: 'pipe' });
      proc.on('close', (code) => resolve(code === 0));
      proc.on('error', () => resolve(false));
    });
  }

  // Spawn-level failures (e.g. Windows' intermittent "AssignProcessToJobObject"
  // error under sandboxed/restricted environments) are transient OS-level
  // flakiness — worth a few retries. Only matters once per run now, since the
  // worker is spawned a single time rather than once per file.
  private async startWorker(): Promise<void> {
    if (this.workerReady) return this.workerReady;

    this.workerReady = (async () => {
      let lastErr: unknown;
      for (let attempt = 1; attempt <= MAX_SPAWN_ATTEMPTS; attempt++) {
        try {
          await this.spawnWorkerOnce();
          return;
        } catch (err) {
          lastErr = err;
          const isSpawnFailure = (err as { spawnFailure?: boolean }).spawnFailure;
          if (!isSpawnFailure || attempt === MAX_SPAWN_ATTEMPTS) throw err;
          await delay(SPAWN_RETRY_DELAY_MS);
        }
      }
      throw lastErr;
    })();

    return this.workerReady;
  }

  private spawnWorkerOnce(): Promise<void> {
    return new Promise((resolveReady, rejectReady) => {
      const proc = spawn(this.pythonBin, [WHISPER_SCRIPT, '--worker'], { stdio: 'pipe' });
      let stderr = '';
      let readyReceived = false;

      const rl = readline.createInterface({ input: proc.stdout });

      rl.on('line', (line) => {
        if (!readyReceived) {
          readyReceived = true;
          this.worker = proc;
          resolveReady();
          return;
        }

        const next = this.pending.shift();
        if (!next) return;

        try {
          const parsed = JSON.parse(line);
          if (parsed.error) {
            next.reject(new Error(parsed.error));
          } else {
            next.resolve({ text: parsed.text, confidence: parsed.confidence });
          }
        } catch {
          next.reject(new Error(`Failed to parse worker output: ${line}`));
        }
      });

      proc.stderr.on('data', (d: Buffer) => (stderr += d.toString()));

      proc.on('error', (err) => {
        if (!readyReceived) rejectReady(Object.assign(err, { spawnFailure: true }));
        this.failAllPending(err);
      });

      proc.on('close', (code) => {
        this.worker = null;
        this.workerReady = null;
        const err = new Error(`Whisper worker exited unexpectedly (code ${code}): ${stderr}`);
        if (!readyReceived) rejectReady(err);
        this.failAllPending(err);
      });
    });
  }

  private failAllPending(err: Error): void {
    while (this.pending.length) {
      this.pending.shift()!.reject(err);
    }
  }

  async transcribe(audioPath: string): Promise<TranscriptResult> {
    await this.startWorker();
    if (!this.worker) throw new Error('Whisper worker not running');

    return new Promise((resolve, reject) => {
      this.pending.push({ resolve, reject });
      this.worker!.stdin.write(audioPath.replace(/\r?\n/g, '') + '\n');
    });
  }

  close(): void {
    if (this.worker) {
      this.failAllPending(new Error('Whisper worker closed'));
      this.worker.stdin.end();
      this.worker.kill();
      this.worker = null;
    }
    this.workerReady = null;
  }
}

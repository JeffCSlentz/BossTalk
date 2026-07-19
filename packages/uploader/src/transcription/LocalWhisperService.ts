import { spawn } from 'child_process';
import path from 'path';
import { TranscriptResult, TranscriptionService } from './TranscriptionService';

const WHISPER_SCRIPT = path.join(__dirname, '../../python/whisper_transcribe.py');

export class LocalWhisperService implements TranscriptionService {
  private pythonBin: string;

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

  async transcribe(audioPath: string): Promise<TranscriptResult> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      const proc = spawn(this.pythonBin, [WHISPER_SCRIPT, audioPath], { stdio: 'pipe' });

      proc.stdout.on('data', (d: Buffer) => (stdout += d.toString()));
      proc.stderr.on('data', (d: Buffer) => (stderr += d.toString()));

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Whisper exited ${code}: ${stderr}`));
          return;
        }
        try {
          const result = JSON.parse(stdout) as TranscriptResult;
          resolve(result);
        } catch {
          reject(new Error(`Failed to parse Whisper output: ${stdout}`));
        }
      });

      proc.on('error', reject);
    });
  }
}

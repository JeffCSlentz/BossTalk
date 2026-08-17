import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const PAD_START = '0.1';
const PAD_END = '0.8';

// sox_ng (the maintained fork) ships its binary as sox_ng, not sox
const SOX_BIN = process.env.SOX_BIN ?? 'sox_ng';

/**
 * Uses SOX to add silence padding to an .ogg file.
 * Returns path to a temp file containing the padded audio.
 * Caller is responsible for deleting the returned file.
 */
export async function padAudio(inputPath: string): Promise<string> {
  const tmpPath = path.join(os.tmpdir(), `bosstalk-pad-${Date.now()}-${path.basename(inputPath)}`);
  await execFileAsync(SOX_BIN, [inputPath, tmpPath, 'pad', PAD_START, PAD_END]);
  return tmpPath;
}

export async function isSoxAvailable(): Promise<boolean> {
  try {
    await execFileAsync(SOX_BIN, ['--version']);
    return true;
  } catch {
    return false;
  }
}

export function cleanupPadded(paddedPath: string): void {
  if (fs.existsSync(paddedPath)) fs.unlinkSync(paddedPath);
}

import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const SOX_BIN = process.env.SOX_BIN ?? 'sox_ng';

// OpenAI's audio endpoints don't officially list .ogg as a supported input
// format. Converting to .wav first sidesteps that regardless of source format.
export async function convertToWav(inputPath: string): Promise<string> {
  const base = path.basename(inputPath, path.extname(inputPath));
  const tmpPath = path.join(os.tmpdir(), `bosstalk-conv-${Date.now()}-${base}.wav`);
  await execFileAsync(SOX_BIN, [inputPath, tmpPath]);
  return tmpPath;
}

export function cleanupConverted(convertedPath: string): void {
  if (fs.existsSync(convertedPath)) fs.unlinkSync(convertedPath);
}

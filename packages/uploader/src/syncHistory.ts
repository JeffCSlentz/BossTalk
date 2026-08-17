import fs from 'fs';
import path from 'path';

const HISTORY_PATH = path.join(process.cwd(), 'logs', 'uploader', 'sync-history.log');
const MAX_ENTRIES = 90;

// One line per sync run, most recent first — for glancing at overall status
// (e.g. from a Windows service) without digging through a full day's log.
export function recordSyncHistory(message: string): void {
  const timestamp = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const line = `${timestamp} — ${message}`;

  fs.mkdirSync(path.dirname(HISTORY_PATH), { recursive: true });
  const existing = fs.existsSync(HISTORY_PATH) ? fs.readFileSync(HISTORY_PATH, 'utf8') : '';
  const lines = existing.split('\n').filter(Boolean);
  lines.unshift(line);
  fs.writeFileSync(HISTORY_PATH, lines.slice(0, MAX_ENTRIES).join('\n') + '\n', 'utf8');
}

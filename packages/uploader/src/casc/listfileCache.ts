import crypto from 'node:crypto';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import logger from '../logger';

const LISTFILE_URL = 'https://github.com/wowdev/wow-listfile/releases/latest/download/community-listfile.csv';
const SOUND_CREATURE_PREFIX = 'sound/creature/';
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface ListfileEntry {
  fileDataID: number;
  filePath: string;
  fileKey: string; // normalized to sounds/creature/<slug>/<file>
}

function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'BossTalk-Uploader/1.0' } }, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        resolve(fetchText(res.headers.location));
        return;
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c: string) => (body += c));
      res.on('end', () => resolve(body));
      res.on('error', reject);
    }).on('error', reject);
  });
}

export interface LoadListfileResult {
  entries: ListfileEntry[];
  // Whether the listfile's contents differ from the last time this was called
  // for this cacheDir — a cheap signal for "could there be anything new here?"
  // that doesn't require the expensive CASC init to compute.
  changed: boolean;
}

/**
 * Downloads the community listfile and caches it to disk.
 * Returns only sound/creature entries mapped to our fileKey convention.
 */
export async function loadListfile(cacheDir: string): Promise<LoadListfileResult> {
  const cachePath = path.join(cacheDir, 'community-listfile.csv');
  const hashPath = path.join(cacheDir, 'community-listfile.hash');

  let csv: string;
  if (fs.existsSync(cachePath)) {
    const age = Date.now() - fs.statSync(cachePath).mtimeMs;
    if (age < CACHE_MAX_AGE_MS) {
      logger.info('[listfile] Using cached listfile');
      csv = fs.readFileSync(cachePath, 'utf8');
    } else {
      logger.info('[listfile] Cached listfile is stale, re-downloading');
      csv = await fetchText(LISTFILE_URL);
      fs.writeFileSync(cachePath, csv, 'utf8');
    }
  } else {
    logger.info('[listfile] Downloading community listfile...');
    csv = await fetchText(LISTFILE_URL);
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(cachePath, csv, 'utf8');
    logger.info('[listfile] Listfile cached');
  }

  const hash = crypto.createHash('sha256').update(csv).digest('hex');
  const previousHash = fs.existsSync(hashPath) ? fs.readFileSync(hashPath, 'utf8').trim() : null;
  const changed = hash !== previousHash;
  fs.writeFileSync(hashPath, hash, 'utf8');

  const entries: ListfileEntry[] = [];
  for (const line of csv.split('\n')) {
    const semi = line.indexOf(';');
    if (semi < 0) continue;
    const fileDataID = parseInt(line.slice(0, semi), 10);
    const filePath = line.slice(semi + 1).trim().toLowerCase();
    if (!filePath.startsWith(SOUND_CREATURE_PREFIX)) continue;
    if (!filePath.endsWith('.ogg')) continue;
    const parts = filePath.split('/');
    if (parts.length < 4) continue;
    const creature = parts[2];
    // Blizzard occasionally nests an extra subfolder under a creature
    // (e.g. ragnaros/ragnaros_mount/foo.ogg) — flatten any depth into a
    // single file name rather than assuming exactly one filename segment.
    const file = parts.slice(3).join('_');
    entries.push({
      fileDataID,
      filePath,
      fileKey: `sounds/creature/${creature}/${file}`,
    });
  }

  logger.info(`[listfile] ${entries.length} sound/creature entries found${changed ? ' (manifest changed)' : ' (manifest unchanged)'}`);
  return { entries, changed };
}

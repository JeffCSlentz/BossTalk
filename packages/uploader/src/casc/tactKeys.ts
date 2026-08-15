import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import logger from '../logger';

const TACT_KEYS_URL = 'https://raw.githubusercontent.com/wowdev/TACTKeys/master/WoW.txt';
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

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

/**
 * Downloads and caches the community-maintained TACT decryption key list
 * (https://github.com/wowdev/TACTKeys). Some WoW sound assets are
 * BLTE-encrypted — Blizzard withholds the key until the tied content ships,
 * to keep it from being datamined early — so without these keys,
 * BLTEDecoder can't recover that audio at all.
 */
export async function loadTactKeys(cacheDir: string): Promise<Map<string, Uint8Array>> {
  const cachePath = path.join(cacheDir, 'tact-keys.txt');

  let text: string;
  if (fs.existsSync(cachePath) && Date.now() - fs.statSync(cachePath).mtimeMs < CACHE_MAX_AGE_MS) {
    logger.info('[tactkeys] Using cached key list');
    text = fs.readFileSync(cachePath, 'utf8');
  } else {
    logger.info('[tactkeys] Downloading TACT key list...');
    text = await fetchText(TACT_KEYS_URL);
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(cachePath, text, 'utf8');
  }

  const keys = new Map<string, Uint8Array>();
  for (const line of text.split('\n')) {
    const [name, key] = line.trim().split(/\s+/);
    if (!name || !key || name.length !== 16 || key.length !== 32) continue;
    keys.set(name.toLowerCase(), new Uint8Array(Buffer.from(key, 'hex')));
  }

  logger.info(`[tactkeys] Loaded ${keys.size} decryption keys`);
  return keys;
}

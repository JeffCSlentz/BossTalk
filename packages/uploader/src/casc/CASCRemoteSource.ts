import fs from 'fs';
import https from 'https';
import path from 'path';
import { isBannedPath, MIN_FILE_SIZE_BYTES } from '@bosstalk/shared';
import type { DiscoveredSound, SoundSource } from './SoundSource';

const LISTFILE_URL = 'https://github.com/wowdev/wow-listfile/releases/latest/download/community-listfile.csv';
const SOUND_CREATURE_PREFIX = 'sound/creature/';

export class CASCRemoteSource implements SoundSource {
  readonly name = 'casc-remote';

  private region: string;
  private product: string;
  private listfileCache: Map<number, string> | null = null;

  constructor(region = 'us', product = 'wow') {
    this.region = region;
    this.product = product;
  }

  private async fetchListfile(): Promise<Map<number, string>> {
    if (this.listfileCache) return this.listfileCache;

    const csv = await fetchText(LISTFILE_URL);
    const map = new Map<number, string>();
    for (const line of csv.split('\n')) {
      const semi = line.indexOf(';');
      if (semi < 0) continue;
      const id = parseInt(line.slice(0, semi), 10);
      const filePath = line.slice(semi + 1).trim().toLowerCase();
      if (!isNaN(id) && filePath) map.set(id, filePath);
    }
    this.listfileCache = map;
    return map;
  }

  async listSounds(creatureFilter?: string): Promise<DiscoveredSound[]> {
    const listfile = await this.fetchListfile();
    const sounds: DiscoveredSound[] = [];

    for (const [, filePath] of listfile) {
      if (!filePath.startsWith(SOUND_CREATURE_PREFIX)) continue;
      if (!filePath.endsWith('.ogg')) continue;
      const parts = filePath.split('/');
      const creature = parts[2];
      const file = parts[3];
      if (!creature || !file) continue;
      if (creatureFilter && creature !== creatureFilter.toLowerCase()) continue;
      const fileKey = `sounds/creature/${creature}/${file}`;
      if (isBannedPath(fileKey)) continue;
      sounds.push({ fileKey });
    }
    return sounds;
  }

  async extractToFile(sound: DiscoveredSound, destPath: string): Promise<void> {
    // Lazy-load @rhyster/wow-casc-dbc to keep it optional
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { default: CASCClient } = await (eval('import("@rhyster/wow-casc-dbc")') as Promise<any>);

    const listfile = await this.fetchListfile();
    const normalizedKey = sound.fileKey
      .replace(/^sounds\//, 'sound/')
      .toLowerCase();

    let fileDataID: number | undefined;
    for (const [id, fp] of listfile) {
      if (fp === normalizedKey) { fileDataID = id; break; }
    }
    if (!fileDataID) throw new Error(`fileDataID not found for ${sound.fileKey}`);

    const version = await CASCClient.getProductVersion(this.region, this.product);
    const client = new CASCClient(this.region, this.product, version);
    await client.init();

    const cKeys = client.getContentKeysByFileDataID(fileDataID);
    const cKey = cKeys.find(
      (d: any) => !!(d.localeFlags & CASCClient.LocaleFlags.enUS)
    );
    if (!cKey) throw new Error(`No enUS content key for fileDataID ${fileDataID}`);

    const { buffer } = await client.getFileByContentKey(cKey.cKey);

    if (buffer.length < MIN_FILE_SIZE_BYTES) {
      throw new Error(`File too small (${buffer.length} bytes): ${sound.fileKey}`);
    }

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, buffer);
  }
}

function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'BossTalk-Uploader/1.0' } }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        resolve(fetchText(res.headers.location!));
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

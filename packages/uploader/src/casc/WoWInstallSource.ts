import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { isBannedPath, MIN_FILE_SIZE_BYTES } from '@bosstalk/shared';
import logger, { formatError } from '../logger';
import { parseBuildInfo, parseBuildConfig } from './parseConfig';
import { parseIdx, IdxEntry } from './parseIdx';
import { parseEncoding } from './parseEncoding';
import { parseRoot } from './parseRoot';
import { decodeBLTE } from './BLTEDecoder';
import { loadListfile } from './listfileCache';
import { loadTactKeys } from './tactKeys';
import type { SoundSource, DiscoveredSound } from './SoundSource';

const RETAIL_PRODUCT = 'wow';
const BLTE_HEADER_SIZE = 0x1e;

export class WoWInstallSource implements SoundSource {
  readonly name = 'wow-install';

  private installDir: string;
  private cacheDir: string;
  private dataDir: string;
  private localIndexes = new Map<string, IdxEntry>();
  private cKey2EKey = new Map<string, string>();
  private fileDataID2CKey = new Map<number, string>();
  private decryptionKeys = new Map<string, Uint8Array>();
  private initialized = false;

  constructor(installDir: string, cacheDir?: string) {
    this.installDir = installDir;
    this.dataDir = this.detectDataDir(installDir);
    this.cacheDir = cacheDir || path.join(process.cwd(), 'cache');
  }

  // Mac: Data/ sits at the install root alongside _retail_
  // Windows: Data/ lives inside _retail_
  private detectDataDir(installDir: string): string {
    const rootData = path.join(installDir, 'Data', 'data');
    if (fs.existsSync(rootData)) return path.join(installDir, 'Data');
    const retailData = path.join(installDir, '_retail_', 'Data', 'data');
    if (fs.existsSync(retailData)) return path.join(installDir, '_retail_', 'Data');
    throw new Error(`Could not find Data/data directory under ${installDir}`);
  }

  private readConfigFile(key: string): string {
    const p = path.join(this.dataDir, 'config', key.slice(0, 2), key.slice(2, 4), key);
    return fs.readFileSync(p, 'utf8');
  }

  private readDataFile(eKey: string): Buffer {
    const entry = this.localIndexes.get(eKey.slice(0, 18));
    if (!entry) throw new Error(`eKey not in local indexes: ${eKey}`);
    const dataPath = path.join(this.dataDir, 'data', `data.${entry.index.toString().padStart(3, '0')}`);
    const fd = fs.openSync(dataPath, 'r');
    const buf = Buffer.alloc(entry.size - BLTE_HEADER_SIZE);
    fs.readSync(fd, buf, 0, buf.length, entry.offset + BLTE_HEADER_SIZE);
    fs.closeSync(fd);
    return buf;
  }

  private async loadIndexes(): Promise<void> {
    const storageDir = path.join(this.dataDir, 'data');
    const files = fs.readdirSync(storageDir).filter(f => f.endsWith('.idx'));
    if (files.length === 0) throw new Error(`No .idx files found in ${storageDir}`);
    for (const f of files) {
      parseIdx(path.join(storageDir, f), this.localIndexes);
    }
    logger.info(`[casc] Loaded ${this.localIndexes.size} index entries from ${files.length} .idx files`);
  }

  private async init(): Promise<void> {
    if (this.initialized) return;

    logger.info(`[casc] Initializing WoW install at ${this.installDir}`);

    // 1. Parse .build.info to find the retail build
    const buildInfoPath = path.join(this.installDir, '.build.info');
    const buildInfoText = fs.readFileSync(buildInfoPath, 'utf8');
    const builds = parseBuildInfo(buildInfoText);
    const build = builds.find(b => b['Product'] === RETAIL_PRODUCT);
    if (!build) throw new Error(`No '${RETAIL_PRODUCT}' product found in .build.info`);
    logger.info(`[casc] Build: ${build['Version']} (${build['Build Key']?.slice(0, 8)}...)`);

    // 2. Load local archive indexes (in parallel with the decryption key
    // list — independent network/disk work)
    const keysPromise = loadTactKeys(this.cacheDir).catch((err) => {
      logger.warn(`[tactkeys] Failed to load decryption keys, encrypted sounds will be skipped: ${formatError(err)}`);
      return new Map<string, Uint8Array>();
    });
    await this.loadIndexes();
    this.decryptionKeys = await keysPromise;

    // 3. Read build config → get encoding key
    const buildConfig = parseBuildConfig(this.readConfigFile(build['Build Key']));
    const encKeys = buildConfig.encoding.split(' ');
    const encEKey = encKeys[1]; // second key is the encoding key

    // 4. Parse encoding file → cKey → eKey map
    logger.info('[casc] Loading encoding table...');
    const encRaw = this.readDataFile(encEKey);
    const { cKey2EKey } = parseEncoding(encRaw, encEKey);
    this.cKey2EKey = cKey2EKey;
    logger.info(`[casc] Encoding table: ${cKey2EKey.size} entries`);

    // 5. Parse root file → fileDataID → cKey map
    logger.info('[casc] Loading root file...');
    const rootCKey = buildConfig.root;
    const rootEKey = this.cKey2EKey.get(rootCKey);
    if (!rootEKey) throw new Error('Root cKey not found in encoding table');
    const rootRaw = this.readDataFile(rootEKey);
    const { fileDataID2CKey } = parseRoot(rootRaw, rootEKey);
    this.fileDataID2CKey = fileDataID2CKey;
    logger.info(`[casc] Root file: ${fileDataID2CKey.size} file entries`);

    this.initialized = true;
  }

  // Cheap check — only reads/fetches the listfile, no CASC init. Lets the
  // caller skip the expensive extraction pipeline entirely when there's
  // nothing new to find.
  async hasNewManifest(): Promise<boolean> {
    const { changed } = await loadListfile(this.cacheDir);
    return changed;
  }

  async listSounds(creatureFilter?: string): Promise<DiscoveredSound[]> {
    await this.init();

    const { entries: listfile } = await loadListfile(this.cacheDir);
    const sounds: DiscoveredSound[] = [];

    let tooSmall = 0;
    for (const entry of listfile) {
      if (creatureFilter && !entry.fileKey.includes(`/${creatureFilter.toLowerCase()}/`)) continue;
      if (isBannedPath(entry.fileKey)) continue;

      const cKey = this.fileDataID2CKey.get(entry.fileDataID);
      if (!cKey) continue;
      const eKey = this.cKey2EKey.get(cKey);
      if (!eKey) continue;
      const idxEntry = this.localIndexes.get(eKey.slice(0, 18));
      if (!idxEntry) continue;
      if (idxEntry.size - BLTE_HEADER_SIZE < MIN_FILE_SIZE_BYTES) {
        tooSmall++;
        continue;
      }

      sounds.push({ fileKey: entry.fileKey, _fileDataID: entry.fileDataID } as DiscoveredSound & { _fileDataID: number });
    }

    if (tooSmall > 0) {
      logger.info(`[casc] Skipped ${tooSmall} sounds under ${MIN_FILE_SIZE_BYTES} bytes (no useful audio)`);
    }

    logger.info(`[casc] ${sounds.length} extractable sounds found (filtered from ${listfile.length} listfile entries)`);
    return sounds;
  }

  async extractToFile(sound: DiscoveredSound, destPath: string): Promise<void> {
    await this.init();

    const fileDataID = (sound as DiscoveredSound & { _fileDataID: number })._fileDataID;
    const cKey = this.fileDataID2CKey.get(fileDataID);
    if (!cKey) throw new Error(`No cKey for fileDataID ${fileDataID} (${sound.fileKey})`);

    const eKey = this.cKey2EKey.get(cKey);
    if (!eKey) throw new Error(`No eKey for cKey ${cKey} (${sound.fileKey})`);

    const rawData = this.readDataFile(eKey);
    const decoded = decodeBLTE(rawData, eKey, this.decryptionKeys);

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, decoded);
  }
}

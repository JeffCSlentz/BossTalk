// Ported from @rhyster/wow-casc-dbc parsers/rootFile.ts (MIT)
import { decodeBLTE } from './BLTEDecoder';
import logger from '../logger';

const MFST_MAGIC = 0x4d465354;
const LOCALE_ENUS = 0x2;
const FLAG_LOW_VIOLENCE = 0x80;
const FLAG_NO_NAME_HASH = 0x10000000;

export interface RootData {
  fileDataID2CKey: Map<number, string>;
}

export function parseRoot(rawBuffer: Buffer, eKey: string): RootData {
  const buffer = decodeBLTE(rawBuffer, eKey);
  const fileDataID2CKey = new Map<number, string>();

  const magic = buffer.readUInt32LE(0);
  const isManifest = magic === MFST_MAGIC;

  let ptr = 0;
  let version = 0;
  let allowNonNamedFiles = false;

  if (isManifest) {
    const firstEntry = buffer.readUInt32LE(4);
    const newFormat = firstEntry < 100; // post 10.1.7

    const headerSize = newFormat ? firstEntry : 12;
    version = newFormat ? buffer.readUInt32LE(8) : 0;
    const totalFileCount = newFormat ? buffer.readUInt32LE(12) : firstEntry;
    const namedFileCount = newFormat ? buffer.readUInt32LE(16) : buffer.readUInt32LE(8);

    allowNonNamedFiles = totalFileCount !== namedFileCount;
    ptr = headerSize;

    logger.debug(`[casc] Root: version=${version} totalFiles=${totalFileCount} namedFiles=${namedFileCount} allowNonNamed=${allowNonNamedFiles}`);
  }

  while (ptr < buffer.length) {
    const numRecords = buffer.readUInt32LE(ptr);

    let contentFlags: number;
    let localeFlags: number;

    if (version >= 2) {
      // V2 format (WoW 11.1.0+): localeFlags is second field, contentFlags split across 3 sub-fields
      localeFlags = buffer.readUInt32LE(ptr + 4);
      const cf1 = buffer.readUInt32LE(ptr + 8);
      const cf2 = buffer.readUInt32LE(ptr + 12);
      const cf3 = buffer.readUInt8(ptr + 16);
      contentFlags = cf1 | cf2 | (cf3 << 17);
      ptr += 17;
    } else if (isManifest) {
      // V0/V1 MFST format (WoW 8.2 - 11.0): contentFlags first, localeFlags second
      contentFlags = buffer.readUInt32LE(ptr + 4);
      localeFlags = buffer.readUInt32LE(ptr + 8);
      ptr += 12;
    } else {
      // pre-8.2 format
      localeFlags = buffer.readUInt32LE(ptr + 4);
      contentFlags = buffer.readUInt32LE(ptr + 8);
      ptr += 12;
    }

    if (ptr + numRecords * 20 > buffer.length) break;

    const wantLocale = !!(localeFlags & LOCALE_ENUS);
    const isLowViolence = !!(contentFlags & FLAG_LOW_VIOLENCE);
    const include = wantLocale && !isLowViolence;

    const fileDataIDs: number[] = [];
    let curr = -1;
    for (let i = 0; i < numRecords; i++) {
      curr += buffer.readUInt32LE(ptr) + 1;
      ptr += 4;
      fileDataIDs.push(curr);
    }

    for (let i = 0; i < numRecords; i++) {
      const fid = fileDataIDs[i];
      const cKey = buffer.toString('hex', ptr, ptr + 16);
      ptr += 16;
      if (include && !fileDataID2CKey.has(fid)) {
        fileDataID2CKey.set(fid, cKey);
      }
    }

    // Name hashes (8 bytes each): skip when allowNonNamedFiles && NoNameHash flag set
    if (!(allowNonNamedFiles && !!(contentFlags & FLAG_NO_NAME_HASH))) {
      for (let i = 0; i < numRecords; i++) ptr += 8;
    }
  }

  return { fileDataID2CKey };
}

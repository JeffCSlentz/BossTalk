// Ported from wow.export casc-source-local.js parseIndex() (MIT)
import fs from 'node:fs';

export interface IdxEntry { index: number; offset: number; size: number; }

/**
 * Parse a WoW local data journal index (.idx file) from Data/data/.
 * Each entry maps a 9-byte hex key to an archive number + offset + size.
 */
export function parseIdx(filePath: string, into: Map<string, IdxEntry>): void {
  const buf = fs.readFileSync(filePath);
  let pos = 0;

  const headerHashSize = buf.readInt32LE(pos); pos += 4;
  pos += 4; // headerHash uint32
  pos += headerHashSize; // headerHash bytes

  // Align to next 0x10 boundary
  pos = (pos + 0x0f) & ~0x0f;

  const dataLength = buf.readInt32LE(pos); pos += 4;
  pos += 4; // unused

  const nBlocks = dataLength / 18;
  for (let i = 0; i < nBlocks; i++) {
    const key = buf.toString('hex', pos, pos + 9); pos += 9;

    if (into.has(key)) {
      pos += 9; // skip idxHigh + idxLow + size
      continue;
    }

    const idxHigh = buf.readUInt8(pos); pos += 1;
    const idxLow = buf.readInt32BE(pos); pos += 4;
    const size = buf.readInt32LE(pos); pos += 4;

    into.set(key, {
      index: (idxHigh << 2) | ((idxLow & 0xc0000000) >>> 30),
      offset: idxLow & 0x3fffffff,
      size,
    });
  }
}

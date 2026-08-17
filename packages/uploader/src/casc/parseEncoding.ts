// Ported from @rhyster/wow-casc-dbc parsers/encodingFile.ts (MIT)
import assert from 'node:assert';
import crypto from 'node:crypto';
import { decodeBLTE } from './BLTEDecoder';

const ENC_MAGIC = 0x454e;

export interface EncodingData {
  cKey2EKey: Map<string, string>;
}

export function parseEncoding(rawBuffer: Buffer, eKey: string): EncodingData {
  const buffer = decodeBLTE(rawBuffer, eKey);

  const magic = buffer.readUInt16BE(0);
  assert(magic === ENC_MAGIC, `[Encoding] bad magic: ${magic.toString(16)}`);

  const hashSizeCKey = buffer.readUInt8(3);
  const hashSizeEKey = buffer.readUInt8(4);
  const cKeyPageSizeKB = buffer.readUInt16BE(5);
  const eKeyPageSizeKB = buffer.readUInt16BE(7); // read to advance, not used directly
  void eKeyPageSizeKB;
  const cKeyPageCount = buffer.readUInt32BE(9);
  const specBlockSize = buffer.readUInt32BE(18);

  const cKey2EKey = new Map<string, string>();

  const cKeyPageIndexOffset = 22 + specBlockSize;
  const cKeyPageIndexEntrySize = hashSizeCKey + 0x10;
  const cKeyPageOffset = cKeyPageIndexOffset + cKeyPageIndexEntrySize * cKeyPageCount;
  const cKeyPageSize = cKeyPageSizeKB * 1024;

  for (let i = 0; i < cKeyPageCount; i++) {
    const indexOffset = cKeyPageIndexOffset + i * cKeyPageIndexEntrySize;
    const pageOffset = cKeyPageOffset + i * cKeyPageSize;
    const pageChecksum = buffer.toString('hex', indexOffset + hashSizeCKey, indexOffset + hashSizeCKey + 0x10);
    const pageBuffer = buffer.subarray(pageOffset, pageOffset + cKeyPageSize);
    const pageHash = crypto.createHash('md5').update(pageBuffer).digest('hex');
    assert(pageHash === pageChecksum, `[Encoding] ckey page ${i} checksum mismatch`);

    let ptr = 0;
    while (ptr < cKeyPageSize) {
      const keyCount = pageBuffer.readUInt8(ptr); ptr++;
      if (keyCount === 0) break;
      ptr += 5; // fileSize (5 bytes)
      const fileCKey = pageBuffer.toString('hex', ptr, ptr + hashSizeCKey); ptr += hashSizeCKey;
      const fileEKey = pageBuffer.toString('hex', ptr, ptr + hashSizeEKey);
      ptr += hashSizeEKey * keyCount;
      cKey2EKey.set(fileCKey, fileEKey);
    }
  }

  return { cKey2EKey };
}

// Ported from @rhyster/wow-casc-dbc (MIT)
import assert from 'node:assert';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import Salsa20 from './Salsa20';

const BLTE_MAGIC = 0x424c5445;
const ENC_TYPE_SALSA20 = 0x53;
const EMPTY_HASH = '0'.repeat(32);

interface Block { compressedSize: number; decompressedSize: number; hash: string; }

export class BLTEDecoder {
  private blte: Buffer;
  private blocks: Block[] = [];
  private keys: Map<string, Uint8Array>;
  private processedBlock = 0;
  private processedOffset = 0;
  public buffer = Buffer.alloc(0);

  constructor(buffer: Buffer, eKey: string, keys = new Map<string, Uint8Array>()) {
    this.blte = buffer;
    this.keys = keys;

    const magic = buffer.readUInt32BE(0);
    assert(magic === BLTE_MAGIC, `[BLTE] bad magic: ${magic.toString(16)}`);

    const headerSize = buffer.readUInt32BE(4);
    if (headerSize === 0) {
      const hash = crypto.createHash('md5').update(buffer).digest('hex');
      assert(hash === eKey, `[BLTE] hash mismatch`);
      this.blocks.push({ compressedSize: buffer.length - 8, decompressedSize: buffer.length - 9, hash: EMPTY_HASH });
      this.processedOffset = 8;
      return;
    }

    const hash = crypto.createHash('md5').update(buffer.subarray(0, headerSize)).digest('hex');
    assert(hash === eKey, `[BLTE] hash mismatch`);

    const numBlocks = buffer.readIntBE(9, 3);
    for (let i = 0; i < numBlocks; i++) {
      const o = 12 + i * 24;
      this.blocks.push({
        compressedSize: buffer.readUInt32BE(o),
        decompressedSize: buffer.readUInt32BE(o + 4),
        hash: buffer.toString('hex', o + 8, o + 24),
      });
    }
    this.processedOffset = headerSize;
  }

  private processBlock(buf: Buffer, idx: number): Buffer | null {
    const flag = buf.readUInt8(0);
    switch (flag) {
      case 0x45: { // Encrypted
        let offset = 1;
        const keyNameLen = buf.readUInt8(offset++);
        const keyNameBE = buf.toString('hex', offset, offset + keyNameLen); offset += keyNameLen;
        const ivLen = buf.readUInt8(offset++);
        const ivBuf = buf.subarray(offset, offset + ivLen); offset += ivLen;
        const encType = buf.readUInt8(offset++);
        assert(encType === ENC_TYPE_SALSA20, `[BLTE] unsupported encrypt type: ${encType.toString(16)}`);

        const keyName = [...keyNameBE.matchAll(/.{2}/g)].map(v => v[0]).reverse().join('').toLowerCase();
        const key = this.keys.get(keyName);
        if (!key) return null; // encrypted with unknown key — caller skips

        const iv = new Uint8Array(8);
        for (let i = 0; i < 8; i++) iv[i] = i < ivLen ? ivBuf.readUInt8(i) ^ ((idx >>> (8 * i)) & 0xff) : 0;
        const decrypted = new Salsa20(key, iv).process(buf.subarray(offset));
        return this.processBlock(Buffer.from(decrypted.buffer, decrypted.byteOffset, decrypted.byteLength), idx);
      }
      case 0x4e: return buf.subarray(1);           // Uncompressed
      case 0x5a: return zlib.inflateSync(buf.subarray(1)); // Compressed
      default: throw new Error(`[BLTE] unknown block flag: ${flag.toString(16)} at block ${idx}`);
    }
  }

  /** Returns false if any block was skipped due to missing encryption key. */
  decode(): boolean {
    let fullyDecoded = true;
    while (this.processedBlock < this.blocks.length) {
      const idx = this.processedBlock;
      const block = this.blocks[idx];
      const blockBuf = this.blte.subarray(this.processedOffset, this.processedOffset + block.compressedSize);

      if (block.hash !== EMPTY_HASH) {
        const h = crypto.createHash('md5').update(blockBuf).digest('hex');
        assert(h === block.hash, `[BLTE] block ${idx} hash mismatch`);
      }

      const decoded = this.processBlock(blockBuf, idx);
      if (decoded === null) {
        this.buffer = Buffer.concat([this.buffer, Buffer.alloc(block.decompressedSize)]);
        fullyDecoded = false;
      } else {
        this.buffer = Buffer.concat([this.buffer, decoded]);
      }

      this.processedBlock++;
      this.processedOffset += block.compressedSize;
    }
    return fullyDecoded;
  }
}

export function decodeBLTE(buffer: Buffer, eKey: string, keys?: Map<string, Uint8Array>): Buffer {
  const reader = new BLTEDecoder(buffer, eKey, keys);
  reader.decode();
  return reader.buffer;
}

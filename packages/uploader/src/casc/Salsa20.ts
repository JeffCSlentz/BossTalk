// Ported from @rhyster/wow-casc-dbc (MIT)
import assert from 'node:assert';

export default class Salsa20 {
  private readonly fixed: Uint32Array;
  private readonly key: Uint32Array;
  private readonly nonce: Uint32Array;
  private counter = new Uint32Array([0, 0]);
  private state = new Uint32Array(16);
  private block = new Uint8Array(64);
  private position = 0;

  constructor(key: Uint8Array, nonce: Uint8Array) {
    assert(key.length === 32 || key.length === 16);
    assert(nonce.length === 8);

    this.key = new Uint32Array(8);
    const kv = new DataView(key.buffer, key.byteOffset, key.byteLength);
    if (key.length === 32) {
      for (let i = 0; i < 8; i++) this.key[i] = kv.getUint32(i * 4, true);
      this.fixed = new Uint32Array([0x61707865, 0x3320646e, 0x79622d32, 0x6b206574]);
    } else {
      for (let i = 0; i < 4; i++) { const w = kv.getUint32(i * 4, true); this.key[i] = w; this.key[i + 4] = w; }
      this.fixed = new Uint32Array([0x61707865, 0x3120646e, 0x79622d36, 0x6b206574]);
    }

    this.nonce = new Uint32Array(2);
    const nv = new DataView(nonce.buffer, nonce.byteOffset, nonce.byteLength);
    for (let i = 0; i < 2; i++) this.nonce[i] = nv.getUint32(i * 4, true);
    this.generateBlock();
  }

  private QR(a: number, b: number, c: number, d: number) {
    let t: number;
    t = (this.state[a] + this.state[d]) & 0xffffffff; this.state[b] ^= (t << 7) | (t >>> 25);
    t = (this.state[b] + this.state[a]) & 0xffffffff; this.state[c] ^= (t << 9) | (t >>> 23);
    t = (this.state[c] + this.state[b]) & 0xffffffff; this.state[d] ^= (t << 13) | (t >>> 19);
    t = (this.state[d] + this.state[c]) & 0xffffffff; this.state[a] ^= (t << 18) | (t >>> 14);
  }

  private generateBlock() {
    const init = new Uint32Array([
      this.fixed[0], this.key[0], this.key[1], this.key[2],
      this.key[3], this.fixed[1], this.nonce[0], this.nonce[1],
      this.counter[0], this.counter[1], this.fixed[2], this.key[4],
      this.key[5], this.key[6], this.key[7], this.fixed[3],
    ]);
    this.state = new Uint32Array(init);
    for (let i = 0; i < 20; i += 2) {
      this.QR(0, 4, 8, 12); this.QR(5, 9, 13, 1); this.QR(10, 14, 2, 6); this.QR(15, 3, 7, 11);
      this.QR(0, 1, 2, 3); this.QR(5, 6, 7, 4); this.QR(10, 11, 8, 9); this.QR(15, 12, 13, 14);
    }
    for (let i = 0; i < 16; i++) {
      const w = (this.state[i] + init[i]) & 0xffffffff;
      this.block[i * 4] = w & 0xff; this.block[i * 4 + 1] = (w >>> 8) & 0xff;
      this.block[i * 4 + 2] = (w >>> 16) & 0xff; this.block[i * 4 + 3] = (w >>> 24) & 0xff;
    }
    this.counter[0] = (this.counter[0] + 1) & 0xffffffff;
    if (this.counter[0] === 0) this.counter[1] = (this.counter[1] + 1) & 0xffffffff;
  }

  process(input: Uint8Array): Uint8Array {
    const result = new Uint8Array(input.length);
    for (let i = 0; i < input.length; i++) {
      if (this.position === 64) { this.generateBlock(); this.position = 0; }
      result[i] = input[i] ^ this.block[this.position++];
    }
    return result;
  }
}

// Shared pixel helpers for the sprite generators (no dependencies).
import zlib from 'node:zlib';

export const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const INK = hex('#0f0f1b');

export class Frame {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.p = new Array(w * h).fill(null);
  }
  set(x, y, c) {
    if (c && x >= 0 && y >= 0 && x < this.w && y < this.h) this.p[y * this.w + x] = c;
  }
  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }
}
export const brushPath = (x0, y0, x1, y1) => {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = n ? i / n : 0;
    pts.push([Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t)]);
  }
  return pts;
};
export const limb = (x0, y0, x1, y1, w) => brushPath(x0, y0, x1, y1).map(([x, y]) => [x, y, w, w]);
// outline first (1px around every rect), then fill => clean separation between parts
export function part(f, rects, color) {
  for (const [x, y, w, h] of rects) f.rect(x - 1, y - 1, w + 2, h + 2, INK);
  for (const [x, y, w, h] of rects) f.rect(x, y, w, h, color);
}

function crc32(buf) {
  let c;
  let crc = ~0;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return ~crc >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
export function png(W, H, rgba) {
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, y * W * 4, W * 4).copy(raw, y * (W * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}


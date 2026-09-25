'use strict';
// Draws the PaintLand mark (yellow disc, ink ring, terracotta corner stroke)
// into build/icon.png (512×512) without any image libraries.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const S = 512;
const px = Buffer.alloc(S * S * 4);
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const YELLOW = hex('#f4d23b');
const INK = hex('#2b2622');
const TERRA = hex('#d2643a');

function blend(i, [r, g, b], a) {
  px[i] = Math.round(px[i] * (1 - a) + r * a);
  px[i + 1] = Math.round(px[i + 1] * (1 - a) + g * a);
  px[i + 2] = Math.round(px[i + 2] * (1 - a) + b * a);
  px[i + 3] = Math.round(Math.min(255, px[i + 3] + a * 255 * (1 - px[i + 3] / 255)));
}
const cov = (d) => Math.min(1, Math.max(0, 0.5 - d)); // 1px anti-aliasing from a signed distance

for (let y = 0; y < S; y++)
  for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4;
    const cx = x + 0.5 - S / 2;
    const cy = y + 0.5 - S / 2;
    const r = Math.hypot(cx, cy);
    // Disc with a slightly wobbly, hand-inked edge.
    const wob = Math.sin(Math.atan2(cy, cx) * 5) * 1.4;
    const R = 224 + wob;
    blend(i, INK, cov(r - R));
    blend(i, YELLOW, cov(r - (R - 16)));
    // Corner stroke: a thick "L" turned like the favicon (vertical + horizontal bar).
    const u = x + 0.5 - S * 0.36;
    const v = y + 0.5 - S * 0.33;
    const vert = Math.max(Math.abs(u) - 26, Math.abs(v - 88) - 118);
    const horiz = Math.max(Math.abs(v) - 26, Math.abs(u - 88) - 118);
    blend(i, TERRA, cov(Math.min(vert, horiz)));
  }

// PNG encoding: signature, IHDR, IDAT (filter 0 per row), IEND.
const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0);
ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
const raw = Buffer.alloc((S * 4 + 1) * S);
for (let y = 0; y < S; y++) px.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4);
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
const out = path.join(__dirname, '..', 'build', 'icon.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, png);
console.log(`wrote ${out} (${png.length} bytes)`);

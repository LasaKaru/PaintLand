'use strict';
// The Inkroads mark (yellow disc, ink ring, terracotta corner stroke), drawn at
// any size without image libraries, and a tiny PNG encoder. Used for the app
// icon (make-icon.cjs) and the Microsoft Store logos (make-store-assets.cjs).
const zlib = require('node:zlib');

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const YELLOW = hex('#f4d23b');
const INK = hex('#2b2622');
const TERRA = hex('#d2643a');

/** An RGBA canvas (transparent). */
function canvas(w, h) {
  return { w, h, px: Buffer.alloc(w * h * 4) };
}

function blend(px, i, [r, g, b], a) {
  px[i] = Math.round(px[i] * (1 - a) + r * a);
  px[i + 1] = Math.round(px[i + 1] * (1 - a) + g * a);
  px[i + 2] = Math.round(px[i + 2] * (1 - a) + b * a);
  px[i + 3] = Math.round(Math.min(255, px[i + 3] + a * 255 * (1 - px[i + 3] / 255)));
}

/**
 * Draw the mark `size` pixels wide with its top-left corner at (ox, oy).
 * The shapes are defined on a 512-unit grid and scaled; edges stay one pixel soft.
 */
function drawMark(c, size, ox = 0, oy = 0) {
  const k = 512 / size; // grid units per pixel
  const cov = (d) => Math.min(1, Math.max(0, 0.5 - d / k)); // 1px anti-aliasing from a signed distance (grid units)
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const cxp = ox + x;
      const cyp = oy + y;
      if (cxp < 0 || cyp < 0 || cxp >= c.w || cyp >= c.h) continue;
      const i = (cyp * c.w + cxp) * 4;
      const gx = (x + 0.5) * k;
      const gy = (y + 0.5) * k;
      const cx = gx - 256;
      const cy = gy - 256;
      const r = Math.hypot(cx, cy);
      // Disc with a slightly wobbly, hand-inked edge.
      const wob = Math.sin(Math.atan2(cy, cx) * 5) * 1.4;
      const R = 224 + wob;
      blend(c.px, i, INK, cov(r - R));
      blend(c.px, i, YELLOW, cov(r - (R - 16)));
      // Corner stroke: a thick "L" turned like the favicon (vertical + horizontal bar).
      const u = gx - 512 * 0.36;
      const v = gy - 512 * 0.33;
      const vert = Math.max(Math.abs(u) - 26, Math.abs(v - 88) - 118);
      const horiz = Math.max(Math.abs(v) - 26, Math.abs(u - 88) - 118);
      blend(c.px, i, TERRA, cov(Math.min(vert, horiz)));
    }
  return c;
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

function png(c) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(c.w, 0);
  ihdr.writeUInt32BE(c.h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((c.w * 4 + 1) * c.h);
  for (let y = 0; y < c.h; y++) c.px.copy(raw, y * (c.w * 4 + 1) + 1, y * c.w * 4, (y + 1) * c.w * 4);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

module.exports = { canvas, drawMark, png };

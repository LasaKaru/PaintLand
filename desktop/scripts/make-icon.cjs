'use strict';
// Draws the Inkroads mark into build/icon.png (512×512) without any image libraries.
const fs = require('node:fs');
const path = require('node:path');
const { canvas, drawMark, png } = require('./mark.cjs');

const data = png(drawMark(canvas(512, 512), 512));
const out = path.join(__dirname, '..', 'build', 'icon.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, data);
console.log(`wrote ${out} (${data.length} bytes)`);

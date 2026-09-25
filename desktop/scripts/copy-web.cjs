'use strict';
// Copy the built web game (../dist) into ./app for packaging.
const fs = require('node:fs');
const path = require('node:path');

const src = path.join(__dirname, '..', '..', 'dist');
const dst = path.join(__dirname, '..', 'app');
if (!fs.existsSync(path.join(src, 'index.html'))) {
  console.error('No web build found: run `npm run build` in the repository root first.');
  process.exit(1);
}
fs.rmSync(dst, { recursive: true, force: true });
fs.cpSync(src, dst, { recursive: true, filter: (f) => !f.endsWith('.map') });
console.log(`copied ${src} → ${dst}`);

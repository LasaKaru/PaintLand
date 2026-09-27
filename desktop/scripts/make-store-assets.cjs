'use strict';
// Microsoft Store (AppX/MSIX) logos in build/appx/, drawn from the Inkroads
// mark. Transparent: the Store tiles use the package background colour
// (appx.backgroundColor in electron-builder.yml) behind them.
const fs = require('node:fs');
const path = require('node:path');
const { canvas, drawMark, png } = require('./mark.cjs');

/** [file, width, height, mark size as a share of the smaller side] */
const ASSETS = [
  ['StoreLogo.png', 50, 50, 0.92],
  ['Square44x44Logo.png', 44, 44, 0.92],
  ['SmallTile.png', 71, 71, 0.66],
  ['Square150x150Logo.png', 150, 150, 0.6],
  ['LargeTile.png', 310, 310, 0.6],
  ['Wide310x150Logo.png', 310, 150, 0.66],
  ['SplashScreen.png', 620, 300, 0.66],
];

function makeStoreAssets(dir = path.join(__dirname, '..', 'build', 'appx')) {
  fs.mkdirSync(dir, { recursive: true });
  const written = [];
  for (const [file, w, h, share] of ASSETS) {
    const size = Math.round(Math.min(w, h) * share);
    const c = drawMark(canvas(w, h), size, Math.floor((w - size) / 2), Math.floor((h - size) / 2));
    fs.writeFileSync(path.join(dir, file), png(c));
    written.push({ file, w, h });
  }
  return written;
}

if (require.main === module) for (const a of makeStoreAssets()) console.log(`build/appx/${a.file}  ${a.w}×${a.h}`);
module.exports = { makeStoreAssets, ASSETS };

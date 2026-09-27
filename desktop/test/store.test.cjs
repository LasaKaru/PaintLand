'use strict';
// The Microsoft Store package: its logos and manifest settings.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { makeStoreAssets, ASSETS } = require('../scripts/make-store-assets.cjs');

test('the Store logos are drawn at the sizes the manifest names', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'inkroads-appx-'));
  try {
    makeStoreAssets(dir);
    const need = ['StoreLogo.png', 'Square44x44Logo.png', 'Square150x150Logo.png', 'Wide310x150Logo.png'];
    for (const f of need) assert.ok(ASSETS.some((a) => a[0] === f), `${f} is generated`);
    for (const [file, w, h] of ASSETS) {
      const png = fs.readFileSync(path.join(dir, file));
      assert.deepStrictEqual([...png.subarray(1, 4)].map((c) => String.fromCharCode(c)).join(''), 'PNG', file);
      assert.strictEqual(png.readUInt32BE(16), w, `${file} width`);
      assert.strictEqual(png.readUInt32BE(20), h, `${file} height`);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the Store manifest settings: full trust, network and microphone only; no update feed', () => {
  const yml = fs.readFileSync(path.join(__dirname, '..', 'electron-builder.yml'), 'utf8');
  const appx = yml.slice(yml.indexOf('\nappx:'));
  assert.match(appx, /capabilities: \[runFullTrust, internetClient, microphone\]/);
  assert.doesNotMatch(appx, /webcam|location|broadFileSystemAccess/);
  assert.match(yml, /^publish: null$/m, 'Store apps are updated by the Store, never by their own feed');
  for (const key of ['identityName', 'publisher', 'publisherDisplayName', 'applicationId']) assert.match(appx, new RegExp(`\\n  ${key}: \\S`), key);
});

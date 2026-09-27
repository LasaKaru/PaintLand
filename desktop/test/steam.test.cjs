'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createWorkshop, checkItem, readItemFolder, cleanText } = require('../steam.cjs');

test('only road and livery share codes can be Workshop items', () => {
  assert.deepStrictEqual(checkItem({ kind: 'road', title: 'Loop <b>de</b> loop', code: 'R1.abc_-' }), { kind: 'road', title: 'Loop b de /b loop', code: 'R1.abc_-' });
  assert.ok(checkItem({ kind: 'livery', title: 'x', code: 'L1.AAAA' }));
  for (const bad of [null, { kind: 'script', code: 'R1.a' }, { kind: 'road', code: 'L1.a' }, { kind: 'road', code: 'R1.<script>' }, { kind: 'road', code: 'R1.' + 'a'.repeat(3000) }, { kind: 'livery', code: 42 }])
    assert.strictEqual(checkItem(bad), null, JSON.stringify(bad)?.slice(0, 40));
  assert.strictEqual(cleanText('a\u0000b\nc', 10), 'a b c');
});

test('reads one small, checked item.json from an item folder', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-'));
  try {
    assert.strictEqual(readItemFolder(dir), null);
    fs.writeFileSync(path.join(dir, 'item.json'), JSON.stringify({ kind: 'road', title: 'Coast', code: 'R1.xyz' }));
    assert.deepStrictEqual(readItemFolder(dir), { kind: 'road', title: 'Coast', code: 'R1.xyz' });
    fs.writeFileSync(path.join(dir, 'item.json'), 'x'.repeat(9000));
    assert.strictEqual(readItemFolder(dir), null);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('without Steam the Workshop is simply off', async () => {
  delete process.env.STEAM_APP_ID;
  const ws = createWorkshop(() => {
    throw new Error('no steamworks.js');
  });
  assert.strictEqual(ws.available, false);
  assert.deepStrictEqual(await ws.list(), []);
  assert.strictEqual((await ws.publish({ kind: 'road', code: 'R1.a' })).ok, false);
});

test('lists and publishes through steamworks.js (mocked)', async () => {
  process.env.STEAM_APP_ID = '480';
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-item-'));
  fs.writeFileSync(path.join(folder, 'item.json'), JSON.stringify({ kind: 'livery', title: 'Stripes', code: 'L1.QQ' }));
  const updates = [];
  const mock = {
    init: (id) => {
      assert.strictEqual(id, 480);
      return {
        workshop: {
          getSubscribedItems: () => [11n, 12n],
          installInfo: (id) => (id === 11n ? { folder } : null),
          createItem: async () => ({ itemId: 99n, needsToAcceptAgreement: false }),
          updateItem: async (id, u) => {
            updates.push([id, u]);
            assert.strictEqual(JSON.parse(fs.readFileSync(path.join(u.contentPath, 'item.json'), 'utf8')).code, 'R1.road');
          },
        },
      };
    },
    workshop: { UgcItemVisibility: { Public: 0 } },
  };
  try {
    const ws = createWorkshop(() => mock);
    assert.strictEqual(ws.available, true);
    assert.deepStrictEqual(await ws.list(), [{ id: '11', kind: 'livery', title: 'Stripes', code: 'L1.QQ' }]);
    const r = await ws.publish({ kind: 'road', title: 'Harbour hop', description: 'Fun!', code: 'R1.road' });
    assert.deepStrictEqual(r, { ok: true, id: '99', agreement: false });
    assert.strictEqual(updates[0][1].title, 'Harbour hop');
    assert.deepStrictEqual(updates[0][1].tags, ['Roads']);
    assert.strictEqual(fs.existsSync(updates[0][1].contentPath), false); // temp folder cleaned
    assert.strictEqual((await ws.publish({ kind: 'road', code: 'nope' })).ok, false);
  } finally {
    delete process.env.STEAM_APP_ID;
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

// Steam Workshop for the desktop app (roads and car liveries), through
// steamworks.js. Everything here is optional: without the steamworks.js
// package, without Steam running, or without an App ID, the game works as
// before and the Workshop simply isn't offered.
//
// A Workshop item is a folder holding one small `item.json`:
//   { "kind": "road" | "livery", "title": "...", "code": "R1.…" | "L1.…" }
// Only share codes travel (the same text codes the game already shares),
// never scripts or other files, and every item is checked again on reading.
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const KINDS = {
  road: { prefix: 'R1.', max: 2400, tag: 'Roads' },
  livery: { prefix: 'L1.', max: 700, tag: 'Liveries' },
};
const CODE = /^[A-Za-z0-9._-]+$/;
const MAX_TITLE = 60;
const MAX_DESC = 400;
const MAX_ITEM_BYTES = 8 * 1024;

/** Plain text, one line, bounded (titles and descriptions). */
function cleanText(s, max) {
  if (typeof s !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** A Workshop item as the game may use it, or null. */
function checkItem(item) {
  if (!item || typeof item !== 'object') return null;
  const kind = KINDS[item.kind];
  if (!kind) return null;
  const code = item.code;
  if (typeof code !== 'string' || code.length > kind.max || !code.startsWith(kind.prefix) || !CODE.test(code)) return null;
  return { kind: item.kind, title: cleanText(item.title, MAX_TITLE) || 'Untitled', code };
}

/** Read an installed item's folder: exactly one small item.json, checked. */
function readItemFolder(folder) {
  try {
    const file = path.join(folder, 'item.json');
    const st = fs.statSync(file);
    if (!st.isFile() || st.size > MAX_ITEM_BYTES) return null;
    return checkItem(JSON.parse(fs.readFileSync(file, 'utf8')));
  } catch {
    return null;
  }
}

/** The App ID: STEAM_APP_ID, or steam_appid.txt next to the app. */
function appId(dir = __dirname) {
  const env = Number(process.env.STEAM_APP_ID);
  if (Number.isInteger(env) && env > 0) return env;
  try {
    const n = Number(fs.readFileSync(path.join(dir, 'steam_appid.txt'), 'utf8').trim());
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/**
 * Connect to Steam if we can. `load` is injectable for tests.
 * @returns {{ available: boolean, list(): Promise<any[]>, publish(input: any): Promise<{ ok: boolean, id?: string, reason?: string }> }}
 */
function createWorkshop(load = () => require('steamworks.js')) {
  let client = null;
  let sw = null;
  const id = appId();
  if (id) {
    try {
      sw = load();
      client = sw.init(id);
    } catch {
      client = null; // no package, or Steam isn't running
    }
  }
  const off = { ok: false, reason: 'Steam Workshop needs the Steam version of the game, with Steam running.' };

  return {
    get available() {
      return !!client;
    },

    /** Subscribed, installed items (checked). */
    async list() {
      if (!client) return [];
      const out = [];
      let ids = [];
      try {
        ids = client.workshop.getSubscribedItems();
      } catch {
        return [];
      }
      for (const itemId of ids.slice(0, 500)) {
        try {
          const info = client.workshop.installInfo(itemId);
          if (!info?.folder) continue;
          const item = readItemFolder(info.folder);
          if (item) out.push({ id: String(itemId), ...item });
        } catch {
          /* not installed yet */
        }
      }
      return out;
    },

    /** Publish a road or a livery: a new item, then its content and title. */
    async publish(input) {
      if (!client) return off;
      const item = checkItem(input);
      if (!item) return { ok: false, reason: 'That can’t be published.' };
      const description = cleanText(input?.description, MAX_DESC);
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'inkroads-workshop-'));
      try {
        fs.writeFileSync(path.join(dir, 'item.json'), JSON.stringify(item));
        const { itemId, needsToAcceptAgreement } = await client.workshop.createItem();
        await client.workshop.updateItem(itemId, {
          title: item.title,
          description,
          contentPath: dir,
          tags: [KINDS[item.kind].tag],
          visibility: sw.workshop?.UgcItemVisibility?.Public ?? 0,
        });
        return { ok: true, id: String(itemId), agreement: !!needsToAcceptAgreement };
      } catch (e) {
        return { ok: false, reason: `Steam said no: ${String(e?.message ?? e).slice(0, 120)}` };
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    },
  };
}

module.exports = { createWorkshop, checkItem, readItemFolder, cleanText, appId, KINDS };

// The weekly fishing contest (runs inside server/relay.mjs).
//
//   GET  /api/fishing              → { on, week, fish, endsAt, top, mine, last }
//   POST /api/fishing/catch { fish, cm } → your biggest catch of this week's fish
//
// Each week one fish is the contest fish (server/fishrules.mjs). Signed-in
// players' biggest catch of it goes on the board. A size must be one the game
// can really produce for that fish; it is a friendly contest, not a ranked one.

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { weekOf } from './gallery.mjs';
import { checkCatch, contestFish } from './fishrules.mjs';

export const FISHING_LIMITS = { board: 20, keepWeeks: 6, gapMs: 8000 };

/**
 * @param {{ dataDir: string, userForToken: (t: string) => any, isBanned: (name: string) => boolean, enabled?: () => boolean, now?: () => number }} opts
 */
export function createFishing({ dataDir, userForToken, isBanned, enabled = () => true, now = Date.now }) {
  const file = join(dataDir, 'fishing.json');
  /** @type {{ weeks: Record<string, { fish: string, best: Record<string, { name: string, cm: number, at: number }> }> }} */
  let db = { weeks: {} };
  try {
    db = { ...db, ...JSON.parse(readFileSync(file, 'utf8')) };
  } catch {
    /* first run */
  }
  let dirty = false;
  const persist = () => {
    dirty = false;
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(`${file}.tmp`, JSON.stringify(db));
    renameSync(`${file}.tmp`, file);
  };
  const timer = setInterval(() => dirty && persist(), 2000);
  timer.unref?.();
  const lastPost = new Map();

  const thisWeek = () => {
    const w = weekOf(now());
    const fish = contestFish(w.index);
    const rec = (db.weeks[w.key] ??= { fish, best: {} });
    return { ...w, fish: rec.fish, rec };
  };

  /** The board: biggest first, the earlier catch first on a tie. */
  const board = (rec) =>
    Object.entries(rec.best)
      .map(([uid, b]) => ({ uid, ...b }))
      .sort((a, b) => b.cm - a.cm || a.at - b.at);

  function prune() {
    const cutoff = weekOf(now() - FISHING_LIMITS.keepWeeks * 7 * 86400_000).key;
    for (const k of Object.keys(db.weeks))
      if (k < cutoff) {
        delete db.weeks[k];
        dirty = true;
      }
  }

  function send(res, status, body) {
    if (res.headersSent) return true;
    res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'cache-control': 'no-store' });
    res.end(JSON.stringify(body));
    return true;
  }

  function readBody(req, limit) {
    return new Promise((resolve, reject) => {
      let size = 0;
      const chunks = [];
      req.on('data', (c) => {
        size += c.length;
        if (size > limit) {
          reject(new Error('too big'));
          req.removeAllListeners('data');
          req.resume();
        } else chunks.push(c);
      });
      req.on('end', () => {
        try {
          const v = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
          resolve(v && typeof v === 'object' ? v : {});
        } catch {
          reject(new Error('bad json'));
        }
      });
      req.on('error', reject);
    });
  }

  async function handle(req, res, url) {
    const path = url.pathname;
    if (!path.startsWith('/api/fishing')) return false;
    const method = req.method ?? 'GET';
    if (method === 'OPTIONS') return send(res, 204, {});
    const token = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization ?? '')?.[1];
    const u = token ? userForToken(token) : null;
    if (!enabled()) return send(res, 200, { ok: true, on: false });
    prune();
    const w = thisWeek();

    if (method === 'GET' && path === '/api/fishing') {
      const top = board(w.rec)
        .slice(0, FISHING_LIMITS.board)
        .map((b) => ({ name: b.name, cm: b.cm, mine: !!u && b.uid === u.id }));
      const prevKey = weekOf(now() - 7 * 86400_000).key;
      const prev = db.weeks[prevKey];
      const win = prev ? board(prev)[0] : null;
      return send(res, 200, { ok: true, on: true, week: w.key, fish: w.fish, endsAt: w.endsAt, top, mine: u ? w.rec.best[u.id]?.cm ?? null : null, last: win ? { fish: prev.fish, name: win.name, cm: win.cm } : null });
    }

    if (method !== 'POST' || path !== '/api/fishing/catch') return send(res, 404, { ok: false, reason: 'Not found.' });
    if (!u || isBanned(u.name)) return send(res, 401, { ok: false, reason: 'Sign in to enter the fishing contest.' });
    let body = {};
    try {
      body = await readBody(req, 512);
    } catch {
      return send(res, 400, { ok: false, reason: 'Bad request.' });
    }
    const t = now();
    if (t - (lastPost.get(u.id) ?? 0) < FISHING_LIMITS.gapMs) return send(res, 429, { ok: false, reason: 'Too fast.' });
    lastPost.set(u.id, t);
    if (body.fish !== w.fish) return send(res, 400, { ok: false, reason: 'That is not this week’s fish.' });
    const cm = checkCatch(body.fish, body.cm);
    if (cm === null) return send(res, 400, { ok: false, reason: 'That size is not possible.' });
    const old = w.rec.best[u.id];
    const better = !old || cm > old.cm;
    if (better) {
      w.rec.best[u.id] = { name: u.name, cm, at: t };
      dirty = true;
    }
    const rank = board(w.rec).findIndex((b) => b.uid === u.id) + 1;
    return send(res, 200, { ok: true, best: w.rec.best[u.id].cm, better, rank });
  }

  return {
    handle,
    /** Remove a deleted account's catches. */
    forget(uid) {
      for (const w of Object.values(db.weeks))
        if (w.best[uid]) {
          delete w.best[uid];
          dirty = true;
        }
    },
    stats() {
      const w = thisWeek();
      return { fish: w.fish, anglers: Object.keys(w.rec.best).length };
    },
    flush() {
      if (dirty) persist();
    },
  };
}

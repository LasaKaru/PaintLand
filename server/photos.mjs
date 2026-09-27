// The weekly photo contest (runs inside server/relay.mjs).
//
//   GET  /api/photos                   → { week, theme, endsAt, entries, winner } (this week's entries; last week's winner)
//   GET  /api/photos/<id>.jpg          → an entry's picture (public, unless hidden by reports)
//   POST /api/photos/enter  { image, caption }   → your entry this week (a new one replaces it and its votes)
//   POST /api/photos/vote   { id, on }           → up to 3 votes a week, never your own
//   POST /api/photos/report { id }               → 3 reports hide an entry
//
// The winner is the entry with the most votes when the week ends (the earlier
// entry wins a tie); it is shown on a billboard in Serendib City all next week.

import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanText } from './validate.mjs';
import { weekOf, themeFor } from './gallery.mjs';

export const PHOTO_LIMITS = { imageBytes: 170 * 1024, caption: 80, votes: 3, hideAfterReports: 3, keepWeeks: 6 };

/** The JPEG bytes inside a data URL, or null if it isn't a small JPEG. */
export function photoFromDataUrl(url) {
  if (typeof url !== 'string') return null;
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(url);
  if (!m) return null;
  const buf = Buffer.from(m[1], 'base64');
  if (buf.length < 100 || buf.length > PHOTO_LIMITS.imageBytes || buf[0] !== 0xff || buf[1] !== 0xd8 || buf[buf.length - 2] !== 0xff || buf[buf.length - 1] !== 0xd9) return null;
  return buf;
}

/** The week's winner: most votes, earliest entry on a tie; hidden entries never win. */
export function pickWinner(entries) {
  const ok = entries.filter((e) => !e.hidden && e.votes.length > 0);
  ok.sort((a, b) => b.votes.length - a.votes.length || a.at - b.at);
  return ok[0] ?? null;
}

/**
 * @param {{ dataDir: string, userForToken: (t: string) => any, isBanned: (name: string) => boolean, now?: () => number }} opts
 */
export function createPhotos({ dataDir, userForToken, isBanned, now = Date.now }) {
  const file = join(dataDir, 'photos.json');
  const imgDir = join(dataDir, 'contest');
  /** @type {{ entries: { id: string, uid: string, name: string, caption: string, week: string, at: number, votes: string[], reports: string[], hidden: boolean }[], winners: Record<string, { id: string, name: string, caption: string }> }} */
  let db = { entries: [], winners: {} };
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
  const touch = () => (dirty = true);
  const imgPath = (id) => join(imgDir, `${id}.jpg`);
  const dropImage = (id) => {
    try {
      unlinkSync(imgPath(id));
    } catch {
      /* gone */
    }
  };

  /** Settle finished weeks (record winners) and forget old entries, keeping winners' pictures. */
  function settle() {
    const current = weekOf(now());
    const weeks = new Set(db.entries.map((e) => e.week));
    for (const w of weeks) {
      if (w === current.key || db.winners[w]) continue;
      const win = pickWinner(db.entries.filter((e) => e.week === w));
      db.winners[w] = win ? { id: win.id, name: win.name, caption: win.caption } : { id: '', name: '', caption: '' };
      touch();
    }
    const cutoff = now() - PHOTO_LIMITS.keepWeeks * 7 * 86400_000;
    const winnerIds = new Set(Object.values(db.winners).map((w) => w.id));
    const keep = [];
    for (const e of db.entries) {
      if (e.at < cutoff && !winnerIds.has(e.id)) {
        dropImage(e.id);
        touch();
      } else keep.push(e);
    }
    db.entries = keep;
  }

  /** Last finished week's winner (or null). */
  function lastWinner() {
    const prevKey = weekOf(now() - 7 * 86400_000).key;
    const w = db.winners[prevKey];
    return w && w.id ? { ...w, week: prevKey } : null;
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
    if (!path.startsWith('/api/photos')) return false;
    const method = req.method ?? 'GET';
    if (method === 'OPTIONS') return send(res, 204, {});
    settle();
    const token = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization ?? '')?.[1];
    const u = token ? userForToken(token) : null;
    const week = weekOf(now());

    const img = /^\/api\/photos\/([0-9a-f-]{36})\.jpg$/.exec(path);
    if (method === 'GET' && img) {
      const e = db.entries.find((x) => x.id === img[1]);
      if (!e || e.hidden) return send(res, 404, { ok: false, reason: 'Not found.' });
      try {
        const bytes = readFileSync(imgPath(e.id));
        res.writeHead(200, { 'content-type': 'image/jpeg', 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=3600' });
        res.end(bytes);
      } catch {
        return send(res, 404, { ok: false, reason: 'Not found.' });
      }
      return true;
    }

    if (method === 'GET' && path === '/api/photos') {
      const entries = db.entries
        .filter((e) => e.week === week.key && !e.hidden)
        .sort((a, b) => b.votes.length - a.votes.length || a.at - b.at)
        .map((e) => ({ id: e.id, name: e.name, caption: e.caption, votes: e.votes.length, mine: !!u && e.uid === u.id, voted: !!u && e.votes.includes(u.id) }));
      const myVotes = u ? db.entries.filter((e) => e.week === week.key && e.votes.includes(u.id)).length : 0;
      return send(res, 200, { ok: true, week: week.key, theme: themeFor(now()), endsAt: week.endsAt, entries, myVotes, winner: lastWinner() });
    }

    if (method !== 'POST') return send(res, 404, { ok: false, reason: 'Not found.' });
    if (!u || isBanned(u.name)) return send(res, 401, { ok: false, reason: 'Sign in to enter and vote.' });
    let body = {};
    try {
      body = await readBody(req, path === '/api/photos/enter' ? Math.ceil(PHOTO_LIMITS.imageBytes * 1.4) + 2048 : 2048);
    } catch (e) {
      return send(res, e.message === 'too big' ? 413 : 400, { ok: false, reason: e.message === 'too big' ? 'That picture is too big.' : 'Bad request.' });
    }

    if (path === '/api/photos/enter') {
      const bytes = photoFromDataUrl(body.image);
      if (!bytes) return send(res, 400, { ok: false, reason: 'That picture can’t be entered.' });
      // One entry each a week: a new one replaces the old (and its votes).
      for (const e of db.entries.filter((x) => x.week === week.key && x.uid === u.id)) dropImage(e.id);
      db.entries = db.entries.filter((x) => !(x.week === week.key && x.uid === u.id));
      const id = randomUUID();
      mkdirSync(imgDir, { recursive: true });
      writeFileSync(imgPath(id), bytes);
      const caption = (cleanText(body.caption, PHOTO_LIMITS.caption) ?? '').replace(/[<>]/g, '');
      db.entries.push({ id, uid: u.id, name: u.name, caption, week: week.key, at: now(), votes: [], reports: [], hidden: false });
      touch();
      return send(res, 200, { ok: true, id });
    }

    const e = db.entries.find((x) => x.id === String(body.id ?? '') && x.week === week.key && !x.hidden);
    if (!e) return send(res, 404, { ok: false, reason: 'That entry has gone.' });

    if (path === '/api/photos/vote') {
      if (e.uid === u.id) return send(res, 400, { ok: false, reason: 'You can’t vote for your own photo.' });
      const on = body.on !== false;
      if (on && !e.votes.includes(u.id)) {
        const used = db.entries.filter((x) => x.week === week.key && x.votes.includes(u.id)).length;
        if (used >= PHOTO_LIMITS.votes) return send(res, 400, { ok: false, reason: `You have ${PHOTO_LIMITS.votes} votes a week.` });
        e.votes.push(u.id);
      } else if (!on) e.votes = e.votes.filter((id) => id !== u.id);
      touch();
      return send(res, 200, { ok: true, votes: e.votes.length });
    }

    if (path === '/api/photos/report') {
      if (!e.reports.includes(u.id) && e.uid !== u.id) e.reports.push(u.id);
      // Once the admin has looked at an entry and kept it, reports no longer hide it.
      if (e.reports.length >= PHOTO_LIMITS.hideAfterReports && !e.reviewed) e.hidden = true;
      touch();
      return send(res, 200, { ok: true });
    }

    return send(res, 404, { ok: false, reason: 'Not found.' });
  }

  /** An account is gone: its entries and votes go too. */
  function forget(uid) {
    for (const e of db.entries) {
      if (e.uid === uid) dropImage(e.id);
      e.votes = e.votes.filter((v) => v !== uid);
    }
    db.entries = db.entries.filter((e) => e.uid !== uid);
    for (const w of Object.values(db.winners)) if (w.id && !db.entries.some((e) => e.id === w.id)) Object.assign(w, { id: '', name: '', caption: '' });
    touch();
  }

  /** For the admin panel: this week's and last week's entries (hidden ones too), reported first. */
  function recent() {
    const t = now();
    const weeks = [weekOf(t).key, weekOf(t - 7 * 86400000).key];
    return db.entries
      .filter((e) => weeks.includes(e.week))
      .sort((a, b) => b.reports.length - a.reports.length || b.at - a.at)
      .slice(0, 100)
      .map((e) => ({ id: e.id, name: e.name, caption: e.caption, week: e.week, votes: e.votes.length, reports: e.reports.length, hidden: e.hidden, winner: Object.values(db.winners).some((w) => w.id === e.id) }));
  }

  /** Admin: hide, show again (and stop reports hiding it), or remove an entry and its picture. */
  function moderate(id, action) {
    const e = db.entries.find((x) => x.id === id);
    if (!e) return false;
    if (action === 'remove') {
      dropImage(e.id);
      db.entries = db.entries.filter((x) => x !== e);
      for (const w of Object.values(db.winners)) if (w.id === id) Object.assign(w, { id: '', name: '', caption: '' });
    } else if (action === 'hide') e.hidden = true;
    else {
      e.hidden = false;
      e.reviewed = true;
    }
    touch();
    return true;
  }

  /** Admin: an entry's picture as a data URL (hidden entries too), or null. */
  function image(id) {
    const e = db.entries.find((x) => x.id === id);
    if (!e) return null;
    try {
      return `data:image/jpeg;base64,${readFileSync(imgPath(e.id)).toString('base64')}`;
    } catch {
      return null;
    }
  }

  return { handle, forget, recent, moderate, image, stats: () => ({ entries: db.entries.length }), flush: () => persist() };
}

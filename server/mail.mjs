// Postcards between friends, and each player's home in Harbour Town (runs inside server/relay.mjs).
//
//   POST /api/postcards/send   { to, image, text }   → a friend (or yourself); image is a small JPEG data URL
//   GET  /api/postcards                               → { cards: [{ id, from, text, at, pinned }] } (your mailbox)
//   GET  /api/postcards/<id>.jpg                      → the picture (yours, or a card pinned in a friend's home)
//   POST /api/postcards/pin    { id, pinned }         → pin up to 6 cards on your home's wall
//   POST /api/postcards/delete { id }
//   PUT  /api/home             { home }               → your home's layout (colours, keepsakes shown)
//   GET  /api/home/<name>                             → a friend's home: { home, trophies, cards } (pinned cards)
//
// Only friends can send each other postcards, each player's mailbox keeps the
// newest 30 (pinned ones are kept), and senders get 20 a day. Deleting an
// account deletes the cards it sent and received and its home.

import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanText } from './validate.mjs';

export const MAIL_LIMITS = {
  imageBytes: 90 * 1024,
  text: 140,
  inbox: 30,
  pinned: 6,
  perDay: 20,
  keepsakes: 12,
};

const COLOUR = /^#[0-9a-f]{6}$/i;
const KEEPSAKE = /^[a-z]{2,12}$/;

/** A home layout as stored: only known, bounded fields survive. */
export function cleanHome(home) {
  if (!home || typeof home !== 'object') return null;
  const out = {
    walls: COLOUR.test(home.walls) ? home.walls.toLowerCase() : '#f6f0e4',
    roof: COLOUR.test(home.roof) ? home.roof.toLowerCase() : '#d8463a',
    keepsakes: Array.isArray(home.keepsakes) ? [...new Set(home.keepsakes.filter((k) => typeof k === 'string' && KEEPSAKE.test(k)))].slice(0, MAIL_LIMITS.keepsakes) : [],
    trophies: Math.max(0, Math.min(999, Math.floor(Number(home.trophies) || 0))),
  };
  return out;
}

/** The JPEG bytes inside a data URL, or null if it isn't a small JPEG. */
export function jpegFromDataUrl(url) {
  if (typeof url !== 'string') return null;
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(url);
  if (!m) return null;
  const buf = Buffer.from(m[1], 'base64');
  // JPEG start and end markers; anything else is refused.
  if (buf.length < 100 || buf.length > MAIL_LIMITS.imageBytes || buf[0] !== 0xff || buf[1] !== 0xd8 || buf[buf.length - 2] !== 0xff || buf[buf.length - 1] !== 0xd9) return null;
  return buf;
}

/**
 * @param {{ dataDir: string, userForToken: (t: string) => any, userByName: (n: string) => any, userById: (id: string) => any, now?: () => number }} opts
 */
export function createMail({ dataDir, userForToken, userByName, userById, now = Date.now }) {
  const file = join(dataDir, 'mail.json');
  const imgDir = join(dataDir, 'postcards');
  /** @type {{ cards: Record<string, { id: string, to: string, from: string, fromName: string, text: string, at: number, seq?: number, pinned: boolean }>, homes: Record<string, any>, sent: Record<string, number[]>, seq?: number }} */
  let db = { cards: {}, homes: {}, sent: {}, seq: 0 };
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
  const removeCard = (id) => {
    delete db.cards[id];
    try {
      unlinkSync(imgPath(id));
    } catch {
      /* already gone */
    }
  };
  const inbox = (uid) => Object.values(db.cards).filter((c) => c.to === uid).sort((a, b) => b.at - a.at || (b.seq ?? 0) - (a.seq ?? 0));
  const friends = (a, b) => !!a && !!b && (a.id === b.id || (a.friends.includes(b.id) && b.friends.includes(a.id)));
  const cardView = (c) => ({ id: c.id, from: userById(c.from)?.name ?? c.fromName, text: c.text, at: c.at, pinned: !!c.pinned });

  function send(res, status, body) {
    if (res.headersSent) return true;
    res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET, POST, PUT, OPTIONS', 'cache-control': 'no-store' });
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
    if (!path.startsWith('/api/postcards') && !path.startsWith('/api/home')) return false;
    const method = req.method ?? 'GET';
    if (method === 'OPTIONS') return send(res, 204, {});
    const token = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization ?? '')?.[1];
    const u = token ? userForToken(token) : null;
    if (!u) return send(res, 401, { ok: false, reason: 'Sign in to use postcards.' });
    let body = {};
    if (method === 'POST' || method === 'PUT') {
      try {
        // A 90 KB picture is ~120 KB of base64.
        body = await readBody(req, path === '/api/postcards/send' ? Math.ceil(MAIL_LIMITS.imageBytes * 1.4) + 2048 : 4096);
      } catch (e) {
        return send(res, e.message === 'too big' ? 413 : 400, { ok: false, reason: e.message === 'too big' ? 'That picture is too big.' : 'Bad request.' });
      }
    }

    if (method === 'POST' && path === '/api/postcards/send') {
      const to = userByName(body.to);
      if (!to || !friends(u, to)) return send(res, 403, { ok: false, reason: 'You can only send postcards to friends.' });
      const img = jpegFromDataUrl(body.image);
      if (!img) return send(res, 400, { ok: false, reason: 'That picture can’t be sent.' });
      const t = now();
      const recent = (db.sent[u.id] ?? []).filter((at) => t - at < 86400_000);
      if (recent.length >= MAIL_LIMITS.perDay) return send(res, 429, { ok: false, reason: 'That’s enough postcards for today.' });
      const id = randomUUID();
      mkdirSync(imgDir, { recursive: true });
      writeFileSync(imgPath(id), img);
      // No markup in messages (they're shown as text anyway).
      const text = (cleanText(body.text, MAIL_LIMITS.text) ?? '').replace(/[<>]/g, '');
      db.cards[id] = { id, to: to.id, from: u.id, fromName: u.name, text, at: t, seq: (db.seq = (db.seq ?? 0) + 1), pinned: false };
      db.sent[u.id] = [...recent, t];
      // A full mailbox lets its oldest unpinned card go.
      const box = inbox(to.id);
      for (const c of box.filter((c) => !c.pinned).slice(Math.max(0, MAIL_LIMITS.inbox - box.filter((b) => b.pinned).length))) removeCard(c.id);
      touch();
      return send(res, 200, { ok: true, id });
    }

    if (method === 'GET' && path === '/api/postcards') return send(res, 200, { ok: true, cards: inbox(u.id).map(cardView) });

    const img = /^\/api\/postcards\/([0-9a-f-]{36})\.jpg$/.exec(path);
    if (method === 'GET' && img) {
      const c = db.cards[img[1]];
      // Your own cards, or a card pinned up in a friend's home.
      const owner = c ? userById(c.to) : null;
      if (!c || !(c.to === u.id || (c.pinned && friends(u, owner)))) return send(res, 404, { ok: false, reason: 'Not found.' });
      try {
        const bytes = readFileSync(imgPath(c.id));
        res.writeHead(200, { 'content-type': 'image/jpeg', 'access-control-allow-origin': '*', 'cache-control': 'private, max-age=86400' });
        res.end(bytes);
      } catch {
        return send(res, 404, { ok: false, reason: 'Not found.' });
      }
      return true;
    }

    if (method === 'POST' && (path === '/api/postcards/pin' || path === '/api/postcards/delete')) {
      const c = db.cards[String(body.id ?? '')];
      if (!c || c.to !== u.id) return send(res, 404, { ok: false, reason: 'Not found.' });
      if (path === '/api/postcards/delete') removeCard(c.id);
      else {
        const want = body.pinned === true;
        if (want && !c.pinned && inbox(u.id).filter((x) => x.pinned).length >= MAIL_LIMITS.pinned) return send(res, 400, { ok: false, reason: `Your wall has room for ${MAIL_LIMITS.pinned} postcards.` });
        c.pinned = want;
      }
      touch();
      return send(res, 200, { ok: true });
    }

    if (method === 'PUT' && path === '/api/home') {
      const home = cleanHome(body.home);
      if (!home) return send(res, 400, { ok: false, reason: 'Bad home.' });
      db.homes[u.id] = home;
      touch();
      return send(res, 200, { ok: true });
    }

    const visit = /^\/api\/home\/(.+)$/.exec(path);
    if (method === 'GET' && visit) {
      const owner = userByName(decodeURIComponent(visit[1]));
      if (!owner || !friends(u, owner)) return send(res, 403, { ok: false, reason: 'You can visit friends’ homes.' });
      const cards = inbox(owner.id).filter((c) => c.pinned).map(cardView);
      return send(res, 200, { ok: true, name: owner.name, home: db.homes[owner.id] ?? cleanHome({}), cards });
    }

    return send(res, 404, { ok: false, reason: 'Not found.' });
  }

  /** An account is gone: its cards (sent and received) and its home go too. */
  function forget(uid) {
    for (const c of Object.values(db.cards)) if (c.to === uid || c.from === uid) removeCard(c.id);
    delete db.homes[uid];
    delete db.sent[uid];
    touch();
  }

  return { handle, forget, stats: () => ({ postcards: Object.keys(db.cards).length, homes: Object.keys(db.homes).length }), flush: () => persist() };
}

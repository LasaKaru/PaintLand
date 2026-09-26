// Entitlements: the season pass's Patron track (runs inside server/relay.mjs).
//
//   GET  /api/store/me                        (signed in) → { season, patron, seasons }
//   POST /api/store/redeem { code }           (signed in) → { season } — one-use codes made in the admin panel
//
// Admin (called from server/admin.mjs, behind the admin login):
//   makeCodes(count, season)  → plain codes, shown once; only their SHA-256 hashes are kept
//   grantByName(name, season) → gives an account the Patron track
//   codeStats()               → issued / redeemed per season
//
// There is no payment provider here yet. When one is added, its webhook
// handler must verify the provider's signature and then call
// `grant(accountId, 'patron', season, 'payment:<provider id>')` — the same
// hook codes and admin grants use. Everything a Patron gets is cosmetic.

import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { clientIp } from './validate.mjs';

/** Seasons: 8 weeks from Monday 5 January 2026 (the same maths as src/gameplay/SeasonPass.ts). */
const SEASON_EPOCH = Date.UTC(2026, 0, 5);
const SEASON_MS = 56 * 86400_000;
export const seasonIdAt = (t) => `S${Math.max(0, Math.floor((t - SEASON_EPOCH) / SEASON_MS)) + 1}`;
const SEASON = /^S\d{1,4}$/;

export const STORE_LIMITS = { codesPerBatch: 500, codes: 50_000, redeemPerHour: 10 };

// No 0/O or 1/I/L, so codes read aloud or typed from paper work.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const sha = (s) => createHash('sha256').update(s).digest('hex');

/** A code as typed by a player: upper-case, dashes and spaces ignored. */
export const normaliseCode = (s) =>
  String(s ?? '')
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .slice(0, 32);

function newCode() {
  const b = randomBytes(12);
  let s = '';
  for (let i = 0; i < 12; i++) s += ALPHABET[b[i] % ALPHABET.length];
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
}

/**
 * @param {{ dataDir: string, userForToken: (t: string) => { id: string, name: string } | null, userByName: (n: string) => { id: string, name: string } | null, now?: () => number }} opts
 */
export function createStore({ dataDir, userForToken, userByName, now = Date.now }) {
  mkdirSync(dataDir, { recursive: true });
  const file = join(dataDir, 'store.json');
  /** @type {{ codes: Record<string, { season: string, used: string | null, at: number }>, grants: Record<string, { patron: string[] }>, log: { at: number, uid: string, season: string, source: string }[] }} */
  let db = { codes: {}, grants: {}, log: [] };
  try {
    db = { ...db, ...JSON.parse(readFileSync(file, 'utf8')) };
  } catch {
    /* first run */
  }
  let timer = null;
  const persist = () => {
    timer = null;
    writeFileSync(`${file}.tmp`, JSON.stringify(db));
    renameSync(`${file}.tmp`, file);
  };
  const dirty = () => {
    timer ??= setTimeout(persist, 500);
  };
  const tries = new Map();

  /** The one hook every entitlement goes through (codes, admin grants, and later payments). */
  function grant(uid, kind, season, source) {
    if (kind !== 'patron' || !SEASON.test(season) || !uid) return false;
    const g = (db.grants[uid] ??= { patron: [] });
    if (g.patron.includes(season)) return false;
    g.patron.push(season);
    db.log.push({ at: now(), uid, season, source: String(source).slice(0, 80) });
    if (db.log.length > 20_000) db.log.splice(0, db.log.length - 20_000);
    dirty();
    return true;
  }

  const isPatron = (uid, season = seasonIdAt(now())) => !!db.grants[uid]?.patron.includes(season);

  function makeCodes(count, season = seasonIdAt(now())) {
    const n = Math.max(1, Math.min(STORE_LIMITS.codesPerBatch, Math.round(Number(count) || 0)));
    if (!SEASON.test(season)) return { ok: false, reason: 'Season must look like S3.' };
    if (Object.keys(db.codes).length + n > STORE_LIMITS.codes) return { ok: false, reason: 'Too many codes stored.' };
    const codes = [];
    while (codes.length < n) {
      const c = newCode();
      const h = sha(normaliseCode(c));
      if (db.codes[h]) continue;
      db.codes[h] = { season, used: null, at: now() };
      codes.push(c);
    }
    dirty();
    return { ok: true, season, codes };
  }

  function grantByName(name, season = seasonIdAt(now())) {
    const u = userByName(name);
    if (!u) return { ok: false, reason: 'No account with that name.' };
    if (!SEASON.test(season)) return { ok: false, reason: 'Season must look like S3.' };
    return { ok: true, granted: grant(u.id, 'patron', season, 'admin'), name: u.name, season };
  }

  function codeStats() {
    const by = {};
    for (const c of Object.values(db.codes)) {
      const s = (by[c.season] ??= { season: c.season, issued: 0, redeemed: 0 });
      s.issued++;
      if (c.used) s.redeemed++;
    }
    const patrons = {};
    for (const g of Object.values(db.grants)) for (const s of g.patron) patrons[s] = (patrons[s] ?? 0) + 1;
    return { current: seasonIdAt(now()), seasons: Object.values(by).sort((a, b) => b.season.localeCompare(a.season, 'en', { numeric: true })), patrons };
  }

  const send = (res, status, body) => {
    res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET, POST, OPTIONS' });
    res.end(JSON.stringify(body));
  };

  async function readJson(req) {
    let size = 0;
    const chunks = [];
    for await (const c of req) {
      size += c.length;
      if (size > 4096) return null;
      chunks.push(c);
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    } catch {
      return null;
    }
  }

  async function handle(req, res, url) {
    if (!url.pathname.startsWith('/api/store/')) return false;
    if (req.method === 'OPTIONS') return send(res, 204, {}), true;
    const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
    const u = m ? userForToken(m[1]) : null;
    if (!u) return send(res, 401, { ok: false, reason: 'Sign in first.' }), true;
    const route = url.pathname.slice('/api/store/'.length);
    const season = seasonIdAt(now());
    if (route === 'me' && req.method === 'GET') {
      return send(res, 200, { ok: true, season, patron: isPatron(u.id, season), seasons: db.grants[u.id]?.patron ?? [] }), true;
    }
    if (route === 'redeem' && req.method === 'POST') {
      const ip = clientIp(req);
      const t = now();
      const list = (tries.get(ip) ?? []).filter((x) => t - x < 3600_000);
      if (list.length >= STORE_LIMITS.redeemPerHour) return send(res, 429, { ok: false, reason: 'Too many tries. Wait an hour.' }), true;
      list.push(t);
      tries.set(ip, list);
      const body = await readJson(req);
      const c = db.codes[sha(normaliseCode(body?.code))];
      if (!c) return send(res, 404, { ok: false, reason: 'That code isn’t right.' }), true;
      if (c.used && c.used !== u.id) return send(res, 409, { ok: false, reason: 'That code was already used.' }), true;
      c.used = u.id;
      grant(u.id, 'patron', c.season, 'code');
      dirty();
      return send(res, 200, { ok: true, season: c.season, patron: isPatron(u.id, season) }), true;
    }
    return send(res, 404, { ok: false }), true;
  }

  return { handle, grant, isPatron, makeCodes, grantByName, codeStats, flush: () => timer && (clearTimeout(timer), persist()) };
}

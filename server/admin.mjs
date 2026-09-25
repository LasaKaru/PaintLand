// PaintLand admin, branding and analytics service (runs inside server/relay.mjs).
//
// Public:
//   GET  /api/config              → branding: company, links, sponsors, logo frequency
//   GET  /api/brand/<file>        → uploaded sponsor logos
//   POST /api/analytics           → anonymous play events (batched by the client)
// Admin (Authorization: Bearer <token> from /api/admin/login):
//   POST /api/admin/login         { email, password }      → { token }
//   GET  /api/admin/stats                                  → dashboard numbers
//   PUT  /api/admin/config        { ...config }            → saved branding
//   POST /api/admin/sponsor       { name, url, image }     → upload a logo (data URL)
//   DELETE /api/admin/sponsor?id=                          → remove a logo
//   POST /api/admin/password      { current, next }        → change the password
//   GET  /api/admin/chat                                   → recent chat for moderation
//   POST /api/admin/ban           { name, ban }            → ban / unban a player name
//   GET  /api/admin/export                                 → all analytics as JSON
//
// The password is never stored in plain text: only a salted scrypt hash, in
// data/admin.json once changed (or the ADMIN_EMAIL / ADMIN_PASSWORD env vars).
// Analytics are anonymous: a random id per browser, no names, no IP addresses kept.

import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

// Default login (hash of the password chosen by the owner). Override with env vars or change it in the panel.
export const DEFAULT_ADMIN = {
  email: 'lasantha@helao2.com',
  salt: 'ac1c4c6e5341402fb360aca238fcc32b',
  hash: '2d15a6c0113647b721b6f8de1d769b294bb5e97ff84db83fe0edee29681e2cdc',
};

export const DEFAULT_CONFIG = {
  company: { name: 'HelaO2', site: 'https://helao2.com', tagline: 'Presents', contact: 'support@helao2.com' },
  links: {
    coffee: '',
    fund: '',
    sponsor: 'mailto:support@helao2.com?subject=Sponsor%20PaintLand',
    custom: [],
  },
  /** How often the company logo appears in the world: 0 never … 1 on most boards. */
  logoFrequency: 0.35,
  showSponsorCta: true,
  maxPlayersPerRoom: 32,
  sponsors: [],
};

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.map': 'application/json', '.ico': 'image/x-icon', '.txt': 'text/plain' };
const TOKEN_TTL = 12 * 3600 * 1000;
const MAX_PLAYERS_TRACKED = 200_000;
const day = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);

/** Keep text short and printable. */
function clean(s, max = 120) {
  if (typeof s !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
}

/** Only http(s) and mailto links make it into the game. */
export function safeUrl(s) {
  const v = clean(s, 400);
  if (!v) return '';
  try {
    const u = new URL(v);
    return ['https:', 'http:', 'mailto:'].includes(u.protocol) ? u.href : '';
  } catch {
    return '';
  }
}

/** Validate a config coming from the panel; anything unknown is dropped. */
export function sanitizeConfig(input, current) {
  const c = structuredClone(current);
  const i = input && typeof input === 'object' ? input : {};
  if (i.company) {
    c.company.name = clean(i.company.name, 60) || c.company.name;
    c.company.site = safeUrl(i.company.site);
    c.company.tagline = clean(i.company.tagline, 80);
    c.company.contact = clean(i.company.contact, 120);
    if (i.company.logo === '') delete c.company.logo; // back to the built-in logo
  }
  if (i.links) {
    c.links.coffee = safeUrl(i.links.coffee);
    c.links.fund = safeUrl(i.links.fund);
    c.links.sponsor = safeUrl(i.links.sponsor);
    c.links.custom = (Array.isArray(i.links.custom) ? i.links.custom : [])
      .slice(0, 8)
      .map((l) => ({ label: clean(l?.label, 40), url: safeUrl(l?.url) }))
      .filter((l) => l.label && l.url);
  }
  if (i.logoFrequency !== undefined) c.logoFrequency = Math.min(1, Math.max(0, Number(i.logoFrequency) || 0));
  if (i.showSponsorCta !== undefined) c.showSponsorCta = !!i.showSponsorCta;
  if (i.maxPlayersPerRoom !== undefined) c.maxPlayersPerRoom = Math.min(64, Math.max(2, Math.round(Number(i.maxPlayersPerRoom) || 32)));
  if (Array.isArray(i.sponsors)) {
    // Only edits of existing sponsors (name, link, weight, on/off); uploads go through /api/admin/sponsor.
    for (const s of c.sponsors) {
      const e = i.sponsors.find((x) => x?.id === s.id);
      if (!e) continue;
      s.name = clean(e.name, 60) || s.name;
      s.url = safeUrl(e.url);
      s.weight = Math.min(10, Math.max(0, Number(e.weight) || 0));
      s.enabled = !!e.enabled;
    }
  }
  return c;
}

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return { salt, hash: scryptSync(String(password), salt, 32).toString('hex') };
}

export function checkPassword(password, rec) {
  const a = Buffer.from(scryptSync(String(password), rec.salt, 32).toString('hex'), 'hex');
  const b = Buffer.from(rec.hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

function emptyStats() {
  return { players: {}, days: {}, counters: {}, sponsors: {}, since: Date.now() };
}

/**
 * @param {{ dataDir: string, distDir?: string, live: () => { rooms: number, online: number, roomSizes: Record<string, number> } }} opts
 */
export function createAdmin({ dataDir, distDir, live }) {
  const file = (name) => join(dataDir, name);
  const logoDir = file('brand');
  const readJson = (name, fallback) => {
    try {
      return JSON.parse(readFileSync(file(name), 'utf8'));
    } catch {
      return fallback;
    }
  };
  const writeJson = (name, value) => {
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(file(name), JSON.stringify(value));
  };

  let config = { ...structuredClone(DEFAULT_CONFIG), ...readJson('config.json', {}) };
  let admin = readJson('admin.json', null);
  if (!admin) {
    admin = process.env.ADMIN_PASSWORD
      ? { email: process.env.ADMIN_EMAIL ?? DEFAULT_ADMIN.email, ...hashPassword(process.env.ADMIN_PASSWORD) }
      : { ...DEFAULT_ADMIN, email: process.env.ADMIN_EMAIL ?? DEFAULT_ADMIN.email };
  }
  const stats = { ...emptyStats(), ...readJson('analytics.json', {}) };
  const moderation = { banned: [], ...readJson('moderation.json', {}) };
  /** @type {{ at: number, room: string, name: string, text: string }[]} */
  const chatLog = [];
  /** @type {Map<string, number>} token → expiry */
  const tokens = new Map();
  const attempts = new Map();
  const lastBeat = new Map();
  let dirty = false;
  setInterval(() => {
    if (!dirty) return;
    dirty = false;
    // Per-day player lists are only needed for recent uniques; old days keep their counts.
    const cutoff = day(Date.now() - 40 * 86400_000);
    for (const [d, r] of Object.entries(stats.days)) if (d < cutoff && r.seen) delete r.seen;
    writeJson('analytics.json', stats);
  }, 30_000).unref();

  function send(res, status, body, headers = {}) {
    res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS', 'cache-control': 'no-store', ...headers });
    res.end(JSON.stringify(body));
  }

  function readBody(req, limit) {
    return new Promise((resolve, reject) => {
      let size = 0;
      const chunks = [];
      req.on('data', (c) => {
        size += c.length;
        if (size > limit) {
          reject(new Error('too big'));
          req.destroy();
        } else chunks.push(c);
      });
      req.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
        } catch {
          reject(new Error('bad json'));
        }
      });
      req.on('error', reject);
    });
  }

  const authed = (req) => {
    const m = /^Bearer ([a-f0-9-]{36})$/.exec(req.headers.authorization ?? '');
    if (!m) return false;
    const exp = tokens.get(m[1]);
    if (!exp || exp < Date.now()) {
      tokens.delete(m[1]);
      return false;
    }
    return true;
  };

  function publicConfig() {
    return {
      company: config.company,
      links: config.links,
      logoFrequency: config.logoFrequency,
      showSponsorCta: config.showSponsorCta,
      sponsors: config.sponsors.filter((s) => s.enabled).map((s) => ({ id: s.id, name: s.name, url: s.url, weight: s.weight, image: `/api/brand/${s.file}` })),
    };
  }

  // ————— analytics —————

  const count = (key, n = 1) => {
    stats.counters[key] = (stats.counters[key] ?? 0) + n;
  };

  function record(pid, sid, ev) {
    const now = Date.now();
    const d = day(now);
    const dayRec = (stats.days[d] ??= { players: 0, newPlayers: 0, sessions: 0, playSec: 0, seen: {} });
    let p = stats.players[pid];
    if (!p) {
      if (Object.keys(stats.players).length >= MAX_PLAYERS_TRACKED) return;
      p = stats.players[pid] = { first: now, last: now, sessions: 0, playSec: 0 };
      dayRec.newPlayers++;
    }
    p.last = now;
    if (!dayRec.seen[pid]) {
      dayRec.seen[pid] = 1;
      dayRec.players++;
    }
    lastBeat.set(pid, now);
    const data = ev.data && typeof ev.data === 'object' ? ev.data : {};
    const key = (s) => clean(String(s ?? ''), 32).replace(/[^\w.:-]/g, '_') || 'other';
    switch (ev.type) {
      case 'session':
        p.sessions++;
        dayRec.sessions++;
        p.lang = key(data.lang);
        p.device = key(data.device);
        count(`lang:${key(data.lang)}`);
        count(`device:${key(data.device)}`);
        count(`quality:${key(data.quality)}`);
        count(`tz:${key(data.tz)}`);
        break;
      case 'beat': {
        const sec = Math.min(120, Math.max(0, Number(data.sec) || 0));
        p.playSec += sec;
        dayRec.playSec += sec;
        if (data.fps) count(`fps:${Math.min(144, Math.round((Number(data.fps) || 0) / 10) * 10)}`);
        if (data.where) count(`time:${key(data.where)}`, sec);
        break;
      }
      case 'play':
      case 'area':
      case 'mission':
      case 'cityMission':
      case 'trophy':
      case 'restore':
      case 'trial':
      case 'race':
      case 'link':
        count(`${ev.type}:${key(data.id)}`);
        break;
      case 'sponsor_view':
      case 'sponsor_click': {
        const s = (stats.sponsors[key(data.id)] ??= { views: 0, clicks: 0 });
        if (ev.type === 'sponsor_view') s.views++;
        else s.clicks++;
        break;
      }
      default:
        return;
    }
    dirty = true;
  }

  function dashboard() {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = day(Date.now() - i * 86400_000);
      const r = stats.days[d];
      days.push({ day: d, players: r?.players ?? 0, newPlayers: r?.newPlayers ?? 0, sessions: r?.sessions ?? 0, playHours: +((r?.playSec ?? 0) / 3600).toFixed(2) });
    }
    const group = (prefix) =>
      Object.entries(stats.counters)
        .filter(([k]) => k.startsWith(prefix))
        .map(([k, v]) => ({ key: k.slice(prefix.length), value: Math.round(v) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 12);
    const players = Object.values(stats.players);
    const now = Date.now();
    const totalSec = players.reduce((s, p) => s + p.playSec, 0);
    const sessions = players.reduce((s, p) => s + p.sessions, 0);
    const l = live();
    const recentBeats = [...lastBeat.values()].filter((t) => now - t < 3 * 60_000).length;
    return {
      totals: {
        players: players.length,
        today: days[days.length - 1].players,
        week: new Set(Object.entries(stats.days).filter(([d]) => d >= day(now - 6 * 86400_000)).flatMap(([, r]) => Object.keys(r.seen ?? {}))).size,
        onlineNow: Math.max(recentBeats, l.online),
        inRooms: l.online,
        rooms: l.rooms,
        sessions,
        avgSessionMin: sessions ? +(totalSec / sessions / 60).toFixed(1) : 0,
        playHours: +(totalSec / 3600).toFixed(1),
        returning: players.filter((p) => p.sessions > 1).length,
      },
      days,
      chapters: group('play:'),
      areas: group('area:'),
      timeIn: group('time:').map((r) => ({ ...r, value: +(r.value / 3600).toFixed(2) })),
      languages: group('lang:'),
      devices: group('device:'),
      quality: group('quality:'),
      fps: group('fps:'),
      trophies: group('trophy:'),
      missions: [...group('mission:'), ...group('cityMission:')].sort((a, b) => b.value - a.value).slice(0, 12),
      links: group('link:'),
      sponsors: config.sponsors.map((s) => ({ id: s.id, name: s.name, enabled: s.enabled, ...(stats.sponsors[s.id] ?? { views: 0, clicks: 0 }) })),
      helao2: stats.sponsors.helao2 ?? { views: 0, clicks: 0 },
      roomSizes: l.roomSizes,
      since: stats.since,
    };
  }

  // ————— static files: the built game (dist/) and uploaded logos —————

  function serveFile(res, path, cache) {
    try {
      const st = statSync(path);
      if (!st.isFile()) return false;
      res.writeHead(200, { 'content-type': MIME[extname(path).toLowerCase()] ?? 'application/octet-stream', 'content-length': st.size, 'cache-control': cache, 'access-control-allow-origin': '*', 'x-content-type-options': 'nosniff' });
      res.end(readFileSync(path));
      return true;
    } catch {
      return false;
    }
  }

  async function handle(req, res, url) {
    const path = url.pathname;
    const method = req.method ?? 'GET';
    if (path.startsWith('/api/') && method === 'OPTIONS') return send(res, 204, {}), true;

    if (method === 'GET' && path === '/api/config') return send(res, 200, publicConfig()), true;

    if (method === 'GET' && path.startsWith('/api/brand/')) {
      const name = path.slice('/api/brand/'.length);
      if (!/^[a-z0-9-]+\.(png|jpe?g|webp)$/.test(name)) return send(res, 404, { ok: false }), true;
      if (!serveFile(res, join(logoDir, name), 'public, max-age=86400')) send(res, 404, { ok: false });
      return true;
    }

    if (method === 'POST' && path === '/api/analytics') {
      try {
        const body = await readBody(req, 64_000);
        const pid = clean(body.pid, 40);
        if (!/^[a-z0-9-]{8,40}$/.test(pid) || !Array.isArray(body.events)) return send(res, 400, { ok: false }), true;
        for (const ev of body.events.slice(0, 60)) record(pid, clean(body.sid, 40), ev);
        send(res, 200, { ok: true });
      } catch {
        send(res, 400, { ok: false });
      }
      return true;
    }

    if (path.startsWith('/api/admin/')) {
      const route = path.slice('/api/admin/'.length);
      if (route === 'login' && method === 'POST') {
        const ip = req.socket.remoteAddress ?? '?';
        const now = Date.now();
        const recent = (attempts.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
        if (recent.length >= 8) return send(res, 429, { ok: false, reason: 'Too many attempts. Try again in a few minutes.' }), true;
        try {
          const body = await readBody(req, 4000);
          const ok = clean(body.email, 120).toLowerCase() === admin.email.toLowerCase() && checkPassword(body.password ?? '', admin);
          if (!ok) {
            recent.push(now);
            attempts.set(ip, recent);
            return send(res, 401, { ok: false, reason: 'Wrong email or password.' }), true;
          }
          attempts.delete(ip);
          const token = randomUUID();
          tokens.set(token, now + TOKEN_TTL);
          console.log(`[admin] login from ${ip}`);
          send(res, 200, { ok: true, token, email: admin.email });
        } catch {
          send(res, 400, { ok: false, reason: 'Bad request.' });
        }
        return true;
      }
      if (!authed(req)) return send(res, 401, { ok: false, reason: 'Please log in again.' }), true;

      try {
        if (route === 'stats' && method === 'GET') return send(res, 200, dashboard()), true;
        if (route === 'config' && method === 'GET') return send(res, 200, config), true;
        if (route === 'config' && method === 'PUT') {
          config = sanitizeConfig(await readBody(req, 64_000), config);
          writeJson('config.json', config);
          return send(res, 200, config), true;
        }
        if (route === 'sponsor' && method === 'POST') {
          const body = await readBody(req, 2_000_000);
          const m = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(body.image ?? ''));
          if (!m) return send(res, 400, { ok: false, reason: 'Upload a PNG, JPEG or WebP image.' }), true;
          const bytes = Buffer.from(m[2], 'base64');
          if (bytes.length > 1_200_000) return send(res, 400, { ok: false, reason: 'Image too large (max ~1 MB).' }), true;
          if (body.kind !== 'company' && config.sponsors.length >= 40) return send(res, 400, { ok: false, reason: 'Too many sponsors (40 max).' }), true;
          const id = randomUUID().slice(0, 8);
          const fileName = `${id}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
          mkdirSync(logoDir, { recursive: true });
          writeFileSync(join(logoDir, fileName), bytes);
          if (body.kind === 'company') config.company.logo = `/api/brand/${fileName}`;
          else config.sponsors.push({ id, name: clean(body.name, 60) || 'Sponsor', url: safeUrl(body.url), file: fileName, weight: 1, enabled: true, added: Date.now() });
          writeJson('config.json', config);
          return send(res, 200, config), true;
        }
        if (route === 'sponsor' && method === 'DELETE') {
          const id = url.searchParams.get('id');
          const s = config.sponsors.find((x) => x.id === id);
          if (!s) return send(res, 404, { ok: false }), true;
          config.sponsors = config.sponsors.filter((x) => x !== s);
          const f = normalize(join(logoDir, s.file));
          if (f.startsWith(logoDir) && existsSync(f)) unlinkSync(f);
          writeJson('config.json', config);
          return send(res, 200, config), true;
        }
        if (route === 'password' && method === 'POST') {
          const body = await readBody(req, 4000);
          if (!checkPassword(body.current ?? '', admin)) return send(res, 400, { ok: false, reason: 'Current password is wrong.' }), true;
          const next = String(body.next ?? '');
          if (next.length < 8) return send(res, 400, { ok: false, reason: 'Use at least 8 characters.' }), true;
          admin = { email: clean(body.email, 120) || admin.email, ...hashPassword(next) };
          writeJson('admin.json', admin);
          tokens.clear();
          return send(res, 200, { ok: true }), true;
        }
        if (route === 'chat' && method === 'GET') return send(res, 200, { chat: chatLog.slice(-200), banned: moderation.banned }), true;
        if (route === 'ban' && method === 'POST') {
          const body = await readBody(req, 2000);
          const name = clean(body.name, 20);
          if (!name) return send(res, 400, { ok: false }), true;
          moderation.banned = body.ban ? [...new Set([...moderation.banned, name])] : moderation.banned.filter((n) => n !== name);
          writeJson('moderation.json', moderation);
          return send(res, 200, { ok: true, banned: moderation.banned }), true;
        }
        if (route === 'export' && method === 'GET') return send(res, 200, stats, { 'content-disposition': 'attachment; filename="paintland-analytics.json"' }), true;
      } catch (e) {
        return send(res, 400, { ok: false, reason: e instanceof Error ? e.message : 'bad request' }), true;
      }
      return send(res, 404, { ok: false }), true;
    }

    // The built game itself, so one process serves everything.
    if (distDir && method === 'GET' && !path.startsWith('/api/')) {
      const rel = decodeURIComponent(path === '/' ? '/index.html' : path);
      const full = normalize(join(distDir, rel));
      if (full.startsWith(distDir) && serveFile(res, full, rel.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache')) return true;
    }
    return false;
  }

  return {
    handle,
    maxRoom: () => config.maxPlayersPerRoom,
    isBanned: (name) => moderation.banned.some((b) => b.toLowerCase() === String(name ?? '').toLowerCase()),
    logChat(room, name, text) {
      chatLog.push({ at: Date.now(), room, name, text });
      if (chatLog.length > 500) chatLog.splice(0, chatLog.length - 500);
    },
  };
}

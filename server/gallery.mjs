// The road gallery: players publish roads made in the Road Studio, rate them
// (1–5 stars) and play them. Each week has a theme; the best-rated roads
// published that week win the weekly contest.
//
//   GET  /api/gallery?sort=top|new|week&q=&page=   → { roads, page, more }
//   GET  /api/gallery/contest                      → { week, theme, endsAt, top, winners }
//   POST /api/gallery/publish { code }             (signed in) → { id }
//   POST /api/gallery/rate    { id, stars }        (signed in, not your own road)
//   POST /api/gallery/play    { id }
//   POST /api/gallery/report  { id }               (signed in) — hidden after 3 reports until an admin looks
//   POST /api/gallery/delete  { id }               (signed in, your own road)

import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanText, clientIp } from './validate.mjs';

export const GALLERY_LIMITS = { codeMax: 2400, perDay: 10, pageSize: 12, maxRoads: 5000, hideAfterReports: 3 };

/** Weekly themes, in turn. */
export const THEMES = ['Longest ride', 'Loop-the-loops', 'Seaside cruise', 'Mountain pass', 'Night drive', 'Festival road', 'Rolls and twists', 'Short and sweet'];

/** ISO week key (e.g. 2026-W39) and when that week ends (Monday 00:00 UTC). */
export function weekOf(t) {
  const d = new Date(t);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
  const thursday = new Date(monday + 3 * 86400_000);
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  const week = Math.floor((thursday.getTime() - yearStart) / (7 * 86400_000)) + 1;
  return { key: `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`, endsAt: monday + 7 * 86400_000, index: Math.floor(monday / (7 * 86400_000)) };
}

export const themeFor = (t) => THEMES[((weekOf(t).index % THEMES.length) + THEMES.length) % THEMES.length];

/** A road share code the game can load (R1. + base64url JSON with six fields), and its name. */
export function checkRoadCode(code) {
  if (typeof code !== 'string' || code.length > GALLERY_LIMITS.codeMax || !/^R1\.[A-Za-z0-9_-]+$/.test(code)) return null;
  try {
    const data = JSON.parse(Buffer.from(code.slice(3), 'base64url').toString('utf8'));
    if (!Array.isArray(data) || data.length !== 6 || !Array.isArray(data[5]) || data[5].length < 2) return null;
    return { name: cleanText(data[0], 24) ?? 'Untitled road' };
  } catch {
    return null;
  }
}

/** Rating that doesn't let one 5-star vote beat twenty 4.8s: pulls toward 3 until there are votes. */
export function score(r) {
  const votes = Object.values(r.ratings);
  const sum = votes.reduce((a, b) => a + b, 0);
  return (sum + 3 * 3) / (votes.length + 3);
}

/**
 * @param {{ dataDir: string, userForToken: (t: string) => { id: string, name: string } | null, isBanned: (n: string) => boolean, now?: () => number }} opts
 */
export function createGallery({ dataDir, userForToken, isBanned, now = Date.now }) {
  const file = join(dataDir, 'gallery.json');
  /** @type {{ roads: any[], winners: Record<string, any[]> }} */
  let db = { roads: [], winners: {} };
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
  const timer = setInterval(() => dirty && persist(), 3000);
  timer.unref?.();
  const touch = () => (dirty = true);
  const plays = new Map(); // ip:id → last play time

  const send = (res, status, body) => {
    res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'cache-control': 'no-store' });
    res.end(JSON.stringify(body));
    return true;
  };
  const readBody = (req) =>
    new Promise((resolve) => {
      let size = 0;
      const chunks = [];
      req.on('data', (c) => {
        size += c.length;
        if (size <= 6000) chunks.push(c);
      });
      req.on('end', () => {
        if (size > 6000) return resolve(null);
        try {
          const v = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
          resolve(v && typeof v === 'object' ? v : null);
        } catch {
          resolve(null);
        }
      });
      req.on('error', () => resolve(null));
    });

  const visible = (r) => !r.hidden && !isBanned(r.author);
  function view(r, uid) {
    const votes = Object.values(r.ratings);
    return {
      id: r.id,
      code: r.code,
      title: r.title,
      author: r.author,
      week: r.week,
      created: r.created,
      plays: r.plays,
      count: votes.length,
      avg: votes.length ? +(votes.reduce((a, b) => a + b, 0) / votes.length).toFixed(2) : 0,
      mine: !!uid && r.uid === uid,
      myStars: uid ? (r.ratings[uid] ?? 0) : 0,
    };
  }

  /** The winners of a finished week (worked out once, then kept). */
  function winnersOf(week) {
    if (db.winners[week]) return db.winners[week];
    const list = db.roads
      .filter((r) => r.week === week && visible(r) && Object.keys(r.ratings).length >= 3)
      .sort((a, b) => score(b) - score(a))
      .slice(0, 3)
      .map((r) => ({ id: r.id, title: r.title, author: r.author, avg: view(r).avg, count: view(r).count }));
    if (weekOf(now()).key !== week) {
      db.winners[week] = list;
      touch();
    }
    return list;
  }

  async function handle(req, res, url) {
    const path = url.pathname;
    if (path !== '/api/gallery' && !path.startsWith('/api/gallery/')) return false;
    const method = req.method ?? 'GET';
    if (method === 'OPTIONS') return send(res, 204, {});
    const token = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization ?? '')?.[1];
    const user = token ? userForToken(token) : null;

    if (method === 'GET' && path === '/api/gallery') {
      const sort = url.searchParams.get('sort') ?? 'top';
      const q = (url.searchParams.get('q') ?? '').trim().toLowerCase().slice(0, 30);
      const page = Math.max(0, Math.min(200, Number(url.searchParams.get('page')) || 0));
      const week = weekOf(now()).key;
      let list = db.roads.filter(visible);
      if (sort === 'week') list = list.filter((r) => r.week === week);
      if (q) list = list.filter((r) => r.title.toLowerCase().includes(q) || r.author.toLowerCase().includes(q));
      list.sort(sort === 'new' ? (a, b) => b.created - a.created : (a, b) => score(b) - score(a) || b.plays - a.plays);
      const size = GALLERY_LIMITS.pageSize;
      return send(res, 200, { ok: true, page, more: list.length > (page + 1) * size, roads: list.slice(page * size, (page + 1) * size).map((r) => view(r, user?.id)) });
    }

    if (method === 'GET' && path === '/api/gallery/contest') {
      const w = weekOf(now());
      const last = weekOf(now() - 7 * 86400_000).key;
      const top = db.roads
        .filter((r) => r.week === w.key && visible(r))
        .sort((a, b) => score(b) - score(a))
        .slice(0, 5)
        .map((r) => view(r, user?.id));
      return send(res, 200, { ok: true, week: w.key, theme: themeFor(now()), endsAt: w.endsAt, top, winners: { week: last, theme: themeFor(now() - 7 * 86400_000), list: winnersOf(last) } });
    }

    if (method !== 'POST') return send(res, 404, { ok: false });
    const body = await readBody(req);
    if (!body) return send(res, 400, { ok: false, reason: 'Bad request.' });
    const road = typeof body.id === 'string' ? db.roads.find((r) => r.id === body.id) : null;

    if (path === '/api/gallery/play') {
      if (!road || !visible(road)) return send(res, 404, { ok: false });
      const key = `${clientIp(req)}:${road.id}`;
      if (now() - (plays.get(key) ?? 0) > 3600_000) {
        plays.set(key, now());
        if (plays.size > 50_000) plays.clear();
        road.plays++;
        touch();
      }
      return send(res, 200, { ok: true });
    }

    if (!user) return send(res, 401, { ok: false, reason: 'Sign in (Menu → Account) to do that.' });

    if (path === '/api/gallery/publish') {
      const info = checkRoadCode(body.code);
      if (!info) return send(res, 400, { ok: false, reason: 'That road code is not valid.' });
      const day = now() - 86400_000;
      if (db.roads.filter((r) => r.uid === user.id && r.created > day).length >= GALLERY_LIMITS.perDay) return send(res, 429, { ok: false, reason: 'That’s enough roads for today — come back tomorrow!' });
      const same = db.roads.find((r) => r.code === body.code);
      if (same) return send(res, 409, { ok: false, reason: 'This road is already in the gallery.', id: same.id });
      const r = { id: randomUUID(), code: body.code, title: info.name, author: user.name, uid: user.id, created: now(), week: weekOf(now()).key, plays: 0, ratings: {}, reports: [], hidden: false };
      db.roads.push(r);
      // Keep the gallery a sensible size: drop the lowest-scoring old roads first.
      if (db.roads.length > GALLERY_LIMITS.maxRoads) {
        const oldest = [...db.roads].filter((x) => now() - x.created > 30 * 86400_000).sort((a, b) => score(a) - score(b))[0];
        if (oldest) db.roads = db.roads.filter((x) => x !== oldest);
      }
      touch();
      console.log(`[gallery] "${r.title}" by ${r.author}`);
      return send(res, 200, { ok: true, id: r.id });
    }

    if (!road) return send(res, 404, { ok: false, reason: 'That road isn’t in the gallery any more.' });

    if (path === '/api/gallery/rate') {
      const stars = Number(body.stars);
      if (!Number.isInteger(stars) || stars < 1 || stars > 5) return send(res, 400, { ok: false, reason: 'Stars are 1 to 5.' });
      if (road.uid === user.id) return send(res, 400, { ok: false, reason: 'You can’t rate your own road.' });
      road.ratings[user.id] = stars;
      touch();
      return send(res, 200, { ok: true, road: view(road, user.id) });
    }

    if (path === '/api/gallery/report') {
      if (!road.reports.includes(user.id)) road.reports.push(user.id);
      if (road.reports.length >= GALLERY_LIMITS.hideAfterReports && !road.reviewed) road.hidden = true;
      touch();
      return send(res, 200, { ok: true });
    }

    if (path === '/api/gallery/delete') {
      if (road.uid !== user.id) return send(res, 403, { ok: false, reason: 'Only the maker can remove a road.' });
      db.roads = db.roads.filter((r) => r !== road);
      touch();
      return send(res, 200, { ok: true });
    }

    return send(res, 404, { ok: false });
  }

  return {
    handle,
    /** For the admin panel: roads that were reported. */
    reported: () => db.roads.filter((r) => r.reports.length).map((r) => ({ id: r.id, title: r.title, author: r.author, reports: r.reports.length, hidden: r.hidden, code: r.code })),
    /** Admin: keep (restore and stop auto-hiding) or remove a road. */
    moderate(id, action) {
      const r = db.roads.find((x) => x.id === id);
      if (!r) return false;
      if (action === 'remove') db.roads = db.roads.filter((x) => x !== r);
      else {
        r.hidden = false;
        r.reviewed = true;
      }
      touch();
      return true;
    },
    stats: () => ({ roads: db.roads.length, hidden: db.roads.filter((r) => r.hidden).length }),
    flush: () => persist(),
  };
}

// Player accounts: cloud saves, friends and clubs (runs inside server/relay.mjs).
//
//   POST /api/account/register { name, password }       → { token, user }
//   POST /api/account/login    { name, password }       → { token, user }
//   POST /api/account/logout
//   GET  /api/account/me                                 → { user }
//   POST /api/account/password { current, next }
//   POST /api/account/delete   { password }              → removes everything
//   GET  /api/account/save                               → { save, at }
//   PUT  /api/account/save     { save, base }            → { at } or 409 { save, at } when the cloud copy is newer
//   POST /api/account/presence { room }                  → shown to friends for 2 minutes
//   GET  /api/friends                                    → { friends, requests, sent }
//   POST /api/friends/request  { name }
//   POST /api/friends/respond  { name, accept }
//   POST /api/friends/remove   { name }
//   GET  /api/clubs?q=                                   → { clubs } (public list)
//   GET  /api/clubs/mine                                 → { club }
//   POST /api/clubs/create     { name, tag, motto }
//   POST /api/clubs/join       { tag }
//   POST /api/clubs/leave
//   POST /api/clubs/kick       { name }                  (club owner)
//
// Passwords are kept only as salted scrypt hashes; session tokens only as
// SHA-256 hashes, so a leaked data folder can't be used to log in. Logins are
// rate-limited per address and locked for a while after repeated failures.

import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanText, clientIp } from './validate.mjs';
import { checkPassword, hashPassword } from './admin.mjs';

export const ACCOUNT_LIMITS = {
  nameMin: 3,
  nameMax: 20,
  passwordMin: 8,
  passwordMax: 200,
  saveBytes: 256 * 1024,
  friends: 200,
  requests: 50,
  clubMembers: 50,
  sessionDays: 30,
  presenceMs: 2 * 60_000,
};

const NAME = /^[\p{L}\p{M}\p{N}_ .-]+$/u;
const TAG = /^[A-Z0-9]{2,5}$/;

/** A display name players can register, or null. */
export function cleanAccountName(name) {
  const n = cleanText(name, ACCOUNT_LIMITS.nameMax);
  if (!n || n.length < ACCOUNT_LIMITS.nameMin || !NAME.test(n) || /^[ .-]|[ .-]$/.test(n)) return null;
  return n;
}

export const nameKey = (name) => String(name ?? '').trim().toLowerCase();
const sha = (s) => createHash('sha256').update(String(s)).digest('hex');

/** Checks a new password; returns a reason when it's not acceptable. */
export function passwordProblem(password, name = '') {
  const p = String(password ?? '');
  if (p.length < ACCOUNT_LIMITS.passwordMin) return `Use at least ${ACCOUNT_LIMITS.passwordMin} characters.`;
  if (p.length > ACCOUNT_LIMITS.passwordMax) return 'That password is too long.';
  if (name && nameKey(p).includes(nameKey(name))) return 'Don’t use your name in your password.';
  if (/^(.)\1+$/.test(p) || /^(password|12345678|qwertyui)/i.test(p)) return 'That password is too easy to guess.';
  return null;
}

/**
 * @param {{ dataDir: string, isBanned: (name: string) => boolean, now?: () => number }} opts
 */
export function createAccounts({ dataDir, isBanned, now = Date.now }) {
  const file = join(dataDir, 'accounts.json');
  const saveDir = join(dataDir, 'saves');
  /** @type {{ users: Record<string, any>, sessions: Record<string, { uid: string, exp: number }>, clubs: Record<string, any> }} */
  let db = { users: {}, sessions: {}, clubs: {} };
  try {
    db = { ...db, ...JSON.parse(readFileSync(file, 'utf8')) };
  } catch {
    /* first run */
  }
  const byName = new Map(Object.values(db.users).map((u) => [nameKey(u.name), u.id]));
  let dirty = false;
  const persist = () => {
    dirty = false;
    mkdirSync(dataDir, { recursive: true });
    // Write then rename, so a crash mid-write never leaves a broken file.
    writeFileSync(`${file}.tmp`, JSON.stringify(db));
    renameSync(`${file}.tmp`, file);
  };
  const touch = () => {
    dirty = true;
  };
  const timer = setInterval(() => dirty && persist(), 2000);
  timer.unref?.();

  const registerLimit = new Map();
  const loginFails = new Map(); // ip → timestamps
  const lockouts = new Map(); // account id → { fails, until }

  function send(res, status, body) {
    if (res.headersSent) return true;
    res.writeHead(status, {
      ...(status === 413 ? { connection: 'close' } : {}), 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS', 'cache-control': 'no-store' });
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
          // Answer 413 and close, rather than dropping the connection mid-request.
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

  function startSession(user) {
    const token = randomBytes(32).toString('hex');
    db.sessions[sha(token)] = { uid: user.id, exp: now() + ACCOUNT_LIMITS.sessionDays * 86400_000 };
    // Drop expired sessions while we're here.
    for (const [k, s] of Object.entries(db.sessions)) if (s.exp < now()) delete db.sessions[k];
    touch();
    return token;
  }

  function userForToken(token) {
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null;
    const s = db.sessions[sha(token)];
    if (!s || s.exp < now()) return null;
    const u = db.users[s.uid];
    return u && !isBanned(u.name) ? u : null;
  }

  const bearer = (req) => /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization ?? '')?.[1] ?? null;
  const findByName = (name) => db.users[byName.get(nameKey(name)) ?? ''] ?? null;
  const online = (u) => !!u.presence && now() - u.presence.at < ACCOUNT_LIMITS.presenceMs;

  function me(u) {
    const club = u.club ? db.clubs[u.club] : null;
    return { name: u.name, created: u.created, saveAt: u.saveAt ?? 0, club: club ? { name: club.name, tag: club.tag } : null, friends: u.friends.length, requests: u.requests.length };
  }

  function friendView(uid) {
    const f = db.users[uid];
    if (!f) return null;
    const on = online(f);
    return { name: f.name, online: on, room: on ? f.presence.room : null, club: f.club && db.clubs[f.club] ? db.clubs[f.club].tag : null };
  }

  function clubView(c, full) {
    const out = { name: c.name, tag: c.tag, motto: c.motto, members: c.members.length, owner: db.users[c.owner]?.name ?? '' };
    if (full) out.list = c.members.map((id) => db.users[id]).filter(Boolean).map((m) => ({ name: m.name, online: online(m), owner: m.id === c.owner }));
    return out;
  }

  function leaveClub(u) {
    const c = u.club ? db.clubs[u.club] : null;
    u.club = null;
    if (!c) return;
    c.members = c.members.filter((id) => id !== u.id);
    if (!c.members.length) delete db.clubs[c.id];
    else if (c.owner === u.id) c.owner = c.members[0];
  }

  function deleteUser(u) {
    leaveClub(u);
    for (const other of Object.values(db.users)) {
      other.friends = other.friends.filter((id) => id !== u.id);
      other.requests = other.requests.filter((id) => id !== u.id);
    }
    for (const [k, s] of Object.entries(db.sessions)) if (s.uid === u.id) delete db.sessions[k];
    try {
      unlinkSync(join(saveDir, `${u.id}.json`));
    } catch {
      /* no save */
    }
    byName.delete(nameKey(u.name));
    delete db.users[u.id];
    touch();
  }

  async function handle(req, res, url) {
    const path = url.pathname;
    if (!path.startsWith('/api/account') && !path.startsWith('/api/friends') && !path.startsWith('/api/clubs')) return false;
    const method = req.method ?? 'GET';
    if (method === 'OPTIONS') return send(res, 204, {});
    const ip = clientIp(req);
    let body = {};
    if (method === 'POST' || method === 'PUT') {
      try {
        body = await readBody(req, path === '/api/account/save' ? ACCOUNT_LIMITS.saveBytes + 2048 : 4096);
      } catch (e) {
        return send(res, e.message === 'too big' ? 413 : 400, { ok: false, reason: e.message === 'too big' ? 'Too big.' : 'Bad request.' });
      }
    }

    if (method === 'POST' && path === '/api/account/register') {
      const t = now();
      const recent = (registerLimit.get(ip) ?? []).filter((x) => t - x < 3600_000);
      if (recent.length >= 5) return send(res, 429, { ok: false, reason: 'Too many new accounts from here. Try again later.' });
      const name = cleanAccountName(body.name);
      if (!name) return send(res, 400, { ok: false, reason: `Names are ${ACCOUNT_LIMITS.nameMin}–${ACCOUNT_LIMITS.nameMax} letters, numbers, spaces, dots, dashes or underscores.` });
      if (isBanned(name)) return send(res, 403, { ok: false, reason: 'That name can’t be used.' });
      if (byName.has(nameKey(name))) return send(res, 409, { ok: false, reason: 'That name is taken.' });
      const problem = passwordProblem(body.password, name);
      if (problem) return send(res, 400, { ok: false, reason: problem });
      recent.push(t);
      registerLimit.set(ip, recent);
      const user = { id: randomUUID(), name, ...hashPassword(body.password), created: t, friends: [], requests: [], club: null, saveAt: 0, presence: null };
      db.users[user.id] = user;
      byName.set(nameKey(name), user.id);
      console.log(`[accounts] registered "${name}"`);
      return send(res, 200, { ok: true, token: startSession(user), user: me(user) });
    }

    if (method === 'POST' && path === '/api/account/login') {
      const t = now();
      const fails = (loginFails.get(ip) ?? []).filter((x) => t - x < 15 * 60_000);
      if (fails.length >= 20) return send(res, 429, { ok: false, reason: 'Too many tries. Wait a few minutes.' });
      const user = findByName(body.name);
      const lock = user ? lockouts.get(user.id) : null;
      if (lock && lock.until > t) return send(res, 429, { ok: false, reason: 'This account is locked for a few minutes after too many wrong passwords.' });
      // Always hash something, so a missing name takes as long as a wrong password.
      const ok = user ? checkPassword(String(body.password ?? ''), user) : (checkPassword(String(body.password ?? ''), { salt: 'x', hash: '00' }), false);
      if (!ok) {
        fails.push(t);
        loginFails.set(ip, fails);
        if (user) {
          const l = lockouts.get(user.id) ?? { fails: 0, until: 0 };
          l.fails++;
          if (l.fails >= 10) {
            l.until = t + 15 * 60_000;
            l.fails = 0;
          }
          lockouts.set(user.id, l);
        }
        return send(res, 401, { ok: false, reason: 'Wrong name or password.' });
      }
      if (isBanned(user.name)) return send(res, 403, { ok: false, reason: 'This account is banned.' });
      lockouts.delete(user.id);
      return send(res, 200, { ok: true, token: startSession(user), user: me(user) });
    }

    if (method === 'GET' && path === '/api/clubs') {
      const q = nameKey(url.searchParams.get('q') ?? '').slice(0, 30);
      const list = Object.values(db.clubs)
        .filter((c) => !q || nameKey(c.name).includes(q) || nameKey(c.tag).includes(q))
        .sort((a, b) => b.members.length - a.members.length)
        .slice(0, 20)
        .map((c) => clubView(c, false));
      return send(res, 200, { ok: true, clubs: list });
    }

    // Everything below needs a signed-in player.
    const token = bearer(req);
    const u = userForToken(token);
    if (!u) return send(res, 401, { ok: false, reason: 'Please sign in again.' });

    if (method === 'POST' && path === '/api/account/logout') {
      delete db.sessions[sha(token)];
      touch();
      return send(res, 200, { ok: true });
    }
    if (method === 'GET' && path === '/api/account/me') return send(res, 200, { ok: true, user: me(u) });

    if (method === 'POST' && path === '/api/account/password') {
      if (!checkPassword(String(body.current ?? ''), u)) return send(res, 401, { ok: false, reason: 'Current password is wrong.' });
      const problem = passwordProblem(body.next, u.name);
      if (problem) return send(res, 400, { ok: false, reason: problem });
      Object.assign(u, hashPassword(body.next));
      // Sign out everywhere else.
      for (const [k, s] of Object.entries(db.sessions)) if (s.uid === u.id && k !== sha(token)) delete db.sessions[k];
      touch();
      return send(res, 200, { ok: true });
    }

    if (method === 'POST' && path === '/api/account/delete') {
      if (!checkPassword(String(body.password ?? ''), u)) return send(res, 401, { ok: false, reason: 'Password is wrong.' });
      console.log(`[accounts] deleted "${u.name}"`);
      deleteUser(u);
      return send(res, 200, { ok: true });
    }

    if (path === '/api/account/save') {
      const f = join(saveDir, `${u.id}.json`);
      if (method === 'GET') {
        let save = null;
        try {
          save = JSON.parse(readFileSync(f, 'utf8'));
        } catch {
          /* none yet */
        }
        return send(res, 200, { ok: true, save, at: u.saveAt ?? 0 });
      }
      if (method === 'PUT') {
        const save = body.save;
        if (!save || typeof save !== 'object' || Array.isArray(save)) return send(res, 400, { ok: false, reason: 'Bad save.' });
        const text = JSON.stringify(save);
        if (text.length > ACCOUNT_LIMITS.saveBytes) return send(res, 413, { ok: false, reason: 'Save too big.' });
        // Another device saved since this one last synced: hand back the newer copy.
        const base = Number(body.base) || 0;
        if ((u.saveAt ?? 0) > base && !body.force) {
          let current = null;
          try {
            current = JSON.parse(readFileSync(f, 'utf8'));
          } catch {
            /* none */
          }
          return send(res, 409, { ok: false, reason: 'newer', save: current, at: u.saveAt });
        }
        mkdirSync(saveDir, { recursive: true });
        writeFileSync(`${f}.tmp`, text);
        renameSync(`${f}.tmp`, f);
        u.saveAt = Math.max(now(), (u.saveAt ?? 0) + 1);
        touch();
        return send(res, 200, { ok: true, at: u.saveAt });
      }
    }

    if (method === 'POST' && path === '/api/account/presence') {
      const room = body.room == null ? null : cleanText(body.room, 40);
      u.presence = { at: now(), room: room && /^[\w-]+$/.test(room) ? room : null };
      touch();
      return send(res, 200, { ok: true });
    }

    if (method === 'GET' && path === '/api/friends') {
      const sent = Object.values(db.users).filter((o) => o.requests.includes(u.id)).map((o) => o.name);
      return send(res, 200, {
        ok: true,
        friends: u.friends.map(friendView).filter(Boolean).sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name)),
        requests: u.requests.map((id) => db.users[id]?.name).filter(Boolean),
        sent,
      });
    }

    if (method === 'POST' && path.startsWith('/api/friends/')) {
      const other = findByName(body.name);
      if (!other || other.id === u.id) return send(res, 404, { ok: false, reason: 'No player with that name.' });
      if (path === '/api/friends/request') {
        if (u.friends.includes(other.id)) return send(res, 200, { ok: true, already: true });
        // They already asked you: that's a yes from both sides.
        if (u.requests.includes(other.id)) {
          u.requests = u.requests.filter((id) => id !== other.id);
          u.friends.push(other.id);
          other.friends.push(u.id);
          touch();
          return send(res, 200, { ok: true, friends: true });
        }
        if (u.friends.length >= ACCOUNT_LIMITS.friends) return send(res, 400, { ok: false, reason: 'Your friends list is full.' });
        if (other.requests.length >= ACCOUNT_LIMITS.requests) return send(res, 400, { ok: false, reason: 'They have too many requests waiting.' });
        if (!other.requests.includes(u.id)) other.requests.push(u.id);
        touch();
        return send(res, 200, { ok: true });
      }
      if (path === '/api/friends/respond') {
        if (!u.requests.includes(other.id)) return send(res, 404, { ok: false, reason: 'No request from them.' });
        u.requests = u.requests.filter((id) => id !== other.id);
        if (body.accept === true && u.friends.length < ACCOUNT_LIMITS.friends) {
          u.friends.push(other.id);
          if (!other.friends.includes(u.id)) other.friends.push(u.id);
        }
        touch();
        return send(res, 200, { ok: true });
      }
      if (path === '/api/friends/remove') {
        u.friends = u.friends.filter((id) => id !== other.id);
        other.friends = other.friends.filter((id) => id !== u.id);
        other.requests = other.requests.filter((id) => id !== u.id);
        touch();
        return send(res, 200, { ok: true });
      }
    }

    if (method === 'GET' && path === '/api/clubs/mine') return send(res, 200, { ok: true, club: u.club && db.clubs[u.club] ? clubView(db.clubs[u.club], true) : null });

    if (method === 'POST' && path === '/api/clubs/create') {
      if (u.club) return send(res, 400, { ok: false, reason: 'Leave your club first.' });
      const name = cleanAccountName(body.name);
      const tag = String(body.tag ?? '').trim().toUpperCase();
      if (!name) return send(res, 400, { ok: false, reason: 'Club names are 3–20 letters or numbers.' });
      if (!TAG.test(tag)) return send(res, 400, { ok: false, reason: 'Tags are 2–5 letters or numbers.' });
      if (isBanned(name)) return send(res, 403, { ok: false, reason: 'That name can’t be used.' });
      if (Object.values(db.clubs).some((c) => c.tag === tag || nameKey(c.name) === nameKey(name))) return send(res, 409, { ok: false, reason: 'That club name or tag is taken.' });
      const c = { id: randomUUID(), name, tag, motto: cleanText(body.motto, 60) ?? '', owner: u.id, members: [u.id], created: now() };
      db.clubs[c.id] = c;
      u.club = c.id;
      touch();
      return send(res, 200, { ok: true, club: clubView(c, true) });
    }

    if (method === 'POST' && path === '/api/clubs/join') {
      if (u.club) return send(res, 400, { ok: false, reason: 'Leave your club first.' });
      const tag = String(body.tag ?? '').trim().toUpperCase();
      const c = Object.values(db.clubs).find((x) => x.tag === tag);
      if (!c) return send(res, 404, { ok: false, reason: 'No club with that tag.' });
      if (c.members.length >= ACCOUNT_LIMITS.clubMembers) return send(res, 400, { ok: false, reason: 'That club is full.' });
      c.members.push(u.id);
      u.club = c.id;
      touch();
      return send(res, 200, { ok: true, club: clubView(c, true) });
    }

    if (method === 'POST' && path === '/api/clubs/leave') {
      leaveClub(u);
      touch();
      return send(res, 200, { ok: true });
    }

    if (method === 'POST' && path === '/api/clubs/kick') {
      const c = u.club ? db.clubs[u.club] : null;
      if (!c || c.owner !== u.id) return send(res, 403, { ok: false, reason: 'Only the club owner can do that.' });
      const other = findByName(body.name);
      if (!other || other.club !== c.id || other.id === u.id) return send(res, 404, { ok: false, reason: 'Not in your club.' });
      leaveClub(other);
      touch();
      return send(res, 200, { ok: true });
    }

    return send(res, 404, { ok: false, reason: 'Not found.' });
  }

  return {
    handle,
    userForToken,
    /** Is this name registered to an account? */
    isTaken: (name) => byName.has(nameKey(name)),
    /** The account registered to a name (for admin grants), or null. */
    userByName: (name) => findByName(name),
    stats: () => ({ accounts: Object.keys(db.users).length, clubs: Object.keys(db.clubs).length, online: Object.values(db.users).filter(online).length }),
    flush: () => persist(),
  };
}

// Running several relays side by side (sharding by room).
//
// Every relay gets the same list of public addresses in RELAY_SHARDS
// (e.g. "wss://r0.example.com,wss://r1.example.com") and its own place in it
// with SHARD_INDEX. A room always lives on the same relay: shardFor(room).
// A player who connects to the wrong one is told where to go ({ t: 'moved' })
// and the game reconnects there.
//
// Shard 0 is the primary: it keeps accounts, bans, chat logs, the gallery,
// the admin panel and the leaderboard (one copy of the data, no file races).
// The other shards ask it over HTTP with a shared secret (SHARD_SECRET):
//   POST /api/internal/hello { acct, name }  → { name, verified, banned }
//   GET  /api/internal/bans                  → { banned: [...] }
//   POST /api/internal/chat  { lines: [...] } (chat log for moderation)
//   POST /api/internal/live  { index, rooms, online, roomSizes } (admin dashboard)

import { timingSafeEqual } from 'node:crypto';

/** FNV-1a: small, fast, and the same everywhere. */
export function hashRoom(room) {
  let h = 0x811c9dc5;
  const s = String(room);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export const shardFor = (room, count) => (count > 1 ? hashRoom(room) % count : 0);

/** Read the shard settings; a single relay when RELAY_SHARDS isn't set. */
export function shardConfig(env = process.env) {
  const urls = String(env.RELAY_SHARDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^wss?:\/\/[^\s]+$/.test(s));
  const index = Math.max(0, Math.floor(Number(env.SHARD_INDEX) || 0));
  if (urls.length < 2) return { count: 1, index: 0, urls: [], primary: true, primaryHttp: '', secret: '' };
  if (index >= urls.length) throw new Error(`SHARD_INDEX ${index} is outside RELAY_SHARDS (${urls.length} relays)`);
  const secret = String(env.SHARD_SECRET ?? '');
  if (secret.length < 16) throw new Error('Set SHARD_SECRET (16+ characters, the same on every relay) when using RELAY_SHARDS');
  // How shards reach the primary (an internal address is better than the public one).
  const primaryHttp = String(env.PRIMARY_URL ?? urls[0].replace(/^ws/, 'http')).replace(/\/$/, '');
  return { count: urls.length, index, urls, primary: index === 0, primaryHttp, secret };
}

/** Constant-time check of the shared secret header. */
export function secretOk(req, secret) {
  const got = Buffer.from(String(req.headers['x-shard-secret'] ?? ''));
  const want = Buffer.from(secret);
  return !!secret && got.length === want.length && timingSafeEqual(got, want);
}

/**
 * What a non-primary shard uses in place of the local accounts and admin:
 * names and bans come from the primary, chat lines and live numbers go to it.
 */
export function createShardLink({ primaryHttp, secret, index, fetchImpl = fetch, now = Date.now }) {
  const headers = { 'content-type': 'application/json', 'x-shard-secret': secret };
  let banned = new Set();
  let chat = [];
  const call = async (path, body) => {
    const res = await fetchImpl(primaryHttp + path, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`primary ${res.status}`);
    return res.json();
  };
  const refreshBans = () =>
    call('/api/internal/bans')
      .then((r) => (banned = new Set((r.banned ?? []).map((n) => String(n).toLowerCase()))))
      .catch(() => {});
  const flushChat = () => {
    if (!chat.length) return;
    const lines = chat.splice(0, 500);
    call('/api/internal/chat', { lines }).catch(() => {});
  };
  void refreshBans();
  const timers = [setInterval(refreshBans, 30_000), setInterval(flushChat, 5_000)];
  for (const t of timers) t.unref?.();
  return {
    /** Check a hello with the primary: a verified name, or a cleaned guest name. */
    async hello(acct, name) {
      try {
        return await call('/api/internal/hello', { acct: typeof acct === 'string' ? acct : null, name });
      } catch {
        // Primary unreachable: let the player in as a guest (never as verified).
        return { name: `${String(name ?? 'Painter').slice(0, 14)} guest`, verified: false, banned: false };
      }
    },
    isBanned: (name) => banned.has(String(name).toLowerCase()),
    logChat(room, name, text) {
      chat.push({ room, name, text, at: now() });
      if (chat.length > 2000) chat = chat.slice(-2000);
    },
    reportLive: (live) => call('/api/internal/live', { index, ...live }).catch(() => {}),
    stop: () => timers.forEach(clearInterval),
  };
}

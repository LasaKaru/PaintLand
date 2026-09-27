// Inkroads multiplayer relay (docs/09 §2).
//
// A small room server: clients join `ws://host:8787/?room=<code>`; every
// message a client sends is stamped with its server-assigned id and relayed to
// the others in the same room. The game simulation stays on the clients for
// now (cosy modes: cruise, hubs, photo walks), but the server checks every
// state for physically possible speed and movement, cleans all text, and drops
// clients that keep sending bad data. Authoritative rooms for ranked racing
// (re-simulated inputs) come later.
//
// The same port also serves the ranked time-trial leaderboard over HTTP:
//   GET  /leaderboard?chapter=sketch&handling=arcade   → top 10
//   POST /submit  { run }                              → re-simulated, then ranked
// Runs are replayed through the game's own simulation (dist-server/verify.js,
// built by `npm run build:server`) and only accepted if the lap time matches.
//
// Run: npm run server   (PORT, MAX_ROOM and DATA_DIR env vars are optional)
//
// Several relays can share the load: RELAY_SHARDS, SHARD_INDEX and
// SHARD_SECRET (see server/shards.mjs and docs/HOSTING.md).

import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { randomUUID } from 'node:crypto';
import { LIMITS, Strikes, checkRtc, cleanText, clientIp, validateState } from './validate.mjs';
import { createAdmin } from './admin.mjs';
import { createAccounts } from './accounts.mjs';
import { createMail } from './mail.mjs';
import { createGallery } from './gallery.mjs';
import { createStore } from './store.mjs';
import { createShardLink, secretOk, shardConfig, shardFor } from './shards.mjs';

const PORT = Number(process.env.PORT ?? 8787);
const MAX_ROOM_ENV = process.env.MAX_ROOM ? Number(process.env.MAX_ROOM) : null;
const MAX_MESSAGE = 4096;
/** Race finishes carry the recorded inputs (4 bytes a step) for re-simulation. */
const MAX_RACE_MESSAGE = 96_000;
const MAX_RATE = 40; // messages per second per client
const ALLOWED = new Set(['hello', 'state', 'chat', 'emote', 'bye', 'race', 'rtc']);
/** Voice chat signalling (WebRTC offers carry SDP, a few KB). */
const MAX_RTC_MESSAGE = 16_000;

/** @type {Map<string, Set<import('ws').WebSocket>>} */
const rooms = new Map();

// Outgoing messages to each player are sent together every RELAY_BATCH_MS
// (one frame holding a JSON array) instead of one frame each: in a room of 8
// at 12 updates a second that is ~20 frames a second per player instead of ~84,
// which is most of the relay's work. 0 sends every message on its own.
const BATCH_MS = Math.max(0, Math.min(100, Number(process.env.RELAY_BATCH_MS ?? 40)));
const pending = new Set();
function post(peer, text) {
  if (!BATCH_MS) return peer.send(text);
  (peer.outbox ??= []).push(text);
  pending.add(peer);
}
if (BATCH_MS)
  setInterval(() => {
    for (const peer of pending) {
      const q = peer.outbox;
      peer.outbox = [];
      if (peer.readyState === 1 && q.length) peer.send(q.length === 1 ? q[0] : `[${q.join(',')}]`);
    }
    pending.clear();
  }, BATCH_MS);

// ————— leaderboard —————

const here = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR ?? join(here, 'data');
const BOARD_FILE = join(DATA_DIR, 'leaderboard.json');
const BOARD_SIZE = 50;
let verifyRun = null;
try {
  ({ verifyRun } = await import('../dist-server/verify.js'));
} catch {
  console.warn('Leaderboard disabled: run `npm run build:server` to build the run verifier.');
}
/** @type {Record<string, { name: string, time: number, vehicle: string, at: number }[]>} */
let boards = {};
try {
  boards = JSON.parse(readFileSync(BOARD_FILE, 'utf8'));
} catch {
  boards = {};
}
const saveBoards = () => {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(BOARD_FILE, JSON.stringify(boards));
};
const boardKey = (chapter, handling) => `${String(chapter).slice(0, 24)}:${handling === 'realistic' ? 'realistic' : 'arcade'}`;
const lastSubmit = new Map();

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET, POST, OPTIONS' });
  res.end(JSON.stringify(body));
}

const SHARD = shardConfig();
/** Live numbers other shards report to the primary (for the admin dashboard). */
const shardLive = new Map();
const localLive = () => {
  const roomSizes = {};
  let online = 0;
  for (const [name, set] of rooms) {
    roomSizes[name] = set.size;
    online += set.size;
  }
  return { rooms: rooms.size, online, roomSizes };
};

// Admin panel, branding, analytics and the built game (dist/) share this port.
// Only the primary relay (the only one without RELAY_SHARDS) keeps this data.
const DIST_DIR = process.env.DIST_DIR ?? join(here, '..', 'dist');
const admin = !SHARD.primary ? null : createAdmin({
  dataDir: DATA_DIR,
  distDir: existsSync(join(DIST_DIR, 'index.html')) ? DIST_DIR : undefined,
  live: () => {
    const all = localLive();
    for (const [i, r] of shardLive) {
      if (Date.now() - r.at > 60_000) {
        shardLive.delete(i);
        continue;
      }
      all.rooms += r.rooms;
      all.online += r.online;
      Object.assign(all.roomSizes, r.roomSizes);
    }
    return all;
  },
  accounts: () => accounts.stats(),
  gallery: () => gallery,
  store: () => store,
});
// Player accounts (cloud saves, friends, clubs) share the same data folder.
const accounts = !SHARD.primary ? null : createAccounts({ dataDir: DATA_DIR, isBanned: (n) => admin.isBanned(n), onDelete: (uid) => mail?.forget(uid) });
// Postcards between friends and players' homes in Harbour Town.
const mail = !SHARD.primary ? null : createMail({ dataDir: DATA_DIR, userForToken: (t) => accounts.userForToken(t), userByName: (n) => accounts.userByName(n), userById: (id) => accounts.userById(id) });
// The road gallery and weekly contest (publishing and rating need an account).
const gallery = !SHARD.primary ? null : createGallery({ dataDir: DATA_DIR, userForToken: (t) => accounts.userForToken(t), isBanned: (n) => admin.isBanned(n) });
// Patron entitlements for the season pass (codes and admin grants; the hook for payments later).
const store = !SHARD.primary ? null : createStore({ dataDir: DATA_DIR, userForToken: (t) => accounts.userForToken(t), userByName: (n) => accounts.userByName(n) });
const maxRoom = () => MAX_ROOM_ENV ?? admin?.maxRoom() ?? 32;

/** Who a player is, and whether they may talk: the primary answers for every shard. */
const identity = SHARD.primary
  ? {
      async hello(acct, rawName) {
        const user = typeof acct === 'string' ? accounts.userForToken(acct) : null;
        if (user) return { name: user.name, verified: true, banned: admin.isBanned(user.name) };
        let name = cleanText(rawName, LIMITS.name) ?? 'Painter';
        // Guests can't pose as a registered player.
        if (accounts.isTaken(name)) name = `${name.slice(0, LIMITS.name - 6)} guest`;
        return { name, verified: false, banned: admin.isBanned(name) };
      },
      isBanned: (n) => admin.isBanned(n),
      logChat: (room, n, text) => admin.logChat(room, n, text),
    }
  : createShardLink({ primaryHttp: SHARD.primaryHttp, secret: SHARD.secret, index: SHARD.index });
if (!SHARD.primary) setInterval(() => identity.reportLive(localLive()), 15_000).unref();

/** Primary only: what the other shards ask for. */
async function internalHttp(req, res, url) {
  if (!url.pathname.startsWith('/api/internal/')) return false;
  if (!SHARD.primary || !secretOk(req, SHARD.secret)) return send(res, 403, { ok: false }), true;
  const route = url.pathname.slice('/api/internal/'.length);
  const body = req.method === 'POST' ? await readJsonBody(req, 256_000) : null;
  if (route === 'bans') return send(res, 200, { banned: admin.bannedList() }), true;
  if (route === 'hello' && body) return send(res, 200, await identity.hello(body.acct, body.name)), true;
  if (route === 'chat' && body && Array.isArray(body.lines)) {
    for (const l of body.lines.slice(0, 500)) {
      const text = cleanText(l?.text);
      if (text) admin.logChat(String(l.room ?? '').slice(0, 32), cleanText(l.name, LIMITS.name) ?? 'Painter', text);
    }
    return send(res, 200, { ok: true }), true;
  }
  if (route === 'live' && body) {
    const sizes = {};
    for (const [k, v] of Object.entries(body.roomSizes ?? {}).slice(0, 5000)) sizes[String(k).slice(0, 32)] = Math.max(0, Math.min(1000, Number(v) || 0));
    shardLive.set(Number(body.index) || 0, { at: Date.now(), rooms: Math.max(0, Number(body.rooms) || 0), online: Math.max(0, Number(body.online) || 0), roomSizes: sizes });
    return send(res, 200, { ok: true }), true;
  }
  return send(res, 404, { ok: false }), true;
}

function readJsonBody(req, max) {
  return new Promise((resolve) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size <= max) chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(size > max ? null : JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        resolve(null);
      }
    });
  });
}

const http = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (!SHARD.primary) {
    // Room-only relay: everything else lives on the primary.
    if (url.pathname === '/healthz') return send(res, 200, { ok: true, shard: SHARD.index });
    return void internalHttp(req, res, url).then((h) => h || send(res, 421, { ok: false, reason: 'This relay only hosts rooms.', primary: SHARD.urls[0] }));
  }
  internalHttp(req, res, url)
    .then((handled) => handled || accounts.handle(req, res, url))
    .then((handled) => handled || mail.handle(req, res, url))
    .then((handled) => handled || gallery.handle(req, res, url))
    .then((handled) => handled || store.handle(req, res, url))
    .then((handled) => handled || admin.handle(req, res, url))
    .then((handled) => {
      if (!handled) relayHttp(req, res, url);
    })
    .catch(() => send(res, 500, { ok: false }));
});

function relayHttp(req, res, url) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method === 'GET' && url.pathname === '/leaderboard') {
    const list = boards[boardKey(url.searchParams.get('chapter'), url.searchParams.get('handling'))] ?? [];
    return send(res, 200, { enabled: !!verifyRun, entries: list.slice(0, 10) });
  }
  if (req.method === 'POST' && url.pathname === '/submit') {
    if (!verifyRun) return send(res, 503, { ok: false, reason: 'leaderboard disabled on this server' });
    const ip = clientIp(req);
    const now = Date.now();
    if (now - (lastSubmit.get(ip) ?? 0) < 3000) return send(res, 429, { ok: false, reason: 'slow down' });
    lastSubmit.set(ip, now);
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 400_000) req.destroy();
    });
    req.on('end', () => {
      let run;
      try {
        run = JSON.parse(body);
      } catch {
        return send(res, 400, { ok: false, reason: 'bad json' });
      }
      const result = verifyRun(run);
      if (!result.ok) {
        console.log(`[board] rejected ${cleanText(run?.name, LIMITS.name)}: ${result.reason}`);
        return send(res, 200, result);
      }
      const key = boardKey(run.chapter, run.handling);
      const list = (boards[key] ??= []);
      const name = cleanText(run.name, LIMITS.name) ?? 'Painter';
      const entry = { name, time: Math.round(result.time * 1000) / 1000, vehicle: String(run.vehicle), at: now };
      // One entry per name: keep their best.
      const old = list.findIndex((e) => e.name === name);
      if (old >= 0 && list[old].time <= entry.time) return send(res, 200, { ok: true, time: result.time, rank: old + 1, best: false });
      if (old >= 0) list.splice(old, 1);
      list.push(entry);
      list.sort((a, b) => a.time - b.time);
      list.length = Math.min(list.length, BOARD_SIZE);
      saveBoards();
      const rank = list.indexOf(entry) + 1;
      console.log(`[board] ${key} ${name} ${entry.time}s → #${rank || '—'}`);
      send(res, 200, { ok: true, time: result.time, rank: rank || null, best: true });
    });
    return;
  }
  send(res, 404, { ok: false, reason: 'not found' });
}

const wss = new WebSocketServer({ server: http, maxPayload: MAX_RACE_MESSAGE });

wss.on('connection', (socket, req) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const room = (url.searchParams.get('room') ?? 'lobby').slice(0, 32).replace(/[^a-zA-Z0-9_-]/g, '') || 'lobby';
  // Each room lives on one relay: send the player there.
  const home = shardFor(room, SHARD.count);
  if (home !== SHARD.index) {
    socket.send(JSON.stringify({ t: 'moved', url: SHARD.urls[home], room }));
    socket.close(4010, 'moved');
    return;
  }
  let members = rooms.get(room);
  if (!members) {
    members = new Set();
    rooms.set(room, members);
  }
  if (members.size >= maxRoom()) {
    socket.close(4001, 'room full');
    return;
  }
  const id = randomUUID().slice(0, 8);
  socket.pid = id;
  members.add(socket);
  socket.send(JSON.stringify({ t: 'welcome', id, room, peers: members.size - 1 }));

  let windowStart = Date.now();
  let count = 0;
  let alive = true;
  let last = null;
  let name = 'Painter';
  const strikes = new Strikes();
  const strike = (reason) => {
    if (strikes.add(Date.now())) {
      console.log(`[${room}] dropping ${id}: ${reason}`);
      socket.close(4003, 'invalid data');
    }
  };
  socket.on('pong', () => (alive = true));

  socket.on('message', (raw) => {
    const now = Date.now();
    if (now - windowStart > 1000) {
      windowStart = now;
      count = 0;
    }
    if (++count > MAX_RATE) return;
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object' || !ALLOWED.has(msg.t)) return strike('unknown message');
    const size = String(raw).length;
    if (size > MAX_MESSAGE && !(msg.t === 'race' && msg.a === 'finish') && !(msg.t === 'rtc' && size <= MAX_RTC_MESSAGE)) return strike('message too big');
    if (msg.t === 'rtc') {
      // Voice chat signalling: only the known fields, and offers/answers/candidates
      // go to the one player they are for — never broadcast.
      const out = checkRtc(msg);
      if (!out) return strike('bad rtc');
      out.id = id;
      const text = JSON.stringify(out);
      for (const peer of members) if (peer !== socket && peer.readyState === 1 && (!out.to || peer.pid === out.to)) post(peer, text);
      return;
    }
    if (msg.t === 'race') {
      if (typeof msg.race !== 'string' || msg.race.length > 40) return strike('bad race');
      if (msg.a === 'start') {
        if (typeof msg.chapter !== 'string' || msg.chapter.length > 24) return strike('bad race chapter');
        msg.delay = Math.min(10000, Math.max(3000, Number(msg.delay) || 5000));
      } else if (msg.a === 'finish') {
        msg.name = cleanText(msg.name, LIMITS.name) ?? 'Painter';
        // Re-simulate the lap: the time only counts as verified if the replay matches.
        if (verifyRun && msg.run && typeof msg.run === 'object') {
          const res = verifyRun({ ...msg.run, name: msg.name });
          msg.verified = res.ok;
          if (res.ok) msg.time = res.time;
          socket.send(JSON.stringify({ t: 'race', a: 'verdict', race: msg.race, ok: res.ok, time: res.ok ? res.time : undefined, reason: res.ok ? undefined : res.reason }));
        } else msg.verified = false;
        delete msg.run;
      } else return strike('bad race action');
    }
    if (msg.t === 'state') {
      const check = validateState(msg, last, now);
      if (!check.ok) return strike(check.reason);
      last = { s: msg.s, chapter: msg.chapter, at: now };
    }
    if (msg.t === 'chat') {
      msg.text = cleanText(msg.text);
      if (!msg.text || identity.isBanned(name)) return;
      identity.logChat(room, name, msg.text);
    }
    if (msg.t === 'hello') {
      // A signed-in player proves their name with their session token (never passed on).
      const acct = msg.acct;
      delete msg.acct;
      delete msg.verified;
      void identity.hello(acct, msg.name).then((who) => {
        if (socket.readyState !== 1) return;
        name = who.name;
        if (who.banned) return socket.close(4004, 'banned');
        msg.name = who.name;
        if (who.verified) msg.verified = true;
        msg.id = id;
        const out = JSON.stringify(msg);
        for (const peer of members) if (peer !== socket && peer.readyState === 1) post(peer, out);
      });
      return;
    }
    msg.id = id; // never trust a client-provided id
    const out = JSON.stringify(msg);
    for (const peer of members) if (peer !== socket && peer.readyState === 1) post(peer, out);
  });

  socket.on('close', () => {
    members.delete(socket);
    pending.delete(socket);
    const bye = JSON.stringify({ t: 'bye', id });
    for (const peer of members) if (peer.readyState === 1) post(peer, bye);
    if (members.size === 0) rooms.delete(room);
  });

  const heartbeat = setInterval(() => {
    if (!alive) {
      socket.terminate();
      clearInterval(heartbeat);
      return;
    }
    alive = false;
    socket.ping();
  }, 20000);
  socket.on('close', () => clearInterval(heartbeat));
});

http.listen(PORT, () => console.log(`Inkroads relay listening on ws://localhost:${PORT} (rooms of up to ${maxRoom()}) · leaderboard ${verifyRun ? 'on' : 'off'} at http://localhost:${PORT}/leaderboard`));

// Save accounts before the host stops the process (deploys, restarts).
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    try {
      accounts?.flush();
      gallery?.flush();
      store?.flush();
      mail?.flush();
    } finally {
      process.exit(0);
    }
  });
}

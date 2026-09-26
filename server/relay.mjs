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

import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { randomUUID } from 'node:crypto';
import { LIMITS, Strikes, checkRtc, cleanText, clientIp, validateState } from './validate.mjs';
import { createAdmin } from './admin.mjs';
import { createAccounts } from './accounts.mjs';
import { createGallery } from './gallery.mjs';
import { createStore } from './store.mjs';

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

// Admin panel, branding, analytics and the built game (dist/) share this port.
const DIST_DIR = process.env.DIST_DIR ?? join(here, '..', 'dist');
const admin = createAdmin({
  dataDir: DATA_DIR,
  distDir: existsSync(join(DIST_DIR, 'index.html')) ? DIST_DIR : undefined,
  live: () => {
    const roomSizes = {};
    let online = 0;
    for (const [name, set] of rooms) {
      roomSizes[name] = set.size;
      online += set.size;
    }
    return { rooms: rooms.size, online, roomSizes };
  },
  accounts: () => accounts.stats(),
  gallery: () => gallery,
  store: () => store,
});
// Player accounts (cloud saves, friends, clubs) share the same data folder.
const accounts = createAccounts({ dataDir: DATA_DIR, isBanned: (n) => admin.isBanned(n) });
// The road gallery and weekly contest (publishing and rating need an account).
const gallery = createGallery({ dataDir: DATA_DIR, userForToken: (t) => accounts.userForToken(t), isBanned: (n) => admin.isBanned(n) });
// Patron entitlements for the season pass (codes and admin grants; the hook for payments later).
const store = createStore({ dataDir: DATA_DIR, userForToken: (t) => accounts.userForToken(t), userByName: (n) => accounts.userByName(n) });
const maxRoom = () => MAX_ROOM_ENV ?? admin.maxRoom();

const http = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  accounts
    .handle(req, res, url)
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
      for (const peer of members) if (peer !== socket && peer.readyState === 1 && (!out.to || peer.pid === out.to)) peer.send(text);
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
      if (!msg.text || admin.isBanned(name)) return;
      admin.logChat(room, name, msg.text);
    }
    if (msg.t === 'hello') {
      // A signed-in player proves their name with their session token (never passed on).
      const user = typeof msg.acct === 'string' ? accounts.userForToken(msg.acct) : null;
      delete msg.acct;
      delete msg.verified;
      if (user) {
        msg.name = user.name;
        msg.verified = true;
      } else {
        msg.name = cleanText(msg.name, LIMITS.name) ?? 'Painter';
        // Guests can't pose as a registered player.
        if (accounts.isTaken(msg.name)) msg.name = `${msg.name.slice(0, LIMITS.name - 6)} guest`;
      }
      name = msg.name;
      if (admin.isBanned(name)) {
        socket.close(4004, 'banned');
        return;
      }
    }
    msg.id = id; // never trust a client-provided id
    const out = JSON.stringify(msg);
    for (const peer of members) if (peer !== socket && peer.readyState === 1) peer.send(out);
  });

  socket.on('close', () => {
    members.delete(socket);
    for (const peer of members) if (peer.readyState === 1) peer.send(JSON.stringify({ t: 'bye', id }));
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
      accounts.flush();
      gallery.flush();
      store.flush();
    } finally {
      process.exit(0);
    }
  });
}

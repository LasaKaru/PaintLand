// PaintLand multiplayer relay (docs/09 §2).
//
// A small room server: clients join `ws://host:8787/?room=<code>`; every
// message a client sends is stamped with its server-assigned id and relayed to
// the others in the same room. The game simulation stays on the clients for
// now (cosy modes: cruise, hubs, photo walks), but the server checks every
// state for physically possible speed and movement, cleans all text, and drops
// clients that keep sending bad data. Authoritative rooms for ranked racing
// (re-simulated inputs) come later.
//
// Run: node server/relay.mjs   (PORT and MAX_ROOM env vars are optional)

import { WebSocketServer } from 'ws';
import { randomUUID } from 'node:crypto';
import { LIMITS, Strikes, cleanText, validateState } from './validate.mjs';

const PORT = Number(process.env.PORT ?? 8787);
const MAX_ROOM = Number(process.env.MAX_ROOM ?? 32);
const MAX_MESSAGE = 4096;
const MAX_RATE = 40; // messages per second per client
const ALLOWED = new Set(['hello', 'state', 'chat', 'emote', 'bye']);

/** @type {Map<string, Set<import('ws').WebSocket>>} */
const rooms = new Map();

const wss = new WebSocketServer({ port: PORT, maxPayload: MAX_MESSAGE });

wss.on('connection', (socket, req) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const room = (url.searchParams.get('room') ?? 'lobby').slice(0, 32).replace(/[^a-zA-Z0-9_-]/g, '') || 'lobby';
  let members = rooms.get(room);
  if (!members) {
    members = new Set();
    rooms.set(room, members);
  }
  if (members.size >= MAX_ROOM) {
    socket.close(4001, 'room full');
    return;
  }
  const id = randomUUID().slice(0, 8);
  members.add(socket);
  socket.send(JSON.stringify({ t: 'welcome', id, room, peers: members.size - 1 }));

  let windowStart = Date.now();
  let count = 0;
  let alive = true;
  let last = null;
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
    if (msg.t === 'state') {
      const check = validateState(msg, last, now);
      if (!check.ok) return strike(check.reason);
      last = { s: msg.s, chapter: msg.chapter, at: now };
    }
    if (msg.t === 'chat') {
      msg.text = cleanText(msg.text);
      if (!msg.text) return;
    }
    if (msg.t === 'hello') msg.name = cleanText(msg.name, LIMITS.name) ?? 'Painter';
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

console.log(`PaintLand relay listening on ws://localhost:${PORT}  (rooms of up to ${MAX_ROOM})`);

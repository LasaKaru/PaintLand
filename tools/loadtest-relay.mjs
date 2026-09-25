// Relay load test (docs/11 §5): many fake players in many rooms sending the
// same messages the game sends, measuring what the relay delivers.
//
//   node tools/loadtest-relay.mjs [--url ws://localhost:8787] [--clients 200]
//        [--room-size 8] [--hz 20] [--seconds 20]
//
// Each fake player says hello, then drives slowly around Harbour Town at the
// given rate (valid states, so no strikes), timestamping every message.
// Prints delivered messages per second, relay latency (p50 / p95 / p99),
// drops and refusals as JSON. Run it against a relay you own — never someone
// else's server.
import WebSocket from 'ws';

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
};
const URL_BASE = arg('url', 'ws://localhost:8787');
const CLIENTS = Number(arg('clients', 200));
const ROOM_SIZE = Number(arg('room-size', 8));
const HZ = Number(arg('hz', 20));
const SECONDS = Number(arg('seconds', 20));

const latencies = [];
let received = 0;
let sent = 0;
let closed = 0;
const closeCodes = {};
let opened = 0;
const sockets = [];
const run = `lt${Date.now().toString(36)}`;

function player(i) {
  const room = `${run}-${Math.floor(i / ROOM_SIZE)}`;
  const ws = new WebSocket(`${URL_BASE}/?room=${room}`);
  let x = (i % 10) * 8 - 40;
  let z = Math.floor(i / 10) % 10 * 8 - 40;
  let heading = (i * 0.7) % (Math.PI * 2);
  let timer = null;
  ws.on('open', () => {
    opened++;
    ws.send(JSON.stringify({ t: 'hello', name: `Load${i}`, look: {}, vehicle: 'rover', vlook: {}, chapter: 'hub' }));
    timer = setInterval(() => {
      heading += 0.02;
      x = Math.max(-100, Math.min(100, x + Math.sin(heading) * 0.4));
      z = Math.max(-100, Math.min(60, z + Math.cos(heading) * 0.4));
      ws.send(JSON.stringify({ t: 'state', chapter: 'hub', mode: 'drive', s: z + 1000, x, h: 0, yaw: heading, v: 8, ts: Date.now() }));
      sent++;
    }, 1000 / HZ);
  });
  ws.on('message', (raw) => {
    const msg = JSON.parse(String(raw));
    if (msg.t !== 'state') return;
    received++;
    if (typeof msg.ts === 'number') latencies.push(Date.now() - msg.ts);
  });
  ws.on('close', (code) => {
    clearInterval(timer);
    closed++;
    closeCodes[code] = (closeCodes[code] ?? 0) + 1;
  });
  ws.on('error', () => undefined);
  sockets.push(ws);
}

// Ramp up over a second so the relay is not hit by one burst of handshakes.
for (let i = 0; i < CLIENTS; i++) setTimeout(() => player(i), (i / CLIENTS) * 1000);

setTimeout(() => {
  for (const ws of sockets) ws.close(1000);
  setTimeout(() => {
    latencies.sort((a, b) => a - b);
    const q = (p) => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * p))] ?? null;
    const seconds = SECONDS;
    const expected = Math.round(sent * (ROOM_SIZE - 1));
    console.log(JSON.stringify({
      url: URL_BASE,
      clients: CLIENTS,
      opened,
      roomSize: ROOM_SIZE,
      hz: HZ,
      seconds,
      sentPerSec: Math.round(sent / seconds),
      deliveredPerSec: Math.round(received / seconds),
      delivery: expected ? +(received / expected).toFixed(3) : null,
      latencyMs: { p50: q(0.5), p95: q(0.95), p99: q(0.99), max: latencies.at(-1) ?? null },
      closedEarly: Object.fromEntries(Object.entries(closeCodes).filter(([c]) => c !== '1000' && c !== '1005')),
    }, null, 2));
    process.exit(0);
  }, 500);
}, (SECONDS + 1) * 1000);

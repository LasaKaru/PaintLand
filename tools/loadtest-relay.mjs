// Relay load test (docs/11 §5): many fake players in many rooms sending the
// same messages the game sends, measuring what the relay delivers.
//
//   node tools/loadtest-relay.mjs [--url ws://localhost:8787] [--clients 200]
//        [--room-size 8] [--hz 12] [--seconds 20] [--workers 1]
//
// Each fake player says hello, then drives slowly around Harbour Town at the
// given rate (valid states, so no strikes), timestamping every message. With
// several relays (server/shards.mjs) point --url at any one of them: players
// whose room lives elsewhere are sent there, as the game is. --workers splits
// the players over several processes, because one Node process can't drive
// thousands of sockets by itself.
//
// Prints delivered messages per second, relay latency (p50 / p95 / p99),
// drops, refusals and moves as JSON. Run it against a relay you own — never
// someone else's server.
import WebSocket from 'ws';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
};
const URL_BASE = arg('url', 'ws://localhost:8787');
const CLIENTS = Number(arg('clients', 200));
const ROOM_SIZE = Number(arg('room-size', 8));
const HZ = Number(arg('hz', 12));
const SECONDS = Number(arg('seconds', 20));
const WORKERS = Number(arg('workers', 1));
const OFFSET = Number(arg('offset', 0));
const COUNT = Number(arg('count', CLIENTS));
const RUN = arg('run', `lt${Date.now().toString(36)}`);
/** Latency histogram in 1 ms buckets up to 10 s (mergeable across workers). */
const BUCKETS = 10_000;

if (WORKERS > 1 && !process.send) {
  // Parent: split the players into whole rooms per worker and merge the results.
  const rooms = Math.ceil(CLIENTS / ROOM_SIZE);
  const per = Math.ceil(rooms / WORKERS) * ROOM_SIZE;
  const parts = [];
  for (let w = 0; w * per < CLIENTS; w++) {
    const offset = w * per;
    const count = Math.min(per, CLIENTS - offset);
    parts.push(
      new Promise((resolve) => {
        const child = fork(fileURLToPath(import.meta.url), ['--url', URL_BASE, '--clients', String(CLIENTS), '--room-size', String(ROOM_SIZE), '--hz', String(HZ), '--seconds', String(SECONDS), '--offset', String(offset), '--count', String(count), '--run', RUN]);
        child.on('message', resolve);
      }),
    );
  }
  const results = await Promise.all(parts);
  const hist = new Array(BUCKETS + 1).fill(0);
  const sum = (k) => results.reduce((a, r) => a + r[k], 0);
  for (const r of results) for (const [i, n] of Object.entries(r.hist)) hist[i] += n;
  const closeCodes = {};
  for (const r of results) for (const [c, n] of Object.entries(r.closeCodes)) closeCodes[c] = (closeCodes[c] ?? 0) + n;
  report({ sent: sum('sent'), received: sum('received'), opened: sum('opened'), moved: sum('moved'), expected: sum('expected'), hist, closeCodes, workers: results.length });
} else {
  const r = await runPlayers();
  if (process.send) {
    process.send(r);
    process.exit(0);
  } else report({ ...r, workers: 1 });
}

function runPlayers() {
  return new Promise((done) => {
    const hist = {};
    let received = 0;
    let sent = 0;
    let opened = 0;
    let moved = 0;
    let expected = 0;
    const closeCodes = {};
    const players = [];
    // Everyone in a room hears everyone else: count what should arrive.
    const roomCount = new Map();
    for (let i = OFFSET; i < OFFSET + COUNT; i++) roomCount.set(Math.floor(i / ROOM_SIZE), (roomCount.get(Math.floor(i / ROOM_SIZE)) ?? 0) + 1);

    function player(i) {
      const room = `${RUN}-${Math.floor(i / ROOM_SIZE)}`;
      const others = roomCount.get(Math.floor(i / ROOM_SIZE)) - 1;
      let x = (i % 10) * 8 - 40;
      let z = (Math.floor(i / 10) % 10) * 8 - 40;
      let heading = (i * 0.7) % (Math.PI * 2);
      let timer = null;
      const p = { ws: null, stop: false };
      const connect = (base) => {
        const ws = new WebSocket(`${base}/?room=${room}`);
        p.ws = ws;
        ws.on('open', () => {
          ws.send(JSON.stringify({ t: 'hello', name: `Load${i}`, look: {}, vehicle: 'rover', vlook: {}, chapter: 'hub' }));
        });
        ws.on('message', (raw) => {
          const data = JSON.parse(String(raw));
          // The relay batches several messages into one frame as an array.
          for (const msg of Array.isArray(data) ? data : [data]) onMsg(ws, msg);
        });
        const onMsg = (ws, msg) => {
          if (msg.t === 'moved') {
            moved++;
            ws.removeAllListeners('close');
            ws.on('close', () => connect(msg.url.replace(/\/$/, '')));
            return;
          }
          if (msg.t === 'welcome') {
            opened++;
            timer = setInterval(() => {
              if (p.stop) return;
              heading += 0.02;
              x = Math.max(-100, Math.min(100, x + Math.sin(heading) * 0.4));
              z = Math.max(-100, Math.min(60, z + Math.cos(heading) * 0.4));
              ws.send(JSON.stringify({ t: 'state', chapter: 'hub', mode: 'drive', s: z + 1000, x, h: 0, yaw: heading, v: 8, ts: Date.now() }));
              sent++;
              expected += others;
            }, 1000 / HZ);
            return;
          }
          if (msg.t !== 'state') return;
          received++;
          if (typeof msg.ts === 'number') {
            const b = Math.min(BUCKETS, Math.max(0, Date.now() - msg.ts));
            hist[b] = (hist[b] ?? 0) + 1;
          }
        };
        ws.on('close', (code) => {
          clearInterval(timer);
          closeCodes[code] = (closeCodes[code] ?? 0) + 1;
        });
        ws.on('error', () => undefined);
      };
      connect(URL_BASE);
      players.push(p);
    }

    // Ramp up over a few seconds so the relay is not hit by one burst of handshakes.
    const ramp = Math.min(5000, COUNT * 2);
    for (let k = 0; k < COUNT; k++) setTimeout(() => player(OFFSET + k), (k / COUNT) * ramp);
    // Measure the steady part only: start counting after the ramp.
    setTimeout(() => {
      received = 0;
      sent = 0;
      expected = 0;
      for (const k of Object.keys(hist)) delete hist[k];
    }, ramp + 1500);
    setTimeout(() => {
      for (const p of players) p.stop = true;
      // Let messages in flight land before counting.
      setTimeout(() => {
        const out = { sent, received, opened, moved, expected, hist: { ...hist }, closeCodes: { ...closeCodes } };
        for (const p of players) p.ws?.close(1000);
        setTimeout(() => done(out), 300);
      }, 1500);
    }, ramp + 1500 + SECONDS * 1000);
  });
}

function report({ sent, received, opened, moved, expected, hist, closeCodes, workers }) {
  const total = Object.values(hist).reduce((a, b) => a + b, 0);
  const q = (p) => {
    let n = 0;
    const want = total * p;
    for (let i = 0; i <= BUCKETS; i++) {
      n += hist[i] ?? 0;
      if (n >= want && n > 0) return i;
    }
    return null;
  };
  let max = null;
  for (let i = BUCKETS; i >= 0; i--)
    if (hist[i]) {
      max = i;
      break;
    }
  console.log(
    JSON.stringify(
      {
        url: URL_BASE,
        clients: CLIENTS,
        connected: opened,
        moved,
        workers,
        roomSize: ROOM_SIZE,
        hz: HZ,
        seconds: SECONDS,
        sentPerSec: Math.round(sent / SECONDS),
        deliveredPerSec: Math.round(received / SECONDS),
        delivery: expected ? +(received / expected).toFixed(4) : null,
        latencyMs: { p50: q(0.5), p95: q(0.95), p99: q(0.99), max },
        closedEarly: Object.fromEntries(Object.entries(closeCodes).filter(([c]) => c !== '1000' && c !== '1005' && c !== '4010')),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

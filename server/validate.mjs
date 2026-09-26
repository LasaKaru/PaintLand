// Message validation shared by the relay server and the game client (docs/09 §7).
// The server never trusts a client: positions and speeds must be physically
// possible, text is trimmed and cleaned, and repeat offenders are dropped.

export const LIMITS = {
  maxSpeed: 95, // m/s: top boost is ~63; pads and ramps add a little
  maxS: 20000,
  maxX: 80,
  minH: -10,
  maxH: 80,
  /** Extra distance allowed between two states (respawns, lap wraps, hub ↔ route). */
  slack: 60,
  name: 20,
  chat: 120,
};

const MODES = new Set(['drive', 'foot']);

/** Free-roam areas by chapter id → half-width in metres (Harbour Town, Serendib City, Lantern Village). */
export const FREE_ROAM = { hub: 130, city: 660, village: 130 };

const finite = (v) => typeof v === 'number' && Number.isFinite(v);

/**
 * Check a player state against the last accepted one.
 * @param {any} msg
 * @param {{ s: number, chapter: string, at: number } | null} prev
 * @param {number} now milliseconds
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function validateState(msg, prev, now) {
  if (!msg || typeof msg !== 'object') return { ok: false, reason: 'not an object' };
  for (const k of ['s', 'x', 'h', 'yaw', 'v']) if (!finite(msg[k])) return { ok: false, reason: `bad ${k}` };
  if (typeof msg.chapter !== 'string' || msg.chapter.length > 24) return { ok: false, reason: 'bad chapter' };
  if (!MODES.has(msg.mode)) return { ok: false, reason: 'bad mode' };
  if (Math.abs(msg.v) > LIMITS.maxSpeed) return { ok: false, reason: 'too fast' };
  if (msg.s < 0 || msg.s > LIMITS.maxS) return { ok: false, reason: 'off the route' };
  // Free-roam areas are open ground (x is metres across, s is metres along + 1000).
  const halfWidth = FREE_ROAM[msg.chapter];
  const hub = halfWidth !== undefined;
  if (Math.abs(msg.x) > (hub ? halfWidth : LIMITS.maxX)) return { ok: false, reason: 'too far sideways' };
  if (hub && Math.abs(msg.v) > 60) return { ok: false, reason: 'too fast for free roam' };
  if (msg.h < LIMITS.minH || msg.h > LIMITS.maxH) return { ok: false, reason: 'too high' };
  if (prev && prev.chapter === msg.chapter) {
    const dt = Math.max(0.001, (now - prev.at) / 1000);
    const ds = Math.abs(msg.s - prev.s);
    // A lap wrap or respawn lands near the start (or a district start): allow those.
    const nearStart = msg.s < LIMITS.slack * 2;
    if (!nearStart && ds > LIMITS.maxSpeed * dt + LIMITS.slack) return { ok: false, reason: 'teleport' };
  }
  return { ok: true };
}

/** Trim, strip control characters and collapse spaces; null when nothing is left. */
export function cleanText(text, max = LIMITS.chat) {
  if (typeof text !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const t = text.replace(/[\u0000-\u001f\u007f​-‏‪-‮]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
  return t.length ? t : null;
}

/** Strikes: too many rejected messages in a short window gets a client dropped. */
export class Strikes {
  constructor(limit = 8, windowMs = 10000) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.times = [];
  }

  /** Record a strike; returns true when the client should be kicked. */
  add(now) {
    this.times.push(now);
    while (this.times.length && now - this.times[0] > this.windowMs) this.times.shift();
    return this.times.length >= this.limit;
  }
}

/**
 * The client's address for rate limits. Behind N trusted reverse proxies
 * (TRUST_PROXY=N; 1 for the Caddy in deploy/), use the address the outermost
 * trusted proxy saw: the N-th X-Forwarded-For entry from the end. Entries
 * before that come from the client and can be forged, so they are never used.
 * @param {import('node:http').IncomingMessage} req
 * @param {boolean | number} [trustProxy] number of trusted proxy hops (true = 1)
 */
export function clientIp(req, trustProxy = Number(process.env.TRUST_PROXY || 0)) {
  const direct = req.socket?.remoteAddress ?? '?';
  const hops = trustProxy === true ? 1 : Math.max(0, Math.floor(Number(trustProxy) || 0));
  if (!hops) return direct;
  const header = req.headers?.['x-forwarded-for'];
  const list = (Array.isArray(header) ? header.join(',') : header ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return (list.at(-hops) ?? list[0])?.slice(0, 64) ?? direct;
}

/**
 * A voice chat signalling message, rebuilt from known fields only, or null.
 * 'hi' / 'bye' announce voice to the room; 'offer' / 'answer' / 'ice' go to
 * one peer (`to`).
 * @param {any} msg
 */
export function checkRtc(msg) {
  if (!msg || typeof msg !== 'object') return null;
  const a = msg.a;
  const to = typeof msg.to === 'string' && /^[a-z0-9]{1,16}$/i.test(msg.to) ? msg.to : null;
  if (a === 'bye') return { t: 'rtc', a };
  // A hello to the room, or (answering one) to a single player.
  if (a === 'hi') return to ? { t: 'rtc', a, to } : { t: 'rtc', a };
  if (!to) return null;
  if (a === 'offer' || a === 'answer') {
    if (typeof msg.sdp !== 'string' || msg.sdp.length > 12_000 || !msg.sdp.startsWith('v=0')) return null;
    return { t: 'rtc', a, to: msg.to, sdp: msg.sdp };
  }
  if (a === 'ice') {
    const c = msg.cand;
    if (!c || typeof c !== 'object' || typeof c.candidate !== 'string' || c.candidate.length > 600) return null;
    const mid = typeof c.sdpMid === 'string' ? c.sdpMid.slice(0, 16) : null;
    const line = Number.isInteger(c.sdpMLineIndex) && c.sdpMLineIndex >= 0 && c.sdpMLineIndex < 16 ? c.sdpMLineIndex : null;
    return { t: 'rtc', a, to: msg.to, cand: { candidate: c.candidate, sdpMid: mid, sdpMLineIndex: line } };
  }
  return null;
}

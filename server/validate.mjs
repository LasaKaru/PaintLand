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
  // Hubs are open ground (x is metres across the town, s is metres along it + 200).
  const hub = msg.chapter === 'hub';
  if (Math.abs(msg.x) > (hub ? 130 : LIMITS.maxX)) return { ok: false, reason: 'too far sideways' };
  if (hub && Math.abs(msg.v) > 45) return { ok: false, reason: 'too fast for the hub' };
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

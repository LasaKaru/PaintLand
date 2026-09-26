/**
 * Playing together in the free-roam areas (docs/09): convoys, 90-second drift
 * and stunt contests, and co-op paint splashes. The rules live here, free of
 * rendering and networking, so they can be tested; Game.ts sends and
 * receives the messages and draws the HUD.
 */
export type ContestMode = 'drift' | 'stunt';

export const CONTEST_SECONDS = 90;
export const PAINT_SECONDS = 180;
export const START_DELAY = 5;
export const PAINT_DROPS = 40;
/** Ink for taking part, and for winning. */
export const CONTEST_INK = { part: 20, win: 80 };
export const PAINT_INK = 100;
export const CONVOY = { range: 40, minSpeed: 5, every: 30, ink: 10, leaderInk: 5 };
/** Most points anyone can honestly score per second (a sanity cap on scores from other players). */
export const MAX_RATE: Record<ContestMode, number> = { drift: 40, stunt: 500 };

/** Messages between players (sent as relay 'emote' messages with kind 'together'). */
export type TogetherMsg =
  | { type: 'convoy'; on: boolean; chapter: string }
  | { type: 'ping'; leader: string }
  | { type: 'contest'; id: string; mode: ContestMode; chapter: string }
  | { type: 'score'; id: string; score: number }
  | { type: 'paint'; id: string; seed: number; chapter: string; cx: number; cz: number }
  | { type: 'take'; id: string; drop: number };

const finite = (v: unknown, max = 1e7): v is number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= max;
const idOk = (v: unknown): v is string => typeof v === 'string' && /^[\w-]{1,40}$/.test(v);
const chapterOk = (v: unknown): v is string => typeof v === 'string' && v.length <= 24;

/** Only well-formed messages get through (they come from other players). */
export function checkTogether(m: unknown): TogetherMsg | null {
  if (!m || typeof m !== 'object') return null;
  const x = m as Record<string, unknown>;
  switch (x.type) {
    case 'convoy':
      return typeof x.on === 'boolean' && chapterOk(x.chapter) ? { type: 'convoy', on: x.on, chapter: x.chapter } : null;
    case 'ping':
      return idOk(x.leader) ? { type: 'ping', leader: x.leader } : null;
    case 'contest':
      return idOk(x.id) && (x.mode === 'drift' || x.mode === 'stunt') && chapterOk(x.chapter) ? { type: 'contest', id: x.id, mode: x.mode, chapter: x.chapter } : null;
    case 'score':
      return idOk(x.id) && finite(x.score) && x.score >= 0 ? { type: 'score', id: x.id, score: Math.round(x.score) } : null;
    case 'paint':
      return idOk(x.id) && finite(x.seed, 2 ** 31) && chapterOk(x.chapter) && finite(x.cx, 5000) && finite(x.cz, 5000) ? { type: 'paint', id: x.id, seed: x.seed, chapter: x.chapter, cx: x.cx, cz: x.cz } : null;
    case 'take':
      return idOk(x.id) && Number.isInteger(x.drop) && (x.drop as number) >= 0 && (x.drop as number) < PAINT_DROPS ? { type: 'take', id: x.id, drop: x.drop as number } : null;
    default:
      return null;
  }
}

// ————— contests —————

export interface Contest {
  id: string;
  mode: ContestMode;
  /** Seconds on the local clock. */
  startAt: number;
  endAt: number;
  mine: number;
  /** Other players' latest scores by name. */
  others: Map<string, number>;
  done: boolean;
}

export function newContest(id: string, mode: ContestMode, now: number): Contest {
  return { id, mode, startAt: now + START_DELAY, endAt: now + START_DELAY + CONTEST_SECONDS, mine: 0, others: new Map(), done: false };
}

/** Drift: points for every second sliding, more the faster you go. */
export function driftPoints(dt: number, speed: number, drifting: boolean): number {
  return drifting ? dt * Math.min(speed, 30) : 0;
}

/** Stunt: points for each landing, growing with hang time (short hops don't count). */
export function stuntPoints(air: number): number {
  return air < 0.6 ? 0 : Math.round(air * air * 120);
}

/** Accept another player's score only if it could really have been scored in the time so far. */
export function acceptScore(c: Contest, name: string, score: number, now: number): boolean {
  const elapsed = Math.max(0, Math.min(now, c.endAt + 3) - c.startAt);
  if (score > MAX_RATE[c.mode] * elapsed + 1) return false;
  c.others.set(name, Math.max(c.others.get(name) ?? 0, score));
  return true;
}

export function standings(c: Contest, me: string): { name: string; score: number; me: boolean }[] {
  return [{ name: me, score: Math.round(c.mine), me: true }, ...[...c.others].map(([name, score]) => ({ name, score: Math.round(score), me: false }))].sort((a, b) => b.score - a.score);
}

// ————— co-op paint splash —————

export interface PaintEvent {
  id: string;
  startAt: number;
  endAt: number;
  drops: { x: number; z: number; taken: boolean }[];
  /** Pots everyone has collected together. */
  team: number;
  target: number;
  mine: number;
  done: boolean;
}

/** The same seed always gives the same pots, so every player sees them in the same places. */
export function paintDrops(seed: number, cx: number, cz: number, isFree: (x: number, z: number) => boolean): { x: number; z: number }[] {
  let s = seed >>> 0 || 1;
  const rnd = (): number => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  const out: { x: number; z: number }[] = [];
  for (let tries = 0; out.length < PAINT_DROPS && tries < 2000; tries++) {
    const a = rnd() * Math.PI * 2;
    const r = 8 + Math.sqrt(rnd()) * 70;
    const x = cx + Math.cos(a) * r;
    const z = cz + Math.sin(a) * r;
    if (isFree(x, z) && out.every((o) => Math.hypot(o.x - x, o.z - z) > 4)) out.push({ x, z });
  }
  return out;
}

export function newPaintEvent(id: string, drops: { x: number; z: number }[], now: number, players: number): PaintEvent {
  return { id, startAt: now + START_DELAY, endAt: now + START_DELAY + PAINT_SECONDS, drops: drops.map((d) => ({ ...d, taken: false })), team: 0, target: Math.min(drops.length, 15 + 5 * Math.max(0, players - 1)), mine: 0, done: false };
}

/** Someone (you or a friend) collected a pot; returns true when it counted. */
export function takeDrop(e: PaintEvent, i: number, mine: boolean, now: number): boolean {
  const d = e.drops[i];
  if (!d || d.taken || now < e.startAt || now > e.endAt + 2 || e.done) return false;
  d.taken = true;
  e.team++;
  if (mine) e.mine++;
  return true;
}

/** Pots within reach of (x, z). */
export function dropsNear(e: PaintEvent, x: number, z: number, reach = 2.2): number[] {
  const out: number[] = [];
  e.drops.forEach((d, i) => {
    if (!d.taken && Math.hypot(d.x - x, d.z - z) < reach) out.push(i);
  });
  return out;
}

// ————— convoys —————

export interface Convoy {
  /** Following this leader (peer id), or leading (null) when `leading`. */
  leader: string | null;
  leaderName: string;
  leading: boolean;
  /** Seconds spent close to the leader, towards the next payout. */
  close: number;
  /** Followers heard from recently (leader side): id → last ping time. */
  followers: Map<string, number>;
  nextLeaderPay: number;
}

export function newConvoy(): Convoy {
  return { leader: null, leaderName: '', leading: false, close: 0, followers: new Map(), nextLeaderPay: 0 };
}

/** A follower's second: returns ink earned now (0 most of the time). */
export function convoyTick(c: Convoy, dt: number, distance: number, speed: number): number {
  if (!c.leader || distance > CONVOY.range || speed < CONVOY.minSpeed) return 0;
  c.close += dt;
  if (c.close < CONVOY.every) return 0;
  c.close -= CONVOY.every;
  return CONVOY.ink;
}

/** The leader's payout: a little ink per follower heard from in the last period. */
export function leaderTick(c: Convoy, now: number): number {
  if (!c.leading) return 0;
  if (!c.nextLeaderPay) c.nextLeaderPay = now + CONVOY.every;
  if (now < c.nextLeaderPay) return 0;
  c.nextLeaderPay = now + CONVOY.every;
  let n = 0;
  for (const [id, at] of c.followers) {
    if (now - at <= CONVOY.every) n++;
    else c.followers.delete(id);
  }
  return n * CONVOY.leaderInk;
}

/**
 * Daily brushstrokes (docs/06 §9, live service): three small challenges a
 * day, the same for everyone on the same date, measured from the player's
 * running stats. Finishing all three grows a streak.
 */
export interface ChallengeDef {
  id: string;
  /** Profile stat that counts toward it. */
  stat: string;
  amount: number;
  ink: number;
  icon: string;
  /** English text; `{n}` is the amount (shown in km for distance). */
  text: string;
}

export const CHALLENGES: ChallengeDef[] = [
  { id: 'drive', stat: 'distance', amount: 5000, ink: 80, icon: '🛣', text: 'Drive {n} km' },
  { id: 'drive-long', stat: 'distance', amount: 15000, ink: 160, icon: '🛣', text: 'Drive {n} km' },
  { id: 'drift', stat: 'miniTurbos', amount: 5, ink: 90, icon: '💨', text: 'Fire {n} drift mini-turbos' },
  { id: 'drift-long', stat: 'driftTime', amount: 40, ink: 110, icon: '💨', text: 'Drift for {n} seconds' },
  { id: 'stunt', stat: 'stunts', amount: 2, ink: 120, icon: '🏁', text: 'Land {n} stunt jumps' },
  { id: 'chest', stat: 'chests', amount: 3, ink: 90, icon: '🎁', text: 'Open {n} loot chests' },
  { id: 'photo', stat: 'photos', amount: 2, ink: 70, icon: '📷', text: 'Take {n} photos' },
  { id: 'mission', stat: 'cityMissions', amount: 1, ink: 120, icon: '🗺', text: 'Finish {n} city mission' },
  { id: 'notes', stat: 'notes', amount: 150, ink: 80, icon: '♪', text: 'Collect {n} notes on the road' },
  { id: 'walk', stat: 'walked', amount: 400, ink: 70, icon: '👣', text: 'Walk {n} m on foot' },
  { id: 'places', stat: 'discoveries', amount: 2, ink: 90, icon: '📍', text: 'Discover {n} new places' },
  { id: 'perahera', stat: 'perahera', amount: 1, ink: 150, icon: '🐘', text: 'Ride with the night perahera' },
];

export interface DailyState {
  day: string;
  ids: string[];
  /** Stat values when the day started. */
  base: Record<string, number>;
  claimed: string[];
}

export interface Streak {
  last: string;
  count: number;
}

/** Deterministic 32-bit hash of a string (same day → same challenges everywhere). */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Pick three different challenges (never two on the same stat) for a date key. */
export function pickDaily(day: string): ChallengeDef[] {
  const order = CHALLENGES.map((c) => ({ c, k: hash(`${day}:${c.id}`) })).sort((a, b) => a.k - b.k);
  const out: ChallengeDef[] = [];
  for (const { c } of order) {
    if (out.some((o) => o.stat === c.stat)) continue;
    out.push(c);
    if (out.length === 3) break;
  }
  return out;
}

/** Start a fresh day (or keep today's state). */
export function ensureDaily(state: DailyState | null, day: string, stat: (key: string) => number): DailyState {
  if (state && state.day === day) return state;
  const picks = pickDaily(day);
  const base: Record<string, number> = {};
  for (const c of picks) base[c.stat] = stat(c.stat);
  return { day, ids: picks.map((c) => c.id), base, claimed: [] };
}

export function challengeProgress(c: ChallengeDef, state: DailyState, stat: (key: string) => number): number {
  return Math.max(0, Math.min(c.amount, stat(c.stat) - (state.base[c.stat] ?? 0)));
}

/** Yesterday's key for a local date key like 2026-9-25. */
export function previousDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(y, m - 1, d - 1);
  return `${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}`;
}

/** All three done today: extend the streak (or restart it after a missed day). */
export function bumpStreak(streak: Streak, day: string): Streak {
  if (streak.last === day) return streak;
  return { last: day, count: streak.last === previousDay(day) ? streak.count + 1 : 1 };
}

/** Display amount: distances in km, everything else as is. */
export function challengeAmount(c: ChallengeDef, n: number): string {
  return c.stat === 'distance' ? (n / 1000).toFixed(n % 1000 ? 1 : 0) : String(Math.floor(n));
}

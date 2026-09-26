import { CATALOGUE, type Profile, type ShopItem } from './Profile';

/**
 * Seasons, the season pass, the featured shop and sponsor challenges.
 *
 * Everything here is cosmetic-only by design: nothing that a pass, a code or
 * (later) a payment unlocks changes how fast you drive, how much you score or
 * what you can reach. Ink can still be *earned* from free rewards and sponsor
 * challenges, exactly as from play; the Patron track never pays ink.
 */

// ————— what counts as cosmetic —————

/** Categories that only change how you or your vehicle look or sound. */
export const COSMETIC_CATEGORIES: ReadonlySet<ShopItem['category']> = new Set([
  'hair', 'hat', 'top', 'bottom', 'glasses', 'back', 'eyes', 'mouth', 'facial', 'acc', 'pet', 'print', 'bprint',
  'roof', 'decal', 'spoiler', 'glow', 'finish', 'wheels', 'exhaust', 'engine', 'horn', 'wrap',
]);

/** Looks-only: no vehicles (they handle differently) and no tonics (they help in play). */
export function isCosmetic(item: ShopItem): boolean {
  return COSMETIC_CATEGORIES.has(item.category) && !(item.grants?.length && item.grants.some((g) => !isCosmetic(CATALOGUE.find((c) => c.id === g)!)));
}

// ————— seasons —————

/** Seasons are 8 weeks long, starting on Mondays from 5 January 2026. */
const SEASON_EPOCH = Date.UTC(2026, 0, 5);
export const SEASON_DAYS = 56;
const SEASON_NAMES = ['Paper Moon', 'Monsoon Ink', 'Kite Winds', 'Lantern Glow', 'Salt and Spice', 'Tea Hills', 'Festival Lights'];

export interface Season {
  id: string;
  index: number;
  name: string;
  start: number;
  end: number;
}

export function seasonAt(t = Date.now()): Season {
  const index = Math.max(0, Math.floor((t - SEASON_EPOCH) / (SEASON_DAYS * 86400_000)));
  const start = SEASON_EPOCH + index * SEASON_DAYS * 86400_000;
  return { id: `S${index + 1}`, index, name: SEASON_NAMES[index % SEASON_NAMES.length], start, end: start + SEASON_DAYS * 86400_000 };
}

// ————— season XP: earned from ordinary play —————

/** Points per unit of each lifetime stat (distance and walking are per metre). */
export const XP_PER_STAT: Record<string, number> = {
  laps: 60,
  notes: 1,
  distance: 0.02,
  walked: 0.03,
  stunts: 15,
  photos: 10,
  races: 80,
  trials: 40,
  secrets: 60,
  chests: 30,
  cityMissions: 120,
  discoveries: 25,
  published: 100,
  ratings: 5,
  contests: 50,
  paintSplashes: 40,
  groupPhotos: 30,
  restored: 50,
  perahera: 60,
};
const XP_PER_SEEN: [string, number][] = [
  ['pocket:', 80],
  ['place:', 20],
  ['photo:', 30],
  ['sticker', 60],
];
const XP_PER_MISSION = 150;
const XP_PER_TROPHY = 50;

/** Lifetime points from everything you've done (the pass counts the rise this season). */
export function lifetimeXp(p: Profile): number {
  let xp = 0;
  for (const [k, w] of Object.entries(XP_PER_STAT)) xp += (p.data.stats[k] ?? 0) * w;
  for (const tag of p.data.seen) for (const [pre, w] of XP_PER_SEEN) if (tag.startsWith(pre)) xp += w;
  xp += p.data.missionsDone.length * XP_PER_MISSION + p.data.trophies.length * XP_PER_TROPHY;
  return Math.floor(xp);
}

// ————— the pass —————

export const TIERS = 30;
export const XP_PER_TIER = 400;

export interface PassState {
  season: string;
  /** Lifetime XP when this season started for you. */
  base: number;
  claimed: number[];
  patronClaimed: number[];
}

/** Your pass for the current season (a new season starts a fresh pass). */
export function passState(p: Profile, now = Date.now()): PassState {
  const s = seasonAt(now);
  const d = p.data as { pass?: PassState };
  if (!d.pass || d.pass.season !== s.id) d.pass = { season: s.id, base: lifetimeXp(p), claimed: [], patronClaimed: [] };
  return d.pass;
}

export function seasonXp(p: Profile, now = Date.now()): number {
  return Math.max(0, lifetimeXp(p) - passState(p, now).base);
}

/** Tiers reached this season (0..TIERS). */
export function tierReached(p: Profile, now = Date.now()): number {
  return Math.min(TIERS, Math.floor(seasonXp(p, now) / XP_PER_TIER));
}

export interface TierReward {
  tier: number;
  ink: number;
  /** An item id, or null. */
  item: string | null;
}

/** A season's list of cosmetics in a fixed shuffled order (the same for everyone). */
export function seasonPool(seasonIndex: number): string[] {
  const pool = CATALOGUE.filter((i) => isCosmetic(i) && (i.price > 0 || i.loot) && !i.grants).map((i) => i.id);
  let seed = (seasonIndex + 1) * 2654435761;
  const rnd = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

/** The free track: ink every tier, a cosmetic every fifth tier. */
export function freeReward(tier: number, seasonIndex: number): TierReward {
  const pool = seasonPool(seasonIndex);
  return { tier, ink: tier % 5 === 0 ? 0 : 40 + tier * 5, item: tier % 5 === 0 ? pool[(tier / 5 - 1) % pool.length] : null };
}

/** The Patron track: a cosmetic on every tier, never ink. */
export function patronReward(tier: number, seasonIndex: number): TierReward {
  const pool = seasonPool(seasonIndex);
  return { tier, ink: 0, item: pool[(6 + tier - 1) % pool.length] };
}

export type ClaimResult = 'ok' | 'locked' | 'claimed' | 'patron-only';

/** Take a tier's reward. Items you already own are skipped (nothing is lost, nothing is paid). */
export function claimTier(p: Profile, tier: number, track: 'free' | 'patron', patron: boolean, now = Date.now()): ClaimResult {
  const st = passState(p, now);
  if (tier < 1 || tier > tierReached(p, now)) return 'locked';
  if (track === 'patron' && !patron) return 'patron-only';
  const list = track === 'free' ? st.claimed : st.patronClaimed;
  if (list.includes(tier)) return 'claimed';
  const idx = seasonAt(now).index;
  const r = track === 'free' ? freeReward(tier, idx) : patronReward(tier, idx);
  list.push(tier);
  if (r.ink) p.data.ink += r.ink;
  if (r.item && !p.owns(r.item)) p.data.owned.push(r.item);
  p.save();
  return 'ok';
}

// ————— the featured shop —————

export const FEATURED_COUNT = 6;
export const FEATURED_OFF = 0.25;

/** Today's six featured cosmetics (25 % off), the same for everyone, skipping what you own. */
export function featuredToday(p: Profile, now = Date.now()): { item: ShopItem; price: number }[] {
  const dayIndex = Math.floor(now / 86400_000);
  const pool = CATALOGUE.filter((i) => isCosmetic(i) && i.price > 0 && !i.loot && !p.owns(i.id));
  const out: { item: ShopItem; price: number }[] = [];
  if (!pool.length) return out;
  const step = 7919;
  for (let k = 0; out.length < Math.min(FEATURED_COUNT, pool.length) && k < pool.length * 2; k++) {
    const item = pool[(dayIndex * 31 + k * step) % pool.length];
    if (!out.some((o) => o.item.id === item.id)) out.push({ item, price: Math.max(1, Math.round(item.price * (1 - FEATURED_OFF))) });
  }
  return out;
}

/** Buy a featured item at today's price. */
export function buyFeatured(p: Profile, id: string, now = Date.now()): 'ok' | 'owned' | 'poor' | 'gone' {
  const f = featuredToday(p, now).find((x) => x.item.id === id);
  if (!f) return p.owns(id) ? 'owned' : 'gone';
  if (p.data.ink < f.price) return 'poor';
  p.data.ink -= f.price;
  p.data.owned.push(f.item.id);
  for (const g of f.item.grants ?? []) if (!p.owns(g)) p.data.owned.push(g);
  p.save();
  return 'ok';
}

// ————— sponsor challenges —————

/** What a sponsor challenge can ask for, and the stat it counts. */
export const CHALLENGE_KINDS = {
  distance: { unit: 'km', read: (p: Profile) => (p.stat('distance') + p.stat('walked')) / 1000 },
  laps: { unit: '', read: (p: Profile) => p.stat('laps') },
  stunts: { unit: '', read: (p: Profile) => p.stat('stunts') },
  photos: { unit: '', read: (p: Profile) => p.stat('photos') },
  races: { unit: '', read: (p: Profile) => p.stat('races') },
  missions: { unit: '', read: (p: Profile) => p.data.missionsDone.length + p.stat('cityMissions') },
  pockets: { unit: '', read: (p: Profile) => p.data.seen.filter((s) => s.startsWith('pocket:')).length },
  secrets: { unit: '', read: (p: Profile) => p.stat('secrets') },
} as const;
export type ChallengeKind = keyof typeof CHALLENGE_KINDS;

/** A challenge as the server hands it out (see server/admin.mjs). */
export interface SponsorChallenge {
  id: string;
  sponsor: { name: string; url: string; image?: string };
  title: string;
  text: string;
  kind: ChallengeKind;
  target: number;
  ink: number;
  item?: string;
  end: number;
}

interface ChallengeState {
  base: number;
  done: boolean;
}

function challenges(p: Profile): Record<string, ChallengeState> {
  const d = p.data as { sponsorCh?: Record<string, ChallengeState> };
  return (d.sponsorCh ??= {});
}

export function joined(p: Profile, id: string): boolean {
  return !!challenges(p)[id];
}

/** Join: progress counts from now. */
export function joinChallenge(p: Profile, c: SponsorChallenge): void {
  const all = challenges(p);
  if (all[c.id] || !CHALLENGE_KINDS[c.kind]) return;
  all[c.id] = { base: CHALLENGE_KINDS[c.kind].read(p), done: false };
  p.save();
}

export function challengeProgress(p: Profile, c: SponsorChallenge): number {
  const s = challenges(p)[c.id];
  const kind = CHALLENGE_KINDS[c.kind];
  if (!s || !kind) return 0;
  return s.done ? c.target : Math.min(c.target, Math.max(0, kind.read(p) - s.base));
}

/** Pay out when the target is reached (once). Returns true when it just finished. */
export function settleChallenge(p: Profile, c: SponsorChallenge, now = Date.now()): boolean {
  const s = challenges(p)[c.id];
  if (!s || s.done || now > c.end || challengeProgress(p, c) < c.target) return false;
  s.done = true;
  p.data.ink += Math.max(0, Math.min(1000, Math.round(c.ink)));
  const item = c.item ? CATALOGUE.find((i) => i.id === c.item) : undefined;
  // Sponsors can only give looks, never a vehicle or a tonic.
  if (item && isCosmetic(item) && !p.owns(item.id)) p.data.owned.push(item.id);
  p.save();
  return true;
}

export function challengeDone(p: Profile, id: string): boolean {
  return !!challenges(p)[id]?.done;
}

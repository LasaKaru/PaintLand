import { CATALOGUE, MAX_TONICS, type Profile, type ShopItem } from './Profile';
import type { TonicId } from './Collectibles';

export type Rarity = 0 | 1 | 2 | 3;
export const RARITY_NAMES = ['Common', 'Rare', 'Epic', 'Legendary'] as const;
export const RARITY_COLOURS = ['#b58a5c', '#3e9fd8', '#9a5bd6', '#f4c542'] as const;

export interface LootReward {
  rarity: Rarity;
  item?: ShopItem;
  ink: number;
  tonic?: TonicId;
}

/** Rarity odds per chest tier (rows) — better chests roll better (docs/06 §7). */
const ODDS: number[][] = [
  [0.7, 0.25, 0.05, 0],
  [0.35, 0.45, 0.17, 0.03],
  [0.1, 0.4, 0.38, 0.12],
  [0, 0.15, 0.45, 0.4],
];

export function rollRarity(tier: number, r: number): Rarity {
  const odds = ODDS[Math.max(0, Math.min(3, tier))];
  let acc = 0;
  for (let i = 0; i < 4; i++) {
    acc += odds[i];
    if (r < acc) return i as Rarity;
  }
  return 3;
}

/**
 * Open a chest: roll a rarity, then give an item of that rarity the player
 * does not own yet (loot-only treasures first), or ink — plus a tonic
 * sometimes. The reward is applied to the profile.
 */
export function openChest(profile: Profile, tier: number, random: () => number = Math.random): LootReward {
  const rarity = rollRarity(tier, random());
  const inkBase = [20, 60, 150, 400][rarity];
  const pool = CATALOGUE.filter((i) => i.rarity === rarity && i.category !== 'tonic' && !profile.owns(i.id));
  const lootFirst = pool.filter((i) => i.loot);
  const choices = lootFirst.length && random() < 0.75 ? lootFirst : pool;
  const reward: LootReward = { rarity, ink: inkBase };
  if (choices.length && random() < 0.7) {
    reward.item = choices[Math.floor(random() * choices.length)];
    reward.ink = Math.round(inkBase / 4);
    profile.data.owned.push(reward.item.id);
  }
  if (random() < 0.35) {
    const tonics: TonicId[] = ['magnet', 'feather', 'fizzy'];
    const t = tonics[Math.floor(random() * tonics.length)];
    if (profile.data.tonics[t] < MAX_TONICS) {
      profile.data.tonics[t]++;
      reward.tonic = t;
    }
  }
  profile.data.ink += reward.ink;
  profile.addStat('chests');
  if (rarity === 3) profile.addStat('legendary');
  profile.save();
  return reward;
}

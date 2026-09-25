import { DEFAULT_HUMAN_LOOK, type HumanLook } from '../models/Human';
import { VEHICLES, type VehicleId, type VehicleLook } from '../models/Vehicles';
import type { TonicId } from './Collectibles';

/** Something the player can own. `apply` is the look field it sets when equipped. */
export interface ShopItem {
  id: string;
  name: string;
  category: 'hair' | 'hat' | 'top' | 'bottom' | 'glasses' | 'back' | 'vehicle' | 'roof' | 'tonic';
  price: number;
  value: string;
}

/** The shop catalogue (docs/06 §7, docs/08 §1–2). Colours are always free. */
export const CATALOGUE: ShopItem[] = [
  ...(['bob', 'bun', 'short', 'curly', 'long', 'ponytail', 'bald'] as const).map((v) => ({ id: `hair:${v}`, name: cap(v), category: 'hair' as const, price: 0, value: v })),
  { id: 'hair:braids', name: 'Braids', category: 'hair', price: 60, value: 'braids' },
  { id: 'hat:none', name: 'No hat', category: 'hat', price: 0, value: 'none' },
  { id: 'hat:cap', name: 'Cap', category: 'hat', price: 40, value: 'cap' },
  { id: 'hat:beanie', name: 'Beanie', category: 'hat', price: 50, value: 'beanie' },
  { id: 'hat:beret', name: 'Painter’s beret', category: 'hat', price: 60, value: 'beret' },
  { id: 'hat:straw', name: 'Straw hat', category: 'hat', price: 80, value: 'straw' },
  { id: 'hat:sunhat', name: 'Sun hat', category: 'hat', price: 90, value: 'sunhat' },
  { id: 'top:tee', name: 'T-shirt', category: 'top', price: 0, value: 'tee' },
  { id: 'top:shirt', name: 'Button shirt', category: 'top', price: 50, value: 'shirt' },
  { id: 'top:hoodie', name: 'Hoodie', category: 'top', price: 80, value: 'hoodie' },
  { id: 'top:dress', name: 'Summer dress', category: 'top', price: 100, value: 'dress' },
  { id: 'top:sari', name: 'Sari', category: 'top', price: 150, value: 'sari' },
  { id: 'bottom:trousers', name: 'Trousers', category: 'bottom', price: 0, value: 'trousers' },
  { id: 'bottom:shorts', name: 'Shorts', category: 'bottom', price: 40, value: 'shorts' },
  { id: 'bottom:skirt', name: 'Skirt', category: 'bottom', price: 60, value: 'skirt' },
  { id: 'bottom:sarong', name: 'Sarong', category: 'bottom', price: 80, value: 'sarong' },
  { id: 'glasses:none', name: 'No glasses', category: 'glasses', price: 0, value: 'none' },
  { id: 'glasses:round', name: 'Round glasses', category: 'glasses', price: 50, value: 'round' },
  { id: 'glasses:sun', name: 'Sunglasses', category: 'glasses', price: 70, value: 'sun' },
  { id: 'back:none', name: 'Nothing', category: 'back', price: 0, value: 'none' },
  { id: 'back:backpack', name: 'Backpack', category: 'back', price: 60, value: 'backpack' },
  { id: 'back:satchel', name: 'Satchel', category: 'back', price: 60, value: 'satchel' },
  { id: 'back:guitar', name: 'Guitar', category: 'back', price: 150, value: 'guitar' },
  ...VEHICLES.map((v) => ({ id: `vehicle:${v.id}`, name: v.name, category: 'vehicle' as const, price: v.price, value: v.id })),
  { id: 'roof:none', name: 'Empty roof', category: 'roof', price: 0, value: 'none' },
  { id: 'roof:gramophone', name: 'Gramophone', category: 'roof', price: 0, value: 'gramophone' },
  { id: 'roof:boombox', name: 'Boombox', category: 'roof', price: 100, value: 'boombox' },
  { id: 'roof:flowers', name: 'Flower pots', category: 'roof', price: 80, value: 'flowers' },
  { id: 'roof:surfboard', name: 'Surfboard', category: 'roof', price: 120, value: 'surfboard' },
  { id: 'tonic:magnet', name: 'Magnet tonic', category: 'tonic', price: 30, value: 'magnet' },
  { id: 'tonic:feather', name: 'Feather tonic', category: 'tonic', price: 40, value: 'feather' },
  { id: 'tonic:fizzy', name: 'Fizzy Ink', category: 'tonic', price: 35, value: 'fizzy' },
];

export const PALETTE = {
  skin: ['#f6d8c0', '#f0c7a6', '#d9a57e', '#b27b52', '#8a5a3a', '#6b4630'],
  hair: ['#2b2622', '#6b4a2a', '#c8452e', '#e8c872', '#8a8a9a', '#9a5bd6', '#3e6fa8', '#e8559a'],
  cloth: ['#f6f0e4', '#2b2622', '#d8463a', '#f08a2e', '#f4d23b', '#4f9a5a', '#2f8f86', '#3e6fa8', '#9a5bd6', '#e8559a', '#c8955a', '#6a6f8a'],
  paint: ['#efe8d8', '#f6f0e4', '#d8463a', '#f08a2e', '#f4d23b', '#8cc63f', '#8fd0c8', '#bfd9e8', '#3e6fa8', '#9a5bd6', '#e9b8c8', '#f2c6b4', '#2b2622', '#8c8a94'],
};

export const MAX_TONICS = 3;

export interface ProfileData {
  name: string;
  ink: number;
  owned: string[];
  look: HumanLook;
  vehicle: VehicleId;
  vehicleLooks: Partial<Record<VehicleId, VehicleLook>>;
  tonics: Record<TonicId, number>;
  sealed: Record<string, number[]>;
  bestLap: Record<string, number>;
  bestDistrict: Record<string, number>;
  missionsDone: string[];
  chapter: string;
  seenIntro: boolean;
  /** Unlocked trophy ids. */
  trophies: string[];
  /** Lifetime counters and records for trophies (see Trophies.ts). */
  stats: Record<string, number>;
  /** Chapters, weathers and art styles tried, for "explorer" trophies. */
  seen: string[];
}

const KEY = 'paintland.profile.v2';

function defaults(): ProfileData {
  return {
    name: `Painter${Math.floor(Math.random() * 900 + 100)}`,
    ink: 150,
    owned: CATALOGUE.filter((i) => i.price === 0).map((i) => i.id),
    look: { ...DEFAULT_HUMAN_LOOK },
    vehicle: 'rover',
    vehicleLooks: {},
    tonics: { magnet: 1, feather: 1, fizzy: 0 },
    sealed: {},
    bestLap: {},
    bestDistrict: {},
    missionsDone: [],
    chapter: 'sketch',
    seenIntro: false,
    trophies: [],
    stats: {},
    seen: [],
  };
}

/**
 * The player's saved state: currency ("ink drops"), inventory, looks,
 * progress and records. Stored locally; a cloud save can mirror the same
 * JSON later (docs/08 §7).
 */
export class Profile {
  data: ProfileData;
  private listeners: (() => void)[] = [];

  constructor() {
    this.data = defaults();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<ProfileData>;
        this.data = { ...this.data, ...saved, look: { ...this.data.look, ...saved.look }, tonics: { ...this.data.tonics, ...saved.tonics } };
        for (const id of defaults().owned) if (!this.data.owned.includes(id)) this.data.owned.push(id);
      }
    } catch {
      /* storage blocked or corrupt: start fresh */
    }
  }

  onChange(fn: () => void): void {
    this.listeners.push(fn);
  }

  save(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* ignore */
    }
    for (const l of this.listeners) l();
  }

  owns(id: string): boolean {
    return this.data.owned.includes(id);
  }

  earn(ink: number): void {
    this.data.ink += ink;
    this.save();
  }

  /** Buy an item; tonics stack up to MAX_TONICS, everything else is owned once. */
  buy(item: ShopItem): 'ok' | 'owned' | 'poor' | 'full' {
    if (item.category === 'tonic') {
      const t = item.value as TonicId;
      if (this.data.tonics[t] >= MAX_TONICS) return 'full';
      if (this.data.ink < item.price) return 'poor';
      this.data.ink -= item.price;
      this.data.tonics[t]++;
      this.save();
      return 'ok';
    }
    if (this.owns(item.id)) return 'owned';
    if (this.data.ink < item.price) return 'poor';
    this.data.ink -= item.price;
    this.data.owned.push(item.id);
    this.save();
    return 'ok';
  }

  vehicleLook(id: VehicleId): VehicleLook {
    const def = VEHICLES.find((v) => v.id === id) ?? VEHICLES[0];
    return { ...def.defaultLook, ...this.data.vehicleLooks[id] };
  }

  setVehicleLook(id: VehicleId, look: Partial<VehicleLook>): void {
    this.data.vehicleLooks[id] = { ...this.vehicleLook(id), ...look };
    this.save();
  }

  useTonic(t: TonicId): boolean {
    if (this.data.tonics[t] <= 0) return false;
    this.data.tonics[t]--;
    this.save();
    return true;
  }

  markSealed(chapter: string, phrase: number): boolean {
    const list = (this.data.sealed[chapter] ??= []);
    if (list.includes(phrase)) return false;
    list.push(phrase);
    this.save();
    return true;
  }

  /** Add to a lifetime counter. */
  addStat(key: string, amount = 1): number {
    this.data.stats[key] = (this.data.stats[key] ?? 0) + amount;
    return this.data.stats[key];
  }

  /** Keep the highest value seen for a record. */
  recordStat(key: string, value: number): number {
    if (value > (this.data.stats[key] ?? 0)) this.data.stats[key] = value;
    return this.data.stats[key];
  }

  stat(key: string): number {
    return this.data.stats[key] ?? 0;
  }

  /** Remember that something was seen once (a chapter, a weather, an art style). */
  markSeen(tag: string): boolean {
    if (this.data.seen.includes(tag)) return false;
    this.data.seen.push(tag);
    return true;
  }

  totalSealed(): number {
    return Object.values(this.data.sealed).reduce((n, l) => n + l.length, 0);
  }
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

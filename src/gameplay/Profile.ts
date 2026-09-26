import { DEFAULT_HUMAN_LOOK, type HumanLook } from '../models/Human';
import type { DailyState, Streak } from './Challenges';
import { VEHICLES, type VehicleId, type VehicleLook } from '../models/Vehicles';
import type { TonicId } from './Collectibles';

/** Something the player can own. `apply` is the look field it sets when equipped. */
export interface ShopItem {
  id: string;
  name: string;
  category: 'hair' | 'hat' | 'top' | 'bottom' | 'glasses' | 'back' | 'vehicle' | 'roof' | 'tonic' | 'decal' | 'spoiler' | 'glow' | 'eyes' | 'mouth' | 'facial' | 'acc' | 'finish' | 'wheels' | 'exhaust' | 'engine' | 'horn' | 'pet' | 'pack';
  price: number;
  value: string;
  /** 0 common, 1 rare, 2 epic, 3 legendary (loot drops). */
  rarity?: 0 | 1 | 2 | 3;
  /** Only found in loot chests, never sold. */
  loot?: boolean;
  /** A bundle: buying it gives all of these items. */
  grants?: string[];
}

/** A saved outfit (wardrobe → Outfits). */
export interface OutfitSet {
  name: string;
  look: HumanLook;
}

export const MAX_OUTFITS = 8;

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
  // Milestone 7: vehicle parts and loot-only treasures.
  { id: 'decal:none', name: 'Plain paint', category: 'decal', price: 0, value: 'none' },
  { id: 'decal:stripes', name: 'Racing stripes', category: 'decal', price: 120, value: 'stripes', rarity: 0 },
  { id: 'decal:dots', name: 'Polka dots', category: 'decal', price: 150, value: 'dots', rarity: 1 },
  { id: 'decal:flames', name: 'Hot flames', category: 'decal', price: 200, value: 'flames', rarity: 1 },
  { id: 'decal:checker', name: 'Chequered flag', category: 'decal', price: 0, value: 'checker', rarity: 2, loot: true },
  { id: 'spoiler:none', name: 'No spoiler', category: 'spoiler', price: 0, value: 'none' },
  { id: 'spoiler:lip', name: 'Lip spoiler', category: 'spoiler', price: 150, value: 'lip', rarity: 0 },
  { id: 'spoiler:wing', name: 'Big wing', category: 'spoiler', price: 0, value: 'wing', rarity: 1, loot: true },
  { id: 'glow:none', name: 'No underglow', category: 'glow', price: 0, value: 'none' },
  { id: 'glow:cyan', name: 'Cyan underglow', category: 'glow', price: 0, value: '#3ef0ff', rarity: 1, loot: true },
  { id: 'glow:pink', name: 'Pink underglow', category: 'glow', price: 0, value: '#ff4fa0', rarity: 1, loot: true },
  { id: 'glow:green', name: 'Lime underglow', category: 'glow', price: 0, value: '#5dff7a', rarity: 2, loot: true },
  { id: 'glow:gold', name: 'Golden underglow', category: 'glow', price: 0, value: '#ffcc33', rarity: 3, loot: true },
  { id: 'hat:helmet', name: 'Racing helmet', category: 'hat', price: 90, value: 'helmet', rarity: 0 },
  { id: 'hat:flowers', name: 'Flower crown', category: 'hat', price: 0, value: 'flowers', rarity: 1, loot: true },
  { id: 'hat:crown', name: 'Golden crown', category: 'hat', price: 0, value: 'crown', rarity: 3, loot: true },
  { id: 'back:cape', name: 'Painter’s cape', category: 'back', price: 0, value: 'cape', rarity: 2, loot: true },
  { id: 'back:wings', name: 'Paper wings', category: 'back', price: 0, value: 'wings', rarity: 3, loot: true },
  // Milestone 10: faces, face details, accessories and Lantern Roads hats.
  { id: 'eyes:dots', name: 'Button eyes', category: 'eyes', price: 0, value: 'dots' },
  { id: 'eyes:happy', name: 'Happy eyes', category: 'eyes', price: 0, value: 'happy' },
  { id: 'eyes:sleepy', name: 'Sleepy eyes', category: 'eyes', price: 0, value: 'sleepy' },
  { id: 'eyes:wink', name: 'Wink', category: 'eyes', price: 30, value: 'wink' },
  { id: 'eyes:big', name: 'Big bright eyes', category: 'eyes', price: 40, value: 'big' },
  { id: 'eyes:sparkle', name: 'Star eyes', category: 'eyes', price: 0, value: 'sparkle', rarity: 2, loot: true },
  { id: 'mouth:smile', name: 'Smile', category: 'mouth', price: 0, value: 'smile' },
  { id: 'mouth:grin', name: 'Big grin', category: 'mouth', price: 0, value: 'grin' },
  { id: 'mouth:o', name: 'Oh!', category: 'mouth', price: 0, value: 'o' },
  { id: 'mouth:smirk', name: 'Smirk', category: 'mouth', price: 20, value: 'smirk' },
  { id: 'mouth:cat', name: 'Cat mouth', category: 'mouth', price: 30, value: 'cat' },
  { id: 'facial:none', name: 'Nothing', category: 'facial', price: 0, value: 'none' },
  { id: 'facial:freckles', name: 'Freckles', category: 'facial', price: 0, value: 'freckles' },
  { id: 'facial:bindi', name: 'Bindi', category: 'facial', price: 0, value: 'bindi' },
  { id: 'facial:moustache', name: 'Moustache', category: 'facial', price: 30, value: 'moustache' },
  { id: 'facial:beard', name: 'Beard', category: 'facial', price: 40, value: 'beard' },
  { id: 'facial:facepaint', name: 'Festival face paint', category: 'facial', price: 60, value: 'facepaint' },
  { id: 'acc:none', name: 'Nothing', category: 'acc', price: 0, value: 'none' },
  { id: 'acc:earrings', name: 'Gold earrings', category: 'acc', price: 50, value: 'earrings' },
  { id: 'acc:necklace', name: 'Moonstone necklace', category: 'acc', price: 70, value: 'necklace' },
  { id: 'acc:flower', name: 'Flower behind the ear', category: 'acc', price: 30, value: 'flower' },
  { id: 'acc:bowtie', name: 'Bow tie', category: 'acc', price: 40, value: 'bowtie' },
  { id: 'acc:headphones', name: 'Headphones', category: 'acc', price: 0, value: 'headphones', rarity: 1, loot: true },
  { id: 'hat:conical', name: 'Leaf hat (nón lá)', category: 'hat', price: 70, value: 'conical' },
  { id: 'hat:catears', name: 'Cat ears', category: 'hat', price: 0, value: 'catears', rarity: 1, loot: true },
  { id: 'hat:wizard', name: 'Star wizard hat', category: 'hat', price: 0, value: 'wizard', rarity: 3, loot: true },
  { id: 'back:parasol', name: 'Paper parasol', category: 'back', price: 90, value: 'parasol' },
  // Garage parts: roof racks, paint finishes, wheels, exhausts, engine sounds and horns.
  { id: 'roof:rack', name: 'Roof rack', category: 'roof', price: 90, value: 'rack' },
  { id: 'roof:kayak', name: 'Kayak', category: 'roof', price: 130, value: 'kayak' },
  { id: 'roof:lanterns', name: 'String of lanterns', category: 'roof', price: 110, value: 'lanterns' },
  { id: 'finish:gloss', name: 'Gloss paint', category: 'finish', price: 0, value: 'gloss' },
  { id: 'finish:matte', name: 'Matte paint', category: 'finish', price: 120, value: 'matte' },
  { id: 'finish:glitter', name: 'Glitter paint', category: 'finish', price: 200, value: 'glitter', rarity: 1 },
  { id: 'finish:chrome', name: 'Chrome', category: 'finish', price: 300, value: 'chrome', rarity: 2 },
  { id: 'wheels:classic', name: 'Classic wheels', category: 'wheels', price: 0, value: 'classic' },
  { id: 'wheels:spoke', name: 'Spoked wheels', category: 'wheels', price: 60, value: 'spoke' },
  { id: 'wheels:whitewall', name: 'Whitewall tyres', category: 'wheels', price: 100, value: 'whitewall' },
  { id: 'wheels:slick', name: 'Racing slicks', category: 'wheels', price: 140, value: 'slick' },
  { id: 'exhaust:none', name: 'Hidden exhaust', category: 'exhaust', price: 0, value: 'none' },
  { id: 'exhaust:twin', name: 'Twin pipes', category: 'exhaust', price: 90, value: 'twin' },
  { id: 'exhaust:side', name: 'Side pipes', category: 'exhaust', price: 120, value: 'side' },
  { id: 'exhaust:stack', name: 'Smoke stacks', category: 'exhaust', price: 0, value: 'stack', rarity: 1, loot: true },
  { id: 'engine:classic', name: 'Classic engine', category: 'engine', price: 0, value: 'classic' },
  { id: 'engine:buzzy', name: 'Buzzy engine', category: 'engine', price: 60, value: 'buzzy' },
  { id: 'engine:rumble', name: 'Big rumble', category: 'engine', price: 120, value: 'rumble' },
  { id: 'engine:electric', name: 'Electric hum', category: 'engine', price: 150, value: 'electric' },
  { id: 'engine:pedal', name: 'Pedal whirr', category: 'engine', price: 40, value: 'pedal' },
  { id: 'engine:burner', name: 'Balloon burner', category: 'engine', price: 80, value: 'burner' },
  { id: 'horn:toot', name: 'Toot', category: 'horn', price: 0, value: 'toot' },
  { id: 'horn:beep', name: 'Beep beep', category: 'horn', price: 30, value: 'beep' },
  { id: 'horn:duck', name: 'Rubber duck', category: 'horn', price: 50, value: 'duck' },
  { id: 'horn:bell', name: 'Bicycle bell', category: 'horn', price: 40, value: 'bell' },
  { id: 'horn:trumpet', name: 'Fanfare', category: 'horn', price: 90, value: 'trumpet' },
  { id: 'horn:train', name: 'Train whistle', category: 'horn', price: 0, value: 'train', rarity: 2, loot: true },
  // The Sri Lankan pack: Kandyan osariya, the national dress and cap, and the sarong.
  { id: 'top:osariya', name: 'Osariya (Kandyan sari)', category: 'top', price: 150, value: 'osariya' },
  { id: 'top:national', name: 'National dress tunic', category: 'top', price: 110, value: 'national' },
  { id: 'hat:natcap', name: 'National cap', category: 'hat', price: 60, value: 'natcap' },
  { id: 'pack:lanka', name: 'Sri Lankan outfit pack', category: 'pack', price: 280, value: 'lanka', grants: ['top:osariya', 'top:national', 'hat:natcap', 'bottom:sarong', 'top:sari'] },
  // Pets that follow you on foot.
  { id: 'pet:none', name: 'No pet', category: 'pet', price: 0, value: 'none' },
  { id: 'pet:cat', name: 'Paper cat', category: 'pet', price: 200, value: 'cat' },
  { id: 'pet:fox', name: 'Little fox', category: 'pet', price: 260, value: 'fox' },
  { id: 'pet:crane', name: 'Origami crane', category: 'pet', price: 0, value: 'crane', rarity: 2, loot: true },
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
  /** Saved outfit sets. */
  outfits?: OutfitSet[];
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
  /** Best time-trial lap per `chapter:handling`. */
  trialBest: Record<string, number>;
  /** Today's daily brushstrokes. */
  daily: DailyState | null;
  streak: Streak;
}

const KEY = 'paintland.profile.v2';

function defaults(): ProfileData {
  return {
    name: `Painter${Math.floor(Math.random() * 900 + 100)}`,
    ink: 150,
    owned: CATALOGUE.filter((i) => i.price === 0 && !i.loot).map((i) => i.id),
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
    seen: ['mig:loot'],
    trialBest: {},
    daily: null,
    streak: { last: '', count: 0 },
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
        this.hydrate(JSON.parse(raw) as Partial<ProfileData>);
        // Milestone 7 saves were handed every loot-only item by mistake: take them back once.
        if (!this.data.seen.includes('mig:loot')) {
          const loot = new Set(CATALOGUE.filter((i) => i.loot).map((i) => i.id));
          this.data.owned = this.data.owned.filter((id) => !loot.has(id));
          this.data.seen.push('mig:loot');
        }
      }
    } catch {
      /* storage blocked or corrupt: start fresh */
    }
  }

  /** Load saved data over the defaults (from this device or the cloud). */
  private hydrate(saved: Partial<ProfileData>): void {
    const base = defaults();
    this.data = { ...base, ...saved, look: { ...base.look, ...saved.look }, tonics: { ...base.tonics, ...saved.tonics } };
    if (!Array.isArray(this.data.owned)) this.data.owned = [];
    if (!Array.isArray(this.data.seen)) this.data.seen = ['mig:loot'];
    for (const id of base.owned) if (!this.data.owned.includes(id)) this.data.owned.push(id);
  }

  /** Nothing earned yet on this device (a cloud save can simply replace it). */
  isFresh(): boolean {
    const d = this.data;
    const base = defaults();
    return d.trophies.length === 0 && Object.keys(d.bestLap).length === 0 && d.missionsDone.length === 0 && Object.keys(d.sealed).length === 0 && d.ink <= base.ink && d.owned.length <= base.owned.length;
  }

  /** Replace everything with a cloud save the player chose to keep. */
  replace(saved: Record<string, unknown>): void {
    this.hydrate(saved as Partial<ProfileData>);
    if (!this.data.seen.includes('mig:loot')) this.data.seen.push('mig:loot');
    this.save();
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

  saveOutfit(name: string): 'ok' | 'full' {
    const list = (this.data.outfits ??= []);
    if (list.length >= MAX_OUTFITS) return 'full';
    list.push({ name: name.trim().slice(0, 24) || `Outfit ${list.length + 1}`, look: { ...this.data.look } });
    this.save();
    return 'ok';
  }

  deleteOutfit(i: number): void {
    this.data.outfits?.splice(i, 1);
    this.save();
  }

  /** Items a look uses that aren't owned yet (so a preset can offer to buy them). */
  missingFor(look: Partial<HumanLook>): ShopItem[] {
    const fields: [keyof HumanLook, ShopItem['category']][] = [['hairStyle', 'hair'], ['hat', 'hat'], ['topStyle', 'top'], ['bottomStyle', 'bottom'], ['glasses', 'glasses'], ['back', 'back'], ['eyes', 'eyes'], ['mouth', 'mouth'], ['face', 'facial'], ['acc', 'acc'], ['pet', 'pet']];
    const out: ShopItem[] = [];
    for (const [field, category] of fields) {
      const v = look[field];
      if (v === undefined) continue;
      const item = CATALOGUE.find((i) => i.category === category && i.value === v);
      if (item && !this.owns(item.id)) out.push(item);
    }
    return out;
  }

  /** Wear a saved or preset outfit; only items you own are put on. */
  wearOutfit(look: Partial<HumanLook>): number {
    const missing = this.missingFor(look);
    const next = { ...this.data.look, ...look };
    const fieldOf: Partial<Record<ShopItem['category'], keyof HumanLook>> = { hair: 'hairStyle', hat: 'hat', top: 'topStyle', bottom: 'bottomStyle', glasses: 'glasses', back: 'back', eyes: 'eyes', mouth: 'mouth', facial: 'face', acc: 'acc', pet: 'pet' };
    for (const m of missing) {
      const f = fieldOf[m.category];
      if (f) (next as unknown as Record<string, unknown>)[f] = (this.data.look as unknown as Record<string, unknown>)[f];
    }
    this.data.look = next;
    this.save();
    return missing.length;
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
    for (const g of item.grants ?? []) if (!this.data.owned.includes(g)) this.data.owned.push(g);
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

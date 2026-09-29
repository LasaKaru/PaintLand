import { randomLook, type HumanLook, type TopStyle, type BottomStyle, type HatStyle } from '../models/Human';

/**
 * The people of each place: what they wear, the range of skin tones, and
 * everyday faith dress — a headscarf, a turban, a kippah, a prayer cap, a
 * monk's robe, a small cross — worn by a share of ordinary passers-by, as in
 * real streets. Faith is shown as part of daily life: never as a joke, a
 * costume for sale, or anything to collect.
 *
 * Every region also has children, older people (some with a walking stick)
 * and wheelchair users, and a range of heights and builds.
 */

export type RegionId = 'lanka' | 'india' | 'japan' | 'korea' | 'china' | 'seasia' | 'himalaya' | 'mena' | 'europe' | 'americas' | 'oceania' | 'mixed';

type Weighted<T> = [T, number][];

interface FaithDress {
  /** A short name, for tests and debugging. */
  id: string;
  weight: number;
  apply: (look: HumanLook, r: () => number) => void;
}

interface Region {
  skins: Weighted<string>;
  tops: Weighted<TopStyle>;
  bottoms: Weighted<BottomStyle>;
  hats: Weighted<HatStyle>;
  /** Garment colours. */
  colours: string[];
  /** Everyday faith dress: each a share of the crowd (0..1). */
  faith: FaithDress[];
}

// Skin tones, light to deep.
const SK = ['#f6d8c0', '#f0c7a6', '#e6b894', '#d9a57e', '#c28a5e', '#b27b52', '#9a6a44', '#8a5a3a', '#6b4630', '#553624'] as const;
const skins = (...w: number[]): Weighted<string> => SK.map((c, i) => [c, w[i] ?? 0]);

const BRIGHT = ['#d8463a', '#f08a2e', '#f4d23b', '#4f9a5a', '#2f8f86', '#3e6fa8', '#9a5bd6', '#e8559a', '#f6f0e4', '#2b2622'];
const EARTH = ['#7a4a2a', '#c8955a', '#6a6f8a', '#3f5f9a', '#2d4f8f', '#5a6a3a', '#9a3a2a', '#f6f0e4', '#2b2622'];
const SCARVES = ['#2d3f6f', '#7a2a4a', '#2d6a5a', '#c8955a', '#f6f0e4', '#6a4a8a', '#2b2622', '#b0452a', '#8fb0d0'];
const TURBANS = ['#2d4f8f', '#f08a2e', '#d8463a', '#f4d23b', '#f6f0e4', '#2b2622', '#e8559a', '#2d6a5a'];

const pickW = <T,>(w: Weighted<T>, r: () => number): T => {
  const total = w.reduce((s, [, n]) => s + n, 0);
  let x = r() * total;
  for (const [v, n] of w) if ((x -= n) < 0) return v;
  return w[w.length - 1][0];
};
const pick = <T,>(a: readonly T[], r: () => number): T => a[Math.floor(r() * a.length)];

// ————— everyday faith dress —————

const hijab = (weight: number): FaithDress => ({
  id: 'hijab',
  weight,
  apply: (l, r) => {
    l.hat = 'hijab';
    l.scarf = pick(SCARVES, r);
    // Often with long sleeves and a long skirt or robe.
    if (r() < 0.5) l.topStyle = pickW([['abaya', 2], ['kurta', 2], ['dress', 2], ['shirt', 1]], r);
    l.bottomStyle = r() < 0.7 ? 'maxi' : 'trousers';
    if (l.topStyle === 'abaya') l.top = pick(['#2b2622', '#2d3f6f', '#5a4a6a', '#6a6f8a', '#7a4a2a'], r);
  },
});
const turban = (weight: number): FaithDress => ({
  id: 'turban',
  weight,
  apply: (l, r) => {
    l.hat = 'turban';
    l.scarf = pick(TURBANS, r);
    if (r() < 0.75) l.face = 'beard';
    l.hair = pick(['#2b2622', '#3a2a22', '#8a8a9a'], r);
  },
});
const kippah = (weight: number): FaithDress => ({ id: 'kippah', weight, apply: (l, r) => void ((l.hat = 'kippah'), (l.scarf = pick(['#2d3f6f', '#2b2622', '#f6f0e4', '#6a6f8a'], r))) });
const prayerCap = (weight: number, robe = false): FaithDress => ({
  id: 'taqiyah',
  weight,
  apply: (l, r) => {
    l.hat = 'taqiyah';
    if (r() < 0.5) l.face = 'beard';
    if (robe || r() < 0.4) {
      l.topStyle = robe ? 'thobe' : pickW([['kurta', 1], ['thobe', 1]], r);
      l.top = pick(['#f6f0e4', '#f6f0e4', '#e8e0cc', '#c9d7f0', '#bfae8a'], r);
      l.bottomStyle = 'trousers';
      l.bottom = '#f6f0e4';
    }
  },
});
/** A Buddhist monk or nun: shaved head and a robe in the local colour. */
const monk = (weight: number, colours: string[]): FaithDress => ({
  id: 'monk',
  weight,
  apply: (l, r) => {
    l.topStyle = 'robe';
    l.top = pick(colours, r);
    l.hairStyle = 'bald';
    l.hat = 'none';
    l.glasses = r() < 0.2 ? 'round' : 'none';
    l.face = 'none';
    l.acc = 'none';
    l.back = r() < 0.3 ? 'satchel' : 'none';
    l.scarf = null;
    l.print = undefined;
  },
});
const cross = (weight: number): FaithDress => ({ id: 'cross', weight, apply: (l) => void (l.acc = 'cross') });
const bindi = (weight: number): FaithDress => ({ id: 'bindi', weight, apply: (l) => void (l.face = 'bindi') });

const SAFFRON = ['#e0901e', '#d8741e', '#c86a1a'];
const MAROON = ['#7a2a2a', '#8a3a2a'];
const GREY = ['#8a8a8a', '#6f6f78'];
const DARK = ['#3a3430', '#4a3a2a'];

// ————— regions —————

const WESTERN: Pick<Region, 'tops' | 'bottoms' | 'hats'> = {
  tops: [['tee', 30], ['shirt', 20], ['jacket', 14], ['hoodie', 14], ['dress', 10], ['vest', 4]],
  bottoms: [['trousers', 50], ['shorts', 14], ['skirt', 12], ['cargo', 10], ['maxi', 4]],
  hats: [['none', 70], ['cap', 8], ['beanie', 6], ['beret', 3], ['sunhat', 4], ['bucket', 4]],
};

export const REGIONS: Record<RegionId, Region> = {
  lanka: {
    skins: skins(1, 2, 4, 8, 14, 18, 16, 12, 8, 3),
    tops: [['tee', 22], ['shirt', 22], ['sari', 15], ['osariya', 4], ['national', 6], ['kurta', 5], ['dress', 8], ['jacket', 2]],
    bottoms: [['trousers', 40], ['sarong', 26], ['skirt', 8], ['maxi', 10], ['shorts', 6]],
    hats: [['none', 82], ['straw', 5], ['natcap', 2], ['cap', 6], ['sunhat', 3]],
    colours: BRIGHT,
    faith: [monk(0.03, SAFFRON), hijab(0.07), prayerCap(0.03), bindi(0.08), cross(0.03)],
  },
  india: {
    skins: skins(1, 2, 5, 10, 16, 18, 16, 12, 8, 3),
    tops: [['sari', 22], ['kurta', 22], ['shirt', 20], ['tee', 20], ['dress', 5], ['jacket', 3]],
    bottoms: [['trousers', 48], ['maxi', 22], ['sarong', 6], ['skirt', 6]],
    hats: [['none', 90], ['cap', 5], ['straw', 3]],
    colours: BRIGHT,
    faith: [turban(0.05), hijab(0.07), prayerCap(0.04), bindi(0.12), cross(0.02), monk(0.005, SAFFRON)],
  },
  japan: {
    skins: skins(8, 30, 30, 16, 6, 3, 2, 2, 1, 1),
    tops: [['tee', 24], ['shirt', 22], ['jacket', 20], ['hoodie', 12], ['dress', 10], ['kimono', 6]],
    bottoms: [['trousers', 52], ['skirt', 16], ['shorts', 8], ['cargo', 8], ['maxi', 4]],
    hats: [['none', 76], ['cap', 8], ['bucket', 6], ['sunhat', 5], ['beanie', 3]],
    colours: [...BRIGHT, '#1d2a44', '#c9d7f0'],
    faith: [monk(0.015, DARK), hijab(0.01), cross(0.01)],
  },
  korea: {
    skins: skins(8, 30, 30, 16, 6, 3, 2, 2, 1, 1),
    tops: [['tee', 24], ['shirt', 22], ['jacket', 20], ['hoodie', 14], ['dress', 10], ['hanbok', 5]],
    bottoms: [['trousers', 54], ['skirt', 14], ['shorts', 8], ['cargo', 8]],
    hats: [['none', 78], ['cap', 10], ['bucket', 6], ['beanie', 4]],
    colours: [...BRIGHT, '#1d2a44', '#e9b8c8'],
    faith: [monk(0.015, GREY), cross(0.06), hijab(0.005)],
  },
  china: {
    skins: skins(8, 28, 30, 18, 7, 3, 2, 2, 1, 1),
    tops: [['tee', 26], ['shirt', 22], ['jacket', 18], ['hoodie', 12], ['dress', 10], ['qipao', 5]],
    bottoms: [['trousers', 56], ['skirt', 12], ['shorts', 8], ['cargo', 8]],
    hats: [['none', 80], ['cap', 8], ['conical', 3], ['sunhat', 5], ['bucket', 3]],
    colours: [...BRIGHT, '#b0352a', '#1d2a44'],
    faith: [monk(0.012, ['#c8a040', '#7a5a3a', ...GREY]), hijab(0.02), prayerCap(0.01), cross(0.02)],
  },
  seasia: {
    skins: skins(2, 8, 18, 22, 20, 14, 8, 5, 2, 1),
    tops: [['tee', 28], ['shirt', 22], ['dress', 12], ['aodai', 7], ['kurta', 5], ['sari', 3], ['jacket', 5]],
    bottoms: [['trousers', 44], ['shorts', 14], ['skirt', 10], ['sarong', 10], ['maxi', 8]],
    hats: [['none', 72], ['conical', 10], ['cap', 8], ['sunhat', 6], ['bucket', 4]],
    colours: BRIGHT,
    faith: [monk(0.03, SAFFRON), hijab(0.1), prayerCap(0.03), turban(0.01), bindi(0.03), cross(0.04)],
  },
  himalaya: {
    skins: skins(2, 8, 18, 24, 22, 14, 7, 3, 1, 1),
    tops: [['jacket', 34], ['shirt', 18], ['hoodie', 16], ['tee', 14], ['dress', 8], ['kurta', 6]],
    bottoms: [['trousers', 60], ['maxi', 20], ['skirt', 8]],
    hats: [['none', 60], ['beanie', 30], ['cap', 6]],
    colours: [...EARTH, '#d8463a', '#f4d23b'],
    faith: [monk(0.12, MAROON), hijab(0.01)],
  },
  mena: {
    skins: skins(2, 6, 14, 20, 20, 16, 10, 6, 4, 2),
    tops: [['thobe', 14], ['abaya', 10], ['shirt', 22], ['tee', 22], ['jacket', 10], ['dress', 8], ['kurta', 6]],
    bottoms: [['trousers', 60], ['maxi', 20], ['skirt', 8], ['shorts', 4]],
    hats: [['none', 86], ['cap', 6], ['sunhat', 5]],
    colours: [...EARTH, '#f6f0e4', '#f6f0e4', '#3e6fa8', '#2f8f86'],
    faith: [hijab(0.3), prayerCap(0.08, true), cross(0.03), kippah(0.005)],
  },
  europe: {
    skins: skins(18, 24, 16, 10, 8, 7, 6, 5, 4, 2),
    ...WESTERN,
    colours: [...EARTH, '#3e6fa8', '#d8463a', '#f4d23b', '#1d2a44'],
    faith: [hijab(0.05), turban(0.012), kippah(0.012), prayerCap(0.01), cross(0.04), bindi(0.01)],
  },
  americas: {
    skins: skins(12, 16, 16, 14, 12, 10, 8, 6, 4, 2),
    ...WESTERN,
    colours: [...BRIGHT, ...EARTH],
    faith: [hijab(0.03), turban(0.01), kippah(0.015), cross(0.06), prayerCap(0.005)],
  },
  oceania: {
    skins: skins(18, 22, 14, 10, 8, 8, 7, 6, 4, 3),
    tops: WESTERN.tops,
    bottoms: [['shorts', 30], ['trousers', 38], ['skirt', 12], ['cargo', 10]],
    hats: [['none', 58], ['sunhat', 14], ['cap', 12], ['bucket', 10], ['straw', 6]],
    colours: [...BRIGHT, ...EARTH],
    faith: [hijab(0.03), turban(0.015), kippah(0.005), cross(0.04), bindi(0.01)],
  },
  mixed: {
    skins: skins(10, 12, 12, 12, 12, 11, 10, 9, 7, 5),
    tops: [['tee', 26], ['shirt', 20], ['jacket', 10], ['hoodie', 10], ['dress', 10], ['sari', 5], ['kurta', 5], ['kimono', 2], ['vest', 4]],
    bottoms: [['trousers', 44], ['shorts', 14], ['skirt', 12], ['sarong', 6], ['maxi', 8], ['cargo', 6]],
    hats: [['none', 72], ['cap', 7], ['straw', 5], ['sunhat', 5], ['beanie', 4], ['beret', 3], ['bucket', 4]],
    colours: BRIGHT,
    faith: [hijab(0.05), turban(0.015), kippah(0.01), prayerCap(0.015), monk(0.01, SAFFRON), bindi(0.03), cross(0.03)],
  },
};

/** Which people live along each district (chapters) or in each free-roam area. */
const DISTRICT_REGION: Record<string, RegionId> = {
  // Wonders of the World.
  'great-wall': 'china', colosseum: 'europe', 'taj-mahal': 'india', 'machu-picchu': 'americas', corcovado: 'americas', 'chichen-itza': 'americas', petra: 'mena',
  // Lantern Roads.
  'fushimi-inari': 'japan', arashiyama: 'japan', 'great-wave': 'japan', fuji: 'japan', 'ha-long': 'seasia', 'hoi-an': 'seasia', himalaya: 'himalaya',
  // Postcards.
  nile: 'mena', santorini: 'europe', 'kyoto-night': 'japan', kandy: 'lanka', ella: 'lanka',
  // City Lights and Skylines.
  paris: 'europe', london: 'europe', venice: 'europe', amsterdam: 'europe', barcelona: 'europe', istanbul: 'mena', dubai: 'mena',
  newyork: 'americas', sanfrancisco: 'americas', rio: 'americas', tokyo: 'japan', singapore: 'seasia', sydney: 'oceania',
  // Lhasa, on China's Grand Tour.
  lhasa: 'himalaya',
};

const CHAPTER_REGION: Record<string, RegionId> = {
  sketch: 'mixed', serendib: 'lanka', islandtrip: 'lanka', britain: 'europe', germany: 'europe', japan: 'japan', india: 'india', china: 'china', korea: 'korea', canada: 'americas', australia: 'oceania',
};

const AREA_REGION: Record<string, RegionId> = { harbour: 'mixed', city: 'lanka', hills: 'lanka', village: 'japan', worldsend: 'mixed' };

/** The region for a place: a district in a chapter, or a free-roam area. */
export function regionFor(chapter: string, district?: string): RegionId {
  if (district && DISTRICT_REGION[district]) return DISTRICT_REGION[district];
  return CHAPTER_REGION[chapter] ?? AREA_REGION[chapter] ?? 'mixed';
}

export type AgeGroup = 'child' | 'adult' | 'elder';

export interface Person {
  look: HumanLook;
  age: AgeGroup;
  /** Everyday faith dress worn, if any (for tests). */
  faith: string | null;
}

/**
 * Someone from a region. `r` is a seeded random 0..1. Options can ask for an
 * age group (a child walking with a parent), or turn off mobility aids (for
 * people who must walk the whole route).
 */
export function personOf(region: RegionId, r: () => number, opts: { age?: AgeGroup; aids?: boolean; faith?: boolean } = {}): Person {
  const g = REGIONS[region];
  const look = randomLook(r);
  look.skin = pickW(g.skins, r);
  look.topStyle = pickW(g.tops, r);
  look.bottomStyle = pickW(g.bottoms, r);
  look.hat = pickW(g.hats, r);
  look.top = pick(g.colours, r);
  look.bottom = pick(g.colours, r);
  if (look.topStyle === 'sari' || look.topStyle === 'osariya' || look.topStyle === 'kimono' || look.topStyle === 'hanbok' || look.topStyle === 'qipao' || look.topStyle === 'aodai') look.bottomStyle = look.topStyle === 'aodai' ? 'trousers' : 'maxi';
  if (look.topStyle === 'national') look.bottomStyle = 'sarong';
  look.build = 0.88 + r() * 0.32;
  const age: AgeGroup = opts.age ?? (r() < 0.12 ? 'child' : r() < 0.18 ? 'elder' : 'adult');
  if (age === 'child') {
    look.height = 0.6 + r() * 0.14;
    look.build = 0.9 + r() * 0.1;
    look.face = 'none';
    look.back = r() < 0.4 ? 'backpack' : 'none';
    if (look.topStyle === 'jacket' || look.topStyle === 'kurta') look.topStyle = 'tee';
  } else if (age === 'elder') {
    look.hair = pick(['#d8d8d8', '#f0f0f0', '#a8a8b0', '#8a8a9a'], r);
    look.stoop = 0.08 + r() * 0.2;
    look.height = 0.9 + r() * 0.1;
  }
  let faith: string | null = null;
  // Faith dress for adults and elders (children in some traditions too, but kept simple here).
  if (age !== 'child' && opts.faith !== false) {
    let x = r();
    for (const f of g.faith) {
      if ((x -= f.weight) < 0) {
        f.apply(look, r);
        faith = f.id;
        break;
      }
    }
  }
  const aids = opts.aids !== false;
  if (aids && age === 'elder' && r() < 0.4) look.aid = 'cane';
  else if (aids && age !== 'child' && r() < 0.035) look.aid = 'wheelchair';
  if (look.aid === 'wheelchair') look.back = 'none';
  return { look, age, faith };
}

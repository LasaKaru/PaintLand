import type { HumanLook } from '../models/Human';
import type { RegionId } from '../world/Peoples';

// ————— street food —————

export type FoodId = 'kottu' | 'vadai' | 'hoppers' | 'takoyaki' | 'chai' | 'icecream';

export interface FoodStall {
  id: FoodId;
  area: string;
  /** Where to put the stall (the nearest clear spot is used). */
  near: [number, number];
  icon: string;
  colour: string;
}

/** Street food in the towns: a snack costs a little ink and leaves you well fed. */
export const FOOD_STALLS: FoodStall[] = [
  { id: 'kottu', area: 'city', near: [120, -60], icon: '🥘', colour: '#e0432f' },
  { id: 'vadai', area: 'city', near: [-310, 470], icon: '🍤', colour: '#f4a13b' },
  { id: 'hoppers', area: 'hills', near: [26, 10], icon: '🥞', colour: '#2d8a5a' },
  { id: 'takoyaki', area: 'village', near: [22, 10], icon: '🐙', colour: '#b0352a' },
  { id: 'chai', area: 'harbour', near: [16, -14], icon: '☕', colour: '#7a4a2a' },
  { id: 'icecream', area: 'harbour', near: [36, 50], icon: '🍦', colour: '#e8559a' },
];

export const FOOD_PRICE = 10;

/** Well fed: +5% ink from everything for a while (stacks with being well rested). */
export const FED_RULES = { bonus: 0.05, minutes: 12 };

/** Minutes of "well fed" left. */
export function fedMinutes(until: number | undefined, now: number): number {
  return until && until > now ? Math.ceil((until - now) / 60000) : 0;
}

export function fedBonus(until: number | undefined, now: number): number {
  return fedMinutes(until, now) > 0 ? 1 + FED_RULES.bonus : 1;
}

/** Eat: well fed for the full time again (it doesn't stack up). */
export function eat(now: number): number {
  return now + FED_RULES.minutes * 60000;
}

// ————— souvenirs —————

export type SouvenirId = 'mask' | 'kokeshi' | 'diya' | 'lantern' | 'fan' | 'cuckoo' | 'phonebox' | 'syrup' | 'boomerang';

export interface Souvenir {
  id: SouvenirId;
  /** Chapters (countries) where it comes from: visit one to find it at the port market. */
  chapters: string[];
  icon: string;
  price: number;
}

/** One local craft from each country, sold at the Harbour Town port market once you have been there. Cosmetic only. */
export const SOUVENIRS: Souvenir[] = [
  { id: 'mask', chapters: ['serendib', 'islandtrip'], icon: '👺', price: 60 },
  { id: 'kokeshi', chapters: ['japan', 'lanterns'], icon: '🎎', price: 60 },
  { id: 'diya', chapters: ['india'], icon: '🪔', price: 60 },
  { id: 'lantern', chapters: ['china'], icon: '🏮', price: 60 },
  { id: 'fan', chapters: ['korea'], icon: '🪭', price: 60 },
  { id: 'cuckoo', chapters: ['germany'], icon: '🕰', price: 60 },
  { id: 'phonebox', chapters: ['britain'], icon: '☎', price: 60 },
  { id: 'syrup', chapters: ['canada'], icon: '🍁', price: 60 },
  { id: 'boomerang', chapters: ['australia'], icon: '🪃', price: 60 },
];

/** The next souvenir on offer: not yet owned, from a country you've visited. */
export function nextSouvenir(owned: readonly string[], seen: readonly string[]): Souvenir | null {
  return SOUVENIRS.find((s) => !owned.includes(s.id) && s.chapters.some((c) => seen.includes(`chapter:${c}`))) ?? null;
}

// ————— the sketchbook —————

/** A portrait in the "People I met" sketchbook. */
export interface Sketch {
  look: HumanLook;
  region: RegionId;
  /** The town (area id). */
  area: string;
  /** When (ms). */
  at: number;
}

export const SKETCHBOOK_PAGES = 48;

/** A short key for a look, so the same person isn't sketched twice. */
export function lookKey(l: HumanLook): string {
  return [l.skin, l.hair, l.hairStyle, l.top, l.topStyle, l.bottom, l.hat, l.scarf, l.height?.toFixed(2)].join('|');
}

/** Add a portrait (newest first, no repeats of the same person, a book of 48 pages). Returns false if already sketched. */
export function addSketch(book: Sketch[], s: Sketch): boolean {
  const k = lookKey(s.look);
  if (book.some((b) => lookKey(b.look) === k)) return false;
  book.unshift(s);
  if (book.length > SKETCHBOOK_PAGES) book.length = SKETCHBOOK_PAGES;
  return true;
}

/** Minimal 2D context used to paint a portrait (so tests can pass a recorder). */
export interface Paint2D {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  globalAlpha: number;
  beginPath(): void;
  ellipse(x: number, y: number, rx: number, ry: number, rot: number, a0: number, a1: number): void;
  rect(x: number, y: number, w: number, h: number): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void;
  closePath(): void;
  fill(): void;
  stroke(): void;
}

/**
 * Paint a head-and-shoulders watercolour portrait of a look into a w × h box:
 * a wash of paper, the shoulders in their top colour, skin, hair or headwear
 * (hijab, turban, cap, hat), eyes and a smile, and a loose ink outline. Each
 * shape is laid down in a few translucent passes, slightly offset, like paint.
 */
export function paintPortrait(g: Paint2D, look: HumanLook, w: number, h: number, seed = 1): void {
  let s = seed * 9301 + 49297;
  const jit = (): number => ((s = (s * 9301 + 49297) % 233280) / 233280 - 0.5) * (w * 0.02);
  const wash = (colour: string, shape: () => void, passes = 3): void => {
    g.fillStyle = colour;
    for (let i = 0; i < passes; i++) {
      g.globalAlpha = i === 0 ? 0.75 : 0.25;
      g.beginPath();
      shape();
      g.fill();
    }
    g.globalAlpha = 1;
  };
  const cx = w / 2;
  const head = w * 0.2;
  const hy = h * 0.42;
  // Paper.
  wash('#f6efe0', () => g.rect(0, 0, w, h), 1);
  wash('#efe3cc', () => g.ellipse(cx + jit(), h * 0.45, w * 0.46, h * 0.42, 0, 0, Math.PI * 2), 2);
  // Shoulders and top.
  wash(look.top, () => {
    g.moveTo(w * 0.08 + jit(), h);
    g.quadraticCurveTo(w * 0.12, h * 0.68, cx, h * 0.66 + jit());
    g.quadraticCurveTo(w * 0.88, h * 0.68, w * 0.92 + jit(), h);
    g.closePath();
  });
  // Neck and face.
  wash(look.skin, () => g.rect(cx - head * 0.35, hy + head * 0.6, head * 0.7, head * 0.7));
  const cover = look.hat === 'hijab';
  if (cover) wash(look.scarf ?? '#2d6a5a', () => g.ellipse(cx + jit(), hy + head * 0.15, head * 1.25, head * 1.45, 0, 0, Math.PI * 2));
  wash(look.skin, () => g.ellipse(cx + jit(), hy + jit(), head, head * 1.1, 0, 0, Math.PI * 2));
  // Hair (not under a headscarf or turban).
  if (!cover && look.hat !== 'turban' && look.hairStyle !== 'bald') {
    wash(look.hair, () => {
      g.ellipse(cx + jit(), hy - head * 0.45, head * 1.05, head * 0.7, 0, Math.PI, Math.PI * 2);
      if (look.hairStyle === 'long' || look.hairStyle === 'braids' || look.hairStyle === 'bob') g.rect(cx - head * 1.05, hy - head * 0.5, head * 0.35, head * (look.hairStyle === 'bob' ? 1.1 : 1.7));
      if (look.hairStyle === 'long' || look.hairStyle === 'braids' || look.hairStyle === 'bob') g.rect(cx + head * 0.7, hy - head * 0.5, head * 0.35, head * (look.hairStyle === 'bob' ? 1.1 : 1.7));
      if (look.hairStyle === 'bun') g.ellipse(cx, hy - head * 1.25, head * 0.35, head * 0.3, 0, 0, Math.PI * 2);
      if (look.hairStyle === 'curly') for (let i = 0; i < 7; i++) g.ellipse(cx + Math.cos(Math.PI + (i / 6) * Math.PI) * head, hy - head * 0.4 + Math.sin(Math.PI + (i / 6) * Math.PI) * head * 0.8, head * 0.28, head * 0.28, 0, 0, Math.PI * 2);
    });
  }
  // Headwear.
  const hat = look.hat ?? 'none';
  if (hat === 'turban') wash(look.scarf ?? '#2d4f8f', () => g.ellipse(cx + jit(), hy - head * 0.55, head * 1.1, head * 0.75, 0, Math.PI * 1.02, Math.PI * 1.98));
  else if (hat === 'kippah') wash(look.scarf ?? '#2d3f6f', () => g.ellipse(cx, hy - head * 1.02, head * 0.45, head * 0.18, 0, 0, Math.PI * 2));
  else if (hat === 'taqiyah') wash('#f6f0e4', () => g.rect(cx - head * 0.9, hy - head * 1.15, head * 1.8, head * 0.4));
  else if (hat !== 'none' && hat !== 'hijab') wash(hat === 'straw' ? '#e8c872' : look.scarf ?? shade(look.top), () => {
    g.rect(cx - head * 1.3, hy - head * 0.85, head * 2.6, head * 0.18);
    g.ellipse(cx, hy - head * 0.95, head * 0.8, head * 0.45, 0, Math.PI, Math.PI * 2);
  });
  // Face: eyes, cheeks and a smile.
  g.fillStyle = '#2b2622';
  for (const sx of [-1, 1]) {
    g.beginPath();
    g.ellipse(cx + sx * head * 0.38, hy + head * 0.05, head * 0.09, head * 0.12, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#f09a8a';
  g.globalAlpha = 0.5;
  for (const sx of [-1, 1]) {
    g.beginPath();
    g.ellipse(cx + sx * head * 0.6, hy + head * 0.35, head * 0.16, head * 0.1, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  g.strokeStyle = '#2b2622';
  g.lineWidth = Math.max(1, w * 0.012);
  g.beginPath();
  g.moveTo(cx - head * 0.28, hy + head * 0.45);
  g.quadraticCurveTo(cx, hy + head * 0.68, cx + head * 0.28, hy + head * 0.45);
  g.stroke();
  // A loose ink outline around the head.
  g.globalAlpha = 0.6;
  g.beginPath();
  g.ellipse(cx + jit(), hy + jit(), head * 1.02, head * 1.12, 0, 0.2, Math.PI * 1.9);
  g.stroke();
  g.globalAlpha = 1;
}

function shade(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number): string => Math.round(v * 0.7).toString(16).padStart(2, '0');
  return `#${f((n >> 16) & 255)}${f((n >> 8) & 255)}${f(n & 255)}`;
}

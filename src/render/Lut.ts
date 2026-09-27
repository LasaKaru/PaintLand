/**
 * Colour grading with 3D look-up tables (LUTs), applied to the finished
 * picture. The built-in looks are baked from small colour functions at
 * start-up; players can also load their own `.cube` LUT (the format that
 * DaVinci Resolve, Premiere and Photoshop export).
 */
import * as THREE from 'three';

export const LUT_SIZE = 32;

type Rgb = [number, number, number];
type Grade = (r: number, g: number, b: number) => Rgb;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const luma = (r: number, g: number, b: number): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
/** A gentle S-curve around 0.5 (k > 0 adds contrast, k < 0 flattens). */
const curve = (v: number, k: number): number => clamp01(v + k * (v - 0.5) * (1 - Math.abs(2 * v - 1)) * 2);
const saturate = (c: Rgb, s: number): Rgb => {
  const l = luma(...c);
  return [mix(l, c[0], s), mix(l, c[1], s), mix(l, c[2], s)];
};
/** Tint shadows and highlights separately (split toning). */
const split = (c: Rgb, shadow: Rgb, high: Rgb, amount: number): Rgb => {
  const l = luma(...c);
  const hs = l * l;
  const ss = (1 - l) * (1 - l);
  return [c[0] + (shadow[0] * ss + high[0] * hs) * amount, c[1] + (shadow[1] * ss + high[1] * hs) * amount, c[2] + (shadow[2] * ss + high[2] * hs) * amount];
};
const lift = (c: Rgb, black: number, white = 1): Rgb => [mix(black, white, c[0]), mix(black, white, c[1]), mix(black, white, c[2])];

export interface LutLook {
  id: string;
  /** Shown in the menu (English; the look names are proper names of the looks). */
  name: string;
  grade: Grade;
}

export const LUT_LOOKS: LutLook[] = [
  { id: 'none', name: 'None', grade: (r, g, b) => [r, g, b] },
  {
    id: 'golden',
    name: 'Golden hour',
    grade: (r, g, b) => {
      let c: Rgb = split([r, g, b], [-0.02, 0.03, 0.06], [0.08, 0.03, -0.05], 0.8);
      c = [curve(c[0], 0.12), curve(c[1], 0.1), curve(c[2], 0.08)];
      return saturate(c, 1.08);
    },
  },
  {
    id: 'cinema',
    name: 'Cinema (teal & orange)',
    grade: (r, g, b) => {
      let c: Rgb = split([r, g, b], [-0.06, 0.04, 0.09], [0.09, 0.02, -0.07], 1);
      c = [curve(c[0], 0.2), curve(c[1], 0.18), curve(c[2], 0.18)];
      return saturate(lift(c, 0.02, 0.98), 1.05);
    },
  },
  {
    id: 'calm',
    name: 'Calm pastel',
    grade: (r, g, b) => {
      let c: Rgb = saturate([r, g, b], 0.82);
      c = [curve(c[0], -0.12), curve(c[1], -0.12), curve(c[2], -0.12)];
      c = split(c, [0.03, 0.01, 0.06], [0.04, 0.02, 0.03], 0.8);
      return lift(c, 0.06, 0.98);
    },
  },
  {
    id: 'dream',
    name: 'Dreamy lavender',
    grade: (r, g, b) => {
      let c: Rgb = split([r, g, b], [0.05, 0.0, 0.1], [0.06, 0.03, 0.08], 0.9);
      c = [Math.pow(clamp01(c[0]), 0.9), Math.pow(clamp01(c[1]), 0.92), Math.pow(clamp01(c[2]), 0.88)];
      return lift(saturate(c, 0.9), 0.05, 1);
    },
  },
  {
    id: 'moonlight',
    name: 'Moonlight',
    grade: (r, g, b) => {
      let c: Rgb = saturate([r, g, b], 0.65);
      c = split(c, [-0.02, 0.03, 0.12], [-0.03, 0.02, 0.06], 1);
      return [curve(c[0] * 0.92, 0.1), curve(c[1] * 0.96, 0.1), curve(c[2], 0.1)];
    },
  },
  {
    id: 'vintage',
    name: 'Vintage film',
    grade: (r, g, b) => {
      let c: Rgb = saturate([r, g, b], 0.7);
      c = split(c, [0.05, 0.03, -0.02], [0.07, 0.04, -0.04], 1);
      c = [curve(c[0], 0.08), curve(c[1], 0.06), curve(c[2], 0.02)];
      return lift(c, 0.07, 0.93);
    },
  },
  {
    id: 'vivid',
    name: 'Vivid',
    grade: (r, g, b) => {
      const c: Rgb = saturate([r, g, b], 1.3);
      return [curve(c[0], 0.15), curve(c[1], 0.15), curve(c[2], 0.15)];
    },
  },
  {
    id: 'ink',
    name: 'Ink & paper (black and white)',
    grade: (r, g, b) => {
      const l = curve(luma(r, g, b), 0.22);
      return [l * 1.02, l, l * 0.94];
    },
  },
];

/** Bake a look into an RGBA table of size³ (red fastest, then green, then blue). */
export function bakeLut(grade: Grade, size = LUT_SIZE): Uint8Array {
  const data = new Uint8Array(size * size * size * 4);
  let i = 0;
  for (let b = 0; b < size; b++)
    for (let g = 0; g < size; g++)
      for (let r = 0; r < size; r++) {
        const c = grade(r / (size - 1), g / (size - 1), b / (size - 1));
        data[i++] = Math.round(clamp01(c[0]) * 255);
        data[i++] = Math.round(clamp01(c[1]) * 255);
        data[i++] = Math.round(clamp01(c[2]) * 255);
        data[i++] = 255;
      }
  return data;
}

export interface CubeLut {
  title: string;
  size: number;
  data: Uint8Array;
}

/** The largest .cube accepted (65³ is the biggest common size). */
export const MAX_CUBE_SIZE = 65;

/**
 * Read a `.cube` file (Adobe/Resolve 3D LUT). Only 3D LUTs with the default
 * 0–1 domain are accepted. Returns null for anything that isn't one.
 */
export function parseCube(text: string): CubeLut | null {
  if (typeof text !== 'string' || text.length > 12_000_000) return null;
  let size = 0;
  let title = '';
  const values: number[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const upper = line.toUpperCase();
    if (upper.startsWith('TITLE')) {
      title = line.slice(5).trim().replace(/^"|"$/g, '').slice(0, 60);
      continue;
    }
    if (upper.startsWith('LUT_3D_SIZE')) {
      size = Number(line.split(/\s+/)[1]);
      if (!Number.isInteger(size) || size < 2 || size > MAX_CUBE_SIZE) return null;
      continue;
    }
    if (upper.startsWith('LUT_1D_SIZE')) return null;
    if (upper.startsWith('DOMAIN_MIN')) {
      if (line.split(/\s+/).slice(1).some((v) => Number(v) !== 0)) return null;
      continue;
    }
    if (upper.startsWith('DOMAIN_MAX')) {
      if (line.split(/\s+/).slice(1).some((v) => Number(v) !== 1)) return null;
      continue;
    }
    if (/^[A-Z_]/.test(upper)) continue; // other keywords
    const parts = line.split(/\s+/);
    if (parts.length !== 3) return null;
    for (const p of parts) {
      const v = Number(p);
      if (!Number.isFinite(v)) return null;
      values.push(v);
    }
  }
  if (!size || values.length !== size * size * size * 3) return null;
  const data = new Uint8Array(size * size * size * 4);
  for (let i = 0, j = 0; i < values.length; i += 3, j += 4) {
    data[j] = Math.round(clamp01(values[i]) * 255);
    data[j + 1] = Math.round(clamp01(values[i + 1]) * 255);
    data[j + 2] = Math.round(clamp01(values[i + 2]) * 255);
    data[j + 3] = 255;
  }
  return { title: title || 'My LUT', size, data };
}

/** Look up a colour in a baked table (nearest entry; used by tests and tools). */
export function sampleLut(data: Uint8Array, size: number, r: number, g: number, b: number): Rgb {
  const idx = (v: number): number => Math.round(clamp01(v) * (size - 1));
  const i = (idx(r) + idx(g) * size + idx(b) * size * size) * 4;
  return [data[i] / 255, data[i + 1] / 255, data[i + 2] / 255];
}

export function lutTexture(data: Uint8Array, size: number): THREE.Data3DTexture {
  const tex = new THREE.Data3DTexture(data, size, size, size);
  tex.format = THREE.RGBAFormat;
  tex.type = THREE.UnsignedByteType;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.ClampToEdgeWrapping;
  tex.unpackAlignment = 1;
  tex.needsUpdate = true;
  return tex;
}

const CUSTOM_KEY = 'paintland.lut.custom.v1';

/** The textures for every look (baked once, on first use), plus the player's own LUT. */
export class LutBank {
  private readonly cache = new Map<string, { tex: THREE.Data3DTexture; size: number }>();
  custom: CubeLut | null = null;

  constructor() {
    try {
      const raw = localStorage.getItem(CUSTOM_KEY);
      if (raw) {
        const v = JSON.parse(raw) as { title: string; size: number; data: string };
        const bytes = Uint8Array.from(atob(v.data), (ch) => ch.charCodeAt(0));
        if (Number.isInteger(v.size) && v.size >= 2 && v.size <= MAX_CUBE_SIZE && bytes.length === v.size ** 3 * 4) this.custom = { title: String(v.title).slice(0, 60), size: v.size, data: bytes };
      }
    } catch {
      /* no saved LUT, or storage blocked */
    }
  }

  /** The texture for a look id ('custom' for the player's own), or null for none. */
  get(id: string): { tex: THREE.Data3DTexture; size: number } | null {
    if (id === 'none') return null;
    const hit = this.cache.get(id);
    if (hit) return hit;
    let made: { tex: THREE.Data3DTexture; size: number } | null = null;
    if (id === 'custom') made = this.custom ? { tex: lutTexture(this.custom.data, this.custom.size), size: this.custom.size } : null;
    else {
      const look = LUT_LOOKS.find((l) => l.id === id);
      if (look) made = { tex: lutTexture(bakeLut(look.grade), LUT_SIZE), size: LUT_SIZE };
    }
    if (made) this.cache.set(id, made);
    return made;
  }

  /** Use a .cube file as the player's own LUT; returns its title, or null if it can't be read. */
  loadCube(text: string): string | null {
    const lut = parseCube(text);
    if (!lut) return null;
    this.custom = lut;
    this.cache.get('custom')?.tex.dispose();
    this.cache.delete('custom');
    try {
      let bin = '';
      for (let i = 0; i < lut.data.length; i += 0x8000) bin += String.fromCharCode(...lut.data.subarray(i, i + 0x8000));
      localStorage.setItem(CUSTOM_KEY, JSON.stringify({ title: lut.title, size: lut.size, data: btoa(bin) }));
    } catch {
      /* too big to remember: it still works until the game is closed */
    }
    return lut.title;
  }
}

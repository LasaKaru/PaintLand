import * as THREE from 'three';
import { ModelKit, Pattern } from '../models/ModelKit';
import { PaintMaterial } from '../render/PaintMaterial';

/**
 * Paint the road: with the brush on, the car leaves dabs of paint behind it
 * that stay where they fall (saved on this device, per chapter or free-roam
 * area) and are shown live to the other players in the room.
 */

/** One dab of paint: where, which way is up, its palette colour and size. */
export interface TrailDot {
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  /** Index into TRAIL_COLOURS. */
  c: number;
  /** Radius in metres (0.4–2). */
  r: number;
}

export const TRAIL_COLOURS = [
  '#e0432f', '#f08a2e', '#f4d23b', '#8cc63f', '#2d8a5a', '#3ec9c0', '#3e86c9', '#2d4f8f',
  '#9a5bd6', '#e8559a', '#f6f0e4', '#2b2622', '#b0352a', '#e3c07a', '#7a3b2e', '#a6c8e8',
] as const;

/** Dabs kept per place; the oldest fade out first. */
export const MAX_DOTS_PER_PLACE = 1500;
/** Dabs per network message (keeps each well under the relay's 4 KB). */
export const DOTS_PER_MESSAGE = 24;
/** Metres driven between dabs. */
export const DOT_SPACING = 0.9;
/** Stored positions are in 1/8 m steps, so they must stay within ±4 km. */
const POS_SCALE = 8;
const POS_LIMIT = 32767 / POS_SCALE;

// ————— compact storage: 10 bytes a dab, base64 —————

export function encodeDots(dots: readonly TrailDot[]): string {
  const buf = new DataView(new ArrayBuffer(dots.length * 10));
  dots.forEach((d, i) => {
    const o = i * 10;
    buf.setInt16(o, Math.round(clampPos(d.x) * POS_SCALE), true);
    buf.setInt16(o + 2, Math.round(clampPos(d.y) * POS_SCALE), true);
    buf.setInt16(o + 4, Math.round(clampPos(d.z) * POS_SCALE), true);
    buf.setInt8(o + 6, Math.round(d.nx * 127));
    buf.setInt8(o + 7, Math.round(d.ny * 127));
    buf.setInt8(o + 8, Math.round(d.nz * 127));
    // Colour in the low 4 bits, size (0.4 + n × 0.1 m) in the high 4.
    buf.setUint8(o + 9, (d.c & 15) | (Math.max(0, Math.min(15, Math.round((d.r - 0.4) / 0.1))) << 4));
  });
  let bin = '';
  const bytes = new Uint8Array(buf.buffer);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function decodeDots(text: string): TrailDot[] {
  let bin: string;
  try {
    bin = atob(text);
  } catch {
    return [];
  }
  const n = Math.floor(bin.length / 10);
  const bytes = new Uint8Array(n * 10);
  for (let i = 0; i < bytes.length; i++) bytes[i] = bin.charCodeAt(i);
  const buf = new DataView(bytes.buffer);
  const out: TrailDot[] = [];
  for (let i = 0; i < n; i++) {
    const o = i * 10;
    const v = buf.getUint8(o + 9);
    out.push({
      x: buf.getInt16(o, true) / POS_SCALE,
      y: buf.getInt16(o + 2, true) / POS_SCALE,
      z: buf.getInt16(o + 4, true) / POS_SCALE,
      nx: buf.getInt8(o + 6) / 127,
      ny: buf.getInt8(o + 7) / 127,
      nz: buf.getInt8(o + 8) / 127,
      c: v & 15,
      r: 0.4 + (v >> 4) * 0.1,
    });
  }
  return out;
}

function clampPos(v: number): number {
  return Math.max(-POS_LIMIT, Math.min(POS_LIMIT, v));
}

// ————— the network message —————

/** A batch of dabs as sent to the room: [x, y, z, nx, ny, nz, colour, radius] × n, rounded. */
export function packDots(dots: readonly TrailDot[]): number[] {
  const r1 = (v: number) => Math.round(v * 10) / 10;
  const r2 = (v: number) => Math.round(v * 100) / 100;
  return dots.slice(0, DOTS_PER_MESSAGE).flatMap((d) => [r1(d.x), r1(d.y), r1(d.z), r2(d.nx), r2(d.ny), r2(d.nz), d.c, r1(d.r)]);
}

/** Check a batch from another player; anything odd drops the whole batch. */
export function unpackDots(place: unknown, flat: unknown): { place: string; dots: TrailDot[] } | null {
  if (typeof place !== 'string' || !/^[a-z0-9-]{1,24}$/.test(place)) return null;
  if (!Array.isArray(flat) || flat.length === 0 || flat.length % 8 !== 0 || flat.length > DOTS_PER_MESSAGE * 8) return null;
  const dots: TrailDot[] = [];
  for (let i = 0; i < flat.length; i += 8) {
    const [x, y, z, nx, ny, nz, c, r] = flat.slice(i, i + 8) as unknown[];
    const nums = [x, y, z, nx, ny, nz, c, r];
    if (!nums.every((v) => typeof v === 'number' && Number.isFinite(v))) return null;
    const n = nums as number[];
    if (Math.abs(n[0]) > POS_LIMIT || Math.abs(n[1]) > POS_LIMIT || Math.abs(n[2]) > POS_LIMIT) return null;
    const len = Math.hypot(n[3], n[4], n[5]);
    if (len < 0.5 || len > 1.5) return null;
    if (!Number.isInteger(n[6]) || n[6] < 0 || n[6] >= TRAIL_COLOURS.length || n[7] < 0.4 || n[7] > 2) return null;
    dots.push({ x: n[0], y: n[1], z: n[2], nx: n[3] / len, ny: n[4] / len, nz: n[5] / len, c: n[6], r: n[7] });
  }
  return { place, dots };
}

/** The palette colour nearest to any colour (for "match my car"). */
export function nearestTrailColour(hex: string): number {
  const c = new THREE.Color(hex);
  let best = 0;
  let bestD = Infinity;
  TRAIL_COLOURS.forEach((p, i) => {
    const q = new THREE.Color(p);
    const d = (c.r - q.r) ** 2 + (c.g - q.g) ** 2 + (c.b - q.b) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

// ————— saved trails —————

const KEY = 'paintland.trails.v1';

/** Your own trails, per place, kept on this device (not in the cloud save: they can be large). */
export class TrailStore {
  private places: Record<string, TrailDot[]> = {};
  private dirty = false;

  constructor(private readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null = typeof localStorage === 'undefined' ? null : localStorage) {
    try {
      const raw = this.storage?.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Record<string, string>;
        for (const [place, text] of Object.entries(saved)) if (typeof text === 'string') this.places[place] = decodeDots(text).slice(-MAX_DOTS_PER_PLACE);
      }
    } catch {
      this.places = {};
    }
  }

  dots(place: string): readonly TrailDot[] {
    return this.places[place] ?? [];
  }

  add(place: string, dot: TrailDot): void {
    const list = (this.places[place] ??= []);
    list.push(dot);
    if (list.length > MAX_DOTS_PER_PLACE) list.splice(0, list.length - MAX_DOTS_PER_PLACE);
    this.dirty = true;
  }

  /** Clear one place, or every place. */
  clear(place?: string): void {
    if (place) delete this.places[place];
    else this.places = {};
    this.dirty = true;
    this.save();
  }

  get total(): number {
    return Object.values(this.places).reduce((a, l) => a + l.length, 0);
  }

  /** Write to storage if anything changed (call every few seconds and on leaving a place). */
  save(): void {
    if (!this.dirty) return;
    this.dirty = false;
    try {
      const out: Record<string, string> = {};
      for (const [place, list] of Object.entries(this.places)) if (list.length) out[place] = encodeDots(list);
      if (Object.keys(out).length) this.storage?.setItem(KEY, JSON.stringify(out));
      else this.storage?.removeItem(KEY);
    } catch {
      /* storage full or blocked: the trail still shows this session */
    }
  }
}

// ————— the brush —————

/** Drops a dab every DOT_SPACING metres while the car is on the ground and moving. */
export class TrailBrush {
  on = false;
  private travelled = 0;
  private last = new THREE.Vector3();
  private hasLast = false;

  /** Returns a new dab when one is due. */
  update(pos: THREE.Vector3, up: THREE.Vector3, grounded: boolean, colour: number, speed: number): TrailDot | null {
    if (!this.on || !grounded) {
      this.hasLast = false;
      return null;
    }
    if (!this.hasLast) {
      this.last.copy(pos);
      this.hasLast = true;
      return null;
    }
    const step = pos.distanceTo(this.last);
    this.last.copy(pos);
    // A jump across the map (respawn, fast travel) starts a new stroke.
    if (step > 12) return null;
    this.travelled += step;
    if (this.travelled < DOT_SPACING) return null;
    // Carry the remainder so dabs stay evenly spaced at any frame rate (at most one per frame).
    this.travelled = Math.min(DOT_SPACING, this.travelled - DOT_SPACING);
    // Faster strokes are a little wider, like a loaded brush dragged quickly.
    const r = Math.min(1.6, 0.8 + speed * 0.012) * (0.85 + Math.random() * 0.3);
    return { x: pos.x, y: pos.y, z: pos.z, nx: up.x, ny: up.y, nz: up.z, c: colour, r };
  }
}

// ————— drawing —————

const _m = new THREE.Matrix4();
const _nm = new THREE.Matrix3();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _n = new THREE.Vector3();
const _s = new THREE.Vector3();
const _v = new THREE.Vector3();
const _col = new THREE.Color();
const Y = new THREE.Vector3(0, 1, 0);
/** Dabs per mesh: each chunk's buffers are made once and filled in place. */
const CHUNK = 256;

/** A thin, slightly wobbly disc of paint lying flat (+Y up); white, tinted per dab. */
function dabTemplate(): THREE.BufferGeometry {
  const g = new ModelKit().cylinder(1, 1, 0.05, 12, '#ffffff', { position: [0, 0.025, 0], pattern: Pattern.Matte }).build(0.08, 7);
  return g.index ? g.toNonIndexed() : g;
}

/**
 * Everyone's dabs in the current place, drawn with the world's own paint
 * material (so they get ink outlines and lighting). Dabs are written straight
 * into preallocated chunks of merged geometry, CHUNK dabs to a mesh.
 */
export class TrailLayer {
  readonly group = new THREE.Group();
  private readonly material = new PaintMaterial({ vertexColors: true });
  private readonly template = dabTemplate();
  private readonly chunks: THREE.Mesh[] = [];
  private dots: TrailDot[] = [];

  constructor(readonly capacity = MAX_DOTS_PER_PLACE * 3) {
    this.group.name = 'paint-trail';
  }

  get size(): number {
    return this.dots.length;
  }

  /** Replace everything shown (on entering a place). */
  set(dots: Iterable<TrailDot>): void {
    this.dots = [...dots].slice(-this.capacity);
    this.rebuild();
  }

  add(dot: TrailDot): void {
    this.dots.push(dot);
    // When full, drop the oldest tenth in one go (cheaper than shifting every dab).
    if (this.dots.length > this.capacity) {
      this.dots.splice(0, Math.ceil(this.capacity / 10));
      this.rebuild();
      return;
    }
    this.write(this.dots.length - 1, dot);
    this.finish();
  }

  private rebuild(): void {
    this.dots.forEach((d, i) => this.write(i, d));
    this.finish();
  }

  private chunk(i: number): THREE.Mesh {
    while (this.chunks.length <= i) {
      const g = new THREE.BufferGeometry();
      const verts = this.template.getAttribute('position').count * CHUNK;
      for (const [name, attr] of Object.entries(this.template.attributes)) {
        const a = new THREE.BufferAttribute(new Float32Array(verts * attr.itemSize), attr.itemSize, attr.normalized);
        a.setUsage(THREE.DynamicDrawUsage);
        g.setAttribute(name, a);
      }
      g.setDrawRange(0, 0);
      const mesh = new THREE.Mesh(g, this.material);
      mesh.frustumCulled = false;
      this.chunks.push(mesh);
      this.group.add(mesh);
    }
    return this.chunks[i];
  }

  /** Write dab number i into its chunk. */
  private write(i: number, d: TrailDot): void {
    const mesh = this.chunk(Math.floor(i / CHUNK));
    const g = mesh.geometry;
    const tpl = this.template;
    const n = tpl.getAttribute('position').count;
    const base = (i % CHUNK) * n;
    _n.set(d.nx, d.ny, d.nz).normalize();
    _p.set(d.x, d.y, d.z).addScaledVector(_n, 0.03);
    _q.setFromUnitVectors(Y, _n);
    // A stable "random" turn and stretch per dab so they don't all look stamped.
    const turn = (d.x * 12.9898 + d.z * 78.233) % 6.283 || 0;
    _q.multiply(_q2.setFromAxisAngle(Y, turn));
    _s.set(d.r, 1, d.r * (0.7 + 0.2 * Math.abs(Math.sin(turn * 3))));
    _m.compose(_p, _q, _s);
    _nm.getNormalMatrix(_m);
    _col.set(TRAIL_COLOURS[d.c] ?? TRAIL_COLOURS[0]);
    for (const [name, src] of Object.entries(tpl.attributes)) {
      const dst = g.getAttribute(name) as THREE.BufferAttribute;
      for (let k = 0; k < n; k++) {
        const j = base + k;
        if (name === 'position') {
          _v.fromBufferAttribute(src, k).applyMatrix4(_m);
          dst.setXYZ(j, _v.x, _v.y, _v.z);
        } else if (name === 'normal' || name === 'smoothNormal') {
          _v.fromBufferAttribute(src, k).applyMatrix3(_nm).normalize();
          dst.setXYZ(j, _v.x, _v.y, _v.z);
        } else if (name === 'color') {
          const w = src.getX(k); // template is white, shaded by the kit's wobble
          dst.setXYZ(j, _col.r * w, _col.g * w, _col.b * w);
          if (src.itemSize > 3) dst.setW(j, src.getW(k));
        } else for (let c = 0; c < src.itemSize; c++) dst.setComponent(j, c, src.getComponent(k, c));
      }
    }
  }

  private finish(): void {
    const n = this.template.getAttribute('position').count;
    this.chunks.forEach((mesh, ci) => {
      const inChunk = Math.max(0, Math.min(CHUNK, this.dots.length - ci * CHUNK));
      mesh.geometry.setDrawRange(0, inChunk * n);
      mesh.visible = inChunk > 0;
      for (const a of Object.values(mesh.geometry.attributes)) (a as THREE.BufferAttribute).needsUpdate = true;
    });
  }
}

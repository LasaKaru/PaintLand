import * as THREE from 'three';
import { ModelKit, Pattern } from './ModelKit';
import { Random, hash3 } from '../core/Random';

const TRUNK = '#7a4a2a';
const GREENS = ['#8cc63f', '#9ad04a', '#7fbb3a', '#a6d655'];
const DARK_GREENS = ['#4f9a4a', '#3f8f45', '#5aa84a'];

/** Layered dark-green cypress. Base at origin. */
export function buildCypress(rnd: Random): THREE.BufferGeometry {
  const h = rnd.range(5.5, 9);
  const k = new ModelKit().cylinder(0.12, 0.18, 1.2, 6, TRUNK, { position: [0, 0.6, 0] });
  const layers = 3;
  for (let i = 0; i < layers; i++) {
    const t = i / layers;
    const r = 1.05 * (1 - t * 0.45);
    k.blob(1, rnd.pick(DARK_GREENS), {
      position: [rnd.jitter(0.08), 1.2 + h * (0.22 + t * 0.3), rnd.jitter(0.08)],
      scale: [r, h * 0.32, r],
      detail: 1,
      roughness: 0.12,
      seed: h + i,
      pattern: Pattern.Leaves,
    });
  }
  return k.build(0.04, rnd.int(0, 999));
}

/**
 * Faceted round tree like the reference's lemon trees: a trunk that forks into
 * branches, a clustered canopy with lighter tops, and fruit.
 */
export function buildRoundTree(rnd: Random, fruit: string | null, potted = false): THREE.BufferGeometry {
  const k = new ModelKit();
  const trunkH = rnd.range(1.8, 2.8);
  const base = potted ? 0.9 : 0;
  if (potted) {
    k.box(1.5, 0.9, 1.5, '#c8643a', { position: [0, 0.45, 0], pattern: Pattern.Brick });
    k.box(1.62, 0.12, 1.62, '#e0864e', { position: [0, 0.92, 0] });
    k.box(1.3, 0.06, 1.3, '#6b4a2a', { position: [0, 0.96, 0] });
  }
  k.cylinder(0.13, 0.22, trunkH, 7, TRUNK, { position: [0, base + trunkH / 2, 0], rotation: [rnd.jitter(0.06), 0, rnd.jitter(0.06)] });
  const r = rnd.range(1.7, 2.4);
  const top = base + trunkH;
  // Branches.
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + rnd.jitter(0.4);
    k.cylinder(0.06, 0.1, r * 0.9, 5, TRUNK, { position: [Math.cos(a) * r * 0.25, top + r * 0.3, Math.sin(a) * r * 0.25], rotation: [Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7] });
  }
  // Canopy clusters: a core plus satellites, lighter on top.
  const core = rnd.pick(GREENS);
  k.blob(r, core, { position: [0, top + r * 0.75, 0], detail: 1, roughness: 0.22, seed: r, pattern: Pattern.Leaves });
  const n = rnd.int(5, 8);
  for (let i = 0; i < n; i++) {
    const a = rnd.range(0, Math.PI * 2);
    const e = rnd.range(-0.3, 0.9);
    const rr = r * rnd.range(0.45, 0.7);
    const upper = e > 0.4;
    k.blob(rr, upper ? '#b4dc5a' : rnd.pick(i % 3 === 0 ? DARK_GREENS : GREENS), {
      position: [Math.cos(a) * Math.cos(e) * r * 0.85, top + r * 0.75 + Math.sin(e) * r * 0.8, Math.sin(a) * Math.cos(e) * r * 0.85],
      detail: 1,
      roughness: 0.25,
      seed: a,
      pattern: Pattern.Leaves,
    });
  }
  if (fruit) {
    for (let i = 0; i < rnd.int(10, 18); i++) {
      const a = rnd.range(0, Math.PI * 2);
      const e = rnd.range(-0.5, 0.8);
      k.blob(0.16, fruit, {
        position: [Math.cos(a) * Math.cos(e) * r * 1.12, top + r * 0.75 + Math.sin(e) * r * 1.05, Math.sin(a) * Math.cos(e) * r * 1.12],
        scale: [1, 1.25, 1],
        detail: 0,
        roughness: 0.05,
        seed: i,
      });
    }
  }
  return k.build(0.05, rnd.int(0, 999));
}

/** Coconut palm with a curved, ringed trunk and drooping fronds (Galle Face, Mirissa). */
export function buildPalm(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const segs = 9;
  const lean = rnd.range(0.05, 0.22) * (rnd.chance(0.5) ? 1 : -1);
  const dir = rnd.range(0, Math.PI * 2);
  const p = new THREE.Vector3(0, 0, 0);
  const segLen = rnd.range(0.95, 1.25);
  for (let i = 0; i < segs; i++) {
    const tilt = lean * (i / segs) * 2.2;
    const r = 0.26 - i * 0.012;
    const dx = Math.sin(tilt) * segLen * Math.cos(dir);
    const dz = Math.sin(tilt) * segLen * Math.sin(dir);
    const dy = Math.cos(tilt) * segLen;
    k.cylinder(r * 0.92, r, segLen * 1.02, 7, i % 2 ? '#9a7a55' : '#8a6a48', {
      position: [p.x + dx / 2, p.y + dy / 2, p.z + dz / 2],
      rotation: [Math.sin(dir) * tilt, 0, -Math.cos(dir) * tilt],
    });
    p.add(new THREE.Vector3(dx, dy, dz));
  }
  // Coconuts.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    k.blob(0.22, '#6b8a2a', { position: [p.x + Math.cos(a) * 0.3, p.y - 0.3, p.z + Math.sin(a) * 0.3], detail: 0, seed: i });
  }
  // Fronds: chains of flattened leaves that droop outward.
  const fronds = rnd.int(8, 11);
  for (let f = 0; f < fronds; f++) {
    const a = (f / fronds) * Math.PI * 2 + rnd.jitter(0.2);
    let fx = p.x;
    let fy = p.y;
    let fz = p.z;
    let pitch = rnd.range(0.1, 0.5);
    for (let s = 0; s < 4; s++) {
      const len = 1.1;
      const nx = fx + Math.cos(a) * Math.cos(pitch) * len;
      const nz = fz + Math.sin(a) * Math.cos(pitch) * len;
      const ny = fy + Math.sin(pitch) * len;
      const col = s % 2 ? '#5aa84a' : '#6fb84a';
      k.box(1.25, 0.05, 0.6 - s * 0.1, col, {
        position: [(fx + nx) / 2, (fy + ny) / 2, (fz + nz) / 2],
        rotation: [0, -a, pitch],
        pattern: Pattern.Leaves,
      });
      fx = nx;
      fy = ny;
      fz = nz;
      pitch -= 0.38;
    }
  }
  return k.build(0.03, rnd.int(0, 999));
}

export function buildBush(rnd: Random, colour?: string): THREE.BufferGeometry {
  const k = new ModelKit();
  const n = rnd.int(2, 4);
  for (let i = 0; i < n; i++) {
    const c = colour ?? rnd.pick(GREENS);
    k.blob(rnd.range(0.55, 1.05), i === n - 1 && !colour ? '#b4dc5a' : c, { position: [rnd.jitter(0.7), 0.45 + i * 0.12, rnd.jitter(0.5)], detail: 1, roughness: 0.24, seed: i + n, pattern: Pattern.Leaves });
  }
  return k.build(0.04, rnd.int(0, 999));
}

/** Magenta bougainvillea spilling over a low wall. */
export function buildFlowerBush(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(2.4, 0.6, 0.6, '#f1e9d8', { position: [0, 0.3, 0], pattern: Pattern.Brick });
  for (let i = 0; i < 7; i++) {
    k.blob(rnd.range(0.4, 0.7), rnd.pick(['#e8559a', '#d94a86', '#c8457a', '#f08a2e']), { position: [rnd.range(-1.1, 1.1), rnd.range(0.6, 1.3), rnd.jitter(0.35)], detail: 0, roughness: 0.3, seed: i, pattern: Pattern.Leaves });
  }
  for (let i = 0; i < 3; i++) k.blob(0.4, '#4f9a4a', { position: [rnd.range(-1, 1), 0.7, rnd.jitter(0.3)], detail: 0, seed: i + 20, pattern: Pattern.Leaves });
  return k.build(0.03, rnd.int(0, 999));
}

export function buildPottedPlant(rnd: Random): THREE.BufferGeometry {
  return new ModelKit()
    .cylinder(0.4, 0.3, 0.7, 8, '#c8643a', { position: [0, 0.35, 0] })
    .cylinder(0.44, 0.44, 0.1, 8, '#e0864e', { position: [0, 0.72, 0] })
    .blob(0.6, rnd.pick(['#8cc63f', '#6fae3a', '#e8559a']), { position: [0, 1.05, 0], detail: 1, seed: 3, pattern: Pattern.Leaves })
    .blob(0.35, '#b4dc5a', { position: [0.15, 1.4, 0.1], detail: 0, seed: 4, pattern: Pattern.Leaves })
    .build(0.03, rnd.int(0, 99));
}

/** Floating rock with a grass cap, pointed underneath. Origin at the top surface. */
export function buildFloatingRock(rnd: Random, size: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.blob(size, '#b4aed0', { position: [0, -size * 0.6, 0], scale: [1, 1.3, 1], detail: 1, roughness: 0.3, seed: size, pattern: Pattern.Stone });
  k.cylinder(size * 0.95, size * 0.8, size * 0.35, 9, '#8cc63f', { position: [0, 0, 0], pattern: Pattern.Grass });
  if (rnd.chance(0.6)) k.blob(size * 0.35, '#6fae3a', { position: [size * 0.3, size * 0.35, 0], detail: 0, seed: size + 1, pattern: Pattern.Leaves });
  return k.build(size * 0.06, rnd.int(0, 999));
}

export type HillKind = 'grass' | 'tea' | 'jungle' | 'rock' | 'sandstone' | 'snowpeak';

/**
 * Terrain hill: a faceted dome with a patterned surface. Tea hills get the
 * striped terrace rows of Ella; jungle hills get a tree canopy; rock and
 * sandstone suit the Great Wall, Machu Picchu and Petra.
 */
export function buildHill(rnd: Random, radius: number, height: number, kind: HillKind): THREE.BufferGeometry {
  const k = new ModelKit();
  const colour = { grass: '#8cc63f', tea: '#6fae3a', jungle: '#4f9a4a', rock: '#a6a3b8', sandstone: '#e0987a', snowpeak: '#a6a3b8' }[kind];
  const pattern = { grass: Pattern.Grass, tea: Pattern.Tea, jungle: Pattern.Leaves, rock: Pattern.Stone, sandstone: Pattern.Sandstone, snowpeak: Pattern.Stone }[kind];
  const g = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // Hash by position so seam vertices move together (no cracks).
    const n = 1 + (hash3(v.x, v.y, v.z + radius) - 0.5) * 0.25;
    const m = 0.85 + hash3(v.z, v.x, v.y + height) * 0.3;
    pos.setXYZ(i, v.x * radius * n, v.y * height * m, v.z * radius * n);
  }
  k.add(g, colour, { pattern });
  if (kind === 'jungle' || kind === 'tea') {
    const trees = kind === 'jungle' ? Math.round(radius / 3) : Math.round(radius / 10);
    for (let i = 0; i < trees; i++) {
      const a = rnd.range(0, Math.PI * 2);
      const rr = rnd.range(0.1, 0.85);
      const y = height * Math.cos((rr * Math.PI) / 2) * 0.95;
      k.blob(rnd.range(2, 4.5), rnd.pick(DARK_GREENS), { position: [Math.cos(a) * rr * radius, y + 1.5, Math.sin(a) * rr * radius], detail: 0, roughness: 0.3, seed: i, pattern: Pattern.Leaves });
    }
  }
  if (kind === 'snowpeak') k.blob(radius * 0.25, '#f6f3ec', { position: [0, height * 0.95, 0], scale: [1, 0.5, 1], detail: 1, seed: 3 });
  return k.build(radius * 0.01, rnd.int(0, 999));
}

/** Island with a tiny village for the sea (seen at distance). Origin at sea level. */
export function buildIsland(rnd: Random, radius: number, palms = false): THREE.BufferGeometry {
  const k = new ModelKit();
  k.cylinder(radius, radius * 1.15, 3, 12, '#ead7ae', { position: [0, 0.5, 0], pattern: Pattern.Grass });
  k.cylinder(radius * 0.85, radius * 0.95, 2, 12, '#9ad04a', { position: [0, 2.5, 0], pattern: Pattern.Grass });
  const walls = ['#f2c6b4', '#f4e1a6', '#bfd9e8', '#f6eedc', '#e9b8c8'];
  const count = Math.round(radius * 0.9);
  for (let i = 0; i < count; i++) {
    const a = rnd.range(0, Math.PI * 2);
    const rr = rnd.range(0, radius * 0.7);
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr;
    const w = rnd.range(2, 4);
    const h = rnd.range(2.5, 6);
    const y = 3.5;
    const rot: [number, number, number] = [0, rnd.range(0, Math.PI), 0];
    k.box(w, h, w * 0.9, rnd.pick(walls), { position: [x, y + h / 2, z], rotation: rot });
    k.gable(w + 0.4, 1.4, w * 0.9 + 0.4, '#d2643a', { position: [x, y + h, z], rotation: rot, pattern: Pattern.RoofTiles });
  }
  for (let i = 0; i < count / 2; i++) {
    const a = rnd.range(0, Math.PI * 2);
    if (palms) {
      k.cylinder(0.3, 0.4, 7, 5, '#8a6a48', { position: [Math.cos(a) * radius * 0.8, 7, Math.sin(a) * radius * 0.8] });
      k.blob(2.2, '#5aa84a', { position: [Math.cos(a) * radius * 0.8, 10.6, Math.sin(a) * radius * 0.8], scale: [1.4, 0.4, 1.4], detail: 0, seed: i });
    } else k.blob(rnd.range(1, 1.8), '#6fae3a', { position: [Math.cos(a) * radius * 0.75, 4.5, Math.sin(a) * radius * 0.75], detail: 0, seed: i, pattern: Pattern.Leaves });
  }
  return k.build(0.15, rnd.int(0, 999));
}

/** Cumulus cloud: rounded top, flat lavender-shaded bottom. */
export function buildCloud(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const n = rnd.int(6, 10);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = (t - 0.5) * rnd.range(30, 44);
    const r = rnd.range(6, 11) * (1 - Math.abs(t - 0.5) * 0.9);
    k.blob(r, '#fbfaf4', { position: [x + rnd.jitter(3), r * 0.35 + rnd.range(0, 3), rnd.jitter(5)], scale: [1.2, 0.85, 1], detail: 1, roughness: 0.1, seed: i, pattern: Pattern.Cloud });
  }
  const g = k.build(0.3, rnd.int(0, 999));
  // Flatten the underside.
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) < 0) pos.setY(i, pos.getY(i) * 0.12);
  g.computeVertexNormals();
  return g;
}

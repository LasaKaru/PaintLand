import * as THREE from 'three';
import { ModelKit } from './ModelKit';
import { Random } from '../core/Random';

const TRUNK = '#7a4a2a';

/** Tall dark-green cypress. Base at origin. */
export function buildCypress(rnd: Random): THREE.BufferGeometry {
  const h = rnd.range(5, 8);
  return new ModelKit()
    .cylinder(0.12, 0.16, 1, 5, TRUNK, { position: [0, 0.5, 0] })
    .blob(1, rnd.pick(['#3f8f45', '#4f9a4a', '#35803f']), { position: [0, h / 2 + 0.6, 0], scale: [0.9, h / 2, 0.9], detail: 1, roughness: 0.14, seed: h })
    .build(0.04, rnd.int(0, 999));
}

/** Round faceted tree, optionally with lemons or oranges. */
export function buildRoundTree(rnd: Random, fruit: string | null): THREE.BufferGeometry {
  const k = new ModelKit();
  const trunkH = rnd.range(1.8, 2.6);
  k.cylinder(0.14, 0.22, trunkH, 6, TRUNK, { position: [0, trunkH / 2, 0], rotation: [rnd.jitter(0.08), 0, rnd.jitter(0.08)] });
  const greens = ['#8cc63f', '#9ad04a', '#7fbb3a', '#a6d655'];
  const r = rnd.range(1.6, 2.3);
  k.blob(r, rnd.pick(greens), { position: [0, trunkH + r * 0.7, 0], detail: 1, roughness: 0.2, seed: r });
  for (let i = 0; i < rnd.int(1, 3); i++) {
    const a = rnd.range(0, Math.PI * 2);
    k.blob(r * rnd.range(0.5, 0.75), rnd.pick(greens), { position: [Math.cos(a) * r * 0.7, trunkH + r * rnd.range(0.5, 1.1), Math.sin(a) * r * 0.7], detail: 1, roughness: 0.2, seed: a });
  }
  if (fruit) {
    for (let i = 0; i < rnd.int(6, 12); i++) {
      const a = rnd.range(0, Math.PI * 2);
      const e = rnd.range(-0.4, 0.9);
      k.blob(0.17, fruit, { position: [Math.cos(a) * Math.cos(e) * r * 1.02, trunkH + r * 0.7 + Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r * 1.02], detail: 0, seed: i });
    }
  }
  return k.build(0.05, rnd.int(0, 999));
}

export function buildBush(rnd: Random, colour?: string): THREE.BufferGeometry {
  const k = new ModelKit();
  const c = colour ?? rnd.pick(['#8cc63f', '#a6d655', '#6fae3a']);
  const n = rnd.int(1, 3);
  for (let i = 0; i < n; i++) k.blob(rnd.range(0.6, 1.1), c, { position: [rnd.jitter(0.7), 0.5, rnd.jitter(0.5)], detail: 1, roughness: 0.22, seed: i + n });
  return k.build(0.04, rnd.int(0, 999));
}

export function buildPottedPlant(rnd: Random): THREE.BufferGeometry {
  return new ModelKit()
    .cylinder(0.4, 0.3, 0.7, 8, '#c8643a', { position: [0, 0.35, 0] })
    .blob(0.6, rnd.pick(['#8cc63f', '#6fae3a', '#e8559a']), { position: [0, 1.05, 0], detail: 1, seed: 3 })
    .build(0.03, rnd.int(0, 99));
}

/** Floating rock with a grass cap, pointed underneath. Origin at the top surface. */
export function buildFloatingRock(rnd: Random, size: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.blob(size, '#b4aed0', { position: [0, -size * 0.6, 0], scale: [1, 1.3, 1], detail: 1, roughness: 0.3, seed: size });
  k.cylinder(size * 0.95, size * 0.8, size * 0.35, 9, '#8cc63f', { position: [0, 0, 0] });
  if (rnd.chance(0.6)) k.blob(size * 0.35, '#6fae3a', { position: [size * 0.3, size * 0.35, 0], detail: 0, seed: size + 1 });
  return k.build(size * 0.06, rnd.int(0, 999));
}

/** Island with a tiny village for the sea (seen at distance). Origin at sea level. */
export function buildIsland(rnd: Random, radius: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.cylinder(radius, radius * 1.15, 3, 12, '#ead7ae', { position: [0, 0.5, 0] });
  k.cylinder(radius * 0.85, radius * 0.95, 2, 12, '#9ad04a', { position: [0, 2.5, 0] });
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
    k.gable(w + 0.4, 1.4, w * 0.9 + 0.4, '#d2643a', { position: [x, y + h, z], rotation: rot });
  }
  for (let i = 0; i < count / 2; i++) {
    const a = rnd.range(0, Math.PI * 2);
    k.blob(rnd.range(1, 1.8), '#6fae3a', { position: [Math.cos(a) * radius * 0.75, 4.5, Math.sin(a) * radius * 0.75], detail: 0, seed: i });
  }
  return k.build(0.15, rnd.int(0, 999));
}

/** Soft 3D cloud made of blobs (lit side paper-white, shade side lavender via lighting). */
export function buildCloud(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const n = rnd.int(4, 8);
  for (let i = 0; i < n; i++) {
    k.blob(rnd.range(6, 12), '#fbfaf4', { position: [rnd.range(-18, 18), rnd.range(0, 5), rnd.range(-6, 6)], scale: [1.3, 0.8, 1], detail: 1, roughness: 0.12, seed: i });
  }
  return k.build(0.3, rnd.int(0, 999));
}

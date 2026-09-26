import * as THREE from 'three';
import { ModelKit, Pattern } from '../models/ModelKit';
import { PaintMaterial } from '../render/PaintMaterial';
import { buildRoundTree } from '../models/Nature';
import { Random } from '../core/Random';
import type { FreeWorld } from '../gameplay/FreeRoam';
import type { Festival } from './Calendar';

const INK = '#2b2622';
const BRASS = '#d4a943';

/** Vesak kuudu: an eight-pointed paper lantern with tails, on a bamboo pole. */
function vesakLantern(colour: string): THREE.BufferGeometry {
  const k = new ModelKit();
  k.cylinder(0.06, 0.08, 5, 5, '#b8a36a', { position: [0, 2.5, 0] });
  k.add(new THREE.OctahedronGeometry(0.9, 0), colour, { position: [0, 4.4, 0], nightGlow: 1 });
  k.add(new THREE.OctahedronGeometry(0.9, 0), '#f6f0e4', { position: [0, 4.4, 0], rotation: [0, Math.PI / 4, Math.PI / 4], scale: 0.7, nightGlow: 1 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    k.box(0.12, 1.4, 0.02, i % 2 ? '#f4d23b' : colour, { position: [Math.cos(a) * 0.4, 3.1, Math.sin(a) * 0.4], nightGlow: 1 });
  }
  return k.build(0.01, 1);
}

/** A Vesak thorana (pandal): a tall lit frame of coloured panels. */
function thorana(): THREE.BufferGeometry {
  const k = new ModelKit();
  for (const s of [-1, 1]) k.box(0.5, 10, 0.5, INK, { position: [s * 5.5, 5, 0] });
  const colours = ['#d8463a', '#f4d23b', '#3e6fa8', '#5dbb3f', '#e8559a', '#f08a2e'];
  for (let ring = 0; ring < 5; ring++) {
    const r = 4.2 - ring * 0.8;
    k.add(new THREE.TorusGeometry(r, 0.14, 4, 24), colours[ring % colours.length], { position: [0, 5.5, 0], nightGlow: 1 });
  }
  k.blob(0.8, '#fff3c4', { position: [0, 5.5, 0], detail: 1, nightGlow: 1 });
  k.box(11.5, 0.6, 0.6, '#b0352a', { position: [0, 10, 0], nightGlow: 1 });
  return k.build(0.01, 2);
}

/** Avurudu: a swing (onchilla) on an A-frame, with a flower-trimmed seat. */
function swing(): THREE.BufferGeometry {
  const k = new ModelKit();
  for (const s of [-1, 1]) for (const f of [-1, 1]) k.box(0.18, 5.4, 0.18, '#7a5a3a', { position: [s * 2, 2.5, f * 0.8], rotation: [f * 0.28, 0, 0], pattern: Pattern.Planks });
  k.box(4.4, 0.2, 0.2, '#7a5a3a', { position: [0, 5.1, 0] });
  for (const s of [-1, 1]) k.box(0.04, 3.8, 0.04, '#c8955a', { position: [s * 0.7, 3.2, 0] });
  k.box(1.8, 0.12, 0.5, '#b0352a', { position: [0, 1.3, 0] });
  for (let i = 0; i < 6; i++) k.blob(0.12, i % 2 ? '#f4d23b' : '#d8463a', { position: [-0.75 + i * 0.3, 1.42, -0.22], detail: 0 });
  return k.build(0.02, 3);
}

/** Avurudu: the tall brass oil lamp (pahana) that is lit at the auspicious time. */
function oilLamp(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.cylinder(0.6, 0.8, 0.3, 10, BRASS, { position: [0, 0.15, 0] });
  k.cylinder(0.1, 0.14, 2.2, 8, BRASS, { position: [0, 1.4, 0] });
  k.cylinder(0.7, 0.3, 0.3, 10, BRASS, { position: [0, 2.6, 0] });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    k.cylinder(0.02, 0.06, 0.25, 5, '#ffb347', { position: [Math.cos(a) * 0.5, 2.9, Math.sin(a) * 0.5], nightGlow: 1 });
  }
  k.blob(0.18, BRASS, { position: [0, 3.1, 0], detail: 0 });
  return k.build(0.01, 4);
}

/** Avurudu: a clay pot hung between posts for the blindfolded pot-breaking game (kana mutti). */
function potGame(): THREE.BufferGeometry {
  const k = new ModelKit();
  for (const s of [-1, 1]) k.box(0.2, 4, 0.2, '#7a5a3a', { position: [s * 2.4, 2, 0] });
  k.box(5, 0.08, 0.08, INK, { position: [0, 3.9, 0] });
  k.box(0.03, 0.9, 0.03, INK, { position: [0, 3.45, 0] });
  k.blob(0.45, '#b85a32', { position: [0, 2.8, 0], scale: [1, 0.9, 1], detail: 1 });
  k.cylinder(0.2, 0.25, 0.15, 8, '#9a4a2a', { position: [0, 3.25, 0] });
  return k.build(0.01, 5);
}

/** Diwali: a row of clay diyas with little flames. */
function diyas(): THREE.BufferGeometry {
  const k = new ModelKit();
  for (let i = 0; i < 7; i++) {
    const x = -3 + i;
    k.cylinder(0.18, 0.1, 0.12, 8, '#b85a32', { position: [x, 0.08, 0] });
    k.cylinder(0.02, 0.05, 0.18, 5, '#ffb347', { position: [x, 0.25, 0], nightGlow: 1 });
  }
  return k.build(0, 6);
}

/** Diwali: a rangoli of coloured rings and petals on the ground. */
function rangoli(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const colours = ['#e8559a', '#f4d23b', '#3e6fa8', '#5dbb3f', '#f08a2e', '#9a5bd6'];
  for (let ring = 0; ring < 4; ring++) k.add(new THREE.RingGeometry(0.5 + ring * 0.55, 0.95 + ring * 0.55, 24).rotateX(-Math.PI / 2), colours[(ring + rnd.int(0, 5)) % colours.length], { position: [0, 0.05 + ring * 0.002, 0] });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.blob(0.35, colours[i % colours.length], { position: [Math.cos(a) * 2.8, 0.05, Math.sin(a) * 2.8], scale: [1, 0.05, 0.6], detail: 0 });
  }
  return k.build(0, rnd.int(0, 99));
}

/** Diwali: a string of little lamps between two poles. */
function lampString(): THREE.BufferGeometry {
  const k = new ModelKit();
  for (const s of [-1, 1]) k.box(0.12, 4, 0.12, INK, { position: [s * 4, 2, 0] });
  for (let i = 0; i <= 12; i++) {
    const x = -4 + (i * 8) / 12;
    const y = 3.8 - Math.sin((i / 12) * Math.PI) * 0.8;
    k.blob(0.12, ['#ffb347', '#f4d23b', '#e8559a'][i % 3], { position: [x, y, 0], detail: 0, nightGlow: 1 });
  }
  return k.build(0, 7);
}

/** Open spots in a ring around `centre` (nothing solid there). */
function spots(world: FreeWorld, centre: { x: number; z: number }, n: number, rnd: Random, rMin = 10, rMax = 34, clear = 2.5): { x: number; z: number; yaw: number }[] {
  const out: { x: number; z: number; yaw: number }[] = [];
  for (let tries = 0; tries < 300 && out.length < n; tries++) {
    const a = rnd.range(0, Math.PI * 2);
    const r = rnd.range(rMin, rMax);
    const x = centre.x + Math.cos(a) * r;
    const z = centre.z + Math.sin(a) * r;
    if (world.resolve({ x, z }, clear) !== null) continue;
    if (out.some((o) => Math.hypot(o.x - x, o.z - z) < clear * 2.2)) continue;
    out.push({ x, z, yaw: Math.atan2(centre.x - x, centre.z - z) });
  }
  return out;
}

/**
 * Festival decorations for a free-roam area, placed on open ground around
 * where you arrive and around its named places. Purely decorative (nothing
 * solid), so they never block a road.
 */
export function buildFestivalDecor(festival: Festival, area: { world: FreeWorld; spawn: { x: number; z: number }; places: { x: number; z: number }[] }): THREE.Group {
  const group = new THREE.Group();
  group.name = `festival-${festival}`;
  const mat = new PaintMaterial({ vertexColors: true, flat: true });
  const rnd = new Random(festival.length * 97 + Math.round(area.spawn.x));
  const put = (g: THREE.BufferGeometry, p: { x: number; z: number; yaw: number }, scale = 1): void => {
    const m = new THREE.Mesh(g, mat);
    m.position.set(p.x, 0, p.z);
    m.rotation.y = p.yaw;
    m.scale.setScalar(scale);
    group.add(m);
  };
  const centres = [area.spawn, ...area.places.slice(0, 6)];
  if (festival === 'vesak') {
    const colours = ['#d8463a', '#f4d23b', '#3e6fa8', '#5dbb3f', '#e8559a', '#f08a2e'];
    const lanterns = colours.map(vesakLantern);
    const [gate] = spots(area.world, area.spawn, 1, rnd, 16, 30, 6);
    if (gate) put(thorana(), gate);
    for (const c of centres) for (const p of spots(area.world, c, 6, rnd, 6, 22, 1.2)) put(rnd.pick(lanterns), p);
  } else if (festival === 'avurudu') {
    const tree = buildRoundTree(rnd, '#d8463a');
    const [sw] = spots(area.world, area.spawn, 1, rnd, 12, 30, 3.5);
    if (sw) put(swing(), sw);
    const [pot] = spots(area.world, area.spawn, 1, rnd, 12, 30, 3.5);
    if (pot) put(potGame(), pot);
    for (const c of centres) {
      for (const p of spots(area.world, c, 2, rnd, 6, 20, 1.2)) put(oilLamp(), p);
      for (const p of spots(area.world, c, 2, rnd, 8, 26, 2.5)) put(tree, p, 0.9);
    }
  } else {
    const row = diyas();
    const lights = lampString();
    for (const c of centres) {
      for (const p of spots(area.world, c, 3, rnd, 5, 20, 3.2)) put(rangoli(rnd), p);
      for (const p of spots(area.world, c, 4, rnd, 5, 22, 3.5)) put(row, p);
      for (const p of spots(area.world, c, 2, rnd, 8, 24, 4.5)) put(lights, p);
    }
  }
  return group;
}

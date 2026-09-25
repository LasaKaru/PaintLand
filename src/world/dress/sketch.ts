import * as THREE from 'three';
import type { Dresser, Decorator } from '../Decorator';
import { createFrame } from '../../road/RoadPath';
import { walkableHalfWidth, KERB_WIDTH, PAVEMENT_WIDTH, WALL_WIDTH } from '../../road/RoadMesh';
import { Random } from '../../core/Random';
import { ModelKit, Pattern } from '../../models/ModelKit';
import { buildHouse, buildKiosk, buildStall, buildTower } from '../../models/Buildings';
import { buildBush, buildCloud, buildCypress, buildFloatingRock, buildFlowerBush, buildIsland, buildPottedPlant, buildRoundTree } from '../../models/Nature';
import { buildBench, buildBuntingGate, buildCrayon, buildFlowerArch, buildLamp, buildLighthouse, buildPaperBoat } from '../../models/Props';
import { buildBicycle, buildBin, buildBuntingLine, buildCafeTable, buildCat, buildFountain, buildPlanter, buildScooter, buildSignBoard } from '../../models/StreetProps';

/** Street furniture kit shared by town-like districts. */
export function streetKit(rnd: Random) {
  return {
    lamp: buildLamp(rnd),
    bench: buildBench(),
    stall: buildStall(rnd),
    pot: buildPottedPlant(rnd),
    bush: buildBush(rnd),
    flowers: buildFlowerBush(rnd),
    planter: buildPlanter(rnd),
    bin: buildBin(),
    bikes: [buildBicycle('#d8463a'), buildBicycle('#3e6fa8'), buildBicycle('#f4d23b')],
    scooters: [buildScooter('#8fd0c8'), buildScooter('#f2c6b4')],
    sign: buildSignBoard(rnd),
    cafe: buildCafeTable(rnd),
    cats: [buildCat('#8a8a9a'), buildCat('#2b2622'), buildCat('#e0904a')],
    lemon: [buildRoundTree(rnd, '#f4d23b', true), buildRoundTree(rnd, '#f4d23b'), buildRoundTree(rnd, '#f08a2e')],
    round: [buildRoundTree(rnd, null), buildRoundTree(rnd, null, true)],
    cypress: [buildCypress(rnd), buildCypress(rnd)],
  };
}

/** Rows of houses on both sides with a lively pavement in between (docs/04 §5 density rule). */
export function dressStreet(d: Decorator, s0: number, s1: number, rnd: Random, walls: string[], houseStyles?: Parameters<typeof buildHouse>[2][]): void {
  const houses = Array.from({ length: 16 }, (_, i) => buildHouse(rnd.fork(i), walls[i % walls.length], houseStyles ? houseStyles[i % houseStyles.length] : undefined));
  const kit = streetKit(rnd);
  const frame = createFrame();

  for (const side of [-1, 1]) {
    let s = s0 + 6;
    while (s < s1 - 20) {
      const house = rnd.pick(houses);
      const f = d.sample(s, frame);
      if (f.plaza < 4) {
        // Plaza still widening (or already narrowing): skip ahead instead of giving up.
        s += 4;
        continue;
      }
      const setback = PAVEMENT_WIDTH + 1.4 + rnd.range(0, 1.2);
      const x = side * (f.width / 2 + KERB_WIDTH + setback + house.depth / 2);
      const m = d.roadMatrix(s + house.width / 2, x, 0.18, side > 0 ? -Math.PI / 2 : Math.PI / 2);
      d.place(house.geometry, m);
      d.block(m, new THREE.Vector3(0, house.height / 2, 0), Math.max(house.width, house.height) * 0.55);
      // Garden strip or planter in front of some houses.
      if (rnd.chance(0.35)) d.sideProp(kit.planter, s + house.width / 2, side, PAVEMENT_WIDTH + 0.6);
      s += house.width + rnd.range(0.2, 1.6);
    }
  }
  // Street furniture on the pavements.
  for (let s = s0 + 8; s < s1 - 20; s += rnd.range(7, 11)) {
    const side = rnd.chance(0.5) ? -1 : 1;
    d.sideProp(kit.lamp, s, side, 0.6);
    const other = -side;
    const r = rnd.next();
    if (r < 0.28) d.sideProp(rnd.pick(kit.lemon), s + 3, other, 1.4, 0.18, 2.2, 3.5);
    else if (r < 0.4) d.sideProp(rnd.pick(kit.cypress), s + 3, other, 1.3, 0.18, 1.2, 4);
    else if (r < 0.5) d.sideProp(kit.bench, s + 4, other, 1.0);
    else if (r < 0.58) d.sideProp(kit.stall, s + 5, other, 1.7, 0.18, 1.8, 1.4);
    else if (r < 0.66) d.sideProp(kit.cafe, s + 4, other, 1.4);
    else if (r < 0.74) d.sideProp(rnd.pick(kit.bikes), s + 2, other, 0.5);
    else if (r < 0.8) d.sideProp(rnd.pick(kit.scooters), s + 2, other, 0.6);
    else if (r < 0.86) d.sideProp(kit.flowers, s + 2, other, 1.8);
    else if (r < 0.92) d.sideProp(kit.sign, s + 2, other, 0.4);
    else d.sideProp(rnd.pick(kit.round), s + 3, other, 1.4, 0.18, 2.2, 3.5);
    if (rnd.chance(0.3)) d.sideProp(kit.bin, s + 1.2, side, 0.4);
    if (rnd.chance(0.2)) d.sideProp(rnd.pick(kit.cats), s + 5, side, rnd.range(0.4, 2.2));
    if (rnd.chance(0.25)) d.sideProp(kit.pot, s + 6, other, 2.2);
  }
  // Bunting strung across the street every so often.
  for (let s = s0 + 40; s < s1 - 30; s += rnd.range(45, 70)) {
    const f = d.sample(s, frame);
    const half = f.width / 2 + KERB_WIDTH + PAVEMENT_WIDTH;
    d.place(buildBuntingLine(rnd, half, 6.2, 0.9), d.roadMatrix(s, 0, 0.18, 0), false);
  }
}

const dressTown: Dresser = (d, span, rnd, def) => {
  dressStreet(d, span.start, span.end, rnd, def.walls);
  // A fountain in the first plaza.
  const f = d.sample(span.start + 12);
  d.place(buildFountain(), d.roadMatrix(span.start + 12, -(f.width / 2 + KERB_WIDTH + PAVEMENT_WIDTH + 5), 0.18, 0));
  // Pier edge: cypress beyond the houses.
  const cypress = [buildCypress(rnd), buildCypress(rnd)];
  for (let s = span.start + 20; s < span.end - 40; s += rnd.range(20, 40)) {
    const fr = d.sample(s);
    const x = (rnd.chance(0.5) ? -1 : 1) * (walkableHalfWidth(fr.width, fr.plaza) - 1.5);
    d.place(rnd.pick(cypress), d.roadMatrix(s, x, 0.18, 0));
  }
  d.landmark('Biscuit Row fountain', span.district, span.start + 12);
};

const dressTower: Dresser = (d, span, rnd, def) => {
  const r = d.findVerticalRange(span.start, span.end);
  const mid = (r.start + r.end) / 2;
  const f = d.sample(mid);
  const next = d.path.spans.find((sp) => sp.district === d.path.districtAt(span.end + 1));
  const ceilingY = next ? d.maxY(next.start, next.end) : d.maxY(span.start, span.end);
  const height = ceilingY + 11.5;
  const width = 70;
  const depth = 46;
  const outward = f.up.clone().setY(0).normalize();
  const centre = new THREE.Vector3(f.position.x, 0, f.position.z).addScaledVector(outward, -(depth / 2 + 2.2));
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), outward);
  d.place(buildTower(rnd, def.walls[0], width, height, depth), new THREE.Matrix4().compose(centre, q, new THREE.Vector3(1, 1, 1)));
  for (let i = 0; i < 4; i++) {
    const w = rnd.range(18, 30);
    const h = rnd.range(60, 130);
    const g = buildTower(rnd.fork(i), rnd.pick(['#e3b34a', '#d8a05a', '#bfc4ea', '#f2c6b4']), w, h, w * 0.8);
    const side = i % 2 ? 1 : -1;
    const pos = centre.clone().addScaledVector(f.right, side * (width / 2 + w / 2 + 6 + i * 6)).addScaledVector(outward, -rnd.range(0, 30));
    d.place(g, new THREE.Matrix4().compose(pos, q, new THREE.Vector3(1, 1, 1)));
  }
  const kit = streetKit(rnd);
  for (let s = span.start + 10; s < span.end - 5; s += rnd.range(9, 14)) {
    const side = rnd.chance(0.5) ? -1 : 1;
    d.sideProp(rnd.chance(0.5) ? kit.lamp : kit.pot, s, side, 0.7);
    if (rnd.chance(0.6)) d.sideProp(rnd.pick([kit.bush, kit.flowers, kit.planter]), s + 5, -side, 1.2);
  }
  d.landmark('Mustard Tower', span.district, mid, centre.clone().setY(height * 0.6));
};

const dressCeiling: Dresser = (d, span, rnd, def) => {
  const range = d.findInvertedRange(span.start, span.end);
  const back = 48;
  const len = range.end - range.start + back + 20;
  const mid = (range.start - back + range.end + 20) / 2;
  const f = d.sample(mid);
  const width = 90;
  const thick = 10;
  const slab = new ModelKit().box(width, thick, len, '#bfc4ea', { position: [0, -thick / 2 - 1.5, 0], pattern: Pattern.Brick });
  for (let z = -len / 2 + 4; z < len / 2 - 4; z += 6) {
    for (let x = -width / 2 + 5; x < width / 2 - 5; x += 7) {
      if (Math.abs(x) < 16 || rnd.chance(0.25)) continue;
      slab.box(2.2, 0.25, 2.8, rnd.chance(0.3) ? '#2f8f86' : '#3f4f78', { position: [x, -1.45, z], nightGlow: rnd.chance(0.3) ? 1 : 0 });
      slab.box(2.6, 0.2, 3.2, '#f4efe2', { position: [x, -1.5, z] });
    }
  }
  const basis = new THREE.Matrix4().makeBasis(f.right, f.up, f.tangent.clone().negate());
  d.place(slab.build(0.1, 17), new THREE.Matrix4().compose(f.position, new THREE.Quaternion().setFromRotationMatrix(basis), new THREE.Vector3(1, 1, 1)));

  const houses = Array.from({ length: 8 }, (_, i) => buildHouse(rnd.fork(i + 40), def.walls[i % def.walls.length]));
  const kit = streetKit(rnd);
  for (const side of [-1, 1]) {
    let s = range.start + 4;
    while (s < range.end - 8) {
      const house = rnd.pick(houses);
      const fr = d.sample(s);
      const x = side * (fr.width / 2 + KERB_WIDTH + PAVEMENT_WIDTH + WALL_WIDTH + 1 + house.depth / 2);
      d.place(house.geometry, d.roadMatrix(s + house.width / 2, x, -1.4, side > 0 ? -Math.PI / 2 : Math.PI / 2));
      s += house.width + rnd.range(2, 8);
    }
  }
  for (let s = range.start + 6; s < range.end; s += rnd.range(10, 15)) {
    d.sideProp(rnd.pick([...kit.lemon, ...kit.round]), s, rnd.chance(0.5) ? -1 : 1, 1.2, 0.18, 2.2, 3.5);
    if (rnd.chance(0.5)) d.sideProp(kit.lamp, s + 5, rnd.chance(0.5) ? -1 : 1, 0.5);
  }
  // Ferris wheel on the ceiling.
  const wheel = new ModelKit();
  const R = 18;
  wheel.add(new THREE.TorusGeometry(R, 0.4, 5, 32), '#f6f0e4');
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    wheel.box(0.25, R, 0.25, '#d8643a', { position: [(Math.cos(a) * R) / 2, (Math.sin(a) * R) / 2, 0], rotation: [0, 0, a - Math.PI / 2] });
    wheel.box(2, 1.6, 1.6, ['#d8463a', '#f4d23b', '#3e6fa8', '#4f9a5a'][i % 4], { position: [Math.cos(a) * R, Math.sin(a) * R - 1, 0], nightGlow: i % 2 });
  }
  d.addSpinner(wheel.build(0.05, 5), d.roadMatrix(mid + 30, 34, R + 5, 0), 'z', 0.05);
};

const dressArches: Dresser = (d, span, rnd) => {
  const arches = [0, 1, 2].map((i) => buildFlowerArch(rnd.fork(i), 9.5, 7.5));
  const bushes = [buildBush(rnd, '#e8559a'), buildBush(rnd, '#f08a2e'), buildFlowerBush(rnd)];
  for (let s = span.start + 20; s < span.end - 10; s += 13) {
    const m = d.roadMatrix(s, 0, 0.18, 0);
    d.place(rnd.pick(arches), m);
    d.block(m, new THREE.Vector3(-9.5, 5, 0), 2.2);
    d.block(m, new THREE.Vector3(9.5, 5, 0), 2.2);
    d.block(m, new THREE.Vector3(0, 7.5, 0), 2.4);
  }
  for (let s = span.start + 10; s < span.end - 10; s += rnd.range(5, 9)) d.sideProp(rnd.pick(bushes), s, rnd.chance(0.5) ? -1 : 1, 0.9);
};

const dressChute: Dresser = (d, span, rnd) => {
  const kit = new ModelKit();
  const f = createFrame();
  const step = 4;
  for (let s = span.start; s < span.end; s += step) {
    d.sample(s + step / 2, f);
    const basis = new THREE.Matrix4().makeBasis(f.right, f.up, f.tangent.clone().negate());
    const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromRotationMatrix(basis));
    for (const side of [-1, 1]) {
      const x = side * (walkableHalfWidth(f.width, 0) + 2.2);
      const p = f.position.clone().addScaledVector(f.right, x).addScaledVector(f.up, 1.2);
      kit.box(3.2, 2.2, step + 0.05, s % 8 < 4 ? '#5fcfc8' : '#8fe0d8', { position: [p.x, p.y, p.z], rotation: [e.x, e.y, e.z] });
      const lip = f.position.clone().addScaledVector(f.right, x + side * 1.6).addScaledVector(f.up, 2.3);
      kit.box(0.4, 0.4, step + 0.05, '#f4fbf6', { position: [lip.x, lip.y, lip.z], rotation: [e.x, e.y, e.z] });
    }
  }
  d.place(kit.build(0.02, 3), new THREE.Matrix4());
  const lamp = buildLamp(rnd);
  for (let s = span.start + 8; s < span.end; s += 24) d.sideProp(lamp, s, rnd.chance(0.5) ? -1 : 1, 0.6);
};

const dressBridge: Dresser = (d, span, rnd) => {
  const lamp = buildLamp(rnd);
  for (let s = span.start + 6; s < span.end - 4; s += 22) {
    d.sideProp(lamp, s, -1, 0.5);
    d.sideProp(lamp, s + 11, 1, 0.5);
  }
  const centre = d.centroid(span.start + 150, span.end - 60).setY(0);
  d.place(buildLighthouse(), new THREE.Matrix4().makeTranslation(centre.x, 0, centre.z));
  d.landmark('Citrus Coil lighthouse', span.district, span.start + 200, centre.clone().setY(18));
};

const dressLoop: Dresser = (d, span, rnd) => {
  const kiosks = [0, 1, 2].map((i) => buildKiosk(rnd.fork(i)));
  for (let s = span.start + 6; s < span.end - 6; s += rnd.range(14, 22)) d.sideProp(rnd.pick(kiosks), s, rnd.chance(0.5) ? -1 : 1, 1.8, 0.18, 2.2, 2);
  const mid = d.sample((span.start + span.end) / 2);
  const books = ['#d8463a', '#3e6fa8', '#f4d23b', '#4f9a5a', '#e8559a', '#9a5bd6', '#2fb7b0'];
  for (let i = 0; i < 14; i++) {
    const g = new ModelKit().box(rnd.range(2, 3.5), rnd.range(14, 26), rnd.range(6, 9), rnd.pick(books)).box(rnd.range(2.1, 3.6), 1.2, 0.2, '#f4d23b', { position: [0, 4, 4.6] }).build(0.1, i);
    const pos = mid.position.clone().add(new THREE.Vector3(rnd.range(60, 110) * (i % 2 ? 1 : -1), rnd.range(-20, 50), rnd.range(-60, 60)));
    d.addFloater(g, pos, rnd.range(-0.3, 0.3), 0.3);
  }
  d.addFloater(buildCrayon('#f4d23b', 40), mid.position.clone().add(new THREE.Vector3(-70, 60, 30)), 0.4, 0.1);
};

const dressGate: Dresser = (d, span, rnd) => {
  const gate = buildBuntingGate(rnd, 9.8);
  for (let s = span.start + 30; s < span.end - 10; s += 45) d.place(gate, d.roadMatrix(s, 0, 0.18, 0));
  const lamp = buildLamp(rnd);
  for (let s = span.start + 10; s < span.end; s += 18) d.sideProp(lamp, s, s % 36 < 18 ? -1 : 1, 0.5);
};

export const SKETCH_DRESSERS = {
  town: dressTown,
  tower: dressTower,
  ceiling: dressCeiling,
  arches: dressArches,
  chute: dressChute,
  bridge: dressBridge,
  loop: dressLoop,
  gate: dressGate,
};

/** Islands, floating rocks, crayons, clouds, paper boats and the pier. */
export function sketchBackground(d: Decorator, rnd: Random): void {
  commonSky(d, rnd);
  const islands = [0, 1, 2, 3].map((i) => buildIsland(rnd.fork(i), rnd.range(18, 34)));
  for (let i = 0; i < 16; i++) {
    const p = d.scatter(rnd, 380, 1100, 0, 90);
    if (p) d.place(rnd.pick(islands), d.worldMatrix(p, rnd.range(0, 6)), false);
  }
  const rocks = [0, 1, 2].map((i) => buildFloatingRock(rnd.fork(i + 10), rnd.range(5, 12)));
  for (let i = 0; i < 26; i++) {
    const p = d.scatter(rnd, 120, 520, [60, 260], 45);
    if (p) d.addFloater(rnd.pick(rocks), p, rnd.range(-0.1, 0.1), 0.05);
  }
  const crayonColours = ['#d8463a', '#3e6fa8', '#4f9a5a', '#e8559a', '#f08a2e', '#9a5bd6'];
  for (let i = 0; i < 10; i++) {
    const p = d.scatter(rnd, 200, 600, [140, 320], 50);
    if (p) d.addFloater(buildCrayon(rnd.pick(crayonColours), rnd.range(16, 34)), p, rnd.range(-0.2, 0.2), 0);
  }
  const boat = buildPaperBoat();
  const centre = d.path.bounds().getCenter(new THREE.Vector3());
  for (let i = 0; i < 30; i++) {
    const p = new THREE.Vector3(centre.x + rnd.range(-700, 700), 0.2, centre.z + rnd.range(-700, 700));
    d.place(boat, d.worldMatrix(p, rnd.range(0, 6), 2), false);
  }
  pierUnder(d, 0);
}

/** 3D cumulus clouds ringing the chapter. */
export function commonSky(d: Decorator, rnd: Random, count = 30): void {
  const clouds = [0, 1, 2, 3, 4].map((i) => buildCloud(rnd.fork(i + 30)));
  for (let i = 0; i < count; i++) {
    const p = d.scatter(rnd, 250, 1400, [110, 420], 60);
    if (!p) continue;
    const s = rnd.range(1, 2.6);
    d.place(rnd.pick(clouds), d.worldMatrix(p, rnd.range(0, 6), s), false);
  }
}

/** Stone piers under a district so a town street stands on something. */
export function pierUnder(d: Decorator, district: number, colour = '#b4aed0'): void {
  const span = d.path.spanOf(district);
  if (!span) return;
  const pier = new ModelKit();
  const f = createFrame();
  for (let s = span.start; s < span.end - 20; s += 18) {
    d.sample(s, f);
    for (const side of [-1, 1]) {
      const x = side * (walkableHalfWidth(f.width, f.plaza) - 2);
      const p = f.position.clone().addScaledVector(f.right, x);
      pier.cylinder(1.2, 1.5, p.y, 8, colour, { position: [p.x, p.y / 2 - 1, p.z], pattern: Pattern.Stone });
    }
  }
  d.place(pier.build(0.1, 2), new THREE.Matrix4(), false);
}

/** A broad painted landmass under the whole chapter (so wonders stand on ground, not sea). */
export function landUnder(d: Decorator, colour: string, pattern: number, margin = 160, beach = '#ead7ae'): void {
  const box = d.path.bounds();
  const centre = box.getCenter(new THREE.Vector3()).setY(0);
  const size = box.getSize(new THREE.Vector3());
  const r = Math.max(size.x, size.z) / 2 + margin;
  const land = new ModelKit()
    .cylinder(1.04, 1.06, 1, 40, beach, { position: [0, 0.2, 0] })
    .cylinder(1, 1, 1, 40, colour, { position: [0, 0.45, 0], pattern })
    .build(0, 1);
  d.place(land, d.worldMatrix(centre, 0, new THREE.Vector3(r, 1, r)), false);
}

/** Land along part of the route: overlapping painted discs make a natural coastline. */
export function landAlong(d: Decorator, s0: number, s1: number, radius: number, colour: string, beach = '#ead7ae'): void {
  const sand = new ModelKit().cylinder(1.08, 1.1, 1, 24, beach, { position: [0, 0.15, 0] }).build(0, 1);
  const grass = new ModelKit().cylinder(1, 1, 1, 24, colour, { position: [0, 0.4, 0], pattern: Pattern.Grass }).build(0, 2);
  const f = createFrame();
  for (let s = s0; s <= s1; s += radius * 0.7) {
    d.sample(s, f);
    const p = new THREE.Vector3(f.position.x, 0, f.position.z);
    const r = radius * (0.85 + ((s * 0.013) % 0.3));
    d.place(sand, d.worldMatrix(p, 0, new THREE.Vector3(r, 1, r)), false);
    d.place(grass, d.worldMatrix(p, 0, new THREE.Vector3(r, 1, r)), false);
  }
}

import * as THREE from 'three';
import type { Decorator, Dresser } from '../Decorator';
import { walkableHalfWidth } from '../../road/RoadMesh';
import { createFrame } from '../../road/RoadPath';
import type { Random } from '../../core/Random';
import { ModelKit, Pattern } from '../../models/ModelKit';
import { buildHouse } from '../../models/Buildings';
import { buildHill, buildPalm, buildRoundTree, buildCypress, buildFlowerBush } from '../../models/Nature';
import { buildLamp, buildBench } from '../../models/Props';
import { buildBicycle, buildCafeTable } from '../../models/StreetProps';
import { buildSkyscraper, buildBillboard, buildCrossing } from '../../models/CityProps';
import { buildPeak, buildRedeemer, buildCamel } from '../../models/LandmarksWorld';
import { buildCherryTree } from '../../models/LandmarksAsia';
import { buildElephant, buildLotusTower, buildNineArchBridge, buildTrain, buildTukTukProp, buildStupa, buildTeaFactory } from '../../models/LandmarksSriLanka';
import { buildTeaHut } from '../../models/LandmarksPostcards';
import {
  buildArcDeTriomphe, buildBeachUmbrella, buildBigBen, buildBurjAlArab, buildBurjKhalifa, buildCableCar, buildCableSag, buildCampanile, buildCanalHouse,
  buildDoubleDecker, buildDutchMillSails, buildDutchMillTower, buildEiffelTower, buildEmpireState, buildFerry, buildGalataTower, buildGondola,
  buildGoldenGateTower, buildHarbourBridge, buildHaussmann, buildLondonEyeFrame, buildLondonEyeWheel, buildMarinaBaySands, buildMerlion, buildMosaicBench,
  buildMosque, buildNeonSign, buildNeonWall, buildOperaHouse, buildPaintedLady, buildPalazzo, buildPhoneBox, buildSagradaFamilia, buildStatueOfLiberty,
  buildSugarloaf, buildSupertree, buildTaxi, buildTokyoTower, buildTowerBridge, buildTulipRow, buildVendingMachine, buildWavePavement,
} from '../../models/LandmarksCities';
import {
  buildClockTower, buildGalleLighthouse, buildIndependenceHall, buildLeopardOnRock, buildPeacock, buildPeraheraElephant, buildRampart, buildRedMosque,
  buildSafariJeep, buildScrubTree, buildStiltFisher, buildSwanBoat, buildTudorPostOffice,
} from '../../models/LandmarksIsland';
import { commonSky, landAlong } from './sketch';

// ————— helpers —————

export type Span = { start: number; end: number; district: number };

/** A point `dist` metres to one side of the road at fraction `t` of the span, on the ground. */
export function beside(d: Decorator, span: Span, t: number, side: number, dist: number, y = 0): { p: THREE.Vector3; s: number; face: number; frame: ReturnType<Decorator['sample']> } {
  const s = span.start + (span.end - span.start) * t;
  const f = d.sample(s);
  const right = f.right.clone().setY(0).normalize();
  const p = f.position.clone().addScaledVector(right, side * dist).setY(y);
  // Yaw that turns an object's +Z front toward the road.
  const face = Math.atan2(-right.x * side, -right.z * side);
  return { p, s, face, frame: f };
}

/** Place a big landmark beside the road (if there is room), block it and name it. */
export function landmarkBeside(d: Decorator, span: Span, t: number, side: number, dist: number, geo: THREE.BufferGeometry, name: string, focusY: number, radius: number, scale = 1): boolean {
  const { p, s, face } = beside(d, span, t, side, dist);
  if (d.nearRoad(p, radius * 0.7)) return false;
  d.place(geo, d.worldMatrix(p, face, scale));
  d.blockWorld(p.clone().setY(focusY * 0.3), radius);
  d.landmark(name, span.district, s, p.clone().setY(focusY));
  return true;
}

/** Rows of buildings along both sides of the road. */
export function rows(d: Decorator, span: Span, rnd: Random, pick: () => { geometry: THREE.BufferGeometry; width: number; depth: number; height: number }, sides: number[] = [-1, 1], gap = 1, setback = 2): void {
  for (const side of sides) {
    let s = span.start + 8;
    while (s < span.end - 10) {
      const b = pick();
      const f = d.sample(s);
      if (f.up.y < 0.75) {
        s += 6;
        continue;
      }
      const x = side * (walkableHalfWidth(f.width, f.plaza) + setback + b.depth / 2);
      const m = d.roadMatrix(s + b.width / 2, x, 0.18, side > 0 ? -Math.PI / 2 : Math.PI / 2);
      d.place(b.geometry, m);
      d.block(m, new THREE.Vector3(0, b.height / 2, 0), Math.max(b.width, b.depth) * 0.55);
      s += b.width + gap + rnd.range(0, 1.5);
    }
  }
}

/** Street furniture along the pavements. */
export function furniture(d: Decorator, span: Span, rnd: Random, items: THREE.BufferGeometry[], every: [number, number] = [8, 13]): void {
  for (let s = span.start + 6; s < span.end - 6; s += rnd.range(every[0], every[1])) d.sideProp(rnd.pick(items), s, rnd.chance(0.5) ? -1 : 1, rnd.range(0.4, 1.4));
}

/**
 * A strip of water beside the road (canal, river, lake shore, sea front). It
 * follows the road's curve in short segments, so on a long, winding district
 * it never swings across the road or onto the land on the far side. Its
 * surface sits just above the land, with a low stone bank along the road side.
 */
export function waterBeside(d: Decorator, span: Span, side: number, dist: number, width: number, colour = '#3f8fb0'): void {
  const step = 30;
  const kit = new ModelKit();
  const f = createFrame();
  for (let s = span.start - 30; s < span.end + 30; s += step) {
    d.sample(Math.max(0, Math.min(d.path.length, s)), f);
    const right = f.right.clone().setY(0).normalize();
    const yaw = Math.atan2(f.tangent.x, f.tangent.z);
    const centre = f.position.clone().addScaledVector(right, side * (dist + width / 2)).setY(0);
    // On a tight bend (or where the road doubles back) the segment would cover the road: leave it out.
    if (d.waterCoversRoad(centre.x, centre.z, yaw, width, step + 4, Math.min(6, Math.max(2, dist - 6)))) continue;
    kit.box(width, 2.1, step + 4, colour, { position: [centre.x, 0, centre.z], rotation: [0, yaw, 0], pattern: Pattern.Glass });
    const bank = f.position.clone().addScaledVector(right, side * (dist - 0.6)).setY(0);
    kit.box(1.6, 2.3, step + 4, '#b8ae9a', { position: [bank.x, 0, bank.z], rotation: [0, yaw, 0], pattern: Pattern.Stone });
    d.addWater(centre.x, centre.z, yaw, width, step + 4);
  }
  if (!kit.isEmpty) d.place(d.floats(kit.build(0, 5)), new THREE.Matrix4(), false);
}

export function hills(d: Decorator, span: Span, rnd: Random, kind: Parameters<typeof buildHill>[3], count: number, dist: [number, number], size: [number, number], height: [number, number]): void {
  for (let i = 0; i < count; i++) {
    const s = rnd.range(span.start, span.end);
    const f = d.sample(s);
    const r = rnd.range(size[0], size[1]);
    const p = f.position.clone().addScaledVector(f.right, (rnd.chance(0.5) ? -1 : 1) * (rnd.range(dist[0], dist[1]) + r)).setY(0);
    if (d.nearRoad(p, r + 12)) continue;
    d.place(buildHill(rnd.fork(i), r, rnd.range(height[0], height[1]), kind), d.worldMatrix(p, rnd.range(0, 6)), false);
  }
}

export const info = (geometry: THREE.BufferGeometry, width: number, depth: number, height: number) => ({ geometry, width, depth, height });

// ————— Chapter 6 · City Lights —————

// Paris: Haussmann boulevards, café terraces, the Arc and the Eiffel Tower over the Seine.
const dressParis: Dresser = (d, span, rnd) => {
  const blocks = [0, 1, 2, 3, 4].map((i) => info(buildHaussmann(rnd.fork(i)), 12, 10, 20));
  rows(d, span, rnd, () => rnd.pick(blocks), [-1], 0.4, 2.5);
  waterBeside(d, span, 1, 14, 34, '#5b8fa8');
  furniture(d, span, rnd, [buildLamp(rnd), buildCafeTable(rnd), buildCafeTable(rnd.fork(9)), buildBench()]);
  landmarkBeside(d, span, 0.6, 1, 90, buildEiffelTower(), 'The Eiffel Tower', 80, 30);
  landmarkBeside(d, span, 0.15, 1, 58, buildArcDeTriomphe(), 'The Arc de Triomphe', 30, 26, 0.7);
  const trees = [0, 1].map((i) => buildRoundTree(rnd.fork(i + 20), null));
  for (let s = span.start + 5; s < span.end; s += 11) d.sideProp(rnd.pick(trees), s, 1, 1.4, 0.18, 1.5, 3);
};

// London: the Thames, Big Ben, Tower Bridge, the Eye, red buses and phone boxes.
const dressLondon: Dresser = (d, span, rnd, def) => {
  const houses = Array.from({ length: 8 }, (_, i) => buildHouse(rnd.fork(i), def.walls[i % def.walls.length], 'townhouse'));
  rows(d, span, rnd, () => rnd.pick(houses), [-1], 0.3, 2);
  waterBeside(d, span, 1, 12, 70, '#6f8c94');
  furniture(d, span, rnd, [buildLamp(rnd), buildPhoneBox(), buildBench()]);
  const bus = buildDoubleDecker();
  for (let s = span.start + 30; s < span.end - 20; s += 70) d.sideProp(bus, s, -1, 0.8);
  // Big Ben and the Eye stand on the far bank of the Thames (the river is 12–82 m out).
  landmarkBeside(d, span, 0.25, 1, 96, buildBigBen(), 'Big Ben', 70, 14);
  landmarkBeside(d, span, 0.8, 1, 60, d.floats(buildTowerBridge(70, 8)), 'Tower Bridge', 40, 30);
  // The London Eye: a turning wheel on its frame.
  const eye = beside(d, span, 0.55, 1, 112);
  if (!d.nearRoad(eye.p, 30)) {
    d.place(buildLondonEyeFrame(28), d.worldMatrix(eye.p, eye.face), false);
    d.addSpinner(buildLondonEyeWheel(28), d.worldMatrix(eye.p.clone().setY(31), eye.face), 'x', 0.05);
    d.landmark('The London Eye', span.district, eye.s, eye.p.clone().setY(31));
  }
};


// Venice: palazzi straight on to the canal, gondolas and the Campanile.
const dressVenice: Dresser = (d, span, rnd) => {
  const pal = [0, 1, 2, 3, 4, 5].map((i) => info(buildPalazzo(rnd.fork(i)), 12, 9, 15));
  rows(d, span, rnd, () => rnd.pick(pal), [-1], 0.2, 1.5);
  waterBeside(d, span, 1, 3, 30, '#3f8f8a');
  rows(d, { ...span, start: span.start + 5 }, rnd, () => rnd.pick(pal), [1], 0.2, 36);
  const gondola = buildGondola();
  for (let i = 0; i < 12; i++) {
    const { p } = beside(d, span, rnd.range(0.05, 0.95), 1, rnd.range(8, 28), 1.1);
    d.addFloater(gondola, p, rnd.range(-0.04, 0.04), rnd.range(-0.2, 0.2), 0.15);
  }
  landmarkBeside(d, span, 0.7, -1, 34, buildCampanile(), 'The Campanile of St Mark’s', 60, 10);
  furniture(d, span, rnd, [buildLamp(rnd), buildCafeTable(rnd)]);
};

// Amsterdam: canal houses, bicycles everywhere, tulip fields and a windmill.
const dressAmsterdam: Dresser = (d, span, rnd) => {
  const houses = [0, 1, 2, 3, 4, 5, 6].map((i) => info(buildCanalHouse(rnd.fork(i)), 5.4, 9, 14));
  const half = { ...span, end: span.start + (span.end - span.start) * 0.55 };
  rows(d, half, rnd, () => rnd.pick(houses), [-1, 1], 0.05, 5);
  // The canal runs between the road and the right-hand houses.
  waterBeside(d, half, 1, 7.5, 3, '#3f7f9a');
  const bikes = ['#d8463a', '#2b2622', '#3e6fa8', '#f4d23b'].map(buildBicycle);
  for (let s = span.start + 4; s < half.end; s += rnd.range(3, 6)) d.sideProp(rnd.pick(bikes), s, -1, 0.4);
  // Tulip fields out in the country.
  const tulips = ['#e0432f', '#f4d23b', '#e8559a', '#9a5bd6', '#f08a2e'].map((c) => buildTulipRow(c, 40));
  for (let i = 0; i < 14; i++) {
    const { p, face } = beside(d, span, rnd.range(0.6, 0.98), rnd.chance(0.5) ? -1 : 1, 12 + (i % 7) * 3.2);
    if (!d.nearRoad(p, 6)) d.place(tulips[i % tulips.length], d.worldMatrix(p, face + Math.PI / 2), false);
  }
  const mill = beside(d, span, 0.8, 1, 42);
  if (!d.nearRoad(mill.p, 12)) {
    d.place(buildDutchMillTower(), d.worldMatrix(mill.p, mill.face));
    const hub = mill.p.clone().add(new THREE.Vector3(Math.sin(mill.face) * 3.4, 16, Math.cos(mill.face) * 3.4));
    d.addSpinner(buildDutchMillSails(), d.worldMatrix(hub, mill.face), 'z', 0.6);
    d.landmark('Windmill in the tulips', span.district, mill.s, hub);
  }
};

// Barcelona: the Sagrada Família, Park Güell's mosaic, palms along the promenade.
const dressBarcelona: Dresser = (d, span, rnd, def) => {
  const houses = Array.from({ length: 8 }, (_, i) => buildHouse(rnd.fork(i), def.walls[i % def.walls.length], 'townhouse'));
  rows(d, span, rnd, () => rnd.pick(houses), [-1], 0.5, 2);
  landmarkBeside(d, span, 0.45, 1, 70, buildSagradaFamilia(rnd.fork(3)), 'La Sagrada Família', 60, 30);
  const bench = buildMosaicBench(18);
  for (let s = span.start + 20; s < span.end - 20; s += 55) d.sideProp(bench, s, 1, 3, 0.18);
  const palms = [0, 1, 2].map((i) => buildPalm(rnd.fork(i + 30)));
  for (let s = span.start + 5; s < span.end; s += 9) d.sideProp(rnd.pick(palms), s, 1, 1.4);
  hills(d, span, rnd, 'grass', 6, [120, 200], [40, 70], [20, 40]);
};

// Istanbul: the Blue Mosque's domes, the Galata Tower over the Bosphorus.
const dressIstanbul: Dresser = (d, span, rnd, def) => {
  const houses = Array.from({ length: 8 }, (_, i) => buildHouse(rnd.fork(i), def.walls[i % def.walls.length], i % 2 ? 'wooden' : 'townhouse'));
  rows(d, span, rnd, () => rnd.pick(houses), [1], 0.4, 2);
  waterBeside(d, span, -1, 14, 90, '#3f7fa8');
  landmarkBeside(d, span, 0.35, 1, 75, buildMosque(), 'The Blue Mosque', 40, 45);
  landmarkBeside(d, span, 0.8, -1, 120, buildGalataTower(), 'The Galata Tower', 45, 10);
  furniture(d, span, rnd, [buildLamp(rnd), buildCafeTable(rnd)]);
  const ferry = buildFerry();
  for (let i = 0; i < 4; i++) {
    const { p } = beside(d, span, rnd.range(0.1, 0.9), -1, rnd.range(40, 90), 1.1);
    d.addFloater(ferry, p, 0, rnd.range(-0.3, 0.3), 0.1);
  }
};

// Dubai: desert dunes, camels, and the Burj Khalifa and Burj Al Arab.
const dressDubai: Dresser = (d, span, rnd) => {
  hills(d, span, rnd, 'sandstone', 16, [30, 160], [20, 50], [6, 18]);
  const palms = [0, 1].map((i) => buildPalm(rnd.fork(i)));
  for (let s = span.start + 5; s < span.end; s += 10) d.sideProp(rnd.pick(palms), s, rnd.chance(0.5) ? -1 : 1, 1.6);
  landmarkBeside(d, span, 0.5, -1, 150, buildBurjKhalifa(), 'The Burj Khalifa', 160, 20);
  landmarkBeside(d, span, 0.85, 1, 140, buildBurjAlArab(), 'The Burj Al Arab', 60, 26);
  const camel = buildCamel();
  for (let i = 0; i < 6; i++) {
    const { p, face } = beside(d, span, rnd.range(0.05, 0.4), 1, rnd.range(18, 40));
    if (!d.nearRoad(p, 4)) d.place(camel, d.worldMatrix(p, face + rnd.range(-1, 1)));
  }
  for (let i = 0; i < 8; i++) {
    const { p } = beside(d, span, rnd.range(0.35, 0.7), -1, rnd.range(70, 200));
    const h = rnd.range(60, 130);
    if (!d.nearRoad(p, 20)) d.place(buildSkyscraper(rnd.fork(i + 40), 16, h, 16), d.worldMatrix(p, rnd.range(0, 3)));
  }
};

// ————— Chapter 7 · Skylines —————

// New York: yellow cabs between towers, Times Square, the Empire State and Liberty.
const dressNewYork: Dresser = (d, span, rnd) => {
  const towers = [0, 1, 2, 3, 4, 5].map((i) => info(buildSkyscraper(rnd.fork(i), 18, rnd.range(50, 120), 18), 18, 18, 90));
  rows(d, span, rnd, () => rnd.pick(towers), [-1, 1], 3, 3);
  const cab = buildTaxi();
  for (let s = span.start + 12; s < span.end - 10; s += rnd.range(18, 30)) d.sideProp(cab, s, rnd.chance(0.5) ? -1 : 1, -2.2, 0.05);
  const neon = beside(d, span, 0.3, -1, 16);
  if (!d.nearRoad(neon.p, 6)) d.place(buildNeonWall(rnd.fork(7), 30, 36), d.worldMatrix(neon.p, neon.face));
  d.landmark('Times Square', span.district, neon.s, neon.p.clone().setY(18));
  landmarkBeside(d, span, 0.55, 1, 60, buildEmpireState(), 'The Empire State Building', 150, 22);
  landmarkBeside(d, span, 0.9, 1, 160, buildStatueOfLiberty(), 'The Statue of Liberty', 60, 14);
  for (let s = span.start + 40; s < span.end; s += 90) d.sideProp(buildBillboard(rnd.fork(Math.round(s))), s, -1, 1.5);
};

// San Francisco: steep painted-lady streets, a cable car, and the Golden Gate over the bay.
const dressSanFrancisco: Dresser = (d, span, rnd) => {
  // The first half climbs through the hills: painted ladies both sides.
  const ladies = [0, 1, 2, 3, 4, 5].map((i) => info(buildPaintedLady(rnd.fork(i)), 6.4, 9, 12));
  const hillPart = { ...span, end: span.start + (span.end - span.start) * 0.45 };
  rows(d, hillPart, rnd, () => rnd.pick(ladies), [-1, 1], 0.1, 2.2);
  const car = buildCableCar();
  d.sideProp(car, hillPart.start + 30, 1, -2.5, 0.05);
  // The bridge: the road runs straight across; two red towers straddle it and the cables swoop between.
  const s0 = span.start + (span.end - span.start) * 0.55;
  const s1 = span.start + (span.end - span.start) * 0.9;
  const f0 = d.sample(s0);
  const f1 = d.sample(s1);
  const deckY = (f0.position.y + f1.position.y) / 2;
  const height = deckY + 70;
  const gap = f0.width + 10;
  for (const f of [f0, f1]) d.place(buildGoldenGateTower(height, gap), d.worldMatrix(f.position.clone().setY(0), Math.atan2(f.tangent.x, f.tangent.z)));
  const mid = f0.position.clone().add(f1.position).multiplyScalar(0.5);
  const yaw = Math.atan2(f1.position.x - f0.position.x, f1.position.z - f0.position.z);
  const cable = buildCableSag(f0.position.distanceTo(f1.position), height - 2, deckY + 3);
  const across = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  for (const s of [-1, 1]) d.place(cable, d.worldMatrix(mid.clone().setY(0).addScaledVector(across, (s * gap) / 2), yaw), false);
  d.landmark('The Golden Gate Bridge', span.district, (s0 + s1) / 2, mid.clone().setY(height * 0.7));
  waterBeside(d, { ...span, start: s0 - 40, end: s1 + 40 }, -1, -300, 600, '#4f86a8');
  hills(d, span, rnd, 'grass', 8, [140, 260], [50, 90], [30, 60]);
};

// Rio: the Copacabana wave promenade, beach umbrellas, Sugarloaf and Christ the Redeemer on the peak.
const dressRio: Dresser = (d, span, rnd) => {
  const promenade = buildWavePavement(40);
  for (let s = span.start + 20; s < span.end - 20; s += 40) d.sideProp(promenade, s, 1, 3, 0.05);
  landAlong(d, span.start, span.end, 30, '#ead7ae', '#ead7ae');
  const umbrellas = ['#e0432f', '#f4d23b', '#3e86c9', '#5dbb3f', '#e8559a'].map(buildBeachUmbrella);
  for (let i = 0; i < 40; i++) {
    const { p } = beside(d, span, rnd.range(0.05, 0.95), 1, rnd.range(10, 22), 0.2);
    if (!d.nearRoad(p, 2)) d.place(rnd.pick(umbrellas), d.worldMatrix(p, rnd.range(0, 6)), false);
  }
  const towers = [0, 1, 2].map((i) => info(buildSkyscraper(rnd.fork(i), 14, rnd.range(24, 40), 14), 14, 14, 30));
  rows(d, span, rnd, () => rnd.pick(towers), [-1], 2, 3);
  landmarkBeside(d, span, 0.75, 1, 160, buildSugarloaf(90), 'Sugarloaf Mountain', 80, 45);
  const peak = beside(d, span, 0.35, -1, 220);
  if (!d.nearRoad(peak.p, 60)) {
    d.place(buildPeak(rnd.fork(5), 70, 160, 0.9), d.worldMatrix(peak.p, 0), false);
    d.place(buildRedeemer(), d.worldMatrix(peak.p.clone().setY(158), peak.face, 0.8));
    d.landmark('Christ the Redeemer', span.district, peak.s, peak.p.clone().setY(175));
  }
  const palms = [0, 1].map((i) => buildPalm(rnd.fork(i + 60)));
  for (let s = span.start + 4; s < span.end; s += 12) d.sideProp(rnd.pick(palms), s, 1, 1.2);
};

// Tokyo: the Shibuya crossing under neon, vending machines, and Tokyo Tower.
const dressTokyo: Dresser = (d, span, rnd) => {
  const towers = [0, 1, 2, 3, 4].map((i) => info(buildSkyscraper(rnd.fork(i), 14, rnd.range(30, 70), 14), 14, 14, 50));
  rows(d, span, rnd, () => rnd.pick(towers), [-1, 1], 2, 4);
  const signs = [0, 1, 2, 3].map((i) => buildNeonSign(rnd.fork(i + 10)));
  for (let s = span.start + 6; s < span.end - 6; s += 5) d.sideProp(rnd.pick(signs), s, s % 10 < 5 ? -1 : 1, 2.4);
  const vend = buildVendingMachine();
  for (let s = span.start + 9; s < span.end; s += 26) d.sideProp(vend, s, -1, 1.6);
  const mid = (span.start + span.end) / 2;
  const f = d.sample(mid);
  d.place(buildCrossing(f.width), d.roadMatrix(mid, 0, 0.02, 0), false);
  d.place(buildCrossing(f.width), d.roadMatrix(mid, 0, 0.02, Math.PI / 2), false);
  d.landmark('The Shibuya crossing', span.district, mid, f.position.clone().add(new THREE.Vector3(0, 8, 0)));
  landmarkBeside(d, span, 0.85, 1, 90, buildTokyoTower(), 'Tokyo Tower', 90, 20);
  const cherry = [0, 1].map((i) => buildCherryTree(rnd.fork(i + 70)));
  for (let s = span.start + 20; s < span.end; s += 40) d.sideProp(rnd.pick(cherry), s, 1, 1.8);
};

// Singapore: Marina Bay Sands over the water, the Supertrees and the Merlion.
const dressSingapore: Dresser = (d, span, rnd) => {
  waterBeside(d, span, 1, 16, 120, '#3f8fa8');
  landmarkBeside(d, span, 0.4, 1, 190, buildMarinaBaySands(), 'Marina Bay Sands', 75, 50);
  const trees = [22, 30, 38, 26].map((h) => buildSupertree(h));
  let n = 0;
  for (let i = 0; i < 14; i++) {
    const { p } = beside(d, span, 0.6 + (i % 7) * 0.05, -1, 22 + Math.floor(i / 7) * 18 + rnd.range(-3, 3));
    if (!d.nearRoad(p, 6)) {
      d.place(trees[i % trees.length], d.worldMatrix(p, rnd.range(0, 6)));
      n++;
    }
  }
  if (n) d.landmark('Gardens by the Bay', span.district, span.start + (span.end - span.start) * 0.75, beside(d, span, 0.75, -1, 30).p.setY(28));
  landmarkBeside(d, span, 0.15, 1, 20, buildMerlion(), 'The Merlion', 10, 5);
  const towers = [0, 1, 2].map((i) => info(buildSkyscraper(rnd.fork(i + 80), 16, rnd.range(60, 120), 16), 16, 16, 90));
  rows(d, { ...span, end: span.start + (span.end - span.start) * 0.5 }, rnd, () => rnd.pick(towers), [-1], 3, 4);
};

// Sydney: over the Harbour Bridge (the road runs under its arch), ferries and the Opera House.
const dressSydney: Dresser = (d, span, rnd) => {
  const s0 = span.start + (span.end - span.start) * 0.25;
  const f = d.sample(s0 + 60);
  d.place(buildHarbourBridge(120, 60, f.position.y), d.roadMatrix(s0 + 60, 0, -f.position.y, Math.PI / 2), false);
  d.landmark('Sydney Harbour Bridge', span.district, s0 + 60, f.position.clone().add(new THREE.Vector3(0, 40, 0)));
  waterBeside(d, span, 1, 10, 200, '#3f7fb0');
  waterBeside(d, span, -1, 10, 60, '#3f7fb0');
  landmarkBeside(d, span, 0.75, 1, 80, d.floats(buildOperaHouse()), 'The Sydney Opera House', 28, 50, 1.7);
  const ferry = buildFerry();
  for (let i = 0; i < 6; i++) {
    const { p } = beside(d, span, rnd.range(0.1, 0.9), 1, rnd.range(30, 180), 1.1);
    d.addFloater(ferry, p, 0, rnd.range(-0.3, 0.3), 0.1);
  }
};

// ————— Chapter 8 · Island Road Trip (Sri Lanka) —————

// Colombo: Pettah's red mosque, busy tuk-tuks, Independence Hall, the Lotus Tower beyond.
const dressColombo: Dresser = (d, span, rnd, def) => {
  const houses = Array.from({ length: 8 }, (_, i) => buildHouse(rnd.fork(i), def.walls[i % def.walls.length], i % 3 ? 'shop' : 'colonial'));
  rows(d, span, rnd, () => rnd.pick(houses), [-1, 1], 0.4, 2);
  const tuks = ['#e0432f', '#3e6fa8', '#f4d23b', '#2d8a5a'].map(buildTukTukProp);
  for (let s = span.start + 8; s < span.end - 8; s += rnd.range(9, 16)) d.sideProp(rnd.pick(tuks), s, rnd.chance(0.5) ? -1 : 1, -1.8, 0.05);
  landmarkBeside(d, span, 0.3, 1, 40, buildRedMosque(), 'The Red Mosque, Pettah', 20, 16);
  landmarkBeside(d, span, 0.75, -1, 70, buildIndependenceHall(), 'Independence Memorial Hall', 14, 22);
  landmarkBeside(d, span, 0.55, 1, 260, buildLotusTower(), 'The Lotus Tower', 180, 20);
  furniture(d, span, rnd, [buildLamp(rnd), buildClockTower()], [30, 45]);
};

// Kandy: a daytime perahera of decorated elephants along the lake road.
const dressKandyDay: Dresser = (d, span, rnd) => {
  waterBeside(d, span, 1, 8, 60, '#4f7f9a');
  const colours = ['#b0352a', '#2d4f8f', '#e8c872', '#2d6f4f'];
  const elephants = colours.map(buildPeraheraElephant);
  let n = 0;
  for (let s = span.start + 20; s < span.end - 20; s += 16) {
    d.sideProp(elephants[n++ % elephants.length], s, -1, 3, 0.18, 3, 3);
  }
  d.landmark('The Kandy perahera', span.district, span.start + 40, d.sample(span.start + 40).position.clone().add(new THREE.Vector3(0, 6, 0)));
  const trees = [0, 1, 2].map((i) => buildRoundTree(rnd.fork(i), null));
  for (let s = span.start; s < span.end; s += rnd.range(9, 14)) d.sideProp(rnd.pick(trees), s, -1, rnd.range(9, 14));
  landmarkBeside(d, span, 0.7, -1, 60, buildStupa(), 'A white stupa above the lake', 20, 14, 0.8);
  hills(d, span, rnd, 'jungle', 14, [80, 200], [40, 80], [30, 60]);
};

// Nuwara Eliya: "Little England" — the Tudor post office, Gregory Lake's swan boats, tea everywhere.
const dressNuwaraEliya: Dresser = (d, span, rnd) => {
  hills(d, span, rnd, 'tea', 22, [14, 90], [30, 60], [16, 40]);
  landmarkBeside(d, span, 0.25, -1, 30, buildTudorPostOffice(), 'Nuwara Eliya post office', 12, 16);
  landmarkBeside(d, span, 0.7, 1, 110, buildTeaFactory(), 'A tea factory in the clouds', 14, 20);
  waterBeside(d, { ...span, start: span.start + (span.end - span.start) * 0.4, end: span.start + (span.end - span.start) * 0.6 }, 1, 12, 40, '#5f8fa8');
  const swan = buildSwanBoat();
  for (let i = 0; i < 6; i++) {
    const { p } = beside(d, span, 0.42 + i * 0.03, 1, rnd.range(18, 45), 1.1);
    d.addFloater(swan, p, 0, rnd.range(-0.2, 0.2), 0.1);
  }
  const hut = buildTeaHut();
  for (let s = span.start + 40; s < span.end; s += 80) d.sideProp(hut, s, -1, 7, 0.2, 3, 3);
  const flowers = [0, 1].map((i) => buildFlowerBush(rnd.fork(i)));
  for (let s = span.start + 3; s < span.end; s += 7) d.sideProp(rnd.pick(flowers), s, rnd.chance(0.5) ? -1 : 1, 0.6);
};

// Ella: the Nine Arch Bridge with the blue train, and Little Adam's Peak.
const dressEllaRoad: Dresser = (d, span, rnd) => {
  hills(d, span, rnd, 'tea', 18, [20, 90], [30, 60], [20, 50]);
  const b = beside(d, span, 0.5, 1, 70);
  if (!d.nearRoad(b.p, 40)) {
    const yaw = b.face + Math.PI / 2;
    d.place(buildNineArchBridge(90, 24, 5), d.worldMatrix(b.p, yaw));
    const train = buildTrain(4);
    d.place(train.geometry, d.worldMatrix(b.p.clone().setY(24.5), yaw + Math.PI / 2));
    d.landmark('The Nine Arch Bridge', span.district, b.s, b.p.clone().setY(24));
  }
  const peak = beside(d, span, 0.85, -1, 150);
  if (!d.nearRoad(peak.p, 60)) {
    d.place(buildHill(rnd.fork(2), 70, 110, 'jungle'), d.worldMatrix(peak.p, 0), false);
    d.landmark('Little Adam’s Peak', span.district, peak.s, peak.p.clone().setY(100));
  }
};

// Yala: red earth, scrub, rocks, leopards, elephants, peacocks and safari jeeps.
const dressYala: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 140, '#b8744a', '#c9a07a');
  const trees = [0, 1, 2, 3].map((i) => buildScrubTree(rnd.fork(i)));
  for (let s = span.start; s < span.end; s += rnd.range(5, 9)) d.sideProp(rnd.pick(trees), s, rnd.chance(0.5) ? -1 : 1, rnd.range(3, 20));
  const leopard = buildLeopardOnRock(rnd.fork(5));
  landmarkBeside(d, span, 0.35, 1, 26, leopard, 'A leopard on the rocks', 5, 6);
  landmarkBeside(d, span, 0.7, -1, 34, buildLeopardOnRock(rnd.fork(6)), 'Leopard Rock', 5, 6, 1.4);
  const elephant = buildElephant();
  for (let i = 0; i < 5; i++) {
    const { p, face } = beside(d, span, 0.5 + i * 0.04, -1, 24 + i * 5);
    if (!d.nearRoad(p, 6)) d.place(elephant, d.worldMatrix(p, face + 1.2));
  }
  const peacock = buildPeacock();
  for (let s = span.start + 30; s < span.end; s += 45) d.sideProp(peacock, s, 1, 3);
  const jeep = buildSafariJeep();
  for (let s = span.start + 50; s < span.end; s += 110) d.sideProp(jeep, s, 1, 1.5, 0.05);
  hills(d, span, rnd, 'rock', 8, [60, 180], [16, 40], [10, 30]);
};

// Galle: along the fort ramparts, the lighthouse, the clock tower and stilt fishermen in the surf.
const dressGalle: Dresser = (d, span, rnd) => {
  const wall = buildRampart(30, 5);
  for (let s = span.start + 10; s < span.end - 10; s += 30) d.sideProp(wall, s, 1, 4, -5);
  waterBeside(d, span, 1, 16, 200, '#3f8fb0');
  landmarkBeside(d, span, 0.55, 1, 12, buildGalleLighthouse(), 'Galle lighthouse', 26, 5);
  landmarkBeside(d, span, 0.25, -1, 14, buildClockTower(), 'Galle Fort clock tower', 16, 4);
  const fisher = d.floats(buildStiltFisher());
  for (let i = 0; i < 9; i++) {
    const { p, face } = beside(d, span, 0.7 + i * 0.03, 1, 30 + (i % 3) * 6);
    d.place(fisher, d.worldMatrix(p.setY(0), face), false);
  }
  const palms = [0, 1, 2].map((i) => buildPalm(rnd.fork(i + 90)));
  for (let s = span.start + 4; s < span.end; s += 10) d.sideProp(rnd.pick(palms), s, -1, 1.4);
};

export const CITY_DRESSERS = {
  paris: dressParis,
  london: dressLondon,
  venice: dressVenice,
  amsterdam: dressAmsterdam,
  barcelona: dressBarcelona,
  istanbul: dressIstanbul,
  dubai: dressDubai,
  newyork: dressNewYork,
  sanfrancisco: dressSanFrancisco,
  rio: dressRio,
  tokyo: dressTokyo,
  singapore: dressSingapore,
  sydney: dressSydney,
  colombo: dressColombo,
  kandyday: dressKandyDay,
  nuwaraeliya: dressNuwaraEliya,
  ellaroad: dressEllaRoad,
  yala: dressYala,
  galle: dressGalle,
};

export function cityLightsBackground(d: Decorator, rnd: Random): void {
  commonSky(d, rnd, 24);
  landAlong(d, 0, d.path.length, 220, '#9dbf6a', '#e3d7b8');
  const trees = [0, 1].map((i) => buildCypress(rnd.fork(i)));
  for (let i = 0; i < 60; i++) {
    const p = d.scatter(rnd, 60, 260, 0, 30);
    if (p) d.place(rnd.pick(trees), d.worldMatrix(p, 0), false);
  }
}

export function skylinesBackground(d: Decorator, rnd: Random): void {
  commonSky(d, rnd, 22);
  landAlong(d, 0, d.path.length, 200, '#8fb86a', '#ead7ae');
  // A far-off ring of towers so every city has a skyline behind it.
  for (let i = 0; i < 70; i++) {
    const p = d.scatter(rnd, 300, 800, 0, 60);
    if (p) d.place(buildSkyscraper(rnd.fork(i + 200), rnd.range(14, 26), rnd.range(40, 140), rnd.range(14, 26)), d.worldMatrix(p, rnd.range(0, 3)), false);
  }
}

export function islandBackground(d: Decorator, rnd: Random): void {
  commonSky(d, rnd, 26);
  landAlong(d, 0, d.path.length, 240, '#6fae3a');
  for (let i = 0; i < 14; i++) {
    const p = d.scatter(rnd, 500, 1300, 0, 200);
    // Rounded, forested hills: the island's mountains are green to the top.
    if (p) d.place(buildHill(rnd.fork(i + 300), rnd.range(160, 260), rnd.range(90, 180), 'jungle'), d.worldMatrix(p, rnd.range(0, 6)), false);
  }
}

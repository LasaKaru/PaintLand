import type { Dresser, Decorator } from '../Decorator';
import type { Random } from '../../core/Random';
import { buildPalm } from '../../models/Nature';
import { buildLamp, buildBench, buildLighthouse } from '../../models/Props';
import { buildSkyscraper } from '../../models/CityProps';
import { buildBeachUmbrella, buildFerry, buildHarbourBridge, buildOperaHouse } from '../../models/LandmarksCities';
import {
  buildCliffWall, buildCoral, buildCroc, buildDiveBoat, buildFlindersStation, buildGumTree, buildKangaroo, buildKoala, buildLifesaverTower, buildRainforestTree,
  buildRoadTrain, buildSeaStack, buildSurfboard, buildTermiteMound, buildThreeSisters, buildTram, buildTreeFern, buildUluru, buildWindPump,
} from '../../models/LandmarksAustralia';
import { beside, furniture, hills, landmarkBeside, rows, waterBeside, type Span } from './cities';
import { landAlong } from './sketch';
import { tourBackground } from './tour';

const at = (span: Span, t: number): number => span.start + (span.end - span.start) * t;
const part = (span: Span, t0: number, t1: number): Span => ({ ...span, start: at(span, t0), end: at(span, t1) });

function gums(d: Decorator, span: Span, rnd: Random, every: number, reach: [number, number]): void {
  const trees = [0, 1, 2, 3].map((i) => buildGumTree(rnd.fork(i + 60)));
  for (let s = span.start; s < span.end; s += every) d.sideProp(rnd.pick(trees), s, rnd.chance(0.5) ? -1 : 1, rnd.range(reach[0], reach[1]));
}

function towers(d: Decorator, span: Span, rnd: Random, sides: number[], lo: number, hi: number): void {
  const list = [0, 1, 2, 3].map((i) => {
    const h = rnd.range(lo, hi);
    return { geometry: buildSkyscraper(rnd.fork(i + 10), 18, h, 18), width: 18, depth: 18, height: h };
  });
  rows(d, span, rnd, () => rnd.pick(list), sides, 3, 4);
}

// ————— the ten districts —————

// Sydney: the Harbour Bridge and the Opera House on the water, ferries crossing.
const dressHarbourCity: Dresser = (d, span, rnd) => {
  towers(d, part(span, 0, 0.5), rnd, [-1], 40, 110);
  waterBeside(d, span, 1, 12, 240, '#3f7fb0');
  const b = beside(d, span, 0.3, 1, 130);
  d.place(d.floats(buildHarbourBridge(160, 60, 12)), d.worldMatrix(b.p.setY(0), b.face + Math.PI / 2), false);
  d.landmark('The Sydney Harbour Bridge', span.district, b.s, b.p.clone().setY(50));
  landmarkBeside(d, span, 0.75, 1, 80, d.floats(buildOperaHouse()), 'The Sydney Opera House', 28, 50, 1.7);
  const ferry = buildFerry();
  for (let i = 0; i < 5; i++) {
    const { p } = beside(d, span, rnd.range(0.1, 0.9), 1, rnd.range(40, 200), 1.1);
    d.addFloater(ferry, p, 0, rnd.range(-0.3, 0.3), 0.1);
  }
  furniture(d, span, rnd, [buildLamp(rnd), buildBench()], [12, 18]);
};

// The Blue Mountains: eucalyptus haze and the Three Sisters.
const dressBlueMountains: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 170, '#6f8a4a');
  gums(d, span, rnd, 3, [2, 30]);
  landmarkBeside(d, span, 0.55, 1, 140, buildThreeSisters(), 'The Three Sisters', 40, 40);
  hills(d, span, rnd, 'forest', 12, [100, 260], [80, 140], [50, 100]);
  const koala = buildKoala();
  for (const t of [0.25, 0.7]) d.sideProp(koala, at(span, t), -1, 3);
  d.landmark('A koala in a gum tree', span.district, at(span, 0.25), beside(d, span, 0.25, -1, 6).p.setY(4));
};

// Melbourne: trams, laneways and Flinders Street Station.
const dressMelbourne: Dresser = (d, span, rnd) => {
  towers(d, span, rnd, [-1, 1], 30, 90);
  const tram = buildTram();
  for (let s = span.start + 30; s < span.end - 20; s += 70) d.sideProp(tram, s, s % 140 < 70 ? -1 : 1, 0.8, 0.18);
  d.landmark('Melbourne’s trams', span.district, at(span, 0.25), beside(d, span, 0.25, -1, 3).p.setY(4));
  // Set back so its blocking volume stays clear of the road (the camera tests check this).
  landmarkBeside(d, span, 0.7, 1, 52, buildFlindersStation(), 'Flinders Street Station', 18, 28);
  furniture(d, span, rnd, [buildLamp(rnd), buildBench()], [10, 15]);
};

// The Great Ocean Road: limestone cliffs, and the Twelve Apostles standing in the surf.
const dressOceanRoad: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 110, '#7a9a4a', '#e0c8a0');
  waterBeside(d, span, 1, 30, 320, '#3f8fb0');
  const cliff = buildCliffWall(40);
  for (let s = span.start + 20; s < span.end - 20; s += 40.5) d.sideProp(cliff, s, -1, 20, 0.05);
  let first = true;
  for (let i = 0; i < 9; i++) {
    const { p, face, s } = beside(d, span, 0.2 + i * 0.08, 1, 70 + (i % 3) * 25);
    d.place(d.floats(buildSeaStack(rnd.fork(i))), d.worldMatrix(p.setY(0), face), false);
    if (first) d.landmark('The Twelve Apostles', span.district, s, p.clone().setY(30));
    first = false;
  }
  gums(d, span, rnd, 12, [3, 12]);
};

// The Outback: red earth, termite mounds, a wind pump and a road train.
const dressOutback: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 220, '#c8703a', '#d88a4a');
  const mounds = [0, 1, 2].map((i) => buildTermiteMound(rnd.fork(i)));
  for (let s = span.start; s < span.end; s += rnd.range(4, 9)) d.sideProp(rnd.pick(mounds), s, rnd.chance(0.5) ? -1 : 1, rnd.range(3, 40));
  landmarkBeside(d, span, 0.35, -1, 30, buildWindPump(), 'An outback wind pump', 10, 5);
  d.sideProp(buildRoadTrain(rnd.fork(3)), at(span, 0.6), 1, 1.2, 0.18);
  d.landmark('A road train', span.district, at(span, 0.6), beside(d, span, 0.6, 1, 4).p.setY(4));
  const roo = buildKangaroo();
  for (let i = 0; i < 12; i++) d.sideProp(roo, at(span, rnd.range(0.05, 0.95)), rnd.chance(0.5) ? -1 : 1, rnd.range(6, 40));
  gums(d, span, rnd, 30, [10, 60]);
};

// Uluru: the great red rock glowing at sunset.
const dressUluru: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 240, '#c8683a', '#d8844a');
  // The rock sits 180 m out on the right: at 180 × 90 m it fills the view as the road curves round it.
  const u = beside(d, span, 0.55, 1, 280);
  d.place(buildUluru(), d.worldMatrix(u.p, u.face), false);
  d.landmark('Uluru', span.district, u.s, u.p.clone().setY(60));
  const mounds = [0, 1].map((i) => buildTermiteMound(rnd.fork(i + 5)));
  for (let s = span.start; s < span.end; s += rnd.range(8, 16)) d.sideProp(rnd.pick(mounds), s, -1, rnd.range(4, 40));
  const roo = buildKangaroo();
  for (let i = 0; i < 8; i++) d.sideProp(roo, at(span, rnd.range(0.05, 0.95)), -1, rnd.range(8, 30));
};

// The Daintree: the oldest rainforest, tree ferns, and a croc on the riverbank.
const dressDaintree: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 150, '#3f7a2a');
  const trees = [0, 1, 2].map((i) => buildRainforestTree(rnd.fork(i)));
  for (let s = span.start; s < span.end; s += 3) d.sideProp(rnd.pick(trees), s, rnd.chance(0.5) ? -1 : 1, rnd.range(2, 30));
  const ferns = [0, 1].map((i) => buildTreeFern(rnd.fork(i + 20)));
  for (let s = span.start; s < span.end; s += 4) d.sideProp(rnd.pick(ferns), s, rnd.chance(0.5) ? -1 : 1, rnd.range(0.6, 6));
  waterBeside(d, part(span, 0.4, 0.8), 1, 20, 40, '#4a7a6a');
  const c = beside(d, span, 0.6, 1, 18);
  d.place(buildCroc(), d.worldMatrix(c.p, c.face + 1.3), false);
  d.landmark('A saltie on the Daintree River', span.district, c.s, c.p.clone().setY(1));
  d.landmark('The Daintree Rainforest', span.district, at(span, 0.2), beside(d, span, 0.2, -1, 12).p.setY(12));
};

// The Great Barrier Reef: turquoise shallows, coral heads and dive boats.
const dressReef: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 100, '#6fae3a', '#f4ead0');
  waterBeside(d, span, 1, 16, 340, '#3fd0c8');
  const coral = [0, 1, 2].map((i) => d.floats(buildCoral(rnd.fork(i))));
  for (let i = 0; i < 30; i++) {
    const { p } = beside(d, span, rnd.range(0.05, 0.95), 1, rnd.range(30, 160));
    d.place(rnd.pick(coral), d.worldMatrix(p.setY(0), rnd.range(0, 6)), false);
  }
  d.landmark('The Great Barrier Reef', span.district, at(span, 0.5), beside(d, span, 0.5, 1, 60).p.setY(2));
  const boat = d.floats(buildDiveBoat());
  for (const t of [0.3, 0.7]) {
    const { p, face } = beside(d, span, t, 1, 90);
    d.place(boat, d.worldMatrix(p.setY(0), face + 1), false);
  }
  const palms = [0, 1, 2].map((i) => buildPalm(rnd.fork(i + 40)));
  for (let s = span.start + 4; s < span.end; s += 8) d.sideProp(rnd.pick(palms), s, -1, rnd.range(1, 8));
};

// Byron Bay: the lighthouse on the easternmost point, surfboards on the sand.
const dressByron: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 110, '#6fae3a', '#f0dcb0');
  waterBeside(d, span, 1, 24, 320, '#3fa8c8');
  landmarkBeside(d, span, 0.7, 1, 20, buildLighthouse(), 'Cape Byron lighthouse', 16, 6, 2);
  const boards = ['#e8559a', '#3ef0ff', '#f4d23b', '#5dbb3f', '#f08a2e'].map((c) => buildSurfboard(c));
  for (let s = span.start + 10; s < at(span, 0.6); s += 9) d.sideProp(rnd.pick(boards), s, 1, rnd.range(6, 16), 0.05);
  d.landmark('The surf at Byron Bay', span.district, at(span, 0.3), beside(d, span, 0.3, 1, 30).p.setY(2));
  const palms = [0, 1].map((i) => buildPalm(rnd.fork(i + 50)));
  for (let s = span.start + 4; s < span.end; s += 10) d.sideProp(rnd.pick(palms), s, -1, rnd.range(1, 10));
};

// The Gold Coast: beach towers, lifesavers in red and yellow, the end of the road.
const dressGoldCoast: Dresser = (d, span, rnd) => {
  towers(d, span, rnd, [-1], 60, 160);
  waterBeside(d, span, 1, 26, 340, '#3fa8d0');
  const tower = buildLifesaverTower();
  let first = true;
  for (let s = span.start + 40; s < span.end - 20; s += 120) {
    d.sideProp(tower, s, 1, 12, 0.05);
    if (first) d.landmark('Surf lifesavers on the Gold Coast', span.district, s, beside(d, { ...span, start: s, end: s + 1 }, 0, 1, 14).p.setY(8));
    first = false;
  }
  const umbrellas = ['#e0432f', '#f4d23b', '#3e9fd8'].map((c) => buildBeachUmbrella(c));
  for (let s = span.start + 8; s < span.end - 8; s += 8) d.sideProp(rnd.pick(umbrellas), s, 1, rnd.range(9, 20), 0.05);
  const palms = [0, 1].map((i) => buildPalm(rnd.fork(i + 70)));
  for (let s = span.start + 5; s < span.end; s += 14) d.sideProp(rnd.pick(palms), s, 1, 3);
};

export const AUSTRALIA_DRESSERS = {
  harbourcity: dressHarbourCity,
  bluemountains: dressBlueMountains,
  melbourne: dressMelbourne,
  oceanroad: dressOceanRoad,
  outback: dressOutback,
  uluru: dressUluru,
  daintree: dressDaintree,
  reef: dressReef,
  byron: dressByron,
  goldcoast: dressGoldCoast,
};

const SEA_RIGHT = new Set(['harbourcity', 'oceanroad', 'reef', 'byron', 'goldcoast']);

export function australiaBackground(d: Decorator, rnd: Random): void {
  const trees = [0, 1, 2].map((i) => buildGumTree(rnd.fork(i)));
  tourBackground(d, rnd, { grass: '#9aa85a', trees, hill: 'grass', hillHeight: [40, 90], seaRight: SEA_RIGHT });
}

import * as THREE from 'three';
import type { Decorator, Dresser } from '../Decorator';
import type { Random } from '../../core/Random';
import { buildHouse } from '../../models/Buildings';
import { buildRoundTree, buildCypress, buildBush, buildFlowerBush } from '../../models/Nature';
import { buildLamp, buildBench, buildLighthouse } from '../../models/Props';
import { buildDoubleDecker, buildPhoneBox } from '../../models/LandmarksCities';
import {
  buildBeachHut, buildCityWallBar, buildCornishCottage, buildCotswoldCottage, buildDragonFlag, buildEdinburghCastle, buildFishingBoat, buildHelterSkelter,
  buildHighlandCow, buildLakelandFarm, buildMinster, buildPier, buildPillarBox, buildRomanBaths, buildRoyalCrescent, buildRoyalPavilion, buildSheep,
  buildStoneBridge, buildStonehenge, buildStoneWall, buildTenement, buildTudorHouse, buildVillageChurch, buildWelshCastle,
} from '../../models/LandmarksBritain';
import { beside, furniture, hills, landmarkBeside, rows, waterBeside, type Span } from './cities';
import { landAlong } from './sketch';
import { tourBackground } from './tour';

// ————— helpers —————

/** Animals grazing in the fields either side of the road. */
function grazing(d: Decorator, span: Span, rnd: Random, geo: THREE.BufferGeometry, count: number, dist: [number, number]): void {
  for (let i = 0; i < count; i++) {
    const { p, face } = beside(d, span, rnd.range(0.05, 0.95), rnd.chance(0.5) ? -1 : 1, rnd.range(dist[0], dist[1]));
    if (!d.nearRoad(p, 4)) d.place(geo, d.worldMatrix(p, face + rnd.range(-2, 2)), false);
  }
}

/** Dry-stone walls running beside the road, a field's width back. */
function fieldWalls(d: Decorator, span: Span, rnd: Random, colour?: string): void {
  const wall = buildStoneWall(12, colour);
  for (let s = span.start + 6; s < span.end - 6; s += 12.4) {
    for (const side of [-1, 1]) if (rnd.chance(0.85)) d.sideProp(wall, s, side, 3.5, 0.05);
  }
}

// ————— the ten districts —————

// Edinburgh: the Royal Mile's grey tenements, the castle on its rock, a piper.
const dressEdinburgh: Dresser = (d, span, rnd) => {
  const blocks = [0, 1, 2, 3, 4, 5].map((i) => buildTenement(rnd.fork(i)));
  rows(d, { ...span, end: span.start + (span.end - span.start) * 0.7 }, rnd, () => rnd.pick(blocks), [-1, 1], 0.3, 2);
  furniture(d, span, rnd, [buildLamp(rnd), buildPillarBox(), buildPhoneBox(), buildBench()]);
  landmarkBeside(d, span, 0.82, 1, 110, buildEdinburghCastle(), 'Edinburgh Castle', 50, 60);
  hills(d, span, rnd, 'rock', 3, [150, 260], [70, 110], [50, 80]); // Arthur's Seat and the crags
};

// The Highlands: glens, lochs, heather, shaggy cows and the odd stone bridge.
const dressHighlands: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 180, '#7f8f4a', '#a58a6a');
  hills(d, span, rnd, 'grass', 16, [40, 160], [60, 120], [50, 110]);
  hills(d, span, rnd, 'snowpeak', 4, [220, 380], [100, 160], [120, 180]);
  waterBeside(d, { ...span, start: span.start + (span.end - span.start) * 0.3 }, 1, 20, 90, '#4a6f86'); // the loch
  grazing(d, span, rnd, buildHighlandCow(), 14, [8, 40]);
  const heather = [0, 1, 2].map((i) => buildBush(rnd.fork(i), rnd.pick(['#9a5a9a', '#b27ab2', '#7a4a7a'])));
  for (let s = span.start; s < span.end; s += rnd.range(3, 7)) d.sideProp(rnd.pick(heather), s, rnd.chance(0.5) ? -1 : 1, rnd.range(1, 18));
  landmarkBeside(d, span, 0.2, -1, 26, buildStoneBridge(), 'An old packhorse bridge', 3, 10);
};

// The Lake District: fells, lakes, whitewashed farms, sheep and stone walls.
const dressLakes: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 170, '#6f9a4a');
  hills(d, span, rnd, 'grass', 14, [50, 170], [60, 110], [50, 100]);
  waterBeside(d, span, -1, 18, 120, '#5a8aa8');
  fieldWalls(d, span, rnd, '#7e7a70');
  grazing(d, span, rnd, buildSheep(), 30, [7, 45]);
  landmarkBeside(d, span, 0.15, 1, 30, buildLakelandFarm(rnd.fork(0)), 'A Lakeland farm', 5, 10);
  for (let i = 1; i < 4; i++) {
    const { p, face } = beside(d, span, 0.15 + i * 0.22, 1, 30 + i * 6);
    if (!d.nearRoad(p, 10)) {
      d.place(buildLakelandFarm(rnd.fork(i)), d.worldMatrix(p, face));
      d.blockWorld(p.clone().setY(2), 10);
    }
  }
  const trees = [0, 1].map((i) => buildRoundTree(rnd.fork(i + 10), null));
  for (let s = span.start; s < span.end; s += rnd.range(9, 16)) d.sideProp(rnd.pick(trees), s, 1, rnd.range(4, 12));
};

// York: the Shambles' leaning Tudor houses, the city walls and the Minster.
const dressYork: Dresser = (d, span, rnd) => {
  const tudor = [0, 1, 2, 3, 4, 5, 6].map((i) => buildTudorHouse(rnd.fork(i)));
  rows(d, { ...span, end: span.start + (span.end - span.start) * 0.55 }, rnd, () => rnd.pick(tudor), [-1, 1], 0.1, 1.5);
  furniture(d, span, rnd, [buildLamp(rnd), buildBench(), buildPillarBox()]);
  landmarkBeside(d, span, 0.7, 1, 80, buildMinster(), 'York Minster', 40, 45);
  landmarkBeside(d, span, 0.9, -1, 24, buildCityWallBar(), 'Micklegate Bar', 8, 20);
};

// The Cotswolds: honey-stone villages, a church tower, sheep and hedgerows.
const dressCotswolds: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 160, '#8fb35a');
  hills(d, span, rnd, 'grass', 10, [70, 200], [70, 120], [20, 40]);
  const cottages = [0, 1, 2, 3, 4, 5].map((i) => buildCotswoldCottage(rnd.fork(i)));
  const mid = span.start + (span.end - span.start) * 0.35;
  rows(d, { ...span, start: mid, end: mid + 180 }, rnd, () => rnd.pick(cottages), [-1, 1], 1.5, 2.5);
  landmarkBeside(d, span, 0.5, 1, 45, buildVillageChurch(), 'The village church', 12, 14);
  fieldWalls(d, { ...span, start: mid + 200 }, rnd, '#c9ac72');
  grazing(d, span, rnd, buildSheep(), 24, [8, 40]);
  const flowers = [0, 1].map((i) => buildFlowerBush(rnd.fork(i + 40)));
  for (let s = span.start + 3; s < span.end; s += 8) d.sideProp(rnd.pick(flowers), s, rnd.chance(0.5) ? -1 : 1, 0.8);
};

// Bath: honey stone, the Royal Crescent sweeping round the road, the Roman Baths.
const dressBath: Dresser = (d, span, rnd, def) => {
  const houses = Array.from({ length: 6 }, (_, i) => buildHouse(rnd.fork(i), def.walls[i % def.walls.length], 'townhouse'));
  rows(d, { ...span, end: span.start + (span.end - span.start) * 0.3 }, rnd, () => rnd.pick(houses), [-1, 1], 0.2, 2);
  // The Crescent: stand it on the outside of the big curve so it hugs the road.
  const c = beside(d, span, 0.45, -1, 60);
  if (!d.nearRoad(c.p, 40)) {
    d.place(buildRoyalCrescent(70), d.worldMatrix(c.p, c.face + Math.PI));
    d.landmark('The Royal Crescent', span.district, c.s, c.p.clone().setY(12));
  }
  landmarkBeside(d, span, 0.8, 1, 40, buildRomanBaths(), 'The Roman Baths', 8, 22);
  furniture(d, span, rnd, [buildLamp(rnd), buildBench(), buildPillarBox()]);
  const trees = [0, 1].map((i) => buildRoundTree(rnd.fork(i + 20), null));
  for (let s = span.start + 5; s < span.end; s += 13) d.sideProp(rnd.pick(trees), s, 1, 2);
};

// Salisbury Plain: wide open chalk grassland and the stones.
const dressStonehenge: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 220, '#a3b86a');
  landmarkBeside(d, span, 0.5, 1, 70, buildStonehenge(), 'Stonehenge', 6, 22, 1.2);
  grazing(d, span, rnd, buildSheep(), 20, [20, 80]);
  hills(d, span, rnd, 'grass', 6, [140, 300], [90, 140], [12, 24]); // barrows on the skyline
  const hedge = [0, 1].map((i) => buildBush(rnd.fork(i + 60), '#5a7a3a'));
  for (let s = span.start; s < span.end; s += rnd.range(6, 14)) d.sideProp(rnd.pick(hedge), s, rnd.chance(0.5) ? -1 : 1, rnd.range(2, 6));
};

// Cornwall: white cottages down to a harbour, fishing boats and a lighthouse on the point.
const dressCornwall: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 110, '#7fa85a', '#e6d6b0');
  waterBeside(d, span, 1, 18, 260, '#3f8fb0');
  const cottages = [0, 1, 2, 3, 4].map((i) => buildCornishCottage(rnd.fork(i)));
  rows(d, { ...span, end: span.start + (span.end - span.start) * 0.4 }, rnd, () => rnd.pick(cottages), [-1], 0.4, 2);
  const boats = [0, 1, 2].map((i) => d.floats(buildFishingBoat(rnd.fork(i))));
  for (let i = 0; i < 10; i++) {
    const { p, face } = beside(d, span, 0.08 + i * 0.035, 1, 30 + (i % 3) * 9);
    d.place(rnd.pick(boats), d.worldMatrix(p.setY(0.3), face + rnd.range(-1, 1)), false);
  }
  // The lighthouse stands out on its rocky point, in the sea.
  landmarkBeside(d, span, 0.85, 1, 22, d.floats(buildLighthouse()), 'Lizard Point lighthouse', 12, 6, 1.6);
  hills(d, span, rnd, 'grass', 6, [40, 140], [50, 90], [20, 40]);
};

// Wales: green valleys, a great castle, the red dragon and sheep on every hill.
const dressWales: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 170, '#5f9a3a');
  // Hills stand back behind the castle so it is seen from the road.
  hills(d, span, rnd, 'grass', 14, [170, 300], [60, 120], [50, 110]);
  landmarkBeside(d, span, 0.3, 1, 80, buildWelshCastle(), 'Caernarfon Castle', 20, 45);
  const flag = buildDragonFlag();
  for (const t of [0.1, 0.55, 0.9]) {
    const { p, face } = beside(d, span, t, -1, 10);
    if (!d.nearRoad(p, 2)) d.place(flag, d.worldMatrix(p, face));
  }
  landmarkBeside(d, span, 0.7, -1, 40, buildVillageChurch('#8e8a80'), 'A chapel in the valley', 12, 14);
  fieldWalls(d, span, rnd);
  grazing(d, span, rnd, buildSheep(), 36, [8, 50]);
};

// Brighton: the seafront, beach huts, the pier with its helter-skelter and the Royal Pavilion.
const dressBrighton: Dresser = (d, span, rnd, def) => {
  landAlong(d, span.start, span.end, 90, '#9dbf6a', '#d8cfc0');
  waterBeside(d, span, 1, 22, 320, '#4f9ac0');
  const houses = Array.from({ length: 8 }, (_, i) => buildHouse(rnd.fork(i), def.walls[i % def.walls.length], i % 2 ? 'colonial' : 'townhouse'));
  rows(d, span, rnd, () => rnd.pick(houses), [-1], 0.3, 2);
  const hutColours = ['#e0432f', '#2f7ab8', '#f4d23b', '#3a9a8a', '#e8559a', '#8a5ac8'];
  const huts = hutColours.map((c) => buildBeachHut(c));
  for (let s = span.start + 20, i = 0; s < span.start + (span.end - span.start) * 0.35; s += 4, i++) d.sideProp(huts[i % huts.length], s, 1, 6, 0.05);
  const pier = beside(d, span, 0.55, 1, 20);
  d.place(buildPier(200), d.worldMatrix(pier.p.clone().setY(0), pier.face + Math.PI), false);
  const out = beside(d, span, 0.55, 1, 180);
  d.place(buildHelterSkelter(), d.worldMatrix(out.p.clone().setY(6.4), 0), false);
  d.landmark('Brighton Palace Pier', span.district, pier.s, out.p.clone().setY(14));
  landmarkBeside(d, span, 0.8, -1, 60, buildRoyalPavilion(), 'The Royal Pavilion', 18, 30);
  furniture(d, span, rnd, [buildLamp(rnd), buildBench(), buildPhoneBox()]);
  const bus = buildDoubleDecker();
  for (let s = span.start + 40; s < span.end - 20; s += 140) d.sideProp(bus, s, -1, 0.8);
};

export const BRITAIN_DRESSERS = {
  edinburgh: dressEdinburgh,
  highlands: dressHighlands,
  lakes: dressLakes,
  york: dressYork,
  cotswolds: dressCotswolds,
  bath: dressBath,
  stonehenge: dressStonehenge,
  cornwall: dressCornwall,
  wales: dressWales,
  brighton: dressBrighton,
};

const SEA_RIGHT = new Set(['cornwall', 'brighton']);

export function britainBackground(d: Decorator, rnd: Random): void {
  const trees = [0, 1, 2].map((i) => (i === 2 ? buildCypress(rnd.fork(i)) : buildRoundTree(rnd.fork(i), null)));
  tourBackground(d, rnd, { grass: '#7fae4a', trees, hill: 'grass', seaRight: SEA_RIGHT });
}

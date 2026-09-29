import * as THREE from 'three';
import type { Dresser, Decorator } from '../Decorator';
import type { Random } from '../../core/Random';
import { walkableHalfWidth } from '../../road/RoadMesh';
import { buildHill, buildRoundTree, buildCypress, buildBush } from '../../models/Nature';
import { buildLamp, buildBench } from '../../models/Props';
import { buildSkyscraper } from '../../models/CityProps';
import { buildLantern } from '../../models/StreetProps';
import { buildNeonSign } from '../../models/LandmarksCities';
import { buildWatchtower } from '../../models/LandmarksWorld';
import { buildBambooClump, buildCherryTree, buildJunk, buildKarst, buildLanternString, buildPagoda, buildPrayerFlags } from '../../models/LandmarksAsia';
import {
  buildBambooRaft, buildBellTower, buildBundBuilding, buildDingDing, buildHKTower, buildMoonBridge, buildPalaceWall, buildPanda, buildPearlTower, buildPillarPeak,
  buildPotala, buildSuzhouHouse, buildTeahouse, buildTempleOfHeaven, buildTerracottaWarrior, buildTiananmen, buildTwistTower, buildWarriorPit,
} from '../../models/LandmarksChina';
import { beside, furniture, hills, landmarkBeside, rows, waterBeside, type Span } from './cities';
import { landAlong } from './sketch';
import { tourBackground } from './tour';
import { peaksAround, wallUnderRoad } from './wonders';

const at = (span: Span, t: number): number => span.start + (span.end - span.start) * t;
const part = (span: Span, t0: number, t1: number): Span => ({ ...span, start: at(span, t0), end: at(span, t1) });

/** Red lantern strings across the street every `every` metres. */
function lanternStreet(d: Decorator, span: Span, rnd: Random, every: number): void {
  for (let s = span.start + 12; s < span.end - 10; s += every) {
    const f = d.sample(s);
    d.place(buildLanternString(rnd.fork(Math.round(s)), walkableHalfWidth(f.width, f.plaza) + 2, 6.5), d.roadMatrix(s, 0, 0, 0), false);
  }
}

// ————— the ten districts —————

// Beijing: through Tiananmen, beside the Forbidden City's red walls, to the Temple of Heaven.
const dressBeijing: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 140, '#8fb35a');
  const gs = at(span, 0.12);
  const gf = d.sample(gs);
  d.place(buildTiananmen(walkableHalfWidth(gf.width, gf.plaza) + 1), d.roadMatrix(gs, 0, 0, 0));
  d.landmark('Tiananmen, the Gate of Heavenly Peace', span.district, gs, gf.position.clone().setY(gf.position.y + 26));
  const wall = buildPalaceWall(40);
  for (let s = at(span, 0.18); s < at(span, 0.55); s += 40.5) for (const side of [-1, 1]) d.sideProp(wall, s, side, 4, 0.1);
  d.landmark('The walls of the Forbidden City', span.district, at(span, 0.35), beside(d, span, 0.35, 1, 8).p.setY(9));
  landmarkBeside(d, span, 0.8, 1, 90, buildTempleOfHeaven(), 'The Temple of Heaven', 26, 36);
  const trees = [0, 1].map((i) => buildCypress(rnd.fork(i)));
  for (let s = at(span, 0.6); s < span.end; s += 9) for (const side of [-1, 1]) d.sideProp(rnd.pick(trees), s, side, 3);
  lanternStreet(d, part(span, 0, 0.1), rnd, 14);
};

// The Great Wall at Badaling: the road rides the wall over the ridges, through watchtowers.
const dressBadaling: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 170, '#7f9a4a');
  wallUnderRoad(d, span.start, span.end, '#bfae8e', true, 12);
  for (let s = span.start; s < span.end + 30; s += 34) {
    const f = d.sample(Math.min(s, span.end));
    const top = f.position.y - 9;
    if (top > 2) d.place(buildHill(rnd.fork(Math.round(s)), rnd.range(34, 48), top, s % 68 < 34 ? 'forest' : 'rock'), d.worldMatrix(f.position.clone().setY(0), rnd.range(0, 6)), false);
  }
  const f0 = d.sample(span.start + 60);
  const tower = buildWatchtower(walkableHalfWidth(f0.width, 0) + 0.35 + 2.6);
  for (let s = span.start + 60; s < span.end - 30; s += 140) {
    d.place(tower, d.roadMatrix(s, 0, 0, 0));
    d.block(d.roadMatrix(s, 0, 0, 0), new THREE.Vector3(0, 10.5, 0), 4);
  }
  peaksAround(d, span.start, span.end, rnd, 16, [40, 80], [50, 110], 0.8);
  d.landmark('The Great Wall at Badaling', span.district, at(span, 0.45), d.sample(at(span, 0.45)).position.clone().add(new THREE.Vector3(0, 6, 0)));
};

// Xi'an: the Bell Tower and the terracotta army in its pits.
const dressXian: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 150, '#a8a878');
  landmarkBeside(d, span, 0.15, -1, 40, buildBellTower(), 'The Bell Tower of Xi’an', 24, 20);
  lanternStreet(d, part(span, 0, 0.3), rnd, 16);
  const pit = beside(d, span, 0.6, 1, 50);
  if (!d.nearRoad(pit.p, 30)) {
    const yaw = pit.face + Math.PI / 2;
    d.place(buildWarriorPit(70, 30), d.worldMatrix(pit.p, yaw), false);
    const warriors = [0, 1, 2, 3].map((i) => buildTerracottaWarrior(rnd.fork(i)));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i < 20; i++) {
        const p = pit.p.clone().addScaledVector(right, -32 + i * 3.3).addScaledVector(fwd, -9 + row * 6);
        d.place(rnd.pick(warriors), d.worldMatrix(p.setY(0.2), yaw + Math.PI / 2), false);
      }
    }
    d.landmark('The Terracotta Army', span.district, pit.s, pit.p.clone().setY(6));
  }
  const trees = [0, 1].map((i) => buildRoundTree(rnd.fork(i + 10), null));
  for (let s = span.start; s < span.end; s += 12) d.sideProp(rnd.pick(trees), s, -1, rnd.range(3, 10));
};

// Lhasa: the Potala Palace high above, prayer flags over the road, snow peaks all round.
const dressLhasa: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 170, '#a8a070', '#c8b890');
  landmarkBeside(d, span, 0.55, 1, 200, buildPotala(), 'The Potala Palace', 60, 70);
  for (let s = span.start + 30; s < span.end - 20; s += 70) {
    const f = d.sample(s);
    d.place(buildPrayerFlags(walkableHalfWidth(f.width, f.plaza) + 2, 6), d.roadMatrix(s, 0, 0, 0), false);
  }
  hills(d, span, rnd, 'snowpeak', 8, [220, 420], [100, 180], [140, 220]);
  const yak = [0, 1].map((i) => buildBush(rnd.fork(i + 5), '#3a3230'));
  for (let i = 0; i < 12; i++) d.sideProp(rnd.pick(yak), at(span, rnd.range(0.05, 0.95)), -1, rnd.range(8, 30), 0.2);
};

// Chengdu: pandas in the bamboo, a teahouse and red lanterns.
const dressChengdu: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 150, '#5f9a3a');
  const bamboo = [0, 1, 2].map((i) => buildBambooClump(rnd.fork(i), 12));
  for (let s = span.start; s < span.end; s += 3) for (const side of [-1, 1]) if (rnd.chance(0.7)) d.sideProp(rnd.pick(bamboo), s, side, rnd.range(1, 14));
  const panda = buildPanda();
  for (let i = 0; i < 10; i++) d.sideProp(panda, at(span, 0.3 + i * 0.04), i % 2 ? 1 : -1, rnd.range(1, 4), 0.2);
  d.landmark('The giant pandas of Chengdu', span.district, at(span, 0.4), beside(d, span, 0.4, 1, 6).p.setY(2));
  landmarkBeside(d, span, 0.8, -1, 24, buildTeahouse(rnd.fork(3)), 'A Sichuan teahouse', 6, 10);
  const lantern = buildLantern('#e0302a');
  for (let s = at(span, 0.7); s < span.end; s += 10) d.sideProp(lantern, s, 1, 0.8);
};

// Zhangjiajie: sandstone pillars rising out of the mist, like floating mountains.
const dressZhangjiajie: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 160, '#4f8a3a');
  let first = true;
  for (let i = 0; i < 26; i++) {
    const { p, s } = beside(d, span, rnd.range(0, 1), rnd.chance(0.5) ? -1 : 1, rnd.range(30, 170));
    if (d.nearRoad(p, 16)) continue;
    d.place(buildPillarPeak(rnd.fork(i), rnd.range(60, 140)), d.worldMatrix(p, rnd.range(0, 6)), false);
    if (first) d.landmark('The pillars of Zhangjiajie', span.district, s, p.clone().setY(60));
    first = false;
  }
  const pines = [0, 1].map((i) => buildCypress(rnd.fork(i + 20)));
  for (let s = span.start; s < span.end; s += 7) d.sideProp(rnd.pick(pines), s, rnd.chance(0.5) ? -1 : 1, rnd.range(2, 10));
};

// Guilin: the Li River between green karst hills, bamboo rafts and cormorant fishermen.
const dressGuilin: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 120, '#6fae3a');
  waterBeside(d, span, 1, 14, 90, '#4f9a8a');
  for (let i = 0; i < 24; i++) {
    const { p } = beside(d, span, rnd.range(0, 1), rnd.chance(0.3) ? -1 : 1, rnd.range(40, 200));
    if (!d.nearRoad(p, 30)) d.place(d.floats(buildKarst(rnd.fork(i), rnd.range(20, 34), rnd.range(40, 80))), d.worldMatrix(p, rnd.range(0, 6)), false);
  }
  const raft = d.floats(buildBambooRaft());
  let named = false;
  for (let t = 0.1; t < 0.95; t += 0.12) {
    const { p, face, s } = beside(d, span, t, 1, 36);
    d.place(raft, d.worldMatrix(p.setY(0.1), face + Math.PI / 2), false);
    if (!named) d.landmark('A cormorant fisherman on the Li River', span.district, s, p.clone().setY(3));
    named = true;
  }
  const bamboo = [0, 1].map((i) => buildBambooClump(rnd.fork(i + 30), 10));
  for (let s = span.start; s < span.end; s += 8) d.sideProp(rnd.pick(bamboo), s, 1, rnd.range(1, 5));
};

// Suzhou: white-walled canal houses, moon bridges and a pagoda by the lake.
const dressSuzhou: Dresser = (d, span, rnd) => {
  const houses = [0, 1, 2, 3].map((i) => buildSuzhouHouse(rnd.fork(i)));
  rows(d, part(span, 0, 0.6), rnd, () => rnd.pick(houses), [-1], 0.5, 2);
  waterBeside(d, part(span, 0, 0.6), 1, 4, 16, '#4f8a8a');
  rows(d, part(span, 0, 0.6), rnd, () => rnd.pick(houses), [1], 0.5, 22);
  const bridge = buildMoonBridge(16);
  let named = false;
  for (let t = 0.1; t < 0.6; t += 0.15) {
    const { p, face, s } = beside(d, span, t, 1, 12);
    d.place(bridge, d.worldMatrix(p.setY(0), face + Math.PI / 2), false);
    if (!named) d.landmark('A moon bridge over the canal', span.district, s, p.clone().setY(5));
    named = true;
  }
  waterBeside(d, part(span, 0.65, 1), 1, 14, 160, '#5a9aa8'); // West Lake
  // On the lake's near shore (the lake is 14–174 m out), not in it.
  landmarkBeside(d, span, 0.8, -1, 30, buildPagoda(), 'The Leifeng Pagoda by the lake', 14, 9, 1.6);
  lanternStreet(d, part(span, 0, 0.6), rnd, 20);
  const willows = [0, 1].map((i) => buildRoundTree(rnd.fork(i + 40), null));
  for (let s = at(span, 0.62); s < span.end; s += 10) d.sideProp(rnd.pick(willows), s, 1, 3);
  const cherry = buildCherryTree(rnd.fork(9));
  for (let s = at(span, 0.62); s < span.end; s += 22) d.sideProp(cherry, s, -1, 3);
};

// Shanghai: the Bund's stone banks facing Pudong's towers across the river.
const dressShanghai: Dresser = (d, span, rnd) => {
  const bund = [0, 1, 2, 3, 4].map((i) => buildBundBuilding(rnd.fork(i)));
  rows(d, span, rnd, () => rnd.pick(bund), [-1], 1, 3);
  waterBeside(d, span, 1, 12, 160, '#5a7a8a'); // the Huangpu
  const pearl = beside(d, span, 0.45, 1, 220);
  d.place(buildPearlTower(), d.worldMatrix(pearl.p, 0), false);
  d.landmark('The Oriental Pearl Tower', span.district, pearl.s, pearl.p.clone().setY(100));
  const twist = beside(d, span, 0.65, 1, 260);
  d.place(buildTwistTower(160), d.worldMatrix(twist.p, 0), false);
  d.landmark('The Shanghai Tower', span.district, twist.s, twist.p.clone().setY(120));
  for (let i = 0; i < 16; i++) {
    const { p } = beside(d, span, rnd.range(0.05, 0.95), 1, rnd.range(200, 320));
    d.place(buildSkyscraper(rnd.fork(i + 50), rnd.range(14, 22), rnd.range(50, 120), rnd.range(14, 22)), d.worldMatrix(p, rnd.range(0, 3)), false);
  }
  furniture(d, span, rnd, [buildLamp(rnd), buildBench()], [10, 16]);
};

// Hong Kong: neon canyons, trams, and junks with red sails in Victoria Harbour.
const dressHongKong: Dresser = (d, span, rnd) => {
  const towers = [0, 1, 2, 3, 4].map((i) => buildHKTower(rnd.fork(i)));
  rows(d, part(span, 0, 0.55), rnd, () => rnd.pick(towers), [-1, 1], 0.5, 2);
  const signs = [0, 1, 2, 3].map((i) => buildNeonSign(rnd.fork(i + 10)));
  for (let s = span.start + 4; s < at(span, 0.55); s += 5) d.sideProp(rnd.pick(signs), s, s % 10 < 5 ? -1 : 1, 2);
  const trams = [0, 1, 2].map((i) => buildDingDing(rnd.fork(i)));
  for (let s = span.start + 30; s < at(span, 0.55); s += 60) d.sideProp(rnd.pick(trams), s, -1, 0.8, 0.18);
  d.landmark('The neon of Kowloon', span.district, at(span, 0.3), d.sample(at(span, 0.3)).position.clone().add(new THREE.Vector3(0, 12, 0)));
  waterBeside(d, part(span, 0.55, 1), 1, 14, 260, '#3f7a9a'); // Victoria Harbour
  const junks = [0, 1, 2].map((i) => d.floats(buildJunk(rnd.fork(i + 20))));
  let named = false;
  for (let t = 0.6; t < 0.98; t += 0.07) {
    const { p, face, s } = beside(d, span, t, 1, rnd.range(40, 90));
    d.place(rnd.pick(junks), d.worldMatrix(p.setY(0), face + rnd.range(-1, 1)), false);
    if (!named) d.landmark('A junk in Victoria Harbour', span.district, s, p.clone().setY(8));
    named = true;
  }
  for (let i = 0; i < 18; i++) {
    const { p } = beside(d, span, rnd.range(0.6, 1), 1, rnd.range(300, 420));
    d.place(buildSkyscraper(rnd.fork(i + 70), rnd.range(14, 22), rnd.range(60, 160), rnd.range(14, 22)), d.worldMatrix(p, rnd.range(0, 3)), false);
  }
  hills(d, part(span, 0.55, 1), rnd, 'forest', 4, [140, 260], [80, 120], [80, 140]); // Victoria Peak
};

export const CHINA_DRESSERS = {
  beijing: dressBeijing,
  badaling: dressBadaling,
  xian: dressXian,
  lhasa: dressLhasa,
  chengdu: dressChengdu,
  zhangjiajie: dressZhangjiajie,
  guilin: dressGuilin,
  suzhou: dressSuzhou,
  shanghai: dressShanghai,
  hongkong: dressHongKong,
};

const SEA_RIGHT = new Set(['guilin', 'shanghai', 'hongkong']);

export function chinaBackground(d: Decorator, rnd: Random): void {
  const trees = [0, 1, 2].map((i) => (i === 2 ? buildCypress(rnd.fork(i)) : buildRoundTree(rnd.fork(i), null)));
  tourBackground(d, rnd, { grass: '#7fa84a', trees, hill: 'forest', hillHeight: [80, 170], seaRight: SEA_RIGHT });
}

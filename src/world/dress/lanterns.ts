import * as THREE from 'three';
import type { Dresser, Decorator } from '../Decorator';
import { createFrame } from '../../road/RoadPath';
import { walkableHalfWidth } from '../../road/RoadMesh';
import type { Random } from '../../core/Random';
import { ModelKit, Pattern } from '../../models/ModelKit';
import { buildHill, buildRoundTree } from '../../models/Nature';
import { buildPeak } from '../../models/LandmarksWorld';
import {
  buildBambooClump, buildCherryTree, buildChorten, buildFox, buildFuji, buildGreatWave, buildJunk, buildKarst, buildLanternString, buildPagoda, buildPrayerFlags, buildShophouse, buildStoneLantern, buildTorii,
} from '../../models/LandmarksAsia';
import { commonSky, landUnder, pierUnder } from './sketch';

/** A sloping hillside under the road, so mountain roads stand on ground. */
function groundUnder(d: Decorator, s0: number, s1: number, colour: string, pattern: number, step = 10): void {
  const kit = new ModelKit();
  const f = createFrame();
  for (let s = s0; s < s1; s += step) {
    d.sample(s, f);
    if (f.up.y < 0.7) continue;
    const half = walkableHalfWidth(f.width, f.plaza) + 3;
    const h = f.position.y - 0.4;
    if (h < 1) continue;
    const yaw = Math.atan2(f.tangent.x, f.tangent.z);
    kit.box(half * 2 + 10, h, step + 1, colour, { position: [f.position.x, h / 2 - 0.2, f.position.z], rotation: [0, yaw, 0], pattern });
  }
  if (!kit.isEmpty) d.place(kit.build(0.1, 4), new THREE.Matrix4(), false);
}

// 0 · Fushimi Inari: a tunnel of a thousand torii up the mountain, stone lanterns and foxes.
const dressTorii: Dresser = (d, span, rnd) => {
  const f = d.sample(span.start + 20);
  const half = walkableHalfWidth(f.width, 0) + 0.2;
  const torii = buildTorii(half);
  const big = buildTorii(half + 1.5, 9);
  d.place(big, d.roadMatrix(span.start + 8, 0, 0, 0));
  for (let s = span.start + 30; s < span.end - 20; s += 3.2) d.place(torii, d.roadMatrix(s, 0, 0, 0), false);
  const lantern = buildStoneLantern();
  const fox = buildFox();
  for (let s = span.start + 12; s < span.end; s += 26) {
    d.sideProp(lantern, s, -1, 1.2);
    d.sideProp(lantern, s + 13, 1, 1.2);
  }
  d.sideProp(fox, span.start + 14, -1, 2.5);
  d.sideProp(fox, span.start + 14, 1, 2.5);
  groundUnder(d, span.start, span.end, '#6fae3a', Pattern.Grass);
  // Cedar forest on the slopes.
  const cedar = new ModelKit().cylinder(0.3, 0.5, 6, 6, '#5a3a2a', { position: [0, 3, 0] }).cylinder(0.2, 2.6, 9, 7, '#3f7a3a', { position: [0, 9, 0], pattern: Pattern.Leaves }).build(0.1, 2);
  for (let s = span.start; s < span.end; s += 9) for (const side of [-1, 1]) {
    const fr = d.sample(s);
    const x = side * (walkableHalfWidth(fr.width, 0) + rnd.range(6, 16));
    d.place(cedar, d.roadMatrix(s, x, -0.3, rnd.range(0, 6), rnd.range(0.8, 1.3)), false);
  }
  d.landmark('Fushimi Inari', span.district, span.start + 80, d.sample(span.start + 80).position.clone().add(new THREE.Vector3(0, 5, 0)));
};

// 1 · Arashiyama: tall bamboo walls on both sides and a green light.
const dressBamboo: Dresser = (d, span, rnd) => {
  const clumps = [0, 1, 2, 3, 4].map((i) => buildBambooClump(rnd.fork(i), rnd.range(12, 18)));
  for (let s = span.start; s < span.end; s += 2.6) for (const side of [-1, 1]) {
    const fr = d.sample(s);
    const x = side * (walkableHalfWidth(fr.width, 0) + rnd.range(0.8, 3.5));
    d.place(rnd.pick(clumps), d.roadMatrix(s, x, -0.2, rnd.range(0, 6)), false);
  }
  // A low bamboo fence along the path.
  const fence = new ModelKit();
  for (let i = 0; i < 6; i++) fence.cylinder(0.08, 0.08, 1.1, 5, '#b8a36a', { position: [-1.5 + i * 0.6, 0.55, 0] });
  fence.box(3.4, 0.08, 0.08, '#8a7a4a', { position: [0, 0.9, 0] });
  const fenceGeo = fence.build(0.02, 1);
  for (let s = span.start; s < span.end; s += 3.4) for (const side of [-1, 1]) d.sideProp(fenceGeo, s, side, 0.3);
  groundUnder(d, span.start, span.end, '#5c9a32', Pattern.Leaves);
  d.landmark('Arashiyama bamboo', span.district, (span.start + span.end) / 2, d.sample((span.start + span.end) / 2).position.clone().add(new THREE.Vector3(0, 8, 0)));
};

// 2 · Hạ Long Bay: karst towers in emerald water, junks with red sails.
const dressHalong: Dresser = (d, span, rnd) => {
  for (let i = 0; i < 40; i++) {
    const s = rnd.range(span.start, span.end);
    const f = d.sample(s);
    const r = rnd.range(10, 26);
    const p = f.position.clone().addScaledVector(f.right, (rnd.chance(0.5) ? -1 : 1) * (r + rnd.range(18, 160))).setY(0);
    if (d.nearRoad(p, r + 8)) continue;
    d.place(buildKarst(rnd.fork(i), r, rnd.range(35, 90)), d.worldMatrix(p, rnd.range(0, 6)), false);
  }
  const junks = [0, 1, 2].map((i) => buildJunk(rnd.fork(i + 50)));
  for (let i = 0; i < 12; i++) {
    const p = d.scatter(rnd, 30, 260, 0.2, 20);
    const s = rnd.range(span.start, span.end);
    const f = d.sample(s);
    const q = p ?? f.position.clone().addScaledVector(f.right, rnd.range(30, 90)).setY(0.2);
    if (!d.nearRoad(q, 14)) d.place(rnd.pick(junks), d.worldMatrix(q.setY(0.2), rnd.range(0, 6), 1.4), false);
  }
  // Stilt piers and floating fishing houses.
  pierUnder(d, span.district, '#8a6a4a');
  const hut = new ModelKit().box(5, 3, 4, '#c8955a', { position: [0, 2.2, 0], pattern: Pattern.Planks }).gable(5.6, 1.6, 4.6, '#6b8f5a', { position: [0, 4.5, 0] }).box(7, 0.4, 6, '#7a5a3a', { position: [0, 0.4, 0], pattern: Pattern.Planks }).build(0.03, 3);
  for (let i = 0; i < 8; i++) {
    const s = rnd.range(span.start, span.end);
    const f = d.sample(s);
    const p = f.position.clone().addScaledVector(f.right, (i % 2 ? -1 : 1) * rnd.range(16, 40)).setY(0);
    if (!d.nearRoad(p, 10)) d.place(hut, d.worldMatrix(p, rnd.range(0, 6)), false);
  }
  d.landmark('Hạ Long Bay', span.district, span.start + 120, d.sample(span.start + 120).position.clone().add(new THREE.Vector3(0, 10, 0)));
};

// 3 · Hội An: yellow shophouses, silk lanterns strung across the street, a river of floating lights.
const dressLanternTown: Dresser = (d, span, rnd) => {
  pierUnder(d, span.district, '#b4a58a');
  const houses = [0, 1, 2, 3, 4].map((i) => buildShophouse(rnd.fork(i)));
  for (let s = span.start + 6; s < span.end - 6; s += 8.5) for (const side of [-1, 1]) {
    const fr = d.sample(s);
    if (fr.up.y < 0.8) continue;
    const x = side * (walkableHalfWidth(fr.width, fr.plaza) + 4.4);
    d.place(rnd.pick(houses), d.roadMatrix(s, x, 0, side > 0 ? Math.PI / 2 : -Math.PI / 2));
    d.block(d.roadMatrix(s, x, 0, 0), new THREE.Vector3(0, 4, 0), 4.5);
  }
  for (let s = span.start + 10; s < span.end - 10; s += 11) {
    const fr = d.sample(s);
    const half = walkableHalfWidth(fr.width, fr.plaza) + 2;
    d.place(buildLanternString(rnd.fork(Math.round(s)), half, 7.5), d.roadMatrix(s, 0, 0, 0), false);
  }
  // Floating paper lanterns on the river beside the town.
  const floater = new ModelKit().box(0.8, 0.5, 0.8, '#f4a13b', { position: [0, 0.3, 0], nightGlow: 1 }).box(0.9, 0.12, 0.9, '#e0432f', { position: [0, 0.05, 0] }).build(0, 1);
  for (let i = 0; i < 60; i++) {
    const s = rnd.range(span.start, span.end);
    const f = d.sample(s);
    const p = f.position.clone().addScaledVector(f.right, (rnd.chance(0.5) ? -1 : 1) * rnd.range(24, 60)).setY(0.4);
    d.addFloater(floater, p, rnd.range(-0.2, 0.2), rnd.range(-0.2, 0.2), 0.3);
  }
  d.landmark('Hội An lanterns', span.district, (span.start + span.end) / 2, d.sample((span.start + span.end) / 2).position.clone().add(new THREE.Vector3(0, 6, 0)));
};

// 4 · Himalayan pass: switchbacks under prayer flags, chortens and snow peaks.
const dressHimalaya: Dresser = (d, span, rnd) => {
  groundUnder(d, span.start, span.end, '#8a8f9a', Pattern.Stone, 8);
  for (let s = span.start + 20; s < span.end; s += 16) {
    const fr = d.sample(s);
    if (fr.up.y < 0.85) continue;
    const half = walkableHalfWidth(fr.width, 0) + 0.8;
    d.place(buildPrayerFlags(half, 6.5), d.roadMatrix(s, 0, 0, 0), false);
  }
  const chorten = buildChorten();
  for (let s = span.start + 60; s < span.end; s += 140) d.sideProp(chorten, s, s % 280 < 140 ? -1 : 1, 4, 0.18, 3, 5);
  for (let i = 0; i < 26; i++) {
    const s = rnd.range(span.start, span.end);
    const f = d.sample(s);
    const r = rnd.range(60, 130);
    const p = f.position.clone().addScaledVector(f.right, (rnd.chance(0.5) ? -1 : 1) * (r + rnd.range(40, 200))).setY(0);
    if (d.nearRoad(p, r + 20)) continue;
    d.place(buildHill(rnd.fork(i), r, rnd.range(f.position.y + 30, f.position.y + 120), 'snowpeak'), d.worldMatrix(p, rnd.range(0, 6)), false);
  }
  d.landmark('Himalayan pass', span.district, (span.start + span.end) / 2, d.sample((span.start + span.end) / 2).position.clone().add(new THREE.Vector3(0, 6, 0)));
};

// 5 · The Great Wave: the road dives to the sea and rolls through a Hokusai curl.
const dressWave: Dresser = (d, span, rnd) => {
  const rollStart = d.findInvertedRange(span.start, span.end);
  const mid = rollStart.start <= rollStart.end ? (rollStart.start + rollStart.end) / 2 : (span.start + span.end) / 2;
  const f = d.sample(mid);
  const yaw = Math.atan2(-f.tangent.x, -f.tangent.z);
  const length = 180;
  const centre = f.position.clone();
  d.place(buildGreatWave(length, 30), d.worldMatrix(centre.clone().setY(Math.max(0, centre.y - 15)), yaw), false);
  // A long swell of blue sea beneath the wave.
  d.place(new ModelKit().box(1, 1, 1, '#2f6db0').build(0, 1), d.worldMatrix(centre.clone().setY(0.5), yaw, new THREE.Vector3(70, 1, length + 60)), false);
  // Fuji small on the horizon, as in the print.
  const back = f.tangent.clone().setY(0).normalize();
  d.place(buildFuji(60, 45), d.worldMatrix(centre.clone().addScaledVector(back, 520).setY(0), 0), false);
  // Spray.
  const spray = new ModelKit().blob(1, '#f6f3ec', { detail: 0 }).build(0, 1);
  for (let i = 0; i < 40; i++) {
    const p = centre.clone().add(new THREE.Vector3(rnd.range(-30, 30), rnd.range(2, 26), rnd.range(-60, 60)));
    d.addFloater(spray, p, rnd.range(0, 1), rnd.range(-1, 1), 0.8);
  }
  d.landmark('The Great Wave', span.district, mid, centre.clone().add(new THREE.Vector3(0, 12, 0)));
};

// 6 · Mount Fuji: a cherry-blossom avenue to the Chūreitō pagoda under the mountain.
const dressFuji: Dresser = (d, span, rnd) => {
  groundUnder(d, span.start, span.end, '#8cc63f', Pattern.Grass);
  const cherries = [0, 1, 2, 3].map((i) => buildCherryTree(rnd.fork(i)));
  for (let s = span.start; s < span.end; s += 9) for (const side of [-1, 1]) {
    const fr = d.sample(s);
    d.place(rnd.pick(cherries), d.roadMatrix(s, side * (walkableHalfWidth(fr.width, 0) + rnd.range(1.5, 5)), -0.2, rnd.range(0, 6)), false);
  }
  const petal = new ModelKit().box(0.25, 0.04, 0.2, '#f7b8cf').build(0, 1);
  for (let i = 0; i < 80; i++) {
    const s = rnd.range(span.start, span.end);
    const f = d.sample(s);
    d.addFloater(petal, f.position.clone().add(new THREE.Vector3(rnd.range(-12, 12), rnd.range(2, 9), rnd.range(-12, 12))), rnd.range(0, 3), rnd.range(-2, 2), 1.5);
  }
  const end = d.sample(span.end - 30);
  const ahead = end.tangent.clone().setY(0).normalize();
  const side = end.right.clone().setY(0).normalize();
  const pagodaPos = end.position.clone().addScaledVector(side, -40).setY(Math.max(0, end.position.y - 1));
  d.place(buildPagoda(), d.worldMatrix(pagodaPos, Math.atan2(side.x, side.z)));
  d.blockWorld(pagodaPos.clone().add(new THREE.Vector3(0, 10, 0)), 8);
  d.place(buildFuji(420, 330), d.worldMatrix(end.position.clone().addScaledVector(ahead, 1100).setY(0), 0), false);
  d.landmark('Mount Fuji', span.district, span.end - 30, pagodaPos.clone().add(new THREE.Vector3(0, 12, 0)));
  const lamp = buildStoneLantern();
  for (let s = span.start + 10; s < span.end; s += 30) d.sideProp(lamp, s, s % 60 < 30 ? -1 : 1, 0.8);
};

export const LANTERN_DRESSERS = {
  torii: dressTorii,
  bamboo: dressBamboo,
  halong: dressHalong,
  lanterntown: dressLanternTown,
  himalaya: dressHimalaya,
  greatwave: dressWave,
  fuji: dressFuji,
};

export function lanternsBackground(d: Decorator, rnd: Random): void {
  commonSky(d, rnd, 30);
  landUnder(d, '#7fb85a', Pattern.Grass, 120);
  // Blue ranges on the horizon and a few blossoming groves.
  for (let i = 0; i < 18; i++) {
    const p = d.scatter(rnd, 700, 1500, 0, 250);
    if (p) d.place(buildPeak(rnd.fork(i), rnd.range(120, 220), rnd.range(140, 300), 0.4), d.worldMatrix(p, rnd.range(0, 6)), false);
  }
  const tree = buildRoundTree(rnd, '#f7b8cf');
  for (let i = 0; i < 24; i++) {
    const p = d.scatter(rnd, 120, 500, 0, 30);
    if (p) d.place(tree, d.worldMatrix(p, rnd.range(0, 6), 1.4), false);
  }
}

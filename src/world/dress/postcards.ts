import * as THREE from 'three';
import type { Decorator, Dresser } from '../Decorator';
import { walkableHalfWidth } from '../../road/RoadMesh';
import type { Random } from '../../core/Random';
import { ModelKit, Pattern } from '../../models/ModelKit';
import { buildHill, buildPalm, buildRoundTree } from '../../models/Nature';
import { buildPeak } from '../../models/LandmarksWorld';
import { buildLanternString, buildPagoda, buildStoneLantern } from '../../models/LandmarksAsia';
import { buildTrain } from '../../models/LandmarksSriLanka';
import { buildCloudWall, buildCycladic, buildFelucca, buildMachiya, buildPyramid, buildSphinx, buildTeaHut, buildTempleOfTooth, buildWaterfall, buildWindmill } from '../../models/LandmarksPostcards';
import { commonSky, landAlong } from './sketch';

function hills(d: Decorator, s0: number, s1: number, rnd: Random, kind: Parameters<typeof buildHill>[3], count: number, dist: [number, number], size: [number, number], height: [number, number]): void {
  for (let i = 0; i < count; i++) {
    const s = rnd.range(s0, s1);
    const f = d.sample(s);
    const r = rnd.range(size[0], size[1]);
    const p = f.position.clone().addScaledVector(f.right, (rnd.chance(0.5) ? -1 : 1) * (rnd.range(dist[0], dist[1]) + r)).setY(0);
    if (d.nearRoad(p, r + 14)) continue;
    d.place(buildHill(rnd.fork(i), r, rnd.range(height[0], height[1]), kind), d.worldMatrix(p, rnd.range(0, 6)), false);
  }
}

// 0 · The Nile at Giza: date palms along the river road, feluccas, the three pyramids and the Sphinx.
const dressNile: Dresser = (d, span, rnd) => {
  const palms = [0, 1, 2].map((i) => buildPalm(rnd.fork(i)));
  for (let s = span.start; s < span.end; s += rnd.range(7, 12)) {
    const fr = d.sample(s);
    d.place(rnd.pick(palms), d.roadMatrix(s, -(walkableHalfWidth(fr.width, 0) + rnd.range(1.5, 6)), -0.1, rnd.range(0, 6)), false);
  }
  // The river on the right, with sails.
  const mid = d.sample((span.start + span.end) / 2);
  const river = new ModelKit().box(1, 1, 1, '#3f8fb0').build(0, 1);
  const yaw = Math.atan2(mid.tangent.x, mid.tangent.z);
  d.place(river, d.worldMatrix(mid.position.clone().addScaledVector(mid.right, 60).setY(0.3), yaw, new THREE.Vector3(70, 1, span.end - span.start + 80)), false);
  const boat = buildFelucca();
  for (let i = 0; i < 9; i++) {
    const f = d.sample(rnd.range(span.start, span.end));
    const p = f.position.clone().addScaledVector(f.right, rnd.range(38, 80)).setY(0.4);
    d.addFloater(boat, p, rnd.range(-0.05, 0.05), rnd.range(-0.1, 0.1), 0.2);
  }
  // The pyramids across the sand, with the Sphinx in front.
  const left = mid.right.clone().negate().setY(0).normalize();
  const along = mid.tangent.clone().setY(0).normalize();
  const giza = mid.position.clone().addScaledVector(left, 170).setY(0);
  for (const [off, size] of [[-80, 140], [40, 120], [130, 70]] as const) {
    const p = giza.clone().addScaledVector(along, off).addScaledVector(left, size * 0.3);
    if (!d.nearRoad(p, size * 0.8)) d.place(buildPyramid(size, size * 0.64), d.worldMatrix(p, 0.3), false);
  }
  const sphinxAt = giza.clone().addScaledVector(left, -70).addScaledVector(along, -20);
  if (!d.nearRoad(sphinxAt, 24)) d.place(buildSphinx(), d.worldMatrix(sphinxAt, Math.atan2(-left.x, -left.z)), false);
  d.landmark('The pyramids of Giza', span.district, (span.start + span.end) / 2, giza.clone().add(new THREE.Vector3(0, 50, 0)));
  // Sand dunes on the far side.
  hills(d, span.start, span.end, rnd, 'sandstone', 10, [60, 200], [30, 70], [8, 20]);
};

// 1 · Santorini: white houses tumbling down the caldera, blue domes and windmills.
const dressSantorini: Dresser = (d, span, rnd) => {
  const houses = [0, 1, 2, 3, 4, 5].map((i) => buildCycladic(rnd.fork(i)));
  // Whitewashed terrace walls from the ground up to each house, so the village steps down the caldera.
  const terrace = new ModelKit().box(1, 1, 1, '#e9e2d4', { pattern: Pattern.Stone }).build(0.02, 9);
  const at = new THREE.Vector3();
  const standOnTerrace = (m: THREE.Matrix4, yaw: number, w: number): void => {
    at.setFromMatrixPosition(m);
    if (at.y < 0.6) return;
    d.place(terrace, d.worldMatrix(at.clone().setY(at.y / 2), yaw, new THREE.Vector3(w, at.y, w)), false);
  };
  for (let s = span.start + 6; s < span.end - 6; s += rnd.range(10, 15)) {
    const fr = d.sample(s);
    if (fr.up.y < 0.8) continue;
    const half = walkableHalfWidth(fr.width, fr.plaza);
    const yaw = Math.atan2(fr.tangent.x, fr.tangent.z);
    for (let row = 0; row < 2; row++) {
      if (row && rnd.chance(0.4)) continue;
      const m = d.roadMatrix(s + rnd.range(-2, 2), -(half + 4 + row * 7), -row * 2.4, Math.PI / 2 + rnd.range(-0.2, 0.2));
      d.place(rnd.pick(houses), m);
      standOnTerrace(m, yaw, 7);
    }
    const m = d.roadMatrix(s, half + 5, 0.4, -Math.PI / 2);
    d.place(rnd.pick(houses), m);
    standOnTerrace(m, yaw, 7);
    d.block(d.roadMatrix(s, half + 5, 0, 0), new THREE.Vector3(0, 3, 0), 3.5);
  }
  const mill = buildWindmill();
  for (let s = span.start + 40; s < span.end; s += 90) d.sideProp(mill, s, 1, 10, 0.4, 3, 8);
  // The caldera cliff and the blue sea below.
  landAlong(d, span.start, span.end, 60, '#c9b79a', '#b5a488');
  const mid = d.sample((span.start + span.end) / 2);
  d.landmark('Santorini', span.district, (span.start + span.end) / 2, mid.position.clone().add(new THREE.Vector3(0, 6, 0)));
};

// 2 · Kyoto at night: machiya lanes lit by lanterns, the Yasaka pagoda.
const dressKyoto: Dresser = (d, span, rnd) => {
  const houses = [0, 1, 2, 3].map((i) => buildMachiya(rnd.fork(i)));
  for (let s = span.start + 5; s < span.end - 5; s += 7.5) for (const side of [-1, 1]) {
    const fr = d.sample(s);
    if (fr.up.y < 0.8) continue;
    const x = side * (walkableHalfWidth(fr.width, fr.plaza) + 4.2);
    d.place(rnd.pick(houses), d.roadMatrix(s, x, 0, side > 0 ? -Math.PI / 2 : Math.PI / 2));
    d.block(d.roadMatrix(s, x, 0, 0), new THREE.Vector3(0, 3, 0), 4);
  }
  for (let s = span.start + 14; s < span.end - 10; s += 18) {
    const fr = d.sample(s);
    d.place(buildLanternString(rnd.fork(Math.round(s) + 7), walkableHalfWidth(fr.width, fr.plaza) + 2, 6.5), d.roadMatrix(s, 0, 0, 0), false);
  }
  const lamp = buildStoneLantern();
  for (let s = span.start + 9; s < span.end; s += 22) d.sideProp(lamp, s, s % 44 < 22 ? -1 : 1, 0.5);
  const end = d.sample(span.end - 40);
  const side = end.right.clone().setY(0).normalize();
  const pag = end.position.clone().addScaledVector(side, 32).setY(Math.max(0, end.position.y - 1));
  d.place(buildPagoda(), d.worldMatrix(pag, Math.atan2(-side.x, -side.z), 1.2));
  d.blockWorld(pag.clone().add(new THREE.Vector3(0, 10, 0)), 9);
  d.landmark('Yasaka pagoda by night', span.district, span.end - 40, pag.clone().add(new THREE.Vector3(0, 16, 0)));
  // Fireflies over the lanes.
  const fly = new ModelKit().blob(0.1, '#fff3a0', { detail: 0, nightGlow: 1 }).build(0, 1);
  for (let i = 0; i < 50; i++) {
    const f = d.sample(rnd.range(span.start, span.end));
    d.addFloater(fly, f.position.clone().add(new THREE.Vector3(rnd.range(-10, 10), rnd.range(1.5, 5), rnd.range(-10, 10))), 0, rnd.range(-1, 1), 0.8);
  }
};

// 3 · Kandy in the rain: round the lake past the cloud wall to the Temple of the Tooth.
const dressKandy: Dresser = (d, span, rnd) => {
  const mid = d.sample((span.start + span.end) / 2);
  const inward = mid.right.clone().setY(0).normalize();
  // The lake on the inside of the bend.
  const lake = mid.position.clone().addScaledVector(inward, 55).setY(0.3);
  d.place(new ModelKit().cylinder(1, 1, 0.4, 32, '#4f7f9a').build(0, 1), d.worldMatrix(lake, 0, new THREE.Vector3(48, 1, 70)), false);
  // Cloud wall along the lake side of the road.
  const wall = buildCloudWall(10);
  for (let s = span.start + 10; s < span.end - 10; s += 10.2) d.sideProp(wall, s, 1, 0.8, 0.18);
  const trees = [0, 1, 2].map((i) => buildRoundTree(rnd.fork(i), null));
  for (let s = span.start; s < span.end; s += rnd.range(9, 16)) d.sideProp(rnd.pick(trees), s, -1, rnd.range(2, 6));
  const templeAt = mid.position.clone().addScaledVector(inward, -70).setY(0);
  if (!d.nearRoad(templeAt, 30)) {
    d.place(buildTempleOfTooth(), d.worldMatrix(templeAt, Math.atan2(inward.x, inward.z)));
    d.blockWorld(templeAt.clone().add(new THREE.Vector3(0, 6, 0)), 22);
  }
  d.landmark('Temple of the Tooth, Kandy', span.district, (span.start + span.end) / 2, templeAt.clone().add(new THREE.Vector3(0, 14, 0)));
  hills(d, span.start, span.end, rnd, 'grass', 14, [90, 220], [40, 90], [30, 70]);
};

// 4 · Ella in the rain: tea terraces, a train on the hillside, the Ella Gap and a waterfall.
const dressElla: Dresser = (d, span, rnd) => {
  hills(d, span.start, span.end, rnd, 'tea', 20, [16, 80], [30, 60], [20, 50]);
  const hut = buildTeaHut();
  for (let s = span.start + 30; s < span.end; s += 70) d.sideProp(hut, s, s % 140 < 70 ? -1 : 1, 8, 0.2, 3, 3);
  const mid = d.sample((span.start + span.end) / 2);
  const out = mid.right.clone().setY(0).normalize();
  // The Ella Gap: two peaks with the lowlands between.
  for (const k of [-1, 1]) {
    const p = mid.position.clone().addScaledVector(out, 260).addScaledVector(mid.tangent.clone().setY(0).normalize(), k * 90).setY(0);
    d.place(buildPeak(rnd.fork(k + 3), 80, 170, 0.8), d.worldMatrix(p, rnd.range(0, 6)), false);
  }
  const fall = mid.position.clone().addScaledVector(out, -110).setY(0);
  if (!d.nearRoad(fall, 40)) {
    d.place(buildWaterfall(34), d.worldMatrix(fall, Math.atan2(out.x, out.z)), false);
    d.landmark('Ella Gap', span.district, (span.start + span.end) / 2, mid.position.clone().addScaledVector(out, 60).add(new THREE.Vector3(0, 14, 0)));
  }
  // The blue train winding across the hillside.
  const train = buildTrain(5);
  const trainAt = mid.position.clone().addScaledVector(out, 70).setY(12);
  if (!d.nearRoad(trainAt, 20)) d.place(train.geometry, d.worldMatrix(trainAt, Math.atan2(mid.tangent.x, mid.tangent.z)), false);
};

export const POSTCARD_DRESSERS = {
  nile: dressNile,
  santorini: dressSantorini,
  kyoto: dressKyoto,
  kandy: dressKandy,
  ella: dressElla,
};

export function postcardsBackground(d: Decorator, rnd: Random): void {
  commonSky(d, rnd, 24);
  landAlong(d, 0, d.path.length, 200, '#9dbf6a', '#e3c07a');
  for (let i = 0; i < 14; i++) {
    const p = d.scatter(rnd, 700, 1500, 0, 250);
    if (p) d.place(buildPeak(rnd.fork(i), rnd.range(120, 220), rnd.range(120, 260), 0.5), d.worldMatrix(p, rnd.range(0, 6)), false);
  }
}

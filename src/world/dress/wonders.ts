import * as THREE from 'three';
import type { Dresser, Decorator } from '../Decorator';
import { createFrame } from '../../road/RoadPath';
import { walkableHalfWidth } from '../../road/RoadMesh';
import { Random } from '../../core/Random';
import { ModelKit, Pattern } from '../../models/ModelKit';
import { buildCypress, buildHill, buildPalm, buildRoundTree } from '../../models/Nature';
import { buildLamp } from '../../models/Props';
import {
  buildCamel, buildChichenItza, buildCliff, buildColosseum, buildIncaHut, buildLlama, buildMerlon, buildMughalGarden, buildPeak, buildRedeemer, buildTajMahal, buildTerrace, buildTreasury, buildWatchtower,
} from '../../models/LandmarksWorld';
import { buildLantern } from '../../models/StreetProps';
import { commonSky, landUnder } from './sketch';

/** Stone body under the road down to the ground, plus crenellations on both edges. */
/** `maxHeight` caps how far the stone body reaches down; `onlyBelow` skips spots where the road is higher than that. */
function wallUnderRoad(d: Decorator, s0: number, s1: number, colour: string, merlons: boolean, maxHeight = Infinity, onlyBelow = Infinity): void {
  const kit = new ModelKit();
  const f = createFrame();
  const step = 4;
  const merlon = buildMerlon();
  for (let s = s0; s < s1; s += step) {
    d.sample(s + step / 2, f);
    const half = walkableHalfWidth(f.width, 0) + 0.35;
    const top = f.position.y - 1.3;
    const yaw = Math.atan2(f.tangent.x, f.tangent.z);
    const h = Math.min(top, maxHeight);
    if (h > 1 && top < onlyBelow) kit.box(half * 2 + 1.2, h, step + 0.1, colour, { position: [f.position.x, top - h / 2, f.position.z], rotation: [0, yaw, 0], pattern: Pattern.Stone });
    if (merlons) {
      for (const side of [-1, 1]) {
        for (let k = 0; k < 2; k++) d.place(merlon, d.roadMatrix(s + k * 2, side * (half - 0.2), 0.85, 0), false);
      }
    }
  }
  if (!kit.isEmpty) d.place(kit.build(0.05, 3), new THREE.Matrix4(), false);
}

/** Mountains near a span (keeps clear of the road). */
function peaksAround(d: Decorator, s0: number, s1: number, rnd: Random, count: number, radius: [number, number], height: [number, number], green: number): void {
  for (let i = 0; i < count; i++) {
    const s = rnd.range(s0, s1);
    const f = d.sample(s);
    const r = rnd.range(radius[0], radius[1]);
    const p = f.position.clone().addScaledVector(f.right, (rnd.chance(0.5) ? -1 : 1) * (r + rnd.range(25, 90))).setY(0);
    if (d.nearRoad(p, r + 12)) continue;
    d.place(buildPeak(rnd.fork(i), r, rnd.range(height[0], height[1]), green), d.worldMatrix(p, rnd.range(0, 6)), false);
  }
}

const dressGreatWall: Dresser = (d, span, rnd) => {
  wallUnderRoad(d, span.start, span.end, '#bfae8e', true, 10);
  // Ridge hills the wall rides along.
  for (let s = span.start; s < span.end + 30; s += 34) {
    const f = d.sample(Math.min(s, span.end));
    const top = f.position.y - 9;
    d.place(buildHill(rnd.fork(Math.round(s)), rnd.range(34, 48), top, s % 68 < 34 ? 'grass' : 'rock'), d.worldMatrix(f.position.clone().setY(0), rnd.range(0, 6)), false);
  }
  const tower = buildWatchtower(5 + 0.35 + 2.6);
  for (let s = span.start + 40; s < span.end - 20; s += 120) {
    d.place(tower, d.roadMatrix(s, 0, 0, 0));
    const m = d.roadMatrix(s, 0, 0, 0);
    d.block(m, new THREE.Vector3(0, 10.5, 0), 4);
  }
  peaksAround(d, span.start, span.end, rnd, 18, [40, 80], [50, 110], 0.8);
  d.landmark('Great Wall', span.district, span.start + 160, d.sample(span.start + 160).position.clone().add(new THREE.Vector3(0, 6, 0)));
};

const dressColosseum: Dresser = (d, span) => {
  const lapLen = Math.PI * 2 * 40;
  const lapStart = span.start + 60 + 30 + 25;
  const centre = d.centroid(lapStart, lapStart + lapLen).setY(0);
  d.place(buildColosseum(66, 58), d.worldMatrix(centre, 0));
  d.landmark('Colosseum', span.district, lapStart + lapLen / 2, centre.clone().setY(18));
  wallUnderRoad(d, span.start, span.start + 60, '#d9c8a8', false);
  // Umbrella pines around the ring.
  const rnd = new Random(5);
  const pine = new ModelKit().cylinder(0.4, 0.6, 9, 6, '#7a4a2a', { position: [0, 4.5, 0] }).blob(4, '#4f9a4a', { position: [0, 10, 0], scale: [1.6, 0.5, 1.6], detail: 1, pattern: Pattern.Leaves }).build(0.1, 3);
  for (let i = 0; i < 20; i++) {
    const a = rnd.range(0, Math.PI * 2);
    const p = centre.clone().add(new THREE.Vector3(Math.cos(a) * rnd.range(95, 160), 0, Math.sin(a) * rnd.range(95, 160)));
    if (!d.nearRoad(p, 12)) d.place(pine, d.worldMatrix(p, rnd.range(0, 6)), false);
  }
};

const dressTaj: Dresser = (d, span, rnd) => {
  const circleLen = Math.PI * 2 * 72 * 0.8;
  const cEnd = span.end - 60 - 25;
  const cStart = cEnd - circleLen;
  // Centre of the circle arc: average of three points on it and the known radius.
  const a = d.sample(cStart).position;
  const b = d.sample((cStart + cEnd) / 2).position;
  const c = d.sample(cEnd).position;
  const centre = circumcentreXZ(a, b, c);
  d.place(buildTajMahal(), d.worldMatrix(centre, 0));
  d.blockWorld(centre.clone().setY(50), 22);
  d.landmark('Taj Mahal', span.district, (cStart + cEnd) / 2, centre.clone().setY(38));
  // Garden and reflecting pool on the far side from the approach.
  const approach = d.sample(cStart - 10).tangent.clone().setY(0).normalize();
  const gardenLen = 170;
  const gardenCentre = centre.clone().addScaledVector(approach, -(gardenLen / 2 + 60));
  d.place(buildMughalGarden(gardenLen), d.worldMatrix(gardenCentre, Math.atan2(approach.x, approach.z)), false);
  const lamp = buildLantern('#f4d23b');
  for (let s = cStart; s < cEnd; s += 18) d.place(lamp, d.roadMatrix(s, -7, 6, 0), false);
  const cypress = buildCypress(rnd);
  for (let i = 0; i < 30; i++) {
    const ang = rnd.range(0, Math.PI * 2);
    const p = centre.clone().add(new THREE.Vector3(Math.cos(ang) * rnd.range(100, 180), 0, Math.sin(ang) * rnd.range(100, 180)));
    if (!d.nearRoad(p, 10)) d.place(cypress, d.worldMatrix(p, 0, 1.6), false);
  }
  // Yamuna river behind.
  const river = centre.clone().addScaledVector(approach, 150);
  d.place(new ModelKit().box(1, 1, 1, '#6fd0d0').build(0, 1), d.worldMatrix(river.setY(0.3), Math.atan2(approach.x, approach.z) + Math.PI / 2, new THREE.Vector3(60, 0.6, 900)), false);
};

const dressMachu: Dresser = (d, span, rnd) => {
  // Mountain under the switchbacks.
  const zigStart = span.start + 50;
  const zigEnd = span.end - 90;
  const centre = d.centroid(zigStart, zigEnd).setY(0);
  const topY = d.maxY(span.start, span.end);
  const summit = d.sample(span.end - 45);
  // Terraces stepping down the slope beside the final straight.
  const tc = summit.position.clone().addScaledVector(summit.right, 45).setY(0);
  for (let i = 0; i < 9; i++) {
    const h = topY - 2 - i * 4;
    if (h < 4) break;
    d.place(buildTerrace(22 + i * 6, 1.8, 4), d.worldMatrix(tc.clone().setY(h - 4), Math.atan2(summit.right.x, summit.right.z) + Math.PI), false);
  }
  // The citadel: stone huts on a grassy saddle.
  const saddle = summit.position.clone().addScaledVector(summit.right, 40).setY(topY - 6);
  d.place(new ModelKit().cylinder(40, 45, topY - 6, 12, '#8cc63f', { position: [0, -(topY - 6) / 2, 0], pattern: Pattern.Grass }).build(0.2, 4), d.worldMatrix(saddle, 0), false);
  const huts = [0, 1, 2].map((i) => buildIncaHut(rnd.fork(i)));
  for (let i = 0; i < 22; i++) {
    const p = saddle.clone().add(new THREE.Vector3(rnd.range(-30, 30), 0.2, rnd.range(-30, 30)));
    d.place(rnd.pick(huts), d.worldMatrix(p, rnd.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2])), false);
  }
  const llamas = ['#f6f0e4', '#c8955a', '#6a4a3a'].map(buildLlama);
  for (let i = 0; i < 10; i++) d.place(rnd.pick(llamas), d.worldMatrix(saddle.clone().add(new THREE.Vector3(rnd.range(-35, 35), 0.2, rnd.range(-35, 35))), rnd.range(0, 6), 1.2), false);
  d.landmark('Machu Picchu', span.district, span.end - 45, saddle.clone().setY(topY - 2));
  // Huayna Picchu: the steep green peak behind the city.
  const huayna = saddle.clone().addScaledVector(summit.right, 90).setY(0);
  if (!d.nearRoad(huayna, 60)) d.place(buildPeak(rnd, 45, topY + 70, 1), d.worldMatrix(huayna, 0), false);
  // Mountain body under the hairpins.
  d.place(buildHill(rnd, 90, Math.max(10, d.minY(zigStart, zigEnd) - 4), 'jungle'), d.worldMatrix(centre, 0), false);
  peaksAround(d, span.start, span.end, rnd, 12, [50, 90], [120, 220], 0.9);
};

const dressRedeemer: Dresser = (d, span, rnd) => {
  const helixLen = Math.PI * 2 * 64 * 1.2;
  const hStart = span.start + (30 / 180) * Math.PI * 90 + 20 + 25;
  const centre = d.centroid(hStart, hStart + helixLen).setY(0);
  const top = d.maxY(span.start, span.end);
  const peakTop = top - 18;
  d.place(buildPeak(rnd, 48, peakTop, 0.9), d.worldMatrix(centre, 0));
  // The statue faces the final straight.
  const exit = d.sample(span.end - 35);
  const toRoad = exit.position.clone().sub(centre).setY(0).normalize();
  d.place(buildRedeemer(), d.worldMatrix(centre.clone().setY(peakTop - 1), Math.atan2(toRoad.x, toRoad.z)));
  d.blockWorld(centre.clone().setY(peakTop + 22), 7);
  d.landmark('Christ the Redeemer', span.district, span.end - 35, centre.clone().setY(peakTop + 22));
  // Sugarloaf and the bay.
  const sugar = centre.clone().add(new THREE.Vector3(220, 0, -160));
  if (!d.nearRoad(sugar, 80)) {
    const k = new ModelKit().blob(1, '#a6a3b8', { scale: [45, 110, 38], position: [0, 40, 0], detail: 2, roughness: 0.05, pattern: Pattern.Stone }).blob(1, '#6fae3a', { scale: [48, 20, 42], position: [0, 8, 0], detail: 1, pattern: Pattern.Leaves });
    d.place(k.build(0.3, 2), d.worldMatrix(sugar, 0), false);
  }
  const palm = buildPalm(rnd);
  for (let s = span.start + 5; s < span.end; s += rnd.range(10, 18)) d.sideProp(palm, s, s % 2 > 1 ? 1 : -1, 1.2, 0.18, 1.2, 6);
};

const dressChichen: Dresser = (d, span, rnd) => {
  // The pyramid sits under the top of the flyover.
  const f = createFrame();
  let topS = span.start;
  let topY = -Infinity;
  for (let s = span.end - 280; s < span.end; s += 1) {
    const y = d.sample(s, f).position.y;
    if (y > topY) {
      topY = y;
      topS = s;
    }
  }
  const top = d.sample(topS);
  const yaw = Math.atan2(top.tangent.x, top.tangent.z);
  d.place(buildChichenItza(58, 26), d.worldMatrix(top.position.clone().setY(0), yaw));
  d.landmark('El Castillo', span.district, topS, top.position.clone().setY(16));
  // Jungle all round, and a causeway under the low road.
  const hills = [0, 1, 2].map((i) => buildHill(rnd.fork(i), rnd.range(30, 50), rnd.range(6, 14), 'jungle'));
  for (let i = 0; i < 26; i++) {
    const s = rnd.range(span.start, span.end);
    const fr = d.sample(s);
    const p = fr.position.clone().addScaledVector(fr.right, (rnd.chance(0.5) ? -1 : 1) * rnd.range(55, 160)).setY(0);
    if (!d.nearRoad(p, 50) && p.distanceTo(top.position.clone().setY(0)) > 70) d.place(rnd.pick(hills), d.worldMatrix(p, rnd.range(0, 6)), false);
  }
  const ground = top.position.clone().setY(0);
  d.place(new ModelKit().cylinder(1, 1, 1, 24, '#d8c8a0', { pattern: Pattern.Grass }).build(0, 1), d.worldMatrix(ground.setY(-0.3), 0, new THREE.Vector3(110, 1, 110)), false);
  wallUnderRoad(d, span.start + 250, span.end, '#cfc5a8', false, Infinity, 14);
  const tree = buildRoundTree(rnd, null);
  for (let s = span.start; s < span.end; s += 14) d.sideProp(tree, s, s % 28 < 14 ? -1 : 1, 3, 0.18, 2, 3.5);
};

const dressPetra: Dresser = (d, span, rnd) => {
  // Canyon walls along the Siq.
  const cliffs = [0, 1, 2, 3].map((i) => buildCliff(rnd.fork(i), rnd.range(14, 22), rnd.range(38, 62)));
  const loopLen = Math.PI * 2 * 26;
  const plazaStart = span.end - (90 + 60 * (Math.PI / 3) + 40 + loopLen + 80);
  for (let s = span.start; s < plazaStart; s += 12) {
    for (const side of [-1, 1]) {
      const fr = d.sample(s);
      const x = side * (walkableHalfWidth(fr.width, 0) + 2);
      d.place(rnd.pick(cliffs), d.roadMatrix(s, x, -1.5, side > 0 ? -Math.PI / 2 : Math.PI / 2), true);
    }
  }
  // The Treasury faces the loop.
  const loopMid = d.centroid(plazaStart + 80, plazaStart + 80 + loopLen);
  const approach = d.sample(plazaStart + 40).tangent.clone().setY(0).normalize();
  const treasuryPos = loopMid.clone().addScaledVector(approach, 70).setY(d.minY(plazaStart, plazaStart + 80) - 1.5);
  d.place(buildTreasury(), d.worldMatrix(treasuryPos, Math.atan2(-approach.x, -approach.z)));
  d.landmark('The Treasury', span.district, plazaStart + 60, treasuryPos.clone().setY(treasuryPos.y + 24));
  // Plaza floor and camels.
  const floor = new ModelKit().cylinder(1, 1, 1, 20, '#e8b898', { pattern: Pattern.Sandstone }).build(0, 1);
  d.place(floor, d.worldMatrix(loopMid.clone().setY(treasuryPos.y - 0.4), 0, new THREE.Vector3(80, 1, 80)), false);
  const camel = buildCamel();
  for (let i = 0; i < 6; i++) d.place(camel, d.worldMatrix(loopMid.clone().add(new THREE.Vector3(rnd.range(-40, 40), 0, rnd.range(-40, 40))).setY(treasuryPos.y), rnd.range(0, 6), 1.3), false);
  const lamp = buildLamp(rnd);
  for (let s = plazaStart; s < span.end; s += 20) d.sideProp(lamp, s, -1, 0.5);
  // Desert hills beyond.
  for (let i = 0; i < 14; i++) {
    const p = loopMid.clone().add(new THREE.Vector3(rnd.range(-400, 400), 0, rnd.range(-400, 400))).setY(0);
    if (!d.nearRoad(p, 70)) d.place(buildHill(rnd.fork(i + 80), rnd.range(40, 70), rnd.range(25, 60), 'sandstone'), d.worldMatrix(p, rnd.range(0, 6)), false);
  }
};

function circumcentreXZ(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): THREE.Vector3 {
  const d = 2 * (a.x * (b.z - c.z) + b.x * (c.z - a.z) + c.x * (a.z - b.z));
  if (Math.abs(d) < 1e-6) return a.clone().add(c).multiplyScalar(0.5).setY(0);
  const a2 = a.x * a.x + a.z * a.z;
  const b2 = b.x * b.x + b.z * b.z;
  const c2 = c.x * c.x + c.z * c.z;
  return new THREE.Vector3((a2 * (b.z - c.z) + b2 * (c.z - a.z) + c2 * (a.z - b.z)) / d, 0, (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d);
}

export const WONDERS_DRESSERS = {
  greatwall: dressGreatWall,
  colosseum: dressColosseum,
  taj: dressTaj,
  machupicchu: dressMachu,
  redeemer: dressRedeemer,
  chichen: dressChichen,
  petra: dressPetra,
};

export function wondersBackground(d: Decorator, rnd: Random): void {
  commonSky(d, rnd, 34);
  landUnder(d, '#a6c86a', Pattern.Grass, 220);
  // A ring of distant snow peaks and green hills on the land around the sea.
  for (let i = 0; i < 16; i++) {
    const p = d.scatter(rnd, 700, 1400, 0, 250);
    if (p) d.place(buildHill(rnd.fork(i), rnd.range(120, 200), rnd.range(120, 260), i % 3 === 0 ? 'snowpeak' : 'rock'), d.worldMatrix(p, rnd.range(0, 6)), false);
  }
  const palm = buildPalm(rnd);
  for (let i = 0; i < 20; i++) {
    const p = d.scatter(rnd, 150, 600, 0, 40);
    if (p) d.place(palm, d.worldMatrix(p, rnd.range(0, 6), 1.3), false);
  }
}

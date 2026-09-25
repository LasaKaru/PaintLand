import * as THREE from 'three';
import type { Dresser, Decorator } from '../Decorator';
import { KERB_WIDTH, PAVEMENT_WIDTH, walkableHalfWidth } from '../../road/RoadMesh';
import { Random } from '../../core/Random';
import { buildHouse, buildStall } from '../../models/Buildings';
import { buildBush, buildFlowerBush, buildHill, buildIsland, buildPalm, buildRoundTree } from '../../models/Nature';
import { buildBench, buildLamp } from '../../models/Props';
import { buildBicycle, buildCat, buildFountain, buildLantern } from '../../models/StreetProps';
import {
  buildCabana, buildElephant, buildKite, buildLotusTower, buildNineArchBridge, buildOruwa, buildSigiriya, buildStupa, buildTeaFactory, buildTrain, buildTukTukProp,
} from '../../models/LandmarksSriLanka';
import { buildPeak } from '../../models/LandmarksWorld';
import { ModelKit, Pattern } from '../../models/ModelKit';
import { commonSky, landAlong, pierUnder } from './sketch';

const TUK_COLOURS = ['#d8463a', '#2f8f86', '#f4d23b', '#3e6fa8', '#4f9a5a'];

/** Place terrain hills near a span, keeping clear of the road. */
function hillsAround(d: Decorator, s0: number, s1: number, rnd: Random, kind: Parameters<typeof buildHill>[3], count: number, dist: [number, number], size: [number, number], height: [number, number]): void {
  for (let i = 0; i < count; i++) {
    const s = rnd.range(s0, s1);
    const f = d.sample(s);
    const side = rnd.chance(0.5) ? -1 : 1;
    const r = rnd.range(size[0], size[1]);
    const off = rnd.range(dist[0], dist[1]) + r;
    const p = f.position.clone().addScaledVector(f.right, side * off).setY(0);
    if (d.nearRoad(p, r + 14)) continue;
    d.place(buildHill(rnd.fork(i), r, rnd.range(height[0], height[1]), kind), d.worldMatrix(p, rnd.range(0, 6)), false);
  }
}

const dressGalleFace: Dresser = (d, span, rnd, def) => {
  // City side (left): colonial buildings and a grand hotel. Sea side (right): palms, carts, kites.
  const houses = Array.from({ length: 8 }, (_, i) => buildHouse(rnd.fork(i), def.walls[i % def.walls.length], i % 3 === 0 ? 'colonial' : 'townhouse'));
  let s = span.start + 8;
  while (s < span.end - 50) {
    const h = rnd.pick(houses);
    const f = d.sample(s);
    const x = -(f.width / 2 + KERB_WIDTH + PAVEMENT_WIDTH + f.plaza * 0.6 + h.depth / 2);
    const m = d.roadMatrix(s + h.width / 2, x, 0.18, Math.PI / 2);
    d.place(h.geometry, m);
    d.block(m, new THREE.Vector3(0, h.height / 2, 0), Math.max(h.width, h.height) * 0.55);
    s += h.width + rnd.range(1, 4);
  }
  // Grand hotel: a long white colonial block with a red roof.
  const hotel = new ModelKit();
  hotel.box(60, 16, 18, '#f6f2ea', { position: [0, 8, 0], pattern: Pattern.Brick });
  for (let i = 0; i < 14; i++) for (let f = 0; f < 3; f++) hotel.box(2, 2.6, 0.3, '#3f4f78', { position: [-26 + i * 4, 3 + f * 4.6, 9.05], nightGlow: (i + f) % 3 === 0 ? 1 : 0 });
  for (let i = 0; i < 15; i++) hotel.cylinder(0.4, 0.45, 5, 8, '#fbf8f0', { position: [-28 + i * 4, 2.5, 11] });
  hotel.box(62, 0.6, 4, '#d8463a', { position: [0, 5.3, 11], rotation: [0.2, 0, 0], pattern: Pattern.RoofTiles });
  hotel.add(new THREE.ConeGeometry(1, 1, 4), '#c8563a', { position: [0, 19, 0], rotation: [0, Math.PI / 4, 0], scale: [44, 6, 13], pattern: Pattern.RoofTiles });
  const hs = span.start + (span.end - span.start) * 0.7;
  const hf = d.sample(hs);
  d.place(hotel.build(0.05, 3), d.roadMatrix(hs, -(hf.width / 2 + 40), 0.18, Math.PI / 2));
  d.landmark('Galle Face Hotel', span.district, hs, hf.position.clone().addScaledVector(hf.right, -(hf.width / 2 + 40)).setY(10));

  const palms = [0, 1, 2, 3].map((i) => buildPalm(rnd.fork(i)));
  const lamp = buildLamp(rnd);
  const cart = buildStall(rnd);
  const bench = buildBench();
  const tuks = TUK_COLOURS.map(buildTukTukProp);
  for (let s2 = span.start + 6; s2 < span.end - 10; s2 += rnd.range(8, 13)) {
    d.sideProp(rnd.pick(palms), s2, 1, rnd.range(1, 7), 0.18, 1.2, 6);
    if (rnd.chance(0.4)) d.sideProp(lamp, s2 + 4, 1, 0.5);
    if (rnd.chance(0.3)) d.sideProp(cart, s2 + 6, 1, 4.5);
    else if (rnd.chance(0.3)) d.sideProp(bench, s2 + 6, 1, 3);
    if (rnd.chance(0.35)) d.sideProp(rnd.pick(tuks), s2 + 2, -1, 0.8);
    if (rnd.chance(0.25)) d.sideProp(rnd.pick(palms), s2 + 5, -1, 1.5, 0.18, 1.2, 6);
  }
  // Sea wall along the promenade.
  const wall = new ModelKit();
  for (let s2 = span.start; s2 < span.end; s2 += 6) {
    const f = d.sample(s2);
    const p = f.position.clone().addScaledVector(f.right, walkableHalfWidth(f.width, f.plaza) + 4);
    wall.box(1.2, 1.4, 6.1, '#e9dcc4', { position: [p.x, p.y + 0.5, p.z], rotation: [0, Math.atan2(f.tangent.x, f.tangent.z), 0], pattern: Pattern.Stone });
  }
  d.place(wall.build(0.02, 5), new THREE.Matrix4());
  // Kites over the green, swaying on the wind.
  const kiteGeos = ['#d8463a', '#f4d23b', '#3e6fa8', '#e8559a', '#4f9a5a'].map(buildKite);
  for (let i = 0; i < 12; i++) {
    const s2 = rnd.range(span.start, span.end);
    const f = d.sample(s2);
    const base = f.position.clone().addScaledVector(f.right, rnd.range(20, 60)).add(new THREE.Vector3(0, rnd.range(18, 40), 0));
    const kite = d.addMesh(rnd.pick(kiteGeos), d.worldMatrix(base, rnd.range(0, 6)), false);
    const phase = rnd.range(0, 6);
    d.animators.push((t) => {
      kite.position.set(base.x + Math.sin(t * 0.7 + phase) * 3, base.y + Math.sin(t * 1.1 + phase) * 2, base.z + Math.cos(t * 0.6 + phase) * 3);
      kite.rotation.z = Math.sin(t * 1.3 + phase) * 0.3;
    });
  }
  pierUnder(d, span.district, '#e9dcc4');
};

const dressLotus: Dresser = (d, span, rnd) => {
  const helixStart = span.start + 60;
  const centre = d.centroid(helixStart + 30, span.end - 80).setY(0);
  d.place(buildLotusTower(), d.worldMatrix(centre, 0));
  d.blockWorld(centre.clone().setY(80), 8);
  d.landmark('Lotus Tower', span.district, (helixStart + span.end) / 2, centre.clone().setY(95));
  // A park with trees and lanterns around the base.
  const trees = [buildRoundTree(rnd, null), buildRoundTree(rnd, '#f08a2e'), buildPalm(rnd)];
  for (let i = 0; i < 26; i++) {
    const a = rnd.range(0, Math.PI * 2);
    const r = rnd.range(38, 90);
    d.place(rnd.pick(trees), d.worldMatrix(centre.clone().add(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)), rnd.range(0, 6), 1.4), false);
  }
  d.place(buildFountain(), d.worldMatrix(centre.clone().add(new THREE.Vector3(45, 0, 0)), 0, 2), false);
  const lamp = buildLamp(rnd);
  const lantern = buildLantern('#f4a0c0');
  for (let s = span.start + 10; s < span.end - 10; s += 16) {
    d.sideProp(lamp, s, s % 32 < 16 ? -1 : 1, 0.5);
    if (s % 48 < 16) d.place(lantern, d.roadMatrix(s, 0, 7.5, 0), false);
  }
  // The city around it: a scatter of towers.
  const walls = ['#f6f2ea', '#bfd9e8', '#f2c6b4', '#e9e2d0'];
  for (let i = 0; i < 18; i++) {
    const a = rnd.range(0, Math.PI * 2);
    const r = rnd.range(140, 320);
    const p = centre.clone().add(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    if (d.nearRoad(p, 40)) continue;
    const w = rnd.range(14, 24);
    const h = rnd.range(30, 90);
    const g = new ModelKit().box(w, h, w, rnd.pick(walls), { position: [0, h / 2, 0], pattern: Pattern.Brick });
    for (let y = 4; y < h - 2; y += 4) g.box(w + 0.2, 1.2, w + 0.2, '#3f4f78', { position: [0, y, 0], nightGlow: rnd.chance(0.3) ? 1 : 0 });
    d.place(g.build(0.2, i), d.worldMatrix(p, rnd.range(0, 6)), false);
  }
};

const dressSigiriya: Dresser = (d, span, rnd) => {
  const helixLen = Math.PI * 2 * 58 * 1.25;
  const hEnd = span.end - 80;
  const centre = d.centroid(hEnd - helixLen, hEnd).setY(0);
  d.place(buildSigiriya(rnd), d.worldMatrix(centre, Math.PI * 0.3));
  d.blockWorld(centre.clone().setY(50), 38);
  d.landmark('Sigiriya', span.district, hEnd - 20, centre.clone().setY(60));
  d.landmark('Lion paws', span.district, hEnd - helixLen + 40, centre.clone().add(new THREE.Vector3(Math.sin(Math.PI * 0.3) * 45, 12, Math.cos(Math.PI * 0.3) * 45)));
  // Jungle hills below the glide.
  hillsAround(d, span.start, span.start + 300, rnd, 'jungle', 10, [16, 60], [25, 50], [14, 28]);
  // Elephants by the water gardens.
  const elephant = buildElephant();
  for (let i = 0; i < 4; i++) {
    const a = Math.PI * 0.3 + rnd.jitter(0.5);
    const p = centre.clone().add(new THREE.Vector3(Math.sin(a) * 80 + rnd.jitter(10), 0, Math.cos(a) * 80 + rnd.jitter(10)));
    d.place(elephant, d.worldMatrix(p, rnd.range(0, 6), 1.3), false);
  }
  const lamp = buildLamp(rnd);
  for (let s = span.start + 10; s < span.end; s += 20) d.sideProp(lamp, s, s % 40 < 20 ? -1 : 1, 0.5);
};

const dressTea: Dresser = (d, span, rnd) => {
  hillsAround(d, span.start, span.end, rnd, 'tea', 18, [14, 70], [30, 60], [20, 45]);
  // Ella Rock and a waterfall on a cliff.
  const mid = d.sample((span.start + span.end) / 2);
  const rockPos = mid.position.clone().add(new THREE.Vector3(-160, 0, 120)).setY(0);
  if (!d.nearRoad(rockPos, 90)) d.place(buildPeak(rnd, 70, 150, 0.8), d.worldMatrix(rockPos, 0), false);
  const cliff = new ModelKit().box(40, 60, 20, '#a6a3b8', { position: [0, 30, 0], pattern: Pattern.Stone });
  for (let y = 4; y < 58; y += 5) cliff.blob(rnd.range(2.5, 4), '#e8f6f6', { position: [rnd.jitter(1), y, 10.5], scale: [0.8, 1.6, 0.4], detail: 1, roughness: 0.2, seed: y });
  cliff.cylinder(10, 12, 1, 12, '#6fd0d0', { position: [0, 0.5, 18] });
  const fall = mid.position.clone().add(new THREE.Vector3(120, 0, -120)).setY(0);
  if (!d.nearRoad(fall, 60)) {
    d.place(cliff.build(0.2, 4), d.worldMatrix(fall, Math.PI * 0.75), false);
    d.landmark('Ravana Falls', span.district, (span.start + span.end) / 2);
  }
  // Tea factory by the road.
  const fs = span.start + (span.end - span.start) * 0.35;
  const ff = d.sample(fs);
  d.place(buildTeaFactory(), d.roadMatrix(fs, -(ff.width / 2 + 24), -0.5, Math.PI / 2));
  d.landmark('Tea factory', span.district, fs);
  const bush = buildBush(rnd, '#5aa84a');
  const flower = buildFlowerBush(rnd);
  for (let s = span.start + 5; s < span.end; s += rnd.range(6, 12)) d.sideProp(rnd.chance(0.7) ? bush : flower, s, rnd.chance(0.5) ? -1 : 1, rnd.range(0.5, 2.5));
};

const dressNineArch: Dresser = (d, span, rnd) => {
  // The bridge sits under the straight run.
  const s0 = span.start + 40;
  const s1 = s0 + 290;
  const mid = d.sample((s0 + s1) / 2);
  const deckY = mid.position.y - 1.4;
  const yaw = Math.atan2(-mid.tangent.z, mid.tangent.x);
  d.place(buildNineArchBridge(300, deckY, 17), d.worldMatrix(mid.position.clone().setY(0), yaw));
  d.landmark('Nine Arch Bridge', span.district, (s0 + s1) / 2, mid.position.clone().setY(deckY * 0.6));
  hillsAround(d, span.start, span.end, rnd, 'jungle', 14, [12, 50], [30, 55], [deckY * 0.5, deckY * 0.9]);
  // The blue train running on the right-hand lane.
  const { geometry, length } = buildTrain(4);
  const train = d.addMesh(geometry);
  const mover = { s: s0, x: 4.3, halfLength: length / 2, halfWidth: 1.6 };
  d.movers.push(mover);
  const range = s1 - s0 + length;
  d.animators.push((t) => {
    mover.s = s0 - length / 2 + ((t * 9) % range);
    const m = d.roadMatrix(mover.s, mover.x, 0.05, 0);
    m.decompose(train.position, train.quaternion, train.scale);
  });
};

const dressBeach: Dresser = (d, span, rnd) => {
  const palms = [0, 1, 2, 3].map((i) => buildPalm(rnd.fork(i + 10)));
  const cabana = [0, 1].map((i) => buildCabana(rnd.fork(i)));
  for (let s = span.start + 5; s < span.end - 5; s += rnd.range(7, 12)) {
    d.sideProp(rnd.pick(palms), s, -1, rnd.range(1, 6), 0.18, 1.2, 6);
    if (rnd.chance(0.6)) d.sideProp(rnd.pick(palms), s + 3, 1, rnd.range(1, 8), 0.18, 1.2, 6);
    if (rnd.chance(0.2)) d.sideProp(rnd.pick(cabana), s + 4, 1, 6);
  }
  // Beach strip, outrigger canoes and a whale tail.
  const mid = d.sample((span.start + span.end) / 2);
  const beachPos = mid.position.clone().addScaledVector(mid.right, 70).setY(0);
  d.place(new ModelKit().cylinder(1, 1, 1.2, 16, '#f1dca0', { pattern: Pattern.Grass }).build(0, 1), d.worldMatrix(beachPos, 0, new THREE.Vector3(120, 1, 60)), false);
  const oruwa = buildOruwa();
  for (let i = 0; i < 8; i++) d.place(oruwa, d.worldMatrix(beachPos.clone().add(new THREE.Vector3(rnd.range(-160, 160), 0.3, rnd.range(60, 160))), rnd.range(0, 6), 1.6), false);
  const tail = new ModelKit()
    .blob(3, '#4a5a78', { position: [0, 3, 0], scale: [0.6, 1.4, 0.6], detail: 1 })
    .blob(3, '#4a5a78', { position: [-3.5, 6.5, 0], scale: [1.4, 0.35, 0.7], rotation: [0, 0, 0.4], detail: 1 })
    .blob(3, '#4a5a78', { position: [3.5, 6.5, 0], scale: [1.4, 0.35, 0.7], rotation: [0, 0, -0.4], detail: 1 })
    .build(0.02, 2);
  const whale = d.addMesh(tail, d.worldMatrix(beachPos.clone().add(new THREE.Vector3(80, 0, 220)), 0), false);
  d.animators.push((t) => (whale.position.y = Math.max(-9, Math.sin(t * 0.4) * 9) - 1));
  // Coconut Tree Hill: a grassy headland crowded with palms.
  const hillPos = mid.position.clone().addScaledVector(mid.right, -110).setY(0);
  if (!d.nearRoad(hillPos, 70)) {
    d.place(buildHill(rnd, 55, 26, 'grass'), d.worldMatrix(hillPos, 0), false);
    for (let i = 0; i < 20; i++) {
      const a = rnd.range(0, Math.PI * 2);
      const r = rnd.range(0, 40);
      d.place(rnd.pick(palms), d.worldMatrix(hillPos.clone().add(new THREE.Vector3(Math.cos(a) * r, 26 * Math.cos((r / 55) * (Math.PI / 2)) - 1, Math.sin(a) * r)), rnd.range(0, 6), 1.3), false);
    }
    d.landmark('Coconut Tree Hill', span.district, (span.start + span.end) / 2);
  }
  const cats = buildCat('#e0904a');
  const bike = buildBicycle('#2f8f86');
  for (let s = span.end - 170; s < span.end - 10; s += 20) {
    if (rnd.chance(0.4)) d.sideProp(cats, s, rnd.chance(0.5) ? -1 : 1, 1);
    if (rnd.chance(0.3)) d.sideProp(bike, s + 5, -1, 0.5);
  }
};

export const SERENDIB_DRESSERS = {
  galleface: dressGalleFace,
  lotus: dressLotus,
  sigiriya: dressSigiriya,
  tea: dressTea,
  ninearch: dressNineArch,
  beach: dressBeach,
};

export function serendibBackground(d: Decorator, rnd: Random): void {
  commonSky(d, rnd, 26);
  // Land follows the inland districts; the seafront and Mirissa keep the sea.
  landAlong(d, d.path.spanOf(1)?.start ?? 0, d.path.spanOf(4)?.end ?? d.path.length, 240, '#7fbb3a');
  const islands = [0, 1, 2].map((i) => buildIsland(rnd.fork(i), rnd.range(20, 34), true));
  for (let i = 0; i < 12; i++) {
    const p = d.scatter(rnd, 500, 1300, 0, 120);
    if (p) d.place(rnd.pick(islands), d.worldMatrix(p, rnd.range(0, 6)), false);
  }
  const stupa = d.scatter(rnd, 400, 700, 0, 120);
  if (stupa) {
    d.place(buildHill(rnd, 70, 12, 'grass'), d.worldMatrix(stupa, 0), false);
    d.place(buildStupa(), d.worldMatrix(stupa.clone().setY(10), 0), false);
  }
  // Adam's Peak on the horizon.
  const peak = d.scatter(rnd, 900, 1300, 0, 300);
  if (peak) d.place(buildPeak(rnd, 180, 420, 0.6), d.worldMatrix(peak, 0), false);
  const oruwa = buildOruwa();
  const centre = d.path.bounds().getCenter(new THREE.Vector3());
  for (let i = 0; i < 16; i++) d.place(oruwa, d.worldMatrix(new THREE.Vector3(centre.x + rnd.range(-800, 800), 0.3, centre.z + rnd.range(-800, 800)), rnd.range(0, 6), 1.6), false);
  const kiteGeo = buildKite('#f08a2e');
  for (let i = 0; i < 6; i++) {
    const p = d.scatter(rnd, 200, 500, [80, 160], 40);
    if (p) d.addFloater(kiteGeo, p, 0.2, 0.3, 4);
  }
}

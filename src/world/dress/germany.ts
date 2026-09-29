import * as THREE from 'three';
import type { Dresser, Decorator } from '../Decorator';
import type { Random } from '../../core/Random';
import { walkableHalfWidth } from '../../road/RoadMesh';
import { buildHill, buildRoundTree, buildFlowerBush } from '../../models/Nature';
import { buildLamp, buildBench } from '../../models/Props';
import { buildSkyscraper } from '../../models/CityProps';
import {
  buildAlpineCow, buildBarge, buildBeerTent, buildBlackForestHouse, buildBrandenburgGate, buildChalet, buildElbphilharmonie, buildFachwerk, buildFernsehturm,
  buildFir, buildFrauenkirche, buildKolnerDom, buildMaypole, buildNeuschwanstein, buildReichstag, buildRhineCastle, buildSpeicher, buildTurbineMast,
  buildTurbineRotor, buildVineyard,
} from '../../models/LandmarksGermany';
import { beside, furniture, hills, landmarkBeside, rows, waterBeside, type Span } from './cities';
import { landAlong } from './sketch';
import { tourBackground } from './tour';

const at = (span: Span, t: number): number => span.start + (span.end - span.start) * t;
const part = (span: Span, t0: number, t1: number): Span => ({ ...span, start: at(span, t0), end: at(span, t1) });

function firs(d: Decorator, span: Span, rnd: Random, every: number, reach: [number, number]): void {
  const trees = [0, 1, 2, 3].map((i) => buildFir(rnd.fork(i + 80)));
  for (let s = span.start; s < span.end; s += every) d.sideProp(rnd.pick(trees), s, rnd.chance(0.5) ? -1 : 1, rnd.range(reach[0], reach[1]));
}

// ————— the ten districts —————

// Berlin: through the Brandenburg Gate, past the Reichstag, with the TV tower over everything.
const dressBerlin: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 150, '#8fb35a');
  const gs = at(span, 0.12);
  const gf = d.sample(gs);
  d.place(buildBrandenburgGate(walkableHalfWidth(gf.width, gf.plaza) + 0.5), d.roadMatrix(gs, 0, 0, 0));
  d.landmark('The Brandenburg Gate', span.district, gs, gf.position.clone().setY(gf.position.y + 20));
  landmarkBeside(d, span, 0.3, 1, 80, buildReichstag(), 'The Reichstag', 30, 55);
  landmarkBeside(d, span, 0.7, -1, 90, buildFernsehturm(), 'The Fernsehturm', 140, 22);
  const towers = [0, 1, 2].map((i) => {
    const h = rnd.range(20, 34);
    return { geometry: buildSkyscraper(rnd.fork(i), 18, h, 16), width: 18, depth: 16, height: h };
  });
  rows(d, part(span, 0.45, 1), rnd, () => rnd.pick(towers), [1], 2, 3);
  const lindens = [0, 1].map((i) => buildRoundTree(rnd.fork(i + 10), null));
  for (let s = span.start + 4; s < at(span, 0.45); s += 10) for (const side of [-1, 1]) d.sideProp(rnd.pick(lindens), s, side, 3);
  furniture(d, span, rnd, [buildLamp(rnd), buildBench()], [12, 18]);
};

// Hamburg: the Speicherstadt's brick warehouses on the canals, and the Elbphilharmonie.
const dressHamburg: Dresser = (d, span, rnd) => {
  const stores = [0, 1, 2, 3].map((i) => buildSpeicher(rnd.fork(i)));
  rows(d, part(span, 0, 0.65), rnd, () => rnd.pick(stores), [-1], 1, 2);
  waterBeside(d, part(span, 0, 0.65), 1, 4, 18, '#4f7a8a');
  rows(d, part(span, 0, 0.65), rnd, () => rnd.pick(stores), [1], 1, 24);
  d.landmark('The Speicherstadt', span.district, at(span, 0.3), beside(d, span, 0.3, -1, 14).p.setY(14));
  waterBeside(d, part(span, 0.65, 1), 1, 14, 200, '#4f7a8a'); // the Elbe
  landmarkBeside(d, span, 0.85, 1, 90, buildElbphilharmonie(), 'The Elbphilharmonie', 60, 55);
  const barges = [0, 1].map((i) => d.floats(buildBarge(rnd.fork(i))));
  for (const t of [0.72, 0.95]) {
    const { p, face } = beside(d, span, t, 1, 50);
    d.place(rnd.pick(barges), d.worldMatrix(p.setY(0), face + Math.PI / 2), false);
  }
};

// The Autobahn: a long, fast, open stretch between wind farms (boost pads laid down the lanes).
const dressAutobahn: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 200, '#9ab85a');
  const mast = buildTurbineMast(40);
  let spinning = 0;
  let first = true;
  for (let i = 0; i < 14; i++) {
    const { p, s } = beside(d, span, 0.04 + i * 0.07, i % 2 ? 1 : -1, rnd.range(60, 140));
    if (d.nearRoad(p, 30)) continue;
    const yaw = 0.6;
    d.place(mast, d.worldMatrix(p, yaw), false);
    const hub = p.clone().setY(40).add(new THREE.Vector3(Math.sin(yaw) * 2.6, 0, Math.cos(yaw) * 2.6));
    if (spinning < 6) {
      d.addSpinner(buildTurbineRotor(20), d.worldMatrix(hub, yaw), 'z', 0.9 + (i % 3) * 0.2);
      spinning++;
    } else d.place(buildTurbineRotor(20), d.worldMatrix(hub, yaw), false);
    if (first) d.landmark('Wind turbines by the Autobahn', span.district, s, p.clone().setY(40));
    first = false;
  }
  const fields = [0, 1].map((i) => buildFlowerBush(rnd.fork(i + 20)));
  for (let s = span.start; s < span.end; s += rnd.range(10, 20)) d.sideProp(rnd.pick(fields), s, rnd.chance(0.5) ? -1 : 1, rnd.range(4, 30));
  firs(d, span, rnd, 16, [12, 40]);
};

// Cologne: the cathedral's twin spires and the Rhine.
const dressCologne: Dresser = (d, span, rnd) => {
  const houses = [0, 1, 2, 3].map((i) => buildFachwerk(rnd.fork(i)));
  rows(d, part(span, 0, 0.4), rnd, () => rnd.pick(houses), [-1, 1], 0.2, 2);
  landmarkBeside(d, span, 0.55, -1, 90, buildKolnerDom(), 'Cologne Cathedral', 100, 60);
  waterBeside(d, part(span, 0.45, 1), 1, 14, 160, '#5a8aa8');
  const barge = d.floats(buildBarge(rnd.fork(3)));
  const b = beside(d, span, 0.8, 1, 70);
  d.place(barge, d.worldMatrix(b.p.setY(0), b.face + Math.PI / 2), false);
  furniture(d, span, rnd, [buildLamp(rnd), buildBench()], [12, 18]);
};

// The Rhine Valley: castles on the crags, vineyards on the slopes, barges on the river.
const dressRhine: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 160, '#7fa84a');
  waterBeside(d, span, 1, 12, 110, '#5a8aa8');
  let named = false;
  for (const [t, side, dist] of [[0.2, -1, 110], [0.55, 1, 220], [0.85, -1, 120]] as const) {
    const { p, face, s } = beside(d, span, t, side, dist);
    if (d.nearRoad(p, 60)) continue;
    d.place(buildRhineCastle(rnd.fork(Math.round(t * 100))), d.worldMatrix(p, face));
    if (!named) d.landmark('Marksburg above the Rhine', span.district, s, p.clone().setY(50));
    named = true;
  }
  const vines = buildVineyard(24);
  for (let s = span.start + 12; s < span.end - 12; s += 26) d.sideProp(vines, s, -1, 10, 0.05);
  const lr = beside(d, span, 0.65, 1, 160);
  if (!d.nearRoad(lr.p, 60)) d.place(buildHill(rnd.fork(77), 50, 60, 'rock'), d.worldMatrix(lr.p, 0), false);
  d.landmark('The Loreley rock', span.district, lr.s, lr.p.clone().setY(50));
  hills(d, span, rnd, 'forest', 10, [60, 200], [60, 100], [40, 80]);
  const barges = [0, 1, 2].map((i) => d.floats(buildBarge(rnd.fork(i + 5))));
  for (let t = 0.1; t < 0.95; t += 0.2) {
    const { p, face } = beside(d, span, t, 1, 60);
    d.place(rnd.pick(barges), d.worldMatrix(p.setY(0), face + Math.PI / 2), false);
  }
};

// Rothenburg ob der Tauber: a walled medieval town of crooked timbered houses.
const dressRothenburg: Dresser = (d, span, rnd) => {
  const houses = [0, 1, 2, 3, 4, 5].map((i) => buildFachwerk(rnd.fork(i + 20)));
  rows(d, part(span, 0.05, 0.9), rnd, () => rnd.pick(houses), [-1, 1], 0, 1.5);
  d.landmark('Rothenburg’s Plönlein', span.district, at(span, 0.5), d.sample(at(span, 0.5)).position.clone().add(new THREE.Vector3(0, 10, 0)));
  const flowers = [0, 1].map((i) => buildFlowerBush(rnd.fork(i + 30)));
  for (let s = span.start + 3; s < span.end; s += 8) d.sideProp(rnd.pick(flowers), s, rnd.chance(0.5) ? -1 : 1, 0.5);
  furniture(d, span, rnd, [buildLamp(rnd)], [14, 20]);
};

// The Black Forest: dark firs, big-roofed farmhouses and cuckoo clocks.
const dressBlackForest: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 170, '#4f7a3a');
  firs(d, span, rnd, 2.5, [2, 30]);
  landmarkBeside(d, span, 0.3, -1, 30, buildBlackForestHouse(rnd.fork(1)).geometry, 'A Black Forest farmhouse and its cuckoo clock', 8, 12);
  for (const [t, side] of [[0.55, 1], [0.8, -1]] as const) {
    const { p, face } = beside(d, span, t, side, 34);
    if (!d.nearRoad(p, 12)) {
      d.place(buildBlackForestHouse(rnd.fork(Math.round(t * 10))).geometry, d.worldMatrix(p, face));
      d.blockWorld(p.clone().setY(4), 12);
    }
  }
  hills(d, span, rnd, 'forest', 10, [80, 220], [60, 110], [50, 100]);
};

// Munich: Oktoberfest tents, a maypole, and the Frauenkirche's onion domes.
const dressMunich: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 150, '#8fb35a');
  const tents = [0, 1, 2].map((i) => buildBeerTent(rnd.fork(i)));
  let first = true;
  for (let t = 0.1; t < 0.5; t += 0.1) {
    const { p, face, s } = beside(d, span, t, t % 0.2 < 0.1 ? -1 : 1, 26);
    if (d.nearRoad(p, 16)) continue;
    d.place(rnd.pick(tents), d.worldMatrix(p, face));
    d.blockWorld(p.clone().setY(5), 16);
    if (first) d.landmark('The Oktoberfest tents', span.district, s, p.clone().setY(10));
    first = false;
  }
  d.sideProp(buildMaypole(), at(span, 0.55), 1, 3);
  landmarkBeside(d, span, 0.8, -1, 70, buildFrauenkirche(), 'The Frauenkirche', 90, 30);
  const houses = [0, 1, 2].map((i) => buildFachwerk(rnd.fork(i + 40)));
  rows(d, part(span, 0.6, 1), rnd, () => rnd.pick(houses), [1], 0.5, 2);
  const chestnuts = [0, 1].map((i) => buildRoundTree(rnd.fork(i + 50), null));
  for (let s = span.start + 4; s < at(span, 0.55); s += 14) d.sideProp(rnd.pick(chestnuts), s, 1, 16);
};

// Neuschwanstein: the fairytale castle on its crag above the forest.
const dressNeuschwanstein: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 170, '#6f9a3a');
  landmarkBeside(d, span, 0.5, 1, 150, buildNeuschwanstein(), 'Neuschwanstein Castle', 60, 50);
  firs(d, span, rnd, 3.5, [3, 40]);
  hills(d, span, rnd, 'forest', 6, [200, 320], [80, 140], [80, 140]);
  waterBeside(d, part(span, 0.1, 0.4), -1, 30, 80, '#5a9aa8'); // the Alpsee
};

// The Alps: meadows, chalets, cows with bells and the Zugspitze.
const dressAlps: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 170, '#8fbf4a');
  hills(d, span, rnd, 'snowpeak', 10, [200, 420], [120, 200], [160, 240]);
  const chalets = [0, 1, 2].map((i) => buildChalet(rnd.fork(i)));
  let first = true;
  for (let t = 0.1; t < 0.95; t += 0.14) {
    const { p, face, s } = beside(d, span, t, t % 0.28 < 0.14 ? -1 : 1, 28);
    if (d.nearRoad(p, 12)) continue;
    d.place(rnd.pick(chalets).geometry, d.worldMatrix(p, face));
    d.blockWorld(p.clone().setY(4), 10);
    if (first) d.landmark('An Alpine chalet', span.district, s, p.clone().setY(6));
    first = false;
  }
  const cow = buildAlpineCow();
  for (let i = 0; i < 18; i++) {
    const { p, face } = beside(d, span, rnd.range(0.05, 0.95), rnd.chance(0.5) ? -1 : 1, rnd.range(8, 40));
    if (!d.nearRoad(p, 4)) d.place(cow, d.worldMatrix(p, face + rnd.range(-2, 2)), false);
  }
  d.landmark('The Zugspitze', span.district, span.end - 30, beside(d, span, 0.98, 1, 380).p.setY(200));
  firs(d, span, rnd, 10, [6, 30]);
};

export const GERMANY_DRESSERS = {
  berlin: dressBerlin,
  hamburg: dressHamburg,
  autobahn: dressAutobahn,
  cologne: dressCologne,
  rhine: dressRhine,
  rothenburg: dressRothenburg,
  blackforest: dressBlackForest,
  munich: dressMunich,
  neuschwanstein: dressNeuschwanstein,
  alps: dressAlps,
};

export function germanyBackground(d: Decorator, rnd: Random): void {
  const trees = [0, 1, 2].map((i) => (i === 2 ? buildRoundTree(rnd.fork(i), null) : buildFir(rnd.fork(i))));
  tourBackground(d, rnd, { grass: '#8fb35a', trees, hill: 'forest', hillHeight: [70, 150] });
}

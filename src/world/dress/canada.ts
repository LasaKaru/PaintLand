import type { Dresser, Decorator } from '../Decorator';
import type { Random } from '../../core/Random';
import { buildRoundTree } from '../../models/Nature';
import { buildLamp, buildBench } from '../../models/Props';
import { buildSkyscraper } from '../../models/CityProps';
import { buildMaple, buildSuspensionBridge } from '../../models/LandmarksKorea';
import { buildFir } from '../../models/LandmarksGermany';
import {
  buildBanffSprings, buildCNTower, buildCanoe, buildFrontenac, buildGlacier, buildGrainElevator, buildHorseshoeFalls, buildMistBoat, buildMoose, buildOrca,
  buildParliament, buildQuebecHouse, buildSurfShack, buildTotem, buildWheat,
} from '../../models/LandmarksCanada';
import { beside, furniture, hills, landmarkBeside, rows, waterBeside, type Span } from './cities';
import { landAlong } from './sketch';
import { tourBackground } from './tour';

const at = (span: Span, t: number): number => span.start + (span.end - span.start) * t;
const part = (span: Span, t0: number, t1: number): Span => ({ ...span, start: at(span, t0), end: at(span, t1) });

function pines(d: Decorator, span: Span, rnd: Random, every: number, reach: [number, number]): void {
  const trees = [0, 1, 2, 3].map((i) => buildFir(rnd.fork(i + 90)));
  for (let s = span.start; s < span.end; s += every) d.sideProp(rnd.pick(trees), s, rnd.chance(0.5) ? -1 : 1, rnd.range(reach[0], reach[1]));
}

function towersRow(d: Decorator, span: Span, rnd: Random, side: number[], lo: number, hi: number): void {
  const towers = [0, 1, 2, 3].map((i) => {
    const h = rnd.range(lo, hi);
    return { geometry: buildSkyscraper(rnd.fork(i), 18, h, 18), width: 18, depth: 18, height: h };
  });
  rows(d, span, rnd, () => rnd.pick(towers), side, 3, 4);
}

// ————— the ten districts —————

// Québec City: the old walled town and the Château Frontenac over the river.
const dressQuebec: Dresser = (d, span, rnd) => {
  const houses = [0, 1, 2, 3, 4].map((i) => buildQuebecHouse(rnd.fork(i)));
  rows(d, part(span, 0, 0.6), rnd, () => rnd.pick(houses), [-1, 1], 0.2, 1.5);
  landmarkBeside(d, span, 0.75, 1, 90, buildFrontenac(), 'The Château Frontenac', 60, 45);
  waterBeside(d, part(span, 0.62, 1), 1, 150, 200, '#4f7a9a'); // the St Lawrence
  furniture(d, span, rnd, [buildLamp(rnd), buildBench()], [10, 16]);
  const maples = [0, 1].map((i) => buildMaple(rnd.fork(i)));
  for (let s = at(span, 0.62); s < span.end; s += 10) d.sideProp(rnd.pick(maples), s, -1, 3);
};

// Ottawa: Parliament Hill and the Peace Tower above the river.
const dressOttawa: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 150, '#8fb35a');
  landmarkBeside(d, span, 0.45, 1, 90, buildParliament(), 'Parliament Hill and the Peace Tower', 60, 50);
  const trees = [0, 1].map((i) => buildRoundTree(rnd.fork(i + 10), null));
  for (let s = span.start + 4; s < span.end; s += 12) for (const side of [-1, 1]) d.sideProp(rnd.pick(trees), s, side, 3);
  waterBeside(d, part(span, 0.6, 1), -1, 30, 80, '#4f7a9a'); // the Rideau Canal
  furniture(d, span, rnd, [buildLamp(rnd), buildBench()], [14, 20]);
};

// Toronto: towers and the CN Tower over Lake Ontario.
const dressToronto: Dresser = (d, span, rnd) => {
  towersRow(d, span, rnd, [-1], 50, 130);
  waterBeside(d, part(span, 0.3, 1), 1, 20, 300, '#4f8fb0'); // Lake Ontario
  towersRow(d, part(span, 0, 0.28), rnd, [1], 40, 90);
  landmarkBeside(d, span, 0.55, -1, 60, buildCNTower(), 'The CN Tower', 170, 16);
  furniture(d, span, rnd, [buildLamp(rnd), buildBench()], [10, 16]);
};

// Niagara Falls: the Horseshoe Falls thundering beside the road, and a boat in the mist.
const dressNiagara: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 150, '#7fae4a');
  waterBeside(d, span, 1, 20, 160, '#3f8fa8');
  const f = beside(d, span, 0.5, 1, 140);
  d.place(buildHorseshoeFalls(), d.worldMatrix(f.p.setY(0), f.face), false);
  d.landmark('The Horseshoe Falls', span.district, f.s, f.p.clone().setY(24));
  const b = beside(d, span, 0.5, 1, 70);
  d.place(d.floats(buildMistBoat()), d.worldMatrix(b.p.setY(0), b.face + Math.PI / 2), false);
  const trees = [0, 1].map((i) => buildMaple(rnd.fork(i + 20)));
  for (let s = span.start; s < span.end; s += 9) d.sideProp(rnd.pick(trees), s, -1, rnd.range(3, 12));
};

// Algonquin: autumn maples, lakes, canoes and a moose.
const dressAlgonquin: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 160, '#6f8a3a');
  const trees = [0, 1, 2].map((i) => buildMaple(rnd.fork(i + 30)));
  for (let s = span.start; s < span.end; s += 3) d.sideProp(rnd.pick(trees), s, rnd.chance(0.5) ? -1 : 1, rnd.range(1.5, 24));
  pines(d, span, rnd, 9, [8, 30]);
  waterBeside(d, part(span, 0.2, 0.8), 1, 30, 120, '#3f6f8a');
  const canoes = [0, 1, 2].map((i) => buildCanoe(rnd.fork(i)));
  for (let i = 0; i < 6; i++) d.sideProp(rnd.pick(canoes), at(span, 0.25 + i * 0.08), 1, 24, 0.05);
  const moose = buildMoose();
  const m = beside(d, span, 0.55, -1, 16);
  d.place(moose, d.worldMatrix(m.p, m.face + 1.2));
  d.landmark('A moose in Algonquin Park', span.district, m.s, m.p.clone().setY(3));
  d.sideProp(moose, at(span, 0.85), 1, 12);
};

// The Prairies: golden wheat to the horizon, big sky and grain elevators.
const dressPrairies: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 220, '#d8b860');
  const wheat = buildWheat(40, 30);
  // Fields start just past the verge (the field is 40 × 30 m, so its centre sits well off the road).
  for (let s = span.start + 20; s < span.end - 20; s += 41) for (const side of [-1, 1]) d.sideProp(wheat, s, side, 23, 0.02);
  const elevator = buildGrainElevator();
  let first = true;
  for (const t of [0.2, 0.55, 0.85]) {
    const { p, face, s } = beside(d, span, t, t === 0.55 ? 1 : -1, 50);
    if (d.nearRoad(p, 14)) continue;
    d.place(elevator, d.worldMatrix(p, face));
    if (first) d.landmark('A prairie grain elevator', span.district, s, p.clone().setY(20));
    first = false;
  }
  // A shelterbelt of poplars here and there, far off across the wheat.
  const poplars = [0, 1].map((i) => buildRoundTree(rnd.fork(i + 40), null));
  for (let s = span.start; s < span.end; s += rnd.range(30, 60)) d.sideProp(rnd.pick(poplars), s, rnd.chance(0.5) ? -1 : 1, rnd.range(60, 90));
};

// Banff: the Rockies, a turquoise lake and the castle hotel.
const dressBanff: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 160, '#5f8a3a');
  hills(d, span, rnd, 'snowpeak', 12, [140, 320], [100, 170], [150, 240]);
  pines(d, span, rnd, 3, [2, 40]);
  waterBeside(d, part(span, 0.1, 0.45), 1, 20, 120, '#3fc8c8'); // Moraine Lake's turquoise
  d.landmark('Moraine Lake', span.district, at(span, 0.25), beside(d, span, 0.25, 1, 60).p.setY(4));
  landmarkBeside(d, span, 0.75, -1, 80, buildBanffSprings(), 'The Banff Springs hotel', 40, 30);
};

// The Icefields Parkway: glaciers pouring down between the peaks.
const dressIcefields: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 160, '#7a8a6a', '#a8a898');
  hills(d, span, rnd, 'snowpeak', 14, [140, 360], [100, 180], [160, 260]);
  const g = beside(d, span, 0.5, 1, 160);
  d.place(buildGlacier(200), d.worldMatrix(g.p, g.face), false);
  d.landmark('The Athabasca Glacier', span.district, g.s, g.p.clone().setY(40));
  pines(d, span, rnd, 6, [4, 30]);
};

// Vancouver: glass towers, Stanley Park's totems, and the Lions Gate Bridge.
const dressVancouver: Dresser = (d, span, rnd) => {
  towersRow(d, part(span, 0, 0.5), rnd, [-1], 50, 110);
  waterBeside(d, span, 1, 20, 260, '#3f7a9a');
  const totems = [0, 1, 2].map((i) => buildTotem(rnd.fork(i)));
  let first = true;
  for (let t = 0.55; t < 0.8; t += 0.05) {
    const { p, face, s } = beside(d, span, t, -1, 10);
    if (d.nearRoad(p, 3)) continue;
    d.place(rnd.pick(totems), d.worldMatrix(p, face));
    if (first) d.landmark('The totem poles of Stanley Park', span.district, s, p.clone().setY(10));
    first = false;
  }
  const b = beside(d, span, 0.85, 1, 240);
  d.place(buildSuspensionBridge(460), d.worldMatrix(b.p.setY(0), b.face + Math.PI / 2), false);
  d.landmark('The Lions Gate Bridge', span.district, b.s, b.p.clone().setY(50));
  pines(d, part(span, 0.5, 1), rnd, 5, [3, 20]);
};

// The Pacific coast: surf shacks, totems, orcas in the waves and the end of the road.
const dressTofino: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 110, '#4f7a3a', '#c8b898');
  waterBeside(d, span, 1, 20, 320, '#3f7a9a');
  const shacks = [0, 1, 2].map((i) => buildSurfShack(rnd.fork(i)));
  for (let s = span.start + 30; s < at(span, 0.5); s += 40) d.sideProp(rnd.pick(shacks), s, 1, 8, 0.05);
  const orca = d.floats(buildOrca());
  let first = true;
  for (let i = 0; i < 5; i++) {
    const { p, face, s } = beside(d, span, 0.5 + i * 0.08, 1, 60 + (i % 2) * 30);
    d.place(orca, d.worldMatrix(p.setY(0), face + 1), false);
    if (first) d.landmark('Orcas off Tofino', span.district, s, p.clone().setY(3));
    first = false;
  }
  d.sideProp(buildTotem(rnd.fork(9)), at(span, 0.95), -1, 3);
  d.landmark('The end of the Trans-Canada', span.district, span.end - 20, beside(d, span, 0.98, -1, 6).p.setY(8));
  pines(d, span, rnd, 3, [2, 30]);
};

export const CANADA_DRESSERS = {
  quebec: dressQuebec,
  ottawa: dressOttawa,
  toronto: dressToronto,
  niagara: dressNiagara,
  algonquin: dressAlgonquin,
  prairies: dressPrairies,
  banff: dressBanff,
  icefields: dressIcefields,
  vancouver: dressVancouver,
  tofino: dressTofino,
};

const SEA_RIGHT = new Set(['toronto', 'niagara', 'vancouver', 'tofino']);

export function canadaBackground(d: Decorator, rnd: Random): void {
  const trees = [0, 1, 2].map((i) => (i === 2 ? buildMaple(rnd.fork(i)) : buildFir(rnd.fork(i))));
  tourBackground(d, rnd, { grass: '#7fa84a', trees, hill: 'forest', hillHeight: [80, 170], seaRight: SEA_RIGHT });
}

import type { Dresser, Decorator } from '../Decorator';
import type { Random } from '../../core/Random';
import { walkableHalfWidth } from '../../road/RoadMesh';
import { buildHouse } from '../../models/Buildings';
import { buildRoundTree, buildPalm, buildCypress, buildBush, buildFlowerBush } from '../../models/Nature';
import { buildLamp, buildBench } from '../../models/Props';
import { buildSkyscraper } from '../../models/CityProps';
import { buildLantern } from '../../models/StreetProps';
import { buildTajMahal, buildMughalGarden, buildCamel } from '../../models/LandmarksWorld';
import { buildElephant, buildTukTukProp } from '../../models/LandmarksSriLanka';
import {
  buildBeachShack, buildCow, buildDesertFort, buildDiya, buildDune, buildFishingNet, buildGatewayOfIndia, buildGhat, buildGoanChurch, buildGopuram,
  buildHawaMahal, buildHouseboat, buildIndiaGate, buildKaaliPeeli, buildMarigoldArch, buildPinkShop, buildRedFort, buildRiverBoat, buildRockMemorials,
} from '../../models/LandmarksIndia';
import { beside, furniture, hills, info, landmarkBeside, rows, waterBeside, type Span } from './cities';
import { landAlong } from './sketch';
import { tourBackground } from './tour';

// ————— helpers —————

const at = (span: Span, t: number): number => span.start + (span.end - span.start) * t;
const part = (span: Span, t0: number, t1: number): Span => ({ ...span, start: at(span, t0), end: at(span, t1) });

/** Cows resting by the road, as everywhere in India. */
function cows(d: Decorator, span: Span, rnd: Random, n: number): void {
  const herd = [0, 1, 2].map((i) => buildCow(rnd.fork(i + 90)));
  for (let i = 0; i < n; i++) d.sideProp(rnd.pick(herd), at(span, rnd.range(0.05, 0.95)), rnd.chance(0.5) ? -1 : 1, rnd.range(1, 6), 0.18);
}

/** Auto-rickshaws parked along the kerb. */
function autos(d: Decorator, span: Span, every: number): void {
  const auto = [buildTukTukProp('#3f8a3a'), buildTukTukProp('#f4d23b')];
  let i = 0;
  for (let s = span.start + 20; s < span.end - 10; s += every) d.sideProp(auto[i++ % 2], s, i % 2 ? -1 : 1, 0.6, 0.18);
}

function marigolds(d: Decorator, span: Span, rnd: Random, every: number): void {
  for (let s = span.start + 30; s < span.end - 20; s += every) {
    const f = d.sample(s);
    d.place(buildMarigoldArch(rnd.fork(Math.round(s)), walkableHalfWidth(f.width, f.plaza) + 0.6), d.roadMatrix(s, 0, 0, 0), false);
  }
}

// ————— the ten districts —————

// Delhi: Rajpath's lawns to India Gate, then Old Delhi's bustle past the Red Fort.
const dressDelhi: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 140, '#8fb35a');
  const f = d.sample(at(span, 0.2));
  // The arch spans the whole road (and its pavements): drive straight through it.
  d.place(buildIndiaGate(walkableHalfWidth(f.width, f.plaza) + 1), d.roadMatrix(at(span, 0.2), 0, 0, 0));
  d.landmark('India Gate', span.district, at(span, 0.2), f.position.clone().setY(f.position.y + 30));
  const trees = [0, 1].map((i) => buildRoundTree(rnd.fork(i), null));
  for (let s = span.start + 4; s < at(span, 0.4); s += 12) for (const side of [-1, 1]) d.sideProp(rnd.pick(trees), s, side, 4);
  const shops = [0, 1, 2, 3].map((i) => buildHouse(rnd.fork(i), ['#e8c878', '#e0906a', '#f0e0c0', '#9fd0c8'][i], 'shop'));
  rows(d, part(span, 0.45, 0.95), rnd, () => rnd.pick(shops), [-1], 0.3, 2);
  landmarkBeside(d, span, 0.7, 1, 70, buildRedFort(140), 'The Red Fort', 24, 40);
  autos(d, part(span, 0.45, 1), 22);
  cows(d, span, rnd, 8);
  furniture(d, span, rnd, [buildLamp(rnd), buildBench()], [14, 22]);
};

// Varanasi: ghats down to the Ganges, boats, floating diyas and temple spires.
const dressVaranasi: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 120, '#b8a878');
  waterBeside(d, span, 1, 36, 220, '#6a8a8a'); // Ma Ganga
  const ghats = [0, 1, 2].map((i) => buildGhat(rnd.fork(i)));
  let first = true;
  for (let t = 0.08; t < 0.95; t += 0.1) {
    const g = beside(d, span, t, 1, 20);
    if (d.nearRoad(g.p, 16)) continue;
    // The ghats face the river: their back to the road.
    d.place(rnd.pick(ghats), d.worldMatrix(g.p, g.face + Math.PI));
    if (first) d.landmark('The ghats of Varanasi', span.district, g.s, g.p.clone().setY(14));
    first = false;
  }
  const boats = [0, 1, 2].map((i) => d.floats(buildRiverBoat(rnd.fork(i + 10))));
  const diya = d.floats(buildDiya());
  for (let i = 0; i < 16; i++) {
    const { p, face } = beside(d, span, rnd.range(0.05, 0.95), 1, rnd.range(48, 90));
    d.place(rnd.pick(boats), d.worldMatrix(p.setY(0.2), face + rnd.range(-1, 1)), false);
  }
  for (let i = 0; i < 60; i++) {
    const { p } = beside(d, span, rnd.range(0.3, 0.7), 1, rnd.range(42, 70));
    d.place(diya, d.worldMatrix(p.setY(0.05), rnd.range(0, 6)), false);
  }
  const houses = [0, 1, 2].map((i) => buildHouse(rnd.fork(i + 20), ['#e8c878', '#e59a78', '#f0e0c0'][i], 'narrow'));
  rows(d, span, rnd, () => rnd.pick(houses), [-1], 0.3, 2);
  cows(d, span, rnd, 6);
  marigolds(d, span, rnd, 120);
};

// Agra: the Taj Mahal at the end of its garden, seen straight down the water channel.
const dressAgra: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 200, '#8fb35a');
  const taj = beside(d, span, 0.5, 1, 190);
  if (!d.nearRoad(taj.p, 120)) {
    d.place(buildTajMahal(), d.worldMatrix(taj.p, taj.face));
    d.blockWorld(taj.p.clone().setY(50), 22);
    d.landmark('The Taj Mahal', span.district, taj.s, taj.p.clone().setY(38));
    const g = beside(d, span, 0.5, 1, 95);
    d.place(buildMughalGarden(110), d.worldMatrix(g.p, g.face), false);
  }
  const cypress = [0, 1].map((i) => buildCypress(rnd.fork(i)));
  for (let s = span.start; s < span.end; s += 8) d.sideProp(rnd.pick(cypress), s, -1, rnd.range(2, 6));
  const lamp = buildLantern('#f4d23b');
  for (let s = span.start + 10; s < span.end; s += 24) d.sideProp(lamp, s, 1, 0.8);
  cows(d, span, rnd, 4);
  autos(d, part(span, 0, 0.3), 30);
};

// Jaipur: the Pink City's bazaars, the Hawa Mahal and an elephant or two.
const dressJaipur: Dresser = (d, span, rnd) => {
  const shops = [0, 1, 2, 3, 4].map((i) => buildPinkShop(rnd.fork(i)));
  rows(d, part(span, 0, 0.8), rnd, () => rnd.pick(shops), [-1, 1], 0, 2);
  landmarkBeside(d, span, 0.85, 1, 34, buildHawaMahal(), 'Hawa Mahal, the Palace of Winds', 16, 18);
  const elephant = buildElephant();
  for (const t of [0.3, 0.6]) d.sideProp(elephant, at(span, t), -1, 1.4);
  autos(d, span, 26);
  marigolds(d, span, rnd, 90);
  cows(d, span, rnd, 5);
  hills(d, span, rnd, 'rock', 6, [120, 240], [50, 90], [30, 60]); // the Aravalli hills and Amber
};

// The Thar Desert: dunes, camels and the golden fort of Jaisalmer.
const dressThar: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 220, '#e0b878', '#e8c890');
  for (let i = 0; i < 18; i++) {
    const { p, face } = beside(d, span, rnd.range(0, 1), rnd.chance(0.5) ? -1 : 1, rnd.range(40, 160));
    if (!d.nearRoad(p, 30)) d.place(buildDune(rnd.fork(i), rnd.range(30, 60), rnd.range(6, 14)), d.worldMatrix(p, face + rnd.range(-0.5, 0.5)), false);
  }
  landmarkBeside(d, span, 0.75, 1, 150, buildDesertFort(), 'Jaisalmer, the Golden Fort', 30, 50);
  const camel = buildCamel();
  for (let i = 0; i < 7; i++) {
    const { p, face } = beside(d, span, 0.3 + i * 0.015, -1, 18 + i * 1.5);
    if (!d.nearRoad(p, 3)) d.place(camel, d.worldMatrix(p, face + Math.PI / 2), false);
  }
  d.landmark('A camel caravan', span.district, at(span, 0.33), beside(d, span, 0.33, -1, 22).p.setY(3));
  const scrub = [0, 1].map((i) => buildBush(rnd.fork(i + 40), '#8a8a4a'));
  for (let s = span.start; s < span.end; s += rnd.range(12, 24)) d.sideProp(rnd.pick(scrub), s, rnd.chance(0.5) ? -1 : 1, rnd.range(3, 20));
};

// Mumbai: Marine Drive's seafront, the Gateway of India, black-and-yellow taxis and towers.
const dressMumbai: Dresser = (d, span, rnd) => {
  waterBeside(d, span, 1, 16, 300, '#4f8fa8'); // the Arabian Sea
  const towers = [0, 1, 2, 3].map((i) => info(buildSkyscraper(rnd.fork(i), 16, rnd.range(30, 90), 16), 16, 16, 60));
  rows(d, span, rnd, () => rnd.pick(towers), [-1], 3, 5);
  const lamps = buildLamp(rnd);
  for (let s = span.start + 4; s < span.end; s += 14) d.sideProp(lamps, s, 1, 0.8); // the Queen's Necklace
  const taxi = buildKaaliPeeli();
  for (let s = span.start + 16; s < span.end - 10; s += 34) d.sideProp(taxi, s, -1, 0.8, 0.18);
  landmarkBeside(d, span, 0.8, 1, 26, buildGatewayOfIndia(), 'The Gateway of India', 22, 18);
  d.landmark('Marine Drive, the Queen’s Necklace', span.district, at(span, 0.3), beside(d, span, 0.3, 1, 10).p.setY(6));
  const palms = [0, 1].map((i) => buildPalm(rnd.fork(i + 30)));
  for (let s = span.start + 7; s < span.end; s += 28) d.sideProp(rnd.pick(palms), s, -1, 1.2);
};

// Goa: white churches, beach shacks and palms by the sea.
const dressGoa: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 90, '#6fae3a', '#f0dcb0');
  waterBeside(d, span, 1, 30, 300, '#3fa8c0');
  landmarkBeside(d, span, 0.2, -1, 40, buildGoanChurch(), 'The white church of Panjim', 20, 20);
  const shacks = [0, 1, 2, 3].map((i) => buildBeachShack(rnd.fork(i)));
  for (let s = at(span, 0.35); s < span.end - 10; s += 30) d.sideProp(rnd.pick(shacks), s, 1, 14, 0.05);
  d.landmark('The beach shacks of Goa', span.district, at(span, 0.5), beside(d, span, 0.5, 1, 18).p.setY(3));
  const palms = [0, 1, 2].map((i) => buildPalm(rnd.fork(i + 50)));
  for (let s = span.start + 3; s < span.end; s += 6) d.sideProp(rnd.pick(palms), s, rnd.chance(0.6) ? 1 : -1, rnd.range(1, 10));
  const houses = [0, 1, 2, 3].map((i) => buildHouse(rnd.fork(i + 60), ['#f4d23b', '#3e9fd8', '#e8559a', '#5dbb3f'][i], 'colonial'));
  rows(d, part(span, 0.4, 0.9), rnd, () => rnd.pick(houses), [-1], 3, 3);
};

// Kerala: the backwaters, houseboats, Chinese fishing nets and coconut palms.
const dressKerala: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 120, '#4f9a3a');
  waterBeside(d, span, 1, 10, 90, '#3f8a7a');
  waterBeside(d, part(span, 0.3, 0.7), -1, 14, 40, '#3f8a7a');
  const boats = [0, 1, 2].map((i) => d.floats(buildHouseboat(rnd.fork(i))));
  let named = false;
  for (let t = 0.1; t < 0.95; t += 0.14) {
    const { p, face, s } = beside(d, span, t, 1, 26);
    d.place(rnd.pick(boats), d.worldMatrix(p.setY(0.3), face + Math.PI / 2), false);
    if (!named) d.landmark('A houseboat on the backwaters', span.district, s, p.clone().setY(4));
    named = true;
  }
  const net = buildFishingNet();
  for (const t of [0.6, 0.66, 0.72]) {
    const { p, face } = beside(d, span, t, 1, 12);
    d.place(net, d.worldMatrix(p, face + Math.PI));
  }
  d.landmark('The Chinese fishing nets', span.district, at(span, 0.66), beside(d, span, 0.66, 1, 20).p.setY(8));
  const palms = [0, 1, 2].map((i) => buildPalm(rnd.fork(i + 70)));
  for (let s = span.start; s < span.end; s += 4) d.sideProp(rnd.pick(palms), s, rnd.chance(0.5) ? -1 : 1, rnd.range(0.8, 6));
  hills(d, span, rnd, 'tea', 6, [160, 280], [60, 100], [40, 70]); // the Western Ghats
};

// Madurai: the gopurams of the Meenakshi temple and a flower market.
const dressMadurai: Dresser = (d, span, rnd) => {
  const houses = [0, 1, 2, 3].map((i) => buildHouse(rnd.fork(i), ['#f0e0c0', '#e8c878', '#9fd0c8', '#e8a0b8'][i], 'shop'));
  rows(d, part(span, 0, 0.4), rnd, () => rnd.pick(houses), [-1, 1], 0.3, 2);
  landmarkBeside(d, span, 0.6, 1, 60, buildGopuram(rnd.fork(1)), 'The Meenakshi temple gopuram', 30, 16);
  for (const [t, side] of [[0.55, -1], [0.7, 1], [0.8, -1]] as const) {
    const { p, face } = beside(d, span, t, side, 70);
    if (!d.nearRoad(p, 16)) d.place(buildGopuram(rnd.fork(Math.round(t * 100))), d.worldMatrix(p, face, 0.75));
  }
  const flowers = [0, 1].map((i) => buildFlowerBush(rnd.fork(i + 20)));
  for (let s = span.start + 3; s < at(span, 0.4); s += 5) d.sideProp(rnd.pick(flowers), s, rnd.chance(0.5) ? -1 : 1, 0.6);
  marigolds(d, span, rnd, 70);
  autos(d, span, 30);
  cows(d, span, rnd, 5);
  const elephant = buildElephant();
  d.sideProp(elephant, at(span, 0.5), 1, 2);
};

// Kanyakumari: the southern tip, three seas meeting, and the rock memorials offshore.
const dressKanyakumari: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 90, '#6fae3a', '#e6d6b0');
  waterBeside(d, span, 1, 16, 320, '#3f8fb8');
  const r = beside(d, span, 0.7, 1, 160);
  d.place(buildRockMemorials(), d.worldMatrix(r.p.setY(0), r.face), false);
  d.landmark('Vivekananda Rock and the Thiruvalluvar statue', span.district, r.s, r.p.clone().setY(20));
  const palms = [0, 1, 2].map((i) => buildPalm(rnd.fork(i + 80)));
  for (let s = span.start + 4; s < span.end; s += 8) d.sideProp(rnd.pick(palms), s, -1, rnd.range(1, 8));
  const boats = [0, 1].map((i) => d.floats(buildRiverBoat(rnd.fork(i + 5))));
  for (let i = 0; i < 8; i++) {
    const { p, face } = beside(d, span, 0.1 + i * 0.05, 1, 30 + (i % 3) * 8);
    d.place(rnd.pick(boats), d.worldMatrix(p.setY(0.2), face), false);
  }
  d.landmark('Land’s end of India', span.district, span.end - 20, beside(d, span, 0.98, 1, 30).p.setY(4));
};

export const INDIA_DRESSERS = {
  delhi: dressDelhi,
  varanasi: dressVaranasi,
  agra: dressAgra,
  jaipur: dressJaipur,
  thar: dressThar,
  mumbai: dressMumbai,
  goa: dressGoa,
  kerala: dressKerala,
  madurai: dressMadurai,
  kanyakumari: dressKanyakumari,
};

const SEA_RIGHT = new Set(['mumbai', 'goa', 'kanyakumari', 'varanasi']);

export function indiaBackground(d: Decorator, rnd: Random): void {
  const trees = [0, 1, 2].map((i) => (i === 2 ? buildPalm(rnd.fork(i)) : buildRoundTree(rnd.fork(i), null)));
  tourBackground(d, rnd, { grass: '#9ab85a', trees, hill: 'grass', hillHeight: [50, 110], seaRight: SEA_RIGHT });
}

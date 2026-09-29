import type { Dresser, Decorator } from '../Decorator';
import type { Random } from '../../core/Random';
import { walkableHalfWidth } from '../../road/RoadMesh';
import { buildRoundTree, buildPalm, buildBush, buildCypress } from '../../models/Nature';
import { buildLamp, buildBench } from '../../models/Props';
import { buildSkyscraper, buildCrossing } from '../../models/CityProps';
import { buildLantern } from '../../models/StreetProps';
import { buildBeachUmbrella, buildNeonSign, buildNeonWall, buildTokyoTower, buildVendingMachine } from '../../models/LandmarksCities';
import { buildBambooClump, buildCherryTree, buildFox, buildFuji, buildLanternString, buildPagoda, buildStoneLantern, buildTorii } from '../../models/LandmarksAsia';
import { buildMachiya } from '../../models/LandmarksPostcards';
import {
  buildCrabShop, buildDeer, buildGasshoHouse, buildGoldenPavilion, buildGreatHall, buildJapaneseCastle, buildOnsen, buildRedBridge, buildRicePaddy,
  buildRyukyuHouse, buildSeaTorii, buildShinkansen, buildShisa, buildSteamVent, buildThunderGate, buildViaduct,
} from '../../models/LandmarksJapan';
import { beside, furniture, hills, info, landmarkBeside, rows, waterBeside, type Span } from './cities';
import { landAlong } from './sketch';
import { tourBackground } from './tour';

// ————— helpers —————

/** Machiya townhouses shoulder to shoulder along both sides. */
function machiyaRows(d: Decorator, span: Span, rnd: Random, t0 = 0, t1 = 1): void {
  const houses = [0, 1, 2, 3].map((i) => info(buildMachiya(rnd.fork(i)), 6.5, 7, 7));
  rows(d, { ...span, start: span.start + (span.end - span.start) * t0, end: span.start + (span.end - span.start) * t1 }, rnd, () => rnd.pick(houses), [-1, 1], 0.4, 1.5);
}

/** Cherry trees lining the road. */
function sakura(d: Decorator, span: Span, rnd: Random, every: number, side = 0): void {
  const trees = [0, 1, 2].map((i) => buildCherryTree(rnd.fork(i + 50)));
  for (let s = span.start + 4; s < span.end; s += every) d.sideProp(rnd.pick(trees), s, side || (rnd.chance(0.5) ? -1 : 1), rnd.range(1.5, 4));
}

/** A tunnel of torii over the road. */
function toriiTunnel(d: Decorator, span: Span, t0: number, t1: number, gap = 3.2): void {
  const f = d.sample(span.start + (span.end - span.start) * t0);
  const torii = buildTorii(walkableHalfWidth(f.width, 0) + 0.2);
  for (let s = span.start + (span.end - span.start) * t0; s < span.start + (span.end - span.start) * t1; s += gap) d.place(torii, d.roadMatrix(s, 0, 0, 0), false);
}

// ————— the ten districts —————

// Tokyo: Asakusa's Thunder Gate, then Shibuya: towers, neon, the scramble crossing and Tokyo Tower.
const dressAsakusa: Dresser = (d, span, rnd) => {
  machiyaRows(d, span, rnd, 0.05, 0.3);
  const gs = span.start + 30;
  const gf = d.sample(gs);
  d.place(buildThunderGate(walkableHalfWidth(gf.width, 0) + 1.5), d.roadMatrix(gs, 0, 0, 0));
  d.landmark('Kaminarimon, the Thunder Gate', span.district, gs, gf.position.clone().setY(gf.position.y + 9));
  const towers = [0, 1, 2, 3, 4].map((i) => info(buildSkyscraper(rnd.fork(i), 14, rnd.range(30, 80), 14), 14, 14, 50));
  rows(d, { ...span, start: span.start + (span.end - span.start) * 0.35 }, rnd, () => rnd.pick(towers), [-1, 1], 2, 4);
  const walls = [0, 1].map((i) => buildNeonWall(rnd.fork(i + 20), 12, 18));
  for (let s = span.start + (span.end - span.start) * 0.4; s < span.end - 20; s += 60) d.sideProp(rnd.pick(walls), s, s % 120 < 60 ? -1 : 1, 16);
  const signs = [0, 1, 2, 3].map((i) => buildNeonSign(rnd.fork(i + 10)));
  for (let s = span.start + (span.end - span.start) * 0.35; s < span.end - 6; s += 6) d.sideProp(rnd.pick(signs), s, s % 12 < 6 ? -1 : 1, 2.4);
  furniture(d, span, rnd, [buildVendingMachine(), buildLamp(rnd), buildLantern('#d8263a')], [12, 20]);
  const mid = span.start + (span.end - span.start) * 0.6;
  const f = d.sample(mid);
  d.place(buildCrossing(f.width), d.roadMatrix(mid, 0, 0.02, 0), false);
  d.place(buildCrossing(f.width), d.roadMatrix(mid, 0, 0.02, Math.PI / 2), false);
  d.landmark('The Shibuya scramble', span.district, mid, f.position.clone().setY(f.position.y + 8));
  landmarkBeside(d, span, 0.85, 1, 90, buildTokyoTower(), 'Tokyo Tower', 90, 20);
};

// Hakone and Mount Fuji: a lake, a torii at the water's edge, cedars and the mountain.
const dressFuji: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 170, '#6fa04a');
  waterBeside(d, span, 1, 16, 150, '#4f8fb0'); // Lake Ashi
  const fuji = beside(d, span, 0.55, 1, 900);
  d.place(buildFuji(420, 360), d.worldMatrix(fuji.p, 0), false);
  d.landmark('Mount Fuji', span.district, fuji.s, fuji.p.clone().setY(300));
  landmarkBeside(d, span, 0.3, 1, 14, buildTorii(5, 9), 'The lakeside torii of Hakone', 6, 6);
  const cedars = [0, 1, 2].map((i) => buildCypress(rnd.fork(i)));
  for (let s = span.start; s < span.end; s += rnd.range(4, 8)) d.sideProp(rnd.pick(cedars), s, -1, rnd.range(2, 16));
  hills(d, span, rnd, 'forest', 8, [60, 180], [50, 100], [40, 90]);
  sakura(d, span, rnd, 30, 1);
};

// Shirakawa-go: thatched gasshō farmhouses among rice paddies, with the Shinkansen passing on a viaduct.
const dressShirakawa: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 170, '#7fae3a');
  const houses = [0, 1, 2, 3, 4].map((i) => buildGasshoHouse(rnd.fork(i)));
  rows(d, { ...span, start: span.start + (span.end - span.start) * 0.15, end: span.start + (span.end - span.start) * 0.5 }, rnd, () => rnd.pick(houses), [-1, 1], 8, 6);
  const paddy = buildRicePaddy(24, 14);
  for (let s = span.start + (span.end - span.start) * 0.5; s < span.end - 10; s += 26) for (const side of [-1, 1]) d.sideProp(paddy, s, side, 12, 0.02);
  for (let s = span.start; s < span.start + (span.end - span.start) * 0.15; s += 26) d.sideProp(paddy, s, 1, 12, 0.02);
  landmarkBeside(d, span, 0.3, -1, 40, houses[0].geometry, 'Shirakawa-gō', 10, 10, 1.3);
  // The bullet train on its viaduct, running beside the road.
  const v = beside(d, span, 0.7, -1, 70);
  if (!d.nearRoad(v.p, 30)) {
    const yaw = Math.atan2(v.frame.tangent.x, v.frame.tangent.z);
    d.place(buildViaduct(260, 9), d.worldMatrix(v.p.clone().setY(0).addScaledVector(v.frame.tangent.clone().setY(0).normalize(), -130), yaw), false);
    d.place(buildShinkansen(6), d.worldMatrix(v.p.clone().setY(9.6).addScaledVector(v.frame.tangent.clone().setY(0).normalize(), -60), yaw), false);
    d.landmark('The Shinkansen', span.district, v.s, v.p.clone().setY(12));
  }
  hills(d, span, rnd, 'forest', 10, [80, 220], [60, 120], [50, 110]);
};

// Kyoto: machiya lanes, a torii tunnel, bamboo, the Golden Pavilion and the Yasaka pagoda.
const dressKinkakuji: Dresser = (d, span, rnd) => {
  machiyaRows(d, span, rnd, 0, 0.35);
  for (let s = span.start + 14; s < span.start + (span.end - span.start) * 0.35; s += 18) {
    const fr = d.sample(s);
    d.place(buildLanternString(rnd.fork(Math.round(s)), walkableHalfWidth(fr.width, fr.plaza) + 2, 6.5), d.roadMatrix(s, 0, 0, 0), false);
  }
  landmarkBeside(d, span, 0.2, 1, 30, buildPagoda(), 'The Yasaka pagoda', 14, 9, 1.2);
  toriiTunnel(d, span, 0.4, 0.55);
  const fox = buildFox();
  d.sideProp(fox, span.start + (span.end - span.start) * 0.4 - 4, -1, 0.6);
  d.sideProp(fox, span.start + (span.end - span.start) * 0.4 - 4, 1, 0.6);
  const bamboo = [0, 1, 2].map((i) => buildBambooClump(rnd.fork(i), 14));
  for (let s = span.start + (span.end - span.start) * 0.58; s < span.start + (span.end - span.start) * 0.75; s += 2.5) for (const side of [-1, 1]) d.sideProp(rnd.pick(bamboo), s, side, rnd.range(0.4, 2));
  landmarkBeside(d, span, 0.87, 1, 45, buildGoldenPavilion(), 'Kinkaku-ji, the Golden Pavilion', 10, 22);
  sakura(d, { ...span, start: span.start + (span.end - span.start) * 0.78 }, rnd, 12);
};

// Nara: the deer park, stone lanterns and the Great Buddha Hall.
const dressNara: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 150, '#7fae4a');
  landmarkBeside(d, span, 0.55, 1, 60, buildGreatHall(), 'Tōdai-ji, the Great Buddha Hall', 20, 32);
  const lamp = buildStoneLantern();
  for (let s = span.start + 6; s < span.end - 6; s += 9) for (const side of [-1, 1]) d.sideProp(lamp, s, side, 0.6);
  const deer = buildDeer();
  for (let i = 0; i < 40; i++) {
    const { p, face } = beside(d, span, rnd.range(0.05, 0.95), rnd.chance(0.5) ? -1 : 1, rnd.range(5, 30));
    if (!d.nearRoad(p, 3.5)) d.place(deer, d.worldMatrix(p, face + rnd.range(-2, 2)), false);
  }
  d.landmark('The deer of Nara Park', span.district, span.start + (span.end - span.start) * 0.2, beside(d, span, 0.2, -1, 12).p.setY(2));
  landmarkBeside(d, span, 0.85, -1, 36, buildPagoda(), 'Kōfuku-ji pagoda', 14, 9, 1.4);
  const trees = [0, 1].map((i) => buildRoundTree(rnd.fork(i + 30), null));
  for (let s = span.start; s < span.end; s += rnd.range(8, 14)) d.sideProp(rnd.pick(trees), s, rnd.chance(0.5) ? -1 : 1, rnd.range(8, 30));
  sakura(d, span, rnd, 24);
};

// Osaka: Dōtonbori's canal, neon and giant crab, then the castle over its moat.
const dressOsaka: Dresser = (d, span, rnd) => {
  const walls = [0, 1, 2].map((i) => info(buildNeonWall(rnd.fork(i), 12, rnd.range(14, 22)), 12, 6, 18));
  rows(d, { ...span, end: span.start + (span.end - span.start) * 0.45 }, rnd, () => rnd.pick(walls), [-1], 0.5, 2);
  waterBeside(d, { ...span, end: span.start + (span.end - span.start) * 0.45 }, 1, 6, 24, '#3f6f8a'); // the canal
  landmarkBeside(d, span, 0.25, -1, 26, buildCrabShop(), 'The Dōtonbori crab', 14, 8);
  const lanterns = [buildLantern('#d8263a'), buildLantern('#f4d23b')];
  for (let s = span.start + 5; s < span.start + (span.end - span.start) * 0.45; s += 6) d.sideProp(rnd.pick(lanterns), s, -1, 1);
  const towers = [0, 1, 2].map((i) => info(buildSkyscraper(rnd.fork(i + 40), 16, rnd.range(40, 90), 16), 16, 16, 60));
  rows(d, { ...span, start: span.start + (span.end - span.start) * 0.5, end: span.start + (span.end - span.start) * 0.7 }, rnd, () => rnd.pick(towers), [-1], 4, 5);
  const c = beside(d, span, 0.82, 1, 110);
  if (!d.nearRoad(c.p, 60)) {
    waterBeside(d, { ...span, start: span.start + (span.end - span.start) * 0.7 }, 1, 50, 20, '#4f7f8a'); // the moat
    d.place(buildJapaneseCastle(false), d.worldMatrix(c.p, c.face));
    d.blockWorld(c.p.clone().setY(20), 25);
    d.landmark('Osaka Castle', span.district, c.s, c.p.clone().setY(36));
  }
  sakura(d, { ...span, start: span.start + (span.end - span.start) * 0.7 }, rnd, 10, 1);
};

// Himeji: the White Heron castle above a sea of cherry blossom.
const dressHimeji: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 150, '#8fb35a');
  sakura(d, span, rnd, 6);
  landmarkBeside(d, span, 0.5, 1, 100, buildJapaneseCastle(true), 'Himeji Castle, the White Heron', 36, 28, 1.2);
  machiyaRows(d, span, rnd, 0, 0.25);
  furniture(d, { ...span, end: span.start + (span.end - span.start) * 0.25 }, rnd, [buildLamp(rnd), buildBench(), buildVendingMachine()]);
  hills(d, span, rnd, 'forest', 6, [120, 240], [60, 100], [30, 60]);
};

// Miyajima: the sea, the vermilion torii standing in the water, and deer on the shore.
const dressMiyajima: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 100, '#6fa04a', '#e6d6b0');
  waterBeside(d, span, 1, 14, 300, '#4f9ab8');
  const g = beside(d, span, 0.5, 1, 70);
  d.place(d.floats(buildSeaTorii()), d.worldMatrix(g.p.setY(0), g.face), false);
  d.landmark('The floating torii of Itsukushima', span.district, g.s, g.p.clone().setY(12));
  const lamp = buildStoneLantern();
  for (let s = span.start + 8; s < span.end - 6; s += 14) d.sideProp(lamp, s, 1, 1.2);
  const deer = buildDeer();
  for (let i = 0; i < 12; i++) d.sideProp(deer, span.start + rnd.range(0.1, 0.9) * (span.end - span.start), -1, rnd.range(2, 12));
  landmarkBeside(d, span, 0.8, -1, 40, buildPagoda(), 'The five-storey pagoda of Miyajima', 14, 9);
  hills(d, { ...span }, rnd, 'forest', 6, [80, 200], [70, 120], [60, 110]);
  const maples = [0, 1].map((i) => buildBush(rnd.fork(i + 60), '#d8452f'));
  for (let s = span.start; s < span.end; s += rnd.range(6, 10)) d.sideProp(rnd.pick(maples), s, -1, rnd.range(2, 10));
};

// Beppu: hot-spring inns, steam from every vent, a red bridge over the stream.
const dressBeppu: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 160, '#6f9a4a');
  hills(d, span, rnd, 'forest', 12, [70, 200], [60, 110], [50, 100]);
  landmarkBeside(d, span, 0.15, -1, 26, buildOnsen(rnd.fork(0)), 'A hot-spring ryokan', 6, 12);
  for (let i = 1; i < 3; i++) {
    const { p, face } = beside(d, span, 0.15 + i * 0.3, i % 2 ? 1 : -1, 26);
    if (d.nearRoad(p, 12)) continue;
    d.place(buildOnsen(rnd.fork(i)), d.worldMatrix(p, face));
    d.blockWorld(p.clone().setY(3), 12);
  }
  const vents = [0, 1, 2].map((i) => buildSteamVent(rnd.fork(i + 10)));
  for (let i = 0; i < 14; i++) {
    const { p } = beside(d, span, rnd.range(0.05, 0.95), rnd.chance(0.5) ? -1 : 1, rnd.range(20, 70));
    if (!d.nearRoad(p, 6)) d.place(rnd.pick(vents), d.worldMatrix(p, 0), false);
  }
  landmarkBeside(d, span, 0.6, 1, 34, buildRedBridge(24), 'The red bridge over the stream', 4, 14);
  const lanterns = [buildLantern('#f4d23b'), buildLantern('#f6f0e4')];
  for (let s = span.start + 6; s < span.end; s += 16) d.sideProp(rnd.pick(lanterns), s, rnd.chance(0.5) ? -1 : 1, 0.8);
};

// Okinawa: coral-walled Ryūkyū houses with shīsā, palms, a white beach and turquoise sea.
const dressOkinawa: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 90, '#7fbf4a', '#f4ead0');
  waterBeside(d, span, 1, 20, 320, '#3fc0c8');
  const houses = [0, 1, 2, 3].map((i) => buildRyukyuHouse(rnd.fork(i)));
  rows(d, { ...span, end: span.start + (span.end - span.start) * 0.45 }, rnd, () => rnd.pick(houses), [-1], 1, 2);
  const shisa = buildShisa();
  for (let s = span.start + 20; s < span.end; s += 80) d.sideProp(shisa, s, -1, 0.6, 0.18, 1, 2);
  landmarkBeside(d, span, 0.2, -1, 30, buildShisa(), 'A shīsā guarding the village', 2, 3, 4);
  const palms = [0, 1, 2].map((i) => buildPalm(rnd.fork(i + 80)));
  for (let s = span.start + 4; s < span.end; s += 9) d.sideProp(rnd.pick(palms), s, 1, rnd.range(1.5, 6));
  const umbrellas = ['#e0432f', '#f4d23b', '#3e9fd8', '#e8559a'].map((c) => buildBeachUmbrella(c));
  for (let s = span.start + (span.end - span.start) * 0.5; s < span.end - 10; s += 14) d.sideProp(rnd.pick(umbrellas), s, 1, 10, 0.05);
  d.landmark('The Okinawa coast', span.district, span.end - 30, beside(d, span, 0.95, 1, 60).p.setY(4));
};

export const JAPAN_DRESSERS = {
  asakusa: dressAsakusa,
  fuji: dressFuji,
  shirakawa: dressShirakawa,
  kinkakuji: dressKinkakuji,
  nara: dressNara,
  osaka: dressOsaka,
  himeji: dressHimeji,
  miyajima: dressMiyajima,
  beppu: dressBeppu,
  okinawa: dressOkinawa,
};

const SEA_RIGHT = new Set(['miyajima', 'okinawa']);

export function japanBackground(d: Decorator, rnd: Random): void {
  const trees = [0, 1, 2].map((i) => (i === 0 ? buildCherryTree(rnd.fork(i)) : i === 1 ? buildCypress(rnd.fork(i)) : buildRoundTree(rnd.fork(i), null)));
  tourBackground(d, rnd, { grass: '#6fa04a', trees, hill: 'forest', hillHeight: [90, 180], seaRight: SEA_RIGHT });
}

import * as THREE from 'three';
import type { Dresser, Decorator } from '../Decorator';
import type { Random } from '../../core/Random';
import { walkableHalfWidth } from '../../road/RoadMesh';
import { buildRoundTree, buildPalm, buildCypress } from '../../models/Nature';
import { buildLamp, buildBench } from '../../models/Props';
import { buildSkyscraper } from '../../models/CityProps';
import { buildLantern } from '../../models/StreetProps';
import { buildBeachUmbrella, buildNeonSign } from '../../models/LandmarksCities';
import { buildCherryTree } from '../../models/LandmarksAsia';
import {
  buildBronzeBuddha, buildCheomseongdae, buildChogajip, buildCraterPeak, buildDabotap, buildDolHareubang, buildFortressWall, buildGamcheon, buildGwanghwamun,
  buildHahoeMask, buildHanok, buildMaple, buildPaldalmun, buildScreenTower, buildSeoulTower, buildSuspensionBridge, buildTumulus,
} from '../../models/LandmarksKorea';
import { beside, furniture, hills, landmarkBeside, rows, waterBeside, type Span } from './cities';
import { landAlong } from './sketch';
import { tourBackground } from './tour';

const at = (span: Span, t: number): number => span.start + (span.end - span.start) * t;
const part = (span: Span, t0: number, t1: number): Span => ({ ...span, start: at(span, t0), end: at(span, t1) });

function maples(d: Decorator, span: Span, rnd: Random, every: number, reach = 12): void {
  const trees = [0, 1, 2].map((i) => buildMaple(rnd.fork(i + 70)));
  for (let s = span.start + 3; s < span.end; s += every) d.sideProp(rnd.pick(trees), s, rnd.chance(0.5) ? -1 : 1, rnd.range(1.5, reach));
}

// ————— the ten districts —————

// Seoul: through Gwanghwamun into the palace quarter, hanok lanes, and N Seoul Tower on Namsan.
const dressSeoul: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 140, '#8fb35a');
  const gs = at(span, 0.12);
  const gf = d.sample(gs);
  d.place(buildGwanghwamun(walkableHalfWidth(gf.width, gf.plaza) + 1), d.roadMatrix(gs, 0, 0, 0));
  d.landmark('Gwanghwamun Gate', span.district, gs, gf.position.clone().setY(gf.position.y + 16));
  const hanok = [0, 1, 2, 3].map((i) => buildHanok(rnd.fork(i)));
  rows(d, part(span, 0.2, 0.65), rnd, () => rnd.pick(hanok), [-1, 1], 1, 2);
  d.landmark('Bukchon hanok village', span.district, at(span, 0.4), beside(d, span, 0.4, 1, 10).p.setY(6));
  landmarkBeside(d, span, 0.85, 1, 160, buildSeoulTower(), 'N Seoul Tower on Namsan', 90, 50);
  const lanterns = [buildLantern('#e0302a'), buildLantern('#3e6fa8'), buildLantern('#f4d23b')];
  for (let s = at(span, 0.2); s < at(span, 0.65); s += 8) d.sideProp(rnd.pick(lanterns), s, rnd.chance(0.5) ? -1 : 1, 0.6);
  sakuraRow(d, part(span, 0.66, 1), rnd, 12);
};

function sakuraRow(d: Decorator, span: Span, rnd: Random, every: number): void {
  const trees = [0, 1].map((i) => buildCherryTree(rnd.fork(i + 40)));
  for (let s = span.start + 4; s < span.end; s += every) for (const side of [-1, 1]) d.sideProp(rnd.pick(trees), s, side, 2.5);
}

// Gangnam: glass towers, giant K-pop screens and neon.
const dressGangnam: Dresser = (d, span, rnd) => {
  const towers = [0, 1, 2, 3, 4].map((i) => buildScreenTower(rnd.fork(i)));
  rows(d, span, rnd, () => rnd.pick(towers), [-1, 1], 3, 4);
  const signs = [0, 1, 2, 3].map((i) => buildNeonSign(rnd.fork(i + 10)));
  for (let s = span.start + 6; s < span.end - 6; s += 6) d.sideProp(rnd.pick(signs), s, s % 12 < 6 ? -1 : 1, 2.4);
  d.landmark('The K-pop screens of Gangnam', span.district, at(span, 0.5), d.sample(at(span, 0.5)).position.clone().add(new THREE.Vector3(0, 30, 0)));
  furniture(d, span, rnd, [buildLamp(rnd), buildBench()], [10, 16]);
};

// Suwon: the Hwaseong fortress wall beside the road and the Paldalmun gate.
const dressSuwon: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 150, '#8fb35a');
  const wall = buildFortressWall(30);
  for (let s = span.start + 20; s < at(span, 0.8); s += 30.5) d.sideProp(wall, s, 1, 8, 0.05);
  d.landmark('The Hwaseong fortress walls', span.district, at(span, 0.3), beside(d, span, 0.3, 1, 12).p.setY(7));
  landmarkBeside(d, span, 0.6, -1, 50, buildPaldalmun(), 'Paldalmun, the south gate', 16, 26);
  const hanok = [0, 1, 2].map((i) => buildHanok(rnd.fork(i + 20)));
  rows(d, part(span, 0, 0.4), rnd, () => rnd.pick(hanok), [-1], 1, 2);
  const flags = [buildLantern('#f4d23b'), buildLantern('#3e6fa8')];
  for (let s = span.start + 10; s < span.end; s += 15) d.sideProp(rnd.pick(flags), s, 1, 1);
};

// Seoraksan: granite peaks, autumn maples and the great bronze Buddha.
const dressSeorak: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 170, '#6f8a3a');
  hills(d, span, rnd, 'rock', 14, [60, 200], [50, 100], [70, 150]);
  maples(d, span, rnd, 3, 20);
  landmarkBeside(d, span, 0.5, 1, 45, buildBronzeBuddha(), 'The bronze Buddha of Sinheungsa', 12, 12);
  d.landmark('Autumn on Seoraksan', span.district, at(span, 0.2), beside(d, span, 0.2, -1, 20).p.setY(8));
};

// Andong: Hahoe folk village, thatched houses by the river, and the masks.
const dressAndong: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 150, '#9ab85a');
  waterBeside(d, span, 1, 30, 60, '#5a8aa8');
  const houses = [0, 1, 2, 3].map((i) => buildChogajip(rnd.fork(i)));
  rows(d, part(span, 0.1, 0.7), rnd, () => rnd.pick(houses), [-1], 3, 3);
  const mask = buildHahoeMask();
  for (const t of [0.25, 0.55, 0.85]) d.sideProp(mask, at(span, t), 1, 3, 0.05);
  d.landmark('The masks of Hahoe', span.district, at(span, 0.25), beside(d, span, 0.25, 1, 8).p.setY(8));
  landmarkBeside(d, span, 0.4, -1, 40, buildHanok(rnd.fork(9)).geometry, 'Hahoe folk village', 5, 10, 1.4);
  const pines = [0, 1].map((i) => buildCypress(rnd.fork(i + 30)));
  for (let s = span.start; s < span.end; s += 10) d.sideProp(rnd.pick(pines), s, 1, rnd.range(8, 20));
};

// Gyeongju: grassy royal tombs, the star-gazing tower and Bulguksa's pagoda.
const dressGyeongju: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 170, '#8fb35a');
  let first = true;
  for (let i = 0; i < 12; i++) {
    const { p, s } = beside(d, span, 0.1 + i * 0.035, i % 2 ? 1 : -1, rnd.range(30, 60));
    if (d.nearRoad(p, 22)) continue;
    d.place(buildTumulus(rnd.fork(i), rnd.range(14, 24)), d.worldMatrix(p, 0), false);
    if (first) d.landmark('The royal tombs of Gyeongju', span.district, s, p.clone().setY(10));
    first = false;
  }
  landmarkBeside(d, span, 0.6, 1, 22, buildCheomseongdae(), 'Cheomseongdae observatory', 8, 5);
  landmarkBeside(d, span, 0.82, -1, 34, buildDabotap(), 'Dabotap pagoda at Bulguksa', 8, 6, 1.4);
  sakuraRow(d, part(span, 0.5, 1), rnd, 14);
};

// Boseong: green tea terraces rolling over the hills.
const dressBoseong: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 170, '#5f9a3a');
  hills(d, span, rnd, 'tea', 22, [18, 120], [30, 70], [18, 44]);
  d.landmark('The tea fields of Boseong', span.district, at(span, 0.4), beside(d, span, 0.4, 1, 40).p.setY(18));
  const cedars = [0, 1].map((i) => buildCypress(rnd.fork(i + 10)));
  for (let s = span.start; s < span.end; s += 6) for (const side of [-1, 1]) d.sideProp(rnd.pick(cedars), s, side, 1.5);
};

// Busan's Gamcheon: a whole hillside of painted houses.
const dressGamcheon: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 150, '#7a9a5a');
  landmarkBeside(d, span, 0.45, -1, 80, buildGamcheon(rnd.fork(1)), 'Gamcheon Culture Village', 20, 40);
  const g2 = beside(d, span, 0.8, 1, 90);
  if (!d.nearRoad(g2.p, 50)) d.place(buildGamcheon(rnd.fork(2)), d.worldMatrix(g2.p, g2.face));
  const houses = [0, 1, 2].map((i) => buildHanok(rnd.fork(i + 50)));
  rows(d, part(span, 0, 0.3), rnd, () => rnd.pick(houses), [1], 1, 2);
  furniture(d, span, rnd, [buildLamp(rnd), buildBench()], [14, 20]);
};

// Busan's Haeundae: the beach, umbrellas, and Gwangan Bridge lit across the bay.
const dressHaeundae: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 90, '#8fb35a', '#f0e0b8');
  waterBeside(d, span, 1, 24, 360, '#3f8fb8');
  const towers = [0, 1, 2].map((i) => {
    const h = rnd.range(60, 120);
    return { geometry: buildSkyscraper(rnd.fork(i), 18, h, 18), width: 18, depth: 18, height: h };
  });
  rows(d, span, rnd, () => rnd.pick(towers), [-1], 5, 5);
  const umbrellas = ['#e0432f', '#f4d23b', '#3e9fd8', '#e8559a', '#5dbb3f'].map((c) => buildBeachUmbrella(c));
  for (let s = span.start + 10; s < span.end - 10; s += 7) d.sideProp(rnd.pick(umbrellas), s, 1, rnd.range(8, 18), 0.05);
  d.landmark('Haeundae Beach', span.district, at(span, 0.3), beside(d, span, 0.3, 1, 14).p.setY(3));
  const b = beside(d, span, 0.7, 1, 260);
  d.place(buildSuspensionBridge(500), d.worldMatrix(b.p.setY(0), b.face + Math.PI / 2), false);
  d.landmark('Gwangan Bridge', span.district, b.s, b.p.clone().setY(60));
  const palms = [0, 1].map((i) => buildPalm(rnd.fork(i + 30)));
  for (let s = span.start + 5; s < span.end; s += 16) d.sideProp(rnd.pick(palms), s, 1, 2);
};

// Jeju: dol hareubang, tangerine groves, black stone walls and Seongsan's crater over the sea.
const dressJeju: Dresser = (d, span, rnd) => {
  landAlong(d, span.start, span.end, 110, '#6fae3a', '#4a4a4e');
  waterBeside(d, span, 1, 20, 320, '#3fb0c0');
  const dol = buildDolHareubang();
  for (let s = span.start + 20; s < span.end; s += 90) for (const side of [-1, 1]) d.sideProp(dol, s, side, 0.8, 0.18, 1, 4);
  d.landmark('A dol hareubang', span.district, span.start + 20, beside(d, span, 0.02, -1, 8).p.setY(3));
  const tangerines = [0, 1].map((i) => buildRoundTree(rnd.fork(i + 60), '#f08a2e'));
  for (let s = span.start; s < span.end; s += 5) d.sideProp(rnd.pick(tangerines), s, -1, rnd.range(4, 20));
  const crater = beside(d, span, 0.8, 1, 260);
  d.place(buildCraterPeak(), d.worldMatrix(crater.p.setY(0), 0), false);
  d.landmark('Seongsan Ilchulbong, the Sunrise Peak', span.district, crater.s, crater.p.clone().setY(70));
  hills(d, part(span, 0, 0.6), rnd, 'forest', 3, [300, 450], [180, 240], [120, 180]); // Hallasan
};

export const KOREA_DRESSERS = {
  seoul: dressSeoul,
  gangnam: dressGangnam,
  suwon: dressSuwon,
  seorak: dressSeorak,
  andong: dressAndong,
  gyeongju: dressGyeongju,
  boseong: dressBoseong,
  gamcheon: dressGamcheon,
  haeundae: dressHaeundae,
  jeju: dressJeju,
};

const SEA_RIGHT = new Set(['haeundae', 'jeju']);

export function koreaBackground(d: Decorator, rnd: Random): void {
  const trees = [0, 1, 2].map((i) => (i === 2 ? buildMaple(rnd.fork(i)) : buildCypress(rnd.fork(i))));
  tourBackground(d, rnd, { grass: '#7fa84a', trees, hill: 'forest', hillHeight: [80, 160], seaRight: SEA_RIGHT });
}

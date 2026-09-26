import * as THREE from 'three';
import { TrackBuilder } from '../../road/TrackBuilder';
import { Paving } from '../../road/RoadPath';
import type { DistrictDef } from '../Districts';
import type { ChapterDef } from '../Chapters';
import { postcardsBackground } from '../dress/postcards';

const DISTRICTS: DistrictDef[] = [
  {
    id: 'nile',
    name: 'The Nile at Giza',
    kicker: 'chapter five · postcards',
    poem: 'Sails on the river, and three mountains built by hand',
    style: 'nile',
    root: 62,
    scale: 'minor',
    bpm: 96,
    walls: ['#e3c07a'],
    // A Hijaz-like colour within the minor scale.
    melody: [0, 1, 4, 5, 7, 5, 4, 1, 0, 1, 4, 7, 8, 7, 5, 4, 5, 7, 8, 10, 8, 7, 5, 4, 1, 0, 1, 4, 1, 0, -2, 0],
  },
  {
    id: 'santorini',
    name: 'Santorini',
    kicker: 'the caldera · blue and white',
    poem: 'White steps down to a wine-dark sea, a bell over every dome',
    style: 'santorini',
    root: 67,
    scale: 'major',
    bpm: 108,
    walls: ['#fbf8f2'],
    melody: [0, 4, 7, 9, 7, 4, 2, 4, 0, 2, 4, 7, 9, 11, 9, 7, 4, 7, 9, 12, 9, 7, 4, 2, 4, 2, 0, -1, 0, 2, 4, 0],
  },
  {
    id: 'kyoto-night',
    name: 'Kyoto by Night',
    kicker: 'gion · after dark',
    poem: 'Paper lanterns warm the lanes; the pagoda keeps the stars',
    style: 'kyoto',
    root: 60,
    scale: 'minor',
    bpm: 76,
    walls: ['#5a3a2a'],
    melody: [0, 1, 5, 7, 8, 7, 5, 1, 0, 1, 5, 8, 12, 8, 7, 5, 1, 5, 7, 8, 7, 5, 1, 0, -2, 0, 1, 0, -2, -4, -2, 0],
    preset: 'night',
  },
  {
    id: 'kandy',
    name: 'Kandy in the Rain',
    kicker: 'the hill capital · monsoon',
    poem: 'Rain on the lake and the cloud wall; the temple drums keep time',
    style: 'kandy',
    root: 65,
    scale: 'major',
    bpm: 92,
    walls: ['#f7f3ea'],
    melody: [0, 2, 4, 5, 7, 5, 4, 2, 0, 4, 7, 9, 7, 5, 4, 2, 4, 5, 7, 9, 11, 9, 7, 5, 4, 2, 0, 2, 4, 2, 0, 0],
    weather: 'rain',
  },
  {
    id: 'ella',
    name: 'Ella in the Rain',
    kicker: 'the tea hills · the gap',
    poem: 'Green rows drink the rain; the little blue train climbs home',
    style: 'ella',
    root: 64,
    scale: 'major',
    bpm: 100,
    walls: ['#f0e2c4'],
    melody: [0, 4, 7, 4, 2, 4, 0, -1, 0, 2, 4, 7, 9, 7, 4, 2, 0, 4, 7, 12, 11, 9, 7, 4, 2, 4, 2, 0, -1, 0, 2, 0],
    weather: 'rain',
  },
];

/**
 * Chapter 5 · "Postcards" — along the Nile past the pyramids, through
 * Santorini's white lanes, Kyoto's lantern streets at night, and home to
 * Sri Lanka's hills in the monsoon: Kandy's lake and the tea of Ella.
 */
export const POSTCARDS: ChapterDef = {
  id: 'postcards',
  name: 'Postcards',
  kicker: 'chapter five',
  blurb: 'The Nile and the pyramids, Santorini, Kyoto at night, and Kandy and Ella in the rain.',
  districts: DISTRICTS,
  startPreset: 'golden',
  unlockPhrases: 0,
  background: postcardsBackground,
  buildRoute() {
    const b = new TrackBuilder(new THREE.Vector3(0, 6, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), 11);

    // 0 · The Nile — a long, gentle river road with a wide sweep past Giza.
    b.setDistrict(0).setPaving(Paving.Earth);
    b.straight(160, { width: 12 });
    b.turn(-35, 260);
    b.straight(160);
    b.turn(25, 240);
    b.level(20);

    // 1 · Santorini — climb the caldera, then tight lanes along the rim.
    b.setDistrict(1).setPaving(Paving.Slabs);
    b.pitch(8, 120);
    b.straight(120, { width: 9 });
    b.pitch(-8, 120);
    b.level(20);
    b.turn(80, 60);
    b.straight(80, { plaza: 2 });
    b.turn(-80, 60);
    b.straight(70, { plaza: 0 });
    b.level(20);

    // 2 · Kyoto by night — a narrow lantern lane with two right angles.
    b.setDistrict(2).setPaving(Paving.Stone);
    b.straight(90, { width: 9 });
    b.turn(-90, 36);
    b.straight(110);
    b.turn(90, 36);
    b.straight(90);
    b.level(20);

    // 3 · Kandy — the long curve round the lake.
    b.setDistrict(3).setPaving(Paving.Asphalt);
    b.straight(60, { width: 11 });
    b.turn(160, 150);
    b.straight(80);
    b.level(20);

    // 4 · Ella — up through the tea, over a crest, down to the gap.
    b.setDistrict(4).setPaving(Paving.Earth);
    b.pitch(10, 110);
    b.straight(160, { width: 10 });
    b.pitch(-10, 110);
    b.level(20);
    b.turn(-60, 110);
    b.straight(120);
    return b.build();
  },
};

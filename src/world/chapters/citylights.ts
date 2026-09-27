import * as THREE from 'three';
import { TrackBuilder } from '../../road/TrackBuilder';
import { Paving } from '../../road/RoadPath';
import type { DistrictDef } from '../Districts';
import type { ChapterDef } from '../Chapters';
import { cityLightsBackground } from '../dress/cities';

const DISTRICTS: DistrictDef[] = [
  {
    id: 'paris',
    name: 'Paris',
    kicker: 'chapter six · city lights',
    poem: 'Café chairs along the Seine; the iron lady lights up at dusk',
    style: 'paris',
    root: 65,
    scale: 'major',
    bpm: 112,
    walls: ['#efe3cc'],
    // A musette waltz feel.
    melody: [0, 2, 4, 7, 9, 7, 4, 2, 4, 5, 7, 11, 12, 11, 9, 7, 5, 4, 2, 4, 5, 7, 5, 4, 2, 0, -1, 0, 2, 4, 2, 0],
  },
  {
    id: 'london',
    name: 'London',
    kicker: 'the thames · big ben',
    poem: 'Red buses, a river of bridges, and the great bell counting the hour',
    style: 'london',
    root: 64,
    scale: 'major',
    bpm: 100,
    walls: ['#b8674a', '#e8dcc4', '#6d7f8f', '#2f4f3f'],
    // Westminster chimes, then a march.
    melody: [4, 2, 1, -3, -3, 1, 2, 4, 2, 4, 1, -3, -3, 1, 2, 4, 0, 2, 4, 5, 7, 5, 4, 2, 4, 5, 7, 9, 7, 4, 2, 0],
  },
  {
    id: 'venice',
    name: 'Venice',
    kicker: 'the grand canal',
    poem: 'Palaces stand in the water; a gondolier sings under the bridge',
    style: 'venice',
    root: 62,
    scale: 'minor',
    bpm: 84,
    walls: ['#d98a5f', '#e8c07a', '#c96a5a', '#efe3cc'],
    // A barcarolle rocking in 6/8.
    melody: [0, 2, 3, 7, 3, 2, 0, 2, 3, 5, 7, 8, 7, 5, 3, 2, 0, 3, 7, 10, 8, 7, 5, 3, 2, 3, 5, 3, 2, 0, -2, 0],
  },
  {
    id: 'amsterdam',
    name: 'Amsterdam',
    kicker: 'canals · bicycles · tulips',
    poem: 'Tall thin houses lean together; out past the city, stripes of tulips',
    style: 'amsterdam',
    root: 67,
    scale: 'major',
    bpm: 120,
    walls: ['#7a3b2e'],
    melody: [0, 4, 7, 4, 0, 4, 7, 9, 7, 4, 2, 4, 0, 2, 4, 5, 7, 7, 9, 7, 5, 4, 2, 0, 4, 2, 0, -1, 0, 2, 4, 0],
  },
  {
    id: 'barcelona',
    name: 'Barcelona',
    kicker: 'gaudí · the sea front',
    poem: 'A church still growing like a forest, broken tiles laid out like sunlight',
    style: 'barcelona',
    root: 64,
    scale: 'minor',
    bpm: 116,
    walls: ['#e8c9a0', '#d98a5f', '#f2e2c2'],
    // A flamenco-ish Phrygian turn.
    melody: [7, 8, 7, 5, 3, 2, 1, 0, 1, 3, 1, 0, -2, 0, 1, 3, 5, 7, 8, 10, 8, 7, 5, 3, 2, 1, 0, 1, 3, 1, 0, 0],
  },
  {
    id: 'istanbul',
    name: 'Istanbul',
    kicker: 'the bosphorus · two continents',
    poem: 'Domes and minarets over the water where two seas and two continents meet',
    style: 'istanbul',
    root: 62,
    scale: 'minor',
    bpm: 92,
    walls: ['#e8c9a0', '#c96a5a', '#9fb7a8'],
    melody: [0, 1, 4, 5, 7, 8, 7, 5, 4, 1, 0, 1, 4, 5, 4, 1, 0, 4, 7, 8, 10, 8, 7, 5, 4, 5, 4, 1, 0, -1, 0, 0],
  },
  {
    id: 'dubai',
    name: 'Dubai',
    kicker: 'the desert · the tallest tower',
    poem: 'Out of the dunes, a needle of glass taller than any mountain here',
    style: 'dubai',
    root: 60,
    scale: 'minor',
    bpm: 104,
    walls: ['#e3c07a'],
    melody: [0, 1, 4, 5, 7, 5, 4, 1, 0, 4, 7, 8, 12, 8, 7, 4, 5, 7, 8, 7, 5, 4, 1, 0, 1, 4, 5, 4, 1, 0, -1, 0],
    preset: 'golden',
  },
];

/**
 * Chapter 6 · "City Lights" — the great cities of Europe and beyond: Paris,
 * London, Venice, Amsterdam, Barcelona, Istanbul and on to Dubai.
 */
export const CITY_LIGHTS: ChapterDef = {
  id: 'citylights',
  name: 'City Lights',
  kicker: 'chapter six',
  blurb: 'Paris, London, Venice, Amsterdam, Barcelona, Istanbul and Dubai: the world’s favourite cities.',
  districts: DISTRICTS,
  startPreset: 'golden',
  unlockPhrases: 0,
  background: cityLightsBackground,
  buildRoute() {
    const b = new TrackBuilder(new THREE.Vector3(0, 6, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), 12);

    // 0 · Paris — a long boulevard beside the Seine, bending round to the tower.
    b.setDistrict(0).setPaving(Paving.Cobbles);
    b.straight(220, { width: 14 });
    b.turn(30, 300);
    b.straight(160);
    b.level(20);

    // 1 · London — along the Embankment, a swing under Big Ben.
    b.setDistrict(1).setPaving(Paving.Asphalt);
    b.straight(160, { width: 12 });
    b.turn(-45, 200);
    b.straight(200);
    b.turn(30, 220);
    b.level(20);

    // 2 · Venice — a narrow fondamenta beside the canal, over a hump bridge.
    b.setDistrict(2).setPaving(Paving.Slabs);
    b.straight(120, { width: 9 });
    b.pitch(6, 60);
    b.pitch(-6, 60);
    b.level(10);
    b.straight(160);
    b.turn(-40, 150);
    b.level(20);

    // 3 · Amsterdam — canal streets, then straight out through the tulips.
    b.setDistrict(3).setPaving(Paving.Cobbles);
    b.straight(140, { width: 10 });
    b.turn(90, 50);
    b.straight(90);
    b.turn(-90, 50);
    b.straight(260, { width: 11 });
    b.level(20);

    // 4 · Barcelona — a wide avenue sweeping round below the park.
    b.setDistrict(4).setPaving(Paving.Slabs);
    b.straight(180, { width: 13 });
    b.turn(50, 180);
    b.straight(100);
    b.level(20);

    // 5 · Istanbul — the Bosphorus shore road, curving with the water.
    b.setDistrict(5).setPaving(Paving.Stone);
    b.straight(150, { width: 11 });
    b.turn(-35, 280);
    b.straight(170);
    b.turn(25, 260);
    b.level(20);

    // 6 · Dubai — straight into the desert and a long sweep round the towers.
    b.setDistrict(6).setPaving(Paving.Asphalt);
    b.straight(300, { width: 15 });
    b.turn(-60, 320);
    b.straight(240);
    return b.build();
  },
};

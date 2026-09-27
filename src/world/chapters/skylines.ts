import * as THREE from 'three';
import { TrackBuilder } from '../../road/TrackBuilder';
import { Paving } from '../../road/RoadPath';
import type { DistrictDef } from '../Districts';
import type { ChapterDef } from '../Chapters';
import { skylinesBackground } from '../dress/cities';

const DISTRICTS: DistrictDef[] = [
  {
    id: 'newyork',
    name: 'New York',
    kicker: 'chapter seven · skylines',
    poem: 'Yellow cabs in canyons of glass; Times Square never goes dark',
    style: 'newyork',
    root: 65,
    scale: 'major',
    bpm: 126,
    walls: ['#b8674a'],
    // Swing, with the blue note.
    melody: [0, 2, 3, 4, 7, 9, 7, 4, 3, 2, 0, 2, 3, 4, 2, 0, 5, 7, 9, 10, 9, 7, 5, 4, 3, 4, 7, 4, 2, 0, -1, 0],
  },
  {
    id: 'sanfrancisco',
    name: 'San Francisco',
    kicker: 'the hills · the golden gate',
    poem: 'Painted houses on streets that tip into the sky, then red towers in the fog',
    style: 'sanfrancisco',
    root: 64,
    scale: 'major',
    bpm: 108,
    walls: ['#e8a0b4', '#9fd0c8', '#f4d98a'],
    melody: [0, 4, 7, 11, 12, 11, 7, 4, 5, 9, 12, 9, 7, 4, 2, 4, 0, 4, 7, 9, 7, 4, 2, 0, 2, 4, 5, 4, 2, 0, -1, 0],
    weather: 'fog',
  },
  {
    id: 'rio',
    name: 'Rio de Janeiro',
    kicker: 'copacabana · the redeemer',
    poem: 'Wave-patterned pavement by the beach; arms wide open on the peak above',
    style: 'rio',
    root: 67,
    scale: 'major',
    bpm: 132,
    walls: ['#f2e2c2'],
    // A samba-ish syncopation.
    melody: [0, 0, 4, 0, 7, 4, 5, 4, 2, 2, 5, 2, 9, 7, 5, 4, 0, 4, 7, 9, 12, 9, 7, 5, 4, 5, 4, 2, 0, 2, 0, 0],
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    kicker: 'shibuya · neon',
    poem: 'A thousand people cross at once under signs that hum and glow',
    style: 'tokyo',
    root: 62,
    scale: 'minor',
    bpm: 128,
    walls: ['#dcd6cc'],
    melody: [0, 3, 7, 10, 12, 10, 7, 3, 5, 7, 8, 7, 5, 3, 2, 3, 0, 3, 7, 12, 15, 12, 10, 7, 8, 7, 5, 3, 2, 3, 2, 0],
    preset: 'night',
  },
  {
    id: 'singapore',
    name: 'Singapore',
    kicker: 'marina bay · gardens',
    poem: 'A ship resting on three towers, and trees made of steel and flowers',
    style: 'singapore',
    root: 65,
    scale: 'major',
    bpm: 104,
    walls: ['#efe3cc'],
    melody: [0, 2, 4, 7, 9, 12, 9, 7, 4, 7, 9, 7, 4, 2, 0, 2, 4, 5, 7, 9, 7, 5, 4, 2, 4, 2, 0, -3, -1, 0, 2, 0],
    preset: 'dusk',
  },
  {
    id: 'sydney',
    name: 'Sydney',
    kicker: 'the harbour · the sails',
    poem: 'Under the coathanger bridge, and round to the white sails on the point',
    style: 'sydney',
    root: 64,
    scale: 'major',
    bpm: 112,
    walls: ['#efe3cc'],
    melody: [0, 4, 7, 12, 11, 7, 4, 2, 0, 2, 4, 7, 9, 7, 4, 2, 5, 9, 12, 9, 7, 4, 2, 4, 5, 4, 2, 0, -1, 0, 2, 0],
  },
];

/**
 * Chapter 7 · "Skylines" — New York, San Francisco and the Golden Gate,
 * Rio, Tokyo by night, Singapore at dusk and Sydney Harbour.
 */
export const SKYLINES: ChapterDef = {
  id: 'skylines',
  name: 'Skylines',
  kicker: 'chapter seven',
  blurb: 'New York, the Golden Gate, Rio, Tokyo’s neon, Singapore and Sydney Harbour.',
  districts: DISTRICTS,
  startPreset: 'morning',
  unlockPhrases: 0,
  background: skylinesBackground,
  buildRoute() {
    const b = new TrackBuilder(new THREE.Vector3(0, 6, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), 13);

    // 0 · New York — straight avenues and right angles on the grid.
    b.setDistrict(0).setPaving(Paving.Asphalt);
    b.straight(200, { width: 14 });
    b.turn(90, 40);
    b.straight(160);
    b.turn(-90, 40);
    b.straight(200);
    b.level(20);

    // 1 · San Francisco — two steep hills, then dead straight across the Golden Gate.
    b.setDistrict(1).setPaving(Paving.Asphalt);
    b.straight(40, { width: 11 });
    b.pitch(12, 60);
    b.straight(50);
    b.pitch(-24, 60);
    b.straight(40);
    b.pitch(12, 60);
    b.level(20);
    b.turn(-30, 150);
    b.straight(420, { width: 13 });
    b.level(20);

    // 2 · Rio — the long Copacabana curve.
    b.setDistrict(2).setPaving(Paving.Slabs);
    b.turn(-40, 400, { width: 13 });
    b.straight(200);
    b.turn(30, 300);
    b.level(20);

    // 3 · Tokyo — neon streets through the Shibuya crossing.
    b.setDistrict(3).setPaving(Paving.Asphalt);
    b.straight(260, { width: 12 });
    b.turn(90, 45);
    b.straight(160);
    b.level(20);

    // 4 · Singapore — along the bay to the gardens.
    b.setDistrict(4).setPaving(Paving.Slabs);
    b.straight(160, { width: 12 });
    b.turn(-50, 260);
    b.straight(220);
    b.level(20);

    // 5 · Sydney — under the Harbour Bridge's arch, and round to the Opera House.
    b.setDistrict(5).setPaving(Paving.Asphalt);
    b.straight(80, { width: 12 });
    b.straight(200);
    b.turn(-70, 200);
    b.straight(160);
    return b.build();
  },
};

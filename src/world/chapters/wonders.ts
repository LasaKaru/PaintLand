import * as THREE from 'three';
import { TrackBuilder } from '../../road/TrackBuilder';
import { Paving } from '../../road/RoadPath';
import type { DistrictDef } from '../Districts';
import type { ChapterDef } from '../Chapters';
import { wondersBackground } from '../dress/wonders';

const DISTRICTS: DistrictDef[] = [
  {
    id: 'great-wall',
    name: 'The Great Wall',
    kicker: 'chapter three · wonders of the sketchbook',
    poem: 'A stone ribbon over a thousand hills — ride the ridge',
    style: 'greatwall',
    root: 62,
    scale: 'minor',
    bpm: 96,
    walls: ['#bfae8e'],
    melody: [0, 2, 4, 7, 4, 2, 0, -1, 0, 2, 4, 7, 9, 7, 4, 2, 7, 9, 11, 9, 7, 4, 2, 4, 2, 0, -1, 0, 2, 0, -3, 0],
  },
  {
    id: 'colosseum',
    name: 'Colosseum Ring',
    kicker: 'rome · one lap of honour',
    poem: 'Round the arena, eighty arches cheering you on',
    style: 'colosseum',
    root: 57,
    scale: 'minor',
    bpm: 108,
    walls: ['#e2d2b2'],
    melody: [0, 4, 7, 4, 0, 4, 7, 11, 9, 7, 4, 7, 5, 4, 2, 0, 0, 4, 7, 12, 11, 9, 7, 9, 7, 5, 4, 2, 4, 2, 0, 0],
  },
  {
    id: 'taj-mahal',
    name: 'Taj Mahal Garden',
    kicker: 'agra · a circle of white marble',
    poem: 'Four minarets, one reflecting pool, and the quietest song',
    style: 'taj',
    root: 64,
    scale: 'minor',
    bpm: 84,
    walls: ['#f6f2ea'],
    melody: [0, 1, 4, 5, 7, 5, 4, 1, 0, 4, 5, 7, 8, 7, 5, 4, 7, 8, 11, 12, 11, 8, 7, 5, 4, 5, 4, 1, 0, 1, 0, 0],
  },
  {
    id: 'machu-picchu',
    name: 'Machu Picchu Switchbacks',
    kicker: 'peru · hairpins into the clouds',
    poem: 'Zig and zag past llamas to the city on the saddle',
    style: 'machupicchu',
    root: 60,
    scale: 'major',
    bpm: 100,
    walls: ['#a6a3b0'],
    melody: [0, 2, 4, 2, 4, 5, 7, 5, 4, 5, 7, 9, 7, 5, 4, 2, 4, 5, 7, 9, 11, 9, 7, 5, 7, 5, 4, 2, 1, 2, 0, 0],
  },
  {
    id: 'corcovado',
    name: 'Corcovado Climb',
    kicker: 'rio · arms wide open',
    poem: 'Spiral up the mountain and pass beneath the open arms',
    style: 'redeemer',
    root: 65,
    scale: 'major',
    bpm: 112,
    walls: ['#e8e4dc'],
    melody: [0, 0, 2, 4, 7, 7, 9, 7, 4, 4, 2, 0, 2, 4, 2, 0, 5, 5, 7, 9, 12, 9, 7, 5, 4, 5, 4, 2, 0, 2, 0, 0],
  },
  {
    id: 'chichen-itza',
    name: 'Chichen Itza Flyover',
    kicker: 'yucatán · over the feathered serpent',
    poem: 'Up the stairway of days and over the temple of the wind',
    style: 'chichen',
    root: 55,
    scale: 'minor',
    bpm: 104,
    walls: ['#cfc5a8'],
    melody: [0, 3, 5, 7, 5, 3, 0, -2, 0, 3, 5, 7, 10, 7, 5, 3, 7, 10, 12, 10, 7, 5, 3, 5, 3, 0, -2, 0, 3, 2, 0, 0],
  },
  {
    id: 'petra',
    name: 'Petra Siq',
    kicker: 'jordan · the rose-red city',
    poem: 'Through the narrow canyon to a temple carved from the rock',
    style: 'petra',
    root: 62,
    scale: 'minor',
    bpm: 92,
    walls: ['#e0987a'],
    melody: [0, 1, 3, 5, 3, 1, 0, -2, 0, 3, 5, 7, 8, 7, 5, 3, 5, 7, 8, 10, 8, 7, 5, 3, 5, 3, 1, 0, 1, 0, -2, 0],
  },
];

/**
 * Chapter 3 · "Wonders of the Sketchbook" — a single road that ties together
 * the Great Wall, the Colosseum, the Taj Mahal, Machu Picchu, Christ the
 * Redeemer, Chichen Itza and Petra, each painted into the same paper world.
 */
export const WONDERS: ChapterDef = {
  id: 'wonders',
  name: 'Wonders of the Sketchbook',
  kicker: 'chapter three',
  blurb: 'The Great Wall to Petra in one road: seven wonders, one song.',
  districts: DISTRICTS,
  startPreset: 'morning',
  unlockPhrases: 0,
  background: wondersBackground,
  buildRoute() {
    const b = new TrackBuilder(new THREE.Vector3(0, 42, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), 10);

    // 0 · Great Wall — ride the wall top over the ridges.
    b.setDistrict(0).setPaving(Paving.Stone);
    b.straight(60);
    b.pitch(10, 140);
    b.turn(25, 140);
    b.pitch(-20, 140);
    b.straight(40);
    b.turn(-35, 140);
    b.pitch(14, 140);
    b.straight(60);
    b.pitch(-4, 140);
    b.turn(20, 140);
    b.straight(40);

    // 1 · Colosseum — over the wall and one banked lap inside the ring.
    b.setDistrict(1).setPaving(Paving.Stone);
    b.straight(60, { width: 12 });
    b.level(30);
    b.roll(-18, 25);
    b.segment({ length: Math.PI * 2 * 40, yawWorld: 360, rise: -14 });
    b.roll(18, 25);
    b.straight(70);

    // 2 · Taj Mahal — glide down, then circle the Taj between the minarets.
    b.setDistrict(2).setPaving(Paving.Slabs);
    b.pitch(-8, 120);
    b.straight(60);
    b.pitch(8, 120);
    b.straight(50);
    b.level(30);
    b.roll(10, 25);
    b.segment({ length: Math.PI * 2 * 72 * 0.8, yawWorld: -288, rise: 16 });
    b.roll(-10, 25);
    b.straight(60);

    // 3 · Machu Picchu — hairpin switchbacks up the mountain.
    b.setDistrict(3).setPaving(Paving.Cobbles);
    b.straight(50, { width: 10 });
    for (let i = 0; i < 4; i++) {
      b.straight(55, { rise: 9 });
      b.turn(i % 2 ? -170 : 170, 17, { rise: 5 });
    }
    b.straight(90);

    // 4 · Corcovado — corkscrew up the mountain to the statue.
    b.setDistrict(4).setPaving(Paving.Asphalt);
    b.turn(-30, 90);
    b.level(20);
    b.roll(-10, 25);
    b.segment({ length: Math.PI * 2 * 64 * 1.2, yawWorld: 432, rise: 70 });
    b.roll(10, 25);
    b.straight(70);

    // 5 · Chichen Itza — the big drop to the jungle, then over the pyramid.
    b.setDistrict(5).setPaving(Paving.Stone);
    b.level(20);
    b.pitch(-35, 90);
    b.straight(205);
    b.pitch(35, 90);
    b.straight(70);
    b.pitch(36, 24);
    b.straight(34);
    b.pitch(-36, 24);
    b.straight(24);
    b.pitch(-36, 24);
    b.straight(34);
    b.pitch(36, 24);
    b.straight(60);

    // 6 · Petra — through the Siq, a loop before the Treasury, and out.
    b.setDistrict(6).setPaving(Paving.Stone);
    b.level(20);
    b.straight(30, { width: 9 });
    b.turn(28, 70);
    b.turn(-40, 70);
    b.turn(30, 70);
    b.turn(-22, 70);
    b.straight(80, { width: 12 });
    b.loop(26, 18);
    b.straight(40);
    b.turn(60, 60);
    b.straight(90);
    return b.build();
  },
};

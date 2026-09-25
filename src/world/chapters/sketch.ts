import * as THREE from 'three';
import { TrackBuilder } from '../../road/TrackBuilder';
import { Paving } from '../../road/RoadPath';
import type { DistrictDef } from '../Districts';
import type { ChapterDef }  from '../Chapters';
import { sketchBackground } from '../dress/sketch';

/** Height of the start street above the sea. */
export const START_HEIGHT = 12;

const DISTRICTS: DistrictDef[] = [
  {
    id: 'biscuit-row',
    name: 'Biscuit Row',
    kicker: 'chapter one · the sketch',
    poem: 'Warm bread, slow trams, a street that wants to fly',
    style: 'town',
    root: 60,
    scale: 'major',
    bpm: 90,
    walls: ['#F2C6B4', '#F4E1A6', '#BFD9E8', '#E9B8C8', '#F6EEDC', '#C9E0B8', '#EFD0A2'],
    melody: [0, 2, 4, 2, 5, 4, 2, 0, 1, 3, 5, 3, 4, 2, 1, 4, 0, 2, 4, 7, 5, 4, 2, 4, 3, 1, 4, 2, 1, 2, 0, 0],
  },
  {
    id: 'mustard-tower',
    name: 'Mustard Tower',
    kicker: 'up the yellow wall',
    poem: 'Windows for stepping stones, laundry for flags',
    style: 'tower',
    root: 55,
    scale: 'major',
    bpm: 96,
    walls: ['#EBC45A', '#E3B34A', '#F0D27A'],
    melody: [0, 4, 7, 4, 2, 4, 5, 4, 0, 4, 7, 9, 8, 7, 5, 4, 2, 4, 5, 7, 5, 4, 2, 1, 0, 2, 4, 2, 1, 2, 0, 0],
  },
  {
    id: 'topsy-terrace',
    name: 'Topsy Terrace',
    kicker: 'where the ceiling is the street',
    poem: 'Hang on to your hat — it is the sky that falls',
    style: 'ceiling',
    root: 64,
    scale: 'minor',
    bpm: 100,
    walls: ['#BFC4EA', '#C9E4E0', '#F1D3C7', '#DCD0EE', '#F6EEDC'],
    melody: [0, 2, 4, 2, 0, -1, 0, 2, 4, 5, 4, 2, 4, 7, 6, 4, 5, 4, 2, 4, 2, 0, 1, 2, 4, 2, 0, -1, -3, -1, 0, 0],
  },
  {
    id: 'petal-twist',
    name: 'Petal Twist',
    kicker: 'a corkscrew of bougainvillea',
    poem: 'Round and round beneath a pink umbrella',
    style: 'arches',
    root: 62,
    scale: 'major',
    bpm: 104,
    walls: ['#F4D6E4', '#F6EEDC'],
    melody: [0, 2, 4, 5, 4, 2, 4, 7, 5, 4, 2, 4, 5, 7, 9, 7, 5, 4, 5, 7, 4, 2, 1, 2, 4, 5, 4, 2, 1, 0, 1, 0],
  },
  {
    id: 'the-inkfall',
    name: 'The Inkfall',
    kicker: 'hold on to the melody',
    poem: 'Down the chute where the paint runs fastest',
    style: 'chute',
    root: 57,
    scale: 'minor',
    bpm: 110,
    walls: ['#BFE6E2'],
    melody: [7, 6, 4, 6, 7, 4, 2, 4, 5, 4, 2, 0, 2, 4, 2, 1, 0, 2, 4, 5, 7, 9, 7, 6, 4, 2, 4, 6, 7, 4, 0, 0],
  },
  {
    id: 'citrus-coil',
    name: 'Citrus Coil',
    kicker: 'a spiral over the painted sea',
    poem: 'Round and round the lighthouse, lemon light on the water',
    style: 'bridge',
    root: 65,
    scale: 'major',
    bpm: 92,
    walls: ['#F4E1A6', '#F2C6B4', '#F6EEDC'],
    melody: [4, 2, 0, 2, 4, 4, 4, 4, 2, 2, 2, 4, 7, 7, 4, 2, 0, 2, 4, 4, 4, 4, 2, 2, 4, 2, 0, 2, 4, 5, 4, 0],
  },
  {
    id: 'doorway-loop',
    name: 'Doorway Loop',
    kicker: 'every door opens onto the sky',
    poem: 'Knock twice, the road will turn you over',
    style: 'loop',
    root: 58,
    scale: 'major',
    bpm: 98,
    walls: ['#BFD9E8', '#F6EEDC'],
    melody: [0, 4, 2, 5, 4, 7, 5, 9, 7, 5, 4, 2, 4, 2, 1, 0, 2, 5, 4, 7, 5, 9, 7, 11, 9, 7, 5, 4, 2, 1, 0, 0],
  },
  {
    id: 'ribbon-gate',
    name: 'Ribbon Gate',
    kicker: 'the way back to the page',
    poem: 'Tie a bow in the road and follow it home',
    style: 'gate',
    root: 60,
    scale: 'major',
    bpm: 100,
    walls: ['#F2C6B4', '#F4E1A6', '#BFD9E8'],
    melody: [0, 2, 4, 5, 7, 5, 4, 2, 4, 5, 7, 9, 7, 5, 4, 7, 9, 7, 5, 4, 5, 4, 2, 1, 0, 4, 7, 4, 5, 2, 0, 0],
  },
];

/**
 * Chapter 1 · "The Sketch". The road starts on a pier street, climbs a tower,
 * runs across a ceiling, twists, drops, spirals over the sea, loops and ties a
 * bow back toward the page (docs/04 §3).
 */
export const SKETCH: ChapterDef = {
  id: 'sketch',
  name: 'The Sketch',
  kicker: 'chapter one',
  blurb: 'A paper town whose streets fold up into the sky.',
  districts: DISTRICTS,
  startPreset: 'morning',
  unlockPhrases: 0,
  background: sketchBackground,
  buildRoute() {
    const b = new TrackBuilder(new THREE.Vector3(0, START_HEIGHT, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), 12);

    // 0 · Biscuit Row — straight town street on a pier, tram rails, wide plazas.
    b.setDistrict(0).setRails(true).setPaving(Paving.Slabs);
    b.straight(40, { plaza: 16 });
    b.straight(70);
    b.turn(12, 260);
    b.straight(70);
    b.turn(-12, 260);
    b.straight(40);
    b.straight(30, { plaza: 0 });

    // 1 · Mustard Tower — quarter-pipe up the face of a yellow tower.
    b.setDistrict(1).setRails(false);
    b.straight(12);
    b.pitch(90, 40);
    b.straight(100);

    // 2 · Topsy Terrace — over the top and along the ceiling, upside down.
    b.setDistrict(2);
    b.pitch(90, 40);
    b.straight(170, { width: 14 });

    // 3 · Petal Twist — a half-roll back upright, then a full corkscrew.
    b.setDistrict(3);
    b.roll(180, 110, { width: 12 });
    b.straight(20);
    b.roll(360, 190);
    b.straight(25);

    // 4 · The Inkfall — plunge between water chutes.
    b.setDistrict(4);
    b.pitch(-60, 60);
    b.straight(110);
    b.pitch(60, 60);
    b.straight(30);

    // 5 · Citrus Coil — banked spiral over the sea, climbing gently.
    b.setDistrict(5);
    b.turn(-40, 120);
    b.roll(-16, 30);
    b.segment({ length: Math.PI * 2 * 75 * 1.5, yawWorld: 540, rise: 40 });
    b.roll(16, 30);
    b.straight(40);

    // 6 · Doorway Loop — a full vertical loop.
    b.setDistrict(6);
    b.straight(50);
    b.loop(38, 26);
    b.straight(50);

    // 7 · Ribbon Gate — a slow full twist, then a gentle glide to the finish.
    b.setDistrict(7);
    b.roll(360, 220);
    b.straight(30);
    b.pitch(-12, 120);
    b.straight(90);
    b.pitch(12, 120);
    b.straight(60);

    return b.build();
  },
};

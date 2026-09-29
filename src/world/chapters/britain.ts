import * as THREE from 'three';
import { TrackBuilder } from '../../road/TrackBuilder';
import { Paving } from '../../road/RoadPath';
import type { DistrictDef } from '../Districts';
import type { ChapterDef } from '../Chapters';
import { britainBackground } from '../dress/britain';

// Melodies are 48 steps (six phrases) of scale degrees: a longer tune for longer districts.
const DISTRICTS: DistrictDef[] = [
  {
    id: 'edinburgh',
    name: 'Edinburgh',
    kicker: 'the grand tour · great britain',
    poem: 'A piper on the Royal Mile, and the castle watching from its rock',
    style: 'edinburgh',
    root: 62,
    scale: 'mixolydian',
    bpm: 104,
    walls: ['#a39f94', '#8f8b82'],
    // A pipe march: drones on the tonic, the flattened seventh for the Scottish lilt.
    melody: [0, 0, 2, 4, 4, 2, 4, 6, 7, 6, 4, 2, 4, 2, 0, -1, 0, 0, 4, 7, 9, 7, 6, 4, 2, 4, 6, 4, 2, 0, -1, 0, 7, 9, 10, 9, 7, 6, 4, 6, 4, 2, 0, 2, 4, 2, 0, 0],
    preset: 'morning',
  },
  {
    id: 'highlands',
    name: 'The Highlands',
    kicker: 'glens and lochs',
    poem: 'Mist on the loch, heather on the hill, a red cow standing in the road',
    style: 'highlands',
    root: 60,
    scale: 'dorian',
    bpm: 84,
    walls: ['#e8e2d2'],
    melody: [0, 2, 4, 2, 0, -2, 0, 2, 4, 5, 4, 2, 4, 2, 0, 0, 4, 5, 7, 5, 4, 2, 4, 5, 7, 9, 7, 5, 4, 2, 0, 2, 0, 2, 4, 7, 5, 4, 2, 0, -2, 0, 2, 4, 2, 0, -2, 0],
    weather: 'fog',
  },
  {
    id: 'lakes',
    name: 'The Lake District',
    kicker: 'fells and water',
    poem: 'Grey stone walls climb the fells; the lake holds a second sky',
    style: 'lakes',
    root: 65,
    scale: 'major',
    bpm: 92,
    walls: ['#f6f0e4', '#e8e2d2'],
    melody: [0, 4, 2, 4, 5, 4, 2, 0, 4, 7, 5, 4, 2, 4, 2, 0, 7, 9, 7, 5, 4, 5, 4, 2, 0, 2, 4, 5, 7, 5, 4, 2, 4, 5, 7, 9, 11, 9, 7, 5, 4, 2, 0, 2, 4, 2, 0, 0],
  },
  {
    id: 'york',
    name: 'York',
    kicker: 'the shambles · the minster',
    poem: 'Crooked timber houses lean to whisper over the cobbles',
    style: 'york',
    root: 62,
    scale: 'dorian',
    bpm: 100,
    walls: ['#f2ead8', '#efe0b8'],
    // A bell-ringers' round falling from the Minster tower.
    melody: [7, 6, 5, 4, 3, 2, 1, 0, 7, 5, 6, 4, 5, 3, 4, 2, 0, 2, 4, 7, 4, 2, 0, -2, 0, 4, 2, 5, 4, 7, 5, 4, 7, 6, 5, 4, 3, 2, 1, 0, 2, 4, 3, 2, 1, 0, 0, 0],
  },
  {
    id: 'cotswolds',
    name: 'The Cotswolds',
    kicker: 'honey-stone villages',
    poem: 'Roses round every door and a cream tea waiting at the fête',
    style: 'cotswolds',
    root: 67,
    scale: 'major',
    bpm: 112,
    walls: ['#e2bf7a'],
    // A morris-dance jig.
    melody: [0, 2, 4, 0, 2, 4, 5, 4, 2, 0, 2, 4, 4, 2, 0, 0, 4, 5, 7, 4, 5, 7, 9, 7, 5, 4, 2, 4, 5, 4, 2, 0, 7, 7, 9, 7, 5, 4, 5, 4, 2, 0, 2, 4, 2, 0, -1, 0],
    preset: 'golden',
  },
  {
    id: 'bath',
    name: 'Bath',
    kicker: 'the crescent · the roman baths',
    poem: 'A Georgian curve of honey stone, and steam rising from a Roman pool',
    style: 'bath',
    root: 65,
    scale: 'major',
    bpm: 96,
    walls: ['#e6d3a4', '#eadcb4'],
    // A minuet for the Assembly Rooms.
    melody: [0, 2, 4, 7, 4, 2, 4, 5, 7, 9, 7, 5, 4, 2, 0, 0, 4, 5, 7, 5, 4, 2, 0, 2, 4, 2, 0, -1, 0, 2, 4, 4, 7, 9, 11, 12, 11, 9, 7, 5, 4, 5, 7, 5, 4, 2, 0, 0],
  },
  {
    id: 'stonehenge',
    name: 'Stonehenge',
    kicker: 'salisbury plain',
    poem: 'Old stones in a ring on the open plain, keeping time with the sun',
    style: 'stonehenge',
    root: 57,
    scale: 'phrygian',
    bpm: 72,
    walls: ['#a7a295'],
    melody: [0, 0, 1, 0, -2, 0, 3, 1, 0, 0, 4, 3, 1, 0, -2, 0, 4, 4, 5, 4, 3, 1, 0, 1, 3, 4, 7, 4, 3, 1, 0, 0, 0, 1, 3, 4, 3, 1, 0, -2, -3, -2, 0, 1, 0, -2, 0, 0],
    preset: 'dusk',
  },
  {
    id: 'cornwall',
    name: 'Cornwall',
    kicker: 'coves and harbours',
    poem: 'White cottages tumble down to boats painted every colour of the sea',
    style: 'cornwall',
    root: 64,
    scale: 'major',
    bpm: 108,
    walls: ['#f6f0e4', '#eaf2f4'],
    // A sea shanty.
    melody: [0, 0, 4, 4, 5, 4, 2, 0, 2, 2, 5, 5, 4, 2, 0, -1, 0, 0, 4, 7, 9, 7, 5, 4, 5, 4, 2, 0, 2, 4, 0, 0, 7, 7, 9, 7, 5, 5, 4, 2, 4, 4, 5, 4, 2, 0, -1, 0],
  },
  {
    id: 'wales',
    name: 'Wales',
    kicker: 'cymru · valleys and castles',
    poem: 'A choir in every valley, a dragon on every flag, a castle on every hill',
    style: 'wales',
    root: 62,
    scale: 'minor',
    bpm: 88,
    walls: ['#8e8a80'],
    // A hymn tune, sung broad.
    melody: [0, 2, 4, 4, 5, 4, 2, 2, 4, 2, 0, -1, 0, 0, -2, -3, 0, 2, 4, 7, 7, 5, 4, 4, 5, 4, 2, 2, 4, 2, 0, 0, 7, 7, 8, 7, 5, 4, 5, 4, 2, 0, 2, 4, 2, -1, 0, 0],
  },
  {
    id: 'brighton',
    name: 'Brighton',
    kicker: 'the seaside · the end of the road',
    poem: 'Beach huts, a helter-skelter, chips on the pier and the whole sea ahead',
    style: 'brighton',
    root: 67,
    scale: 'major',
    bpm: 120,
    walls: ['#f4e6c8', '#9fd0c8', '#f2c4c8', '#f6f0e4'],
    // A seaside music-hall romp.
    melody: [0, 4, 7, 9, 7, 4, 5, 4, 2, 4, 5, 7, 5, 4, 2, 0, 4, 7, 9, 12, 11, 9, 7, 4, 5, 7, 9, 7, 5, 4, 2, 0, 7, 9, 11, 12, 14, 12, 11, 9, 7, 5, 4, 2, 4, 2, 0, 0],
    preset: 'golden',
  },
];

/**
 * Grand Tour · "Great Britain" — about ten kilometres from Edinburgh to Brighton:
 * the Highlands, the Lake District, York, the Cotswolds, Bath, Stonehenge,
 * Cornwall and Wales. A lap takes eight to ten minutes.
 */
export const BRITAIN: ChapterDef = {
  id: 'britain',
  book: 2,
  flag: '🇬🇧',
  name: 'Great Britain',
  kicker: 'grand tour',
  blurb: 'Ten kilometres from the castle rock in Edinburgh to the pier at Brighton: glens, fells, cathedral towns, villages, standing stones, coves and valleys.',
  districts: DISTRICTS,
  startPreset: 'morning',
  unlockPhrases: 0,
  background: britainBackground,
  buildRoute() {
    const b = new TrackBuilder(new THREE.Vector3(0, 6, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), 12);

    // 0 · Edinburgh — down the Royal Mile and out past the castle rock.
    b.setDistrict(0).setPaving(Paving.Cobbles);
    b.straight(220, { width: 12 });
    // Up the Mound and back down: every climb here comes back to the plain.
    b.pitch(4, 100);
    b.straight(100);
    b.pitch(-8, 100);
    b.straight(100);
    b.pitch(4, 100);
    b.level(10);
    b.turn(45, 260);
    b.straight(180);
    b.turn(-45, 260);
    b.level(20);

    // 1 · The Highlands — a long glen road beside the loch.
    b.setDistrict(1).setPaving(Paving.Asphalt);
    b.straight(150, { width: 10 });
    b.turn(-60, 300);
    b.straight(200);
    b.turn(50, 280);
    b.pitch(5, 120);
    b.straight(100);
    b.pitch(-10, 120);
    b.straight(100);
    b.pitch(5, 120);
    b.level(20);

    // 2 · The Lake District — round the lake shore.
    b.setDistrict(2).setPaving(Paving.Asphalt);
    b.turn(70, 220, { width: 9 });
    b.straight(180);
    b.turn(-80, 200);
    b.straight(220);
    b.level(20);

    // 3 · York — in through the walls, a zig-zag through the Shambles, past the Minster.
    b.setDistrict(3).setPaving(Paving.Cobbles);
    b.straight(180, { width: 9 });
    b.turn(90, 60);
    b.straight(120);
    b.turn(-90, 60);
    b.straight(200);
    b.turn(35, 300);
    b.level(20);

    // 4 · The Cotswolds — lanes between the villages.
    b.setDistrict(4).setPaving(Paving.Earth);
    b.turn(-40, 350, { width: 8 });
    b.straight(180);
    b.turn(60, 260);
    b.straight(160);
    b.turn(-30, 300);
    b.level(20);

    // 5 · Bath — along the Crescent's sweep and down to the Baths.
    b.setDistrict(5).setPaving(Paving.Slabs);
    b.straight(150, { width: 12 });
    b.turn(120, 110);
    b.straight(160);
    b.turn(-90, 150);
    b.straight(120);
    b.level(20);

    // 6 · Stonehenge — straight over the open plain.
    b.setDistrict(6).setPaving(Paving.Earth);
    b.straight(300, { width: 10 });
    b.turn(-35, 400);
    b.straight(350);
    b.level(20);

    // 7 · Cornwall — the coast road, up over a headland and down to the harbour.
    b.setDistrict(7).setPaving(Paving.Asphalt);
    b.turn(50, 250, { width: 9 });
    b.straight(150);
    b.turn(-70, 200);
    b.pitch(4, 120);
    b.straight(100);
    b.pitch(-8, 120);
    b.straight(100);
    b.pitch(4, 120);
    b.level(10);
    b.turn(40, 300);
    b.level(20);

    // 8 · Wales — up the valley under the castle.
    b.setDistrict(8).setPaving(Paving.Stone);
    b.straight(200, { width: 10 });
    b.turn(-50, 300);
    b.straight(150);
    b.turn(70, 220);
    b.straight(150);
    b.level(20);

    // 9 · Brighton — the long seafront to the pier.
    b.setDistrict(9).setPaving(Paving.Slabs);
    b.straight(250, { width: 13 });
    b.turn(-40, 400);
    b.straight(350);
    return b.build();
  },
};

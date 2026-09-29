import * as THREE from 'three';
import { TrackBuilder } from '../../road/TrackBuilder';
import { Paving } from '../../road/RoadPath';
import type { DistrictDef } from '../Districts';
import type { ChapterDef } from '../Chapters';
import { canadaBackground } from '../dress/canada';

// 48-step tunes: a Québécois reel, a ceremonial fanfare, city pop, a fiddle
// breakdown for the prairies, and a gentle west-coast ending.
const DISTRICTS: DistrictDef[] = [
  {
    id: 'quebec',
    name: 'Québec City',
    kicker: 'the grand tour · canada',
    poem: 'Stone houses with bright doors, and a castle-hotel standing guard over the river',
    style: 'quebec',
    root: 62,
    scale: 'major',
    bpm: 120,
    walls: ['#d8cfb8'],
    // A Québécois fiddle reel.
    melody: [0, 2, 4, 2, 0, 4, 7, 4, 5, 4, 2, 4, 2, 0, -1, 0, 0, 2, 4, 5, 7, 9, 7, 5, 4, 2, 4, 5, 4, 2, 0, 0, 7, 9, 11, 12, 11, 9, 7, 5, 4, 2, 4, 2, 0, -1, 0, 0],
    preset: 'morning',
  },
  {
    id: 'ottawa',
    name: 'Ottawa',
    kicker: 'parliament hill',
    poem: 'The Peace Tower rings its bells over the lawn and the red maple flag flies on top',
    style: 'ottawa',
    root: 60,
    scale: 'major',
    bpm: 96,
    walls: ['#c8b890'],
    // A ceremonial fanfare.
    melody: [0, 0, 4, 7, 7, 4, 7, 12, 11, 9, 7, 5, 4, 2, 0, 0, 4, 4, 5, 7, 9, 7, 5, 4, 2, 4, 5, 4, 2, 0, -1, 0, 7, 7, 9, 11, 12, 11, 9, 7, 5, 4, 5, 7, 4, 2, 0, 0],
  },
  {
    id: 'toronto',
    name: 'Toronto',
    kicker: 'the tower by the lake',
    poem: 'Glass towers along Lake Ontario, and the tallest needle in the land above them all',
    style: 'toronto',
    root: 65,
    scale: 'minor',
    bpm: 118,
    walls: ['#8ab0c8'],
    // Moody city pop.
    melody: [0, 3, 7, 3, 5, 3, 2, 0, 3, 5, 7, 10, 7, 5, 3, 2, 3, 5, 7, 8, 7, 5, 3, 5, 7, 10, 12, 10, 7, 5, 3, 2, 0, 3, 5, 7, 10, 7, 5, 3, 2, 3, 2, 0, -2, 0, 0, 0],
    preset: 'dusk',
  },
  {
    id: 'niagara',
    name: 'Niagara Falls',
    kicker: 'the horseshoe falls',
    poem: 'The whole river falls off the edge in a curve of white thunder, and the boat goes right into the mist',
    style: 'niagara',
    root: 62,
    scale: 'major',
    bpm: 104,
    walls: ['#e8e4dc'],
    melody: [7, 5, 4, 2, 0, 2, 4, 5, 7, 9, 7, 5, 4, 2, 0, 0, 12, 11, 9, 7, 5, 4, 2, 4, 5, 7, 9, 11, 12, 9, 7, 5, 4, 5, 7, 9, 7, 5, 4, 2, 0, 2, 4, 2, 0, -1, 0, 0],
  },
  {
    id: 'algonquin',
    name: 'Algonquin',
    kicker: 'lakes and maples',
    poem: 'A red canoe on a still lake, maples burning gold, and a moose that will not move for anyone',
    style: 'algonquin',
    root: 60,
    scale: 'dorian',
    bpm: 84,
    walls: ['#8a6a4a'],
    // A loon's call opens a campfire song.
    melody: [0, 7, 5, 7, 0, 2, 3, 5, 3, 2, 0, -2, 0, 2, 3, 2, 5, 7, 9, 7, 5, 3, 2, 3, 5, 3, 2, 0, -2, -3, -2, 0, 7, 9, 10, 9, 7, 5, 3, 5, 3, 2, 0, 2, 0, -2, 0, 0],
    preset: 'golden',
  },
  {
    id: 'prairies',
    name: 'The Prairies',
    kicker: 'wheat to the horizon',
    poem: 'Gold to the edge of the world, a red elevator standing up like an exclamation mark',
    style: 'prairies',
    root: 67,
    scale: 'mixolydian',
    bpm: 128,
    walls: ['#b8322a'],
    // A fiddle breakdown.
    melody: [0, 0, 2, 4, 6, 4, 2, 0, 4, 4, 6, 7, 9, 7, 6, 4, 2, 4, 6, 4, 2, 0, -1, 0, 0, 2, 4, 6, 7, 6, 4, 2, 7, 9, 10, 9, 7, 6, 4, 2, 4, 6, 4, 2, 0, -1, 0, 0],
    preset: 'noon',
  },
  {
    id: 'banff',
    name: 'Banff',
    kicker: 'the rockies',
    poem: 'A lake so blue it looks painted, under peaks with snow on their shoulders',
    style: 'banff',
    root: 64,
    scale: 'lydian',
    bpm: 80,
    walls: ['#a8a090'],
    melody: [0, 4, 6, 7, 11, 9, 7, 6, 4, 6, 7, 9, 11, 12, 11, 9, 7, 9, 11, 12, 14, 12, 11, 9, 7, 6, 4, 2, 4, 6, 4, 0, 0, 4, 7, 11, 12, 14, 12, 11, 9, 7, 6, 4, 2, 0, 0, 0],
    preset: 'morning',
  },
  {
    id: 'icefields',
    name: 'The Icefields',
    kicker: 'the icefields parkway',
    poem: 'Rivers of ice pour down between the mountains, blue in the cracks',
    style: 'icefields',
    root: 57,
    scale: 'minor',
    bpm: 72,
    walls: ['#d0e8f0'],
    melody: [0, 2, 3, 5, 7, 5, 3, 2, 0, 3, 7, 10, 12, 10, 7, 5, 3, 5, 7, 8, 7, 5, 3, 2, 0, 2, 3, 2, 0, -2, -4, -2, 0, 3, 5, 7, 10, 12, 10, 7, 5, 3, 2, 3, 2, 0, 0, 0],
    weather: 'cloudy',
  },
  {
    id: 'vancouver',
    name: 'Vancouver',
    kicker: 'mountains meet the sea',
    poem: 'Glass towers, cedar totems in the park, and a green bridge leaping the harbour',
    style: 'vancouver',
    root: 62,
    scale: 'major',
    bpm: 108,
    walls: ['#8ab0c8'],
    melody: [0, 2, 4, 7, 9, 7, 4, 2, 4, 7, 9, 11, 12, 11, 9, 7, 5, 7, 9, 7, 5, 4, 2, 4, 5, 4, 2, 0, -1, 0, 2, 0, 4, 7, 9, 12, 14, 12, 9, 7, 5, 4, 2, 4, 2, 0, 0, 0],
    weather: 'rain',
  },
  {
    id: 'tofino',
    name: 'The Pacific Coast',
    kicker: 'tofino · the end of the road',
    poem: 'Surf shacks under the cedars, orcas in the waves, and nothing but ocean to Japan',
    style: 'tofino',
    root: 65,
    scale: 'major',
    bpm: 92,
    walls: ['#8a6a4a'],
    melody: [0, 4, 7, 9, 7, 4, 2, 4, 5, 4, 2, 0, 2, 4, 2, 0, 4, 7, 9, 12, 11, 9, 7, 5, 4, 5, 7, 5, 4, 2, 0, -1, 0, 4, 7, 11, 12, 11, 9, 7, 5, 4, 2, 4, 2, 0, 0, 0],
    preset: 'dusk',
  },
];

/**
 * Grand Tour · "Canada" — about ten kilometres from Québec City to the
 * Pacific: Ottawa, Toronto, Niagara, Algonquin, the Prairies, Banff, the
 * Icefields and Vancouver.
 */
export const CANADA: ChapterDef = {
  id: 'canada',
  book: 2,
  flag: '🇨🇦',
  name: 'Canada',
  kicker: 'grand tour',
  blurb: 'Ten kilometres coast to coast: Québec’s old town, Parliament Hill, the CN Tower, Niagara Falls, a moose among the maples, wheat to the horizon, the Rockies and glaciers, Vancouver and the Pacific.',
  districts: DISTRICTS,
  startPreset: 'morning',
  unlockPhrases: 0,
  background: canadaBackground,
  buildRoute() {
    const b = new TrackBuilder(new THREE.Vector3(0, 6, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), 11);

    // 0 · Québec City — winding up through the old town to the Château.
    b.setDistrict(0).setPaving(Paving.Cobbles);
    b.straight(160, { width: 10 });
    b.turn(80, 70);
    b.straight(140);
    b.turn(-80, 70);
    b.straight(200);
    b.turn(20, 300);
    b.straight(160);
    b.level(20);

    // 1 · Ottawa — Wellington Street under Parliament Hill.
    b.setDistrict(1).setPaving(Paving.Slabs);
    b.turn(-20, 300, { width: 12 });
    b.straight(400);
    b.turn(20, 300);
    b.straight(200);
    b.level(20);

    // 2 · Toronto — the lakeshore.
    b.setDistrict(2).setPaving(Paving.Asphalt);
    b.turn(-30, 300, { width: 14 });
    b.straight(360);
    b.turn(30, 300);
    b.straight(200);
    b.level(20);

    // 3 · Niagara — the Parkway beside the gorge.
    b.setDistrict(3).setPaving(Paving.Asphalt);
    b.turn(40, 250, { width: 11 });
    b.straight(260);
    b.turn(-40, 250);
    b.straight(260);
    b.level(20);

    // 4 · Algonquin — a winding forest road past the lakes.
    b.setDistrict(4).setPaving(Paving.Earth);
    b.turn(-50, 180, { width: 9 });
    b.straight(140);
    b.turn(70, 180);
    b.straight(140);
    b.turn(-30, 220);
    b.straight(200);
    b.level(20);

    // 5 · The Prairies — dead straight to the horizon.
    b.setDistrict(5).setPaving(Paving.Asphalt);
    b.straight(700, { width: 12 });
    b.turn(-10, 800);
    b.straight(160);
    b.level(20);

    // 6 · Banff — into the Rockies, over a rise by the lake.
    b.setDistrict(6).setPaving(Paving.Asphalt);
    b.turn(40, 250, { width: 10 });
    b.pitch(5, 120);
    b.straight(100);
    b.pitch(-10, 120);
    b.straight(100);
    b.pitch(5, 120);
    b.turn(-40, 250);
    b.straight(200);
    b.level(20);

    // 7 · The Icefields — a long valley under the glaciers.
    b.setDistrict(7).setPaving(Paving.Asphalt);
    b.turn(-25, 400, { width: 10 });
    b.straight(360);
    b.turn(35, 350);
    b.straight(240);
    b.level(20);

    // 8 · Vancouver — downtown, Stanley Park and the harbour.
    b.setDistrict(8).setPaving(Paving.Asphalt);
    b.turn(-20, 300, { width: 13 });
    b.straight(300);
    b.turn(40, 250);
    b.straight(260);
    b.level(20);

    // 9 · The Pacific coast — the road ends at the ocean.
    b.setDistrict(9).setPaving(Paving.Earth);
    b.turn(-40, 300, { width: 10 });
    b.straight(250);
    b.turn(30, 300);
    b.straight(300);
    return b.build();
  },
};

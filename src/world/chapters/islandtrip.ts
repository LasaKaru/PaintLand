import * as THREE from 'three';
import { TrackBuilder } from '../../road/TrackBuilder';
import { Paving } from '../../road/RoadPath';
import type { DistrictDef } from '../Districts';
import type { ChapterDef } from '../Chapters';
import { islandBackground } from '../dress/cities';

const DISTRICTS: DistrictDef[] = [
  {
    id: 'colombo',
    name: 'Colombo',
    kicker: 'chapter eight · island road trip',
    poem: 'Tuk-tuks weave through Pettah under a mosque striped like candy',
    style: 'colombo',
    root: 64,
    scale: 'major',
    bpm: 118,
    walls: ['#f2e2c2', '#9fd0c8', '#e8a07a', '#f4d98a'],
    // A baila lilt.
    melody: [0, 4, 7, 4, 5, 4, 2, 0, 2, 5, 9, 5, 7, 5, 4, 2, 0, 4, 7, 9, 12, 9, 7, 4, 5, 7, 5, 4, 2, 4, 2, 0],
  },
  {
    id: 'kandyday',
    name: 'Kandy Perahera',
    kicker: 'the hill capital · festival day',
    poem: 'Elephants in shining cloth walk beside the lake to the drums',
    style: 'kandyday',
    root: 65,
    scale: 'major',
    bpm: 104,
    walls: ['#f7f3ea'],
    // Kandyan drum pattern leading the tune.
    melody: [0, 0, 7, 0, 5, 0, 4, 2, 0, 0, 7, 9, 7, 5, 4, 2, 4, 5, 7, 9, 11, 12, 11, 9, 7, 5, 4, 2, 0, 2, 0, 0],
  },
  {
    id: 'nuwaraeliya',
    name: 'Nuwara Eliya',
    kicker: 'little england · the tea country',
    poem: 'A Tudor post office in the clouds, swan boats on the lake, tea to the sky',
    style: 'nuwaraeliya',
    root: 62,
    scale: 'major',
    bpm: 92,
    walls: ['#d98a5f'],
    melody: [0, 2, 4, 5, 7, 5, 4, 2, 4, 7, 9, 7, 5, 4, 2, 0, -1, 0, 2, 4, 5, 7, 9, 11, 12, 11, 9, 7, 5, 4, 2, 0],
    weather: 'fog',
  },
  {
    id: 'ellaroad',
    name: 'Ella',
    kicker: 'the nine arches · little adam’s peak',
    poem: 'The blue train crosses the nine arches while we wind down the gap',
    style: 'ellaroad',
    root: 64,
    scale: 'major',
    bpm: 108,
    walls: ['#f0e2c4'],
    melody: [0, 4, 7, 9, 7, 4, 2, 4, 0, 2, 4, 7, 12, 11, 9, 7, 4, 7, 9, 12, 14, 12, 9, 7, 5, 4, 2, 4, 2, 0, -1, 0],
  },
  {
    id: 'yala',
    name: 'Yala',
    kicker: 'the wild south · leopards',
    poem: 'Red dust, thorn scrub and a leopard asleep on the warm rock',
    style: 'yala',
    root: 60,
    scale: 'minor',
    bpm: 96,
    walls: ['#c9a07a'],
    melody: [0, 3, 5, 7, 5, 3, 0, -2, 0, 3, 7, 10, 7, 5, 3, 2, 0, 5, 7, 10, 12, 10, 7, 5, 3, 5, 3, 2, 0, -2, 0, 0],
    preset: 'golden',
  },
  {
    id: 'galle',
    name: 'Galle',
    kicker: 'the old fort · the south coast',
    poem: 'Round the ramparts to the lighthouse; fishermen perch on stilts in the surf',
    style: 'galle',
    root: 67,
    scale: 'major',
    bpm: 100,
    walls: ['#f2e2c2', '#e8c07a', '#9fd0c8'],
    melody: [0, 2, 4, 7, 4, 2, 0, -3, 0, 4, 7, 9, 12, 9, 7, 4, 5, 7, 9, 7, 5, 4, 2, 0, 2, 4, 2, 0, -1, 0, 2, 0],
    preset: 'dusk',
  },
];

/**
 * Chapter 8 · "Island Road Trip" — across Sri Lanka in a day: Colombo,
 * Kandy's perahera, Nuwara Eliya, Ella, the leopards of Yala and Galle Fort.
 */
export const ISLAND_TRIP: ChapterDef = {
  id: 'islandtrip',
  name: 'Island Road Trip',
  kicker: 'chapter eight',
  blurb: 'Sri Lanka from coast to hills to coast: Colombo, Kandy, Nuwara Eliya, Ella, Yala and Galle.',
  districts: DISTRICTS,
  startPreset: 'morning',
  unlockPhrases: 0,
  background: islandBackground,
  buildRoute() {
    const b = new TrackBuilder(new THREE.Vector3(0, 6, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), 11);

    // 0 · Colombo — busy Pettah streets, then out along Independence Avenue.
    b.setDistrict(0).setPaving(Paving.Asphalt);
    b.straight(160, { width: 12 });
    b.turn(60, 80);
    b.straight(120);
    b.turn(-60, 120);
    b.straight(140);
    b.level(20);

    // 1 · Kandy — climb to the hills, then round the lake with the parade.
    b.setDistrict(1).setPaving(Paving.Asphalt);
    b.pitch(6, 160);
    b.straight(80);
    b.pitch(-6, 160);
    b.level(10);
    b.turn(120, 180);
    b.straight(100);
    b.level(20);

    // 2 · Nuwara Eliya — hairpins up into the tea and the clouds.
    b.setDistrict(2).setPaving(Paving.Asphalt);
    b.pitch(8, 120);
    b.straight(60, { width: 10 });
    b.pitch(-8, 120);
    b.level(20);
    b.turn(-160, 45);
    b.straight(90);
    b.turn(160, 45);
    b.straight(200);
    b.level(20);

    // 3 · Ella — down through the gap past the bridge.
    b.setDistrict(3).setPaving(Paving.Earth);
    b.straight(80, { width: 10 });
    b.pitch(-6, 140);
    b.straight(40);
    b.pitch(6, 140);
    b.level(20);
    b.turn(-50, 160);
    // …and the long descent from the hills to the dry south.
    b.pitch(-8, 150);
    b.straight(80);
    b.pitch(8, 150);
    b.level(20);

    // 4 · Yala — a long, straight dirt track through the park.
    b.setDistrict(4).setPaving(Paving.Earth);
    b.straight(260, { width: 10 });
    b.turn(40, 260);
    b.straight(200);
    b.level(20);

    // 5 · Galle — along the coast and round the fort ramparts.
    b.setDistrict(5).setPaving(Paving.Cobbles);
    b.turn(-60, 260, { width: 11 });
    b.straight(160);
    b.turn(-40, 200);
    b.straight(160);
    return b.build();
  },
};

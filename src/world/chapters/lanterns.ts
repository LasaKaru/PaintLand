import * as THREE from 'three';
import { TrackBuilder } from '../../road/TrackBuilder';
import { Paving } from '../../road/RoadPath';
import type { DistrictDef } from '../Districts';
import type { ChapterDef } from '../Chapters';
import { lanternsBackground } from '../dress/lanterns';

/** Lengths of the two dives, tuned so the road ends up just above the water. */
const DIVE = 200;
const WAVE_DIVE = 236;

const DISTRICTS: DistrictDef[] = [
  {
    id: 'fushimi-inari',
    name: 'Fushimi Inari',
    kicker: 'chapter four · lantern roads',
    poem: 'A thousand vermilion gates, and a fox at every turn',
    style: 'torii',
    root: 62,
    scale: 'minor',
    bpm: 88,
    walls: ['#f6f0e4'],
    // In (Japanese pentatonic) flavour within the minor scale.
    melody: [0, 1, 4, 5, 4, 1, 0, -2, 0, 1, 4, 7, 5, 4, 1, 0, 4, 5, 7, 8, 7, 5, 4, 1, 0, 1, 4, 1, 0, -2, 0, 0],
  },
  {
    id: 'arashiyama',
    name: 'Arashiyama Bamboo',
    kicker: 'kyoto · green light',
    poem: 'Tall canes whisper overhead; the road goes quiet and green',
    style: 'bamboo',
    root: 64,
    scale: 'major',
    bpm: 80,
    walls: ['#f6f0e4'],
    melody: [0, 2, 4, 7, 9, 7, 4, 2, 4, 7, 9, 11, 9, 7, 4, 2, 0, 4, 7, 9, 7, 4, 2, 0, 2, 4, 2, 0, -1, 0, 2, 0],
  },
  {
    id: 'ha-long',
    name: 'Hạ Long Bay',
    kicker: 'việt nam · dragon descending',
    poem: 'Down to the emerald water between the stone dragons',
    style: 'halong',
    root: 60,
    scale: 'major',
    bpm: 96,
    walls: ['#c8955a'],
    melody: [0, 2, 4, 7, 4, 2, 0, 2, 4, 7, 9, 7, 4, 2, 4, 7, 9, 12, 9, 7, 4, 7, 4, 2, 0, 2, 4, 2, 0, -3, 0, 0],
  },
  {
    id: 'hoi-an',
    name: 'Hội An Lantern Street',
    kicker: 'the old town · every colour at once',
    poem: 'Silk lanterns overhead, paper boats of light on the river',
    style: 'lanterntown',
    root: 67,
    scale: 'major',
    bpm: 104,
    walls: ['#f2c14e', '#f4d23b', '#eab64a'],
    melody: [0, 4, 7, 4, 2, 4, 0, 2, 4, 7, 9, 7, 4, 2, 0, 2, 7, 9, 11, 9, 7, 4, 2, 4, 7, 4, 2, 0, 2, 0, -1, 0],
  },
  {
    id: 'himalaya',
    name: 'Himalayan Pass',
    kicker: 'the roof of the world',
    poem: 'Prayer flags carry the song up the switchbacks to the snow',
    style: 'himalaya',
    root: 57,
    scale: 'minor',
    bpm: 84,
    walls: ['#f6f0e4'],
    melody: [0, 3, 5, 7, 5, 3, 0, -2, 0, 3, 7, 10, 7, 5, 3, 0, 5, 7, 10, 12, 10, 7, 5, 3, 5, 3, 0, -2, 0, 3, 0, 0],
  },
  {
    id: 'great-wave',
    name: 'The Great Wave',
    kicker: 'off kanagawa · after hokusai',
    poem: 'Dive to the sea and roll right through the curl',
    style: 'greatwave',
    root: 62,
    scale: 'minor',
    bpm: 120,
    walls: ['#f6f0e4'],
    melody: [0, 3, 7, 10, 7, 3, 0, 3, 5, 8, 12, 8, 5, 3, 0, -2, 0, 3, 7, 12, 15, 12, 10, 7, 5, 3, 7, 5, 3, 2, 0, 0],
  },
  {
    id: 'fuji',
    name: 'Fuji and the Pagoda',
    kicker: 'the last page · spring',
    poem: 'Under falling blossom to the red pagoda and the white mountain',
    style: 'fuji',
    root: 65,
    scale: 'major',
    bpm: 92,
    walls: ['#f6f0e4'],
    melody: [0, 2, 4, 7, 9, 7, 4, 2, 0, 4, 7, 12, 11, 9, 7, 4, 2, 4, 7, 9, 12, 9, 7, 4, 2, 4, 2, 0, -1, 0, 2, 0],
  },
];

/**
 * Chapter 4 · "Lantern Roads" — through a torii tunnel, a bamboo grove, the
 * karsts of Hạ Long Bay and Hội An's lantern street, over a Himalayan pass,
 * through Hokusai's great wave, and home under Mount Fuji.
 */
export const LANTERNS: ChapterDef = {
  id: 'lanterns',
  name: 'Lantern Roads',
  kicker: 'chapter four',
  blurb: 'Torii gates, bamboo, Hạ Long Bay, lantern streets, the Himalaya, the Great Wave and Fuji.',
  districts: DISTRICTS,
  startPreset: 'golden',
  unlockPhrases: 0,
  background: lanternsBackground,
  buildRoute() {
    const b = new TrackBuilder(new THREE.Vector3(0, 30, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), 10);

    // 0 · Fushimi Inari — up the mountain through the gate tunnel.
    b.setDistrict(0).setPaving(Paving.Stone);
    b.straight(40, { width: 8 });
    b.pitch(6, 120);
    b.straight(150);
    b.pitch(-6, 120);
    b.level(20);

    // 1 · Arashiyama — a winding, narrow path through the grove.
    b.setDistrict(1).setPaving(Paving.Earth);
    b.straight(40, { width: 8 });
    b.turn(-40, 120);
    b.straight(90);
    b.turn(50, 120);
    b.straight(70);
    b.level(20);

    // 2 · Hạ Long Bay — dive to the water and weave between the karsts.
    b.setDistrict(2).setPaving(Paving.Planks);
    b.pitch(-10, 150);
    b.straight(DIVE, { width: 12 });
    b.pitch(10, 150);
    b.level(30);
    b.turn(60, 160);
    b.straight(80);
    b.turn(-70, 160);
    b.straight(60);
    b.level(20);

    // 3 · Hội An — the lantern street, two corners in the old town.
    b.setDistrict(3).setPaving(Paving.Cobbles);
    b.straight(60, { width: 10, plaza: 3 });
    b.turn(90, 40);
    b.straight(120);
    b.turn(-90, 40);
    b.straight(90, { plaza: 0 });
    b.level(20);

    // 4 · Himalayan pass — a long climb, then switchbacks to the top.
    b.setDistrict(4).setPaving(Paving.Earth);
    b.pitch(16, 100);
    b.straight(250, { width: 10 });
    b.pitch(-16, 100);
    b.level(30);
    for (let i = 0; i < 2; i++) {
      b.straight(50, { rise: 8 });
      b.turn(i ? -170 : 170, 18, { rise: 6 });
    }
    b.straight(80);
    b.level(30);

    // 5 · The Great Wave — down to the sea, a barrel roll through the curl.
    b.setDistrict(5).setPaving(Paving.Asphalt);
    b.pitch(-22, 100);
    b.straight(WAVE_DIVE, { width: 12 });
    b.pitch(22, 100);
    b.level(40);
    b.roll(360, 160);
    b.level(20);
    b.straight(80);

    // 6 · Fuji — the cherry avenue to the pagoda.
    b.setDistrict(6).setPaving(Paving.Slabs);
    b.turn(40, 150);
    b.pitch(8, 100);
    b.straight(100);
    b.pitch(-8, 100);
    b.level(20);
    b.turn(-60, 120);
    b.straight(140);
    return b.build();
  },
};

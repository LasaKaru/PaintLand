import * as THREE from 'three';
import { TrackBuilder } from '../../road/TrackBuilder';
import { Paving } from '../../road/RoadPath';
import type { DistrictDef } from '../Districts';
import type { ChapterDef } from '../Chapters';
import { australiaBackground } from '../dress/australia';

// 48-step tunes: harbour pop, bush ballads, a didgeridoo drone for the red
// centre (a low tonic with a harmonic minor lift), and surf rock for the coast.
const DISTRICTS: DistrictDef[] = [
  {
    id: 'harbourcity',
    name: 'Sydney',
    kicker: 'the grand tour · australia',
    poem: 'Ferries cross under the coat-hanger bridge, and the white sails of the Opera House catch the sun',
    style: 'harbourcity',
    root: 64,
    scale: 'major',
    bpm: 116,
    walls: ['#8ab0c8'],
    melody: [0, 2, 4, 7, 9, 7, 4, 2, 4, 5, 7, 9, 11, 9, 7, 5, 4, 7, 9, 12, 11, 9, 7, 4, 5, 4, 2, 0, 2, 4, 2, 0, 7, 9, 11, 12, 14, 12, 9, 7, 5, 7, 5, 4, 2, 1, 0, 0],
    preset: 'morning',
  },
  {
    id: 'bluemountains',
    name: 'The Blue Mountains',
    kicker: 'the three sisters',
    poem: 'The gum trees breathe a blue haze over the valley, and three stone sisters stand at the edge',
    style: 'bluemountains',
    root: 62,
    scale: 'dorian',
    bpm: 84,
    walls: ['#c8a070'],
    melody: [0, 2, 3, 5, 7, 5, 3, 2, 3, 5, 7, 9, 7, 5, 3, 0, 5, 7, 9, 10, 9, 7, 5, 3, 2, 3, 5, 3, 2, 0, -2, 0, 7, 9, 10, 12, 10, 9, 7, 5, 3, 2, 0, 2, 3, 2, 0, 0],
    weather: 'fog',
  },
  {
    id: 'melbourne',
    name: 'Melbourne',
    kicker: 'trams and laneways',
    poem: 'Green-and-gold trams rattle past the station with its row of clocks',
    style: 'melbourne',
    root: 65,
    scale: 'minor',
    bpm: 104,
    walls: ['#e8c060'],
    // Laneway indie rock.
    melody: [0, 3, 5, 7, 5, 3, 0, -2, 0, 3, 5, 3, 7, 5, 3, 2, 3, 5, 7, 10, 7, 5, 3, 5, 7, 8, 7, 5, 3, 2, 0, 0, 7, 10, 12, 10, 7, 5, 3, 5, 3, 2, 0, 2, 3, 2, 0, 0],
    weather: 'cloudy',
  },
  {
    id: 'oceanroad',
    name: 'The Great Ocean Road',
    kicker: 'the twelve apostles',
    poem: 'Golden cliffs fall into the Southern Ocean, and stone giants stand knee-deep in the surf',
    style: 'oceanroad',
    root: 67,
    scale: 'major',
    bpm: 96,
    walls: ['#d8a878'],
    melody: [0, 4, 7, 9, 7, 4, 5, 7, 9, 11, 12, 11, 9, 7, 5, 4, 2, 4, 5, 7, 9, 7, 5, 4, 2, 0, 2, 4, 2, 0, -1, 0, 4, 7, 9, 12, 14, 12, 11, 9, 7, 5, 4, 2, 4, 2, 0, 0],
    preset: 'golden',
  },
  {
    id: 'outback',
    name: 'The Outback',
    kicker: 'red earth and road trains',
    poem: 'Red dirt to the horizon, a wind pump creaking, and kangaroos watching the road train roar past',
    style: 'outback',
    root: 55,
    scale: 'mixolydian',
    bpm: 108,
    walls: ['#c8603a'],
    // A bush ballad with a twang.
    melody: [0, 0, 4, 4, 5, 4, 2, 0, 6, 6, 5, 4, 2, 4, 2, 0, 0, 4, 7, 9, 10, 9, 7, 5, 4, 5, 4, 2, 0, -1, 0, 0, 7, 7, 9, 10, 9, 7, 6, 4, 2, 4, 5, 4, 2, 0, 0, 0],
    preset: 'noon',
  },
  {
    id: 'uluru',
    name: 'Uluru',
    kicker: 'the red centre',
    poem: 'The great rock glows like a coal at sunset, older than any story, and the desert goes quiet',
    style: 'uluru',
    root: 50,
    scale: 'harmonicMinor',
    bpm: 72,
    walls: ['#c8582a'],
    // A didgeridoo drone under a slow rising line.
    melody: [0, 0, 0, 0, 2, 0, 0, 0, 3, 2, 0, 0, 4, 3, 2, 0, 0, 0, 4, 5, 6, 5, 4, 3, 4, 3, 2, 0, -1, 0, 0, 0, 4, 6, 7, 6, 4, 3, 2, 0, -1, 0, 2, 0, -1, 0, 0, 0],
    preset: 'dusk',
  },
  {
    id: 'daintree',
    name: 'The Daintree',
    kicker: 'the oldest rainforest',
    poem: 'Buttress roots, tree ferns, birdsong everywhere, and a croc pretending to be a log',
    style: 'daintree',
    root: 60,
    scale: 'lydian',
    bpm: 88,
    walls: ['#4a6a3a'],
    melody: [0, 2, 4, 6, 4, 2, 0, 2, 4, 6, 7, 9, 7, 6, 4, 2, 6, 7, 9, 11, 9, 7, 6, 4, 2, 4, 6, 4, 2, 0, -1, 0, 4, 6, 7, 9, 11, 12, 11, 9, 7, 6, 4, 2, 0, 2, 0, 0],
    weather: 'rain',
  },
  {
    id: 'reef',
    name: 'The Great Barrier Reef',
    kicker: 'coral and turquoise',
    poem: 'Water so clear you can see the coral from the road, pink and gold and purple under the waves',
    style: 'reef',
    root: 64,
    scale: 'major',
    bpm: 100,
    walls: ['#f4ead0'],
    melody: [0, 4, 7, 11, 9, 7, 4, 2, 4, 7, 9, 12, 11, 9, 7, 4, 5, 9, 12, 14, 12, 9, 7, 5, 4, 5, 7, 5, 4, 2, 0, 0, 4, 7, 11, 12, 14, 16, 14, 12, 11, 9, 7, 4, 2, 4, 0, 0],
    preset: 'noon',
  },
  {
    id: 'byron',
    name: 'Byron Bay',
    kicker: 'the easternmost point',
    poem: 'Surfboards stuck in the sand, a white lighthouse on the cape, dolphins in the waves',
    style: 'byron',
    root: 62,
    scale: 'mixolydian',
    bpm: 92,
    walls: ['#f0e8d4'],
    // Laid-back acoustic surf.
    melody: [0, 2, 4, 7, 6, 4, 2, 0, 2, 4, 6, 7, 9, 7, 6, 4, 2, 4, 7, 9, 10, 9, 7, 6, 4, 6, 4, 2, 0, -1, 0, 0, 7, 9, 10, 12, 10, 9, 7, 6, 4, 2, 4, 2, 0, -1, 0, 0],
    preset: 'golden',
  },
  {
    id: 'goldcoast',
    name: 'The Gold Coast',
    kicker: 'surfers paradise · the end of the road',
    poem: 'Towers on the beach, lifesavers in red and yellow, and the whole Pacific to cool your tyres',
    style: 'goldcoast',
    root: 67,
    scale: 'major',
    bpm: 132,
    walls: ['#8ab0c8'],
    // Surf rock finale.
    melody: [0, 0, 4, 7, 7, 4, 9, 7, 5, 5, 9, 12, 12, 9, 7, 5, 4, 4, 7, 11, 12, 11, 9, 7, 5, 7, 9, 7, 5, 4, 2, 0, 7, 9, 12, 14, 12, 11, 9, 7, 5, 4, 2, 4, 2, 0, 0, 0],
    preset: 'dusk',
  },
];

/**
 * Grand Tour · "Australia" — about ten kilometres from Sydney to the Gold
 * Coast by way of the Blue Mountains, Melbourne, the Great Ocean Road, the
 * Outback, Uluru, the Daintree, the Reef and Byron Bay.
 */
export const AUSTRALIA: ChapterDef = {
  id: 'australia',
  book: 2,
  flag: '🇦🇺',
  name: 'Australia',
  kicker: 'grand tour',
  blurb: 'Ten kilometres round the continent: Sydney Harbour, the Three Sisters, Melbourne’s trams, the Twelve Apostles, red earth and road trains, Uluru at sunset, the Daintree, the Reef, Byron Bay and the Gold Coast.',
  districts: DISTRICTS,
  startPreset: 'morning',
  unlockPhrases: 0,
  background: australiaBackground,
  buildRoute() {
    const b = new TrackBuilder(new THREE.Vector3(0, 6, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), 13);

    // 0 · Sydney — along the harbour between the bridge and the Opera House.
    b.setDistrict(0).setPaving(Paving.Slabs);
    b.straight(300, { width: 13 });
    b.turn(-40, 200);
    b.straight(200);
    b.turn(40, 200);
    b.straight(220);
    b.level(20);

    // 1 · The Blue Mountains — a winding climb and descent through the gums.
    b.setDistrict(1).setPaving(Paving.Asphalt);
    b.turn(50, 180, { width: 9 });
    b.pitch(5, 120);
    b.straight(100);
    b.pitch(-10, 120);
    b.straight(100);
    b.pitch(5, 120);
    b.turn(-60, 180);
    b.straight(160);
    b.level(20);

    // 2 · Melbourne — a city grid with tram lines.
    b.setDistrict(2).setPaving(Paving.Asphalt);
    b.straight(220, { width: 13 });
    b.turn(90, 60);
    b.straight(160);
    b.turn(-90, 60);
    b.straight(260);
    b.level(20);

    // 3 · The Great Ocean Road — clinging to the coast.
    b.setDistrict(3).setPaving(Paving.Asphalt);
    b.turn(-40, 220, { width: 10 });
    b.straight(160);
    b.turn(50, 220);
    b.straight(160);
    b.turn(-30, 250);
    b.straight(200);
    b.level(20);

    // 4 · The Outback — long and straight across the red earth.
    b.setDistrict(4).setPaving(Paving.Earth);
    b.straight(600, { width: 12 });
    b.turn(15, 800);
    b.straight(200);
    b.level(20);

    // 5 · Uluru — a sweeping curve round the rock.
    b.setDistrict(5).setPaving(Paving.Earth);
    b.turn(-40, 500, { width: 10 });
    b.straight(250);
    b.turn(40, 500);
    b.straight(200);
    b.level(20);

    // 6 · The Daintree — twisting under the canopy.
    b.setDistrict(6).setPaving(Paving.Earth);
    b.turn(50, 160, { width: 8 });
    b.straight(140);
    b.turn(-80, 150);
    b.straight(140);
    b.turn(40, 180);
    b.straight(200);
    b.level(20);

    // 7 · The Great Barrier Reef — the coast road above the coral.
    b.setDistrict(7).setPaving(Paving.Slabs);
    b.turn(-20, 400, { width: 11 });
    b.straight(360);
    b.turn(25, 400);
    b.straight(240);
    b.level(20);

    // 8 · Byron Bay — out to the cape.
    b.setDistrict(8).setPaving(Paving.Asphalt);
    b.turn(-30, 300, { width: 10 });
    b.straight(260);
    b.turn(30, 300);
    b.straight(260);
    b.level(20);

    // 9 · The Gold Coast — the esplanade to the end of the road.
    b.setDistrict(9).setPaving(Paving.Slabs);
    b.turn(20, 400, { width: 14 });
    b.straight(420);
    b.turn(-20, 400);
    b.straight(200);
    return b.build();
  },
};

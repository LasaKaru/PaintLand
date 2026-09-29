import * as THREE from 'three';
import { TrackBuilder } from '../../road/TrackBuilder';
import { Paving } from '../../road/RoadPath';
import type { DistrictDef } from '../Districts';
import type { ChapterDef } from '../Chapters';
import { japanBackground } from '../dress/japan';

// 48-step tunes. Many lean on the pentatonic (degrees 0 1 2 4 5 of a minor or
// phrygian scale give the in and yō colours of Japanese folk song).
const DISTRICTS: DistrictDef[] = [
  {
    id: 'asakusa',
    name: 'Tokyo',
    kicker: 'the grand tour · japan',
    poem: 'Out under the Thunder Gate and into the neon, where the whole crossing walks at once',
    style: 'asakusa',
    root: 64,
    scale: 'major',
    bpm: 124,
    walls: ['#5a3a2a'],
    // City pop.
    melody: [0, 2, 4, 7, 9, 7, 4, 2, 4, 5, 4, 2, 0, 2, 4, 4, 7, 9, 11, 9, 7, 4, 5, 4, 2, 4, 7, 9, 7, 4, 2, 0, 9, 11, 12, 11, 9, 7, 9, 7, 4, 2, 4, 7, 4, 2, 0, 0],
    preset: 'dusk',
  },
  {
    id: 'fuji',
    name: 'Mount Fuji',
    kicker: 'hakone · the lake and the mountain',
    poem: 'Fuji in the lake twice over: once in the sky, once in the water',
    style: 'fuji',
    root: 62,
    scale: 'major',
    bpm: 84,
    walls: ['#f0e8d4'],
    // Yō pentatonic (0 1 2 4 5 = do re mi so la).
    melody: [0, 1, 2, 4, 5, 4, 2, 1, 2, 4, 5, 7, 5, 4, 2, 0, 4, 5, 7, 8, 7, 5, 4, 2, 1, 2, 4, 2, 1, 0, -1, 0, 7, 8, 9, 8, 7, 5, 4, 5, 4, 2, 1, 2, 1, 0, 0, 0],
    preset: 'morning',
  },
  {
    id: 'shirakawa',
    name: 'Shirakawa-gō',
    kicker: 'the mountain villages',
    poem: 'Roofs like hands at prayer, rice in the water, and the bullet train singing past',
    style: 'shirakawa',
    root: 65,
    scale: 'major',
    bpm: 96,
    walls: ['#6a4a32'],
    melody: [0, 2, 4, 2, 4, 5, 4, 2, 0, 2, 4, 7, 4, 2, 0, 0, 4, 5, 7, 9, 7, 5, 4, 2, 4, 7, 9, 7, 4, 2, 0, -1, 0, 4, 7, 9, 12, 9, 7, 4, 5, 4, 2, 4, 2, 0, 0, 0],
  },
  {
    id: 'kinkakuji',
    name: 'Kyoto',
    kicker: 'the old capital',
    poem: 'Through a thousand gates, through the bamboo, to a pavilion of gold on a still pond',
    style: 'kinkakuji',
    root: 62,
    scale: 'phrygian',
    bpm: 80,
    walls: ['#5a3a2a'],
    // Miyako-bushi (in scale): 0 1 3 4 5 of phrygian = mi fa la ti do.
    melody: [0, 1, 3, 1, 0, -2, 0, 1, 3, 4, 5, 4, 3, 1, 0, 0, 4, 5, 7, 5, 4, 3, 1, 0, 1, 3, 4, 3, 1, 0, -2, -3, 0, 1, 3, 4, 7, 5, 4, 3, 1, 3, 1, 0, -2, 0, 0, 0],
    preset: 'golden',
  },
  {
    id: 'nara',
    name: 'Nara',
    kicker: 'the deer park',
    poem: 'The deer bow for a cracker; the Great Buddha waits behind the biggest wooden doors',
    style: 'nara',
    root: 60,
    scale: 'major',
    bpm: 90,
    walls: ['#f0e8d4'],
    melody: [0, 0, 2, 4, 2, 0, 4, 5, 4, 2, 0, 2, 4, 2, 0, 0, 5, 4, 5, 7, 5, 4, 2, 4, 2, 0, -1, 0, 2, 4, 2, 0, 4, 5, 7, 9, 7, 5, 4, 2, 4, 5, 4, 2, 1, 0, 0, 0],
  },
  {
    id: 'osaka',
    name: 'Osaka',
    kicker: 'dōtonbori · the castle',
    poem: 'A giant crab waves at the canal; eat until you drop, then drive to the castle',
    style: 'osaka',
    root: 67,
    scale: 'mixolydian',
    bpm: 132,
    walls: ['#3a3a4a'],
    // A cheeky festival romp.
    melody: [0, 4, 7, 4, 6, 4, 2, 0, 2, 4, 6, 7, 6, 4, 2, 4, 7, 9, 10, 9, 7, 6, 4, 2, 4, 6, 7, 9, 7, 4, 2, 0, 7, 7, 9, 10, 9, 7, 6, 4, 2, 4, 6, 4, 2, 0, -1, 0],
    preset: 'night',
  },
  {
    id: 'himeji',
    name: 'Himeji',
    kicker: 'the white heron castle',
    poem: 'The castle spreads its white wings over a sea of blossom',
    style: 'himeji',
    root: 64,
    scale: 'major',
    bpm: 88,
    walls: ['#5a3a2a'],
    // "Sakura, sakura"-coloured phrases in the in scale over a major key.
    melody: [0, 0, 1, 0, 0, 1, 2, 1, 0, 1, 2, 4, 2, 1, 0, -1, 0, 1, 2, 4, 5, 4, 2, 1, 2, 4, 5, 7, 5, 4, 2, 1, 0, 1, 2, 1, 0, -1, -3, -1, 0, 1, 2, 1, 0, 0, 0, 0],
    preset: 'morning',
  },
  {
    id: 'miyajima',
    name: 'Miyajima',
    kicker: 'the shrine island',
    poem: 'At high tide the great gate stands in the sea, and the deer walk the beach below it',
    style: 'miyajima',
    root: 62,
    scale: 'minor',
    bpm: 76,
    walls: ['#f0e8d4'],
    melody: [0, 2, 3, 5, 7, 5, 3, 2, 0, 3, 5, 7, 10, 7, 5, 3, 7, 8, 7, 5, 3, 5, 3, 2, 0, 2, 3, 5, 3, 2, 0, -2, 0, 3, 5, 7, 10, 12, 10, 7, 5, 7, 5, 3, 2, 0, 0, 0],
    preset: 'dusk',
  },
  {
    id: 'beppu',
    name: 'Beppu',
    kicker: 'the hot springs',
    poem: 'Steam from every hillside, a red bridge over the stream, and a hot bath at the end',
    style: 'beppu',
    root: 60,
    scale: 'major',
    bpm: 72,
    walls: ['#e8dcc0'],
    melody: [0, 2, 4, 5, 4, 2, 0, 0, 2, 4, 5, 7, 5, 4, 2, 2, 4, 5, 7, 9, 7, 5, 4, 2, 0, 2, 4, 2, 0, -1, -3, -1, 0, 2, 4, 7, 9, 7, 5, 4, 2, 4, 2, 0, -1, 0, 0, 0],
    weather: 'fog',
  },
  {
    id: 'okinawa',
    name: 'Okinawa',
    kicker: 'the southern islands · the end of the road',
    poem: 'A shīsā on every roof, the sanshin playing, and the bluest water in Japan',
    style: 'okinawa',
    root: 65,
    scale: 'lydian',
    bpm: 112,
    walls: ['#f0e8d4'],
    // Ryūkyū scale (0 2 3 4 6 of lydian = do mi fa so ti).
    melody: [0, 2, 3, 4, 6, 4, 3, 2, 0, 2, 4, 6, 7, 6, 4, 2, 3, 4, 6, 7, 9, 7, 6, 4, 3, 2, 0, 2, 3, 2, 0, -1, 0, 2, 3, 4, 6, 7, 9, 10, 9, 7, 6, 4, 3, 2, 0, 0],
    preset: 'golden',
  },
];

/**
 * Grand Tour · "Japan" — about ten kilometres from Tokyo to Okinawa: Fuji,
 * Shirakawa-gō, Kyoto, Nara, Osaka, Himeji, Miyajima and Beppu.
 */
export const JAPAN: ChapterDef = {
  id: 'japan',
  book: 2,
  flag: '🇯🇵',
  name: 'Japan',
  kicker: 'grand tour',
  blurb: 'Ten kilometres from the neon of Tokyo to the beaches of Okinawa: Fuji, thatched villages, Kyoto’s gates, Nara’s deer, Osaka, two castles, a gate in the sea and hot springs.',
  districts: DISTRICTS,
  startPreset: 'morning',
  unlockPhrases: 0,
  background: japanBackground,
  buildRoute() {
    const b = new TrackBuilder(new THREE.Vector3(0, 6, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), 13);

    // 0 · Tokyo — out of Asakusa, a dogleg into Shibuya, a long neon avenue.
    b.setDistrict(0).setPaving(Paving.Asphalt);
    b.straight(200, { width: 13 });
    b.turn(90, 70);
    b.straight(140);
    b.turn(-90, 70);
    b.straight(260);
    b.turn(-30, 300);
    b.straight(120);
    b.level(20);

    // 1 · Fuji — along Lake Ashi with the mountain beyond, over a pass and back down.
    b.setDistrict(1).setPaving(Paving.Asphalt);
    b.turn(40, 320, { width: 10 });
    b.straight(160);
    b.pitch(5, 120);
    b.straight(100);
    b.pitch(-10, 120);
    b.straight(100);
    b.pitch(5, 120);
    b.straight(120);
    b.level(20);

    // 2 · Shirakawa-gō — a valley road between the farmhouses and the paddies.
    b.setDistrict(2).setPaving(Paving.Earth);
    b.turn(-50, 260, { width: 9 });
    b.straight(220);
    b.turn(60, 240);
    b.straight(260);
    b.level(20);

    // 3 · Kyoto — machiya lanes, the torii tunnel, the bamboo grove, the Golden Pavilion.
    b.setDistrict(3).setPaving(Paving.Stone);
    b.turn(-40, 200, { width: 9 });
    b.straight(160);
    b.turn(80, 90);
    b.straight(200);
    b.turn(-80, 90);
    b.straight(180);
    b.level(20);

    // 4 · Nara — straight through the park to the Great Buddha Hall.
    b.setDistrict(4).setPaving(Paving.Slabs);
    b.straight(320, { width: 11 });
    b.turn(35, 350);
    b.straight(300);
    b.level(20);

    // 5 · Osaka — along the Dōtonbori canal, then out to the castle.
    b.setDistrict(5).setPaving(Paving.Asphalt);
    b.turn(-60, 160, { width: 12 });
    b.straight(260);
    b.turn(50, 220);
    b.straight(260);
    b.level(20);

    // 6 · Himeji — under the blossom, round the castle hill.
    b.setDistrict(6).setPaving(Paving.Slabs);
    b.turn(-45, 300, { width: 11 });
    b.straight(200);
    b.turn(70, 260);
    b.straight(220);
    b.level(20);

    // 7 · Miyajima — the shore road facing the gate in the sea.
    b.setDistrict(7).setPaving(Paving.Stone);
    b.turn(-60, 300, { width: 10 });
    b.straight(300);
    b.turn(30, 400);
    b.straight(200);
    b.level(20);

    // 8 · Beppu — a hill road among the steaming vents.
    b.setDistrict(8).setPaving(Paving.Asphalt);
    b.turn(40, 220, { width: 9 });
    b.pitch(5, 120);
    b.straight(100);
    b.pitch(-10, 120);
    b.straight(100);
    b.pitch(5, 120);
    b.turn(-60, 200);
    b.straight(160);
    b.level(20);

    // 9 · Okinawa — a long beach road to the end of Japan.
    b.setDistrict(9).setPaving(Paving.Slabs);
    b.turn(30, 400, { width: 12 });
    b.straight(300);
    b.turn(-20, 500);
    b.straight(300);
    return b.build();
  },
};

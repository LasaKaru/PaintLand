import * as THREE from 'three';
import { TrackBuilder } from '../../road/TrackBuilder';
import { Paving } from '../../road/RoadPath';
import type { DistrictDef } from '../Districts';
import type { ChapterDef } from '../Chapters';
import { chinaBackground } from '../dress/china';

// 48-step tunes on the Chinese pentatonic: degrees 0 1 2 4 5 of a major
// scale are gōng shāng jué zhǐ yǔ (do re mi so la); 7 is the octave's gōng.
const DISTRICTS: DistrictDef[] = [
  {
    id: 'beijing',
    name: 'Beijing',
    kicker: 'the grand tour · china',
    poem: 'Through the Gate of Heavenly Peace, along red walls to the round blue Temple of Heaven',
    style: 'beijing',
    root: 62,
    scale: 'major',
    bpm: 100,
    walls: ['#b8322a'],
    // A stately court tune.
    melody: [0, 2, 4, 5, 4, 2, 1, 0, 2, 4, 5, 7, 5, 4, 2, 1, 4, 5, 7, 8, 7, 5, 4, 2, 1, 2, 4, 2, 1, 0, -2, 0, 7, 8, 9, 8, 7, 5, 4, 5, 4, 2, 1, 2, 1, 0, 0, 0],
    preset: 'morning',
  },
  {
    id: 'badaling',
    name: 'The Great Wall',
    kicker: 'badaling · over the ridges',
    poem: 'The road climbs onto the wall and rides it over the hills, tower after tower',
    style: 'badaling',
    root: 60,
    scale: 'major',
    bpm: 108,
    walls: ['#bfae8e'],
    melody: [0, 0, 4, 4, 5, 4, 2, 0, 2, 4, 5, 7, 5, 4, 2, 2, 4, 5, 7, 9, 7, 5, 4, 2, 0, 2, 4, 5, 4, 2, 1, 0, 7, 9, 11, 9, 7, 5, 4, 5, 4, 2, 0, 2, 1, 0, 0, 0],
  },
  {
    id: 'xian',
    name: 'Xi’an',
    kicker: 'the terracotta army',
    poem: 'Eight thousand clay soldiers keep watch in their pits, and not one of them has blinked',
    style: 'xian',
    root: 57,
    scale: 'minor',
    bpm: 92,
    walls: ['#8e8a80'],
    // Yǔ mode (the minor pentatonic): a marching drum song.
    melody: [0, 0, 2, 3, 4, 3, 2, 0, -2, 0, 2, 3, 2, 0, -2, -3, 0, 2, 3, 4, 6, 4, 3, 2, 3, 4, 3, 2, 0, -2, 0, 0, 4, 6, 7, 6, 4, 3, 2, 3, 2, 0, -2, 0, -2, -3, 0, 0],
    preset: 'dusk',
  },
  {
    id: 'lhasa',
    name: 'Lhasa',
    kicker: 'the roof of the world',
    poem: 'Prayer flags snap over the road; the Potala stands white and red on its hill',
    style: 'lhasa',
    root: 62,
    scale: 'dorian',
    bpm: 72,
    walls: ['#f4f0e6'],
    melody: [0, 0, 2, 0, -2, 0, 2, 3, 4, 3, 2, 0, 2, 0, -2, -3, 0, 2, 4, 6, 4, 3, 2, 0, -2, 0, 2, 3, 2, 0, 0, 0, 4, 6, 7, 6, 4, 3, 2, 3, 2, 0, -2, -3, -2, 0, 0, 0],
    preset: 'noon',
  },
  {
    id: 'chengdu',
    name: 'Chengdu',
    kicker: 'pandas and teahouses',
    poem: 'A panda chews its bamboo and does not look up, not even for a painted car',
    style: 'chengdu',
    root: 65,
    scale: 'major',
    bpm: 96,
    walls: ['#e8dcc0'],
    // A playful Sichuan folk tune.
    melody: [0, 2, 4, 2, 0, 2, 4, 7, 5, 4, 2, 4, 2, 0, -1, 0, 4, 5, 7, 5, 4, 2, 4, 5, 7, 9, 7, 5, 4, 2, 0, 0, 2, 4, 5, 7, 9, 7, 5, 4, 2, 4, 2, 1, 0, -1, 0, 0],
  },
  {
    id: 'zhangjiajie',
    name: 'Zhangjiajie',
    kicker: 'the floating mountains',
    poem: 'Stone pillars stand out of the mist like the legs of giants, pines on their heads',
    style: 'zhangjiajie',
    root: 62,
    scale: 'minor',
    bpm: 76,
    walls: ['#a8a090'],
    melody: [0, 2, 3, 4, 6, 4, 3, 2, 0, -2, 0, 2, 3, 2, 0, 0, 4, 6, 7, 9, 7, 6, 4, 3, 4, 3, 2, 0, -2, -3, -2, 0, 7, 9, 10, 9, 7, 6, 4, 3, 2, 0, 2, 3, 2, 0, 0, 0],
    weather: 'fog',
  },
  {
    id: 'guilin',
    name: 'Guilin',
    kicker: 'the li river',
    poem: 'Green hills like upturned bowls, and a fisherman on a raft with his cormorants',
    style: 'guilin',
    root: 64,
    scale: 'major',
    bpm: 84,
    walls: ['#f0e8d4'],
    // A river song for the guzheng.
    melody: [0, 1, 2, 4, 5, 4, 2, 1, 2, 4, 5, 7, 8, 7, 5, 4, 5, 7, 8, 9, 8, 7, 5, 4, 2, 1, 2, 4, 2, 1, 0, -2, 0, 2, 4, 5, 7, 5, 4, 2, 1, 2, 1, 0, -2, -3, 0, 0],
    preset: 'morning',
  },
  {
    id: 'suzhou',
    name: 'Suzhou',
    kicker: 'canals and gardens',
    poem: 'White walls, black tiles, a lantern over each door and a stone bridge over every canal',
    style: 'suzhou',
    root: 67,
    scale: 'major',
    bpm: 80,
    walls: ['#f4f0e8'],
    // A pingtan ballad, soft and ornamented.
    melody: [0, 2, 1, 0, -2, 0, 1, 2, 4, 5, 4, 2, 1, 2, 0, 0, 4, 5, 7, 5, 4, 5, 4, 2, 1, 2, 4, 2, 1, 0, -2, 0, 2, 4, 5, 7, 9, 7, 5, 4, 5, 4, 2, 1, 2, 1, 0, 0],
    preset: 'golden',
  },
  {
    id: 'shanghai',
    name: 'Shanghai',
    kicker: 'the bund',
    poem: 'Old stone banks on one shore, towers of glass on the other, and the river lit between',
    style: 'shanghai',
    root: 65,
    scale: 'major',
    bpm: 118,
    walls: ['#d8cfb8'],
    // 1930s Shanghai jazz.
    melody: [0, 4, 7, 9, 8, 7, 4, 2, 4, 5, 7, 9, 11, 9, 7, 5, 7, 9, 11, 12, 11, 9, 7, 5, 4, 5, 4, 2, 0, -1, 0, 2, 4, 7, 9, 12, 14, 12, 9, 7, 5, 4, 2, 4, 2, 0, 0, 0],
    preset: 'night',
  },
  {
    id: 'hongkong',
    name: 'Hong Kong',
    kicker: 'victoria harbour · the end of the road',
    poem: 'Neon over every street, trams ding-ding, and junks with red sails on the harbour',
    style: 'hongkong',
    root: 64,
    scale: 'major',
    bpm: 124,
    walls: ['#d8cfc0'],
    // Cantopop.
    melody: [0, 2, 4, 5, 7, 5, 4, 2, 4, 5, 7, 9, 7, 5, 4, 4, 5, 7, 9, 11, 12, 11, 9, 7, 5, 4, 2, 4, 5, 4, 2, 0, 7, 9, 11, 12, 14, 12, 11, 9, 7, 5, 4, 2, 1, 2, 0, 0],
    preset: 'dusk',
  },
];

/**
 * Grand Tour · "China" — about ten kilometres from Beijing to Hong Kong:
 * the Great Wall, Xi'an, Lhasa, Chengdu, Zhangjiajie, Guilin, Suzhou and Shanghai.
 */
export const CHINA: ChapterDef = {
  id: 'china',
  book: 2,
  flag: '🇨🇳',
  name: 'China',
  kicker: 'grand tour',
  blurb: 'Ten kilometres from Beijing to Hong Kong: ride the Great Wall, meet the terracotta army, pandas and the Potala, drive among floating mountains and karst hills, then the Bund and Victoria Harbour.',
  districts: DISTRICTS,
  startPreset: 'morning',
  unlockPhrases: 0,
  background: chinaBackground,
  buildRoute() {
    const b = new TrackBuilder(new THREE.Vector3(0, 6, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), 14);

    // 0 · Beijing — Chang'an Avenue through Tiananmen, beside the palace walls.
    b.setDistrict(0).setPaving(Paving.Slabs);
    b.straight(420, { width: 14 });
    b.turn(-90, 90);
    b.straight(200);
    b.turn(90, 90);
    b.straight(220);
    b.level(20);

    // 1 · The Great Wall — up onto the wall and over two ridges.
    b.setDistrict(1).setPaving(Paving.Stone);
    b.straight(40, { width: 8 });
    b.pitch(8, 90);
    b.straight(90);
    b.pitch(-16, 90);
    b.straight(90);
    b.pitch(16, 90);
    b.straight(90);
    b.pitch(-16, 90);
    b.straight(90);
    b.pitch(8, 90);
    b.turn(-35, 200);
    b.straight(160);
    b.level(20);

    // 2 · Xi'an — past the Bell Tower and out to the army's pits.
    b.setDistrict(2).setPaving(Paving.Asphalt);
    b.turn(40, 260, { width: 12 });
    b.straight(260);
    b.turn(-20, 300);
    b.straight(260);
    b.level(20);

    // 3 · Lhasa — a high valley road under the palace.
    b.setDistrict(3).setPaving(Paving.Earth);
    b.turn(30, 400, { width: 10 });
    b.straight(300);
    b.turn(-40, 300);
    b.straight(260);
    b.level(20);

    // 4 · Chengdu — through the bamboo of the panda base.
    b.setDistrict(4).setPaving(Paving.Asphalt);
    b.turn(50, 180, { width: 9 });
    b.straight(160);
    b.turn(-60, 180);
    b.straight(160);
    b.turn(20, 200);
    b.straight(200);
    b.level(20);

    // 5 · Zhangjiajie — winding among the pillars.
    b.setDistrict(5).setPaving(Paving.Asphalt);
    b.turn(-50, 160, { width: 9 });
    b.straight(120);
    b.turn(80, 140);
    b.straight(120);
    b.turn(-50, 160);
    b.straight(200);
    b.level(20);

    // 6 · Guilin — along the Li River.
    b.setDistrict(6).setPaving(Paving.Earth);
    b.turn(-25, 400, { width: 9 });
    b.straight(300);
    b.turn(35, 350);
    b.straight(260);
    b.level(20);

    // 7 · Suzhou — beside the canal, then round West Lake.
    b.setDistrict(7).setPaving(Paving.Stone);
    b.straight(300, { width: 9 });
    b.turn(-50, 260);
    b.straight(160);
    b.turn(40, 300);
    b.straight(120);
    b.level(20);

    // 8 · Shanghai — the Bund, facing Pudong.
    b.setDistrict(8).setPaving(Paving.Slabs);
    b.turn(20, 400, { width: 14 });
    b.straight(420);
    b.turn(-20, 400);
    b.straight(200);
    b.level(20);

    // 9 · Hong Kong — Nathan Road's neon, then the harbourfront.
    b.setDistrict(9).setPaving(Paving.Asphalt);
    b.straight(300, { width: 12 });
    b.turn(-40, 250);
    b.straight(200);
    b.turn(30, 300);
    b.straight(250);
    return b.build();
  },
};

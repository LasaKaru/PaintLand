import * as THREE from 'three';
import { TrackBuilder } from '../../road/TrackBuilder';
import { Paving } from '../../road/RoadPath';
import type { DistrictDef } from '../Districts';
import type { ChapterDef } from '../Chapters';
import { koreaBackground } from '../dress/korea';

// 48-step tunes on Korean pentatonic modes: pyeongjo (bright, degrees
// 0 1 2 4 5 of major) and gyemyeonjo (plaintive, the minor pentatonic).
// Many lean on the lilting 3-beat semachi and gutgeori rhythms.
const DISTRICTS: DistrictDef[] = [
  {
    id: 'seoul',
    name: 'Seoul',
    kicker: 'the grand tour · korea',
    poem: 'Through Gwanghwamun into the palace quarter, with Namsan’s tower on the hill ahead',
    style: 'seoul',
    root: 62,
    scale: 'major',
    bpm: 100,
    walls: ['#f4efe4'],
    // An Arirang-coloured waltz.
    melody: [0, 0, 1, 2, 1, 2, 4, 2, 1, 0, 1, 2, 4, 5, 4, 2, 4, 5, 7, 5, 4, 2, 1, 2, 1, 0, -3, -1, 0, 1, 0, 0, 4, 5, 7, 8, 7, 5, 4, 5, 4, 2, 1, 2, 1, 0, 0, 0],
    preset: 'morning',
  },
  {
    id: 'gangnam',
    name: 'Gangnam',
    kicker: 'screens and neon',
    poem: 'Every tower is a stage; the screens dance and so does the traffic',
    style: 'gangnam',
    root: 65,
    scale: 'minor',
    bpm: 128,
    walls: ['#5a6a7a'],
    // A K-pop hook.
    melody: [0, 0, 3, 0, 5, 3, 7, 5, 0, 0, 3, 5, 7, 8, 7, 5, 3, 5, 7, 10, 7, 5, 3, 2, 0, 2, 3, 5, 3, 2, 0, -2, 7, 7, 10, 12, 10, 7, 5, 3, 5, 7, 5, 3, 2, 0, 0, 0],
    // Dusk rather than night, so the screens' colours still read.
    preset: 'dusk',
  },
  {
    id: 'suwon',
    name: 'Suwon',
    kicker: 'the hwaseong fortress',
    poem: 'A king’s fortress of grey stone runs beside the road, flags on every tower',
    style: 'suwon',
    root: 60,
    scale: 'major',
    bpm: 104,
    walls: ['#f4efe4'],
    // A royal procession march (daechwita-like).
    melody: [0, 0, 4, 4, 5, 4, 2, 0, 1, 2, 4, 5, 4, 2, 1, 0, 4, 5, 7, 7, 8, 7, 5, 4, 2, 4, 2, 1, 0, -1, 0, 0, 7, 8, 9, 8, 7, 5, 4, 5, 4, 2, 1, 2, 1, 0, 0, 0],
  },
  {
    id: 'seorak',
    name: 'Seoraksan',
    kicker: 'the autumn mountains',
    poem: 'Granite peaks, a whole mountain of red and gold leaves, and a bronze Buddha in the valley',
    style: 'seorak',
    root: 57,
    scale: 'minor',
    bpm: 80,
    walls: ['#8e8a80'],
    // Gyemyeonjo: plaintive, with a bending sigh.
    melody: [0, 2, 3, 5, 3, 2, 0, -2, 0, 3, 5, 7, 5, 3, 2, 0, 5, 7, 8, 7, 5, 3, 5, 3, 2, 0, -2, 0, 2, 0, -2, -3, 0, 2, 3, 5, 7, 10, 7, 5, 3, 2, 0, 2, 0, -2, 0, 0],
    preset: 'golden',
  },
  {
    id: 'andong',
    name: 'Andong',
    kicker: 'the hahoe masks',
    poem: 'Thatched roofs in a bend of the river, and giant masks grinning at the road',
    style: 'andong',
    root: 62,
    scale: 'dorian',
    bpm: 108,
    walls: ['#c8a878'],
    // A mask-dance tune with janggu drums.
    melody: [0, 2, 3, 4, 3, 2, 0, 2, 3, 4, 6, 4, 3, 2, 0, 0, 4, 6, 7, 6, 4, 3, 4, 3, 2, 0, 2, 3, 2, 0, -2, 0, 7, 6, 4, 6, 7, 9, 7, 6, 4, 3, 2, 3, 2, 0, 0, 0],
  },
  {
    id: 'gyeongju',
    name: 'Gyeongju',
    kicker: 'the silla kingdom',
    poem: 'Green burial mounds like sleeping giants, and a stone tower once used to read the stars',
    style: 'gyeongju',
    root: 64,
    scale: 'major',
    bpm: 84,
    walls: ['#d8cfb8'],
    melody: [0, 1, 2, 4, 2, 1, 0, -1, 0, 2, 4, 5, 4, 2, 1, 0, 4, 5, 7, 5, 4, 2, 4, 5, 7, 8, 7, 5, 4, 2, 1, 0, 2, 4, 5, 4, 2, 1, 0, 1, 2, 1, 0, -1, -3, -1, 0, 0],
    preset: 'dusk',
  },
  {
    id: 'boseong',
    name: 'Boseong',
    kicker: 'the green tea hills',
    poem: 'Row upon row of tea, combed over the hills like green corduroy',
    style: 'boseong',
    root: 67,
    scale: 'major',
    bpm: 88,
    walls: ['#f4efe4'],
    melody: [0, 2, 4, 5, 4, 2, 4, 7, 5, 4, 2, 1, 2, 4, 2, 0, 4, 5, 7, 8, 7, 5, 4, 2, 4, 5, 4, 2, 1, 0, -1, 0, 7, 8, 9, 8, 7, 5, 4, 2, 1, 2, 4, 2, 1, 0, 0, 0],
    preset: 'morning',
  },
  {
    id: 'gamcheon',
    name: 'Gamcheon',
    kicker: 'busan · the painted hillside',
    poem: 'A whole hillside of little houses, every one a different colour, stacked up to the sky',
    style: 'gamcheon',
    root: 65,
    scale: 'major',
    bpm: 112,
    walls: ['#f4d23b', '#3e9fd8'],
    melody: [0, 4, 7, 4, 5, 4, 2, 0, 2, 4, 5, 7, 9, 7, 5, 4, 5, 7, 9, 7, 5, 4, 2, 4, 5, 4, 2, 0, -1, 0, 2, 0, 4, 5, 7, 9, 11, 9, 7, 5, 4, 5, 4, 2, 1, 0, 0, 0],
  },
  {
    id: 'haeundae',
    name: 'Haeundae',
    kicker: 'busan · the beach and the bridge',
    poem: 'Umbrellas all along the sand, and a bridge across the bay that lights up pink at night',
    style: 'haeundae',
    root: 62,
    scale: 'major',
    bpm: 120,
    walls: ['#e0e0e8'],
    // Summer city pop.
    melody: [0, 2, 4, 7, 4, 2, 4, 5, 7, 9, 7, 5, 4, 2, 0, 2, 4, 7, 9, 11, 12, 11, 9, 7, 5, 4, 5, 7, 5, 4, 2, 0, 7, 9, 12, 11, 9, 7, 5, 4, 2, 4, 5, 4, 2, 1, 0, 0],
    preset: 'dusk',
  },
  {
    id: 'jeju',
    name: 'Jeju',
    kicker: 'the volcanic island · the end of the road',
    poem: 'Stone grandfathers keep watch, tangerines glow in the groves, and the Sunrise Peak stands in the sea',
    style: 'jeju',
    root: 64,
    scale: 'lydian',
    bpm: 96,
    walls: ['#5a5a5e'],
    melody: [0, 2, 4, 6, 4, 2, 0, 2, 4, 6, 7, 9, 7, 6, 4, 2, 4, 6, 7, 9, 11, 9, 7, 6, 4, 2, 0, 2, 4, 2, 0, -1, 0, 4, 7, 9, 11, 12, 11, 9, 7, 6, 4, 2, 0, -1, 0, 0],
    preset: 'golden',
  },
];

/**
 * Grand Tour · "Korea" — about ten kilometres from Seoul to Jeju: Gangnam,
 * Suwon, Seoraksan, Andong, Gyeongju, Boseong and Busan.
 */
export const KOREA: ChapterDef = {
  id: 'korea',
  book: 2,
  flag: '🇰🇷',
  name: 'Korea',
  kicker: 'grand tour',
  blurb: 'Ten kilometres from Seoul to Jeju: palace gates and hanok lanes, Gangnam’s screens, a king’s fortress, autumn mountains, mask villages, royal tombs, tea hills, Busan’s painted hillside and beach, and a volcanic island.',
  districts: DISTRICTS,
  startPreset: 'morning',
  unlockPhrases: 0,
  background: koreaBackground,
  buildRoute() {
    const b = new TrackBuilder(new THREE.Vector3(0, 6, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), 13);

    // 0 · Seoul — Sejong-daero through Gwanghwamun, then the hanok lanes.
    b.setDistrict(0).setPaving(Paving.Slabs);
    b.straight(300, { width: 13 });
    b.turn(-70, 90);
    b.straight(180);
    b.turn(70, 90);
    b.straight(260);
    b.level(20);

    // 1 · Gangnam — a wide boulevard between the screens.
    b.setDistrict(1).setPaving(Paving.Asphalt);
    b.turn(30, 300, { width: 14 });
    b.straight(400);
    b.turn(-30, 300);
    b.straight(160);
    b.level(20);

    // 2 · Suwon — along the fortress wall to the south gate.
    b.setDistrict(2).setPaving(Paving.Stone);
    b.turn(-40, 250, { width: 11 });
    b.straight(260);
    b.turn(40, 250);
    b.straight(260);
    b.level(20);

    // 3 · Seoraksan — a mountain road up the valley and back down.
    b.setDistrict(3).setPaving(Paving.Asphalt);
    b.turn(50, 180, { width: 9 });
    b.pitch(5, 120);
    b.straight(100);
    b.pitch(-10, 120);
    b.straight(100);
    b.pitch(5, 120);
    b.turn(-70, 160);
    b.straight(160);
    b.level(20);

    // 4 · Andong — round the river bend of Hahoe.
    b.setDistrict(4).setPaving(Paving.Earth);
    b.turn(60, 260, { width: 9 });
    b.straight(160);
    b.turn(-50, 280);
    b.straight(260);
    b.level(20);

    // 5 · Gyeongju — among the tumuli.
    b.setDistrict(5).setPaving(Paving.Slabs);
    b.turn(-30, 350, { width: 11 });
    b.straight(300);
    b.turn(30, 350);
    b.straight(220);
    b.level(20);

    // 6 · Boseong — winding through the tea.
    b.setDistrict(6).setPaving(Paving.Earth);
    b.turn(45, 160, { width: 8 });
    b.straight(120);
    b.turn(-70, 160);
    b.straight(140);
    b.turn(40, 200);
    b.straight(200);
    b.level(20);

    // 7 · Gamcheon — up past the painted hillside.
    b.setDistrict(7).setPaving(Paving.Asphalt);
    b.turn(-30, 300, { width: 10 });
    b.straight(300);
    b.turn(20, 400);
    b.straight(260);
    b.level(20);

    // 8 · Haeundae — the beachfront.
    b.setDistrict(8).setPaving(Paving.Slabs);
    b.turn(30, 400, { width: 13 });
    b.straight(360);
    b.turn(-30, 400);
    b.straight(160);
    b.level(20);

    // 9 · Jeju — the island coast road to the Sunrise Peak.
    b.setDistrict(9).setPaving(Paving.Asphalt);
    b.turn(-20, 400, { width: 11 });
    b.straight(300);
    b.turn(30, 350);
    b.straight(300);
    return b.build();
  },
};

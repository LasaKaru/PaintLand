import * as THREE from 'three';
import { TrackBuilder } from '../../road/TrackBuilder';
import { Paving } from '../../road/RoadPath';
import type { DistrictDef } from '../Districts';
import type { ChapterDef } from '../Chapters';
import { indiaBackground } from '../dress/india';

// 48-step tunes. Each district leans on the Western mode nearest a raga:
// bhairav for dawn at Varanasi, lydian for Yaman's evening, mixolydian for
// Khamaj, dorian for Kafi, harmonic minor for desert songs.
const DISTRICTS: DistrictDef[] = [
  {
    id: 'delhi',
    name: 'Delhi',
    kicker: 'the grand tour · india',
    poem: 'Down Rajpath to India Gate, then into Old Delhi’s horns and marigolds',
    style: 'delhi',
    root: 62,
    scale: 'mixolydian',
    bpm: 116,
    walls: ['#e8c878', '#e0906a'],
    // Khamaj-flavoured brass-band march.
    melody: [0, 2, 4, 5, 7, 5, 4, 2, 4, 5, 7, 9, 7, 5, 4, 2, 0, 4, 7, 9, 10, 9, 7, 5, 4, 5, 4, 2, 0, -1, 0, 2, 7, 9, 10, 12, 10, 9, 7, 5, 4, 2, 4, 5, 4, 2, 0, 0],
    preset: 'morning',
  },
  {
    id: 'varanasi',
    name: 'Varanasi',
    kicker: 'the ghats · the ganges',
    poem: 'Bells and chanting on the steps, and a thousand little lamps floating down the river',
    style: 'varanasi',
    root: 60,
    scale: 'bhairav',
    bpm: 72,
    walls: ['#e8c878', '#e59a78'],
    // Raga Bhairav at dawn: the flat second and flat sixth.
    melody: [0, 0, 1, 0, -2, -3, -2, 0, 1, 2, 3, 4, 3, 2, 1, 0, 4, 5, 4, 3, 2, 1, 2, 1, 0, 1, 2, 3, 4, 5, 4, 3, 7, 5, 4, 3, 2, 1, 0, 1, 2, 1, 0, -2, -3, -2, 0, 0],
    preset: 'dusk',
  },
  {
    id: 'agra',
    name: 'Agra',
    kicker: 'the taj mahal',
    poem: 'The long water leads the eye to the white dome, pale as a pearl in the morning',
    style: 'agra',
    root: 64,
    scale: 'lydian',
    bpm: 80,
    walls: ['#f6f2ea'],
    // Yaman, the evening raga of love.
    melody: [0, 2, 3, 2, 4, 3, 2, 0, 2, 4, 5, 4, 3, 2, 0, -1, 0, 2, 4, 5, 7, 5, 4, 3, 4, 3, 2, 0, -1, 0, 2, 0, 4, 5, 7, 9, 7, 5, 4, 3, 2, 3, 4, 3, 2, 0, 0, 0],
    preset: 'morning',
  },
  {
    id: 'jaipur',
    name: 'Jaipur',
    kicker: 'the pink city',
    poem: 'Bazaars the colour of sunset and a palace made of little windows for the wind',
    style: 'jaipur',
    root: 62,
    scale: 'dorian',
    bpm: 104,
    walls: ['#e59a78'],
    // Kafi: Rajasthani folk swing.
    melody: [0, 2, 3, 4, 3, 2, 0, 2, 3, 4, 6, 4, 3, 2, 0, 0, 4, 6, 7, 6, 4, 3, 4, 3, 2, 0, 2, 3, 2, 0, -1, 0, 7, 6, 4, 3, 4, 6, 7, 9, 7, 6, 4, 3, 2, 0, 0, 0],
    preset: 'golden',
  },
  {
    id: 'thar',
    name: 'The Thar Desert',
    kicker: 'dunes and a golden fort',
    poem: 'A line of camels on the dunes, and a fort of gold standing up out of the sand',
    style: 'thar',
    root: 57,
    scale: 'harmonicMinor',
    bpm: 88,
    walls: ['#d9a860'],
    melody: [0, 1, 2, 4, 2, 1, 0, -1, 0, 2, 4, 5, 6, 5, 4, 2, 4, 5, 6, 7, 6, 4, 2, 1, 2, 4, 2, 1, 0, -1, -2, -1, 0, 2, 4, 6, 7, 9, 7, 6, 4, 2, 1, 0, -1, 0, 0, 0],
    preset: 'golden',
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    kicker: 'marine drive · the gateway',
    poem: 'The Queen’s Necklace lights up round the bay; the taxis honk in time',
    style: 'mumbai',
    root: 65,
    scale: 'major',
    bpm: 128,
    walls: ['#3a3a4a'],
    // A Bollywood dance number.
    melody: [0, 4, 7, 9, 7, 4, 5, 7, 9, 11, 12, 11, 9, 7, 5, 4, 0, 4, 7, 9, 12, 14, 12, 9, 11, 9, 7, 5, 4, 2, 0, 0, 7, 9, 11, 12, 11, 9, 7, 5, 7, 5, 4, 2, 4, 2, 0, 0],
    preset: 'dusk',
  },
  {
    id: 'goa',
    name: 'Goa',
    kicker: 'white churches · golden beaches',
    poem: 'Bells from a white church, a shack on the sand, and the sea warm as a bath',
    style: 'goa',
    root: 67,
    scale: 'major',
    bpm: 108,
    walls: ['#f4d23b', '#3e9fd8', '#e8559a'],
    // A Konkani mando with a Portuguese lilt.
    melody: [0, 2, 4, 5, 4, 2, 4, 0, 2, 4, 5, 7, 5, 4, 2, 2, 4, 5, 7, 9, 7, 5, 4, 5, 4, 2, 0, 2, 4, 2, 0, -1, 0, 4, 7, 9, 11, 12, 11, 9, 7, 5, 4, 2, 0, -1, 0, 0],
    preset: 'golden',
  },
  {
    id: 'kerala',
    name: 'Kerala',
    kicker: 'the backwaters',
    poem: 'Houseboats slide between the palms; the great nets dip and rise at Kochi',
    style: 'kerala',
    root: 62,
    scale: 'major',
    bpm: 84,
    walls: ['#f0e0c0'],
    // A boat song (vanchipattu) that rows along.
    melody: [0, 2, 4, 2, 0, 2, 4, 5, 4, 2, 0, -1, 0, 2, 4, 4, 5, 7, 5, 4, 2, 4, 5, 4, 2, 0, -1, -3, -1, 0, 2, 0, 4, 5, 7, 9, 7, 5, 4, 2, 4, 2, 0, -1, 0, 2, 0, 0],
    weather: 'rain',
  },
  {
    id: 'madurai',
    name: 'Madurai',
    kicker: 'the temple city',
    poem: 'Towers of a thousand painted gods rising over the flower market',
    style: 'madurai',
    root: 60,
    scale: 'phrygian',
    bpm: 96,
    walls: ['#f0e0c0', '#e8c878'],
    // A Carnatic phrase around the Bhairavi-like mode.
    melody: [0, 1, 3, 5, 3, 1, 0, -2, 0, 3, 5, 7, 8, 7, 5, 3, 5, 7, 8, 10, 8, 7, 5, 3, 1, 3, 1, 0, -2, 0, 1, 0, 7, 8, 10, 12, 10, 8, 7, 5, 3, 5, 3, 1, 0, -2, 0, 0],
    preset: 'noon',
  },
  {
    id: 'kanyakumari',
    name: 'Kanyakumari',
    kicker: 'the southern tip · the end of the road',
    poem: 'Three seas meet at the end of India; watch the sun set and the moon rise together',
    style: 'kanyakumari',
    root: 64,
    scale: 'lydian',
    bpm: 92,
    walls: ['#f0e0c0'],
    melody: [0, 2, 4, 6, 7, 6, 4, 2, 4, 6, 7, 9, 11, 9, 7, 6, 4, 6, 7, 9, 7, 6, 4, 2, 0, 2, 4, 2, 0, -1, -3, -1, 0, 4, 7, 9, 11, 12, 14, 12, 11, 9, 7, 6, 4, 2, 0, 0],
    preset: 'dusk',
  },
];

/**
 * Grand Tour · "India" — about ten kilometres from Delhi to Kanyakumari:
 * Varanasi, Agra, Jaipur, the Thar, Mumbai, Goa, Kerala and Madurai.
 */
export const INDIA: ChapterDef = {
  id: 'india',
  book: 2,
  flag: '🇮🇳',
  name: 'India',
  kicker: 'grand tour',
  blurb: 'Ten kilometres from Delhi to the southern tip: the ghats of Varanasi, the Taj Mahal, the Pink City, desert dunes, Mumbai’s seafront, Goa, the backwaters of Kerala and Madurai’s temple towers.',
  districts: DISTRICTS,
  startPreset: 'morning',
  unlockPhrases: 0,
  background: indiaBackground,
  buildRoute() {
    const b = new TrackBuilder(new THREE.Vector3(0, 6, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), 14);

    // 0 · Delhi — straight down Rajpath through India Gate, then Old Delhi.
    b.setDistrict(0).setPaving(Paving.Asphalt);
    b.straight(360, { width: 14 });
    b.turn(-60, 160);
    b.straight(200);
    b.turn(60, 160);
    b.straight(200);
    b.level(20);

    // 1 · Varanasi — along the ghats, with the river on the right.
    b.setDistrict(1).setPaving(Paving.Stone);
    b.turn(35, 300, { width: 9 });
    b.straight(300);
    b.turn(-30, 400);
    b.straight(300);
    b.level(20);

    // 2 · Agra — a gentle curve past the Taj Mahal.
    b.setDistrict(2).setPaving(Paving.Slabs);
    b.turn(-30, 350, { width: 12 });
    b.straight(250);
    b.turn(30, 400);
    b.straight(250);
    b.level(20);

    // 3 · Jaipur — the bazaar grid of the Pink City.
    b.setDistrict(3).setPaving(Paving.Asphalt);
    b.straight(200, { width: 11 });
    b.turn(90, 60);
    b.straight(150);
    b.turn(-90, 60);
    b.straight(260);
    b.level(20);

    // 4 · The Thar — over the dunes to Jaisalmer.
    b.setDistrict(4).setPaving(Paving.Earth);
    b.straight(150, { width: 10 });
    b.pitch(4, 120);
    b.straight(80);
    b.pitch(-8, 120);
    b.straight(80);
    b.pitch(4, 120);
    b.turn(-40, 400);
    b.straight(250);
    b.level(20);

    // 5 · Mumbai — the sweep of Marine Drive to the Gateway.
    b.setDistrict(5).setPaving(Paving.Asphalt);
    b.turn(50, 500, { width: 14 });
    b.straight(300);
    b.turn(-20, 300);
    b.level(20);

    // 6 · Goa — the coast road past the beaches.
    b.setDistrict(6).setPaving(Paving.Earth);
    b.turn(-30, 300, { width: 10 });
    b.straight(250);
    b.turn(30, 300);
    b.straight(300);
    b.level(20);

    // 7 · Kerala — winding along the backwaters.
    b.setDistrict(7).setPaving(Paving.Asphalt);
    b.turn(50, 180, { width: 9 });
    b.straight(150);
    b.turn(-70, 160);
    b.straight(150);
    b.turn(40, 200);
    b.straight(150);
    b.level(20);

    // 8 · Madurai — into the temple city.
    b.setDistrict(8).setPaving(Paving.Stone);
    b.turn(-20, 300, { width: 11 });
    b.straight(300);
    b.turn(30, 300);
    b.straight(250);
    b.level(20);

    // 9 · Kanyakumari — the last stretch to the tip.
    b.setDistrict(9).setPaving(Paving.Slabs);
    b.turn(-30, 400, { width: 12 });
    b.straight(350);
    b.turn(20, 500);
    b.straight(250);
    return b.build();
  },
};

import * as THREE from 'three';
import { TrackBuilder } from '../../road/TrackBuilder';
import { Paving } from '../../road/RoadPath';
import type { DistrictDef } from '../Districts';
import type { ChapterDef } from '../Chapters';
import { serendibBackground } from '../dress/serendib';

const DISTRICTS: DistrictDef[] = [
  {
    id: 'galle-face',
    name: 'Galle Face Green',
    kicker: 'chapter two · serendib',
    poem: 'Kites over the sea wall, isso vadai in the evening air',
    style: 'galleface',
    root: 62,
    scale: 'major',
    bpm: 96,
    walls: ['#f6f2ea', '#f4e1a6', '#f2c6b4', '#bfd9e8'],
    melody: [0, 2, 4, 4, 5, 4, 2, 0, 2, 4, 5, 7, 5, 4, 2, 4, 0, 2, 4, 7, 9, 7, 5, 4, 2, 4, 2, 1, 0, 1, 2, 0],
  },
  {
    id: 'lotus-tower',
    name: 'Lotus Tower Spiral',
    kicker: 'around the lotus bud',
    poem: 'Round and up the purple stem, the whole city a painted map',
    style: 'lotus',
    root: 65,
    scale: 'major',
    bpm: 100,
    walls: ['#f6f2ea'],
    melody: [0, 4, 7, 9, 7, 4, 2, 4, 5, 9, 7, 5, 4, 2, 4, 7, 9, 11, 9, 7, 5, 4, 5, 7, 4, 2, 0, 2, 4, 2, 1, 0],
  },
  {
    id: 'sigiriya',
    name: 'Sigiriya Lion Rock',
    kicker: 'the fortress in the sky',
    poem: 'Past the lion’s paws and the painted maidens, up to the palace of clouds',
    style: 'sigiriya',
    root: 57,
    scale: 'minor',
    bpm: 92,
    walls: ['#b8603a'],
    melody: [0, 2, 3, 5, 7, 5, 3, 2, 0, 3, 5, 7, 8, 7, 5, 3, 7, 8, 10, 8, 7, 5, 3, 5, 3, 2, 0, 2, 3, 2, 0, 0],
  },
  {
    id: 'ella-tea',
    name: 'Ella Tea Hills',
    kicker: 'green rows to the horizon',
    poem: 'Every hill combed into stripes; the mist smells of tea',
    style: 'tea',
    root: 67,
    scale: 'major',
    bpm: 88,
    walls: ['#f6f2ea', '#f2c6b4'],
    melody: [4, 2, 0, 2, 4, 5, 4, 2, 0, 2, 4, 7, 5, 4, 2, 1, 2, 4, 5, 7, 9, 7, 5, 4, 5, 4, 2, 4, 2, 1, 0, 0],
  },
  {
    id: 'nine-arch',
    name: 'Nine Arch Bridge',
    kicker: 'mind the blue train',
    poem: 'Nine stone arches, one little train, and you racing it home',
    style: 'ninearch',
    root: 62,
    scale: 'major',
    bpm: 104,
    walls: ['#8e7e70'],
    melody: [0, 0, 4, 4, 7, 7, 4, 4, 5, 5, 9, 9, 7, 7, 4, 2, 0, 4, 7, 11, 9, 7, 5, 4, 2, 4, 5, 4, 2, 1, 0, 0],
  },
  {
    id: 'mirissa',
    name: 'Mirissa Palms',
    kicker: 'down to the sea',
    poem: 'Coconut hill, outrigger sails, and a whale waving goodbye',
    style: 'beach',
    root: 60,
    scale: 'major',
    bpm: 90,
    walls: ['#f6eedc', '#bfd9e8', '#f4e1a6'],
    melody: [7, 5, 4, 2, 4, 5, 4, 2, 0, 2, 4, 2, 0, -1, 0, 2, 4, 5, 7, 9, 7, 5, 4, 2, 4, 2, 0, 2, 1, -1, 0, 0],
  },
];

/**
 * Chapter 2 · "Serendib" — a painted Sri Lanka: the Colombo seafront, a
 * helix around the Lotus Tower, a gallery road around Sigiriya, Ella's tea
 * hills, the Nine Arch Bridge (with a train) and the Mirissa coast.
 */
export const SERENDIB: ChapterDef = {
  id: 'serendib',
  name: 'Serendib',
  kicker: 'chapter two',
  blurb: 'Lotus Tower, Sigiriya, Ella and the Nine Arch Bridge — the island, painted.',
  districts: DISTRICTS,
  startPreset: 'golden',
  unlockPhrases: 0,
  background: serendibBackground,
  buildRoute() {
    const b = new TrackBuilder(new THREE.Vector3(0, 10, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), 13);

    // 0 · Galle Face Green — a palm promenade along the sea.
    b.setDistrict(0).setPaving(Paving.Asphalt);
    b.straight(40, { plaza: 10 });
    b.straight(120);
    b.turn(-14, 300);
    b.straight(140);
    b.straight(40, { plaza: 0 });

    // 1 · Lotus Tower — two climbing turns around the tower.
    b.setDistrict(1).setPaving(Paving.Slabs);
    b.turn(40, 90);
    b.roll(-14, 30);
    b.segment({ length: Math.PI * 2 * 58 * 2, yawWorld: 720, rise: 92 });
    b.roll(14, 30);
    b.straight(60);

    // 2 · Sigiriya — glide down across the jungle, then a gallery around the rock.
    b.setDistrict(2).setPaving(Paving.Cobbles);
    b.pitch(-18, 120);
    b.straight(120);
    b.pitch(18, 120);
    b.level(50);
    b.roll(12, 30);
    b.segment({ length: Math.PI * 2 * 58 * 1.25, yawWorld: -450, rise: 48 });
    b.roll(-12, 30);
    b.straight(50);

    // 3 · Ella — winding red roads down through the tea terraces.
    b.setDistrict(3).setPaving(Paving.Earth);
    b.pitch(-5, 150);
    b.turn(45, 90, { rise: -6 });
    b.straight(40, { rise: -4 });
    b.turn(-70, 90, { rise: -8 });
    b.straight(40, { rise: -4 });
    b.turn(55, 90, { rise: -8 });
    b.pitch(5, 150);
    b.straight(40);

    // 4 · Nine Arch Bridge — a straight run over the arches, rails in the road.
    b.setDistrict(4).setPaving(Paving.Stone).setRails(true);
    b.level(40);
    b.straight(290);
    b.setRails(false);
    b.turn(35, 120, { width: 13 });

    // 5 · Mirissa — down the coast to the boardwalk.
    b.setDistrict(5).setPaving(Paving.Asphalt);
    b.pitch(-10, 180);
    b.straight(160);
    b.pitch(10, 180);
    b.turn(-30, 200);
    b.setPaving(Paving.Planks);
    b.straight(140, { plaza: 6 });
    b.straight(40, { plaza: 0 });
    return b.build();
  },
};

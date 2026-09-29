import * as THREE from 'three';
import { TrackBuilder } from '../../road/TrackBuilder';
import { Paving } from '../../road/RoadPath';
import type { DistrictDef } from '../Districts';
import type { ChapterDef } from '../Chapters';
import { germanyBackground } from '../dress/germany';

// 48-step tunes: Berlin techno, a Hanseatic sea shanty, a chorale for the
// cathedral, Rhine romanticism, Bavarian oompah and an Alpine ländler.
const DISTRICTS: DistrictDef[] = [
  {
    id: 'berlin',
    name: 'Berlin',
    kicker: 'the grand tour · germany',
    poem: 'Through the Brandenburg Gate, past the glass dome, under the tower that sees the whole city',
    style: 'berlin',
    root: 57,
    scale: 'minor',
    bpm: 128,
    walls: ['#d8c8a0'],
    // A driving techno riff.
    melody: [0, 0, 7, 0, 3, 0, 7, 5, 0, 0, 7, 0, 3, 5, 3, 2, 0, 0, 7, 0, 10, 7, 5, 3, 5, 3, 2, 0, -2, 0, 2, 3, 7, 7, 10, 12, 10, 7, 5, 3, 2, 3, 5, 3, 2, 0, 0, 0],
    preset: 'morning',
  },
  {
    id: 'hamburg',
    name: 'Hamburg',
    kicker: 'the harbour city',
    poem: 'Red-brick warehouses stand in the canals; the new concert hall rides the old one like a wave',
    style: 'hamburg',
    root: 62,
    scale: 'major',
    bpm: 108,
    walls: ['#a8503a'],
    // A Hanseatic sea shanty.
    melody: [0, 0, 4, 4, 5, 4, 2, 0, 1, 1, 5, 5, 4, 2, 1, -1, 0, 0, 4, 7, 9, 7, 5, 4, 5, 4, 2, 0, 1, -1, 0, 0, 7, 7, 9, 7, 5, 4, 5, 4, 2, 0, 1, 2, 1, -1, 0, 0],
    weather: 'cloudy',
  },
  {
    id: 'autobahn',
    name: 'The Autobahn',
    kicker: 'no speed limit',
    poem: 'Open road between the wind farms; the boost pads are lined up for you, go on',
    style: 'autobahn',
    root: 64,
    scale: 'major',
    bpm: 140,
    walls: ['#f0e8d4'],
    // Motorik krautrock: steady, forward, hypnotic.
    melody: [0, 4, 7, 4, 0, 4, 7, 9, 7, 4, 0, 4, 2, 5, 9, 5, 0, 4, 7, 4, 0, 4, 7, 11, 12, 11, 7, 4, 5, 4, 2, 0, 0, 4, 7, 9, 12, 9, 7, 4, 5, 7, 5, 4, 2, 4, 0, 0],
    preset: 'noon',
  },
  {
    id: 'cologne',
    name: 'Cologne',
    kicker: 'the cathedral on the rhine',
    poem: 'Two black spires as tall as a hill, and the Rhine rolling past underneath',
    style: 'cologne',
    root: 60,
    scale: 'major',
    bpm: 76,
    walls: ['#f4ead0'],
    // A Bach-like chorale.
    melody: [0, 0, 2, 4, 4, 2, 4, 5, 4, 2, 1, 0, 1, 2, 1, -1, 0, 2, 4, 5, 7, 5, 4, 2, 4, 5, 4, 2, 0, -1, 0, 0, 7, 7, 5, 4, 2, 4, 5, 4, 2, 1, 0, 1, -1, -1, 0, 0],
    weather: 'cloudy',
  },
  {
    id: 'rhine',
    name: 'The Rhine Valley',
    kicker: 'castles and vineyards',
    poem: 'A castle on every crag, vines to the water, and the Loreley singing from her rock',
    style: 'rhine',
    root: 65,
    scale: 'major',
    bpm: 88,
    walls: ['#e8dcc0'],
    // A romantic Lied in 6/8.
    melody: [0, 2, 4, 4, 2, 4, 5, 4, 2, 1, 2, 0, 4, 5, 7, 7, 5, 4, 5, 4, 2, 1, 2, 4, 0, 2, 4, 4, 2, 4, 7, 5, 4, 2, 1, 2, 4, 5, 7, 9, 7, 5, 4, 2, 1, 0, 0, 0],
    preset: 'golden',
  },
  {
    id: 'rothenburg',
    name: 'Rothenburg',
    kicker: 'the storybook town',
    poem: 'Crooked timbered houses lean together over cobbles, every window full of flowers',
    style: 'rothenburg',
    root: 67,
    scale: 'major',
    bpm: 104,
    walls: ['#f4ead0'],
    // A music-box tune.
    melody: [0, 4, 7, 12, 11, 7, 9, 7, 5, 4, 2, 4, 5, 4, 2, 0, 4, 7, 9, 11, 12, 11, 9, 7, 9, 7, 5, 4, 2, 4, 2, 0, 0, 4, 7, 12, 14, 12, 11, 9, 7, 5, 4, 2, 4, 2, 0, 0],
  },
  {
    id: 'blackforest',
    name: 'The Black Forest',
    kicker: 'firs and cuckoo clocks',
    poem: 'Dark firs close over the road; somewhere in the trees a cuckoo keeps the time',
    style: 'blackforest',
    root: 62,
    scale: 'minor',
    bpm: 92,
    walls: ['#f0e8d4'],
    // A folk tale in a minor key, with a cuckoo call (a falling third).
    melody: [4, 2, 0, 2, 4, 2, 0, 0, 3, 2, 0, -2, 0, 2, 4, 2, 4, 2, 4, 2, 5, 4, 3, 2, 0, 2, 3, 4, 3, 2, 0, -2, 7, 5, 4, 5, 7, 5, 4, 3, 2, 0, 4, 2, 4, 2, 0, 0],
    weather: 'fog',
  },
  {
    id: 'munich',
    name: 'Munich',
    kicker: 'oktoberfest',
    poem: 'Blue-and-white tents, brass bands, a maypole and two onion domes over the old town',
    style: 'munich',
    root: 65,
    scale: 'major',
    bpm: 132,
    walls: ['#f4ead0'],
    // Oompah!
    melody: [0, 4, 7, 4, 0, 4, 7, 4, 1, 4, 6, 4, 1, 4, 6, 4, 0, 4, 7, 9, 7, 4, 2, 4, 1, 4, 6, 4, 0, 2, 0, 0, 7, 9, 11, 12, 11, 9, 7, 5, 4, 5, 7, 5, 4, 2, 0, 0],
    preset: 'golden',
  },
  {
    id: 'neuschwanstein',
    name: 'Neuschwanstein',
    kicker: 'the fairytale castle',
    poem: 'White towers on a crag above the forest, like a castle from a storybook, because it is one',
    style: 'neuschwanstein',
    root: 64,
    scale: 'lydian',
    bpm: 72,
    walls: ['#f0ece4'],
    // Wagnerian and dreamy.
    melody: [0, 4, 7, 11, 9, 7, 6, 7, 4, 6, 7, 9, 11, 12, 11, 9, 7, 9, 11, 12, 14, 12, 11, 9, 7, 6, 4, 6, 7, 4, 2, 0, 4, 6, 7, 9, 11, 9, 7, 6, 4, 2, 0, 2, 4, 2, 0, 0],
    preset: 'dusk',
  },
  {
    id: 'alps',
    name: 'The Bavarian Alps',
    kicker: 'the zugspitze · the end of the road',
    poem: 'Cowbells on the meadows, flowers on every balcony, and the highest peak in Germany ahead',
    style: 'alps',
    root: 67,
    scale: 'major',
    bpm: 116,
    walls: ['#f4efe4'],
    // A yodelling ländler.
    melody: [0, 4, 7, 12, 11, 7, 4, 7, 5, 9, 12, 9, 7, 5, 4, 2, 0, 4, 7, 12, 14, 12, 11, 9, 7, 9, 7, 5, 4, 2, 0, 0, 7, 12, 11, 12, 14, 12, 9, 7, 5, 4, 5, 7, 4, 2, 0, 0],
    preset: 'morning',
  },
];

/**
 * Grand Tour · "Germany" — about ten kilometres from Berlin to the Alps:
 * Hamburg, the Autobahn, Cologne, the Rhine, Rothenburg, the Black Forest,
 * Munich and Neuschwanstein.
 */
export const GERMANY: ChapterDef = {
  id: 'germany',
  book: 2,
  flag: '🇩🇪',
  name: 'Germany',
  kicker: 'grand tour',
  blurb: 'Ten kilometres from Berlin to the Alps: the Brandenburg Gate, Hamburg’s warehouses, a flat-out Autobahn, Cologne Cathedral, Rhine castles, a storybook town, the Black Forest, Oktoberfest and Neuschwanstein.',
  districts: DISTRICTS,
  startPreset: 'morning',
  unlockPhrases: 0,
  background: germanyBackground,
  buildRoute() {
    const b = new TrackBuilder(new THREE.Vector3(0, 6, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), 14);

    // 0 · Berlin — Unter den Linden through the gate.
    b.setDistrict(0).setPaving(Paving.Slabs);
    b.straight(360, { width: 14 });
    b.turn(-60, 160);
    b.straight(220);
    b.turn(60, 160);
    b.straight(180);
    b.level(20);

    // 1 · Hamburg — between the warehouses on the canals, then the Elbe.
    b.setDistrict(1).setPaving(Paving.Cobbles);
    b.turn(40, 200, { width: 10 });
    b.straight(260);
    b.turn(-40, 200);
    b.straight(300);
    b.level(20);

    // 2 · The Autobahn — long, straight and wide.
    b.setDistrict(2).setPaving(Paving.Asphalt);
    b.straight(500, { width: 16 });
    b.turn(-15, 800);
    b.straight(400);
    b.level(20);

    // 3 · Cologne — into the old town and along the Rhine.
    b.setDistrict(3).setPaving(Paving.Cobbles);
    b.turn(40, 200, { width: 11 });
    b.straight(200);
    b.turn(-25, 300);
    b.straight(280);
    b.level(20);

    // 4 · The Rhine Valley — the river road under the castles.
    b.setDistrict(4).setPaving(Paving.Asphalt);
    b.turn(-30, 300, { width: 10 });
    b.straight(220);
    b.turn(40, 300);
    b.straight(200);
    b.turn(-20, 400);
    b.straight(160);
    b.level(20);

    // 5 · Rothenburg — a twisting lane between the timbered houses.
    b.setDistrict(5).setPaving(Paving.Cobbles);
    b.straight(180, { width: 9 });
    b.turn(70, 70);
    b.straight(140);
    b.turn(-70, 70);
    b.straight(200);
    b.turn(20, 200);
    b.level(20);

    // 6 · The Black Forest — up and down through the firs.
    b.setDistrict(6).setPaving(Paving.Asphalt);
    b.turn(-40, 220, { width: 9 });
    b.pitch(5, 120);
    b.straight(100);
    b.pitch(-10, 120);
    b.straight(100);
    b.pitch(5, 120);
    b.turn(50, 220);
    b.straight(160);
    b.level(20);

    // 7 · Munich — past the Wiesn and into the old town.
    b.setDistrict(7).setPaving(Paving.Slabs);
    b.turn(-20, 300, { width: 13 });
    b.straight(320);
    b.turn(30, 300);
    b.straight(240);
    b.level(20);

    // 8 · Neuschwanstein — the forest road beneath the castle.
    b.setDistrict(8).setPaving(Paving.Asphalt);
    b.turn(-40, 250, { width: 9 });
    b.straight(260);
    b.turn(50, 250);
    b.straight(220);
    b.level(20);

    // 9 · The Alps — over the meadows toward the Zugspitze.
    b.setDistrict(9).setPaving(Paving.Asphalt);
    b.turn(-30, 300, { width: 10 });
    b.pitch(4, 120);
    b.straight(100);
    b.pitch(-8, 120);
    b.straight(100);
    b.pitch(4, 120);
    b.turn(30, 300);
    b.straight(260);
    return b.build();
  },
};

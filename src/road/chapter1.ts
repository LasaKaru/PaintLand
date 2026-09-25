import * as THREE from 'three';
import { TrackBuilder } from './TrackBuilder';
import type { RoadPath } from './RoadPath';

/** Height of the start street above the sea. */
export const START_HEIGHT = 12;

/**
 * Chapter 1 route. Each block is one district (docs/04 §3). The road starts
 * on a pier street, climbs a tower, runs across a ceiling, twists, drops,
 * spirals over the sea, loops and ties a bow back toward the page.
 */
export function buildChapter1(): RoadPath {
  const b = new TrackBuilder(new THREE.Vector3(0, START_HEIGHT, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), 12);

  // 0 · Biscuit Row — straight town street on a pier, tram rails, wide plazas.
  b.setDistrict(0).setRails(true);
  b.straight(40, { plaza: 16 });
  b.straight(70);
  b.turn(12, 260);
  b.straight(70);
  b.turn(-12, 260);
  b.straight(40);
  b.straight(30, { plaza: 0 });

  // 1 · Mustard Tower — quarter-pipe up the face of a yellow tower.
  b.setDistrict(1).setRails(false);
  b.straight(12);
  b.pitch(90, 40);
  b.straight(100);

  // 2 · Topsy Terrace — over the top and along the ceiling, upside down.
  b.setDistrict(2);
  b.pitch(90, 40);
  b.straight(170, { width: 14 });

  // 3 · Petal Twist — a half-roll back upright, then a full corkscrew.
  b.setDistrict(3);
  b.roll(180, 110, { width: 12 });
  b.straight(20);
  b.roll(360, 190);
  b.straight(25);

  // 4 · The Inkfall — plunge between water chutes.
  b.setDistrict(4);
  b.pitch(-60, 60);
  b.straight(110);
  b.pitch(60, 60);
  b.straight(30);

  // 5 · Citrus Coil — banked spiral over the sea, climbing gently.
  b.setDistrict(5);
  b.turn(-40, 120);
  b.roll(-16, 30);
  b.segment({ length: Math.PI * 2 * 75 * 1.5, yawWorld: 540, rise: 40 });
  b.roll(16, 30);
  b.straight(40);

  // 6 · Doorway Loop — a full vertical loop.
  b.setDistrict(6);
  b.straight(50);
  b.loop(38, 26);
  b.straight(50);

  // 7 · Ribbon Gate — a slow full twist, then a gentle glide to the finish.
  b.setDistrict(7);
  b.roll(360, 220);
  b.straight(30);
  b.pitch(-12, 120);
  b.straight(90);
  b.pitch(12, 120);
  b.straight(60);

  return b.build();
}

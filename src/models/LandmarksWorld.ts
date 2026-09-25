import * as THREE from 'three';
import { ModelKit, Pattern } from './ModelKit';
import { Random } from '../core/Random';
import { archWall } from './LandmarksSriLanka';

const INK = '#2b2622';

/**
 * World wonders for Chapter 3 · Wonders of the Sketchbook. Stylised painted
 * versions sized for driving past and around, not survey-accurate replicas.
 */

/** One Great Wall merlon (instanced along both edges of the road). */
export function buildMerlon(): THREE.BufferGeometry {
  return new ModelKit().box(0.9, 1.1, 0.5, '#b5a384', { position: [0, 0.55, 0], pattern: Pattern.Stone }).build(0.02, 1);
}

/** Great Wall watchtower that straddles the road: two side blocks and a roofed bridge with an arch. */
export function buildWatchtower(roadHalf: number): THREE.BufferGeometry {
  const k = new ModelKit();
  const w = roadHalf * 2 + 8;
  k.box(4, 9, 10, '#bfae8e', { position: [-(roadHalf + 2), 4.5, 0], pattern: Pattern.Stone });
  k.box(4, 9, 10, '#bfae8e', { position: [roadHalf + 2, 4.5, 0], pattern: Pattern.Stone });
  k.box(w, 3, 10, '#bfae8e', { position: [0, 10.5, 0], pattern: Pattern.Stone });
  for (let i = 0; i < 9; i++) k.box(1, 1.2, 1, '#b5a384', { position: [-w / 2 + 0.5 + i * ((w - 1) / 8), 12.6, 4.5], pattern: Pattern.Stone });
  for (let i = 0; i < 9; i++) k.box(1, 1.2, 1, '#b5a384', { position: [-w / 2 + 0.5 + i * ((w - 1) / 8), 12.6, -4.5], pattern: Pattern.Stone });
  for (const z of [-5.05, 5.05]) for (const x of [-(roadHalf + 2), roadHalf + 2]) k.box(1, 1.6, 0.1, '#2b2622', { position: [x, 6, z] });
  k.add(new THREE.ConeGeometry(6, 3.5, 4), '#6a4a3a', { position: [0, 14.8, 0], rotation: [0, Math.PI / 4, 0], scale: [w / 8.5, 1, 1.2], pattern: Pattern.RoofTiles });
  k.box(2, 1, 0.2, '#d8463a', { position: [0, 9, 5.1] });
  return k.build(0.04, 7);
}

/** The Colosseum: an elliptical ring of arched tiers, a broken side, seating and an arena. */
export function buildColosseum(a = 64, b = 55): THREE.BufferGeometry {
  const k = new ModelKit();
  const segments = 56;
  const tiers = [
    { h: 10, arch: true },
    { h: 9, arch: true },
    { h: 9, arch: true },
    { h: 8, arch: false },
  ];
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const t2 = ((i + 1) / segments) * Math.PI * 2;
    const x = Math.cos((t + t2) / 2) * a;
    const z = Math.sin((t + t2) / 2) * b;
    const seg = Math.hypot(Math.cos(t2) * a - Math.cos(t) * a, Math.sin(t2) * b - Math.sin(t) * b);
    const tangentAngle = Math.atan2(Math.sin(t2) * b - Math.sin(t) * b, Math.cos(t2) * a - Math.cos(t) * a);
    // A broken quarter on the south-east side keeps only the lower tiers.
    const broken = i > segments * 0.58 && i < segments * 0.8;
    let y = 0;
    tiers.forEach((tier, ti) => {
      if (broken && ti >= 2 + (i % 3 === 0 ? 1 : 0)) return;
      const geo = tier.arch ? archWall(seg + 0.1, tier.h, 3, 1, seg * 0.55, tier.h * 0.8, ti === 0 ? 0 : 1) : new THREE.BoxGeometry(seg + 0.1, tier.h, 3).translate(0, tier.h / 2, 0);
      k.add(geo, ti % 2 ? '#d9c8a8' : '#e2d2b2', { position: [x, y, z], rotation: [0, -tangentAngle, 0], pattern: Pattern.Stone });
      k.box(seg + 0.2, 0.5, 3.4, '#cdbb98', { position: [x, y + tier.h, z], rotation: [0, -tangentAngle, 0] });
      if (tier.arch) k.box(0.8, tier.h, 0.6, '#cdbb98', { position: [x + Math.cos(tangentAngle) * seg * 0.5, y + tier.h / 2, z - Math.sin(tangentAngle) * seg * 0.5], rotation: [0, -tangentAngle, 0] });
      else if (i % 2 === 0) k.box(1.2, 1.4, 0.2, '#6a5a4a', { position: [x + Math.cos(tangentAngle + Math.PI / 2) * 1.6, y + tier.h * 0.5, z + Math.sin(tangentAngle + Math.PI / 2) * 1.6] });
      y += tier.h;
    });
  }
  // Seating: stepped rings rising from the arena wall to the top of tier two.
  for (let r = 0; r < 7; r++) {
    const f = 0.62 + r * 0.05;
    const seat = new THREE.CylinderGeometry(1, 1, 3, 48, 1, true);
    k.add(seat, r % 2 ? '#d2c2a2' : '#c8b898', { position: [0, 4 + r * 3.2, 0], scale: [a * f, 1, b * f], pattern: Pattern.Stone });
    k.add(new THREE.RingGeometry(0.93, 1.0, 48, 1).rotateX(-Math.PI / 2), '#d8c8a8', { position: [0, 5.5 + r * 3.2, 0], scale: [a * f, 1, b * f] });
  }
  // Arena floor with the hypogeum walls peeking through.
  k.add(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), '#e8d2a0', { position: [0, 0.3, 0], scale: [a * 0.6, 1, b * 0.6], pattern: Pattern.Grass });
  for (let i = -3; i <= 3; i++) k.box(a * 0.9, 2, 0.8, '#b9a888', { position: [0, 1, i * 5], pattern: Pattern.Stone });
  return k.build(0.06, 13);
}

/** The Taj Mahal: plinth, main hall with iwans, onion dome, chhatris and four minarets. */
export function buildTajMahal(): THREE.BufferGeometry {
  const k = new ModelKit();
  const MARBLE = '#f6f2ea';
  // Red sandstone base and marble plinth.
  k.box(110, 3, 110, '#c8704a', { position: [0, 1.5, 0], pattern: Pattern.Stone });
  k.box(68, 6, 68, MARBLE, { position: [0, 6, 0], pattern: Pattern.Marble });
  // Main hall: an octagon-ish block.
  k.cylinder(26, 26, 26, 8, MARBLE, { position: [0, 22, 0], rotation: [0, Math.PI / 8, 0], pattern: Pattern.Marble });
  // Iwans: tall recessed arches on four faces, with dark insets and inlay frames.
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const x = Math.sin(ang) * 24.2;
    const z = Math.cos(ang) * 24.2;
    k.add(archWall(18, 24, 1.2, 1, 11, 20), MARBLE, { position: [x, 9, z], rotation: [0, ang, 0], pattern: Pattern.Marble });
    k.box(10.6, 15, 0.4, '#8a90b0', { position: [Math.sin(ang) * 23.4, 16.5, Math.cos(ang) * 23.4], rotation: [0, ang, 0] });
    k.box(18.6, 0.6, 1.4, '#c9b27a', { position: [Math.sin(ang) * 24.4, 33.2, Math.cos(ang) * 24.4], rotation: [0, ang, 0] });
    for (const s of [-1, 1]) k.box(4, 7, 0.3, '#9aa0c0', { position: [x + Math.cos(ang) * s * 13, 14, z - Math.sin(ang) * s * 13], rotation: [0, ang, 0] });
  }
  // Drum and onion dome.
  k.cylinder(13, 13, 8, 20, MARBLE, { position: [0, 39, 0], pattern: Pattern.Marble });
  const dome = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.01, 0),
      new THREE.Vector2(13.5, 0),
      new THREE.Vector2(16.5, 6),
      new THREE.Vector2(17, 12),
      new THREE.Vector2(14.5, 19),
      new THREE.Vector2(9, 25),
      new THREE.Vector2(3, 29.5),
      new THREE.Vector2(0.01, 31),
    ],
    24,
  );
  k.add(dome, MARBLE, { position: [0, 43, 0], pattern: Pattern.Marble });
  k.cylinder(0.3, 0.9, 8, 8, '#e8c872', { position: [0, 78, 0] });
  k.blob(0.9, '#e8c872', { position: [0, 82.5, 0], detail: 0 });
  // Four chhatris on the roof corners.
  for (const [x, z] of [[-16, -16], [16, -16], [-16, 16], [16, 16]]) {
    for (const [dx, dz] of [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]]) k.cylinder(0.5, 0.5, 6, 6, MARBLE, { position: [x + dx, 38, z + dz] });
    k.box(7, 0.8, 7, MARBLE, { position: [x, 41.4, z] });
    k.add(new THREE.SphereGeometry(4, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), MARBLE, { position: [x, 41.8, z], scale: [1, 1.3, 1] });
    k.cylinder(0.15, 0.4, 2.5, 6, '#e8c872', { position: [x, 48, z] });
  }
  // Minarets at the plinth corners.
  for (const [x, z] of [[-31, -31], [31, -31], [-31, 31], [31, 31]]) {
    k.cylinder(2.2, 3, 44, 12, MARBLE, { position: [x, 31, z], pattern: Pattern.Marble });
    for (const y of [20, 34, 48]) k.cylinder(3.8, 3.2, 1, 12, MARBLE, { position: [x, y, z] });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      k.cylinder(0.2, 0.2, 3, 4, MARBLE, { position: [x + Math.cos(a) * 2, 55, z + Math.sin(a) * 2] });
    }
    k.add(new THREE.SphereGeometry(2.6, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), MARBLE, { position: [x, 56.5, z], scale: [1, 1.3, 1] });
    k.cylinder(0.1, 0.3, 2, 6, '#e8c872', { position: [x, 60.7, z] });
  }
  return k.build(0.05, 17);
}

/** Taj garden: reflecting pool, walkways and rows of cypresses. Long axis along Z (+Z toward the Taj). */
export function buildMughalGarden(length: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(56, 1, length, '#8cc63f', { position: [0, 0.5, 0], pattern: Pattern.Grass });
  k.box(8, 1.2, length, '#e9dcc4', { position: [0, 0.6, 0], pattern: Pattern.Stone });
  k.box(5, 1.3, length - 4, '#6fd0d0', { position: [0, 0.65, 0] });
  k.box(56, 1.2, 8, '#e9dcc4', { position: [0, 0.6, 0], pattern: Pattern.Stone });
  for (let z = -length / 2 + 6; z < length / 2 - 4; z += 9) {
    for (const x of [-9, 9]) {
      k.cylinder(0.3, 0.4, 2, 5, '#7a4a2a', { position: [x, 2, z] });
      k.blob(1, '#3f8f45', { position: [x, 7, z], scale: [1.6, 5, 1.6], detail: 1, roughness: 0.1, pattern: Pattern.Leaves });
    }
  }
  // Red sandstone gate at the far end.
  k.add(archWall(40, 26, 10, 1, 12, 20), '#c8704a', { position: [0, 1, -length / 2 - 5], pattern: Pattern.Stone });
  k.box(40, 4, 10, '#b8603a', { position: [0, 29, -length / 2 - 5] });
  for (let i = 0; i < 11; i++) k.add(new THREE.SphereGeometry(1.4, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), '#f6f2ea', { position: [-15 + i * 3, 31, -length / 2 - 1] });
  return k.build(0.04, 19);
}

/** Inca stone hut with a thatched roof. */
export function buildIncaHut(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const w = rnd.range(4, 6);
  const d = rnd.range(3.5, 5);
  k.box(w, 2.6, d, '#a6a3b0', { position: [0, 1.3, 0], pattern: Pattern.Stone });
  k.box(0.9, 1.6, 0.2, INK, { position: [0, 0.9, d / 2 + 0.01] });
  k.add(new THREE.ConeGeometry(1, 1, 4), '#c8a860', { position: [0, 4, 0], rotation: [0, Math.PI / 4, 0], scale: [w * 0.8, 3, d * 0.8], pattern: Pattern.Thatch });
  return k.build(0.08, rnd.int(0, 99));
}

/** A curved farming terrace: stone retaining wall topped with grass. Arc in XZ around the origin. */
export function buildTerrace(radius: number, arc: number, height: number): THREE.BufferGeometry {
  const k = new ModelKit();
  const n = Math.max(3, Math.round((radius * arc) / 6));
  for (let i = 0; i < n; i++) {
    const a = -arc / 2 + (arc / n) * (i + 0.5);
    const seg = (radius * arc) / n + 0.2;
    k.box(seg, height, 3, '#a6a3b0', { position: [Math.sin(a) * radius, height / 2, Math.cos(a) * radius], rotation: [0, a, 0], pattern: Pattern.Stone });
    k.box(seg, 0.4, 5, '#8cc63f', { position: [Math.sin(a) * (radius - 1), height + 0.1, Math.cos(a) * (radius - 1)], rotation: [0, a, 0], pattern: Pattern.Grass });
  }
  return k.build(0.05, Math.round(radius));
}

/** Llama. Faces -Z. */
export function buildLlama(colour: string): THREE.BufferGeometry {
  const k = new ModelKit();
  k.blob(0.55, colour, { position: [0, 1.1, 0], scale: [0.8, 0.8, 1.3], detail: 1, roughness: 0.15 });
  k.cylinder(0.16, 0.2, 1.1, 6, colour, { position: [0, 1.75, -0.55], rotation: [0.25, 0, 0] });
  k.blob(0.22, colour, { position: [0, 2.35, -0.7], scale: [0.9, 0.9, 1.4], detail: 1, roughness: 0.1 });
  for (const s of [-1, 1]) k.add(new THREE.ConeGeometry(0.05, 0.25, 4), colour, { position: [s * 0.1, 2.6, -0.62] });
  for (const [x, z] of [[-0.25, -0.4], [0.25, -0.4], [-0.25, 0.4], [0.25, 0.4]]) k.cylinder(0.07, 0.07, 0.8, 5, colour, { position: [x, 0.4, z] });
  k.box(0.7, 0.1, 0.6, '#d8463a', { position: [0, 1.55, 0.05] });
  return k.build(0.01, 3);
}

/** Christ the Redeemer on a pedestal: robe, outstretched arms, head. ~38 m including pedestal. */
export function buildRedeemer(): THREE.BufferGeometry {
  const k = new ModelKit();
  const SOAP = '#e8e4dc';
  k.box(10, 8, 10, '#d8d0c0', { position: [0, 4, 0], pattern: Pattern.Stone });
  k.box(8, 1, 8, SOAP, { position: [0, 8.5, 0] });
  const robe = new THREE.LatheGeometry(
    [new THREE.Vector2(3.4, 0), new THREE.Vector2(3.0, 6), new THREE.Vector2(2.6, 14), new THREE.Vector2(2.9, 20), new THREE.Vector2(3.2, 23), new THREE.Vector2(1.4, 24.5), new THREE.Vector2(0.01, 24.6)],
    12,
  );
  k.add(robe, SOAP, { position: [0, 9, 0], scale: [1, 1, 0.72], pattern: Pattern.Marble });
  // Arms: a long tapered beam with hands.
  k.box(28, 2.2, 1.9, SOAP, { position: [0, 29.5, 0], pattern: Pattern.Marble });
  k.box(3.2, 3.6, 2.2, SOAP, { position: [0, 29, 0] });
  for (const s of [-1, 1]) {
    k.box(1.4, 2.4, 1.2, SOAP, { position: [s * 14.6, 29.2, 0] });
    k.box(9, 1.4, 1.6, '#dcd6cc', { position: [s * 9, 28.4, 0.2] });
  }
  k.cylinder(0.9, 1.1, 2, 8, SOAP, { position: [0, 33.4, 0] });
  k.blob(1.9, SOAP, { position: [0, 35.8, 0], scale: [0.9, 1.15, 0.95], detail: 1, roughness: 0.02 });
  k.blob(1.95, '#d8d0c0', { position: [0, 36.6, 0.3], scale: [0.95, 0.7, 0.9], detail: 1, roughness: 0.04 });
  return k.build(0.03, 29);
}

/** El Castillo: nine stepped terraces, four stairways with serpent heads, a temple on top. Stair faces ±Z and ±X. */
export function buildChichenItza(base = 58, height = 26): THREE.BufferGeometry {
  const k = new ModelKit();
  const LIME = '#cfc5a8';
  const steps = 9;
  const top = base * 0.34;
  for (let i = 0; i < steps; i++) {
    const w = base - ((base - top) * i) / steps;
    const h = height / steps;
    k.box(w, h * 0.72, w, i % 2 ? LIME : '#c6bc9e', { position: [0, h * i + h * 0.36, 0], pattern: Pattern.Stone });
    k.box(w - 1.2, h * 0.3, w - 1.2, '#b8ae90', { position: [0, h * i + h * 0.87, 0], pattern: Pattern.Stone });
  }
  // Four stairways.
  const run = (base - top) / 2;
  const len = Math.hypot(run, height);
  for (let i = 0; i < 4; i++) {
    const yaw = (i / 4) * Math.PI * 2;
    const c = (base + top) / 4;
    const x = Math.sin(yaw) * c;
    const z = Math.cos(yaw) * c;
    k.box(11, 1, len, '#ddd3b8', { position: [x, height / 2, z], rotation: [0, yaw, 0] });
    for (let s = 0; s < 22; s++) {
      const t = (s + 0.5) / 22;
      k.box(10, 0.5, 0.6, '#b8ae90', { position: [Math.sin(yaw) * (base / 2 - run * t), height * t + 0.3, Math.cos(yaw) * (base / 2 - run * t)], rotation: [0, yaw, 0] });
    }
    for (const side of [-1, 1]) {
      const sx = Math.sin(yaw) * (base / 2 + 1.5) + Math.cos(yaw) * side * 5.5;
      const sz = Math.cos(yaw) * (base / 2 + 1.5) - Math.sin(yaw) * side * 5.5;
      k.blob(1.6, '#a8a088', { position: [sx, 1.2, sz], scale: [1, 0.8, 1.4], rotation: [0, yaw, 0], detail: 1, pattern: Pattern.Stone });
    }
  }
  // Temple on top.
  k.box(top * 0.8, 7, top * 0.8, LIME, { position: [0, height + 3.5, 0], pattern: Pattern.Stone });
  for (let i = 0; i < 4; i++) {
    const yaw = (i / 4) * Math.PI * 2;
    k.box(4, 4.5, 0.3, INK, { position: [Math.sin(yaw) * top * 0.401, height + 2.25, Math.cos(yaw) * top * 0.401], rotation: [0, yaw, 0] });
  }
  k.box(top * 0.9, 1.2, top * 0.9, '#b8ae90', { position: [0, height + 7.6, 0] });
  return k.build(0.05, 37);
}

/** Petra's Treasury façade carved into a sandstone cliff. Façade faces +Z; cliff behind. */
export function buildTreasury(): THREE.BufferGeometry {
  const k = new ModelKit();
  const SAND = '#e0987a';
  const CARVE = '#e8a88a';
  // The cliff it is carved from.
  k.box(90, 70, 30, SAND, { position: [0, 35, -16], pattern: Pattern.Sandstone });
  k.blob(30, SAND, { position: [-40, 55, -12], scale: [1, 1.2, 0.8], detail: 1, roughness: 0.2, pattern: Pattern.Sandstone });
  k.blob(30, SAND, { position: [40, 60, -12], scale: [1, 1.3, 0.8], detail: 1, roughness: 0.2, pattern: Pattern.Sandstone });
  // Lower storey: six columns and a pediment.
  k.box(26, 2, 4, CARVE, { position: [0, 1, 1] });
  for (let i = 0; i < 6; i++) {
    const x = -11 + i * 4.4;
    k.cylinder(0.9, 1, 13, 10, CARVE, { position: [x, 8.5, 1.5] });
    k.box(2.4, 1, 2.4, CARVE, { position: [x, 15.5, 1.5] });
  }
  k.box(26, 3, 3.5, CARVE, { position: [0, 17.5, 1.3], pattern: Pattern.Sandstone });
  const ped = new THREE.Shape();
  ped.moveTo(-10, 0);
  ped.lineTo(10, 0);
  ped.lineTo(0, 5);
  ped.closePath();
  k.add(new THREE.ExtrudeGeometry(ped, { depth: 2, bevelEnabled: false }), CARVE, { position: [0, 19, 0.3] });
  k.box(6, 10, 0.4, '#5a3a3a', { position: [0, 7, -0.2] });
  // Upper storey: broken pediment, tholos with a conical roof and an urn.
  k.box(28, 2, 3, CARVE, { position: [0, 25, 0.5] });
  for (const s of [-1, 1]) {
    for (let i = 0; i < 2; i++) k.cylinder(0.8, 0.9, 12, 10, CARVE, { position: [s * (8 + i * 4), 32, 1] });
    k.box(8, 2.5, 3, CARVE, { position: [s * 10, 39, 0.8] });
    k.add(new THREE.ExtrudeGeometry(halfPed(), { depth: 2, bevelEnabled: false }), CARVE, { position: [s * 10, 40.2, 0], scale: [s, 1, 1] });
  }
  k.cylinder(4.2, 4.2, 12, 14, CARVE, { position: [0, 32, 0] });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI;
    k.cylinder(0.6, 0.6, 12, 8, '#f0b898', { position: [Math.cos(a) * 4.4, 32, Math.sin(a) * 4.4 * 0.5 + 1] });
  }
  k.add(new THREE.ConeGeometry(4.6, 5, 14), CARVE, { position: [0, 40.5, 0] });
  k.blob(1.3, CARVE, { position: [0, 44, 0], scale: [1, 1.4, 1], detail: 1 });
  return k.build(0.06, 43);
}

function halfPed(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(4, 0);
  s.lineTo(0, 2.5);
  s.closePath();
  return s;
}

/** Canyon cliff block for Petra's Siq: a tall sandstone wall with strata. Face toward +Z. */
export function buildCliff(rnd: Random, width: number, height: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(width, height, 14, '#e0987a', { position: [0, height / 2, -7], pattern: Pattern.Sandstone });
  for (let i = 0; i < 5; i++) {
    k.blob(rnd.range(6, 12), rnd.pick(['#e0987a', '#d88a6a', '#e8a88a']), { position: [rnd.range(-width / 2, width / 2), rnd.range(height * 0.3, height), rnd.range(-6, -1)], scale: [1, 1.4, 0.6], detail: 1, roughness: 0.25, seed: i + width, pattern: Pattern.Sandstone });
  }
  return k.build(0.3, rnd.int(0, 999));
}

/** Camel resting. Faces -Z. */
export function buildCamel(): THREE.BufferGeometry {
  const k = new ModelKit();
  const c = '#c8955a';
  k.blob(0.8, c, { position: [0, 1.6, 0], scale: [0.8, 0.7, 1.4], detail: 1, roughness: 0.1 });
  k.blob(0.5, c, { position: [0, 2.3, 0.1], detail: 1, roughness: 0.1 });
  k.cylinder(0.2, 0.25, 1.4, 6, c, { position: [0, 2.2, -1.1], rotation: [0.6, 0, 0] });
  k.blob(0.3, c, { position: [0, 2.8, -1.6], scale: [0.8, 0.8, 1.4], detail: 1 });
  for (const [x, z] of [[-0.35, -0.6], [0.35, -0.6], [-0.35, 0.7], [0.35, 0.7]]) k.cylinder(0.1, 0.1, 1.3, 5, c, { position: [x, 0.65, z] });
  k.box(1.2, 0.2, 1, '#d8463a', { position: [0, 2.05, 0], pattern: Pattern.Planks });
  return k.build(0.01, 5);
}

/** Generic rocky mountain peak for backdrops (Great Wall, Machu Picchu, Rio). */
export function buildPeak(rnd: Random, radius: number, height: number, green = 0.5): THREE.BufferGeometry {
  const k = new ModelKit();
  const g = new THREE.ConeGeometry(radius, height, 9, 4);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = 1 + (Math.sin(v.x * 0.3 + v.z * 0.2) * 0.12 + Math.cos(v.y * 0.25) * 0.08);
    pos.setXYZ(i, v.x * n, v.y, v.z * n);
  }
  k.add(g, '#a6a3b8', { position: [0, height / 2, 0], pattern: Pattern.Stone });
  const trees = Math.round(radius * green * 0.4);
  for (let i = 0; i < trees; i++) {
    const a = rnd.range(0, Math.PI * 2);
    const t = rnd.range(0.05, 0.6);
    k.blob(rnd.range(2, 5), rnd.pick(['#4f9a4a', '#6fae3a', '#5aa84a']), { position: [Math.cos(a) * radius * (1 - t) * 0.95, height * t, Math.sin(a) * radius * (1 - t) * 0.95], detail: 0, seed: i, pattern: Pattern.Leaves });
  }
  return k.build(radius * 0.02, rnd.int(0, 999));
}


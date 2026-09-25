import * as THREE from 'three';
import { ModelKit, Pattern } from './ModelKit';
import { PaintMaterial } from '../render/PaintMaterial';
import { ROVER_TUNING, type VehicleTuning } from '../gameplay/RoverController';

/** Paint scheme and roof load (garage customisation, docs/08 §2). */
export interface VehicleLook {
  body: string;
  trim: string;
  accent: string;
  hubs: string;
  roofLoad: 'gramophone' | 'boombox' | 'flowers' | 'surfboard' | 'none';
}

export type VehicleId = 'rover' | 'tuktuk' | 'coupe' | 'buggy' | 'van' | 'scooter';

interface WheelSpot {
  x: number;
  z: number;
  r: number;
  steer: boolean;
}

export interface VehicleDef {
  id: VehicleId;
  name: string;
  blurb: string;
  price: number;
  /** Differences from the rover's handling; balanced so none is strictly better. */
  tuning: Partial<VehicleTuning>;
  defaultLook: VehicleLook;
  seat: [number, number, number];
  seatPose: 'sit' | 'ride';
  wheels: WheelSpot[];
  roofAt: [number, number, number];
  antennaAt: [number, number, number] | null;
  brakeLights: [number, number, number][];
  headLights: [number, number, number][];
  build(look: VehicleLook): THREE.BufferGeometry;
}

const TYRE = '#2f2a28';
const INK = '#2b2622';
const BRASS = '#d4a943';
const GLASS = '#4a5a7a';

function buildRover(look: VehicleLook): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(2.0, 0.28, 4.1, INK, { position: [0, 0.62, 0] });
  k.box(2.06, 0.62, 4.0, look.body, { position: [0, 1.02, 0], pattern: Pattern.Planks });
  k.box(1.96, 0.22, 1.5, look.body, { position: [0, 1.38, -1.2], rotation: [0.06, 0, 0] });
  k.box(1.9, 0.72, 2.2, look.body, { position: [0, 1.72, 0.55] });
  k.box(1.7, 0.46, 0.06, GLASS, { position: [0, 1.76, -0.57], rotation: [-0.25, 0, 0] });
  k.box(0.05, 0.42, 1.8, GLASS, { position: [-0.96, 1.78, 0.55] });
  k.box(0.05, 0.42, 1.8, GLASS, { position: [0.96, 1.78, 0.55] });
  k.box(2.1, 0.1, 4.05, look.trim, { position: [0, 0.86, 0] });
  k.box(2.1, 0.08, 0.08, INK, { position: [0, 1.2, 0.2] });
  k.box(2.2, 0.3, 0.3, INK, { position: [0, 0.78, -2.12] });
  k.box(2.2, 0.3, 0.3, INK, { position: [0, 0.78, 2.12] });
  for (const [x, z] of [[-1.08, -1.35], [1.08, -1.35], [-1.08, 1.4], [1.08, 1.4]] as const) k.box(0.22, 0.24, 1.35, look.trim, { position: [x, 1.2, z] });
  k.box(2.3, 0.1, 0.62, look.accent, { position: [0, 2.3, 1.85], rotation: [-0.08, 0, 0] });
  for (const x of [-0.7, 0.7]) k.box(0.08, 0.5, 0.28, INK, { position: [x, 2.05, 1.85] });
  for (const x of [-1.15, 1.15]) k.box(0.08, 0.36, 0.7, look.accent, { position: [x, 2.2, 1.85] });
  k.box(1.7, 0.06, 1.9, INK, { position: [0, 2.12, 0.55] });
  for (const x of [-0.85, 0.85]) k.box(0.06, 0.18, 1.9, INK, { position: [x, 2.2, 0.55] });
  k.cylinder(0.42, 0.42, 0.28, 10, TYRE, { position: [0, 1.25, 2.28], rotation: [Math.PI / 2, 0, 0] });
  k.cylinder(0.2, 0.2, 0.3, 8, look.hubs, { position: [0, 1.25, 2.32], rotation: [Math.PI / 2, 0, 0] });
  k.box(0.3, 0.45, 0.2, '#d8463a', { position: [-0.72, 2.4, 1.3] });
  for (const x of [-0.5, -0.17, 0.17, 0.5]) k.cylinder(0.1, 0.1, 0.12, 8, '#fff3c4', { position: [x, 2.22, -0.45], rotation: [Math.PI / 2, 0, 0], nightGlow: 1 });
  k.cylinder(0.07, 0.07, 1.0, 6, INK, { position: [1.02, 1.6, -0.9] });
  for (const x of [-0.55, -0.35]) k.cylinder(0.08, 0.08, 0.3, 8, '#9a9aa4', { position: [x, 0.62, 2.2], rotation: [Math.PI / 2, 0, 0] });
  return k.build(0.025, 3);
}

function buildTukTuk(look: VehicleLook): THREE.BufferGeometry {
  const k = new ModelKit();
  // Rear cab with bench, tapering nose, canvas canopy, fenders.
  k.box(1.5, 0.9, 1.9, look.body, { position: [0, 0.85, 0.45] });
  k.box(1.5, 0.12, 1.95, look.trim, { position: [0, 0.42, 0.45] });
  k.add(new THREE.CylinderGeometry(0.45, 0.72, 1.3, 4, 1).rotateY(Math.PI / 4).rotateX(-Math.PI / 2), look.body, { position: [0, 0.9, -1.0], scale: [1.35, 1, 1] });
  k.box(1.3, 0.8, 0.07, GLASS, { position: [0, 1.65, -0.55], rotation: [-0.28, 0, 0] });
  k.box(1.34, 0.12, 0.12, INK, { position: [0, 2.05, -0.62] });
  k.box(1.6, 0.14, 2.3, INK, { position: [0, 2.15, 0.3] });
  k.box(1.62, 0.12, 2.32, look.accent, { position: [0, 2.26, 0.3] });
  for (const [x, z] of [[-0.72, -0.62], [0.72, -0.62], [-0.72, 1.3], [0.72, 1.3]] as const) k.box(0.06, 1.3, 0.06, INK, { position: [x, 1.5, z] });
  k.box(1.3, 0.35, 0.5, '#6a3a2a', { position: [0, 1.05, 0.9] });
  k.box(1.3, 0.6, 0.12, '#6a3a2a', { position: [0, 1.4, 1.2] });
  k.box(1.6, 0.35, 0.12, look.accent, { position: [0, 0.9, 1.45] });
  k.box(0.6, 0.06, 0.06, INK, { position: [0, 1.55, -0.35] });
  for (const x of [-0.78, 0.78]) k.add(new THREE.CylinderGeometry(0.34, 0.34, 0.3, 10, 1, true, 0, Math.PI).rotateZ(Math.PI / 2), look.trim, { position: [x, 0.35, 1.1] });
  k.box(0.9, 0.18, 0.1, '#f4d23b', { position: [0, 0.62, -1.6] });
  return k.build(0.015, 4);
}

function buildCoupe(look: VehicleLook): THREE.BufferGeometry {
  const k = new ModelKit();
  k.blob(1, look.body, { position: [0, 0.95, 0.1], scale: [1.05, 0.55, 2.0], detail: 2, roughness: 0.02 });
  k.blob(1, look.body, { position: [0, 1.4, 0.35], scale: [0.85, 0.55, 1.1], detail: 2, roughness: 0.02 });
  k.blob(1, GLASS, { position: [0, 1.48, 0.35], scale: [0.8, 0.45, 1.02], detail: 1, roughness: 0 });
  k.box(1.9, 0.14, 3.9, look.trim, { position: [0, 0.7, 0.05] });
  for (const z of [-1.85, 1.95]) k.box(2.0, 0.18, 0.2, '#c8c8d0', { position: [0, 0.62, z] });
  for (const [x, z] of [[-0.8, -1.2], [0.8, -1.2], [-0.8, 1.35], [0.8, 1.35]] as const) k.blob(0.45, look.body, { position: [x, 0.62, z], scale: [0.6, 0.75, 1.3], detail: 1, roughness: 0.02 });
  k.box(1.2, 0.08, 1.2, INK, { position: [0, 1.96, 0.45] });
  return k.build(0.01, 5);
}

function buildBuggy(look: VehicleLook): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(1.6, 0.35, 3.6, look.body, { position: [0, 0.75, 0] });
  k.box(1.3, 0.4, 1.3, look.body, { position: [0, 0.95, -1.3], rotation: [0.2, 0, 0] });
  k.box(1.1, 0.5, 0.7, INK, { position: [0, 1.1, 0.4] });
  k.box(1.1, 0.7, 0.15, INK, { position: [0, 1.5, 0.75] });
  // Roll cage.
  for (const x of [-0.75, 0.75]) {
    k.box(0.08, 1.5, 0.08, look.trim, { position: [x, 1.7, 0.9] });
    k.box(0.08, 0.08, 1.6, look.trim, { position: [x, 2.45, 0.1], rotation: [-0.25, 0, 0] });
    k.box(0.08, 1.1, 0.08, look.trim, { position: [x, 1.75, -0.65], rotation: [-0.5, 0, 0] });
  }
  k.box(1.58, 0.08, 0.08, look.trim, { position: [0, 2.45, 0.9] });
  k.box(1.9, 0.1, 0.55, look.accent, { position: [0, 1.95, 1.75] });
  for (const x of [-0.5, 0.5]) k.box(0.06, 0.6, 0.2, INK, { position: [x, 1.6, 1.7] });
  k.cylinder(0.12, 0.12, 0.6, 8, '#9a9aa4', { position: [0.4, 0.9, 1.9], rotation: [Math.PI / 2, 0, 0] });
  for (const x of [-0.35, 0.35]) k.cylinder(0.12, 0.12, 0.1, 8, '#fff3c4', { position: [x, 1.3, -1.95], rotation: [Math.PI / 2, 0, 0], nightGlow: 1 });
  return k.build(0.015, 6);
}

function buildVan(look: VehicleLook): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(2.0, 1.1, 4.3, look.body, { position: [0, 1.1, 0], pattern: Pattern.Planks });
  k.box(2.0, 1.0, 4.1, look.trim, { position: [0, 2.15, 0.1] });
  k.box(2.04, 0.12, 4.36, '#f6f0e4', { position: [0, 1.65, 0] });
  k.box(2.02, 0.3, 4.2, look.accent, { position: [0, 2.7, 0.1] });
  for (const x of [-0.48, 0.48]) k.box(0.85, 0.7, 0.06, GLASS, { position: [x, 2.15, -2.0], rotation: [-0.1, 0, 0] });
  for (let i = 0; i < 4; i++) for (const x of [-1.01, 1.01]) k.box(0.05, 0.6, 0.75, GLASS, { position: [x, 2.2, -1.2 + i * 0.95], nightGlow: i % 2 });
  k.add(new THREE.CircleGeometry(0.35, 12), '#f6f0e4', { position: [0, 1.3, -2.16], rotation: [0, Math.PI, 0] });
  k.box(2.2, 0.28, 0.25, INK, { position: [0, 0.7, -2.2] });
  k.box(2.2, 0.28, 0.25, INK, { position: [0, 0.7, 2.2] });
  k.box(1.6, 0.06, 2.8, INK, { position: [0, 2.9, 0.2] });
  return k.build(0.02, 7);
}

function buildScooter(look: VehicleLook): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(0.55, 0.3, 1.5, look.body, { position: [0, 0.55, 0.25] });
  k.blob(1, look.body, { position: [0, 0.8, 0.75], scale: [0.4, 0.35, 0.7], detail: 1, roughness: 0.02 });
  k.box(0.45, 0.15, 0.8, INK, { position: [0, 1.05, 0.6] });
  k.box(0.45, 1.1, 0.3, look.body, { position: [0, 0.85, -0.7], rotation: [-0.25, 0, 0] });
  k.blob(0.3, look.trim, { position: [0, 0.35, -0.95], scale: [0.7, 0.6, 1.2], detail: 1 });
  k.box(0.8, 0.06, 0.06, INK, { position: [0, 1.5, -0.88] });
  k.cylinder(0.12, 0.12, 0.08, 10, '#fff3c4', { position: [0, 1.35, -0.95], rotation: [Math.PI / 2, 0, 0], nightGlow: 1 });
  k.box(0.5, 0.35, 0.4, look.accent, { position: [0, 1.2, 1.1] });
  return k.build(0.01, 8);
}

export const VEHICLES: VehicleDef[] = [
  {
    id: 'rover',
    name: 'Gramophone Rover',
    blurb: 'Balanced all-rounder. Chunky tyres, big hops.',
    price: 0,
    tuning: {},
    defaultLook: { body: '#efe8d8', trim: '#8c8a94', accent: '#d8463a', hubs: '#f2b632', roofLoad: 'gramophone' },
    seat: [-0.42, 0.95, -0.2],
    seatPose: 'sit',
    wheels: [
      { x: -1.12, z: -1.35, r: 0.55, steer: true },
      { x: 1.12, z: -1.35, r: 0.55, steer: true },
      { x: -1.12, z: 1.4, r: 0.55, steer: false },
      { x: 1.12, z: 1.4, r: 0.55, steer: false },
    ],
    roofAt: [0.15, 2.18, 0.35],
    antennaAt: [-0.78, 2.05, 1.3],
    brakeLights: [[-0.72, 1.05, 2.03], [0.72, 1.05, 2.03]],
    headLights: [[-0.7, 1.12, -2.03], [0.7, 1.12, -2.03]],
    build: buildRover,
  },
  {
    id: 'tuktuk',
    name: 'Serendib Tuk-Tuk',
    blurb: 'Three wheels, nimble steering, lower top speed. Beep beep!',
    price: 400,
    tuning: { topSpeed: 46, accel: 20, steerLow: 12, steerHigh: 8, hopSpeed: 8.2 },
    defaultLook: { body: '#d8463a', trim: '#2b2622', accent: '#f4d23b', hubs: '#f6f0e4', roofLoad: 'none' },
    seat: [0, 0.75, -0.1],
    seatPose: 'sit',
    wheels: [
      { x: 0, z: -1.45, r: 0.34, steer: true },
      { x: -0.78, z: 1.1, r: 0.34, steer: false },
      { x: 0.78, z: 1.1, r: 0.34, steer: false },
    ],
    roofAt: [0, 2.3, 0.3],
    antennaAt: null,
    brakeLights: [[-0.6, 0.9, 1.52], [0.6, 0.9, 1.52]],
    headLights: [[0, 1.0, -1.7]],
    build: buildTukTuk,
  },
  {
    id: 'coupe',
    name: 'Bubble Coupé',
    blurb: 'Round and quick off the line. Light on hops.',
    price: 600,
    tuning: { topSpeed: 55, accel: 19, hopSpeed: 8.2, steerLow: 10.5 },
    defaultLook: { body: '#8fd0c8', trim: '#f6f0e4', accent: '#e8559a', hubs: '#f6f0e4', roofLoad: 'none' },
    seat: [-0.35, 0.65, 0.2],
    seatPose: 'sit',
    wheels: [
      { x: -0.82, z: -1.2, r: 0.4, steer: true },
      { x: 0.82, z: -1.2, r: 0.4, steer: true },
      { x: -0.82, z: 1.35, r: 0.4, steer: false },
      { x: 0.82, z: 1.35, r: 0.4, steer: false },
    ],
    roofAt: [0, 2.0, 0.45],
    antennaAt: null,
    brakeLights: [[-0.6, 0.95, 1.98], [0.6, 0.95, 1.98]],
    headLights: [[-0.62, 0.95, -1.82], [0.62, 0.95, -1.82]],
    build: buildCoupe,
  },
  {
    id: 'buggy',
    name: 'Beach Buggy',
    blurb: 'Huge hops and air control, drifts like a dream.',
    price: 800,
    tuning: { topSpeed: 51, hopSpeed: 11, steerResponse: 9, gravity: 19 },
    defaultLook: { body: '#f4d23b', trim: '#2b2622', accent: '#3e6fa8', hubs: '#d8463a', roofLoad: 'surfboard' },
    seat: [0, 0.7, 0.4],
    seatPose: 'sit',
    wheels: [
      { x: -0.95, z: -1.3, r: 0.45, steer: true },
      { x: 0.95, z: -1.3, r: 0.45, steer: true },
      { x: -1.0, z: 1.3, r: 0.62, steer: false },
      { x: 1.0, z: 1.3, r: 0.62, steer: false },
    ],
    roofAt: [0, 2.55, 0.1],
    antennaAt: [0.7, 2.0, 1.7],
    brakeLights: [[-0.6, 1.0, 1.82], [0.6, 1.0, 1.82]],
    headLights: [[-0.35, 1.3, -2.0], [0.35, 1.3, -2.0]],
    build: buildBuggy,
  },
  {
    id: 'van',
    name: 'Paper Van',
    blurb: 'Heavy and steady: great top speed, slow to turn.',
    price: 1000,
    tuning: { topSpeed: 58, accel: 14, steerLow: 8.5, steerHigh: 5.5, hopSpeed: 7.8, boostSpeed: 68 },
    defaultLook: { body: '#f2c6b4', trim: '#f6f0e4', accent: '#d8643a', hubs: '#f6f0e4', roofLoad: 'flowers' },
    seat: [-0.45, 1.05, -1.2],
    seatPose: 'sit',
    wheels: [
      { x: -1.02, z: -1.45, r: 0.5, steer: true },
      { x: 1.02, z: -1.45, r: 0.5, steer: true },
      { x: -1.02, z: 1.5, r: 0.5, steer: false },
      { x: 1.02, z: 1.5, r: 0.5, steer: false },
    ],
    roofAt: [0, 2.95, 0.4],
    antennaAt: null,
    brakeLights: [[-0.8, 1.2, 2.17], [0.8, 1.2, 2.17]],
    headLights: [[-0.72, 1.1, -2.17], [0.72, 1.1, -2.17]],
    build: buildVan,
  },
  {
    id: 'scooter',
    name: 'Vespa-ish Scooter',
    blurb: 'Tiny, twitchy and fun. Lowest top speed, best boost.',
    price: 300,
    tuning: { topSpeed: 44, accel: 22, steerLow: 13, steerHigh: 9, halfWidth: 0.5, boostSpeed: 62, boostDrain: 1 / 5 },
    defaultLook: { body: '#bfd9e8', trim: '#f6f0e4', accent: '#c8955a', hubs: '#f6f0e4', roofLoad: 'none' },
    seat: [0, 1.15, 0.55],
    seatPose: 'ride',
    wheels: [
      { x: 0, z: -0.95, r: 0.3, steer: true },
      { x: 0, z: 0.95, r: 0.3, steer: false },
    ],
    roofAt: [0, 1.45, 1.1],
    antennaAt: null,
    brakeLights: [[0, 0.8, 1.02]],
    headLights: [[0, 1.35, -1.0]],
    build: buildScooter,
  },
];

export function vehicleById(id: string): VehicleDef {
  return VEHICLES.find((v) => v.id === id) ?? VEHICLES[0];
}

export function tuningFor(id: string): VehicleTuning {
  return { ...ROVER_TUNING, ...vehicleById(id).tuning };
}

/**
 * Any drivable vehicle as a set of animated parts (docs/05 §4.3): a body that
 * tilts and bounces, spinning and steering wheels, a roof load that pulses with
 * the beat, a springy antenna, brake and head lights, and a seat for the driver.
 * Faces -Z; origin on the ground under the body.
 */
export class VehicleModel {
  readonly root = new THREE.Group();
  readonly body = new THREE.Group();
  readonly wheels: THREE.Group[] = [];
  readonly wheelRadii: number[] = [];
  readonly steerPivots: THREE.Group[] = [];
  readonly horn = new THREE.Group();
  readonly antenna = new THREE.Group();
  readonly seat = new THREE.Object3D();
  private readonly brakeMat = new PaintMaterial({ color: '#ff5a4a', emissive: 0.15 });
  private readonly headMat = new PaintMaterial({ color: '#fff3c4', emissive: 0.2 });

  constructor(readonly def: VehicleDef, look: VehicleLook = def.defaultLook) {
    this.root.name = def.id;
    this.root.add(this.body);
    const mat = new PaintMaterial({ vertexColors: true, flat: true });
    const bodyMesh = new THREE.Mesh(def.build(look), mat);
    bodyMesh.castShadow = true;
    this.body.add(bodyMesh);

    for (const p of def.brakeLights) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.06), this.brakeMat);
      b.position.set(p[0], p[1], p[2]);
      this.body.add(b);
    }
    for (const p of def.headLights) {
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 10).rotateX(Math.PI / 2), this.headMat);
      h.position.set(p[0], p[1], p[2]);
      this.body.add(h);
    }
    const load = buildRoofLoad(look);
    if (load) {
      this.horn.position.set(...def.roofAt);
      const m = new THREE.Mesh(load, mat);
      m.castShadow = true;
      this.horn.add(m);
      this.body.add(this.horn);
    }
    if (def.antennaAt) {
      const ant = new ModelKit().cylinder(0.018, 0.025, 1.4, 5, INK, { position: [0, 0.7, 0] }).blob(0.07, '#e8559a', { position: [0, 1.42, 0], detail: 0 }).build(0);
      this.antenna.add(new THREE.Mesh(ant, mat));
      this.antenna.position.set(...def.antennaAt);
      this.body.add(this.antenna);
    }
    this.seat.position.set(...def.seat);
    this.body.add(this.seat);

    for (const w of def.wheels) {
      const pivot = new THREE.Group();
      pivot.position.set(w.x, w.r, w.z);
      const wheel = new THREE.Group();
      const mesh = new THREE.Mesh(buildWheel(w.r, def.id === 'scooter' || def.id === 'tuktuk' ? 0.22 : 0.5, look.hubs), mat);
      mesh.castShadow = true;
      if (w.x > 0) mesh.rotation.y = Math.PI;
      wheel.add(mesh);
      pivot.add(wheel);
      this.root.add(pivot);
      this.wheels.push(wheel);
      this.wheelRadii.push(w.r);
      if (w.steer) this.steerPivots.push(pivot);
    }
  }

  setBrakeLights(on: boolean): void {
    this.brakeMat.emissiveStrength = on ? 1 : 0.15;
  }

  setHeadlights(strength: number): void {
    this.headMat.emissiveStrength = 0.2 + strength * 0.8;
  }

  /** Spin wheels for distance travelled `ds` (metres). */
  roll(ds: number): void {
    for (let i = 0; i < this.wheels.length; i++) this.wheels[i].rotation.x -= ds / this.wheelRadii[i];
  }
}

function buildWheel(r: number, width: number, hubs: string): THREE.BufferGeometry {
  const k = new ModelKit();
  k.cylinder(r, r, width, 12, TYRE, { rotation: [0, 0, Math.PI / 2] });
  if (r > 0.4) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      k.box(width + 0.02, 0.12, 0.18, TYRE, { position: [0, Math.cos(a) * r, Math.sin(a) * r], rotation: [a, 0, 0] });
    }
  }
  k.cylinder(r * 0.55, r * 0.55, width + 0.02, 10, hubs, { rotation: [0, 0, Math.PI / 2], position: [-0.01, 0, 0] });
  k.cylinder(r * 0.18, r * 0.18, width + 0.06, 6, INK, { rotation: [0, 0, Math.PI / 2], position: [-0.02, 0, 0] });
  return k.build(0.005, Math.round(r * 100));
}

function buildRoofLoad(look: VehicleLook): THREE.BufferGeometry | null {
  const k = new ModelKit();
  switch (look.roofLoad) {
    case 'gramophone': {
      k.box(0.7, 0.36, 0.7, '#9a5a32', { position: [0, 0.18, 0], pattern: Pattern.Planks });
      k.cylinder(0.3, 0.3, 0.04, 14, INK, { position: [0, 0.38, 0] });
      k.cylinder(0.04, 0.04, 0.5, 6, BRASS, { position: [0.12, 0.6, 0.05], rotation: [0.3, 0, 0] });
      const horn = new THREE.LatheGeometry([new THREE.Vector2(0.05, 0), new THREE.Vector2(0.08, 0.25), new THREE.Vector2(0.16, 0.5), new THREE.Vector2(0.32, 0.72), new THREE.Vector2(0.52, 0.84)], 12);
      k.add(horn, BRASS, { position: [0.12, 0.82, 0.12], rotation: [-0.9, 0, 0] });
      k.cylinder(0.05, 0.05, 0.3, 6, INK, { position: [-0.38, 0.22, 0], rotation: [0, 0, Math.PI / 2] });
      break;
    }
    case 'boombox':
      k.box(1.1, 0.55, 0.36, '#d8463a', { position: [0, 0.28, 0] });
      for (const x of [-0.3, 0.3]) k.cylinder(0.18, 0.18, 0.06, 12, INK, { position: [x, 0.28, -0.19], rotation: [Math.PI / 2, 0, 0] });
      k.box(0.9, 0.06, 0.06, INK, { position: [0, 0.7, 0] });
      break;
    case 'flowers':
      for (const [x, z, c] of [[-0.3, 0, '#e8559a'], [0.25, 0.1, '#f08a2e'], [0, -0.3, '#f4d23b']] as const) {
        k.cylinder(0.18, 0.14, 0.3, 8, '#c8643a', { position: [x, 0.15, z] });
        k.blob(0.28, c, { position: [x, 0.45, z], detail: 0, seed: x, pattern: Pattern.Leaves });
      }
      break;
    case 'surfboard':
      k.blob(1, '#f6f0e4', { position: [0, 0.12, 0], scale: [0.35, 0.06, 1.3], detail: 1 });
      k.box(0.05, 0.02, 2.2, look.accent, { position: [0, 0.19, 0] });
      break;
    default:
      return null;
  }
  return k.build(0.015, 9);
}

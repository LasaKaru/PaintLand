import * as THREE from 'three';
import { ModelKit, Pattern } from './ModelKit';
import { PaintMaterial } from '../render/PaintMaterial';
import { ROVER_TUNING, type VehicleTuning } from '../gameplay/RoverController';
import { decodeLivery, isEmptyLivery, paintLiveryCanvas } from '../gameplay/Livery';
import type { EngineSound, HornSound } from '../audio/VehicleSounds';

/** Paint scheme and roof load (garage customisation, docs/08 §2). */
export interface VehicleLook {
  body: string;
  trim: string;
  accent: string;
  hubs: string;
  roofLoad: 'gramophone' | 'boombox' | 'flowers' | 'surfboard' | 'rack' | 'kayak' | 'lanterns' | 'none';
  /** Paint job over the body colour (loot / shop). */
  decal?: 'none' | 'stripes' | 'flames' | 'dots' | 'checker';
  spoiler?: 'none' | 'lip' | 'wing';
  /** Neon under the car (a colour), glowing at night. */
  glow?: string | null;
  /** A hand-painted picture on both sides (a livery share code, see Livery.ts). */
  livery?: string;
  /** How the body paint looks: glossy (default), matte, glitter or chrome. */
  finish?: PaintFinish;
  wheelStyle?: WheelStyle;
  exhaust?: 'none' | 'twin' | 'side' | 'stack';
  /** Engine sound and horn (see audio/VehicleSounds.ts). */
  engine?: EngineSound;
  horn?: HornSound;
}

export type PaintFinish = 'gloss' | 'matte' | 'glitter' | 'chrome';
export type WheelStyle = 'classic' | 'spoke' | 'slick' | 'whitewall';

export type VehicleId = 'rover' | 'tuktuk' | 'coupe' | 'buggy' | 'van' | 'scooter' | 'paperboat' | 'balloon' | 'bicycle' | 'tukracer';

interface WheelSpot {
  x: number;
  z: number;
  r: number;
  steer: boolean;
  /** Tyre width (defaults by vehicle). */
  width?: number;
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
  /** Drives into the sea and floats (free roam). */
  amphibious?: boolean;
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
  k.box(1.7, 0.46, 0.06, GLASS, { pattern: Pattern.Glass, position: [0, 1.76, -0.57], rotation: [-0.25, 0, 0] });
  k.box(0.05, 0.42, 1.8, GLASS, { pattern: Pattern.Glass, position: [-0.96, 1.78, 0.55] });
  k.box(0.05, 0.42, 1.8, GLASS, { pattern: Pattern.Glass, position: [0.96, 1.78, 0.55] });
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
  k.cylinder(0.42, 0.42, 0.28, 10, TYRE, { pattern: Pattern.Matte, position: [0, 1.25, 2.28], rotation: [Math.PI / 2, 0, 0] });
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
  k.box(1.3, 0.8, 0.07, GLASS, { pattern: Pattern.Glass, position: [0, 1.65, -0.55], rotation: [-0.28, 0, 0] });
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
  k.blob(1, GLASS, { pattern: Pattern.Glass, position: [0, 1.48, 0.35], scale: [0.8, 0.45, 1.02], detail: 1, roughness: 0 });
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
  for (const x of [-0.48, 0.48]) k.box(0.85, 0.7, 0.06, GLASS, { pattern: Pattern.Glass, position: [x, 2.15, -2.0], rotation: [-0.1, 0, 0] });
  for (let i = 0; i < 4; i++) for (const x of [-1.01, 1.01]) k.box(0.05, 0.6, 0.75, GLASS, { pattern: Pattern.Glass, position: [x, 2.2, -1.2 + i * 0.95], nightGlow: i % 2 });
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

/** A folded-paper boat on little wheels: drive off the quay and it floats. */
function buildPaperBoat(look: VehicleLook): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(1.5, 0.14, 3.4, look.trim, { position: [0, 0.55, 0] });
  // Two trapezoid sides folded out from the keel, like a real paper boat.
  const side = new THREE.Shape([new THREE.Vector2(-1.45, 0), new THREE.Vector2(1.45, 0), new THREE.Vector2(2.35, 0.95), new THREE.Vector2(-2.35, 0.95)]);
  for (const s of [-1, 1]) {
    const g = new THREE.ExtrudeGeometry(side, { depth: 0.06, bevelEnabled: false }).translate(0, 0, -0.03).rotateY(Math.PI / 2).rotateZ(-s * 0.5);
    k.add(g, look.body, { position: [s * 0.55, 0.5, 0] });
    k.box(0.04, 0.04, 4.6, INK, { position: [s * (0.55 + Math.sin(0.5) * 0.95), 0.5 + Math.cos(0.5) * 0.95, 0], rotation: [0, 0, -s * 0.5] });
  }
  // The tall middle fold of a paper boat, behind the seat.
  k.add(new THREE.ConeGeometry(1.0, 1.5, 4).rotateY(Math.PI / 4), look.body, { position: [0, 1.75, 1.05], scale: [0.18, 1, 1.15] });
  k.box(0.04, 1.3, 0.04, INK, { position: [0, 1.7, 1.05] });
  k.box(1.2, 0.08, 0.35, look.accent, { position: [0, 1.25, 2.0] });
  k.box(0.95, 0.3, 0.6, '#6a3a2a', { position: [0, 0.78, 0.1] });
  k.box(0.95, 0.5, 0.1, '#6a3a2a', { position: [0, 1.05, 0.4] });
  k.box(1.1, 0.34, 0.05, GLASS, { pattern: Pattern.Glass, position: [0, 1.36, -0.85], rotation: [-0.35, 0, 0] });
  return k.build(0.02, 10);
}

/** A paper-lantern hot-air balloon: a wicker basket that hovers, a glowing burner. */
function buildBalloon(look: VehicleLook): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(1.5, 0.75, 1.5, '#b88a50', { position: [0, 0.75, 0], pattern: Pattern.Thatch });
  k.box(1.6, 0.1, 1.6, '#7a5a3a', { position: [0, 1.15, 0] });
  k.box(1.4, 0.06, 1.4, '#7a5a3a', { position: [0, 0.4, 0] });
  // Ropes from the basket corners to the lantern.
  for (const [x, z] of [[-0.72, -0.72], [0.72, -0.72], [-0.72, 0.72], [0.72, 0.72]] as const) {
    k.add(new THREE.CylinderGeometry(0.018, 0.018, 1.75, 4).rotateX(z * 0.3).rotateZ(-x * 0.3), INK, { position: [x * 1.12, 2.0, z * 1.12] });
  }
  k.cylinder(0.14, 0.2, 0.22, 8, BRASS, { position: [0, 2.72, 0] });
  k.cylinder(0.08, 0.02, 0.35, 6, '#ffb347', { position: [0, 3.0, 0], nightGlow: 1 });
  // The lantern: a ribbed paper envelope, open at the bottom.
  const profile = [
    [0.45, 0], [1.05, 0.2], [1.55, 0.7], [1.72, 1.25], [1.6, 1.8], [1.15, 2.3], [0.35, 2.5], [0.01, 2.52],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  k.add(new THREE.LatheGeometry(profile, 12), look.body, { position: [0, 3.05, 0] });
  for (const y of [0.25, 1.25, 2.28]) {
    const r = y < 0.5 ? 1.12 : y < 1.5 ? 1.74 : 1.18;
    k.add(new THREE.TorusGeometry(r, 0.05, 4, 16).rotateX(Math.PI / 2), look.accent, { position: [0, 3.05 + y, 0] });
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    k.box(0.04, 2.3, 0.04, look.trim, { position: [Math.cos(a) * 1.64, 4.3, Math.sin(a) * 1.64] });
  }
  k.box(0.3, 0.3, 0.06, '#d8463a', { position: [0, 0.8, -0.78] });
  return k.build(0.015, 11);
}

/** A town bicycle with a basket on the front. */
function buildBicycle(look: VehicleLook): THREE.BufferGeometry {
  const k = new ModelKit();
  const tube = (from: [number, number], to: [number, number], colour: string, r = 0.035): void => {
    const dz = to[1] - from[1];
    const dy = to[0] - from[0];
    const len = Math.hypot(dz, dy);
    k.cylinder(r, r, len, 6, colour, { position: [0, (from[0] + to[0]) / 2, (from[1] + to[1]) / 2], rotation: [Math.atan2(dz, dy), 0, 0] });
  };
  // [y, z] points of a diamond frame.
  const head: [number, number] = [1.05, -0.55];
  const seat: [number, number] = [1.0, 0.25];
  const crank: [number, number] = [0.42, 0.05];
  tube(head, seat, look.body);
  tube(head, crank, look.body);
  tube(seat, crank, look.body);
  for (const x of [-0.07, 0.07]) {
    k.cylinder(0.025, 0.025, 0.72, 5, look.body, { position: [x, 0.4, 0.45], rotation: [Math.PI / 2, 0, 0] });
    k.cylinder(0.025, 0.025, 0.8, 5, look.body, { position: [x, 0.7, 0.55], rotation: [0.95, 0, 0] });
    k.cylinder(0.025, 0.025, 0.75, 5, look.trim, { position: [x, 0.72, -0.72], rotation: [-0.3, 0, 0] });
  }
  k.box(0.22, 0.07, 0.3, INK, { position: [0, 1.05, 0.3] });
  k.box(0.62, 0.04, 0.04, INK, { position: [0, 1.22, -0.62] });
  for (const x of [-0.3, 0.3]) k.box(0.05, 0.05, 0.12, look.accent, { position: [x, 1.22, -0.6] });
  k.box(0.4, 0.26, 0.3, '#c8955a', { position: [0, 1.0, -0.98], pattern: Pattern.Thatch });
  k.cylinder(0.12, 0.12, 0.06, 10, look.trim, { position: [0.1, 0.42, 0.05], rotation: [0, 0, Math.PI / 2] });
  for (const s of [-1, 1]) k.box(0.1, 0.04, 0.06, INK, { position: [s * 0.2, 0.42 + s * 0.12, 0.05 + s * 0.1] });
  k.cylinder(0.08, 0.08, 0.06, 8, '#fff3c4', { position: [0, 1.0, -1.15], rotation: [Math.PI / 2, 0, 0], nightGlow: 1 });
  return k.build(0.004, 12);
}

/** The tuk-tuk, tuned: low canopy, racing stripe, wing, twin pipes. */
function buildTukRacer(look: VehicleLook): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(1.55, 0.8, 1.9, look.body, { position: [0, 0.8, 0.45] });
  k.box(1.56, 0.12, 1.95, look.trim, { position: [0, 0.4, 0.45] });
  k.add(new THREE.CylinderGeometry(0.4, 0.72, 1.4, 4, 1).rotateY(Math.PI / 4).rotateX(-Math.PI / 2), look.body, { position: [0, 0.82, -1.05], scale: [1.35, 0.85, 1] });
  k.box(1.3, 0.6, 0.07, GLASS, { pattern: Pattern.Glass, position: [0, 1.5, -0.55], rotation: [-0.45, 0, 0] });
  k.box(1.6, 0.12, 2.1, INK, { position: [0, 2.02, 0.4] });
  k.box(1.62, 0.1, 2.12, look.accent, { position: [0, 2.12, 0.4] });
  for (const [x, z] of [[-0.72, -0.5], [0.72, -0.5], [-0.72, 1.35], [0.72, 1.35]] as const) k.box(0.06, 1.2, 0.06, INK, { position: [x, 1.45, z] });
  k.box(0.3, 0.02, 3.4, look.accent, { position: [0, 1.22, -0.1] });
  k.box(1.3, 0.35, 0.5, INK, { position: [0, 1.0, 0.9] });
  k.box(1.3, 0.55, 0.12, INK, { position: [0, 1.35, 1.2] });
  for (const x of [-0.6, 0.6]) k.box(0.06, 0.35, 0.08, INK, { position: [x, 1.35, 1.5] });
  k.box(1.8, 0.06, 0.4, look.accent, { position: [0, 1.55, 1.55], rotation: [0.15, 0, 0] });
  for (const x of [-0.78, 0.78]) k.add(new THREE.CylinderGeometry(0.34, 0.34, 0.3, 10, 1, true, 0, Math.PI).rotateZ(Math.PI / 2), look.trim, { position: [x, 0.35, 1.1] });
  for (const x of [-0.3, 0.3]) k.cylinder(0.07, 0.09, 0.45, 8, '#cfd6df', { pattern: Pattern.Glass, position: [x, 0.45, 1.55], rotation: [Math.PI / 2, 0, 0] });
  k.box(0.9, 0.18, 0.1, '#f4d23b', { position: [0, 0.6, -1.7] });
  return k.build(0.012, 13);
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
  {
    id: 'paperboat',
    name: 'Paper Boat',
    blurb: 'A folded boat on wheels. Drive off the quay: it floats!',
    price: 700,
    tuning: { topSpeed: 47, accel: 16, steerLow: 9.5, steerHigh: 6.5, hopSpeed: 8.6 },
    defaultLook: { body: '#f6f0e4', trim: '#bfd9e8', accent: '#3e6fa8', hubs: '#f6f0e4', roofLoad: 'none', engine: 'buzzy', horn: 'duck' },
    seat: [0, 0.8, -0.2],
    seatPose: 'sit',
    wheels: [
      { x: -0.7, z: -1.2, r: 0.32, steer: true, width: 0.24 },
      { x: 0.7, z: -1.2, r: 0.32, steer: true, width: 0.24 },
      { x: -0.7, z: 1.2, r: 0.32, steer: false, width: 0.24 },
      { x: 0.7, z: 1.2, r: 0.32, steer: false, width: 0.24 },
    ],
    roofAt: [0, 1.3, 1.9],
    antennaAt: null,
    brakeLights: [[-0.5, 1.0, 1.75], [0.5, 1.0, 1.75]],
    headLights: [[-0.45, 1.0, -1.75], [0.45, 1.0, -1.75]],
    build: buildPaperBoat,
    amphibious: true,
  },
  {
    id: 'balloon',
    name: 'Lantern Balloon',
    blurb: 'Floats above the road: slow, but it hops sky-high and drifts down gently.',
    price: 1200,
    tuning: { topSpeed: 42, accel: 12, steerLow: 8, steerHigh: 6, steerResponse: 4, gravity: 7, hopSpeed: 9.5, halfWidth: 0.8 },
    defaultLook: { body: '#f08a2e', trim: '#d8463a', accent: '#f4d23b', hubs: '#f6f0e4', roofLoad: 'none', engine: 'burner', horn: 'bell' },
    seat: [0, 1.05, 0.1],
    seatPose: 'sit',
    wheels: [],
    roofAt: [0, 1.2, 0.6],
    antennaAt: null,
    brakeLights: [],
    headLights: [],
    build: buildBalloon,
  },
  {
    id: 'bicycle',
    name: 'Town Bicycle',
    blurb: 'Pedal power: the slowest, the nimblest and the quietest.',
    price: 150,
    tuning: { topSpeed: 36, boostSpeed: 46, accel: 18, steerLow: 14, steerHigh: 10, halfWidth: 0.4, hopSpeed: 8.8, boostDrain: 1 / 3 },
    defaultLook: { body: '#3e6fa8', trim: '#f6f0e4', accent: '#e8559a', hubs: '#cfd6df', roofLoad: 'none', engine: 'pedal', horn: 'bell', wheelStyle: 'spoke' },
    seat: [0, 1.3, 0.3],
    seatPose: 'ride',
    wheels: [
      { x: 0, z: -0.72, r: 0.38, steer: true, width: 0.07 },
      { x: 0, z: 0.72, r: 0.38, steer: false, width: 0.07 },
    ],
    roofAt: [0, 1.0, 0.72],
    antennaAt: null,
    brakeLights: [[0, 0.75, 1.1]],
    headLights: [],
    build: buildBicycle,
  },
  {
    id: 'tukracer',
    name: 'Tuk-Tuk Racer',
    blurb: 'A tuned tuk-tuk: sharp steering, fast boost, still three wheels.',
    price: 900,
    tuning: { topSpeed: 50, boostSpeed: 66, accel: 21, steerLow: 12, steerHigh: 8.5, hopSpeed: 8.4, boostDrain: 1 / 3.5 },
    defaultLook: { body: '#2f8a5a', trim: '#2b2622', accent: '#f4d23b', hubs: '#f4d23b', roofLoad: 'none', engine: 'buzzy', horn: 'trumpet', wheelStyle: 'slick' },
    seat: [0, 0.72, -0.1],
    seatPose: 'sit',
    wheels: [
      { x: 0, z: -1.45, r: 0.34, steer: true },
      { x: -0.8, z: 1.1, r: 0.36, steer: false },
      { x: 0.8, z: 1.1, r: 0.36, steer: false },
    ],
    roofAt: [0, 2.17, 0.3],
    antennaAt: null,
    brakeLights: [[-0.6, 0.85, 1.52], [0.6, 0.85, 1.52]],
    headLights: [[0, 0.95, -1.75]],
    build: buildTukRacer,
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
    const mat = new PaintMaterial({ vertexColors: true, flat: true, gloss: 0.7 });
    const bodyGeo = def.build(look);
    applyFinish(bodyGeo, look.body, look.finish);
    const bodyMesh = new THREE.Mesh(bodyGeo, mat);
    bodyMesh.castShadow = true;
    this.body.add(bodyMesh);
    // Custom parts fitted to the body's bounds: decals on the sides, a spoiler at the back, underglow.
    bodyGeo.computeBoundingBox();
    const bb = bodyGeo.boundingBox!;
    const extras = buildBodyExtras(look, bb);
    if (extras) {
      const m = new THREE.Mesh(extras, mat);
      m.castShadow = true;
      this.body.add(m);
    }
    const livery = liveryTexture(look.livery);
    if (livery) {
      // The picture on both flanks, front of the picture toward the front of the car.
      const len = (bb.max.z - bb.min.z) * 0.84;
      const tall = Math.min((bb.max.y - bb.min.y) * 0.5, len * 0.5);
      const liveryMat = new PaintMaterial({ color: '#ffffff', map: livery, gloss: 0.7, side: THREE.DoubleSide });
      for (const s of [-1, 1]) {
        const geo = new THREE.PlaneGeometry(len, tall);
        if (s > 0) {
          // The right flank would read back to front: mirror it.
          const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
          for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
        }
        const plane = new THREE.Mesh(geo, liveryMat);
        plane.rotation.y = s * Math.PI / 2;
        plane.position.set(s < 0 ? bb.min.x - 0.014 : bb.max.x + 0.014, bb.min.y + (bb.max.y - bb.min.y) * 0.42, (bb.min.z + bb.max.z) / 2);
        this.body.add(plane);
      }
    }
    if (look.glow) {
      const w = bb.max.x - bb.min.x;
      const d = bb.max.z - bb.min.z;
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.1, d * 1.05).rotateX(-Math.PI / 2), new PaintMaterial({ color: look.glow, emissive: 1 }));
      glow.position.set((bb.min.x + bb.max.x) / 2, 0.06, (bb.min.z + bb.max.z) / 2);
      this.root.add(glow);
    }

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
      const width = w.width ?? (def.id === 'scooter' || def.id === 'tuktuk' || def.id === 'tukracer' ? 0.22 : 0.5);
      const mesh = new THREE.Mesh(buildWheel(w.r, width, look.hubs, look.wheelStyle ?? 'classic'), mat);
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

const liveryCache = new Map<string, THREE.CanvasTexture>();

/** The texture for a livery code (cached; null for none or an invalid code). */
function liveryTexture(code: string | undefined): THREE.CanvasTexture | null {
  if (!code || typeof document === 'undefined') return null;
  const hit = liveryCache.get(code);
  if (hit) return hit;
  const px = decodeLivery(code);
  if (!px || isEmptyLivery(px)) return null;
  const canvas = document.createElement('canvas');
  paintLiveryCanvas(canvas, px);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (liveryCache.size > 48) {
    const [oldKey, old] = liveryCache.entries().next().value!;
    old.dispose();
    liveryCache.delete(oldKey);
  }
  liveryCache.set(code, tex);
  return tex;
}

/**
 * Paint finishes act on the body colour only (trim, glass and parts keep
 * theirs): matte kills the shine, chrome turns it bright and mirror-like,
 * glitter adds flecks (shader pattern 14).
 */
export function applyFinish(geo: THREE.BufferGeometry, body: string, finish: PaintFinish | undefined): number {
  if (!finish || finish === 'gloss') return 0;
  const colour = geo.getAttribute('color') as THREE.BufferAttribute;
  const pattern = geo.getAttribute('pattern') as THREE.BufferAttribute;
  const c = new THREE.Color(body);
  const silver = new THREE.Color('#cfd6df');
  const chrome = c.clone().lerp(silver, 0.55);
  const kind = finish === 'matte' ? Pattern.Matte : finish === 'chrome' ? Pattern.Glass : Pattern.Glitter;
  let n = 0;
  for (let i = 0; i < colour.count; i++) {
    // Planks (the rover's wooden sides) count as body paint too; glass and other patterns don't.
    const p = pattern.getX(i);
    if (p !== 0 && p !== Pattern.Planks) continue;
    if (Math.abs(colour.getX(i) - c.r) + Math.abs(colour.getY(i) - c.g) + Math.abs(colour.getZ(i) - c.b) > 0.004) continue;
    if (finish === 'chrome') colour.setXYZ(i, chrome.r, chrome.g, chrome.b);
    pattern.setX(i, kind);
    n++;
  }
  colour.needsUpdate = pattern.needsUpdate = true;
  return n;
}

function buildWheel(r: number, width: number, hubs: string, style: WheelStyle = 'classic'): THREE.BufferGeometry {
  const k = new ModelKit();
  if (style === 'spoke') {
    // Thin tyre, spokes to a small hub.
    k.add(new THREE.TorusGeometry(r - 0.04, 0.045, 5, 18).rotateY(Math.PI / 2), TYRE, { pattern: Pattern.Matte });
    k.add(new THREE.TorusGeometry(r - 0.09, 0.02, 4, 18).rotateY(Math.PI / 2), hubs, { pattern: Pattern.Glass });
    for (let i = 0; i < 8; i++) k.box(0.02, (r - 0.08) * 2, 0.02, '#cfd6df', { rotation: [(i / 8) * Math.PI, 0, 0] });
    k.cylinder(r * 0.15, r * 0.15, Math.max(width, 0.08) + 0.04, 8, hubs, { rotation: [0, 0, Math.PI / 2] });
    return k.build(0.002, Math.round(r * 100) + 1);
  }
  k.cylinder(r, r, width, 12, TYRE, { pattern: Pattern.Matte, rotation: [0, 0, Math.PI / 2] });
  if (style === 'whitewall') k.cylinder(r * 0.78, r * 0.78, width + 0.01, 12, '#f6f0e4', { rotation: [0, 0, Math.PI / 2] });
  if (style === 'slick') {
    // Smooth racing tyre, a five-spoke rim.
    k.cylinder(r * 0.62, r * 0.62, width + 0.02, 12, hubs, { pattern: Pattern.Glass, rotation: [0, 0, Math.PI / 2], position: [-0.01, 0, 0] });
    for (let i = 0; i < 5; i++) k.box(0.03, r * 1.05, 0.07, INK, { position: [-width / 2 - 0.01, 0, 0], rotation: [(i / 5) * Math.PI * 2, 0, 0] });
    k.cylinder(r * 0.16, r * 0.16, width + 0.06, 6, INK, { rotation: [0, 0, Math.PI / 2], position: [-0.02, 0, 0] });
    return k.build(0.004, Math.round(r * 100) + 2);
  }
  if (r > 0.4) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      k.box(width + 0.02, 0.12, 0.18, TYRE, { pattern: Pattern.Matte, position: [0, Math.cos(a) * r, Math.sin(a) * r], rotation: [a, 0, 0] });
    }
  }
  k.cylinder(r * 0.55, r * 0.55, width + 0.02, 10, hubs, { rotation: [0, 0, Math.PI / 2], position: [-0.01, 0, 0] });
  k.cylinder(r * 0.18, r * 0.18, width + 0.06, 6, INK, { rotation: [0, 0, Math.PI / 2], position: [-0.02, 0, 0] });
  return k.build(0.005, Math.round(r * 100) + (style === 'whitewall' ? 3 : 0));
}

/** Decals and spoilers, placed from the body's bounding box so they fit every vehicle. */
function buildBodyExtras(look: VehicleLook, bb: THREE.Box3): THREE.BufferGeometry | null {
  const k = new ModelKit();
  const w = bb.max.x - bb.min.x;
  const h = bb.max.y - bb.min.y;
  const d = bb.max.z - bb.min.z;
  const midZ = (bb.min.z + bb.max.z) / 2;
  const y = bb.min.y + h * 0.42;
  const accent = look.accent;
  const sides = [bb.min.x - 0.012, bb.max.x + 0.012];
  switch (look.decal ?? 'none') {
    case 'stripes':
      for (const x of sides) for (const dy of [-0.1, 0.1]) k.box(0.02, 0.07, d * 0.8, accent, { position: [x, y + dy, midZ] });
      for (const dx of [-0.18, 0.18]) k.box(0.14, 0.02, d * 0.9, accent, { position: [(bb.min.x + bb.max.x) / 2 + dx, bb.max.y + 0.012, midZ] });
      break;
    case 'flames':
      for (const x of sides) for (let i = 0; i < 5; i++) k.box(0.02, 0.1 + i * 0.03, 0.34, i % 2 ? '#f4d23b' : '#f08a2e', { position: [x, y + i * 0.02, bb.min.z + 0.3 + i * 0.28], rotation: [0.5, 0, 0] });
      break;
    case 'dots':
      for (const x of sides) for (let i = 0; i < 4; i++) k.cylinder(0.1, 0.1, 0.02, 10, accent, { position: [x, y + (i % 2) * 0.12, bb.min.z + d * (0.2 + i * 0.2)], rotation: [0, 0, Math.PI / 2] });
      break;
    case 'checker':
      for (const x of sides) for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) if ((i + j) % 2 === 0) k.box(0.02, 0.1, 0.14, '#2b2622', { position: [x, y + j * 0.1, bb.min.z + d * 0.2 + i * 0.14] });
      break;
    default:
      break;
  }
  switch (look.spoiler ?? 'none') {
    case 'lip':
      k.box(w * 0.8, 0.05, 0.25, accent, { position: [(bb.min.x + bb.max.x) / 2, bb.min.y + h * 0.62, bb.max.z - 0.05], rotation: [-0.25, 0, 0] });
      break;
    case 'wing':
      for (const s of [-0.35, 0.35]) k.box(0.06, 0.4, 0.08, '#2b2622', { position: [(bb.min.x + bb.max.x) / 2 + s * w, bb.min.y + h * 0.7, bb.max.z - 0.15] });
      k.box(w * 1.02, 0.06, 0.45, accent, { position: [(bb.min.x + bb.max.x) / 2, bb.min.y + h * 0.7 + 0.22, bb.max.z - 0.1], rotation: [0.12, 0, 0] });
      break;
    default:
      break;
  }
  const cx = (bb.min.x + bb.max.x) / 2;
  switch (look.exhaust ?? 'none') {
    case 'twin':
      for (const s of [-0.22, 0.22]) k.cylinder(0.07, 0.09, 0.4, 8, '#cfd6df', { pattern: Pattern.Glass, position: [cx + s * w, bb.min.y + 0.35, bb.max.z - 0.05], rotation: [Math.PI / 2, 0, 0] });
      break;
    case 'side':
      for (const x of [bb.min.x - 0.06, bb.max.x + 0.06]) k.cylinder(0.06, 0.06, d * 0.45, 8, '#cfd6df', { pattern: Pattern.Glass, position: [x, bb.min.y + 0.3, midZ + d * 0.1], rotation: [Math.PI / 2, 0, 0] });
      break;
    case 'stack':
      for (const s of [-0.38, 0.38]) {
        k.cylinder(0.06, 0.06, 0.9, 8, '#cfd6df', { pattern: Pattern.Glass, position: [cx + s * w, bb.min.y + h * 0.55, bb.max.z - 0.1] });
        k.cylinder(0.08, 0.06, 0.12, 8, INK, { position: [cx + s * w, bb.min.y + h * 0.55 + 0.5, bb.max.z - 0.1] });
      }
      break;
    default:
      break;
  }
  return k.isEmpty ? null : k.build(0.005);
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
    case 'rack':
      for (const x of [-0.55, 0.55]) k.box(0.06, 0.06, 1.6, INK, { position: [x, 0.12, 0] });
      for (const z of [-0.6, 0, 0.6]) k.box(1.2, 0.05, 0.06, INK, { position: [0, 0.16, z] });
      k.box(0.6, 0.35, 0.45, '#c8955a', { position: [-0.2, 0.36, -0.3] });
      k.box(0.45, 0.25, 0.4, look.accent, { position: [0.25, 0.3, 0.35] });
      break;
    case 'kayak':
      for (const x of [-0.45, 0.45]) k.box(0.06, 0.08, 1.4, INK, { position: [x, 0.06, 0] });
      k.blob(1, look.accent, { position: [0, 0.2, 0], scale: [0.3, 0.12, 1.55], detail: 1 });
      k.box(0.34, 0.06, 0.6, INK, { position: [0, 0.3, 0] });
      k.box(0.04, 0.04, 1.6, '#c8955a', { position: [0.2, 0.34, 0], rotation: [0, 0.15, 0] });
      break;
    case 'lanterns':
      k.box(1.3, 0.04, 0.04, INK, { position: [0, 0.5, 0] });
      for (const x of [-0.6, 0.6]) k.box(0.04, 0.5, 0.04, INK, { position: [x, 0.25, 0] });
      for (let i = 0; i < 4; i++) {
        const x = -0.45 + i * 0.3;
        k.blob(0.12, i % 2 ? '#d8463a' : '#f4d23b', { position: [x, 0.36, 0], scale: [1, 1.2, 1], detail: 1, nightGlow: 1 });
      }
      break;
    default:
      return null;
  }
  return k.build(0.015, 9);
}

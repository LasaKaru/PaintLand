import type * as THREE from 'three';
import type { FreeWorld, Ramp } from '../gameplay/FreeRoam';
import type { District } from '../gameplay/Restoration';
import type { MapInfo } from '../ui/MapView';
import type { Perahera } from './Perahera';

/** Ground height of every free-roam area above the sea. */
export const AREA_Y = 2;

export type ZoneKind = 'portal' | 'area' | 'garage' | 'wardrobe' | 'shop' | 'missions' | 'trophies';

/** A glowing ring: a service (garage…), a gate to a chapter, or a road to another area. */
export interface AreaZone {
  kind: ZoneKind;
  label: string;
  x: number;
  z: number;
  r: number;
  chapter?: string;
  area?: string;
  colour: string;
}

/** A hidden golden paint pot. */
export interface Secret {
  id: string;
  x: number;
  z: number;
  y: number;
  hint: string;
  mesh?: THREE.Object3D;
}

/** A loot chest: 0 common, 1 rare, 2 epic, 3 legendary. */
export interface Chest {
  id: string;
  x: number;
  z: number;
  tier: 0 | 1 | 2 | 3;
  mesh?: THREE.Object3D;
}

/** A named stunt jump: launch from `ramp`, land in the circle. */
export interface StuntJump {
  id: string;
  name: string;
  ramp: Ramp;
  land: { x: number; z: number; r: number };
}

/** A named place missions can point at. */
export interface Place {
  id: string;
  name: string;
  x: number;
  z: number;
}

/** A car or person moving on its own that the player can bump into. */
export interface DynamicBody {
  x: number;
  z: number;
  r: number;
}

/**
 * What the game needs from a free-roam area (Harbour Town, Serendib City…):
 * the visuals, the collision world, service rings, and optional content —
 * secrets, loot, stunt jumps, places for missions, moving traffic.
 */
export interface FreeRoamArea {
  readonly id: string;
  readonly group: THREE.Group;
  readonly world: FreeWorld;
  readonly zones: AreaZone[];
  readonly spawn: { x: number; z: number; heading: number };
  readonly secrets: Secret[];
  readonly chests: Chest[];
  readonly stunts: StuntJump[];
  readonly places: Place[];
  /** Title card text (already translated where possible). */
  title(): { kicker: string; name: string; poem: string };
  show(on: boolean): void;
  update(dt: number, time: number, player: { x: number; z: number }, camera: THREE.PerspectiveCamera): void;
  zoneAt(x: number, z: number): AreaZone | null;
  zoneLabel(z: AreaZone): string;
  ambienceAt(x: number, z: number): { nature: number; coast: number; city: number };
  /** Moving things (traffic) the player's car collides with this frame. */
  dynamicBodies(): DynamicBody[];
  /** Districts that start as pencil sketches and are painted by play (Colour the City). */
  readonly districts?: District[];
  /** The night festival parade, if this area has one. */
  readonly perahera?: Perahera;
  /** Data for the paper map; `paint` gives each district's paint 0..1. */
  /** Where the quay ends and the sea begins (z), if the area has a sea. */
  readonly seaZ?: number;
  mapInfo(paint: (districtId: string) => number): MapInfo;
  dispose(): void;
}

import * as THREE from 'three';
import type { RoadPath } from '../road/RoadPath';
import { createFrame } from '../road/RoadPath';
import { CITY_X, CITY_Z } from '../world/City';
import type { BoardSpot } from './BrandBoards';

/** Seeded shuffle so the same corners get boards every time. */
function shuffled<T>(list: T[], seed: number): T[] {
  const out = list.slice();
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Serendib City: billboards on pavement corners of street crossings (facing
 * the crossing), and festival banners along the beach promenade.
 */
export function citySpots(): BoardSpot[] {
  const corners: BoardSpot[] = [];
  for (const x of CITY_X.slice(1, -1))
    for (const z of CITY_Z.slice(1, -1)) {
      if (Math.hypot(x - 500, z + 300) < 110) continue; // the lake
      for (const [sx, sz] of [[1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const bx = x + sx * 10.5;
        const bz = z + sz * 10.5;
        corners.push({ x: bx, z: bz, yaw: Math.atan2(x - bx, z - bz), style: 'billboard', scale: 1.4 });
      }
    }
  const picked = shuffled(corners, 2026).slice(0, 30);
  for (let i = 0; i < 7; i++) picked.push({ x: -520 + i * 170, z: 494, yaw: Math.PI, style: 'banner', scale: 1.2 });
  return picked;
}

/** Harbour Town: around the plaza, the harbour front and the road to the city. */
export function hubSpots(): BoardSpot[] {
  const toward = (x: number, z: number, tx: number, tz: number, style: BoardSpot['style'] = 'billboard'): BoardSpot => ({ x, z, yaw: Math.atan2(tx - x, tz - z), style });
  return [
    toward(-12.5, -12.5, 0, 0),
    toward(12.5, -12.5, 0, 0),
    toward(-30, 54, -30, 62, 'banner'),
    toward(30, 54, 30, 62, 'banner'),
    toward(96, 12, 96, 0),
    toward(-96, 12, -96, 0),
  ];
}

/**
 * Chapter roads: a banner arch over the road every ~700 m, facing oncoming
 * drivers (skipped where the road climbs walls, loops or runs upside down).
 */
export function routeSpots(path: RoadPath): BoardSpot[] {
  const out: BoardSpot[] = [];
  const f = createFrame();
  const m = new THREE.Matrix4();
  const back = new THREE.Vector3();
  for (let s = 260; s < path.length - 100; s += 700) {
    path.sample(s, f);
    if (f.up.y < 0.92) continue;
    // Local x across the road, y up, +z (the face) back toward the driver.
    back.copy(f.tangent).negate();
    m.makeBasis(f.right, f.up, back);
    out.push({ x: f.position.x, y: f.position.y, z: f.position.z, basis: m.clone(), style: 'gantry', span: f.width / 2 + 0.8 });
  }
  return out;
}

/** Lantern Village: the plaza corners, the waterfront and the torii avenue. */
export function villageSpots(): BoardSpot[] {
  const toward = (x: number, z: number, tx: number, tz: number, style: BoardSpot['style'] = 'billboard'): BoardSpot => ({ x, z, yaw: Math.atan2(tx - x, tz - z), style });
  return [
    toward(-14, 16, 0, 0),
    toward(14, 16, 0, 0),
    toward(-70, 56, -70, 62, 'banner'),
    toward(70, 56, 70, 62, 'banner'),
    toward(-12, -14, 0, -14),
  ];
}

/** Board spots for a free-roam area by id. */
export function brandSpotsFor(id: string): BoardSpot[] {
  return id === 'city' ? citySpots() : id === 'village' ? villageSpots() : hubSpots();
}

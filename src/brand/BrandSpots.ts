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
        corners.push({ x: bx, z: bz, yaw: Math.atan2(x - bx, z - bz), style: 'billboard' });
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
 * Chapter roads: a board every ~700 m on the left verge, facing the road and
 * following its tilt (skipped on walls, loops and ceilings).
 */
export function routeSpots(path: RoadPath): BoardSpot[] {
  const out: BoardSpot[] = [];
  const f = createFrame();
  const m = new THREE.Matrix4();
  for (let s = 220; s < path.length - 100; s += 700) {
    path.sample(s, f);
    if (f.up.y < 0.9) continue;
    const off = f.width / 2 + f.plaza + 3.2;
    const p = f.position.clone().addScaledVector(f.right, -off);
    // Local +z (the face) points along `right`, toward the road from the left verge.
    m.makeBasis(f.tangent, f.up, f.right);
    out.push({ x: p.x, y: p.y, z: p.z, basis: m.clone(), style: out.length % 3 === 2 ? 'banner' : 'billboard', scale: 1.2 });
  }
  return out;
}

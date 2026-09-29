import type * as THREE from 'three';
import type { Decorator } from '../Decorator';
import type { Random } from '../../core/Random';
import { createFrame } from '../../road/RoadPath';
import { buildCloud, buildHill, type HillKind } from '../../models/Nature';
import { landAlong } from './sketch';

export interface TourBackdrop {
  /** Colour of the land along the whole route. */
  grass: string;
  /** Trees for the fields beyond the roadside. */
  trees: THREE.BufferGeometry[];
  /** Kind of the far hills. */
  hill: HillKind;
  /** Hill height range (metres). */
  hillHeight?: [number, number];
  /** District styles with the sea on the right (+1) of the road: nothing is planted out there. */
  seaRight?: ReadonlySet<string>;
}

/**
 * Background for a long Grand Tour route. Scattering around the route's centre
 * (as the short chapters do) leaves the ends of a 10 km road bare, so here the
 * land, clouds, trees and far hills all follow the road.
 */
export function tourBackground(d: Decorator, rnd: Random, opts: TourBackdrop): void {
  landAlong(d, 0, d.path.length, 200, opts.grass);
  const clouds = [0, 1, 2, 3].map((i) => buildCloud(rnd.fork(i + 30)));
  const [h0, h1] = opts.hillHeight ?? [70, 150];
  const f = createFrame();
  for (let s = 0; s < d.path.length; s += 60) {
    d.sample(s, f);
    const right = f.right.clone().setY(0).normalize();
    const seaRight = opts.seaRight?.has(d.chapter.districts[f.district]?.style ?? '') ?? false;
    for (const side of [-1, 1]) {
      const cloud = f.position.clone().addScaledVector(right, side * rnd.range(250, 900)).setY(rnd.range(120, 380));
      if (rnd.chance(0.35)) d.place(rnd.pick(clouds), d.worldMatrix(cloud, rnd.range(0, 6), rnd.range(1, 2.4)), false);
      if (seaRight && side > 0) continue;
      const tree = f.position.clone().addScaledVector(right, side * rnd.range(60, 160)).setY(0);
      if (opts.trees.length && rnd.chance(0.6) && !d.nearRoad(tree, 30)) d.place(rnd.pick(opts.trees), d.worldMatrix(tree, rnd.range(0, 6), rnd.range(1, 1.6)), false);
    }
    if (s % 480 === 0) {
      const side = seaRight || rnd.chance(0.5) ? -1 : 1;
      const p = f.position.clone().addScaledVector(right, side * rnd.range(450, 800)).setY(0);
      if (!d.nearRoad(p, 250)) d.place(buildHill(rnd.fork(s), rnd.range(140, 240), rnd.range(h0, h1), opts.hill), d.worldMatrix(p, rnd.range(0, 6)), false);
    }
  }
}

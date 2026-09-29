import * as THREE from 'three';
import { AnimalModel, COATS, type AnimalPose, type Species } from '../models/Animals';
import type { FreeWorld } from '../gameplay/FreeRoam';
import type { Random } from '../core/Random';
import type { TownEnv } from './TownLife';

export type AnimalState = 'wander' | 'rest' | 'flee' | 'fly' | 'follow' | 'bow' | 'roost';
export type AnimalCall = 'bark' | 'meow' | 'caw' | 'moo' | 'trumpet';

export interface Animal {
  species: Species;
  model: AnimalModel;
  x: number;
  z: number;
  /** Height above the ground (crows in flight). */
  y: number;
  heading: number;
  home: { x: number; z: number };
  /** How far from home it wanders. */
  range: number;
  state: AnimalState;
  t: number;
  target: { x: number; z: number };
  /** Resting pose (sit, lie down, graze). */
  rest: AnimalPose;
  pose: AnimalPose;
  speed: number;
  /** Seconds before this animal calls out again. */
  call: number;
}

/** How each animal moves and behaves. */
const NATURE: Record<Species, { walk: number; run: number; shy: number; rests: AnimalPose[]; call?: AnimalCall }> = {
  dog: { walk: 1.3, run: 4.5, shy: 0, rests: ['sit', 'lie', 'lie', 'idle'], call: 'bark' },
  cat: { walk: 0.8, run: 4, shy: 3, rests: ['sit', 'lie', 'idle'], call: 'meow' },
  crow: { walk: 0.6, run: 6, shy: 4, rests: ['eat', 'idle', 'hop'], call: 'caw' },
  cow: { walk: 0.6, run: 1.2, shy: 0, rests: ['eat', 'eat', 'lie', 'idle'], call: 'moo' },
  deer: { walk: 1, run: 5, shy: 0, rests: ['eat', 'idle', 'lie'] },
  kangaroo: { walk: 1.8, run: 6, shy: 5, rests: ['idle', 'eat', 'lie'] },
  elephant: { walk: 0.9, run: 1.5, shy: 0, rests: ['eat', 'eat', 'idle'], call: 'trumpet' },
};

/**
 * The animals of a town (docs/04 §7 "life"): stray dogs that nap in the shade
 * and sometimes follow you about, cats that slink off, crows that hop about
 * and take off when you come close, grazing cows, deer that bow to you when
 * you stand still (as in Nara), hopping kangaroos, and elephants by the lake.
 * Everything gets out of the way of a fast car.
 */
export class AnimalLife {
  readonly animals: Animal[] = [];
  readonly group = new THREE.Group();
  /** Calls to play this frame (the game passes them to the audio). */
  readonly calls: { call: AnimalCall; x: number; z: number }[] = [];
  private stillFor = 0;
  private lastPlayer = { x: 0, z: 0 };

  /** `cull`: hide and skip animals further than this from the player (big maps). */
  constructor(
    private readonly rnd: Random,
    private readonly cull = 0,
  ) {
    this.group.name = 'animals';
  }

  add(species: Species, x: number, z: number, range = 14): Animal {
    const rnd = this.rnd;
    const model = new AnimalModel(species, rnd.pick(COATS[species]));
    const scale = species === 'elephant' ? rnd.range(0.9, 1.05) : rnd.range(0.85, 1.1);
    model.root.scale.setScalar(scale);
    this.group.add(model.root);
    const a: Animal = {
      species,
      model,
      x,
      z,
      y: 0,
      heading: rnd.range(-Math.PI, Math.PI),
      home: { x, z },
      range,
      state: 'rest',
      t: rnd.range(1, 8),
      target: { x, z },
      rest: rnd.pick(NATURE[species].rests),
      pose: 'idle',
      speed: 0,
      call: rnd.range(5, 30),
    };
    this.animals.push(a);
    return a;
  }

  /** The nearest animal within reach (to pet a dog or a cat). */
  nearest(x: number, z: number, reach = 2): Animal | null {
    let best: Animal | null = null;
    let bestD = reach;
    for (const a of this.animals) {
      const d = Math.hypot(a.x - x, a.z - z);
      if (d < bestD && a.y < 0.1 && a.model.root.visible) {
        best = a;
        bestD = d;
      }
    }
    return best;
  }

  /** Pet a dog or cat: it sits happily, and a dog may follow you for a while. */
  pet(a: Animal): void {
    a.state = a.species === 'dog' ? 'follow' : 'rest';
    a.rest = 'sit';
    a.t = a.species === 'dog' ? 40 : 6;
    a.model.happy = true;
    this.calls.push({ call: a.species === 'cat' ? 'meow' : 'bark', x: a.x, z: a.z });
  }

  private wanderTarget(a: Animal): { x: number; z: number } {
    const ang = this.rnd.range(0, Math.PI * 2);
    const r = this.rnd.range(2, a.range);
    return { x: a.home.x + Math.cos(ang) * r, z: a.home.z + Math.sin(ang) * r };
  }

  update(dt: number, time: number, player: { x: number; z: number }, world: FreeWorld, env: TownEnv): void {
    const rnd = this.rnd;
    this.calls.length = 0;
    const moved = Math.hypot(player.x - this.lastPlayer.x, player.z - this.lastPlayer.z);
    this.stillFor = moved < 0.02 && env.onFoot ? this.stillFor + dt : 0;
    this.lastPlayer = { x: player.x, z: player.z };
    const car = env.car;
    const carSpeed = car ? Math.hypot(car.vx, car.vz) : 0;
    const night = env.hour >= 20 || env.hour < 5.5;
    for (const a of this.animals) {
      const nature = NATURE[a.species];
      const pd = Math.hypot(player.x - a.x, player.z - a.z);
      if (this.cull) {
        const on = pd < this.cull && a.state !== 'roost';
        a.model.root.visible = on;
        if (!on && a.state !== 'roost') continue;
      }
      a.t -= dt;
      a.call -= dt;
      // Crows roost out of sight at night.
      if (a.species === 'crow') {
        if (night && a.state !== 'roost') {
          a.state = 'roost';
          a.model.root.visible = false;
        } else if (!night && a.state === 'roost') {
          a.state = 'rest';
          a.t = 1;
          a.model.root.visible = true;
        }
        if (a.state === 'roost') continue;
      }
      // Frightened: a fast car close by, or (for the shy ones) someone walking up.
      const carNear = car && carSpeed > 3 && Math.hypot(car.x - a.x, car.z - a.z) < (a.species === 'elephant' ? 0 : 7);
      const shy = nature.shy > 0 && env.onFoot && pd < nature.shy && a.state !== 'follow';
      if ((carNear || shy) && a.state !== 'flee' && a.state !== 'fly') {
        const fromX = carNear ? car!.x : player.x;
        const fromZ = carNear ? car!.z : player.z;
        const d = Math.max(0.1, Math.hypot(a.x - fromX, a.z - fromZ));
        a.target = { x: a.x + ((a.x - fromX) / d) * 10, z: a.z + ((a.z - fromZ) / d) * 10 };
        a.state = a.species === 'crow' ? 'fly' : 'flee';
        a.t = a.species === 'crow' ? rnd.range(3, 6) : 2;
        a.model.happy = false;
        if (a.species === 'crow' && a.call <= 0) {
          this.calls.push({ call: 'caw', x: a.x, z: a.z });
          a.call = rnd.range(6, 15);
        }
        if (a.species === 'crow') {
          // Fly off to a new spot around home.
          a.target = this.wanderTarget(a);
          a.target.x += (a.target.x - player.x) * 0.2;
        }
      }
      // Deer bow to someone standing still in front of them.
      if (a.species === 'deer' && env.onFoot && pd < 3.5 && this.stillFor > 1 && a.state !== 'bow' && a.state !== 'flee') {
        a.state = 'bow';
        a.t = rnd.range(2.5, 4);
      }
      if (a.t <= 0) {
        // Pick what to do next.
        a.model.happy = false;
        if (a.state === 'wander' || a.state === 'flee' || a.state === 'follow' || a.state === 'bow' || a.state === 'fly') {
          a.state = 'rest';
          a.rest = night && a.species !== 'deer' ? 'lie' : rnd.pick(nature.rests);
          a.t = rnd.range(4, a.rest === 'lie' ? 25 : 12);
        } else {
          a.state = 'wander';
          a.target = this.wanderTarget(a);
          a.t = rnd.range(6, 16);
        }
        // Now and then a stray dog trots over to see you.
        if (a.species === 'dog' && env.onFoot && pd < 12 && rnd.chance(0.25)) {
          a.state = 'follow';
          a.t = rnd.range(15, 30);
          a.model.happy = true;
        }
      }
      let speed = 0;
      let goal: { x: number; z: number } | null = null;
      let pose: AnimalPose = 'idle';
      switch (a.state) {
        case 'wander':
          goal = a.target;
          speed = nature.walk;
          pose = a.species === 'kangaroo' ? 'hop' : 'walk';
          break;
        case 'flee':
          goal = a.target;
          speed = nature.run;
          pose = a.species === 'kangaroo' ? 'hop' : a.species === 'cow' ? 'walk' : 'run';
          break;
        case 'follow': {
          // Trot along behind, stopping at a friendly distance.
          const d = pd;
          if (d > 2.2) {
            goal = player;
            speed = d > 6 ? nature.run * 0.8 : nature.walk * 1.4;
            pose = d > 6 ? 'run' : 'walk';
          } else {
            pose = 'sit';
            a.heading = Math.atan2(-(player.x - a.x), -(player.z - a.z));
          }
          // A friendly woof now and then.
          if (a.call <= 0 && d < 8) {
            this.calls.push({ call: 'bark', x: a.x, z: a.z });
            a.call = rnd.range(8, 20);
          }
          break;
        }
        case 'bow':
          pose = 'bow';
          a.heading = Math.atan2(-(player.x - a.x), -(player.z - a.z));
          break;
        case 'fly': {
          goal = a.target;
          speed = nature.run;
          pose = 'fly';
          const d = Math.hypot(a.target.x - a.x, a.target.z - a.z);
          a.y = Math.min(6, a.y + dt * 5) * (d < 1 ? 0.9 : 1);
          if (d < 0.8 && a.t < 2) {
            a.y = Math.max(0, a.y - dt * 6);
            if (a.y <= 0) a.t = 0;
          }
          break;
        }
        case 'rest':
          pose = a.rest;
          break;
      }
      if (a.state !== 'fly') a.y = Math.max(0, a.y - dt * 6);
      if (goal) {
        const dx = goal.x - a.x;
        const dz = goal.z - a.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.4) {
          const step = Math.min(d, speed * dt);
          a.x += (dx / d) * step;
          a.z += (dz / d) * step;
          const want = Math.atan2(-dx, -dz);
          let diff = want - a.heading;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          a.heading += Math.max(-dt * 6, Math.min(dt * 6, diff));
        } else if (a.state === 'wander') a.t = Math.min(a.t, 0.5);
        if (a.state !== 'fly') {
          const p = { x: a.x, z: a.z };
          world.resolve(p, a.model.radius * a.model.root.scale.x);
          a.x = p.x;
          a.z = p.z;
        }
      }
      // A cow moos, an elephant trumpets, a dog barks at nothing in particular.
      if (a.call <= 0 && nature.call && pd < 25) {
        a.call = rnd.range(a.species === 'elephant' ? 40 : 18, a.species === 'elephant' ? 90 : 45);
        if (a.species !== 'dog' && a.species !== 'cat') this.calls.push({ call: nature.call, x: a.x, z: a.z });
      }
      a.pose = pose;
      a.speed = speed;
      a.model.root.position.set(a.x, a.y, a.z);
      a.model.root.rotation.y = a.heading;
      a.model.animate(dt, pose, speed, time);
    }
  }
}

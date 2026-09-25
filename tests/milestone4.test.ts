import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { FreeCar, FreeWalker, FreeWorld } from '../src/gameplay/FreeRoam';
import { ROVER_TUNING, RoverController, type RoverInput } from '../src/gameplay/RoverController';
import { TrackBuilder } from '../src/road/TrackBuilder';
import { SKETCH } from '../src/world/chapters/sketch';
import { Strikes, cleanText, validateState } from '../server/validate.mjs';

const DT = 1 / 60;
const car = (): FreeCar => new FreeCar({ ...ROVER_TUNING });
const open = (): FreeWorld => new FreeWorld({ minX: -500, maxX: 500, minZ: -500, maxZ: 500 });

describe('Free-roam car (hubs)', () => {
  it('drives forward along −Z at heading 0 and respects the hub speed limit', () => {
    const c = car();
    const w = open();
    for (let t = 0; t < 10; t += DT) c.step(DT, { throttle: 1, brake: 0, steer: 0, hop: false, boost: false }, w);
    expect(c.z).toBeLessThan(-100);
    expect(Math.abs(c.x)).toBeLessThan(0.01);
    expect(c.v).toBeLessThanOrEqual(c.topSpeed + 0.01);
  });

  it('steering right turns clockwise seen from above', () => {
    const c = car();
    const w = open();
    for (let t = 0; t < 2; t += DT) c.step(DT, { throttle: 1, brake: 0, steer: 0, hop: false, boost: false }, w);
    for (let t = 0; t < 1; t += DT) c.step(DT, { throttle: 1, brake: 0, steer: 1, hop: false, boost: false }, w);
    expect(c.heading).toBeLessThan(-0.2); // right turn = heading decreases
    expect(c.x).toBeGreaterThan(0.5); // and the car moved toward +X
  });

  it('stops at a wall and reports the bump', () => {
    const c = car();
    const w = open();
    w.box(0, -40, 20, 2);
    let bumps = 0;
    c.onBump = () => bumps++;
    for (let t = 0; t < 8; t += DT) c.step(DT, { throttle: 1, brake: 0, steer: 0, hop: false, boost: false }, w);
    expect(c.z).toBeGreaterThan(-38 + c.radius - 0.5);
    expect(bumps).toBeGreaterThan(0);
  });

  it('brakes to a stop, then reverses slowly', () => {
    const c = car();
    const w = open();
    for (let t = 0; t < 3; t += DT) c.step(DT, { throttle: 1, brake: 0, steer: 0, hop: false, boost: false }, w);
    for (let t = 0; t < 4; t += DT) c.step(DT, { throttle: 0, brake: 1, steer: 0, hop: false, boost: false }, w);
    expect(c.v).toBeLessThan(0);
    expect(c.v).toBeGreaterThanOrEqual(-6);
  });
});

describe('Free-roam walker', () => {
  it('walks where the camera looks and slides along walls', () => {
    const p = new FreeWalker();
    const w = open();
    w.box(0, -10, 50, 1);
    for (let t = 0; t < 5; t += DT) p.step(DT, { moveX: 0.3, moveY: 1, cameraYaw: 0, sprint: false, walk: false, jump: false, faceCamera: false }, w);
    expect(p.z).toBeGreaterThan(-9 + 0.3 - 0.05); // stopped at the wall
    expect(p.x).toBeGreaterThan(1); // but kept sliding sideways
  });

  it('turns the camera frame: yaw 90° left walks toward −X', () => {
    const p = new FreeWalker();
    for (let t = 0; t < 1; t += DT) p.step(DT, { moveX: 0, moveY: 1, cameraYaw: Math.PI / 2, sprint: false, walk: false, jump: false, faceCamera: false }, open());
    expect(p.x).toBeLessThan(-2);
    expect(Math.abs(p.z)).toBeLessThan(0.05);
  });
});

describe('Determinism (ghosts, replays, future server re-simulation)', () => {
  const script = (i: number): RoverInput => ({
    throttle: i % 400 < 300 ? 1 : 0,
    brake: i % 400 >= 360 ? 1 : 0,
    steer: Math.sin(i * 0.013),
    hop: i % 240 === 100,
    boost: i % 500 > 420,
    drift: i % 300 > 260,
  });
  const run = (handling: 'arcade' | 'realistic'): number[] => {
    const path = SKETCH.buildRoute();
    const r = new RoverController(path);
    r.handling = handling;
    r.reset(8);
    for (let i = 0; i < 3600; i++) r.step(DT, script(i));
    return [r.s, r.x, r.h, r.v, r.yaw, r.gear, r.rpm];
  };

  it('the same inputs give bit-identical results (arcade and realistic)', () => {
    expect(run('arcade')).toEqual(run('arcade'));
    expect(run('realistic')).toEqual(run('realistic'));
  });

  it('a straight test track builds identically twice', () => {
    const a = new TrackBuilder(new THREE.Vector3(), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), 12).straight(100).build();
    const b = new TrackBuilder(new THREE.Vector3(), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), 12).straight(100).build();
    expect(a.length).toBe(b.length);
  });
});

describe('Multiplayer validation (server and client)', () => {
  const ok = { chapter: 'sketch', mode: 'drive', s: 100, x: 1, h: 0, yaw: 0, v: 30 };

  it('accepts normal states and rejects impossible ones', () => {
    expect(validateState(ok, null, 0).ok).toBe(true);
    expect(validateState({ ...ok, v: 500 }, null, 0).ok).toBe(false);
    expect(validateState({ ...ok, x: NaN }, null, 0).ok).toBe(false);
    expect(validateState({ ...ok, mode: 'fly' }, null, 0).ok).toBe(false);
    expect(validateState({ ...ok, h: 1e6 }, null, 0).ok).toBe(false);
  });

  it('catches teleports but allows lap wraps and respawns near the start', () => {
    const prev = { s: 100, chapter: 'sketch', at: 0 };
    expect(validateState({ ...ok, s: 108 }, prev, 83).ok).toBe(true);
    expect(validateState({ ...ok, s: 2500 }, prev, 83).ok).toBe(false);
    expect(validateState({ ...ok, s: 10 }, { s: 3040, chapter: 'sketch', at: 0 }, 83).ok).toBe(true);
    expect(validateState({ ...ok, chapter: 'wonders', s: 2500 }, prev, 83).ok).toBe(true);
  });

  it('cleans chat and names', () => {
    expect(cleanText('  hello\u0000   world  ')).toBe('hello world');
    expect(cleanText('   ')).toBeNull();
    expect(cleanText('x'.repeat(500))!.length).toBe(120);
    expect(cleanText(42)).toBeNull();
  });

  it('drops clients after repeated bad data', () => {
    const s = new Strikes(3, 1000);
    expect(s.add(0)).toBe(false);
    expect(s.add(10)).toBe(false);
    expect(s.add(20)).toBe(true);
    const slow = new Strikes(3, 1000);
    slow.add(0);
    slow.add(1500);
    expect(slow.add(3000)).toBe(false);
  });
});

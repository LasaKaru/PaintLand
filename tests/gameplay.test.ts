import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { TrackBuilder } from '../src/road/TrackBuilder';
import { SKETCH } from '../src/world/chapters/sketch';
import { RoverController, ROVER_TUNING, type RoverInput } from '../src/gameplay/RoverController';
import { HumanController } from '../src/gameplay/HumanController';
import { Collectibles, type PickupEvent } from '../src/gameplay/Collectibles';
import { PHRASE_LENGTH, degreeToMidi } from '../src/world/Districts';
const DISTRICTS = SKETCH.districts;
import { walkableHalfWidth } from '../src/road/RoadMesh';

const DT = 1 / 60;
const idle: RoverInput = { throttle: 0, brake: 0, steer: 0, hop: false, boost: false, drift: false };

function straightRoad(length = 500) {
  return new TrackBuilder(new THREE.Vector3(0, 10, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), 12).straight(length).build();
}

function run(rover: RoverController, seconds: number, input: Partial<RoverInput> = {}): void {
  for (let t = 0; t < seconds; t += DT) rover.step(DT, { ...idle, ...input });
}

describe('RoverController', () => {
  it('accelerates toward top speed and never exceeds it without boost', () => {
    const rover = new RoverController(straightRoad(2000));
    run(rover, 12, { throttle: 1 });
    expect(rover.v).toBeGreaterThan(ROVER_TUNING.topSpeed * 0.9);
    expect(rover.v).toBeLessThanOrEqual(ROVER_TUNING.topSpeed + 0.01);
  });

  it('keeps the cruise floor after the throttle was touched, and can stop with the brake', () => {
    const rover = new RoverController(straightRoad());
    run(rover, 0.5, { throttle: 1 });
    run(rover, 5);
    expect(rover.v).toBeGreaterThan(ROVER_TUNING.cruiseFloor * 0.95);
    run(rover, 3, { brake: 1 });
    expect(rover.v).toBeLessThan(1);
    run(rover, 2);
    expect(rover.v).toBeLessThan(1);
  });

  it('never stalls on an inverted road (auto-cruise floor)', () => {
    const path = new TrackBuilder(new THREE.Vector3(), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), 12).straight(20).pitch(180, 30).straight(200).build();
    const rover = new RoverController(path);
    rover.reset(120);
    rover.v = 0;
    run(rover, 3, { brake: 1 });
    expect(path.sample(rover.s).up.y).toBeLessThan(-0.9);
    expect(rover.v).toBeGreaterThan(ROVER_TUNING.cruiseFloor * 0.8);
  });

  it('hops along the road up and lands back on the road', () => {
    let landed = 0;
    const r2 = new RoverController(straightRoad(), { onLand: (air) => (landed = air) });
    r2.step(DT, { ...idle, hop: true });
    expect(r2.grounded).toBe(false);
    run(r2, 2);
    expect(r2.grounded).toBe(true);
    expect(r2.h).toBe(0);
    expect(landed).toBeGreaterThan(0.5);
  });

  it('stays between the kerbs', () => {
    const rover = new RoverController(straightRoad());
    run(rover, 1, { throttle: 1 });
    run(rover, 5, { throttle: 1, steer: 1 });
    expect(Math.abs(rover.x)).toBeLessThanOrEqual(6 - ROVER_TUNING.halfWidth + 1e-6);
  });

  it('boost drains the meter and is blocked by the magnet drawback', () => {
    const rover = new RoverController(straightRoad(3000));
    rover.boostMeter = 1;
    run(rover, 1, { throttle: 1, boost: true });
    expect(rover.boostMeter).toBeLessThan(0.8);
    rover.mods.noBoost = true;
    const before = rover.boostMeter;
    run(rover, 1, { throttle: 1, boost: true });
    expect(rover.boostMeter).toBe(before);
    expect(rover.boosting).toBe(false);
  });

  it('fires a lap event at the end of the road', () => {
    let laps = 0;
    const rover = new RoverController(straightRoad(100), { onLap: () => laps++ });
    rover.reset(90);
    rover.v = 30;
    run(rover, 1);
    expect(laps).toBeGreaterThan(0);
  });
});

describe('HumanController', () => {
  const path = straightRoad();

  it('walks relative to the camera yaw', () => {
    const h = new HumanController(path);
    h.place(50, 0, 0);
    for (let i = 0; i < 60; i++) h.step(DT, { moveX: 0, moveY: 1, cameraYaw: 0, sprint: false, walk: false, jump: false, faceCamera: false });
    expect(h.s).toBeGreaterThan(52);
    expect(Math.abs(h.x)).toBeLessThan(0.01);
    const h2 = new HumanController(path);
    h2.place(50, 0, 0);
    for (let i = 0; i < 60; i++) h2.step(DT, { moveX: 0, moveY: 1, cameraYaw: Math.PI / 2, sprint: false, walk: false, jump: false, faceCamera: false });
    expect(h2.x).toBeGreaterThan(2);
  });

  it('sprints faster than it jogs, and jogs faster than it walks', () => {
    const speeds = (['walk', 'jog', 'sprint'] as const).map((mode) => {
      const h = new HumanController(path);
      h.place(50, 0, 0);
      for (let i = 0; i < 90; i++) h.step(DT, { moveX: 0, moveY: 1, cameraYaw: 0, sprint: mode === 'sprint', walk: mode === 'walk', jump: false, faceCamera: false });
      return h.speed;
    });
    expect(speeds[0]).toBeLessThan(speeds[1]);
    expect(speeds[1]).toBeLessThan(speeds[2]);
  });

  it('cannot walk off the edge of the road', () => {
    const h = new HumanController(path);
    h.place(50, 0, 0);
    for (let i = 0; i < 400; i++) h.step(DT, { moveX: 1, moveY: 0, cameraYaw: 0, sprint: true, walk: false, jump: false, faceCamera: false });
    expect(h.x).toBeLessThanOrEqual(walkableHalfWidth(12, 0));
  });

  it('jumps and lands', () => {
    const h = new HumanController(path);
    h.place(50, 0, 0);
    h.step(DT, { moveX: 0, moveY: 0, cameraYaw: 0, sprint: false, walk: false, jump: true, faceCamera: false });
    expect(h.grounded).toBe(false);
    let peak = 0;
    for (let i = 0; i < 120; i++) {
      h.step(DT, { moveX: 0, moveY: 0, cameraYaw: 0, sprint: false, walk: false, jump: false, faceCamera: false });
      peak = Math.max(peak, h.h);
    }
    expect(peak).toBeGreaterThan(1);
    expect(h.grounded).toBe(true);
  });
});

describe('Collectibles', () => {
  const path = SKETCH.buildRoute();
  const items = new Collectibles(path, DISTRICTS);

  it('places every melody step as a note, in phrases of eight', () => {
    const total = DISTRICTS.reduce((n, d) => n + d.melody.length, 0);
    expect(items.notes.length).toBe(total);
    expect(items.phrases.length).toBe(total / PHRASE_LENGTH);
    expect(items.notes[0].midi).toBe(degreeToMidi(DISTRICTS[0], DISTRICTS[0].melody[0]));
  });

  it('notes stay on the road', () => {
    for (const n of items.notes) expect(Math.abs(n.x)).toBeLessThan(path.sample(n.s).width / 2);
  });

  it('collecting a whole phrase seals it', () => {
    const events: PickupEvent[] = [];
    for (const n of items.phrases[0].notes) {
      items.collect({ s: n.s, x: n.x, h: 0, radiusS: 2.4, radiusX: 1.9, magnet: false, driving: true }, events);
    }
    expect(events.filter((e) => e.type === 'note').length).toBeGreaterThanOrEqual(PHRASE_LENGTH);
    expect(events.some((e) => e.type === 'sealed')).toBe(true);
    expect(items.phrases[0].sealed).toBe(true);
    items.resetLap();
    expect(items.notes.every((n) => !n.collected)).toBe(true);
    expect(items.phrases[0].sealed).toBe(true);
  });
});

describe('RoverController idle and reverse', () => {
  it('does not creep when idle, and reverses slowly when the brake is held at a stop', () => {
    const rover = new RoverController(straightRoad());
    rover.reset(100);
    run(rover, 3);
    expect(rover.v).toBe(0);
    expect(rover.s).toBeCloseTo(100, 5);
    run(rover, 3, { brake: 1 });
    expect(rover.v).toBeLessThan(0);
    expect(rover.v).toBeGreaterThanOrEqual(-4);
  });
});

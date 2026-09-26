import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { applyFinish, VEHICLES, VehicleModel, vehicleById, tuningFor, type VehicleLook } from '../src/models/Vehicles';
import { Pattern } from '../src/models/ModelKit';
import { CATALOGUE } from '../src/gameplay/Profile';
import { FreeCar, FreeWorld } from '../src/gameplay/FreeRoam';
import { ENGINE_PROFILES, HORN_PROFILES, defaultEngine, defaultHorn } from '../src/audio/VehicleSounds';

const values = (category: string): string[] => CATALOGUE.filter((i) => i.category === category).map((i) => i.value);

describe('Garage parts', () => {
  it('every vehicle builds with every part fitted', () => {
    const parts: [keyof VehicleLook, string][] = [
      ...values('roof').map((v) => ['roofLoad', v] as [keyof VehicleLook, string]),
      ...values('finish').map((v) => ['finish', v] as [keyof VehicleLook, string]),
      ...values('wheels').map((v) => ['wheelStyle', v] as [keyof VehicleLook, string]),
      ...values('exhaust').map((v) => ['exhaust', v] as [keyof VehicleLook, string]),
    ];
    for (const def of VEHICLES)
      for (const [field, value] of parts) {
        const m = new VehicleModel(def, { ...def.defaultLook, [field]: value });
        let nan = false;
        m.root.traverse((o) => {
          const g = (o as THREE.Mesh).geometry;
          if (g) for (const x of g.getAttribute('position').array as Float32Array) if (!Number.isFinite(x)) nan = true;
        });
        expect(nan, `${def.id} ${field}=${value}`).toBe(false);
      }
  });

  it('unknown part values from other players fall back safely', () => {
    const look = { ...VEHICLES[0].defaultLook, finish: 'rainbow', wheelStyle: 'square', exhaust: 'jet', roofLoad: 'piano' } as unknown as VehicleLook;
    expect(() => new VehicleModel(VEHICLES[0], look)).not.toThrow();
  });

  it('finishes repaint only the body colour', () => {
    const def = vehicleById('rover');
    for (const [finish, kind] of [['matte', Pattern.Matte], ['chrome', Pattern.Glass], ['glitter', Pattern.Glitter]] as const) {
      const geo = def.build(def.defaultLook);
      const before = (geo.getAttribute('pattern') as THREE.BufferAttribute).array.slice();
      const n = applyFinish(geo, def.defaultLook.body, finish);
      expect(n, finish).toBeGreaterThan(50);
      const after = geo.getAttribute('pattern') as THREE.BufferAttribute;
      let changed = 0;
      for (let i = 0; i < after.count; i++) if (after.getX(i) !== before[i]) {
        changed++;
        expect(after.getX(i)).toBe(kind);
      }
      expect(changed).toBe(n);
      // Glass stays glass, the rest of the car keeps its own paint.
      expect(changed).toBeLessThan(after.count * 0.8);
    }
    const geo = def.build(def.defaultLook);
    expect(applyFinish(geo, def.defaultLook.body, 'gloss')).toBe(0);
  });

  it('every engine and horn in the shop has a sound, and every vehicle a default', () => {
    for (const v of values('engine')) expect(ENGINE_PROFILES[v as keyof typeof ENGINE_PROFILES], v).toBeDefined();
    for (const v of values('horn')) expect(HORN_PROFILES[v as keyof typeof HORN_PROFILES], v).toBeDefined();
    for (const def of VEHICLES) {
      expect(values('engine')).toContain(defaultEngine(def.id));
      expect(values('horn')).toContain(defaultHorn(def.id));
    }
  });

  it('new vehicles are in the shop with a price and sensible handling', () => {
    for (const id of ['paperboat', 'balloon', 'bicycle', 'tukracer']) {
      expect(CATALOGUE.find((i) => i.id === `vehicle:${id}`)?.price, id).toBeGreaterThan(0);
      const t = tuningFor(id);
      expect(t.topSpeed).toBeGreaterThan(30);
      expect(t.topSpeed).toBeLessThanOrEqual(58);
    }
    // The balloon drifts down slowly: longer hang time than the rover.
    const hang = (id: string): number => (2 * tuningFor(id).hopSpeed) / tuningFor(id).gravity;
    expect(hang('balloon')).toBeGreaterThan(hang('rover') * 2);
  });
});

describe('Paper boat on the water', () => {
  const world = new FreeWorld({ minX: -100, maxX: 100, minZ: -100, maxZ: 68 });
  const run = (car: FreeCar, seconds: number, throttle: number): void => {
    for (let i = 0; i < seconds * 60; i++) car.step(1 / 60, { throttle, brake: 0, steer: 0, hop: false, boost: false }, world);
  };

  it('a land vehicle stops at the harbour edge', () => {
    const car = new FreeCar(tuningFor('rover'));
    car.place(0, 40, Math.PI); // facing +z, toward the sea
    run(car, 6, 1);
    expect(car.z).toBeLessThanOrEqual(68);
    expect(car.y).toBe(0);
  });

  it('drives off the quay, floats at the waterline, and leaps back up onto the quay', () => {
    const car = new FreeCar(tuningFor('paperboat'));
    car.water = { edge: 70, level: -2.6, maxZ: 160 };
    car.place(0, 40, Math.PI);
    run(car, 5, 1);
    expect(car.z).toBeGreaterThan(80);
    expect(car.y).toBeCloseTo(-2.6, 5);
    expect(car.afloat).toBe(true);
    // Out-of-bounds still applies at sea.
    run(car, 20, 1);
    expect(car.z).toBeLessThanOrEqual(160);
    // Turn around and head back to the quay.
    car.heading = 0;
    car.v = 0;
    run(car, 12, 1);
    expect(car.z).toBeLessThan(70);
    expect(car.y).toBe(0);
    expect(car.afloat).toBe(false);
  });

  it('never passes through the quay wall below the top', () => {
    const car = new FreeCar(tuningFor('paperboat'));
    car.water = { edge: 70, level: -2.6, maxZ: 160 };
    car.place(0, 90, 0);
    car.y = -2.6;
    // Creeping in slowly: no leap, and never inside the wall.
    for (let i = 0; i < 600; i++) {
      car.step(1 / 60, { throttle: 0.08, brake: 0, steer: 0, hop: false, boost: false }, world);
      if (car.y < -0.01) expect(car.z).toBeGreaterThan(70);
    }
  });
});

import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { VEHICLES, VehicleModel } from '../src/models/Vehicles';
import { DEFAULT_HUMAN_LOOK, HumanModel, type HumanLook } from '../src/models/Human';
import { MIN_FIT_SCALE, riderOverflow, seatRider } from '../src/models/Rider';
import { CATALOGUE } from '../src/gameplay/Profile';

/**
 * Outfit × vehicle check (docs/12 §6): seat the character in every vehicle,
 * wearing every hat with the tallest hairstyles, and with every back item,
 * exactly as the game seats them (seatRider), at the tallest height the
 * wardrobe allows. Nothing may stick up through a roof or hang below the
 * floor; riders are never shrunk below MIN_FIT_SCALE; hats only come off
 * under a roof, and only when they cannot fit.
 */
const hats = CATALOGUE.filter((i) => i.category === 'hat').map((i) => i.value as HumanLook['hat']);
const backs = CATALOGUE.filter((i) => i.category === 'back').map((i) => i.value as HumanLook['back']);
const tallHair: HumanLook['hairStyle'][] = ['curly', 'bun', 'ponytail'];

function ride(vi: number, look: HumanLook) {
  const v = new VehicleModel(VEHICLES[vi]);
  const h = new HumanModel(look);
  const fit = seatRider(v, h, look.height ?? 1);
  return { v, h, fit, over: riderOverflow(v, h) };
}

describe('Character × vehicle clipping', () => {
  it('no hat or hairstyle pokes through a roof (≥ 100 combinations)', () => {
    const clips: string[] = [];
    const hatsOff: string[] = [];
    let combos = 0;
    for (let vi = 0; vi < VEHICLES.length; vi++)
      for (const hat of hats)
        for (const hairStyle of tallHair) {
          combos++;
          const r = ride(vi, { ...DEFAULT_HUMAN_LOOK, hat, hairStyle, height: 1.1 });
          if (r.over > 0.001) clips.push(`${VEHICLES[vi].id} + ${hat} (${hairStyle}): ${r.over.toFixed(2)} m through`);
          expect(r.fit.scale).toBeGreaterThanOrEqual(MIN_FIT_SCALE);
          if (r.fit.hatOff) hatsOff.push(`${VEHICLES[vi].id}+${hat}`);
        }
    expect(combos).toBeGreaterThanOrEqual(100);
    expect(clips, clips.join('\n')).toEqual([]);
    // Only tall hats in closed vehicles come off.
    for (const h of new Set(hatsOff)) expect(h, h).toMatch(/wizard|conical|helmet|crown|sunhat|straw/);
  });

  it('ordinary riders keep their full size and hats', () => {
    for (let vi = 0; vi < VEHICLES.length; vi++) {
      const r = ride(vi, { ...DEFAULT_HUMAN_LOOK, hat: 'cap', height: 1 });
      expect(r.fit.scale, VEHICLES[vi].id).toBe(1);
      expect(r.fit.hatOff, VEHICLES[vi].id).toBe(false);
    }
  });

  it('back items stay under the roof and feet stay off the road', () => {
    const bad: string[] = [];
    for (let vi = 0; vi < VEHICLES.length; vi++)
      for (const back of backs) {
        const r = ride(vi, { ...DEFAULT_HUMAN_LOOK, back, height: 1.1 });
        // Feet may hang in open frames (buggy, scooter), but never touch the road.
        if (new THREE.Box3().setFromObject(r.h.root).min.y < 0.08) bad.push(`${VEHICLES[vi].id} + ${back}: touches the road`);
        if (r.over > 0.001) bad.push(`${VEHICLES[vi].id} + ${back}: through the roof`);
      }
    expect(bad, bad.join('\n')).toEqual([]);
  });
});

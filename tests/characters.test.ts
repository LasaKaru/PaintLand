import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { DEFAULT_HUMAN_LOOK, EMOTES, HumanModel, isEmote } from '../src/models/Human';
import { Pet, PET_KINDS, isPet } from '../src/models/Pets';
import { CATALOGUE, MAX_OUTFITS, Profile } from '../src/gameplay/Profile';

const finite = (o: THREE.Object3D): boolean => {
  let ok = true;
  o.updateMatrixWorld(true);
  o.traverse((c) => {
    for (const v of c.matrixWorld.elements) if (!Number.isFinite(v)) ok = false;
  });
  return ok;
};

describe('Emotes', () => {
  it('every emote poses the character differently from standing idle', () => {
    const pose = (e: Parameters<HumanModel['animate']>[1]): string => {
      const h = new HumanModel(DEFAULT_HUMAN_LOOK);
      for (let i = 0; i < 10; i++) h.animate(1 / 60, e, 0, 1.3 + i / 60);
      expect(finite(h.root), String(e)).toBe(true);
      const parts: number[] = [];
      h.root.traverse((c) => parts.push(c.rotation.x, c.rotation.y, c.rotation.z, c.position.y));
      return parts.map((v) => v.toFixed(3)).join(',');
    };
    const idle = pose('idle');
    const seen = new Set<string>();
    for (const e of EMOTES) {
      const p = pose(e);
      expect(p, e).not.toBe(idle);
      seen.add(p);
    }
    expect(seen.size).toBe(EMOTES.length);
  });

  it('only known emotes are accepted from the network', () => {
    expect(isEmote('ayubowan')).toBe(true);
    expect(isEmote('explode')).toBe(false);
    expect(isEmote(undefined)).toBe(false);
  });

  it('getting into a car after dancing sits straight', () => {
    const h = new HumanModel(DEFAULT_HUMAN_LOOK);
    h.animate(1 / 60, 'dance', 0, 0.3);
    h.animate(1 / 60, 'sit', 0, 0.4);
    expect(h.hips.rotation.y).toBe(0);
    expect(h.hips.rotation.z).toBe(0);
  });
});

describe('Pets', () => {
  it('follow their owner, catch up, and pop back when left far behind', () => {
    for (const kind of PET_KINDS) {
      const pet = new Pet(kind);
      const owner = new THREE.Vector3(0, 0, 0);
      for (let i = 0; i < 60; i++) pet.update(1 / 60, owner, 0, i / 60);
      expect(pet.root.position.distanceTo(owner), kind).toBeLessThan(2);
      // Walk 10 m north; the pet catches up.
      for (let i = 0; i < 300; i++) {
        owner.z -= (10 / 300);
        pet.update(1 / 60, owner, 0, 1 + i / 60);
      }
      for (let i = 0; i < 120; i++) pet.update(1 / 60, owner, 0, 6 + i / 60);
      expect(pet.root.position.distanceTo(owner), kind).toBeLessThan(2);
      // Fast travel far away: the pet appears beside you.
      owner.set(200, 3, 200);
      pet.update(1 / 60, owner, 1, 9);
      expect(Math.hypot(pet.root.position.x - 200, pet.root.position.z - 200), kind).toBeLessThan(2);
      expect(finite(pet.root)).toBe(true);
    }
  });

  it('the crane flies; the fox and cat stay on the ground', () => {
    const crane = new Pet('crane');
    const fox = new Pet('fox');
    const at = new THREE.Vector3();
    crane.update(1 / 60, at, 0, 0);
    fox.update(1 / 60, at, 0, 0);
    const top = (p: Pet): number => new THREE.Box3().setFromObject(p.root).min.y;
    expect(top(crane)).toBeGreaterThan(1.2);
    expect(top(fox)).toBeLessThan(0.1);
  });

  it('every pet in the shop is a real pet', () => {
    for (const i of CATALOGUE.filter((c) => c.category === 'pet' && c.value !== 'none')) expect(isPet(i.value), i.id).toBe(true);
  });
});

describe('Outfits and the Sri Lankan pack', () => {
  it('the pack gives every item it lists, for less than buying them one by one', () => {
    const pack = CATALOGUE.find((i) => i.id === 'pack:lanka')!;
    const p = new Profile();
    p.data.ink = 10000;
    expect(p.buy(pack)).toBe('ok');
    let separate = 0;
    for (const g of pack.grants!) {
      const item = CATALOGUE.find((i) => i.id === g);
      expect(item, g).toBeDefined();
      expect(p.owns(g), g).toBe(true);
      separate += item!.price;
    }
    expect(pack.price).toBeLessThan(separate);
  });

  it('the new clothes build without errors', () => {
    for (const topStyle of ['osariya', 'national'] as const) {
      const h = new HumanModel({ ...DEFAULT_HUMAN_LOOK, topStyle, bottomStyle: 'sarong', hat: 'natcap' });
      h.animate(1 / 60, 'ayubowan', 0, 0);
      expect(finite(h.root)).toBe(true);
    }
  });

  it('saves up to the limit, wears only owned items, and deletes', () => {
    const p = new Profile();
    p.data.outfits = [];
    p.data.look = { ...DEFAULT_HUMAN_LOOK, topStyle: 'tee', hat: 'none' };
    expect(p.saveOutfit('  Beach day  ')).toBe('ok');
    expect(p.data.outfits[0].name).toBe('Beach day');
    for (let i = 1; i < MAX_OUTFITS; i++) p.saveOutfit('');
    expect(p.saveOutfit('one too many')).toBe('full');
    // Wearing a look with an item you don't own keeps yours for that piece.
    p.data.owned = p.data.owned.filter((id) => id !== 'top:osariya');
    const missing = p.wearOutfit({ topStyle: 'osariya', top: '#d8463a' });
    expect(missing).toBe(1);
    expect(p.data.look.topStyle).toBe('tee');
    expect(p.data.look.top).toBe('#d8463a');
    p.deleteOutfit(0);
    expect(p.data.outfits.length).toBe(MAX_OUTFITS - 1);
  });
});

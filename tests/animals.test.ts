import { describe, expect, it } from 'vitest';
import { AnimalModel, COATS, SPECIES, type AnimalPose } from '../src/models/Animals';
import { AnimalLife } from '../src/world/AnimalLife';
import { FreeWorld } from '../src/gameplay/FreeRoam';
import { Random } from '../src/core/Random';
import { Population } from '../src/gameplay/Population';
import { chapterById } from '../src/world/Chapters';
import type { TownEnv } from '../src/world/TownLife';

const fakeEl = (): Record<string, unknown> => ({ style: {}, className: '', innerHTML: '', remove() {}, appendChild() {} });
(globalThis as { document?: unknown }).document ??= { createElement: fakeEl, documentElement: { lang: 'en' } };

const world = new FreeWorld({ minX: -80, maxX: 80, minZ: -80, maxZ: 80 });
const day: TownEnv = { hour: 12, rain: 0, car: null, onFoot: true, bpm: 96 };
const run = (life: AnimalLife, seconds: number, player: { x: number; z: number }, env = day): void => {
  for (let i = 0; i < seconds * 20; i++) life.update(1 / 20, i / 20, player, world, env);
};

describe('animals', () => {
  it('every animal builds in every coat and moves through every pose', () => {
    const poses: AnimalPose[] = ['idle', 'walk', 'run', 'sit', 'lie', 'eat', 'hop', 'fly', 'bow'];
    for (const sp of SPECIES)
      for (const coat of COATS[sp]) {
        const m = new AnimalModel(sp, coat);
        for (const p of poses) m.animate(1 / 30, p, 1, 1.3);
        m.root.updateMatrixWorld(true);
        m.root.traverse((o) => {
          for (const v of [o.position.x, o.position.y, o.position.z, o.rotation.x, o.rotation.y]) expect(Number.isFinite(v), `${sp} ${o.name}`).toBe(true);
        });
      }
  });

  it('crows take off when you walk up, and roost out of sight at night', () => {
    const life = new AnimalLife(new Random(1));
    const crow = life.add('crow', 0, 0);
    run(life, 0.5, { x: 2, z: 0 });
    expect(crow.state).toBe('fly');
    run(life, 0.5, { x: 2, z: 0 });
    expect(crow.y).toBeGreaterThan(0.5);
    run(life, 1, { x: 60, z: 60 }, { ...day, hour: 23 });
    expect(crow.model.root.visible).toBe(false);
  });

  it('deer bow to someone standing still in front of them (as in Nara)', () => {
    const life = new AnimalLife(new Random(2));
    const deer = life.add('deer', 0, 0);
    run(life, 2, { x: 0, z: -2 });
    expect(deer.state).toBe('bow');
    expect(deer.pose).toBe('bow');
  });

  it('a petted dog follows you about, wagging its tail', () => {
    const life = new AnimalLife(new Random(3));
    const dog = life.add('dog', 0, 0);
    life.pet(dog);
    expect(life.calls.length).toBe(1);
    const player = { x: 0, z: 0 };
    for (let i = 0; i < 200; i++) {
      player.x += 0.1;
      life.update(1 / 20, i / 20, player, world, day);
    }
    expect(dog.model.happy).toBe(true);
    expect(Math.hypot(dog.x - player.x, dog.z - player.z)).toBeLessThan(5);
  });

  it('everything but an elephant gets out of the way of a fast car', () => {
    const life = new AnimalLife(new Random(4));
    const dog = life.add('dog', 0, 0);
    const cow = life.add('cow', 10, 0);
    const ele = life.add('elephant', 20, 0);
    for (const car of [{ x: 0, z: 4 }, { x: 10, z: 4 }, { x: 20, z: 5 }]) {
      life.update(1 / 20, 0, { x: car.x, z: car.z }, world, { ...day, onFoot: false, car: { ...car, vx: 0, vz: -12 } });
    }
    expect(dog.state).toBe('flee');
    expect(cow.state).toBe('flee');
    expect(ele.state).not.toBe('flee');
  });

  it('towns have their own animals: deer in the Lantern Village, elephants in the Tea Hills', async () => {
    const { Hub } = await import('../src/world/Hub');
    const { Village } = await import('../src/world/Village');
    const { Hills } = await import('../src/world/Hills');
    const { City } = await import('../src/world/City');
    const species = async (A: new (el: HTMLElement) => { animals: AnimalLife }) => new Set(new A(fakeEl() as unknown as HTMLElement).animals.animals.map((a) => a.species));
    expect(await species(Hub)).toContain('dog');
    expect(await species(Village)).toContain('deer');
    expect(await species(Hills)).toContain('elephant');
    expect(await species(City)).toContain('crow');
  });

  it('roads have local animals: kangaroos only in Australia, cows in India, deer in Japan', () => {
    const kinds = (id: string): Set<string> => {
      const c = chapterById(id);
      return new Set(new Population(c.buildRoute(), c.id, c.districts.map((d) => d.id)).animals.map((a) => a.species));
    };
    expect(kinds('australia')).toContain('kangaroo');
    expect(kinds('india')).toContain('cow');
    expect(kinds('japan')).toContain('deer');
    for (const id of ['britain', 'india', 'serendib', 'japan']) expect(kinds(id).has('kangaroo'), id).toBe(false);
    // Built only when near, and they amble about without errors.
    const c = chapterById('australia');
    const pop = new Population(c.buildRoute(), c.id, c.districts.map((d) => d.id));
    expect(pop.animals.every((a) => a.model === null)).toBe(true);
    const roo = pop.animals[0];
    for (let i = 0; i < 100; i++) pop.update(1 / 20, i / 20, roo.s + 40, 0, 1);
    expect(roo.model).not.toBeNull();
    expect(Number.isFinite(roo.s)).toBe(true);
  });
});

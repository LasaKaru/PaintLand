import { describe, expect, it } from 'vitest';

// Every collectable and every mission target in every town can actually be
// reached: some free ground (or, out at sea, open water for the paper boat)
// lies within its pickup radius.
const fakeEl = (): Record<string, unknown> => ({ style: {}, className: '', innerHTML: '', remove() {}, appendChild() {} });
(globalThis as { document?: unknown }).document ??= { createElement: fakeEl, documentElement: { lang: 'en' } };
const { Hub } = await import('../src/world/Hub');
const { Village } = await import('../src/world/Village');
const { City } = await import('../src/world/City');
const { Hills } = await import('../src/world/Hills');
const { WorldsEnd } = await import('../src/world/WorldsEnd');
const { POCKET_REACH } = await import('../src/world/Pockets');
const { CITY_MISSIONS, missionArea } = await import('../src/gameplay/CityMissions');
const { FreeCar } = await import('../src/gameplay/FreeRoam');
const { tuningFor } = await import('../src/models/Vehicles');
type Area = InstanceType<typeof Hub>;

const el = (): HTMLElement => fakeEl() as unknown as HTMLElement;
const areas = [new Hub(el()), new Village(el()), new City(el()), new Hills(el()), new WorldsEnd(el())] as unknown as Area[];

const WALKER = 0.35;
const CAR = 1.35;
const BOAT_RANGE = 90; // see Game.fitHubCar

/** Some point within r of (x, z) where a body of `radius` fits (up to maxZ). */
function reachable(area: Area, x: number, z: number, r: number, radius: number, maxZ?: number): boolean {
  for (let d = 0; d <= r; d += 0.5) {
    const n = d === 0 ? 1 : Math.ceil((2 * Math.PI * d) / 0.5);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const p = { x: x + Math.cos(a) * d, z: z + Math.sin(a) * d };
      if (area.world.resolve({ ...p }, radius, maxZ) === null) return true;
    }
  }
  return false;
}

/** On foot, or by paper boat past the quay. */
const pickable = (area: Area, x: number, z: number, r: number): boolean =>
  reachable(area, x, z, r, WALKER) || (area.seaZ !== undefined && reachable(area, x, z, r, CAR, area.seaZ + BOAT_RANGE));

describe('everything in the towns can be reached', () => {
  it.each(areas.map((a) => [a.id, a] as const))('%s: secrets, chests and pockets', (_id, area) => {
    const bad: string[] = [];
    for (const s of area.secrets) if (!pickable(area, s.x, s.z, 2.6 - 0.2)) bad.push(`secret ${s.id}`);
    for (const c of area.chests) if (!pickable(area, c.x, c.z, 3 - 0.2)) bad.push(`chest ${c.id}`);
    for (const p of area.pockets ?? []) if (!pickable(area, p.x, p.z, POCKET_REACH - 0.2)) bad.push(`pocket ${p.def.id}`);
    expect(bad).toEqual([]);
  });

  it('every city mission target has room for the car (or the walker, on foot steps)', () => {
    const bad: string[] = [];
    for (const m of CITY_MISSIONS) {
      const area = areas.find((a) => a.id === missionArea(m))!;
      expect(area, m.id).toBeTruthy();
      m.steps.forEach((st, i) => {
        for (const t of st.targets) if (!reachable(area, t.x, t.z, t.r * 0.8, st.kind === 'onfoot' || st.kind === 'photo' ? WALKER : CAR)) bad.push(`${m.id} step ${i}`);
      });
    }
    expect(bad).toEqual([]);
  });

  it.each(areas.filter((a) => a.stunts.length).map((a) => [a.id, a] as const))('%s: every stunt jump can be landed from a straight run-up', (_id, area) => {
    const bad: string[] = [];
    for (const st of area.stunts) {
      const h = st.ramp.heading;
      const car = new FreeCar(tuningFor('rover'));
      car.place(st.ramp.x + Math.sin(h) * 60, st.ramp.z + Math.cos(h) * 60, h);
      let flew = false;
      const out: { landed: { x: number; z: number } | null } = { landed: null };
      car.onLand = () => (out.landed ??= { x: car.x, z: car.z });
      for (let i = 0; i < 60 * 12 && !out.landed; i++) {
        const err = Math.atan2(Math.sin(h - car.heading), Math.cos(h - car.heading));
        car.step(1 / 60, { throttle: 1, brake: 0, steer: Math.max(-1, Math.min(1, -err * 3)), hop: false, boost: true, drift: false }, area.world);
        if (!car.grounded) flew = true;
      }
      const miss = out.landed ? Math.hypot(out.landed.x - st.land.x, out.landed.z - st.land.z) : Infinity;
      if (!flew || miss > st.land.r) bad.push(`${st.id}: ${flew ? `landed ${miss.toFixed(0)} m from the pad` : 'never took off'}`);
    }
    expect(bad).toEqual([]);
  });
});


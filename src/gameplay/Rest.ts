/**
 * Resting at home: sit on the sofa, sleep, make tea, water the plants, pet
 * your pet. Resting makes you "well rested" for a while (a little more ink
 * from everything). There is no tiredness or hunger: resting is a reward,
 * never a chore. Pure functions over the saved state (times in ms).
 */

export interface RestState {
  /** Well rested until this time (ms since 1970); 0 = not. */
  until: number;
  /** The plants by the window: last watered (day key), growth 0..3 (3 = in bloom), days watered. */
  plants: { watered: string; stage: number; days: number };
}

export const REST_RULES = {
  /** How much more ink while well rested. */
  bonus: 0.1,
  /** Most rest you can bank, in minutes. */
  maxMinutes: 40,
  /** Rest from each thing, in minutes. */
  minutes: { sofa: 15, tea: 8, pet: 5, bed: 40 },
  /** Sit this long on the sofa before it counts. */
  sofaSeconds: 12,
  /** Days of watering between growth stages. */
  daysPerStage: 2,
  /** Ink from blooming plants each day you water them. */
  bloomInk: 25,
};

export const newRest = (): RestState => ({ until: 0, plants: { watered: '', stage: 0, days: 0 } });

/** Minutes of rest left (0 = not rested). */
export function restedMinutes(s: RestState | undefined, now: number): number {
  return s ? Math.max(0, (s.until - now) / 60000) : 0;
}

/** The ink multiplier now. */
export function restBonus(s: RestState | undefined, now: number): number {
  return restedMinutes(s, now) > 0 ? 1 + REST_RULES.bonus : 1;
}

/** Add rest (capped); returns the minutes now banked. */
export function addRest(s: RestState, minutes: number, now: number): number {
  const left = restedMinutes(s, now);
  const next = Math.min(REST_RULES.maxMinutes, left + minutes);
  s.until = now + next * 60000;
  return next;
}

/** Water the plants: once a day; they grow every few days and bloom at stage 3. */
export function waterPlants(s: RestState, day: string): { ok: boolean; grew: boolean; bloomInk: number } {
  const p = s.plants;
  if (p.watered === day) return { ok: false, grew: false, bloomInk: 0 };
  p.watered = day;
  p.days++;
  const stage = Math.min(3, Math.floor(p.days / REST_RULES.daysPerStage));
  const grew = stage > p.stage;
  p.stage = stage;
  return { ok: true, grew, bloomInk: stage >= 3 ? REST_RULES.bloomInk : 0 };
}

/** When you wake: after dark (or in the small hours) you sleep till morning; in the day you nap till evening. */
export function wakeHour(hour: number): number {
  return hour >= 17 || hour < 5 ? 7 : 19;
}

/** Tidy a saved rest state (from an old or damaged save). */
export function cleanRest(v: unknown): RestState {
  const base = newRest();
  if (!v || typeof v !== 'object') return base;
  const o = v as Partial<RestState>;
  const p = (o.plants ?? {}) as Partial<RestState['plants']>;
  return {
    until: Number.isFinite(o.until) ? Math.max(0, Number(o.until)) : 0,
    plants: { watered: typeof p.watered === 'string' ? p.watered.slice(0, 12) : '', stage: Math.min(3, Math.max(0, Math.floor(Number(p.stage) || 0))), days: Math.max(0, Math.floor(Number(p.days) || 0)) },
  };
}

import type { Random } from '../core/Random';
import type { FoodId } from './Bazaar';

export type CookStep = 'chop' | 'stir' | 'serve';
export const COOK_STEPS: CookStep[] = ['chop', 'stir', 'serve'];
export const STEP_ICON: Record<CookStep, string> = { chop: '🔪', stir: '🥄', serve: '🍽' };

/** Minutes well fed after a home-cooked dish: more than a stall snack, more still for a good one. */
export function cookedMinutes(hits: number): number {
  return 15 + hits * 5;
}

/**
 * Cooking at home (docs/06 "rest at home"): a dish you've tasted at a street
 * stall, in three steps — chop, stir, serve. For each, a marker sweeps back and
 * forth along a bar; press E as it passes the target. Each hit is a star, and
 * a better dish keeps you well fed for longer.
 */
export class CookGame {
  step = 0;
  hits = 0;
  /** The sweeping marker (0..1) and which way it's going. */
  marker = 0;
  private dir = 1;
  /** Where to press (0..1) and how wide the window is. */
  target = 0.5;
  readonly window = 0.16;
  /** A short pause after each press (to show how it went). */
  pause = 0;
  last: 'hit' | 'miss' | null = null;

  constructor(
    readonly dish: FoodId,
    private readonly rnd: Random,
  ) {
    this.target = rnd.range(0.2, 0.8);
  }

  get done(): boolean {
    return this.step >= COOK_STEPS.length;
  }

  get current(): CookStep | null {
    return COOK_STEPS[this.step] ?? null;
  }

  /** Sweeps faster with each step. */
  get speed(): number {
    return 0.7 + this.step * 0.35;
  }

  update(dt: number): void {
    // The pause runs down after the last step too (so the dish gets served).
    if (this.pause > 0) {
      this.pause -= dt;
      return;
    }
    if (this.done) return;
    this.marker += this.dir * this.speed * dt;
    if (this.marker > 1) {
      this.marker = 2 - this.marker;
      this.dir = -1;
    } else if (this.marker < 0) {
      this.marker = -this.marker;
      this.dir = 1;
    }
  }

  /** Press E: a hit when the marker is on the target. */
  press(): 'hit' | 'miss' | null {
    if (this.done || this.pause > 0) return null;
    this.last = Math.abs(this.marker - this.target) <= this.window / 2 ? 'hit' : 'miss';
    if (this.last === 'hit') this.hits++;
    this.step++;
    this.pause = 0.6;
    this.target = this.rnd.range(0.15, 0.85);
    return this.last;
  }
}

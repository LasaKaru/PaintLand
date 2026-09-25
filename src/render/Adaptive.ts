/**
 * Adaptive effects (docs/11 §4): dynamic resolution goes first; when the
 * render scale is already at its floor and frames are still slow, shed one
 * effect at a time — sun shafts, ambient occlusion, bloom, soft shadows,
 * draw distance — and bring them back, in reverse, once there is headroom.
 * Levels never touch the saved settings; they cap what the pipeline uses.
 */
export const ADAPTIVE_STEPS = ['shafts', 'ao', 'bloom', 'shadows', 'distance'] as const;
export const ADAPTIVE_MAX = ADAPTIVE_STEPS.length;

export class AdaptiveGovernor {
  level = 0;
  private slow = 0;
  private fast = 0;

  /**
   * One measurement window: the 80th-percentile frame time (s) and the current
   * dynamic render scale. Returns true when the level changed.
   */
  step(p80: number, dynamicScale: number, floor = 0.56): boolean {
    if (p80 > 1 / 40 && dynamicScale <= floor) {
      this.fast = 0;
      if (++this.slow >= 2 && this.level < ADAPTIVE_MAX) {
        this.level++;
        this.slow = 0;
        return true;
      }
    } else if (p80 < 1 / 58 && dynamicScale >= 1) {
      this.slow = 0;
      if (++this.fast >= 4 && this.level > 0) {
        this.level--;
        this.fast = 0;
        return true;
      }
    } else {
      this.slow = 0;
      this.fast = 0;
    }
    return false;
  }

  /** Is this effect currently shed? */
  off(step: (typeof ADAPTIVE_STEPS)[number]): boolean {
    return ADAPTIVE_STEPS.indexOf(step) < this.level;
  }

  reset(): void {
    this.level = 0;
    this.slow = 0;
    this.fast = 0;
  }
}

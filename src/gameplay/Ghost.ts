/**
 * Time-trial ghosts (docs/06 §4, docs/09 §6): the rover's road-relative state
 * is only four numbers, so a whole lap at 20 samples a second is a few
 * kilobytes. The best lap per chapter is saved and replayed as a see-through car.
 */
export interface GhostSample {
  t: number;
  s: number;
  x: number;
  h: number;
  yaw: number;
}

export interface GhostRun {
  chapter: string;
  vehicle: string;
  time: number;
  /** Flat array: t, s, x, h, yaw, t, s, … (rounded to keep saves small). */
  data: number[];
}

const RATE = 1 / 20;

export class GhostRecorder {
  private data: number[] = [];
  private next = 0;

  reset(): void {
    this.data = [];
    this.next = 0;
  }

  /** Call every sim step with the lap clock. */
  record(t: number, s: number, x: number, h: number, yaw: number): void {
    if (t + 1e-6 < this.next) return;
    // Advance on a fixed grid so 60 Hz steps give exactly 20 samples a second.
    this.next += RATE;
    if (this.next < t) this.next = t + RATE;
    this.data.push(round(t, 100), round(s, 100), round(x, 100), round(h, 100), round(yaw, 1000));
  }

  get length(): number {
    return this.data.length / 5;
  }

  finish(chapter: string, vehicle: string, time: number): GhostRun {
    return { chapter, vehicle, time, data: this.data.slice() };
  }
}

/** Interpolated playback of a saved run. */
export class GhostPlayer {
  private i = 0;
  readonly out: GhostSample = { t: 0, s: 0, x: 0, h: 0, yaw: 0 };

  constructor(readonly run: GhostRun) {}

  get count(): number {
    return this.run.data.length / 5;
  }

  /** State at lap time `t`, or null once the run is over. */
  at(t: number): GhostSample | null {
    const d = this.run.data;
    const n = this.count;
    if (n < 2 || t > d[(n - 1) * 5]) return null;
    if (t < d[this.i * 5]) this.i = 0;
    while (this.i < n - 2 && d[(this.i + 1) * 5] <= t) this.i++;
    const a = this.i * 5;
    const b = a + 5;
    const span = d[b] - d[a];
    const k = span > 0 ? Math.min(1, Math.max(0, (t - d[a]) / span)) : 0;
    const o = this.out;
    o.t = t;
    o.s = d[a + 1] + (d[b + 1] - d[a + 1]) * k;
    o.x = d[a + 2] + (d[b + 2] - d[a + 2]) * k;
    o.h = d[a + 3] + (d[b + 3] - d[a + 3]) * k;
    o.yaw = d[a + 4] + (d[b + 4] - d[a + 4]) * k;
    return o;
  }
}

const KEY = (chapter: string): string => `paintland.ghost.${chapter}`;

export function loadGhost(chapter: string): GhostRun | null {
  try {
    const raw = localStorage.getItem(KEY(chapter));
    if (!raw) return null;
    const run = JSON.parse(raw) as GhostRun;
    return Array.isArray(run.data) && run.data.length >= 10 ? run : null;
  } catch {
    return null;
  }
}

export function saveGhost(run: GhostRun): void {
  try {
    localStorage.setItem(KEY(run.chapter), JSON.stringify(run));
  } catch {
    /* storage full or blocked: the ghost lives for this session only */
  }
}

function round(v: number, k: number): number {
  return Math.round(v * k) / k;
}

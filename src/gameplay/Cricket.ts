import type { Random } from '../core/Random';

/** How a shot went: a six, a four, runs, a dot ball (missed, but safe) or bowled. */
export type Shot = 'six' | 'four' | 'runs' | 'dot' | 'bowled';

export type BallPhase = 'runup' | 'flight' | 'result' | 'done';

export interface Ball {
  /** Seconds the ball takes from the bowler's hand to the bat. */
  flight: number;
  /** A short ball bounces early and comes up high. */
  short: boolean;
  /** On the stumps: a miss is out. */
  onStumps: boolean;
}

/** Timing windows (seconds either side of the ball reaching the bat). */
export const WINDOWS = { six: 0.06, four: 0.12, runs: 0.2 };

/** Balls in an over. */
export const OVER = 6;

/**
 * Street cricket (docs/06 "things to do"): six balls from a local kid
 * bowler. Press E (or Space) as the ball reaches you: dead on for a six,
 * close for a four, near enough for a run or two. Miss one on the stumps and
 * you're bowled. Runs pay ink; the best innings is kept.
 */
export class CricketMatch {
  phase: BallPhase = 'runup';
  /** Seconds into the current phase. */
  t = 0;
  ball: Ball;
  balls = 0;
  runs = 0;
  out = false;
  /** The last shot and how many runs it made. */
  last: { shot: Shot; runs: number; timing: number } | null = null;
  /** Did the player swing at this ball? */
  swung = false;
  private readonly runup = 1.4;

  constructor(private readonly rnd: Random) {
    this.ball = this.newBall();
  }

  private newBall(): Ball {
    const short = this.rnd.chance(0.25);
    return { flight: this.rnd.range(0.75, 1.1) + (short ? 0.12 : 0), short, onStumps: this.rnd.chance(0.6) };
  }

  /** 0..1 along the ball's flight (only while it's in the air). */
  get progress(): number {
    return this.phase === 'flight' ? Math.min(1, this.t / this.ball.flight) : this.phase === 'runup' ? 0 : 1;
  }

  /** Where the ball is: `along` 0 at the bowler's hand, 1 at the bat; `height` in metres. */
  ballPosition(): { along: number; height: number } {
    const p = this.progress;
    // Released at 2 m, bounces once (earlier for a short ball) and rises to bat height.
    const bounce = this.ball.short ? 0.45 : 0.72;
    const height = p < bounce ? 2 - (2 * p) / bounce : ((p - bounce) / (1 - bounce)) * (this.ball.short ? 1.5 : 0.8);
    return { along: p, height: Math.max(0.05, height) };
  }

  /** Swing the bat now. Returns the shot, or null when it's not the moment to swing. */
  swing(): Shot | null {
    if (this.phase !== 'flight' || this.swung) return null;
    this.swung = true;
    const timing = this.t - this.ball.flight;
    const a = Math.abs(timing);
    if (a <= WINDOWS.six) return this.score('six', 6, timing);
    if (a <= WINDOWS.four) return this.score('four', 4, timing);
    if (a <= WINDOWS.runs) return this.score('runs', a < 0.16 ? 2 : 1, timing);
    // Swung and missed: if it's before the ball arrives, wait and see what the ball does.
    if (timing < 0) {
      this.swung = true;
      return null;
    }
    return this.miss(timing);
  }

  private score(shot: Shot, runs: number, timing: number): Shot {
    this.runs += runs;
    this.last = { shot, runs, timing };
    this.endBall();
    return shot;
  }

  private miss(timing: number): Shot {
    const shot: Shot = this.ball.onStumps ? 'bowled' : 'dot';
    if (shot === 'bowled') this.out = true;
    this.last = { shot, runs: 0, timing };
    this.endBall();
    return shot;
  }

  private endBall(): void {
    this.balls++;
    this.phase = 'result';
    this.t = 0;
  }

  get over(): boolean {
    return this.phase === 'done';
  }

  /** Advance time; returns a shot when a ball ends by itself (not swung at, or swung too early). */
  step(dt: number): Shot | null {
    this.t += dt;
    switch (this.phase) {
      case 'runup':
        if (this.t >= this.runup) {
          this.phase = 'flight';
          this.t = 0;
        }
        return null;
      case 'flight':
        // Past the bat without a hit.
        if (this.t > this.ball.flight + WINDOWS.runs) return this.miss(this.t - this.ball.flight);
        return null;
      case 'result':
        if (this.t >= 1.6) {
          if (this.out || this.balls >= OVER) this.phase = 'done';
          else {
            this.phase = 'runup';
            this.t = 0;
            this.swung = false;
            this.ball = this.newBall();
          }
        }
        return null;
      default:
        return null;
    }
  }

  /** Start a fresh over. */
  reset(): void {
    this.balls = 0;
    this.runs = 0;
    this.out = false;
    this.phase = 'runup';
    this.t = 0;
    this.swung = false;
    this.last = null;
    this.ball = this.newBall();
  }

  /** Ink for an innings. */
  static reward(runs: number): number {
    return runs * 3;
  }
}

/** Street cricket pitches in the towns: the batting end (where you stand) and which way the bowler is. */
export const PITCHES: { id: string; area: string; x: number; z: number; yaw: number }[] = [
  { id: 'galle-face', area: 'city', x: -230, z: 470, yaw: Math.PI / 2 },
  { id: 'harbour-green', area: 'harbour', x: 60, z: 30, yaw: Math.PI / 2 },
  { id: 'hills-ground', area: 'hills', x: 58, z: -28, yaw: Math.PI / 2 },
];

/** Length of the pitch: bowler's release point to the bat. */
export const PITCH_LENGTH = 18;

/**
 * Bowling an over to the local kids: a marker sweeps back and forth, and you
 * press E to bowl as it crosses the target. The better the ball, the likelier
 * the kid batter mistimes it and is bowled; a loose one goes for four or six.
 */
export class BowlOver {
  phase: 'aim' | 'ball' | 'done' = 'aim';
  marker = 0;
  private dir = 1;
  target = 0.5;
  balls = 0;
  wickets = 0;
  runs = 0;
  last: Shot | null = null;

  constructor(private readonly rnd: Random) {
    this.target = rnd.range(0.25, 0.75);
  }

  update(dt: number): void {
    if (this.phase !== 'aim') return;
    this.marker += this.dir * 1.2 * dt;
    if (this.marker > 1) {
      this.marker = 2 - this.marker;
      this.dir = -1;
    } else if (this.marker < 0) {
      this.marker = -this.marker;
      this.dir = 1;
    }
  }

  /** Bowl now: returns how good the ball is (0..1), or null when not aiming. */
  release(): number | null {
    if (this.phase !== 'aim') return null;
    this.phase = 'ball';
    return Math.max(0, 1 - Math.abs(this.marker - this.target) / 0.35);
  }

  /** The kid batter's timing error for a ball of quality `a` (seconds; 0 = perfect). */
  batterError(a: number): number {
    const sign = this.rnd.chance(0.5) ? -1 : 1;
    return sign * (a > 0.6 ? this.rnd.range(0.12, 0.35) : a > 0.3 ? this.rnd.range(0.05, 0.18) : this.rnd.range(0, 0.07));
  }

  /** How the ball went. */
  result(shot: Shot, runs: number): void {
    this.balls++;
    this.last = shot;
    if (shot === 'bowled') this.wickets++;
    this.runs += runs;
    this.target = this.rnd.range(0.2, 0.8);
    this.phase = this.balls >= OVER ? 'done' : 'aim';
  }

  /** Ink for an over: wickets and tight bowling pay. */
  static reward(wickets: number, runs: number): number {
    return wickets * 30 + Math.max(0, 18 - runs) * 2;
  }
}

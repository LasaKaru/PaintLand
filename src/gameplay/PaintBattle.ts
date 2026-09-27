/**
 * Paint Battle: two teams, pink and teal, lob paint balloons in a circle of
 * a free-roam town for two minutes. Balloons splat the ground in your team's
 * colour; one that bursts on a player sends them back to their team's base
 * for a moment. The team that has painted more of the ground at the end wins.
 * No weapons and no damage — it is a paint fight, like a festival water fight.
 *
 * The rules live here, free of rendering and networking, so they can be
 * tested. Every player simulates every balloon the same way from its launch
 * (position and velocity), so the splats land in the same places for everyone.
 * Each player decides only whether *they* were hit.
 */
import { clamp } from '../core/MathUtil';

export type Team = 0 | 1;

export const BATTLE = {
  seconds: 120,
  startDelay: 5,
  /** Arena radius (m) around where the battle started. */
  radius: 36,
  /** Ground paint resolution (m per cell). */
  cell: 1,
  splat: 2.4,
  /** Launch speed (m/s) and gravity: a long lob reaches about 27 m. */
  speed: 22,
  gravity: 18,
  /** A balloon bursts on a player within this distance of their middle. */
  hit: 1.1,
  /** Seconds back at the base after being splatted. */
  respawn: 3,
  /** Seconds between two throws from the same player. */
  gap: 0.25,
  /** Paint tank: each throw uses `cost`; it refills, faster on your own colour. */
  cost: 0.1,
  refill: 0.18,
  refillOwn: 0.6,
  ink: { part: 30, win: 90 },
  maxShots: 200,
} as const;

export const TEAM_COLOURS = ['#e8559a', '#3ec9c0'] as const;
/** The same colours in the paint-trail palette (the ground paint is drawn as trail dabs). */
export const TEAM_TRAIL = [9, 5] as const;

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Balloon {
  owner: string;
  team: Team;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
}

/** Someone on the field that balloons can hit (you, and bots in a solo game). */
export interface Target {
  id: string;
  team: Team;
  x: number;
  z: number;
}

export type BattleEvent = { kind: 'splat'; x: number; z: number; team: Team; owner: string } | { kind: 'hit'; victim: string; by: string; team: Team };

/** Ground paint: a grid over the arena. -2 = not paintable (a wall), -1 = bare, 0/1 = team. */
export class PaintGrid {
  readonly n: number;
  readonly cells: Int8Array;
  private readonly x0: number;
  private readonly z0: number;
  /** Cells that changed since the last `takeDirty()` (for redrawing). */
  private dirty = new Set<number>();
  readonly paintable: number;

  constructor(
    readonly cx: number,
    readonly cz: number,
    readonly radius: number,
    isFree: (x: number, z: number) => boolean,
    readonly size: number = BATTLE.cell,
  ) {
    this.n = Math.ceil((radius * 2) / size);
    this.x0 = cx - radius;
    this.z0 = cz - radius;
    this.cells = new Int8Array(this.n * this.n).fill(-2);
    let count = 0;
    for (let j = 0; j < this.n; j++)
      for (let i = 0; i < this.n; i++) {
        const { x, z } = this.centre(i + j * this.n);
        if (Math.hypot(x - cx, z - cz) <= radius && isFree(x, z)) {
          this.cells[i + j * this.n] = -1;
          count++;
        }
      }
    this.paintable = count;
  }

  centre(k: number): { x: number; z: number } {
    const i = k % this.n;
    const j = (k - i) / this.n;
    return { x: this.x0 + (i + 0.5) * this.size, z: this.z0 + (j + 0.5) * this.size };
  }

  index(x: number, z: number): number {
    const i = Math.floor((x - this.x0) / this.size);
    const j = Math.floor((z - this.z0) / this.size);
    if (i < 0 || j < 0 || i >= this.n || j >= this.n) return -1;
    return i + j * this.n;
  }

  ownerAt(x: number, z: number): number {
    const k = this.index(x, z);
    return k < 0 ? -2 : this.cells[k];
  }

  inside(x: number, z: number): boolean {
    return Math.hypot(x - this.cx, z - this.cz) <= this.radius;
  }

  /** Paint a disc; returns how many cells changed colour. */
  splat(x: number, z: number, r: number, team: Team): number {
    let changed = 0;
    const lo = Math.floor(-r / this.size) - 1;
    const hi = -lo;
    const c = this.index(x, z);
    if (c < 0 && !this.inside(x, z)) return 0;
    for (let dj = lo; dj <= hi; dj++)
      for (let di = lo; di <= hi; di++) {
        const k = this.index(x + di * this.size, z + dj * this.size);
        if (k < 0 || this.cells[k] === -2 || this.cells[k] === team) continue;
        const p = this.centre(k);
        if (Math.hypot(p.x - x, p.z - z) > r) continue;
        this.cells[k] = team;
        this.dirty.add(k);
        changed++;
      }
    return changed;
  }

  /** Painted cells per team. */
  coverage(): [number, number] {
    let a = 0;
    let b = 0;
    for (const c of this.cells) {
      if (c === 0) a++;
      else if (c === 1) b++;
    }
    return [a, b];
  }

  takeDirty(): number[] {
    const out = [...this.dirty];
    this.dirty.clear();
    return out;
  }
}

/** Throw direction from where you are looking: yaw as elsewhere (forward = (−sin, −cos)) and an upward angle. */
export function throwVelocity(yaw: number, elevation: number, speed: number = BATTLE.speed): Vec3 {
  const e = clamp(elevation, -0.3, 1.2);
  return { x: -Math.sin(yaw) * Math.cos(e) * speed, y: Math.sin(e) * speed, z: -Math.cos(yaw) * Math.cos(e) * speed };
}

/** The lob that lands `d` metres away on flat ground (the lower arc), or the longest one. */
export function lobFor(d: number, speed: number = BATTLE.speed, g: number = BATTLE.gravity): number {
  const k = (g * d) / (speed * speed);
  return k >= 1 ? Math.PI / 4 : 0.5 * Math.asin(k);
}

/** Where a balloon thrown from `from` with velocity `v` comes down (y = 0). */
export function landingPoint(from: Vec3, v: Vec3, g: number = BATTLE.gravity): { x: number; z: number; t: number } {
  // y(t) = y0 + vy t − g t² / 2 = 0
  const t = (v.y + Math.sqrt(Math.max(0, v.y * v.y + 2 * g * Math.max(0, from.y)))) / g;
  return { x: from.x + v.x * t, z: from.z + v.z * t, t };
}

export interface BattleSetup {
  id: string;
  cx: number;
  cz: number;
  /** Everyone playing and their team (players' relay ids, and bot ids). */
  teams: [string, Team][];
}

/** Split players into two teams, evenly, the same way on every computer. */
export function splitTeams(ids: string[]): [string, Team][] {
  return [...ids].sort().map((id, i) => [id, (i % 2) as Team]);
}

export class PaintBattle {
  readonly startAt: number;
  readonly endAt: number;
  readonly teams: Map<string, Team>;
  readonly balloons: Balloon[] = [];
  /** Your paint tank, 0 … 1. */
  tank = 1;
  /** Seconds left back at the base (after being splatted), by player. */
  readonly out = new Map<string, number>();
  /** Splats you scored on other players, and times you were splatted. */
  hits = 0;
  splatted = 0;
  done = false;
  private readonly lastThrow = new Map<string, number>();

  constructor(
    readonly setup: BattleSetup,
    readonly grid: PaintGrid,
    now: number,
  ) {
    this.startAt = now + BATTLE.startDelay;
    this.endAt = this.startAt + BATTLE.seconds;
    this.teams = new Map(setup.teams);
  }

  get running(): boolean {
    return !this.done;
  }

  live(now: number): boolean {
    return !this.done && now >= this.startAt && now <= this.endAt;
  }

  /** Where a team comes back in after a splat: opposite edges of the arena. */
  base(team: Team): { x: number; z: number } {
    const s = team === 0 ? -1 : 1;
    return { x: this.grid.cx + s * this.grid.radius * 0.8, z: this.grid.cz };
  }

  /**
   * A throw (yours, a bot's, or one a friend sent). Returns the balloon, or
   * null when it isn't allowed: not playing, not in the battle, too soon
   * after the last one, too fast, or (for you) an empty tank.
   */
  throw(owner: string, from: Vec3, v: Vec3, now: number, mine = false): Balloon | null {
    const team = this.teams.get(owner);
    if (team === undefined || !this.live(now) || (this.out.get(owner) ?? 0) > 0) return null;
    if (now - (this.lastThrow.get(owner) ?? -1e9) < BATTLE.gap * 0.9) return null;
    if (Math.hypot(v.x, v.y, v.z) > BATTLE.speed * 1.05) return null;
    if (!this.grid.inside(from.x, from.z) && Math.hypot(from.x - this.grid.cx, from.z - this.grid.cz) > this.grid.radius + 6) return null;
    if (mine) {
      if (this.tank < BATTLE.cost) return null;
      this.tank -= BATTLE.cost;
    }
    if (this.balloons.length >= BATTLE.maxShots) this.balloons.shift();
    this.lastThrow.set(owner, now);
    const b: Balloon = { owner, team, x: from.x, y: from.y, z: from.z, vx: v.x, vy: v.y, vz: v.z, age: 0 };
    this.balloons.push(b);
    return b;
  }

  /**
   * Move the balloons; burst them on the ground (paint) or on a target
   * (only `targets` — the players this computer speaks for — can be hit here).
   */
  update(dt: number, targets: readonly Target[], me: { id: string; x: number; z: number } | null = null): BattleEvent[] {
    const out: BattleEvent[] = [];
    for (const [id, t] of this.out) this.out.set(id, Math.max(0, t - dt));
    if (me) {
      const team = this.teams.get(me.id);
      const own = team !== undefined && this.grid.ownerAt(me.x, me.z) === team;
      this.tank = Math.min(1, this.tank + (own ? BATTLE.refillOwn : BATTLE.refill) * dt);
    }
    for (let i = this.balloons.length - 1; i >= 0; i--) {
      const b = this.balloons[i];
      b.age += dt;
      b.vy -= BATTLE.gravity * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;
      let burst = false;
      for (const t of targets) {
        if (t.team === b.team || (this.out.get(t.id) ?? 0) > 0) continue;
        if (b.y > 0 && b.y < 2 && Math.hypot(b.x - t.x, b.z - t.z) < BATTLE.hit) {
          this.out.set(t.id, BATTLE.respawn);
          out.push({ kind: 'hit', victim: t.id, by: b.owner, team: b.team });
          burst = true;
          break;
        }
      }
      if (!burst && b.y <= 0) burst = true;
      if (burst || b.age > 6) {
        if (burst) {
          this.grid.splat(b.x, b.z, BATTLE.splat, b.team);
          out.push({ kind: 'splat', x: b.x, z: b.z, team: b.team, owner: b.owner });
        }
        this.balloons.splice(i, 1);
      }
    }
    return out;
  }

  /** Share of the paintable ground per team (0 … 1). */
  shares(): [number, number] {
    const [a, b] = this.grid.coverage();
    const n = Math.max(1, this.grid.paintable);
    return [a / n, b / n];
  }

  winner(): Team | null {
    const [a, b] = this.grid.coverage();
    return a === b ? null : a > b ? 0 : 1;
  }
}

// ————— bots (solo battles) —————

export interface Bot {
  id: string;
  name: string;
  team: Team;
  x: number;
  z: number;
  heading: number;
  goal: { x: number; z: number } | null;
  think: number;
  /** A little aim wobble so bots miss sometimes. */
  wobble: number;
}

export const BOT_NAMES = ['Kavi', 'Nila', 'Ravi', 'Mali', 'Sena', 'Tara', 'Dilu', 'Anu'];

export function makeBots(count: number, team: Team, start: { x: number; z: number }, seed: number): Bot[] {
  const out: Bot[] = [];
  for (let i = 0; i < count; i++) {
    const name = BOT_NAMES[(seed + i * 3 + team * 5) % BOT_NAMES.length];
    out.push({ id: `bot-${team}-${i}`, name, team, x: start.x + (i - (count - 1) / 2) * 2.5, z: start.z + (i % 2 ? 2 : -2), heading: 0, goal: null, think: 0, wobble: 0.15 + ((seed + i) % 5) * 0.04 });
  }
  return out;
}

/**
 * One bot's decision: where to walk (a unit direction, or zero) and, maybe, a
 * throw. Bots throw at the nearest opponent in range, or else paint the
 * ground toward bare or enemy-coloured patches.
 */
export function botStep(
  bot: Bot,
  battle: PaintBattle,
  enemies: readonly { x: number; z: number }[],
  dt: number,
  rnd: () => number,
): { dx: number; dz: number; throw: Vec3 | null } {
  const g = battle.grid;
  bot.think -= dt;
  let target: { x: number; z: number } | null = null;
  let best = 22;
  for (const e of enemies) {
    const d = Math.hypot(e.x - bot.x, e.z - bot.z);
    if (d < best) {
      best = d;
      target = e;
    }
  }
  if (!bot.goal || bot.think <= 0 || Math.hypot(bot.goal.x - bot.x, bot.goal.z - bot.z) < 2) {
    bot.think = 1.5 + rnd() * 2;
    // Look for a patch that isn't ours yet (a few random tries).
    let goal = null as { x: number; z: number } | null;
    for (let i = 0; i < 12 && !goal; i++) {
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd()) * g.radius * 0.9;
      const x = g.cx + Math.cos(a) * r;
      const z = g.cz + Math.sin(a) * r;
      const o = g.ownerAt(x, z);
      if (o !== -2 && o !== bot.team) goal = { x, z };
    }
    bot.goal = goal ?? { x: g.cx, z: g.cz };
  }
  // Keep a little distance from an opponent, otherwise walk to the goal.
  const aim = target && best < 10 ? { x: bot.x - (target.x - bot.x), z: bot.z - (target.z - bot.z) } : bot.goal;
  let dx = aim.x - bot.x;
  let dz = aim.z - bot.z;
  const len = Math.hypot(dx, dz);
  if (len > 0.5) {
    dx /= len;
    dz /= len;
    bot.heading = Math.atan2(-dx, -dz);
  } else dx = dz = 0;
  let v: Vec3 | null = null;
  if (rnd() < dt * 4) {
    const at = target ?? { x: bot.x - Math.sin(bot.heading) * 9, z: bot.z - Math.cos(bot.heading) * 9 };
    const d = Math.hypot(at.x - bot.x, at.z - bot.z);
    const yaw = Math.atan2(-(at.x - bot.x), -(at.z - bot.z)) + (rnd() - 0.5) * bot.wobble;
    v = throwVelocity(yaw, lobFor(d * (1 + (rnd() - 0.5) * bot.wobble)));
  }
  return { dx, dz, throw: v };
}

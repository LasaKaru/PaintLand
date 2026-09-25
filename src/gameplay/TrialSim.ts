import type { RoadPath } from '../road/RoadPath';
import type { Collectibles, PickupEvent } from './Collectibles';
import type { HandlingModel, RoverController, RoverInput } from './RoverController';

/** Fixed simulation step shared by the game and the verifier (docs/11 §7). */
export const TRIAL_DT = 1 / 60;
export const TRIAL_START_S = 8;

/** Everything needed to replay a run exactly. */
export interface TrialConfig {
  chapter: string;
  vehicle: string;
  handling: HandlingModel;
  gearbox: 'auto' | 'manual';
  autoCruise: boolean;
}

export interface TrialRun extends TrialConfig {
  name: string;
  /** Claimed lap time (s). The server re-simulates and ignores it if it disagrees. */
  time: number;
  /** Base64 of 4 bytes per step: throttle, brake, steer (int8), flags. */
  inputs: string;
  version: number;
}

/** Bump when physics changes so old runs are not compared with new ones. */
export const TRIAL_VERSION = 1;

const FLAG = { hop: 1, boost: 2, drift: 4, shiftUp: 8, shiftDown: 16 } as const;

/**
 * Round an input to what can be stored, so the live run and the replay see
 * exactly the same numbers.
 */
export function quantizeInput(i: RoverInput): RoverInput {
  return {
    throttle: Math.round(Math.min(1, Math.max(0, i.throttle)) * 255) / 255,
    brake: Math.round(Math.min(1, Math.max(0, i.brake)) * 255) / 255,
    steer: Math.round(Math.min(1, Math.max(-1, i.steer)) * 127) / 127,
    hop: i.hop,
    boost: i.boost,
    drift: i.drift,
    shiftUp: !!i.shiftUp,
    shiftDown: !!i.shiftDown,
  };
}

export function encodeInputs(list: RoverInput[]): string {
  const bytes = new Uint8Array(list.length * 4);
  list.forEach((i, k) => {
    bytes[k * 4] = Math.round(i.throttle * 255);
    bytes[k * 4 + 1] = Math.round(i.brake * 255);
    bytes[k * 4 + 2] = (Math.round(i.steer * 127) + 256) & 255;
    bytes[k * 4 + 3] = (i.hop ? FLAG.hop : 0) | (i.boost ? FLAG.boost : 0) | (i.drift ? FLAG.drift : 0) | (i.shiftUp ? FLAG.shiftUp : 0) | (i.shiftDown ? FLAG.shiftDown : 0);
  });
  let bin = '';
  for (let k = 0; k < bytes.length; k += 8192) bin += String.fromCharCode(...bytes.subarray(k, k + 8192));
  return btoa(bin);
}

export function decodeInputs(b64: string): RoverInput[] {
  const bin = atob(b64);
  const out: RoverInput[] = [];
  for (let k = 0; k + 3 < bin.length; k += 4) {
    const steerByte = bin.charCodeAt(k + 2);
    const flags = bin.charCodeAt(k + 3);
    out.push({
      throttle: bin.charCodeAt(k) / 255,
      brake: bin.charCodeAt(k + 1) / 255,
      steer: (steerByte > 127 ? steerByte - 256 : steerByte) / 127,
      hop: !!(flags & FLAG.hop),
      boost: !!(flags & FLAG.boost),
      drift: !!(flags & FLAG.drift),
      shiftUp: !!(flags & FLAG.shiftUp),
      shiftDown: !!(flags & FLAG.shiftDown),
    });
  }
  return out;
}

/**
 * One time-trial lap as a pure simulation: the rover, the pickups on the road
 * and their physical effects (pads, ramps, crates, bolts, note boost), with no
 * traffic, tonics or randomness. The game runs it live; the server runs the
 * recorded inputs through the same code and accepts the time only if it matches.
 */
export class TrialSim {
  time = 0;
  steps = 0;
  finished = false;
  readonly events: PickupEvent[] = [];

  constructor(
    readonly rover: RoverController,
    readonly items: Collectibles,
    readonly path: RoadPath,
  ) {}

  start(config: Pick<TrialConfig, 'handling' | 'gearbox' | 'autoCruise'>): void {
    const r = this.rover;
    r.handling = config.handling;
    r.gearbox = config.gearbox;
    r.autoCruise = config.autoCruise;
    r.mods.noBoost = r.mods.noBrakes = r.mods.highJumps = r.mods.wobbly = false;
    r.mods.speedMul = 1;
    r.reset(TRIAL_START_S);
    r.boostMeter = 0.4;
    this.items.resetLap();
    this.time = 0;
    this.steps = 0;
    this.finished = false;
    this.events.length = 0;
  }

  /** Advance one fixed step. Pickup events are left in `events` for presentation. */
  step(input: RoverInput): void {
    if (this.finished) return;
    const r = this.rover;
    r.step(TRIAL_DT, input);
    const before = this.events.length;
    this.items.collect({ s: r.s, x: r.x, h: r.h, radiusS: 2.4, radiusX: 1.9, magnet: false, driving: true }, this.events);
    for (let k = before; k < this.events.length; k++) applyPickupPhysics(r, this.events[k]);
    this.steps++;
    this.time = this.steps * TRIAL_DT;
    if (r.s >= this.path.length - 0.5) this.finished = true;
  }
}

/** The physical side of a pickup (the same numbers the free-play game uses). */
export function applyPickupPhysics(r: RoverController, e: PickupEvent): void {
  switch (e.type) {
    case 'note':
      r.addBoost(0.04);
      break;
    case 'bolt':
      r.boostMeter = 1;
      break;
    case 'pad':
      r.v = Math.max(r.v, r.tuning.topSpeed * 1.08);
      r.addBoost(0.1);
      break;
    case 'ramp':
      r.launch(8 + r.v * 0.12);
      break;
    case 'crate':
      r.v *= 0.94;
      break;
    default:
      break;
  }
}

import { CHAPTERS } from '../world/Chapters';
import { Collectibles } from '../gameplay/Collectibles';
import { RoverController } from '../gameplay/RoverController';
import { TRIAL_VERSION, TrialSim, decodeInputs, type TrialRun } from '../gameplay/TrialSim';
import { VEHICLES, tuningFor, type VehicleId } from '../models/Vehicles';
import type { RoadPath } from '../road/RoadPath';

/** Longest lap we will re-simulate (10 minutes of 60 Hz steps). */
const MAX_STEPS = 60 * 600;

const routes = new Map<string, RoadPath>();

/**
 * Server-side verification of a time-trial run (docs/09 §7, docs/12 §6
 * "leaderboard runs are validated by re-simulation"): rebuild the chapter,
 * replay the recorded inputs through the same simulation the game used, and
 * accept the run only if the lap finishes at the claimed time.
 */
export function verifyRun(run: TrialRun): { ok: true; time: number } | { ok: false; reason: string } {
  if (!run || typeof run !== 'object') return { ok: false, reason: 'no run' };
  if (run.version !== TRIAL_VERSION) return { ok: false, reason: 'old game version' };
  const chapter = CHAPTERS.find((c) => c.id === run.chapter);
  if (!chapter) return { ok: false, reason: 'unknown chapter' };
  if (!VEHICLES.some((v) => v.id === run.vehicle)) return { ok: false, reason: 'unknown vehicle' };
  if (run.handling !== 'arcade' && run.handling !== 'realistic') return { ok: false, reason: 'bad handling' };
  if (typeof run.inputs !== 'string' || run.inputs.length > MAX_STEPS * 6) return { ok: false, reason: 'bad inputs' };
  let path = routes.get(chapter.id);
  if (!path) {
    path = chapter.buildRoute();
    routes.set(chapter.id, path);
  }
  const rover = new RoverController(path);
  rover.tuning = tuningFor(run.vehicle as VehicleId);
  const sim = new TrialSim(rover, new Collectibles(path, chapter.districts), path);
  sim.start({ handling: run.handling, gearbox: run.gearbox === 'manual' ? 'manual' : 'auto', autoCruise: !!run.autoCruise });
  let inputs;
  try {
    inputs = decodeInputs(run.inputs);
  } catch {
    return { ok: false, reason: 'bad inputs' };
  }
  if (inputs.length > MAX_STEPS) return { ok: false, reason: 'too long' };
  for (const input of inputs) {
    sim.step(input);
    if (sim.finished) break;
  }
  if (!sim.finished) return { ok: false, reason: 'lap not finished' };
  if (Math.abs(sim.time - run.time) > 0.02) return { ok: false, reason: `time mismatch (${sim.time.toFixed(3)} vs ${Number(run.time).toFixed(3)})` };
  return { ok: true, time: sim.time };
}

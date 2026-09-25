import { describe, expect, it } from 'vitest';
import { SKETCH } from '../src/world/chapters/sketch';
import { Collectibles } from '../src/gameplay/Collectibles';
import { RoverController, type RoverInput } from '../src/gameplay/RoverController';
import { TRIAL_VERSION, TrialSim, decodeInputs, encodeInputs, quantizeInput, type TrialRun } from '../src/gameplay/TrialSim';
import { tuningFor } from '../src/models/Vehicles';
import { verifyRun } from '../src/server/verify';

/** Drive a full Sketch lap with a scripted player, like the game does in a time trial. */
function recordLap(handling: 'arcade' | 'realistic'): TrialRun {
  const path = SKETCH.buildRoute();
  const rover = new RoverController(path);
  rover.tuning = tuningFor('rover');
  const sim = new TrialSim(rover, new Collectibles(path, SKETCH.districts), path);
  sim.start({ handling, gearbox: 'auto', autoCruise: true });
  const inputs: RoverInput[] = [];
  for (let i = 0; i < 60 * 300 && !sim.finished; i++) {
    const raw: RoverInput = { throttle: 1, brake: 0, steer: Math.sin(i * 0.01) * 0.4 - rover.x * 0.08, hop: i % 180 === 90, boost: i % 600 > 520, drift: false };
    const q = quantizeInput(raw);
    inputs.push(q);
    sim.step(q);
  }
  expect(sim.finished).toBe(true);
  return { name: 'Tester', chapter: 'sketch', vehicle: 'rover', handling, gearbox: 'auto', autoCruise: true, time: sim.time, inputs: encodeInputs(inputs), version: TRIAL_VERSION };
}

describe('Time trials and server re-simulation', () => {
  it('encodes inputs losslessly after quantisation', () => {
    const list = [quantizeInput({ throttle: 0.73, brake: 0.1, steer: -0.456, hop: true, boost: false, drift: true, shiftUp: true }), quantizeInput({ throttle: 0, brake: 1, steer: 1, hop: false, boost: true, drift: false })];
    expect(decodeInputs(encodeInputs(list))).toEqual(list);
  });

  it('accepts an honest lap and reproduces its time (arcade and realistic)', () => {
    for (const handling of ['arcade', 'realistic'] as const) {
      const run = recordLap(handling);
      const res = verifyRun(run);
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.time).toBeCloseTo(run.time, 5);
      expect(run.time).toBeGreaterThan(30);
    }
  });

  it('rejects a faked time, edited inputs and unknown chapters', () => {
    const run = recordLap('arcade');
    expect(verifyRun({ ...run, time: run.time - 5 }).ok).toBe(false);
    // Cut the second half of the inputs: the lap never finishes.
    const half = encodeInputs(decodeInputs(run.inputs).slice(0, 1000));
    expect(verifyRun({ ...run, inputs: half }).ok).toBe(false);
    expect(verifyRun({ ...run, chapter: 'moon' }).ok).toBe(false);
    expect(verifyRun({ ...run, version: 0 }).ok).toBe(false);
  });
});

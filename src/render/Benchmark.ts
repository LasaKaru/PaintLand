import type { QualityLevel } from './StudioSettings';

export interface BenchmarkResult {
  frames: number;
  avgFps: number;
  /** Frame rate of the slowest 5 % of frames. */
  lowFps: number;
  recommend: QualityLevel;
}

/** Score a benchmark run (frame times in seconds, measured at the High preset, fixed resolution). */
export function scoreBenchmark(frameTimes: number[]): BenchmarkResult {
  const n = frameTimes.length;
  if (!n) return { frames: 0, avgFps: 0, lowFps: 0, recommend: 'low' };
  const avg = frameTimes.reduce((a, b) => a + b, 0) / n;
  const sorted = [...frameTimes].sort((a, b) => b - a);
  const worst = sorted.slice(0, Math.max(1, Math.floor(n * 0.05)));
  const low = worst.reduce((a, b) => a + b, 0) / worst.length;
  const avgFps = 1 / avg;
  const lowFps = 1 / low;
  const recommend: QualityLevel = avgFps >= 90 && lowFps >= 60 ? 'ultra' : avgFps >= 55 && lowFps >= 40 ? 'high' : avgFps >= 35 ? 'medium' : 'low';
  return { frames: n, avgFps: Math.round(avgFps * 10) / 10, lowFps: Math.round(lowFps * 10) / 10, recommend };
}

/** Where the benchmark drives: fractions of the current chapter's road. */
export const BENCH_SPOTS = [0.12, 0.45, 0.78];
export const BENCH_WARMUP = 1;
export const BENCH_MEASURE = 4;

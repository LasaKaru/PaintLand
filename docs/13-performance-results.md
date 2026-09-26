# 13 · Performance results

How Inkroads keeps its frame rate, and what the relay can carry. Numbers here
were measured, not estimated; the conditions are written next to each one.

## 1. Frame rate: three layers

1. **Dynamic resolution** (auto-balance, on in Low/Medium/High): every 45
   frames the 80th-percentile frame time is checked; slower than 50 fps drops
   the render scale by 10 % (down to 55 %), faster than 58 fps raises it 5 %.
2. **Adaptive effects** (new): only when the render scale is already at its
   floor and two windows in a row are still slower than 40 fps, one effect is
   shed, in this order: sun shafts → ambient occlusion → wide bloom → shadow
   quality/softness → draw distance (×0.7, fog pulled in to hide it). Four
   windows faster than 58 fps at full resolution bring the last one back.
   Nothing is written to the saved settings. Ultra (auto-balance off) never
   sheds anything. (`src/render/Adaptive.ts`, tested in `tests/milestone10.test.ts`.)
3. **Presets and benchmark**: Settings → Graphics → *Run benchmark* drives
   three stretches of the current chapter for 15 s at High with a fixed
   resolution, measures real frame times (average and the slowest 5 %), puts
   your settings back, and recommends a preset:

   | average fps | slowest 5 % | recommendation |
   |---|---|---|
   | ≥ 90 | ≥ 60 | Ultra |
   | ≥ 55 | ≥ 40 | High |
   | ≥ 35 | — | Medium |
   | lower | — | Low |

   Only the recommended tier is sent to analytics (no timings).

In the build container the browser renders with SwiftShader (a CPU
rasteriser), where the benchmark scores ~1 fps and recommends Low — that proves
the flow works, not how fast a real GPU is. Please run it on your own machines
(a laptop with integrated graphics and a gaming PC) to calibrate the table.

## 2. Relay load test

`node tools/loadtest-relay.mjs --clients N --room-size 8 --hz 20 --seconds 12`
starts N fake players (8 per room, 20 state updates a second each — what the
game sends), all driving validly around Harbour Town, and measures what the
relay delivers.

Measured 2026-09-25 on the 4-core build container, with the load generator
and the relay **on the same machine** (so real servers will do better):

| players | rooms | sent / s | delivered / s | delivery | latency p50 / p95 / p99 / max |
|---:|---:|---:|---:|---:|---|
| 64 | 8 | 1 328 | 9 276 | 99.8 % | 0 / 1 / 2 / 6 ms |
| 200 | 25 | 4 143 | 28 957 | 99.9 % | 1 / 3 / 5 / 14 ms |
| 400 | 50 | 8 273 | 57 827 | 99.9 % | 2 / 12 / 31 / 89 ms |

No player was dropped by the validator or the rate limit in any run. The
missing 0.1–0.2 % are the first and last updates while players join and
leave. One relay process comfortably holds a few hundred players; for more,
run several relays behind the load balancer and route by room code.

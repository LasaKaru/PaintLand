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

## 3. Batching and sharding for thousands of players (2026-09-26)

Two changes lift the ceiling:

1. **Batched sends.** The relay used to send every message in its own frame.
   Now it collects each player's outgoing messages and sends them together
   every 40 ms (`RELAY_BATCH_MS`, 0 turns it off) as one frame holding a JSON
   array. The game and the load tester read both forms. In a room of 8 at
   12 updates a second, that is about 20 frames a second per player instead of 84.
   This adds about 20 ms of average delay, which the game's interpolation
   buffer already hides.
2. **Several relays (shards).** `RELAY_SHARDS` lists every relay's public
   address. A room always lives on the same relay (a hash of the room code).
   A player who connects to the wrong one gets `{ t: 'moved' }` and the game
   reconnects there. Shard 0 keeps accounts, bans, chat logs, the gallery and
   the admin panel. The others ask it over HTTP with `SHARD_SECRET`, and
   report their live numbers so the dashboard shows everyone. See
   `server/shards.mjs` and *Hosting → 7*.

The load test now uses the game's real rate (12 updates a second), splits the
fake players over worker processes (`--workers`), follows moves, and counts
only the steady part (after everyone has joined).

Measured on the same 4-core container. The load generator shares the CPU with
the relays, so separate servers will do better.

**One relay, rooms of 8, 12 Hz** (3 generator workers)

| players | before batching: delivery · p50 / p95 / p99 | with batching: delivery · p50 / p95 / p99 / max | delivered / s |
|---:|---|---|---:|
| 1 000 | 99.8 % · 77 / 245 / 366 ms | 100 % · 24 / 40 / 41 / 49 ms | 84 235 |
| 1 500 | 100 % · 78 / 306 / 460 ms (8 did not connect) | — | — |
| 2 000 | 99.8 % · 88 / 271 / 392 ms (414 did not connect) | 100 % · 27 / 41 / 42 / 61 ms | 168 385 |
| 3 000 | — | 100 % · 32 / 54 / 88 / 146 ms | 251 900 |

**Four relays (shards), rooms of 8, 12 Hz** (4 generator workers, every player connects to shard 0 first)

| players | connected | moved to their shard | delivery | latency p50 / p95 / p99 / max | sent / s | delivered / s |
|---:|---:|---:|---:|---|---:|---:|
| 5 000 (before batching) | 2 886 | 2 159 | 88 % | 150 / 668 / 967 / 2 283 ms | 24 641 | 152 105 |
| **5 000** | **5 000** | 3 760 | **100 %** | **29 / 45 / 58 / 197 ms** | 58 310 | 408 655 |
| 8 000 | 8 000 | 5 992 | 100 % | 60 / 105 / 138 / 265 ms | 72 714 | 510 096 |

About ¾ of players were moved, as expected with 4 shards. Nobody was dropped
by the validator or the rate limit. "Delivery" can read slightly above 100 %
because messages already on their way when counting starts are counted on
arrival. A sensible production plan: one relay per CPU core, planning for
about 1 500 players each (headroom for chat, voice signalling and races).
So 5 000 players need 4 shards on, for example, two 2-core servers.

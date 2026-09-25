# PaintLand — Game Design & Build Guide

**PaintLand** (working title) is a browser 3D game built with Three.js that looks like a moving watercolour sketchbook. Roads peel off the ground and fold into the sky, up walls, across ceilings and through loops. Driving or walking through floating notes plays each street's melody. You can play alone or with friends, walk around as a customisable character in first or third person, and drive a little rover with a gramophone on its roof.

*Paint the road. Then drive up it.*

This repository holds the **design documentation** (in [`docs/`](docs/)) and the **game itself** (in [`src/`](src/)), built with TypeScript, Three.js and Vite.

![Milestone 1 screenshots: title screen, tower climb, Petal Twist, Citrus Coil at night, Ribbon Gate in rain, on foot beside the rover](docs/screenshots/milestone-1.jpg)

## Play it locally

```bash
npm install
npm run dev        # open http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Typecheck and build a static site into `dist/` |
| `npm run preview` | Serve the built site |
| `npm test` | Unit tests (road maths, rover and walking physics, notes and phrases) |
| `npm run typecheck` | TypeScript strict check |
| `node tools/screenshot.mjs` | With `npm run dev` running: renders every district in headless Chromium into `tools/out/` |
| `node tools/drive-test.mjs` | With `npm run dev` running: presses real keys (drive, brake, get out, walk) and checks for console errors |

Needs a browser with WebGL2 (any current Chrome, Edge, Firefox or Safari).

### Controls

| | Driving | On foot |
| --- | --- | --- |
| Move | **W/S** throttle/brake · **A/D** steer | **WASD** |
| **Space** | Hop | Jump |
| **Shift** | Boost | Sprint |
| **Ctrl** | Drift | Walk slowly |
| **F / E** | Get out (when slow) | Get in (near the rover) |
| **C / V** | Chase · Low · Drone · Cinema · Cockpit | Third ↔ first person |
| Mouse | — | Look (click to lock the pointer) |

Also: **scroll** zoom · **[ ]** field of view · **T** radio · **N** next song · **B** change station · **1–7** time of day · **8** auto day · **9** rain · **H** honk · **R** respawn · **`** or **F2** Studio panel · **U** hide HUD · **Esc** pause. Gamepads work too (stick, RT/LT, A hop, X boost, B drift, Y get in/out).

## What is built (milestone 1 · "The Sketch")

| System | Status | Where |
| --- | --- | --- |
| Watercolour renderer: toon + coloured shadows, ink lines with line boil, Kuwahara colour bleed, pigment edge darkening, wet edges, granulation, paper, glow, torn sketchbook border, rain, speed lines | ✅ | `src/render/` |
| Studio panel with every art value live, 8 vibe presets, auto resolution | ✅ | `src/ui/Studio.ts`, `src/render/StudioSettings.ts` |
| Ribbon road engine: turtle track builder with exact up vectors, 0.5 m lookup table, chunked procedural road mesh | ✅ | `src/road/` |
| Chapter 1 route: 8 districts, 3 km — town street, tower climb, ceiling street, corkscrew, drop, spiral over the sea, loop, twist | ✅ | `src/road/chapter1.ts`, `src/world/Districts.ts` |
| Road-gravity rover: throttle, brake, cruise floor, drift, hop, boost, kerbs, ramps, speed pads | ✅ | `src/gameplay/RoverController.ts` |
| On-foot human: walk / jog / sprint / jump on road gravity (walls and ceilings too), get in and out of the rover | ✅ | `src/gameplay/HumanController.ts` |
| Cameras: chase, low, drone, cinema, cockpit, third person, first person, title orbit — with collision and a water clamp | ✅ | `src/camera/CameraRig.ts` |
| Procedural models: rover (3 roof loads), character (4 hair styles, hats, outfits), houses, towers, stalls, kiosks, trees, lamps, flower arches, bunting, lighthouse, islands, clouds, crayons | ✅ | `src/models/` |
| Seeded district dressing in the road frame (houses hang upside down on the ceiling automatically) | ✅ | `src/world/Decorator.ts` |
| Notes from melodies, beat-quantised music box, phrases and the Songbook, tonics with drawbacks, crates, time trial with splits | ✅ | `src/gameplay/Collectibles.ts`, `src/core/Game.ts` |
| Procedural radio (3 stations in the district's key and tempo), engine, wind, rain, SFX | ✅ | `src/audio/AudioEngine.ts` |
| Time of day (7 presets + auto) and rain | ✅ | `src/world/Environment.ts` |
| HUD and menus as paper cards: title, intro, pause, controls, radio, Songbook, speed card with gravity compass | ✅ | `src/ui/` |
| Hubs, character creator screen, garage screen, photo mode, multiplayer, touch controls | ⏳ next milestones | see [docs/12](docs/12-production-plan.md) |

## How to read this

| # | Document | What's inside |
| --- | --- | --- |
| 01 | [Reference analysis](docs/01-reference-analysis.md) | A second-by-second breakdown of the reference gameplay video, a HUD teardown, the systems it reveals, and the bugs we must avoid |
| 02 | [Vision and pillars](docs/02-vision-and-pillars.md) | Pitch, design pillars, audience, game modes, what "AAA" means for a browser game, non-goals |
| 03 | [Art direction and watercolour renderer](docs/03-art-direction-watercolor.md) | Visual rules, palette, the render pass chain, every Studio slider, vibe presets, time of day, weather |
| 04 | [World and level design](docs/04-world-and-level-design.md) | Chapters, districts, walkable hubs, the spline road system, level rules, NPCs, prop kit, streaming |
| 05 | [Player controllers](docs/05-player-controllers.md) | Pawn system, gravity service, human character (first and third person), rover (ribbon and free driving), camera system, full control bindings |
| 06 | [Gameplay systems](docs/06-gameplay-systems.md) | Notes and Songbook, tonics (buff + drawback), scoring, time trial, rule modifiers, progression, on-foot activities, story |
| 07 | [Audio and music](docs/07-audio-and-music.md) | Audio layers, adaptive music, beat quantisation, radio, spatial audio, mixing |
| 08 | [Customisation and creation](docs/08-customization-and-creation.md) | Character creator, garage, Studio panel, every setting, accessibility, photo mode, road/track creator, saves |
| 09 | [Multiplayer and online](docs/09-multiplayer.md) | Modes, server architecture, netcode, parties, matchmaking, ghosts, anti-cheat, safety, scaling |
| 10 | [UI, UX and HUD](docs/10-ui-ux-hud.md) | Screen flow, driving and on-foot HUD, menus, touch layout, localisation, onboarding |
| 11 | [Technical architecture](docs/11-technical-architecture.md) | Stack, module map, frame budgets, quality tiers, asset pipeline, streaming, determinism, testing, deployment |
| 12 | [Production plan](docs/12-production-plan.md) | Phases and milestones, team, content targets, risks, KPIs, release checklist, legal, first 30 days |

Reference material:
- [`docs/reference/frames/`](docs/reference/frames/) — contact sheets from the reference video (1 frame per second, 6 frames per sheet) and full-resolution HUD frames.
- [`docs/reference/original-build-plan.md`](docs/reference/original-build-plan.md) — the first build plan this guide expands on.

## The short version

1. **Look:** simple low-poly toon models + screen passes (ink lines, Kuwahara colour bleed, edge darkening, paper grain, torn border). Every value is a live slider.
2. **Road:** one spline per route with an up-vector per point; gravity follows the road, so walls, ceilings and loops just work.
3. **Controllers:** one pawn system — a human character (first/third person) and a rover (ribbon driving on routes, free driving in hubs) — sharing input, gravity and cameras.
4. **Music:** notes on the road are a melody; each pickup plays on the beat; phrases fill a Songbook; the radio is the backing band.
5. **Toys:** time of day, weather, vibes, rules, camera, character, car — all changeable at any time.
6. **Together:** authoritative room servers with a shared deterministic sim; hubs for 32, races for 8, ghosts and daily boards for everyone.
7. **Order:** look test → road and rover → music → on foot → vertical slice → multiplayer → alpha → beta → 1.0 → seasons.

## Status

| Area | Status |
| --- | --- |
| Design documentation | ✅ Complete (v1) |
| Phase 0 · Look test | ✅ Done |
| Phase 1 · Road and rover | ✅ Done |
| Phase 2 · Music core | ✅ Done (procedural radio; commissioned music later) |
| Phase 3 · On-foot prototype | ✅ Done on ribbon roads (hubs next) |
| Phase 4 · Vertical slice | 🚧 In progress |

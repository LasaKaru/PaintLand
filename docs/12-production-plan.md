# 12 · Production Plan, Team, Risks and Success Checklist

Build in the order that proves the hardest things first: **the painted look** and **road-gravity movement**. If a grey-box street with a loop looks painted and feels great by week 6, the rest is content and scale.

## 1. Phases and milestones

| Phase | Duration | Goal | Exit criteria ("done when") |
| --- | --- | --- | --- |
| **0 · Look test** | Weeks 1–3 | Ink, paint, paper and border passes on a test scene (one house, one tree, one rover, 50 m road) | A still frame looks painted to 5 of 5 outsiders; Studio sliders work live; ≥ 60 fps on the reference laptop |
| **1 · Road and rover** | Weeks 4–8 | Spline road tool, road LUT, ribbon rover, gravity service, chase/drone/cinema cameras with collision, respawn | Driving a loop, a wall climb and a ceiling feels smooth; camera never clips or goes underwater in the test track |
| **2 · Music core** | Weeks 9–11 | Notes from melody data, beat clock, quantised playback, phrases, Songbook strip, radio with stems | A clean line plays a recognisable tune; testers can hum it |
| **3 · On-foot prototype** | Weeks 10–14 (parallel) | Human character controller, first/third person, walking on road gravity, get in/out of rover, basic animation set | Walking up a wall road and onto the ceiling feels natural; entering the car takes < 1.5 s |
| **4 · Vertical slice** | Weeks 15–24 | Chapter 1 districts 1–4 fully dressed; Harbour Town core (plaza, garage); HUD; title, intro, pause; time of day; rain; pickups and tonics; time trial | Outsiders play 15 minutes and ask "what's next?"; 60 fps High, 30 fps Low on phone |
| **5 · Multiplayer foundation** | Weeks 20–32 | Deterministic sim tests, ghosts, async leaderboards, 4-player hub, co-op cruise | Two players in different countries cruise Chapter 1 together without visible pops at 150 ms ping |
| **6 · Alpha (content complete Ch. 1–2)** | Weeks 25–44 | Chapters 1–2, Hubs 1–2, character creator, garage, photo mode, trophies, settings, accessibility v1, live races (casual) | Every system in; closed alpha with 200 players; crash-free sessions > 98 % |
| **7 · Beta** | Weeks 45–60 | Chapters 3–4, Hub 3, ranked races, voice, creator tool v1, localisation, moderation tools, performance pass | Open beta; 5,000 concurrent load test passed; crash-free > 99.5 % |
| **8 · Launch 1.0** | Weeks 61–68 | Polish, trailer, store pages, press kit, community channels | Success checklist (§6) all green |
| **9 · Live service** | After launch | Seasons every 8–10 weeks: new district/pocket, station, cosmetics, events; creator features | Retention and health KPIs (§5) |

Total to 1.0: **about 16 months** with the full team below. A small team can reach the vertical slice (phase 4) in about 6 months and should then decide whether to scale up.

## 2. Team

### Small team (prototype → vertical slice, ~6 months)

| Role | Count |
| --- | --- |
| Graphics / gameplay programmer (Three.js, shaders) | 1 |
| Gameplay / tools programmer (road tool, controllers) | 1 |
| 3D artist (props, rover, characters) + level dresser | 1 |
| Composer / sound designer (part-time) | 0.5 |
| Designer / producer (tracks, melodies, tuning, testing) | 1 |

### Full team (vertical slice → 1.0 and live)

| Discipline | Roles | Count |
| --- | --- | --- |
| Leadership | Creative director, producer, art director, technical director | 4 |
| Engineering | Rendering (2), gameplay (3), animation/character (1), tools/editor (2), network/server (2), backend/services (2), UI (2), QA automation (1) | 15 |
| Art | Environment artists (3), character artist (1), animator (2), VFX/technical artist (1), UI artist (1), concept/illustrator (1) | 9 |
| Design | Level designers (2), systems designer (1), UX designer (1), writer (0.5) | 4.5 |
| Audio | Composer (1), sound designer (1) | 2 |
| Quality | QA testers (3), accessibility consultant (contract) | 3+ |
| Community & ops | Community manager (1), live-ops / moderation (1–2) | 2–3 |
| **Total** | | **≈ 40** |

Scale can be smaller (20–25) by cutting Chapter 4, Hub 3 and ranked races from 1.0 and shipping them as updates.

## 3. Content targets for 1.0

| Content | Amount |
| --- | --- |
| Chapters / districts | 4 / 28 |
| Hubs | 3 |
| Pockets (hidden spaces) | 20 |
| Named characters | 25 + 30 crowd variants + 12 animals |
| Vehicles | 6 bodies, 200+ cosmetic parts |
| Outfit items | 300+ |
| Radio stations / tracks | 8 / 64 |
| Melodies | 28 district melodies + procedural songbooks |
| Trophies | 100+ |
| Vibe presets | 9 built-in |
| Languages | 8 |

## 4. Top risks

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Painted look too slow | Kuwahara + edges at full res are expensive | Half-res passes, quality tiers, dynamic resolution; test on a weak laptop from week 1 |
| Look turns muddy or noisy | Too many effects fight | Studio sliders; side-by-side reference boards; keep flat colour areas large |
| Motion sickness | Rolling camera, loops, line boil | Reduced motion, stable horizon, slower up-blend option, FOV control |
| Ribbon driving feels on rails | Road-relative physics can feel fake | Sideways freedom, drift, hops, air tricks, suspension juice, free-drive mode in hubs |
| On-foot on walls feels confusing | Gravity changes disorient players | Smooth gravity blends, gravity compass, painted arrows, limited gravity areas at first |
| Music sounds random | Players miss notes | Quantise to beat; in-key backing; forgiving radius; stems that fill gaps |
| Multiplayer desync | Different floats across browsers | Fixed step, determinism tests in CI, server authority, re-sim validation |
| Toxicity in social spaces | Young, cosy audience | Chat off by default, quick-chat, blocking, reports, moderation team |
| Scope creep ("AAA") | Too much to build | Phase gates; vertical slice decision point; content as data; ship chapters as updates |
| Browser limits (memory, mobile GPUs) | Crashes, low fps | Streaming, budgets enforced in CI, Low tier, context-loss handling |
| Copying the reference | Legal and identity risk | See §7 |

## 5. KPIs (after launch)

| Metric | Target |
| --- | --- |
| Time to first drive | < 30 s from page open |
| Day-1 / Day-7 / Day-30 retention | 35 % / 15 % / 6 % |
| Median session | 18 min |
| Players who play with a friend in week 1 | 25 % |
| Crash-free sessions | > 99.5 % |
| p95 frame time (High on reference laptop) | < 18 ms |
| Photos shared per 100 players / week | 30 |
| Reports per 1,000 multiplayer hours | < 5 |

## 6. Success checklist (1.0 release gate)

**Look and feel**
- [ ] A single still frame is recognisable as a watercolour painting to someone who has never seen the game.
- [ ] 60 fps on the reference laptop at High; 30 fps on the phone list at Low.
- [ ] Title screen in under 10 s on normal broadband; first drive in under 30 s.
- [ ] The camera never clips into foliage or walls and never goes under water (automated fly-through test).
- [ ] District titles and pop texts are readable on every background, at every time of day.

**Controllers**
- [ ] A new player drives a loop and an upside-down street in the first 2 minutes without getting stuck.
- [ ] Walking in first and third person feels responsive (input-to-motion < 50 ms) on floors, walls and ceilings.
- [ ] Getting in and out of the rover is under 1.5 s and never gets stuck.
- [ ] Every action is rebindable on keyboard, gamepad and touch.

**Game**
- [ ] Driving a clean line plays a melody testers hum afterwards.
- [ ] Every Studio slider changes the image live and saves.
- [ ] Time trials show splits and deltas per district; ghosts replay exactly.
- [ ] Photo mode exports a framed PNG up to 4 K.
- [ ] Character creator and garage have no clipping in the 100 most common combinations.

**Online**
- [ ] Joining a friend by link takes under 15 s.
- [ ] Leaderboard runs are validated by re-simulation.
- [ ] Chat defaults, blocking, reporting and parental controls are live.
- [ ] Load test at 2× expected launch concurrency passes.

**Quality**
- [ ] No known blocker or critical bugs.
- [ ] Crash-free sessions > 99.5 % in open beta.
- [ ] Accessibility audit passed (keyboard-only, colour-blind, reduced motion, screen reader menus).
- [ ] All 8 languages reviewed in context.
- [ ] Playtest: 8 of 10 testers call it "relaxing" and would share a clip.

## 7. Legal and IP

- The reference game is **style inspiration only**. Our game uses its own name, logo, district names, characters, story, music, UI art and sound.
- No assets, text, screenshots or audio from the reference are used in the game or its marketing.
- Commission all music with full buy-out rights; license fonts for web embedding; keep an asset-licence register.
- Register the game name and check trademarks before public reveal.
- Privacy policy, terms of service and UGC policy reviewed by a lawyer before beta.

## 8. First 30 days — concrete next actions

1. Set up the repository, build, CI and a preview deploy.
2. Build the Phase 0 test scene: one pastel house, one faceted tree, one lamp, 50 m of lavender road, the rover.
3. Implement the pass stack in order: toon → ink lines → Kuwahara → edge darkening → paper → border. Compare against [`reference/frames/`](reference/frames/) every day.
4. Add the Studio panel with the sliders from [03 §2.5](03-art-direction-watercolor.md#25-pass-settings-all-exposed-in-the-studio-panel).
5. Build the spline road tool with parallel-transport frames and a 0.5 m LUT; make a test track with a wall climb, a ceiling and a loop.
6. Implement the ribbon rover and the chase camera with collision and water clamp.
7. Record a 60-second capture and review it against the reference timeline in [01](01-reference-analysis.md).
8. Decide go / adjust based on the Phase 0–1 exit criteria.

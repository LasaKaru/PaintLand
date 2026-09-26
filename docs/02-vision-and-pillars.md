# 02 · Vision, Pillars and Scope

## 1. The game in one breath

**Inkroads** (earlier working title: PaintLand) is a browser 3D game set inside a living watercolour sketchbook. You walk, run and drive through a paper town whose roads peel off the ground and fold into the sky — up walls, across ceilings, through loops and corkscrews. Driving or running through floating notes plays each street's melody, so your path becomes a song. Play alone, or open the world to friends to cruise, race, collect and paint together.

**Tagline:** *Paint the road. Then drive up it.*

## 2. Pillars

Every feature must serve at least one pillar. If it serves none, cut it.

| # | Pillar | What it means in practice | Test |
| --- | --- | --- | --- |
| 1 | **Painted, not rendered** | Ink lines, colour bleed, paper grain, wobbling lines, a torn paper frame. Simple shapes, rich surface. | A still frame looks like an illustration to someone who has never seen the game. |
| 2 | **The road is the level** | Roads ignore normal gravity. Walls, ceilings and loops are normal places to drive or walk. | A new player drives a loop and an upside-down street in the first 2 minutes without getting stuck. |
| 3 | **Your path is the song** | Notes are pickups; the music reacts to what you do. | Players hum the melody after a session. |
| 4 | **Cosy first, challenge optional** | No death, no fail screen by default. Time trials, ghosts, trophies and hard modifiers for people who want them. | 8 of 10 testers call it relaxing; 5 of 10 retry a time trial. |
| 5 | **Everything is a toy** | Time, weather, camera, art style, car look, character look and game rules are all live and adjustable. | Every setting changes the game within 1 second, without reloading. |
| 6 | **Together is better** | Friends can join in one click from a link. Shared songs, ghosts, photo walks and races. | Joining a friend takes under 15 seconds from clicking the link. |
| 7 | **Instant in the browser** | No install; title screen in under 10 s; runs on a mid laptop and a recent phone. | Measured on the target hardware list every week. |

## 3. Audience

- **Core:** cosy-game and lofi fans, 16–35, who share pretty clips and screenshots.
- **Secondary:** arcade racers and speedrunners (time trials, ghosts, leaderboards).
- **Tertiary:** creators (track editor, photo mode, custom art presets and songs).
- **Age rating target:** PEGI 3 / ESRB E. No violence and no gambling mechanics. Chat is off by default for minors.

## 4. Ways to play

| Mode | Players | Description |
| --- | --- | --- |
| **Story Drive** | 1 (or co-op 2–4) | The main route through four chapters. Light story told through postcards and characters. |
| **Free Roam** | 1–32 per hub | Leave the car, walk the open districts, talk to people, find secrets, play instruments, take photos. |
| **Time Trial** | 1 + ghosts | Beat the clock per district and per lap. Splits, deltas, ghosts, leaderboards. |
| **Song Hunt** | 1–4 | Collect every note of a chapter song. Phrase sealing, perfect runs. |
| **Daily Songbook** | 1, shared seed | One seeded melody and modifier set per day, the same for everyone. One leaderboard. |
| **Live Race** | 2–8 | Real-time races on ribbon roads with pickups. Ranked and casual. |
| **Duet** | 2 | Co-op: two players collect alternate notes of one melody to play a duet. |
| **Photo Walk** | 2–8 | Relaxed group mode: cruise together, vote on the best photo at the end. |
| **Creator** | 1 (share to all) | Build roads, dress districts, write melodies, publish, play others' tracks. |

## 5. The three ways to move

| Controller | Views | Where | Priority |
| --- | --- | --- | --- |
| **On foot** (human character) | First person, third person | Hubs, districts, rooftops, interiors, and on ribbon roads (road gravity applies) | Milestone 2 |
| **Rover** (ribbon driving) | Chase, low, drone, cinema, first-person cockpit, photo | Ribbon roads (the spline) | Milestone 1 (core) |
| **Rover** (free driving) | Same | Open plazas, beaches, hub streets off the spline | Milestone 3 |

Later: bicycle, paper boat, paper glider, tram (passenger). All use the same "pawn" system described in [05](05-player-controllers.md).

## 6. What "AAA" means for this project

A browser game cannot match a 500-person console production in size. It **can** match AAA in **polish, feel, art consistency, audio quality, stability and service**. We define our AAA bar as:

1. **Art:** one consistent painted style across every asset, every time of day, every weather; no placeholder art in release.
2. **Feel:** 60 fps on target hardware; input to screen under 50 ms; every action has sound, animation and a visual effect.
3. **Content:** 4 chapters × 6–8 districts (≈ 28 districts), 3 open hubs, 25+ characters, 8+ radio stations with 60+ tracks, 100+ trophies.
4. **Systems:** full rebinding, accessibility suite, cloud saves, cross-device play, stable multiplayer, anti-cheat on ranked boards.
5. **Service:** season updates, daily content, creator sharing, moderation, analytics, live-ops tools.
6. **Quality:** crash-free sessions above 99.5 %; no known blocker bugs at launch; localised into 8+ languages.

## 7. Non-goals

- No combat or weapons.
- No loot boxes, no paid randomness, no energy timers.
- No photoreal graphics.
- No mandatory account to play single player (guest play, upgrade later).
- No native app at launch (PWA install is fine).

## 8. Experience goals per session

| Minute | What the player should feel |
| --- | --- |
| 0–1 | "Oh, it's a painting that moves." Title, press a key, driving within 20 seconds. |
| 1–3 | "The road just went up the wall!" First wall climb and first loop; first phrase sealed. |
| 3–10 | "I want to see what's up there." Following the road into the sky; first chapter postcard. |
| 10–20 | "Let me get out and look around." Leave the car in the hub, meet characters, take a photo. |
| 20+ | "Let's do it together / beat my time." Invite a friend, race a ghost, try the daily. |

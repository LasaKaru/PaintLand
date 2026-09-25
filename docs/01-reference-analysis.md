# 01 · Reference Analysis (frame by frame)

This chapter records what the reference game ("Foldline · ink & wash roads") actually does, so the team builds from what the footage shows and not from memory. Every claim below comes from the 57-second gameplay video (sampled at 1 frame per second and checked at full resolution for HUD text), the five screenshots, and the earlier build plan.

> **Use this as inspiration only.** We copy the *ideas* (a painted look, roads that ignore gravity, notes that play music) but never the name, logo, district names, characters, music or UI artwork. See [12 · Production](12-production-plan.md#7-legal-and-ip).

Contact sheets (6 frames each, 1 frame per second) are in [`reference/frames/`](reference/frames/). Each file name gives the seconds it covers.

---

## 1. Second-by-second timeline (57 s video)

| Time | Screen / district | What happens | System revealed |
| --- | --- | --- | --- |
| 0–1 s | Title screen, clock 01:44 MORNING | Camera slowly flies through the start street. Giant multicoloured 3D letters spell the title across the road; a tilted paper banner above reads "DRIVE THE SONG · BEAT THE CLOCK"; a red boombox with an antenna sits on the last letter. A chef figure, a café stall and the parked rover are in frame. | Attract-mode camera on rails; the title is a real 3D object in the world, not a 2D overlay |
| 2 s | Title | Camera passes *through* the letters at road level. The tram rails and dashed centre line lead into the distance. | Title letters have collision off; camera path is authored |
| 3–6 s | Title | Camera settles behind the rover. Red `SPACE · DRIVE` button. A pill row at the bottom: ✓ radio, daily, trophies, studio, new look, `A D` steer, jump, boost, all keys. | Press any key to start; options are reachable before playing |
| 7 s | Café Lane, timer 0:00.63 | Hard cut to a high "drone" view. The start street is a long pier over a turquoise sea. A teal water channel crosses the road. Coloured toy blocks float in the air. Speed 069. | Drone camera; the whole route floats over the sea |
| 8 s | Café Lane 0:01.69 | The district name stands in 3D letters over the road ahead. Notes spray behind the car. "RAMP!" pop text over a flat brown ramp panel on the road. Speed 132. | Ramp panels; hand-lettered pop text; 3D district titles |
| 9 s | Café Lane 0:02.69, 16:19 | Lighting is now late afternoon. Giant 3D notes float at head height; a red spiral lollipop prop; a pedestrian on the pavement. | Time of day changes live (the player is clicking presets) |
| 10 s | Café Lane 0:03.69, 14:25 NOON | Tutorial text painted on the road: "Steer through the notes". Pop text "FIZZY INK!". Market stall with striped awning. Speed 186. | Painted tutorial text in the world; a drink pickup ("Fizzy Ink") |
| 11 s | Café Lane 0:04.69, 13:27, RAIN on | Rain streaks start. Speed 168. | Rain toggles on top of any time preset |
| 12 s | Café Lane 0:05.69, 15:43 | The road bends up like a skate-park quarter-pipe into the yellow tower. Manga-style white speed lines appear round the screen edge. Speed 190. | Speed lines at high speed; road starts climbing a wall |
| 13 s | The Yellow Wall 0:00.93, 20:09 | Split card bottom-centre: "✓ Café Lane 0:05.70, +0.04 s vs best". Purple dusk, rain. A cat painted on a house wall. | District splits and deltas |
| 14 s | The Yellow Wall 0:01.93, 22:33 | **Bug:** the camera is inside a roof; the screen is 70 % flat brown. | Camera collision is missing |
| 15 s | The Yellow Wall 0:02.92, 01:13 DEEP NIGHT | The road runs straight up the wall. Houses stick out sideways. Street lamps glow; notes glow. | Night lighting, emissive props; gravity follows the road |
| 16 s | Ceiling Street 0:00.38, 05:50 | Split "The Yellow Wall 0:03.55". Morning light. Gravity compass says **UPSIDE DOWN**. | Gravity compass in the speed card |
| 17 s | Ceiling Street 0:01.33 | A Ferris wheel and green hills sit on the "ceiling" above. A snail on the road. | Background set pieces |
| 18–20 s | Ceiling Street 0:02–0:04, GOLDEN | Low chase camera; notes; a straw hat on the pavement. Status pills above the Songbook: "NOTE MAGNET · NO BOOST". | Pickups have a **buff and a drawback** |
| 21 s | Ceiling Street 0:05.38, DUSK | Green horseshoe magnet and a blue bottle float over the road. Speed sits at exactly **068** in many later frames. | 68 km/h is an auto-cruise floor: the car never stops |
| 22 s | Ceiling Street 0:06.38 | "FEATHER" pop text. Glowing yellow speed pads. Pills: "HIGH JUMPS · NO BRAKES". | Feather = high jumps but no brakes |
| 23 s | Ceiling Street 0:07.38, NIGHT | Windows lit, lamps, speed pads glow. | Night bloom |
| 24–25 s | Ceiling Street 0:08–0:09 | A high view shows the road running up a giant flat wall with window "tiles". Bougainvillea arches ahead. | Show-the-future: the next trick is always visible |
| 26 s | Bougainvillea Corkscrew 0:00.60 | 3D title letters next to the road; a paper plane; flower arches on black vines. Split "Ceiling Street 0:09.78, +0.88 vs best". | Title letters are placed in the level |
| 27 s | Corkscrew 0:01.58 | **Bug:** the camera is inside flowers and a roof. | Camera collision is missing |
| 28–29 s | Corkscrew 0:02–0:03, DUSK + RAIN | Low "cinema" camera close behind the car; wet purple road with white scribble ripples. | Cinema camera; wet-road shader |
| 30 s | Corkscrew 0:04.60 | The rover is upside down and airborne over the flowers. | Air time on a helix |
| 31 s | Corkscrew 0:05.60 | **Bug:** screen fully covered by orange foliage. | Same bug |
| 32 s | Corkscrew 0:06.60, NIGHT | Speed 194, speed lines, rain. | Top speed ≈ 190–200 km/h |
| 33 s | The Drop 0:00.03, NIGHT | Dark sea, radial speed lines, headlights on. | Headlights at night |
| 34 s | The Drop 0:01.03 | **Bug:** full teal screen — the camera is under the water. Pop text "FOCUS TEA!". Split "Corkscrew 0:07.57, +4.33 vs best". | Another drink pickup; the camera goes under water |
| 35–36 s | The Drop 0:02–0:03, DAWN→MORNING | A top-down view: the road plunges between two teal water chutes. "THUNDER" pop text (bolt pickup). | Top-down drone framing on drops |
| 37 s | The Drop 0:04.03 | "AIR 1.16 · SEALED" pop text. Magnet on the road. Lighthouse, paper boats, 3D letters "LEMON SPIRAL". | Air time scored; "sealed" = phrase completed in the air |
| 38 s | Lemon Spiral 0:00.88 | Split "The Drop 0:04.15, +1.16 s vs best". Gravity compass **DOWN IS DOWN**. Rainbow boost bar under the speed. | Boost meter |
| 39–40 s | Lemon Spiral 0:01–0:02 | Toy debris floats over the sea (rings, boots, cubes); cardboard crates on the road; "CRASH" text. | Soft obstacles you can knock over |
| 41 s | Lemon Spiral 0:03.88, GOLDEN | Pink bottle pickup, stacked crates, bolt, giant crayons hang in the sky, a loop in the distance. | More drink types |
| 42–44 s | Lemon Spiral 0:04–0:06, DUSK→NIGHT | Island villages float on the sea; a person on the pavement; magnet; bolt; notes. | Pedestrians on high roads |
| 45–47 s | Lemon Spiral 0:07–0:09 | "SKID!" text; brown ramp panels; dawn light. | Drift/skid feedback |
| 48–49 s | Lemon Spiral 0:10–0:11 | The road runs toward a huge hanging sheet of paper; "THE BLUE DOOR LOOP" letters far ahead. | Title visible from a distance |
| 50 s | The Blue Door Loop 0:00.78 | Split "Lemon Spiral 0:12.08, +1.83 s vs best". Small kiosks with blue doors line the road. | Theme prop per district |
| 51–53 s | Blue Door Loop 0:01–0:03, NOON | The road curves up; four lanes; floating book-spine pillars; a giant pencil in the sky. | School-supply sky props |
| 54–56 s | Blue Door Loop 0:04–0:06 | Inside the loop, upside down: green fields "above", the sea to the side, a blue ink balloon on the road. | Full loop; ink-balloon obstacle |

### Screenshots (five stills)

| Still | What it adds |
| --- | --- |
| 1 · Note burst | Collecting a cluster sprays 20–30 coloured notes round the car for about 1 s. Notes are thick, ink-outlined 3D shapes (quavers, paired quavers, crotchets) in yellow, pink, blue and green. |
| 2 · Intro card | Paper card: kicker "01 / A ROAD THAT FORGETS WHICH WAY IS DOWN", title "Paint the road. *Then drive up it.*" (second line in teal script), pitch paragraph, "Start with the radio on" checkbox, orange START THE ENGINE button, key legend. |
| 3 · Loop overview | A far view shows a loop, a spiral ribbon and floating islands at once: the level is a readable sculpture from the air. |
| 4 · Lemon Spiral title | Title card: tiny red Japanese line, big hand-lettered name, small poem line ("Round and round the painted tree"). Cat on the pavement, paper plane on the water. |
| 5 · Café Lane close | A panda leans on a balcony; lemon trees; four tram rails; a close tower block with vines. |

---

## 2. HUD teardown (read from full-resolution frames)

| Area | Exact contents seen | Our version |
| --- | --- | --- |
| Top-left | Round yellow logo, name, a small line of Japanese + "ink & wash roads". Clock box "03:30 DEEP NIGHT" (labels seen: DAWN, EARLY, MORNING, NOON, GOLDEN, DUSK, NIGHT, DEEP NIGHT). | Keep the clock with named time bands. |
| Top-left bar | Pills DAWN · MORNING · NOON · GOLDEN · DUSK · NIGHT · AUTO › · ☂ RAIN (active pill filled dark or blue). | Keep; add Snow, Fog, Wind in the weather menu. |
| Status chip | Dark pill: "♪ 14/280 · MORNING · velocity". The last word changes: *velocity, nocturne, dreamy, architect, postcard, sketchbook, maritime, weather · rain*. | Notes collected · time · **vibe** (the active art/music preset). |
| Top-centre timer | District name, big time "0:03.47", then "LAP 0:09.12 · BEST 2:14.94 · PB 0:03.30". | Keep; add ghost gap in metres. |
| Top-right | Chapter jump buttons: THE RIDE ↗ · COURTYARD ↗ · RIVERLIGHT ↗ · THE HOME ↗. | Our own chapter names, plus a map button. |
| Centre-bottom | Split card "✓ The Drop · 0:04.15 · +1.16 s vs best" (red = slower, green = faster). | Keep. |
| Above Songbook | Effect pills, e.g. "♪ +2 BOOST ▾ WOBBLY 1", "NOTE MAGNET ▾ NO BOOST", "FULL BOOST ▾ NO REFILL", "HIGH JUMPS ▾ NO BRAKES". | Buff ▾ drawback pills with a countdown ring. |
| Bottom-left radio | Yellow dial "88.3 MHz", "PAPER MOON FM", "TRACK 01 / 08", progress bar, ■ OFF · NEXT ♫ · BAND ⇄. | Keep the idea; our own stations. |
| Bottom-centre Songbook | "SONGBOOK 01/31 · 0/15 PHRASES" then ~13 tiny staff cards with coloured dots; the current one is outlined. | Keep. |
| Bottom-right speed card | Gravity compass (arrow + label: DOWN IS DOWN / UPSIDE DOWN / SIDEWAYS), 3-digit km/h, rainbow BOOST bar, JUMP ▾ and BOOST buttons, district name, and a stack: CAMERA · CHASE/DRONE/CINEMA, JOY MODE ✦ (label hard to read), TROPHIES 🏆, CHAPTERS ≡, STUDIO ✎. | Keep, and add the on-foot variant (stamina instead of speed). |
| Edges | A torn watercolour paper border; manga speed lines at high speed. | Keep both; speed lines can be turned off. |

---

## 3. Systems we can infer

1. **One ribbon road.** Districts join end to end with no loading. Timer resets per district but the lap keeps running.
2. **Road-relative gravity.** The compass proves gravity is computed from the road, not the world.
3. **Auto-cruise floor.** Speed never drops below about 68 km/h. Nobody gets stuck in a loop.
4. **Notes are a melody.** 280 notes per lap, 31 songbook pages and 15 phrases. Collecting completes phrases; "SEALED" appears when a phrase completes.
5. **Pickups with a trade-off.** Magnet (no boost), bolt/"Thunder" (full boost, no refill), feather (high jumps, no brakes), drinks such as "Fizzy Ink" and "Focus Tea" (effects not shown, likely wobble/slow-motion).
6. **Road furniture.** Ramp panels, speed pads, cardboard crates, ink balloons, snails.
7. **Four camera modes** at least: chase, drone (high), cinema (low and close), attract/title rail.
8. **Vibe presets.** A named mood (nocturne, postcard, sketchbook…) changes post-processing and probably music. The title screen button "new look" cycles them.
9. **Time and weather are free toys.** The player can change them any time, even mid-race.
10. **The world is a diorama over the sea.** Everything floats: piers, islands, toy debris, crayons, paper sheets.

## 4. Problems in the reference (we must beat these)

| # | Problem | Seen at | Our fix (chapter) |
| --- | --- | --- | --- |
| P1 | The camera goes inside roofs and foliage; the screen fills with one colour | 14 s, 27 s, 31 s | Sphere-cast camera collision and dithered fade of anything near the lens ([05](05-player-controllers.md#5-camera-system)) |
| P2 | The camera goes under the sea; flat teal for about 1 s | 34 s | Clamp above water; respawn fade ([05](05-player-controllers.md#5-camera-system)) |
| P3 | Pop text and district titles are hard to read on busy frames | 8 s, 10 s | Paper backing plate + ink outline for all world text ([10](10-ui-ux-hud.md)) |
| P4 | Time of day jumps every few seconds — pretty but dizzying | 9–47 s | Smooth 2 s blend; "calm lighting" option ([03](03-art-direction-watercolor.md)) |
| P5 | Frame rate dips to about 52 fps with every effect on | Studio panel | Half-resolution passes, dynamic resolution, quality tiers ([11](11-technical-architecture.md)) |
| P6 | HUD covers about 25 % of the screen at 900 px height | all | Compact HUD, auto-hide, HUD scale slider ([10](10-ui-ux-hud.md)) |
| P7 | Single player only; you can never leave the car | all | On-foot character, multiplayer hub and races ([05](05-player-controllers.md), [09](09-multiplayer.md)) |

## 5. What makes it feel good (keep these)

- The world looks like a sketchbook page, yet reads clearly at 190 km/h.
- You always see where you are going next: loops and spirals hang in the sky ahead.
- Every 10–12 seconds there is a new district title, a new road trick and new props.
- Nothing punishes you: no crashes, no fail state, a speed floor.
- Music comes from what you do: your line through the notes is the song.
- Toys everywhere: time of day, rain, camera, radio, art sliders — all live, all at once.

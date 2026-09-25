# 08 · Customisation, Creation and Settings

"Everything is a toy" (pillar 5). This chapter lists everything the player can change: their character, their vehicles, the look of the world, the rules, the controls — and what they can build and share.

## 1. Character creator

Opened at first launch (with a "random" button and a "skip" button) and any time at the wardrobe mirror in a hub.

| Category | Options |
| --- | --- |
| Body | Height (5 steps), build (4 shapes), body type sliders limited to a stylish range |
| Skin | 24 palette-safe tones + free picker |
| Face | 12 eye shapes, 10 brows, 8 noses, 10 mouths, freckles, blush, glasses |
| Hair | 30 styles, 2-colour hair (base + tips), hats that keep hair visible |
| Clothes | Tops, bottoms, dresses, jackets, shoes, socks, scarves — layered slots |
| Accessories | Backpacks, bags, badges, earrings, painter's apron, headphones |
| Colours | Every item has 2–3 colour zones; palette-safe or free picker (auto-softened to fit the art style) |
| Pattern | Stripes, dots, checks, flowers, paint splats; custom sticker designs |
| Voice | 6 hum/whistle voices for emotes (no speech) |
| Walk style | Normal, bouncy, sneaky, proud, sleepy |
| Emotes | 8 slots on the emote wheel |

Saved as **outfits** (up to 10). Outfits have a share code.

## 2. Garage: rover and other vehicles

| Category | Options |
| --- | --- |
| Body | Rover (default), Tram-bug, Scooter-van, Bubble coupé, Beach buggy, Delivery trike (unlockable) |
| Paint | Base, secondary, trim; finishes: flat gouache, glossy enamel, crayon, chalk, newspaper collage |
| Decals | Numbers, stripes, flowers, stickers; free placement on 6 panels |
| Wheels | 12 wheel styles, tyre width, hub colour |
| Roof load | Gramophone (default), boombox, flower pots, surfboard, picnic basket, cat bed (with cat), kite, easel |
| Wing / bumpers | 6 each |
| Lights | Headlight shape, light colour |
| Horn | 10 horns, each plays a note in key (trumpet, duck, bicycle bell, kazoo…) |
| Trails | Petals, confetti, paint drip, music notes, bubbles |
| Handling tune | Grip ↔ drift slider, steering speed, suspension soft ↔ firm (casual modes only; ranked uses fixed tunes per body) |

Balance rule: bodies differ in feel, not power. Each ranked body sits within ±2 % lap time of the others on the reference lap.

## 3. The Studio panel (live art tuning)

A slide-in panel, like the reference, with every rendering setting as a live slider ([03 §2.5](03-art-direction-watercolor.md#25-pass-settings-all-exposed-in-the-studio-panel)).

| Section | Contents |
| --- | --- |
| Camera | FOV, distance, height, look-ahead, roll in loops, shake, render resolution, auto-balance to hold 60 fps |
| Ink & paint | Ink strength, line weight, crispness, boil fps, pencil lines, colour bleed, edge darkening, wet edges, granulation, paper grain, border, glow |
| Colour | Saturation, warmth, contrast, shadow tint, LUT choice |
| World | Wind, prop density, crowd density, sky debris amount, falling petals/leaves |
| Sound | Engine hum, wind, music-box notes, ambience |
| Vibe | Choose preset, save current as a new vibe, share code, import code |
| Buttons | Play my song · New songbook · Reset to default |
| Readout | FPS, frame time, draw calls, triangle count (advanced toggle) |

Settings save locally and to the cloud profile. Vibes can be published to the community browser.

## 4. Settings (complete list)

### Graphics
Quality preset (Low / Medium / High / Ultra / Custom), resolution scale, dynamic resolution target (30/60/120 fps), frame cap, V-sync, shadow quality, view distance, crowd density, prop density, anti-aliasing, post-processing tier, renderer (WebGL2 / WebGPU, auto).

### Audio
Master, music, SFX, ambience, UI, voice, music-box notes; radio station default; mono audio; subtitles for voice lines; "streamer safe" music.

### Controls
Full rebinding per device and per context (on foot, driving, menus); hold vs toggle for sprint, crouch, drift, boost; sensitivity per camera; invert X/Y per camera; dead zones; response curves; vibration strength; gyro steering (supported gamepads and phones); touch layout editor (move/resize buttons).

### Camera
Default camera per pawn, FOV per camera, head bob, camera shake, auto-recentre, roll in loops, stable horizon, look-ahead strength.

### Accessibility
- Reduced motion (no line boil, no speed lines, no roll, no shake, slower blends).
- Colour-blind note shapes and 3 colour-blind palettes (for notes and UI, not the art).
- Text size 80–200 %, HUD scale, high-contrast UI cards, dyslexia-friendly font option.
- One-handed layouts; full auto-throttle; auto-steer assist (keeps the car centred, player only hops and boosts).
- Subtitles and captions for all sounds (e.g. "[phrase sealed chime]").
- Screen reader labels on all menus; full keyboard and gamepad menu navigation.
- Photosensitivity: limit flashes (thunder, bloom spikes).
- Game speed 50–100 % in single player.

### Gameplay
Rules preset and modifiers ([06 §6](06-gameplay-systems.md#6-game-rules-and-modifiers-everything-controllable)), HUD elements on/off each, speed units, clock 12/24 h, auto time-of-day speed, calm lighting, tutorial hints.

### Online
Visibility (online / friends only / invisible), who can join, text chat (off / friends / everyone), voice chat (off / push-to-talk / open mic), profanity filter, block list, parental controls PIN.

## 5. Photo mode

- Pauses solo play (in multiplayer the world keeps running; the player's pawn is protected).
- Free camera within 30 m of the pawn; FOV, roll, focus distance and blur.
- All Studio sliders plus time of day and weather available inside photo mode.
- Hide HUD, hide other players, hide own pawn, character poses (20) and expressions.
- Frames: sketchbook, postcard (with stamp: district and game time), polaroid, film strip, blank.
- Stickers and hand-written caption.
- Export PNG up to 4 K (renders at higher resolution in tiles), copy to clipboard, share to the in-game gallery.
- Group photo: in multiplayer, one player starts a group shot; everyone gets a 5-second pose window.

## 6. Creator: roads, districts and songs

A player-facing version of the internal track editor. This is the long-term content engine.

| Tool | What it does |
| --- | --- |
| **Road brush** | Draw a road in 3D by placing points; set up-vector, width, bank per point; presets for loop, corkscrew, wall climb, ceiling run |
| **Snap pieces** | Ready-made road pieces (a loop, a spiral, a drop) that snap together |
| **Dress** | Pick a prop kit and density; seeded placer fills both sides; hand-place hero props |
| **Furniture** | Place speed pads, ramps, crates, balloons, tonic boxes, checkpoints |
| **Melody** | Piano-roll of 32–64 steps; auto-place notes from the melody; choose key, tempo, radio station |
| **Mood** | Default time, weather and vibe |
| **Test** | Drive it instantly; ghost of your own test run |
| **Publish** | Title, description, tags, thumbnail from photo mode; the track must be finished once by its author |

Community browser: new, trending, most liked, friends', staff picks. Players can remix a published track (credit to the original). Moderation in [09 §8](09-multiplayer.md#8-safety-and-moderation).

Limits (to keep tracks playable in the browser): up to 2 km of road, 3,000 props, 400 notes, 50 furniture items.

## 7. Save data

| Data | Stored where |
| --- | --- |
| Settings, bindings, Studio | Local + cloud profile |
| Progress (phrases, postcards, stars, trophies, unlocks) | Local (guest) → cloud once signed in; merge on sign-in |
| Best times and ghosts | Cloud (local copy for offline) |
| Outfits, cars, vibes | Cloud |
| Photos | Local; optional upload to gallery |
| Created tracks | Cloud (drafts local) |

Guest progress is kept in IndexedDB and transferred to an account on sign-up. Offline single player works after the first load (installable PWA).

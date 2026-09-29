# Inkroads roadmap: what to build next (2027)

A plan for the year after launch, in four quarters. Each quarter has one
theme, so every update has a story for the store page and the trailer.

**Sizes:** S = a few days, M = 1–2 weeks, L = a month or more.
**Marks:**
- ★ = most likely to sell copies or earn good reviews;
- ✅ = built;
- 🧪 = built as a beta;
- ⏳ = the code is ready and it waits on something outside the code (recordings, accounts, people).

---

## Already built (for reference)

These were on earlier idea lists and are now in the game:

- **Creative play:**
  - paint trails (B1);
  - postcards and the mailbox (B2);
  - your own home (B3);
  - the weather brush (B5);
  - the story, *The Lost Palette* (B6);
  - the Sri Lanka road trip chapter (B7).
- **Festivals and events:**
  - Vesak lanterns, Avurudu (kana mutti, pillow fight) and Diwali rangoli (B8, first part);
  - the weekly photo contest and its billboard (B12).
- **Community and platforms:**
  - Steam Workshop for roads and liveries (C1);
  - offline single-player (A7);
  - the privacy policy (A9).
- **Game modes and places:**
  - the paper-plane flight mode;
  - paint battles;
  - the Tea Hills town;
  - the World's End;
  - calm viewpoints;
  - checkpoints and Continue;
  - call your vehicle.
  - **Book 2, the Grand Tour**: 10 km country road trips with journey missions, mid-lap checkpoints and passport stamps. all eight countries are built: Great Britain, Japan, India, China, Korea, Germany, Canada and Australia. Candidates for more: the USA, Norway, New Zealand, Iceland, Italy/France, Morocco and Mexico.
- **Living towns:**
  - people follow daily routines and react to the weather;
  - they react to you, and you can talk to anyone;
  - taxi rides, street cricket, tag and hide-and-seek;
  - buskers, animals, street food, souvenirs and the sketchbook;
  - crowd density with far-away stand-ins.
- **Operations:**
  - the **crash and performance dashboard** (admin → 🩺 Crashes & speed);
  - the Microsoft Store package on every push.
- **Music and sound:**
  - the Inkroads Studio radio station, the manifest and credits ⏳ (recordings needed; prompts for every track are in [SUNO.md](SUNO.md));
  - the **WebGPU renderer** 🧪 (Settings → Graphics → Renderer; see [WEBGPU.md](WEBGPU.md) and Q4).

---

## Q1 · January–March: launch polish ("reviews")

The first reviews decide a paid game's future. Fix everything a reviewer
would mention.

| # | What | Why | Size |
|---|---|---|---|
| 1 ★ | **Native-speaker review of translations**: Sinhala, Tamil, Hindi, Japanese first; the story text (prologue, clues, found pages, ending) and mission requests are still English only | Bad translations bring bad reviews; the story is the most-read text | S per language |
| 2 ★ | **Steam achievements** from the 108 trophies, and **Steam Cloud** saves (`steamworks.js` is already used for the Workshop) | Players expect both | S |
| 3 ★ | **Steam Deck check**: UI at 1280×800, gamepad-only menus everywhere (road studio, livery painter, wardrobe), on-screen keyboard | "Deck Verified" is a big badge | M |
| 4 ★ | **Demo build** (the Sketch chapter and Harbour Town) for Steam Next Fest | The biggest free source of wishlists | S |
| 5 ★ ⏳ | **Real music**: generate or commission the tracks in [SUNO.md](SUNO.md), then add a small loader so recorded sound effects and themes replace the synthesised ones | Music is half of the mood | M |
| 6 | **Photosensitivity setting**: turn off fireworks, lightning flashes and camera flashes (today *Reduce motion* and *Calm lighting* only slow things down) | Accessibility; age ratings | S |
| 7 | **Nightly bot play-test in CI**: run the QA driver (every mission, trial and flight course) each night and post failures | Catches broken missions before players do | M |
| 8 | **Steam build flag**: hide donation links; sell the Patron track only through Steam | Steam rules | S |

## Q2 · April–June: playing together ("community")

Timed for Avurudu (April) and Vesak (May), the two biggest Sri Lankan festivals.

| # | What | Size |
|---|---|---|
| 1 ★ | **Seasonal events** with limited cosmetics: a bigger Avurudu fair, a Vesak lantern night across every town, then Diwali and a snowy Christmas chapter later in the year | M each |
| 2 ★ | **Friends' ghosts** on every road, and "your friend beat your time" notices in the mailbox | S |
| 3 | **Replays**: save the last lap, scrub it with the photo-mode camera, and export a short clip | M |
| 4 | **Streamer mode**: hide names and chat; viewers vote on the weather | S |
| 5 | **Clubs 2**: club colours on cars, club convoys, a weekly club cup | M |
| 6 | **Ranked seasons** for time trials: monthly boards with a painted badge for the top 100 | S–M |
| 7 | **Radio DJ**: build a playlist from the radio tracks and share it as a code | S |

## Q3 · July–September: new places ("the big update")

| # | What | Size |
|---|---|---|
| 1 ★ | **Two new chapters**, for example *Monsoon Coast* (Kerala backwaters, Goa, the Maldives) and *Northern Lights* (Norway, Iceland, Lapland in snow) | L |
| 2 ★ | **Rhythm roads**: notes on the beat, and hitting them in time paints the sky; a songbook of perfect runs | M |
| 3 | **Kite festival**: fly a kite from a moving car on windy days; kite races on Galle Face Green | M |
| 4 | **Trains and ferries** you can ride between towns, looking around freely | M |
| 5 ★ | **Road Studio 2**: place props, jumps and boost pads; set weather and time; checkpoint races; remix others' roads | L |
| 6 | **Co-op "Restore the city" nights**: a room repaints a whole grey district together before dawn | M |
| 7 | **Pets with jobs**: the fox sniffs out pockets, the crane carries postcards, the cat naps on your roof | S–M |
| 8 | **Driving school and licence card** for new players | S |

## Q4 · October–December: new platforms ("reach")

| # | What | Size |
|---|---|---|
| 1 🧪 | **WebGPU renderer**: an opt-in beta is in the game (Settings → Graphics → Renderer, [WEBGPU.md](WEBGPU.md)). Next: try it on real PCs (canvas, photo mode, the Windows app), compare frame rates in the Crashes & speed dashboard's *Renderer* table, then make it the default where it's faster | M |
| 2 ★ | **Android** (then iOS), sharing accounts and saves with the PC version: touch controls exist; needs a mobile quality preset, battery-friendly frame cap, and store packaging | L |
| 3 | **Soundtrack DLC** and **art book DLC**: cheap, cosmetic, good for fans | S |
| 4 | **Paid expansion chapter** as DLC (for example the Q3 chapters, or a Sri Lanka rail journey) | L |
| 5 | **Inkroads for Schools**: a classroom edition with geography cards for every landmark, a teacher dashboard and no chat | M |
| 6 | **Sponsored roads** from Sri Lankan brands (tea, tourism), clearly labelled | S |
| 7 | **Server scaling**: several relays behind one address (sharding exists), a second region (Asia and Europe), automatic backups off the server | M |
| 8 | **Localized marketing**: store pages and trailers in Sinhala, Tamil, Hindi and Japanese | S |

---

## Ideas kept for later

- Watercolour filter packs (ink-only, pastel, ukiyo-e, temple painting).
- Day-night markets with daily cosmetics.
- A "calm mode" with no fail states and auto-steer, for young children.
- Varna's town gaining colour as the story goes on.
- A hummed line for Varna.
- Postcards from each colour after the credits.

## How to choose

Use the admin dashboard before each quarter:
- **Hours by place** and **Chapters started** show what players enjoy.
- **🩺 Crashes & speed** shows what's broken or slow.
- **Languages** shows which translations matter most.

Fix what's broken first, then build more of what players already love.

# Inkroads: sound and music prompts (Suno and sound-effect generators)

Ready-to-paste prompts for every piece of music and every sound in Inkroads:
- the main theme and songs with lyrics;
- story cues;
- a theme for each of the 48 districts in the 8 chapters, and each of the 5 towns;
- the 9 radio stations;
- game modes and festivals;
- every sound effect, down to the UI clicks.

Everything here is **original**: no artist names and no copied lyrics, so
what you generate can be yours.

---

## 0 · Before you start

### Which tool for what
| What | Best tool | Why |
|---|---|---|
| Themes, loops, radio tracks, songs with lyrics, jingles, stingers (musical, 2–10 s) | **Suno** (Custom mode) | Suno makes music: instruments, melody, vocals |
| Real-world sounds (doors, footsteps, tyres, rain, waves, splats) | A **sound-effect generator** (for example ElevenLabs Sound Effects or Stable Audio), or record them (foley) | Suno isn't built for single non-musical sounds; you'll get cleaner results elsewhere |

Every sound-effect prompt in section 8 is written to work in a sound-effect
generator. The musical ones (chimes, fanfares, stingers) also work in Suno.

### The licence (important for a paid game)
Songs made on Suno's **free plan are not licensed for commercial use**. For a
game you sell, generate on a **paid plan** (Pro or Premier) and keep a record
of each song (its Suno link and the date). Terms change, so check Suno's
current terms when you subscribe. The same applies to any sound-effect
service. In `public/music/manifest.json`, the `license` line for each track
should say something like *"Generated with Suno (Pro plan, 2026-10), owned by
HelaO2"*.

### How to enter a prompt in Suno
1. **Create → Custom**.
2. **Style of Music:** paste the *Style* line.
3. **Lyrics:** for instrumentals, turn **Instrumental** on, or paste the
   structure tags given (for example `[Intro] [Verse] [Chorus] [Outro]`). For
   songs, paste the lyrics.
4. **Title:** use the file name given (it keeps everything in order).
5. Generate. Suno gives two versions; keep the better one, **Extend** it if
   it's too short.

### Making loops (background music)
Game music loops. Generate **2–3 minutes**, then in a free editor such as
Audacity:
1. cut a section that starts and ends on the same chord (usually 8 or 16
   bars);
2. add a 10 ms fade at both ends;
3. normalise to about −16 LUFS for music and −20 LUFS for ambience beds;
4. export **OGG Vorbis or WebM/Opus, 48 kHz, ~128 kbps** (music) or **~96 kbps** (ambience).

Short stingers and sound effects: **48 kHz WAV** for editing, then **OGG**
for the game. Trim the silence at the start, so a sound plays the moment it
triggers.

### Where the files go
- **Music** works today. Put the file in `public/music/` (lower-case, dashes,
  for example `harbour-town-day.ogg`) and add it to `public/music/manifest.json`
  with its title, artist and licence. It plays on the **Inkroads Studio 109.5**
  station and shows in the credits. See [MUSIC.md](MUSIC.md).
- **Sound effects, ambience and chapter themes** are currently *synthesised
  live* by the game (`src/audio/`). The game doesn't yet load them from files.
  Put the files in `public/sfx/` and `public/music/themes/` using the file
  names below, and a small loader can swap each synthesised sound for its
  recording (with the synthesised one as a fallback). **The loader still
  needs to be written.**

### The sound of Inkroads (style bible)
Use these words across everything so the whole game sounds like one world:
- **Mood:** gentle, warm, hand-made, hopeful, a little whimsical; a road trip
  through living watercolour paintings. Never aggressive, never dark.
- **Core instruments:** nylon-string guitar, soft felt piano, ukulele,
  glockenspiel, marimba, brushed drums, upright bass, warm pads, whistling,
  hand claps. Paper-and-pencil textures (page turns, pencil scratches) as
  percussion.
- **Sri Lankan colour:** rabana and geta bera (hand drums), thammattama, flute,
  sitar or sarod touches, baila guitar strums, tea-country birdsong.
- **Mix:** soft and roomy, not loud; light tape saturation; no heavy sub-bass;
  leave space for engine and ambience.
- **Tempo:** 70–100 BPM when calm, 100–128 BPM when driving.

---

## 1 · Main theme and menu

| File | Style | Structure / notes |
|---|---|---|
| `inkroads-main-theme` | whimsical orchestral folk, felt piano, nylon guitar, glockenspiel, soft strings, rabana hand drum, hopeful, warm, watercolour road trip, 96 bpm, instrumental | `[Intro] [Theme A] [Theme B] [Build] [Theme A full] [Outro]`, about 2:30. The signature melody: a rising 5-note motif that later themes quote |
| `menu-loop` | soft felt piano and ukulele, gentle glockenspiel melody, light brushed drums, cosy morning, calm, 84 bpm, instrumental, seamless loop | 90 s loop of the main theme's motif, quieter |
| `title-sting` | short magical logo sting, soft chime cascade into warm piano chord, paper rustle, 4 seconds | Plays on the HelaO2 / Inkroads logo |
| `loading-loop` | minimal ambient pad, soft pencil-scratch percussion, slow music box, patient, 70 bpm, instrumental, loop | 45 s loop |
| `pause-loop` | muffled lo-fi piano, vinyl crackle, very soft, dreamy, 72 bpm, instrumental | 60 s loop (the game also muffles music in menus) |

---

## 2 · Songs with lyrics

Original lyrics you can use as they are. For **Sinhala and Tamil versions**,
ask a native lyricist to write new words to the same melody rather than
translating line by line, and check the pronunciation Suno sings.

### 2.1 Theme song: "Bring the Colours Home"
**Style:** warm indie folk pop, female vocal, nylon guitar, ukulele, felt piano, hand claps, glockenspiel, rabana drum, uplifting road trip anthem, 104 bpm

```
[Intro]
(hummed melody)

[Verse 1]
The storm came in over the harbour wall,
took every blue and gold and green,
the town went pale as a pencil line,
the quietest grey I've ever seen.
She gave me a palette, empty and light,
said "one from every road",
so I turned the key in a paper car
and followed where the rivers go.

[Pre-Chorus]
Past the lotus and the lion rock,
through the gates and the neon glow,

[Chorus]
Bring the colours home, bring the colours home,
every hill and every sea we roam,
one by one they come back bright,
paint the sky tonight,
bring the colours home.

[Verse 2]
Mustard found on a tower's side,
pink asleep in a lotus fold,
a blinking gate in a thousand reds,
a felucca trailing blue and gold.
Violet dancing where the signs don't sleep,
green curled up in the tea,
the road runs on, the road runs on,
and it brings them back to me.

[Pre-Chorus]
Over rails and the ocean spray,
every colour knows the way,

[Chorus]
Bring the colours home, bring the colours home,
every hill and every sea we roam,
one by one they come back bright,
paint the sky tonight,
bring the colours home.

[Bridge]
At the edge of the world where the stars begin,
I sit down and let the quiet in,
one stroke, one sky, one page to sign,
the roads are still there, waiting, fine.

[Final Chorus]
Bring the colours home, bring the colours home,
you were never really on your own,
one by one they come back bright,
paint the sky tonight,
bring the colours home.

[Outro]
(hummed melody, hand claps fade)
```

### 2.2 Credits song: "The Roads Are Still There"
**Style:** gentle acoustic ballad, soft male and female duet, felt piano, cello, brushed snare, sunset, bittersweet and hopeful, 78 bpm

```
[Verse 1]
The last page turned, the lanterns low,
the harbour hums the way it did,
a painter signs a name she knows
in the corner where the artists hid.

[Chorus]
And the roads are still there, waiting,
curling up the hills and down the shore,
every colour we've been painting
is brighter than it was before.

[Verse 2]
So drive a while, or walk the quay,
sit on a bench and watch the sky,
there's nothing more you have to be,
the world is yours to wander by.

[Chorus]
And the roads are still there, waiting,
curling up the hills and down the shore,
every colour we've been painting
is brighter than it was before.

[Outro]
Keep painting, keep painting,
the roads are still there.
```

### 2.3 Party song: "Paint the Town" (Baila Nights radio, festivals)
**Style:** upbeat Sri Lankan baila, fast strummed acoustic guitar, accordion, bongos, hand claps, group vocals, joyful, 132 bpm

```
[Intro]
(guitar strum, "hoi!")

[Verse]
Roll the windows down on Galle Road,
the sun is setting orange-gold,
the tuk-tuk bells go ring-a-ling,
come on, everybody sing!

[Chorus]
Paint the town, paint the town,
turn the colours up, never down,
dance until the moon comes round,
paint the town, paint the town!

[Verse]
Hoppers on the corner, drums in the street,
kites up high on the salty breeze,
grandma's dancing, so is the band,
grab a brush and grab a hand!

[Chorus]
Paint the town, paint the town,
turn the colours up, never down,
dance until the moon comes round,
paint the town, paint the town!

[Break]
(accordion solo, clapping)

[Outro]
Paint the town! (hoi!) Paint the town!
```

### 2.4 Lullaby: "Varna's Song" (World's End, Varna's theme)
**Style:** music box and soft female vocal, lullaby, celesta, gentle strings, night sky, tender, 66 bpm

```
[Verse]
Hush now, little colours,
the wind has gone to sleep,
the sea is folding over
the secrets it will keep.

[Chorus]
Stay close, stay close,
the stars are painting too,
I'll mix the dawn tomorrow,
a little bit of you.
```

---

## 3 · Story cues (*The Lost Palette*)

| File | Style | Length / notes |
|---|---|---|
| `story-prologue-the-storm` | cinematic storm, low strings tremolo, distant thunder, then a lonely music box, sad but gentle, instrumental | 60 s; the colours blow away |
| `story-varna-theme` | tender felt piano and cello, old painter, wise and kind, warm memories, 72 bpm, instrumental | 90 s loop; plays when you talk to her |
| `story-colour-found-01-mustard` … `-08-green` | magical chime swirl into a warm major chord, glockenspiel and harp, short, joyful | 4 s each. Pitch each one up a step (mustard lowest, green highest) so the eight together make a scale |
| `story-mission-complete` | short triumphant flourish, brass and glockenspiel, paper stamp hit, happy | 3 s |
| `story-journal-open` | page turn, soft pencil tap, single celesta note | 1.5 s |
| `story-finale-the-last-page` | emotional orchestral build, main theme on strings and piano, choir aahs, fireworks swell, cathartic, instrumental | 2:30; plays as you sit at the edge |
| `story-the-end` | the main theme slowed down, solo piano then full strings, closure, peaceful | 2:00, under the rolling credits |

---

## 4 · Chapter themes (68 districts)

**How to use:** each chapter has one **Chapter style**. For each district,
paste the chapter style **plus** the district's extra words into Suno's Style
field. Make each a **90–150 s loop**, instrumental. File name:
`theme-<chapter>-<district>`.

### 4.1 The Sketch (C major, playful). Chapter style: *playful pencil-sketch pop, ukulele, glockenspiel, pizzicato strings, whistling, hand claps, 108 bpm, instrumental*
| District | Add |
|---|---|
| Biscuit Row | cosy bakery morning, bouncy bass, warm |
| Mustard Tower | climbing melody, rising arpeggios, brave |
| Topsy Terrace | upside-down whimsy, woodblocks, tumbling runs |
| Petal Twist | spinning waltz feel, flute, flowers |
| The Inkfall | cascading harp and marimba, splashy, adventurous |
| Citrus Coil | zesty, bright brass stabs, sunny |
| Doorway Loop | curious, tick-tock clock, playful mystery |
| Ribbon Gate | triumphant finish line, full band, cheerful |

### 4.2 Serendib (Sri Lanka). Chapter style: *Sri Lankan island pop, rabana and geta bera drums, bamboo flute, nylon guitar, warm pads, sunny, 100 bpm, instrumental*
| District | Add |
|---|---|
| Galle Face Green | sea breeze, kites, evening promenade, gentle |
| Lotus Tower Spiral | modern city lights, soft synth arpeggio, spiralling |
| Sigiriya Lion Rock | ancient, majestic, sarod, deep drum, wonder |
| Ella Tea Hills | misty morning, birdsong, flute solo, peaceful |
| Nine Arch Bridge | train rhythm in the percussion, chugging, excitement |
| Mirissa Palms | beach, slow reggae-baila lilt, ukulele, relaxed |

### 4.3 Wonders of the Sketchbook. Chapter style: *world adventure orchestra, hand percussion, strings, flute, sense of discovery, 104 bpm, instrumental*
| District | Add |
|---|---|
| The Great Wall | erhu and guzheng, mountains, sweeping |
| Colosseum Ring | brass fanfare, Roman arena, heroic but playful |
| Taj Mahal Garden | sitar and tabla, sunrise, graceful |
| Machu Picchu Switchbacks | pan flute and charango, high altitude, clouds |
| Corcovado Climb | bossa nova guitar, Rio hills, bright |
| Chichen Itza Flyover | marimba and clay flutes, jungle, mystery |
| Petra Siq | oud and frame drum, desert canyon, warm echo |

### 4.4 Lantern Roads (East Asia). Chapter style: *East Asian lantern night, koto, shakuhachi, erhu, soft taiko, paper lanterns, 92 bpm, instrumental*
| District | Add |
|---|---|
| Fushimi Inari | a thousand red gates, rhythmic, walking pace |
| Arashiyama Bamboo | wind in bamboo, sparse, zen, airy |
| Hạ Long Bay | dan bau and misty water, floating, calm |
| Hội An Lantern Street | festive night market, plucked strings, warm glow |
| Himalayan Pass | singing bowls, high wind, vast, brave |
| The Great Wave | powerful taiko build, ocean surge, thrilling |
| Fuji and the Pagoda | serene sunrise, koto melody, gentle ending |

### 4.5 Postcards. Chapter style: *travel postcard cinematic folk, acoustic guitar, strings, gentle percussion, nostalgic, 96 bpm, instrumental*
| District | Add |
|---|---|
| The Nile at Giza | oud and ney flute, golden desert river, timeless |
| Santorini | bouzouki, white and blue, sea breeze, light |
| Kyoto by Night | koto and soft jazz piano, rainy lanterns, intimate |
| Kandy in the Rain | rain on leaves, Kandyan drum pattern softly, lake, reflective |
| Ella in the Rain | monsoon mist, flute and piano, cosy rain |

### 4.6 City Lights (Europe and beyond). Chapter style: *city lights evening, jazzy swing, accordion, upright bass, brushed drums, romantic, 112 bpm, instrumental*
| District | Add |
|---|---|
| Paris | musette accordion waltz, café, Eiffel at dusk |
| London | brass band and rainy piano, red buses, cheeky |
| Venice | mandolin and strings, gondola sway, canals |
| Amsterdam | barrel organ, tulips, bicycles, cheerful |
| Barcelona | flamenco guitar and cajón, sunny mosaics |
| Istanbul | saz and darbuka, bazaar, ferries on the Bosphorus |
| Dubai | modern Arabic pop pad, oud, desert highway, sleek |

### 4.7 Skylines. Chapter style: *lo-fi city pop, electric piano, funky bass, soft synths, night drive, neon, 118 bpm, instrumental*
| District | Add |
|---|---|
| New York | Broadway brass stabs, yellow cabs, bustling |
| San Francisco | surf-rock guitar, hills and cable cars, breezy |
| Rio de Janeiro | samba percussion, carnival, joyful |
| Tokyo | city pop, shimmering synths, Shibuya lights, dancing |
| Singapore | garden-city calm, gamelan-like bells, futuristic |
| Sydney | sunny surf pop, didgeridoo drone softly, harbour |

### 4.8 Island Road Trip (Sri Lanka road trip). Chapter style: *Sri Lankan road trip, rabana, thammattama, flute, nylon guitar, baila touches, warm and proud, 106 bpm, instrumental*
| District | Add |
|---|---|
| Colombo | busy city start, tuk-tuk horns in rhythm, energetic |
| Kandy Perahera | Kandyan drums and horanewa (oboe-like pipe), procession, majestic |
| Nuwara Eliya | cool hill country, strings, tea estates, misty |
| Ella | train and valleys, flute solo, adventurous |
| Yala | safari, deep drums, wild, elephants and leopards |
| Galle | old fort at sunset, baila guitar, ocean, homecoming |

### 4.9 Grand Tour · Great Britain (Book 2). Chapter style: *British folk road trip, fiddle, tin whistle, acoustic guitar, bodhrán, brass band touches, bright and adventurous, 100 bpm, instrumental*
Each district tune is 48 steps long (six phrases), so these can be 2–3 minute loops.
| District | Add |
|---|---|
| Edinburgh | Highland bagpipes and snare, pipe march, D mixolydian, drone, proud |
| The Highlands | misty glen, Celtic harp, low whistle, slow air, D dorian, lonely and wide |
| The Lake District | pastoral English folk, fingerpicked guitar, recorder, gentle, lakeside morning |
| York | church bells change-ringing, cathedral organ, medieval shawm, cobbled streets |
| The Cotswolds | morris dance jig, melodeon, fiddle, bells on ankles, village fête, sunny |
| Bath | Georgian minuet, harpsichord, string quartet, elegant, Jane Austen ballroom |
| Stonehenge | ancient and mysterious, frame drum, bone flute, drone, A phrygian, sunset over stones |
| Cornwall | sea shanty, accordion, stomping, fishermen's chorus humming, harbour, salt air |
| Wales | male voice choir humming a hymn, harp, broad and warm, D minor, valleys |
| Brighton | seaside music hall, brass band, honky-tonk piano, fairground organ, joyful finale |

### 4.10 Grand Tour · Japan (Book 2). Chapter style: *Japanese road trip, koto, shakuhachi, shamisen, taiko, modern city pop touches, bright, 100 bpm, instrumental*
| District | Add |
|---|---|
| Tokyo | 80s Japanese city pop, slap bass, synth brass, neon night drive, 124 bpm |
| Mount Fuji | yō pentatonic, shakuhachi and koto, calm lake morning, wide open |
| Shirakawa-gō | rural folk song, shamisen and flute, rice fields, a train passing |
| Kyoto | in scale (miyako-bushi), koto and temple bell, slow and golden, 80 bpm |
| Nara | gentle and playful, wooden flute, temple drum, deer in the park |
| Osaka | matsuri festival, taiko and shinobue, cheeky and loud, 132 bpm |
| Himeji | "sakura"-like koto melody, strings, blossom falling, graceful |
| Miyajima | gagaku court music colour, shō mouth organ, hichiriki, sea at dusk |
| Beppu | slow and steamy, soft koto, water sounds, relaxing hot spring |
| Okinawa | Ryūkyū scale, sanshin (snakeskin banjo), eisā drums, sunny island finale |

---

## 5 · Towns (free-roam areas)

Each town gets a **day** and a **night** loop (120–180 s, instrumental).

| File | Style |
|---|---|
| `town-harbour-day` | seaside town morning, ukulele, accordion, gulls, gentle brass, cheerful, 98 bpm |
| `town-harbour-night` | harbour at night, soft jazz guitar, lapping water feel, lanterns, 76 bpm |
| `town-serendib-city-day` | Sri Lankan city bustle, baila guitar, rabana, bright synth, 110 bpm |
| `town-serendib-city-night` | Colombo city night, lo-fi with tabla, neon, relaxed, 86 bpm |
| `town-lantern-village-day` | East Asian village, koto and flute, calm streams, 88 bpm |
| `town-lantern-village-night` | lantern festival night, erhu, soft bells, warm glow, 74 bpm |
| `town-tea-hills-day` | tea country morning, flute, nylon guitar, birdsong, misty, 90 bpm |
| `town-tea-hills-night` | cool hills night, soft sitar, crickets feel, peaceful, 70 bpm |
| `town-worlds-end` | cosmic calm, ambient pads, celesta, slow harp, Milky Way, meditative, 60 bpm |

**Viewpoints** (sitting on a bench): `calm-viewpoint-1` … `-4`: *ambient calm, slow pad chords, wind chimes, soft piano notes, very spacious, no drums, 55 bpm*, 3 min each.

---

## 6 · Radio stations

The game already has 8 generated stations with 8 tracks each. These prompts
let you replace or extend them with recorded tracks (on **Inkroads Studio
109.5**, or per station once the loader supports it). Each track is 2–3
minutes, instrumental unless noted. File name: `radio-<station>-<nn>`.

### 88.3 Paper Kite FM (lo-fi). Station style: *lo-fi hip hop, dusty drums, warm Rhodes, vinyl crackle, mellow, 80 bpm, instrumental*
1. Paper Kites at Noon: + ukulele sample, sunny
2. Pencil Shavings: + soft guitar, study vibe
3. Ink on My Fingers: + muted trumpet, jazzy
4. Afternoon Drive: + bouncy bass, windows down
5. Tea Break: + flute, gentle
6. Rainy Window: + rain ambience, sleepy
7. Sketchbook Pages: + music box, nostalgic
8. Last Light: + warm pads, sunset

### 92.1 Harbour Hum (acoustic). Station style: *acoustic folk, fingerpicked guitar, mandolin, light percussion, harbour town, 96 bpm*
1. Morning Nets: + whistling
2. Gull Song: + accordion
3. Rope and Sail: + fiddle, sea shanty feel
4. Lighthouse Steps: + piano, gentle
5. Fish Market Waltz: 3/4 waltz, accordion
6. Pier at Dusk: + cello, calm
7. Salt and Sunshine: + ukulele, bright
8. Home Port: + group humming (vocal ahhs)

### 97.7 Midnight Ink (ambient). Station style: *ambient electronic, soft evolving pads, gentle arpeggios, starry night drive, 70 bpm, instrumental*
1. Ink Nebula · 2. Night Ferry · 3. Glow of Streetlamps · 4. Slow Satellites · 5. Deep Blue Page · 6. Fireflies Over the Road · 7. Sleeping City · 8. Before Dawn
(add to each: + one distinctive colour: harp, glass bells, soft choir, felt piano, etc.)

### 101.4 Serendib Beat (island). Station style: *Sri Lankan island pop, rabana, bamboo flute, nylon guitar, bright synths, dancey, 112 bpm*
1. Galle Face Sunset · 2. Kite String · 3. Lotus Lights · 4. Coconut Road · 5. Train to Ella · 6. Mirissa Waves · 7. Spice Market · 8. Island Home

### 94.5 Baila Nights (baila). Station style: *classic Sri Lankan baila, fast acoustic strumming, accordion, bongos, claps, party, 128 bpm*
1. Paint the Town (the song in 2.3, vocal) · 2. Tuk-Tuk Two-Step · 3. Midnight Hoppers · 4. Beach Party Galle · 5. Grandma's Baila · 6. Kotthu Rhythm · 7. Full Moon Dance · 8. Last Bus Home

### 99.9 8-Bit Brush (chiptune). Station style: *chiptune, 8-bit square waves, arpeggios, retro game, cheerful, 128 bpm, instrumental*
1. Pixel Painter · 2. Power-Up Road · 3. Boss of the Bakery · 4. Warp Pipe Harbour · 5. High Score Hills · 6. Ghost Lap · 7. Coin Rain · 8. Credits Roll 8-Bit

### 104.2 Blue Hour Jazz (jazz). Station style: *smooth small-combo jazz, upright bass, brushed drums, piano, muted trumpet, blue hour, 100 bpm, instrumental*
1. Blue Hour · 2. Cobblestone Swing · 3. Rain on the Seine · 4. Café Corner · 5. Late Tram · 6. Saxophone Balcony · 7. Moonlit Bridge · 8. After Hours

### 107.1 Monsoon Raga (raga). Station style: *calm Indian classical fusion, sitar, bansuri, tabla, tanpura drone, monsoon, meditative, 84 bpm, instrumental*
1. First Rain · 2. Tea Country Raga · 3. Peacock Morning · 4. River Temple · 5. Monsoon Clouds · 6. Evening Lamp · 7. Green Valley · 8. Night Raga

---

## 7 · Game modes, festivals and seasons

| File | Style | Length |
|---|---|---|
| `mode-time-trial` | focused driving electronica, ticking hi-hat, pulsing bass, determined, 124 bpm, instrumental | 2:00 loop |
| `mode-race` | energetic racing funk, driving drums, brass stabs, exciting, 132 bpm, instrumental | 2:00 loop |
| `mode-race-countdown` | 3, 2, 1, GO: three soft marimba beeps then a bright chord and whoosh | 4 s |
| `mode-race-win` | victory fanfare, brass and glockenspiel, confetti joy | 4 s |
| `mode-race-lose` | gentle "aw" trombone slide, playful, not sad | 2 s |
| `mode-paint-battle` | playful chaotic funk, slap bass, bongos, silly brass, paint splats vibe, 126 bpm, instrumental | 2:00 loop |
| `mode-paint-battle-whistle-start` / `-end` | referee whistle, short and friendly | 1 s |
| `mode-flight` | soaring orchestral pop, strings and flute, wind, freedom, 100 bpm, instrumental | 2:00 loop |
| `mode-flight-course-complete` | rising harp glissando into a bright chord | 3 s |
| `mode-photo` | soft ambient piano, pause and look around, 70 bpm | 90 s loop |
| `mode-mission-start` | short quest jingle, pizzicato and glockenspiel, curious | 2 s |
| `mode-mission-complete` | happy 3-note fanfare and stamp | 3 s |
| `mode-mission-failed` | soft descending woodblock and sigh, gentle | 2 s |
| `mode-checkpoint` | paper slap then a rising glockenspiel arpeggio | 2 s |
| `mode-trophy` | sparkling chime cascade and a small brass hit | 3 s |
| `mode-new-best` | quick triumphant synth arpeggio, bright | 2 s |
| `mode-home` | cosy home theme, felt piano, fireplace crackle, warm, 76 bpm | 2:00 loop |
| `mode-road-studio` | creative workshop, marimba, pencil tapping rhythm, focused, 96 bpm | 2:00 loop |

**Festivals**
| File | Style |
|---|---|
| `festival-vesak` | Vesak night, gentle bells, soft flute, warm lanterns, peaceful devotional feel, 72 bpm, instrumental |
| `festival-avurudu` | Sri Lankan New Year (Avurudu), raban drumming circle, playful folk games, koel bird calls, joyful, 116 bpm |
| `festival-avurudu-raban` | traditional raban drumming, fast hand drums, celebration, 2 min loop |
| `festival-diwali` | Diwali festival of lights, sitar and dhol, sparkling bells, joyful, 110 bpm |
| `festival-perahera` | Kandy Esala Perahera procession, Kandyan drums, whip cracks, horanewa pipe, majestic, 96 bpm |
| `festival-fireworks-finale` | orchestral swell with fireworks, celebration, 45 s |

**Seasons.** Optional variants of the town loops. Add to any town style:
- winter: *+ sleigh bells, soft snow, cosy*;
- autumn: *+ warm cello, falling leaves*;
- spring: *+ bright flute, blossoms*.

---

## 8 · Sound effects

For each sound: **file name**, then the **prompt**. Keep short sounds short;
the length is in brackets. The character to aim for is **gentle, rounded,
slightly toy-like and papery**: the world is a watercolour sketchbook.
Nothing harsh, nothing realistic-gory.

### 8.1 UI
- `ui-click`: soft wooden click, like tapping a pencil on paper (0.1 s)
- `ui-hover`: very soft paper swish (0.15 s)
- `ui-open-menu`: page turn of a thick sketchbook (0.5 s)
- `ui-close-menu`: sketchbook page flipping back (0.4 s)
- `ui-tab`: light cardboard tab flick (0.15 s)
- `ui-toggle-on` / `-off`: soft tick up / tick down, marimba (0.2 s)
- `ui-slider`: tiny pencil scratch tick (0.05 s, repeats)
- `ui-toast`: soft bubble pop with a gentle chime (0.4 s)
- `ui-error`: soft low woodblock double tap, friendly not alarming (0.3 s)
- `ui-purchase`: coins into a cloth pouch and a bright chime (0.8 s)
- `ui-ink-earned`: soft ink drop plink with shimmer (0.3 s)
- `ui-equip`: fabric rustle and a small click (0.4 s)
- `ui-notification`: two-note glockenspiel ding (0.5 s)
- `ui-chat`: soft pop (0.15 s)
- `ui-screenshot`: vintage camera shutter, soft (0.4 s)

### 8.2 Driving (engines loop seamlessly; give an idle and a driving loop for each)
Engines, `engine-<type>-idle` and `engine-<type>-drive` (4 s loops):
- `classic`: small friendly petrol car engine, rounded, toy-like, not aggressive
- `buzzy`: tiny buzzing scooter engine, high pitched, cheerful
- `rumble`: deep soft V8 rumble, warm, smooth
- `electric`: quiet electric motor whine, smooth, futuristic, gentle
- `pedal`: bicycle freewheel ticking and chain, pedalling
- `burner`: hot-air balloon burner roar, soft whoosh bursts
- `turbo`: small sporty engine with turbo whistle, lively
- `tuk`: Sri Lankan three-wheeler tuk-tuk engine, rattly two-stroke putt-putt
- `jet`: soft cartoon jet engine hum, airy whoosh

Horns, `horn-<type>` (0.3–1.2 s):
- `toot`: friendly two-note car horn, rounded
- `beep`: quick double beep, small car
- `duck`: rubber duck quack horn, comic
- `bell`: bicycle bell ring, bright
- `trumpet`: little 4-note trumpet fanfare horn
- `train`: soft train whistle chord
- `conch`: conch shell horn, deep and warm
- `melody`: playful 5-note musical horn
- `honk`: goose honk horn, comic
- `chime`: three descending wind-chime notes

Other driving sounds:
- `tyre-roll-road` / `-cobble` / `-gravel` / `-grass`: tyre rolling loop on each surface (3 s loops)
- `tyre-screech`: short soft tyre squeal, not harsh (0.8 s)
- `drift-loop`: sustained gentle tyre slide (2 s loop)
- `boost-start`: whoosh with a rising sparkle (0.8 s)
- `boost-loop`: airy jet whoosh (2 s loop)
- `mini-turbo`: quick pop and sparkle whoosh (0.5 s)
- `gear-shift`: soft mechanical clunk (0.2 s)
- `hop`: springy boing, soft (0.3 s)
- `land-soft` / `land-hard`: soft thump of a small car landing, and a heavier bouncy thud (0.4 s)
- `bump`: rubbery bump into a soft wall (0.3 s)
- `thud`: cartoon cardboard crash, not metal (0.5 s)
- `door-open` / `door-close`: small car door open and close (0.4 s)
- `splash-car`: car driving into water, big soft splash (1.2 s)
- `boat-float-loop`: small boat bobbing, water lapping (4 s loop)
- `pad-boost`: bouncy spring pad whoosh (0.6 s)
- `ramp-launch`: swoosh up with wind (0.8 s)
- `stunt-land-cheer`: landing thump and a small crowd cheer (2 s)
- `car-drop-parachute`: parachute unfurling flutter and wind (1.5 s)
- `car-drop-land`: car landing on grass, soft thud and dust (0.6 s)
- `car-drop-chute-fold`: paper parachute crumpling (0.8 s)

### 8.3 Pickups, rewards, collectables
- `note-pickup`: *the game plays these as musical notes in the district's key; keep synthesised*
- `phrase-sealed`: bright glockenspiel chord with a paper stamp (0.8 s)
- `loot-common` / `-uncommon` / `-rare` / `-legendary`: treasure chest opening, from a small tinkle up to a magical choir sparkle (1–2.5 s)
- `secret-found`: magical discovery chime with soft whoosh (1.2 s)
- `pocket-found`: paper envelope opening and a sparkle (0.8 s)
- `trophy-unlock`: see `mode-trophy`
- `district-restored`: watercolour wash spreading, rising harp and chimes (2 s)
- `firework-launch` / `firework-burst`: soft whistle up, then a gentle crackling burst (1 s / 2 s)
- `cheer-small`: small group of people cheering happily (2 s)

### 8.4 On foot
- `step-stone-walk` / `-run`: soft sneaker steps on stone (single steps, 5 variations each)
- `step-grass-walk` / `-run`: steps on grass (5 variations)
- `step-wood-walk` / `-run`: steps on a wooden pier (5 variations)
- `step-sand-walk` / `-run`: steps on sand (5 variations)
- `jump`: small effort breath and cloth swish, cute (0.3 s)
- `land-foot`: soft landing on feet (0.3 s)
- `emote-wave` / `-dance` / `-clap`: cloth swish, happy hum, hand claps (1 s)
- `sit-bench`: sitting down on a wooden bench, soft creak (0.8 s)

### 8.5 Paper-plane flight
- `plane-launch`: paper plane thrown, whoosh and flutter (1 s)
- `plane-wind-loop`: gentle wind rushing past, rising with speed (4 s loop)
- `plane-gust`: burst of wind push, whoosh (0.8 s)
- `plane-stall`: flutter and wobble, paper flapping (1 s)
- `plane-ring`: passing through a ring, bright chime and whoosh (0.6 s)
- `plane-thermal`: rising warm air, soft airy swell (2 s)
- `plane-land`: paper plane sliding to a gentle stop (1 s)
- `plane-crash`: paper crumple, soft and funny (0.8 s)
- `plane-splash`: paper plane landing in water, small splash (0.8 s)

### 8.6 Paint battle
- `balloon-throw`: water balloon throw, swish (0.4 s)
- `balloon-splat`: paint balloon splat on ground, wet and juicy, cartoon (0.5 s)
- `balloon-hit`: splat on a person and a playful "ah!" (0.6 s)
- `splatted`: big splat with a comic slide whistle down (1 s)
- `battle-refill`: paint bucket slosh and pour (1 s)

### 8.7 World ambience (seamless loops, 30–60 s, low and even)
- `amb-birds-day`: tropical morning birdsong, gentle, varied
- `amb-crickets-night`: crickets and frogs at night, calm
- `amb-owl`: single distant owl hoots (one-shots, 3 variations)
- `amb-waves`: soft ocean waves on a sandy shore
- `amb-harbour`: harbour with gulls, water lapping on boats, rope creaks
- `amb-city-day`: distant friendly city traffic, tuk-tuks, horns far away, people chatting
- `amb-city-night`: quiet city night, distant traffic hum
- `amb-market`: busy outdoor market, chatter, vendors calling (no clear words)
- `amb-rain-light` / `amb-rain-heavy`: rain on leaves and roofs
- `thunder-near` / `thunder-far`: rolling thunder (3 variations each, one-shots)
- `amb-wind-gust`: gusty wind on a hilltop (loop)
- `amb-waterfall`: rushing waterfall and river (loop)
- `amb-stream`: small stream babbling
- `amb-tea-hills`: misty tea hills, distant birds, insects, very calm
- `amb-jungle-yala`: jungle safari, exotic birds, distant elephant trumpet
- `amb-temple`: temple bells in the distance, soft chanting hum (no words)
- `amb-bamboo`: wind through bamboo, creaking stalks
- `amb-worlds-end`: vast cosmic quiet, soft wind, faint shimmering tones
- `amb-wind-chimes`: gentle wind chimes (loop)
- `amb-calm-pad`: soft slow ambient pad chords (loop, see section 5 viewpoints)
- `train-pass`: Sri Lankan train passing on a bridge, horn and clatter (6 s)
- `train-horn`: diesel train horn, distant (2 s)
- `tuktuk-pass`: tuk-tuk passing by (3 s)
- `elephant-trumpet`: elephant trumpet, distant (2 s)
- `gull`: seagull calls (3 variations)
- `boat-horn`: harbour boat horn, deep, distant (2 s)

### 8.8 Festivals
- `vesak-lantern-hang`: paper lantern rustle and a soft bell (1 s)
- `vesak-lantern-light`: candle lighting, soft whoomph glow (0.8 s)
- `avurudu-kana-mutti-swing`: stick swing whoosh (0.4 s)
- `avurudu-kana-mutti-smash`: clay pot breaking with a burst of sweets, cheerful (1 s)
- `avurudu-pillow-hit`: pillow thump, soft and funny (0.5 s)
- `avurudu-koel`: Asian koel bird call (the New Year bird) (2 s)
- `diwali-rangoli-pour`: coloured powder pouring, soft hiss (1 s)
- `diwali-sparkler`: sparkler fizz (loop 3 s)
- `perahera-drums`: Kandyan drum ensemble, distant, parade (loop 30 s)
- `perahera-whip`: ceremonial whip crack (3 variations)
- `perahera-elephant-bells`: elephant bells jingling as they walk (loop)

### 8.9 Pets
- `pet-cat`: tiny paper-toy cat meow, cute (3 variations)
- `pet-fox`: small fox yip, friendly (3 variations)
- `pet-crane`: paper crane call, soft flutter and chirp (3 variations)
- `pet-happy`: little purr / happy chirp (1 s)

### 8.10 Story and home
- `palette-swirl`: magical paint swirl, shimmering chimes and a soft whoosh (1.5 s)
- `colour-found`: see `story-colour-found-*` (musical)
- `varna-hum`: warm elderly woman humming a short tune (2 s, no words)
- `page-turn`: sketchbook page turn (0.5 s, 3 variations)
- `pencil-scribble`: quick pencil scribble on paper (0.6 s)
- `stamp`: rubber stamp press on paper (0.3 s)
- `mailbox-open`: small tin mailbox opening (0.6 s)
- `postcard-arrive`: envelope slide and a soft bell (0.8 s)
- `home-place-furniture`: soft wooden placing thunk (0.3 s)
- `mural-brush`: paintbrush stroke on a wall, wet (0.5 s, loopable)

---

## 9 · Checklist

- [ ] Paid Suno plan active before generating anything for the game
- [ ] Style bible words used in every prompt (section 0)
- [ ] Every file named as in this document
- [ ] Loops trimmed and seamless; one-shots trimmed at the start
- [ ] Levels: music around −16 LUFS, ambience around −20 LUFS, sound effects peaking at about −3 dBFS
- [ ] Music added to `public/music/manifest.json` with a licence line
- [ ] Sinhala and Tamil song versions written by native lyricists
- [ ] Sound effects in `public/sfx/`, then add the file loader so the game uses them

# Music in Inkroads

## What the game has now

- **Eight procedural radio stations** (Paper Kite FM, Harbour Hum, Midnight Ink, Serendib Beat, Baila Nights, 8-Bit Brush, Blue Hour Jazz, Monsoon Raga). They are generated live in Web Audio in each district's key and tempo, and the notes you pick up play along on the beat. They are original, owned by you, and need no licence.
- **A ninth station, Inkroads Studio (109.5)**, which plays **recorded audio files**: whatever is listed in `public/music/manifest.json`. It goes through the same music bus, so the music volume, the menu muffling and the radio on/off (T), next song (N) and station (B) keys all work. The credits screen lists every track with its artist and licence.
- Four starter tracks are in `public/music/` (about 700 KB each, 60 s, WebM/Opus 96 kbps): *Harbour Morning*, *Lotus Tower Lights*, *Rain on the Seine* and *Tea Country Raga*. They were **recorded from the game's own music engine** with `tools/render-music.mjs`, so they are original and yours. But they are the same synthesised sound as the radio, **not** played by musicians.

## What "real music" needs (only you can do this)

For a premium Steam release, a human-made soundtrack makes a big difference. Options:

1. **Commission a composer** (recommended for a signature sound). Brief: gentle watercolour road trip; one theme per chapter (Sri Lankan hills and coast with rabana, baila and flute; City Lights with musette accordion and jazz; Skylines with lo-fi and city pop; Lantern Roads with koto and erhu), plus loops for Harbour Town. Ask for **stems or loop-able 2–3 minute pieces**, a **written licence** covering games, trailers, the store page and streaming, and the right to sell a soundtrack DLC on Steam.
2. **License tracks** from a library with clear game licensing (keep the licence PDFs). Avoid anything "free for personal use only".
3. **Sri Lankan musicians**: recording local artists for the Island Road Trip chapter would be a strong story for the press kit.

To add a track: put the file in `public/music/` (lower-case name with dashes; `.webm`, `.ogg`, `.opus`, `.mp3` or `.m4a`), then add it to the manifest:

```json
{ "title": "Tea Hills at Dawn", "artist": "Name of the musician", "license": "Commissioned for Inkroads, all rights HelaO2 (contract 2026-10)", "file": "music/tea-hills-at-dawn.ogg" }
```

The game refuses entries without a licence line or with files outside `music/`. Remove the engine-rendered placeholders when the real soundtrack arrives, and re-run `node tools/render-music.mjs` any time you want fresh renders (it needs `npx vite` running).

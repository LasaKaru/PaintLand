# Store pages: copy and art, ready to paste

For Steam step by step (every field, sizes and the upload), see
[STEAM_PUBLISHING.md](STEAM_PUBLISHING.md). Inkroads is sold as a premium
(one-time purchase) game.

Everything below matches what is in the game today. Keep it true when you
edit: store reviewers and players check.

- Art: `public/press/capsules/`, made by `node tools/store-art.mjs`
- Screenshots: `public/press/shots/`
- Trailer: `node tools/trailer.mjs` (on a machine with a graphics card)
- Press kit page: `/press/` on the game's own server (from `public/press/index.html`)

## Name and short lines

- **Name:** Inkroads
- **Tagline:** A watercolour road trip
- **One line (≤ 80 chars):** Drive through living watercolour paintings, alone or with friends.
- **Short description (Steam, ≤ 300 chars):**
  > Drive through living watercolour paintings: from Galle Face and Sigiriya to Kyoto's lantern streets and the Nile. Collect notes that play along with each district's music, roam three painted towns, build and share roads, and play together in convoys, contests and races.

## Long description

> **Inkroads is a road trip through living watercolour paintings.**
>
> Drive a little rover along roads that loop, dive and roll through eight
> painted chapters: the Sketch, Serendib (Sri Lanka), the Wonders of the
> World, Lantern Roads across Asia, Postcards from the Nile to the tea hills
> of Ella, City Lights (Paris, London, Venice, Amsterdam, Barcelona,
> Istanbul, Dubai), Skylines (New York, the Golden Gate, Rio, Tokyo,
> Singapore, Sydney) and an Island Road Trip across Sri Lanka from Colombo
> to Galle. There are 52 districts, each with its own music. The notes you
> pick up play along with it, on the beat.
>
> **Roam three towns.** Harbour Town, Lantern Village and Serendib City are
> open to explore on foot or on wheels. There are 20 hidden pockets, murals
> to paint, photos to take, and sketched districts to bring back to colour.
> The towns dress up for Vesak, Sinhala and Tamil New Year and Diwali, and
> change with the seasons.
>
> **Make it yours.** Ten vehicles, from a paper boat that floats to a lantern
> balloon. 99 garage parts, paint finishes and wraps. 131 wardrobe items,
> fabric prints, pets and saved outfits. Paint your own livery.
>
> **Play together.** Join friends in rooms: convoys, drift and stunt
> contests, co-op paint splashes, races checked by the server, group photos,
> an emote wheel and opt-in voice chat.
>
> **Build roads.** The Road Studio lets you make loops, dives and barrel
> rolls in any district's style, share them in the gallery, and enter the
> weekly contest.
>
> **Fair by design.** Buy once and everything that affects play is yours:
> the in-game shop takes only ink you earn by driving. Nothing you can buy
> helps you win.
>
> **For everyone.** 24 languages, keyboard and screen-reader friendly menus,
> reduced motion, a chat filter, mute, block and report, and a parental PIN.

## Feature bullets (itch.io, Play Store "What's in it")

- Five painted chapters, 33 districts, music you play as you drive
- Three free-roam towns with secrets, murals, festivals and seasons
- 10 vehicles, 99 garage parts, 131 wardrobe items
- Online play: convoys, contests, co-op events, verified races, voice (opt-in)
- Road Studio with a shared gallery and weekly contest
- 108 trophies, sticker books and seasonal goals
- 24 languages; accessible menus
- Buy once; no pay-to-win

## Tags / genres

Steam tags to pick: Driving, Casual, Relaxing, Exploration, Open World,
Multiplayer, Level Editor, Colorful, Stylized, Cute, Family Friendly, Atmospheric.
itch.io genre: Racing; tags: watercolor, driving, cozy, multiplayer, sri-lanka.

## Languages (24)

English, Sinhala, Tamil, Hindi, Bengali, Urdu, Arabic, Persian, Chinese
(Simplified), Japanese, Korean, Thai, Vietnamese, Indonesian, Swahili,
Turkish, Russian, Polish, German, French, Spanish, Portuguese, Italian, Dutch.
Interface and subtitles only: the game has no spoken dialogue. The
translations were made without native-speaker review. Get them checked
before listing a language as fully supported.

## System requirements (browser / Windows app)

Measured so far only in a build container with software rendering. Confirm
these on real machines before publishing (Settings → Graphics → *Run
benchmark*).

| | Minimum | Recommended |
| --- | --- | --- |
| OS | Windows 10 64-bit, macOS 12, recent ChromeOS/Android/iOS browser | Windows 11 |
| Browser | Chrome, Edge or Firefox with WebGL 2 | latest Chrome or Edge |
| Graphics | integrated GPU with WebGL 2 (Low preset) | GTX 1060 / RX 580 class or better (High) |
| Memory | 4 GB | 8 GB |
| Network | broadband for multiplayer | — |
| Storage (Windows app) | the installer size (check the built one) | — |

## Age rating questionnaire (IARC / Steam content survey)

Answer truthfully:

- **Violence:** none.
- **Language:** none in the game's own text. **Players can chat**: text chat
  is filtered and can be turned off, and voice chat is off by default.
- **User-generated content:** yes. Players can share roads, road names,
  murals, liveries and player names. Moderation: filtering, reporting, admin
  review and bans.
- **Purchases:** real-money purchases are not built in yet. If you add them,
  declare "in-game purchases (cosmetic)".
- **Location sharing:** none. **Personal data:** optional accounts use a
  name and password only (no email); anonymous analytics.

## Store checklist (only the owner can do these)

- [ ] Steamworks account and the app fee; fill the pages with the copy above
- [ ] Code-signing certificate for the Windows app (unsigned apps show a warning)
- [ ] A proper 1080p trailer from `tools/trailer.mjs` on a real GPU, with music
- [ ] Native-speaker review of the translations
- [ ] A privacy policy URL (the analytics and accounts are described in `server/admin.mjs` and `server/accounts.mjs`)
- [ ] Decide the release date; update the press kit's fact sheet

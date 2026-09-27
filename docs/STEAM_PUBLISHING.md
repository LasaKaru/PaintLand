# Publishing Inkroads on Steam: everything to fill in and submit

This is the whole path from "no account" to "released", with the text and art
to paste into each field. Inkroads is sold as a **premium game (one-time
purchase)**.

Steam's rules and forms change. Where this guide gives a number (fees, wait
times, image sizes), check it against the Steamworks documentation linked in
each section before you rely on it. Everything written here about the game
itself is true of the build in this repository.

Files this guide refers to:

| What | Where | How to (re)make it |
| --- | --- | --- |
| Store capsules and backgrounds | `public/press/capsules/` | `npm run dev`, then `npm run store-art -- --capsules-only` |
| Screenshots (1920×1080) | `public/press/shots/` | `npm run store-art -- --shots-only --quality high` (on a PC with a graphics card) |
| Trailer | `tools/out/trailer.webm` | `npm run trailer -- --quality high` (on a PC with a graphics card) |
| Windows game build | `desktop/release/win-unpacked/` | `cd desktop && npm run dist` (see §8) |
| Store text (short version) | `docs/STORE_PAGE.md` | — |

---

## 1. Before you start: decisions only you can make

- [ ] **Price.** Pick a USD base price. Steam then suggests prices for every region. Cosy indie
      driving and exploration games usually sell for **US$9.99–19.99**.
- [ ] **Release date,** or a season if you are not sure yet ("Q2 2027").
- [ ] **What happens to the free web version.** If the full game stays free in the browser,
      few people will pay on Steam. Choose one:
      (a) take the public web build down,
      (b) keep it as a **free demo** (for example the Sketch chapter and Harbour Town only), or
      (c) publish that demo on Steam as a separate *Demo* app, which Steam supports and which helps wishlists.
- [ ] **In-game money on Steam.** The Steam version must not link to outside payment for
      in-game content. So, in the Steam build:
      - Hide the donation and "fund us" links.
      - Leave the Patron track to codes only, or sell it with Steam's own in-game purchases (Steam Wallet).
      - Sponsor boards and sponsor challenges are advertising. They are allowed, but decide
        whether you want ads in a paid game. They can be switched off in the admin panel.
- [ ] **Name check.** Search "Inkroads" on Steam, and in trademark databases for the countries you
      sell in, before paying for art or ads.

## 2. Join Steamworks (one time)

1. Create a Steam account for the company (or use your own). Turn on Steam Guard (the mobile authenticator).
2. Go to **partner.steamgames.com** and choose *Join the Steamworks program*.
3. Fill in:
   - **Company or legal name** (HelaO2, or your own name as a sole trader), address, contact email.
   - **Bank details** for payments.
   - **Tax interview.** Outside the US you complete a W-8BEN (individual) or W-8BEN-E (company).
     If your country has a tax treaty with the US, you can claim a lower withholding rate.
     Ask a local accountant.
   - **Identity verification.**
4. **Pay the Steam Direct fee for the app.** It is US$100 per game at the time of writing, and
   is paid back once the game earns US$1,000 on Steam. After paying, Valve makes you **wait
   30 days** before the game can be released. Pay it early.
5. You receive an **App ID** (for example `2987650`) and a first **Depot ID** (usually the
   App ID + 1). Write them down; §8 needs them.

Docs: *Steamworks → Getting started / Steam Direct / Onboarding*.

## 3. Store page: basic info (Steamworks → your app → Store page → Basic info)

| Field | What to enter |
| --- | --- |
| **Game name** | `Inkroads` |
| **Developer** | `HelaO2` |
| **Publisher** | `HelaO2` |
| **Franchise** | leave empty |
| **Supported OS** | Windows (the Electron build is Windows x64). macOS/Linux can come later |
| **Release date** | the date, or "Coming soon" with a season |
| **Website** | `https://helao2.com` (or the game's own page) |
| **Genres** | Casual, Indie, Racing, Simulation |
| **Early Access** | No (unless you want feedback before 1.0: then Yes, with the Early Access questions filled in) |

### Short description (max 300 characters)

```
Drive through living watercolour paintings: from Galle Face and Sigiriya to Kyoto's lantern streets and the Nile. Collect notes that play along with each district's music, roam three painted towns, build and share roads, and play together in convoys, contests and races.
```

(270 characters.)

### "About this game" (long description)

Steam's editor accepts simple BBCode (`[h2]`, `[b]`, `[list]`, `[img]`). Paste this:

```
[h2]A road trip through living watercolour paintings[/h2]
Drive a little rover along roads that loop, dive and roll through five painted chapters: the Sketch, Serendib (Sri Lanka), the Wonders of the World, Lantern Roads across Asia, and Postcards from the Nile to the tea hills of Ella. There are 33 districts, each with its own music. The notes you pick up play along with it, on the beat.

[h2]Roam three towns[/h2]
Harbour Town, Lantern Village and Serendib City are open to explore on foot or on wheels. There are 20 hidden pockets, murals to paint, photos to take, and sketched districts to bring back to colour. The towns dress up for Vesak, Sinhala and Tamil New Year and Diwali, and change with the seasons.

[h2]Make it yours[/h2]
[list]
[*]10 vehicles, from a paper boat that floats to a lantern balloon
[*]99 garage parts, paint finishes and wraps, and a livery painter
[*]131 wardrobe items, fabric prints, pets and saved outfits
[/list]

[h2]Play together[/h2]
Join friends in online rooms: convoys, drift and stunt contests, co-op paint splashes, races checked by the server, group photos, an emote wheel and opt-in voice chat.

[h2]Build roads[/h2]
The Road Studio lets you make loops, dives and barrel rolls in any district's style, share them in the gallery, and enter the weekly contest.

[h2]Fair by design[/h2]
Buy once. Everything that affects play is earned by playing; nothing you can buy helps you win.

[h2]For everyone[/h2]
24 languages, keyboard and screen-reader friendly menus, reduced motion, a chat filter, mute, block and report, and a parental PIN.
```

Add 2–3 animated GIFs between sections (drifting, a loop, a festival), under 3 MB each.
Steam players read GIFs more than text. Record them from the trailer.

## 4. Tags (up to 20; the first ones count most)

In this order:

1. Driving
2. Relaxing
3. Exploration
4. Colorful
5. Stylized
6. Cute
7. Open World
8. Multiplayer
9. Level Editor
10. Casual
11. Atmospheric
12. Family Friendly
13. Wholesome
14. Racing
15. Singleplayer
16. Online Co-Op
17. Beautiful
18. Cozy
19. Indie
20. 3D

Check that each tag is on Steam's list (the tag picker only offers existing ones). Swap any
that are missing for the nearest match.

## 5. Store assets (Steamworks → Store page → Graphical assets)

Valve's current rule: **capsules show only game artwork, the game's name, and an optional
official subtitle**. No review quotes, awards, prices or "Wishlist now" text. The files in
`public/press/capsules/` follow this rule.

| Asset | Size (px) | File | Notes |
| --- | --- | --- | --- |
| Header capsule | 920×430 | `steam-header.png` | top of the store page, search results |
| Small capsule | 462×174 | `steam-small.png` | lists; the name must be readable |
| Main capsule | 1232×706 | `steam-main.png` | front-page features |
| Vertical capsule | 748×896 | `steam-vertical.png` | seasonal sales |
| Page background | 1438×810 | `steam-page-background.png` | optional; kept soft (no text) |
| Library capsule | 600×900 | `steam-library-capsule.png` | players' libraries |
| Library header | 920×430 | `steam-library-header.png` | library, recent games |
| Library hero | 3840×1240 | `steam-library-hero.jpg` | library background (no text; the logo is drawn on top) |
| Library logo | 1280×720 max, transparent PNG | `steam-library-logo.png` | placed over the hero |
| Event cover | 800×450 | `steam-event-cover.png` | for news/events posts |
| Event header | 1920×622 | `steam-event-header.png` | for news/events posts |
| App icon | 184×184 (jpg) and 32×32 (ico) | make from `public/press/icon.png` | Steamworks → App Admin → Community assets |

**Screenshots:** at least 5, 1920×1080, from the actual game, with no marketing text on them.
Put the best one first, because it shows on hover everywhere. Use the eight in
`public/press/shots/`, but **re-take them on a PC with a graphics card** at High or Ultra.
The ones in the repo were rendered in software and look plainer than the real game.

**Trailer:** see §6.

## 6. Trailer

- **Length:** 30–90 s. Show gameplay within the first 5 seconds. Keep it under 2 minutes.
- **Format:** MP4 (H.264), 1920×1080, 30 or 60 fps, high bitrate (5,000+ kbit/s), with sound.
- **Making it:** `npm run trailer -- --width 1920 --height 1080 --fps 30 --quality high` on a PC
  with a graphics card writes `tools/out/trailer.webm` (about 60 s, no sound).
  1. Open it in a free editor (DaVinci Resolve, Shotcut, CapCut) or HandBrake.
  2. Add music: your own or licensed. Not the procedural radio unless you are happy with it.
  3. Export MP4 (H.264).
- The 60-second cut in this repository (`public/press/trailer-60s.webm`) was rendered in software
  at 1280×720. Use it as a storyboard and a placeholder, **not** as the final store trailer.
- Mark one trailer as the **"Store page trailer"** in Steamworks.
- The first trailer's thumbnail shows in many places: pick a colourful frame.

## 7. Other store-page sections

### Languages (Store page → Languages)

For each language, tick *Interface* and *Subtitles* (the game has no spoken dialogue, so no
*Full audio*):

English, Sinhala, Tamil, Hindi, Bengali, Urdu, Arabic, Persian, Simplified Chinese, Japanese,
Korean, Thai, Vietnamese, Indonesian, Swahili, Turkish, Russian, Polish, German, French,
Spanish (Spain), Portuguese (Portugal/Brazil), Italian, Dutch.

⚠️ The translations have not been checked by native speakers. Tick only the languages you have
had reviewed. Steam players leave bad reviews for machine-quality text. English, Sinhala and
Tamil first.

Steam's language list may not have every language (for example Sinhala or Swahili). Tick what
exists and mention the rest in the description.

### System requirements

**Minimum**

- OS: Windows 10 64-bit
- Processor: dual-core 2.0 GHz
- Memory: 4 GB RAM
- Graphics: integrated GPU with WebGL 2 / DirectX 11 (Intel UHD 620 class)
- Storage: 500 MB available space (check the real size of `win-unpacked`)
- Network: broadband internet connection (for online play only)

**Recommended**

- OS: Windows 11 64-bit
- Processor: quad-core 3.0 GHz
- Memory: 8 GB RAM
- Graphics: GTX 1060 / RX 580 class or better
- Storage: 500 MB available space

⚠️ These are estimates. Before submitting, run *Settings → Graphics → Run benchmark* on a
low-end laptop and a mid-range PC, and correct the numbers.

### Controller support and Steam Deck

- The game supports gamepads (stick, triggers, A/B/X/Y) and rebinding.
- In Steamworks → *Controller support*, choose **"Partial controller support"** until every menu
  (road studio, livery painter, admin) works fully without a mouse. After that, choose
  "Full controller support".
- **Steam Deck:** Valve tests it after release. The game already has touch controls and scales
  its UI, but check text size at 1280×800 and that the on-screen keyboard appears for name fields.

### Content survey (Store page → Content survey / Mature content)

Answer honestly:

- **Violence, gore, sexual content, drugs, gambling:** none.
- **Frequent nudity or sexual content:** no.
- **Online interaction:** yes. Text chat (filtered; can be turned off), opt-in voice chat, and
  user-generated content: shared roads, road names, murals, liveries and player names.
  Moderation: filter, mute/block, report, admin review and bans.
- **In-game purchases:** none with real money, unless you sell the Patron track through Steam.
  The shop uses earned ink only.
- **Loot boxes:** loot chests exist but are found in the world and opened for free. They cannot
  be bought. Say so if the form asks.

### AI-generated content disclosure (required)

Steam asks whether AI was used to make the game's content, and to describe it. This game was
developed with an AI coding assistant, which also wrote translations, in-game text and
procedurally generated models. Say so plainly, for example:

> Pre-generated: parts of the code, the 3D models (built procedurally in code), in-game text
> and the translations were created with the help of AI tools and reviewed by the developer.
> No AI generates content while the game is running.

Adjust it to what is actually true when you submit (for example, after human translators have
reviewed the text).

### Age ratings (Steamworks → Ratings)

Fill in the free **IARC questionnaire** in Steamworks. It gives ratings for many countries (ESRB,
PEGI, USK and others) in one go. Expected result: suitable for all ages, with an "Users
Interact" notice because of chat.

### Legal

- **EULA:** optional. Steam has a default subscriber agreement.
- **Privacy policy URL:** needed. The policy is written: `public/privacy.html`, served at `https://<your server>/privacy.html` and shown inside the game (Settings → Accessibility, and Account). Put that URL in Steamworks. Check it's still accurate before release (it names HelaO2 and support@helao2.com).
- **Copyright line:** `© 2026 HelaO2. All rights reserved.`

## 8. Uploading the game (SteamPipe)

### Build the Windows version

```bash
npm ci && npm run build            # the game (dist/)
cd desktop && npm ci && npm run dist
```

electron-builder writes an unpacked folder, `desktop/release/win-unpacked/`, with `Inkroads.exe`.
**Upload that folder, not the installer:** Steam installs and updates it itself.

Code signing: Steam does not require it, but a signed `Inkroads.exe` avoids antivirus false alarms.

### Server address in the Steam build

The Steam build must point at your live server for multiplayer, accounts and the gallery. Build
it with `VITE_API_BASE=https://<your server>` (and the relay address in the game's multiplayer
settings) so players don't have to type it.

### SteamPipe scripts

Download the **Steamworks SDK** (partner site → *Steamworks SDK*) and use
`sdk/tools/ContentBuilder/`. Create these two files in `ContentBuilder/scripts/`, replacing
`2987650` and `2987651` with your App ID and Depot ID:

`app_build_2987650.vdf`

```
"AppBuild"
{
  "AppID" "2987650"
  "Desc" "Inkroads 0.1.0"
  "ContentRoot" "..\content\"
  "BuildOutput" "..\output\"
  "SetLive" ""
  "Depots"
  {
    "2987651" "depot_build_2987651.vdf"
  }
}
```

`depot_build_2987651.vdf`

```
"DepotBuild"
{
  "DepotID" "2987651"
  "ContentRoot" "..\content\windows\"
  "FileMapping"
  {
    "LocalPath" "*"
    "DepotPath" "."
    "Recursive" "1"
  }
  "FileExclusion" "*.pdb"
}
```

Copy everything inside `desktop/release/win-unpacked/` into `ContentBuilder/content/windows/`,
then run:

```
builder\steamcmd.exe +login <your_steam_build_account> +run_app_build ..\scripts\app_build_2987650.vdf +quit
```

Use a separate Steam account that has only the "Edit App Metadata" and "Publish App Changes"
permissions for uploads.

### Launch options (Steamworks → Installation → General)

- **Executable:** `Inkroads.exe`
- **Launch type:** Launch (default)
- **Operating system:** Windows, 64-bit only

### Set the build live

Steamworks → SteamPipe → **Builds**: pick the uploaded build and set it live on the `default`
branch. Before release, only you and your testers (keys from *Request Steam product keys*)
can download it.

## 9. Steamworks features worth adding (code work)

The game runs fine on Steam without these, but players expect them:

| Feature | How | Effort |
| --- | --- | --- |
| **Achievements** | Map the 100 trophies to Steam achievements. Add `steamworks.js` to the Electron app and call `activate('ACH_ID')` when a trophy unlocks (`checkTrophies` in `src/core/Game.ts`). Upload 100 icons (64×64, colour and grey) | 1–2 days |
| **Steam Cloud** | Easiest: *Auto-Cloud* on the save folder (`%APPDATA%/Inkroads/Local Storage`). Or save the profile to a file and sync that | ½ day |
| **Overlay** | With `steamworks.js`, call `electronEnableSteamOverlay()`. Test it: Electron and the overlay don't always get along | ½ day |
| **Steam names and friends** | Use the Steam name as the player name, and Steam friends for invites (rich presence plus "join game") | 2–3 days |
| **In-game purchases** | Only if you sell the Patron track: Steam microtransactions (Web API `InitTxn` / `FinalizeTxn`) from your server, then call `grant()` in `server/store.mjs` | 3–5 days |

Keep the Steam-specific code in the desktop app (`desktop/main.cjs`, `desktop/preload.cjs`), so the
web version keeps working without Steam.

## 10. Review and release timeline

1. **Coming soon page:** submit the store page for review (a few business days). Once
   approved, make it public. Start collecting **wishlists** as early as possible. Valve requires
   the page to be visible as "Coming soon" for **at least 2 weeks** before release.
2. **Build review:** mark the build as ready and submit it (a few business days). Valve checks
   that it launches and matches the store page.
3. **Release checklist** (Steamworks → *Release*): every row must be green. Pick the date and
   time. You release the game yourself with the *Release app* button.
4. **Launch discount:** Steam lets you run a launch discount in the first week (check the
   current allowed range in the *Discounting* docs).
5. **Steam Next Fest:** if the release is more than ~3 months away, sign up with a demo. It is
   the biggest free boost for wishlists.

## 11. Final checklist

- [ ] Steamworks joined, tax and bank done, app fee paid (30-day wait started)
- [ ] Name and trademark checked
- [ ] Price chosen, regional prices reviewed
- [ ] Decision made on the free web version (take it down / demo)
- [ ] Donation links hidden in the Steam build; Patron track by codes or Steam Wallet only
- [ ] Basic info, short and long descriptions pasted
- [ ] 20 tags set
- [ ] All capsules uploaded (re-made from high-quality screenshots)
- [ ] 5+ screenshots taken on a real GPU
- [ ] Trailer made on a real GPU, with music, exported as MP4
- [ ] Languages ticked only where reviewed
- [ ] System requirements measured on real PCs
- [ ] Controller support level chosen
- [ ] Content survey, AI disclosure and IARC rating done
- [ ] Privacy policy published and linked
- [ ] Windows build uploaded with SteamPipe; launch option set; tested from Steam on a clean PC
- [ ] Server live (Render/VPS), with the admin password changed and TURN set for voice
- [ ] Store page submitted → approved → public as "Coming soon" ≥ 2 weeks
- [ ] Build submitted → approved
- [ ] Achievements (and Cloud) added, if ready
- [ ] Release

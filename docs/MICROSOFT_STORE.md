# Publishing Inkroads on the Microsoft Store

Every push now builds a **Microsoft Store package** (`Inkroads-Store-<version>.appx`)
next to the normal `.exe`. The package isn't signed: **Microsoft signs it when
it passes Store certification**, so the Store version needs no code-signing
certificate and players see no "unknown publisher" warning. The Store also
installs updates for players.

This guide covers the one-time Partner Center setup, the three identity
values the build needs, and the first submission.

> Terms and fees change. Microsoft stopped charging individual developers to
> register, but a **company** account may cost a one-time fee and needs
> business verification. Check the current terms on the sign-up page.

---

## Step 1 · Create a Partner Center developer account

1. Go to **https://storedeveloper.microsoft.com** → **Get started** / **Sign up**.
2. Sign in with a Microsoft account (for example your `@outlook.com`, or create
   one for the studio).
3. Choose the account type:
   - **Individual**: quickest; your name is shown as the publisher.
   - **Company**: shows **HelaO2** as the publisher; Microsoft verifies the
     business, which takes a few days.
4. Fill in your details and finish the sign-up. For a paid game you'll also
   fill in **payout and tax** details (Partner Center → Account settings →
   Payout and tax) before you can be paid.

---

## Step 2 · Reserve the name

1. Partner Center → **Apps and games** → **+ New product** → **MSIX or PWA app**.
2. Name: **Inkroads** → **Check availability** → **Reserve product name**.

---

## Step 3 · Copy the three identity values

Partner Center → your app **Inkroads** → **Product management** → **Product
identity**. You need three lines from that page:

| Partner Center shows | Looks like | Put it in GitHub variable |
|---|---|---|
| `Package/Identity/Name` | `12345HelaO2.Inkroads` | **`MS_STORE_IDENTITY_NAME`** |
| `Package/Identity/Publisher` | `CN=1A2B3C4D-1234-5678-9ABC-DEF012345678` | **`MS_STORE_PUBLISHER`** |
| `Package/Properties/PublisherDisplayName` | `HelaO2` | **`MS_STORE_PUBLISHER_DISPLAY_NAME`** |

Copy them **exactly**, including `CN=`, capital letters and dashes. The Store
rejects any package whose identity differs by a single character.

---

## Step 4 · Add them to GitHub

1. GitHub → **LasaKaru/PaintLand** → **Settings** → **Secrets and variables** →
   **Actions** → **Variables** tab → **New repository variable**.
2. Add the three variables from the table above (name → value).
3. Make sure **`INKROADS_API_BASE`** and **`INKROADS_SERVER_WS`** are set too
   (see Part 6 of [DOMAIN_SETUP.md](DOMAIN_SETUP.md)); otherwise the Store
   version can't reach your server for online play.

These identity values are public (they appear in every installed copy), so
they go in *Variables*, not *Secrets*.

---

## Step 5 · Build the Store package

1. GitHub → **Actions** → **Desktop app (Windows)** → **Run workflow** (or push
   any change).
2. Open the run when it's green. At the bottom, under **Artifacts**, download
   **Inkroads-MicrosoftStore-0.1.N** and unzip it. Inside is
   `Inkroads-Store-0.1.N.appx`.
3. On the run's summary page, check there is **no** yellow warning saying
   *"Store identity variables not set"*. If there is, step 4 isn't done, and
   Partner Center will refuse that package.

The package version is `0.1.<run number>.0`. It goes up with every build, as
the Store requires. (A version tag such as `v1.2.0` gives version `1.2.0.0`.)

> You can't install this `.appx` by double-clicking. It's unsigned until the
> Store signs it. To try the Store version before the public sees it, use a
> private audience (step 6.1) or test with the normal `.exe`. It's the same
> game.

---

## Step 6 · Create the first submission

Partner Center → **Inkroads** → **Start your submission**. Fill in each
section:

### 6.1 Pricing and availability
- **Markets:** all, or choose.
- **Visibility:** *Public* for launch. For a closed test first, choose
  **Private audience** and add testers' email addresses.
- **Pricing:** the base price (Inkroads is a premium game). You can add a free
  trial later.

### 6.2 Properties
- **Category:** **Games** → *Racing & flying* (or *Family & kids*).
- **Privacy policy URL:** `https://play.yourdomain.com/privacy.html`. Your
  server already serves this page.
- **Website:** `https://helao2.com`. **Support contact:** `support@helao2.com`.
- **Game settings:** multiplayer online **Yes**, cross-platform **Yes** (the
  web and Windows versions play together), local multiplayer **No**.
- **System requirements:** a DirectX 11 / WebGL 2 graphics card, 4 GB RAM,
  keyboard or gamepad; touch optional.

### 6.3 Age ratings
Answer the **IARC questionnaire** honestly. For Inkroads the answers that
matter are:
- **violence:** no real violence (the paint battle is paint splats);
- **player interaction:** text chat and voice chat with other players, with
  mute, block and report;
- **purchases:** the in-game shop uses ink earned by playing; say so, and
  mention the season-pass codes if you sell them.

The rating certificates (ESRB, PEGI, and so on) are issued automatically.

### 6.4 Packages
- Drag in **`Inkroads-Store-0.1.N.appx`**.
- Device families: **Windows 10/11 Desktop** only.

### 6.5 Store listings (English first)
- **Description:** use the text in [STORE_PAGE.md](STORE_PAGE.md).
- **Screenshots:** at least 1, ideally 4–8, **1366×768 or larger**. Make them
  with `npm run store-art` (see STORE_PAGE.md), or take them in the game with
  photo mode (**P**).
- **Game artwork (optional, recommended):** the package already has its own
  logos. For a nicer game page, add a 1:1 box art (at least 1080×1080) and a
  16:9 hero image. `npm run store-art` makes 1920×1080 images you can use as
  the hero. The square box art needs to be made separately, for example from
  the same key art.
- **Trailer (optional):** `npm run trailer` makes one.

### 6.6 Submission options
Partner Center asks why the app needs **`runFullTrust`** (every Windows desktop
app built with Electron does). Paste:

> Inkroads is a desktop game built with Electron. runFullTrust is required for
> all Electron desktop apps packaged as MSIX; the app does not use it for
> anything beyond running its own game process. It uses the network for online
> play and, only when the player uses push-to-talk, the microphone.

Then **Submit to the Store**. Certification usually takes 1–3 working days.
Partner Center emails you when it passes or if something needs fixing.

---

## Updates

Every push builds a new Store package with a higher version. To release it:
Partner Center → **Inkroads** → **Update** (a new submission) → **Packages** →
remove the old package → upload the new `.appx` → **Submit**. Players get the
update through the Store automatically.

**Update the server first, then the Store and Steam builds**, so time trials
always match (see step 12 of [SELF_HOSTING.md](SELF_HOSTING.md)).

---

## Other languages

The game itself is in 24 languages. The Store package declares **English**
only, so Partner Center asks for an English listing and nothing more. To sell
with localized store pages, add a listing for each language in Partner
Center. Then add the language codes to `appx.languages` in
`desktop/electron-builder.yml` (for example `si-LK`, `ta-IN`, `hi-IN`) and
upload a new build.

---

## Troubleshooting

| Partner Center / the build says | Fix |
|---|---|
| *"The package identity name / publisher doesn't match"* | One of the three variables differs from the Product identity page (step 3). Copy them again exactly, then rebuild. |
| *"Store identity variables not set"* warning in the Actions run | Step 4 isn't done (or the names are misspelled). |
| *"The version must be higher than…"* | You uploaded an older build. Download the newest artifact, or re-run the workflow. |
| *"Restricted capability runFullTrust requires approval"* | Fill in the text from 6.6. |
| The Store version can't connect online | `INKROADS_API_BASE` / `INKROADS_SERVER_WS` weren't set when it was built (see [DOMAIN_SETUP.md](DOMAIN_SETUP.md), Part 6). Rebuild and upload. |
| Voice chat is silent in the Store version | Windows Settings → Privacy & security → Microphone → allow **Inkroads**. The game asks the first time you use push-to-talk. |
| The artifact has no `.appx` / the Store step failed in Actions | Open the step's log. The `.exe` artifacts are uploaded before this step, so the normal build is never lost. |

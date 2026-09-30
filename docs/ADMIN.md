# Admin panel

The admin panel runs inside the game itself. The server checks every login, and the password is kept only as a salted scrypt hash, never in plain text.

## How to open it

The admin panel needs the game's server (the relay) running, for example your Render site. It doesn't work in an offline copy of the game.

1. Open the game and stay on any menu screen.
2. Type **kumara** on the keyboard. Nothing appears while you type; that's on purpose.
   - On a phone or tablet, tap the **Inkroads logo 5 times** quickly, then type `kumara` in the box that pops up.
3. The login card opens. Enter the admin **email** and **password**.
4. You stay logged in for up to 12 hours, until you close the tab, or until you press **Log out**.

The secret word only opens the login card. Without the right email and password, nothing is shown. Wrong passwords are rate-limited.

## The login

- **Email:** `lasantha@helao2.com` (change it with the `ADMIN_EMAIL` setting, or in 🔒 Security).
- **Password:** the one the owner chose. This file doesn't contain it, and the code only has its hash.

**Change the password as soon as the game is online.** Go to 🔒 Security, enter the current password and a new long one. A passphrase of four random words works well. After that, the new password is saved on the server's disk (`data/admin.json`, hashed).

The `ADMIN_PASSWORD` server setting, if you set one, is used only until the first change in the panel.

If you forget the password:
1. Stop the server.
2. Delete `data/admin.json`.
3. Set a new `ADMIN_PASSWORD` in the server settings.
4. Start the server again.

## What you can manage

| Tab | What it's for |
|---|---|
| 📊 **Dashboard** | Players per day, sessions and hours played, chapters started, areas visited, hours by place, languages, devices and graphics settings, players online and rooms right now, open reports, sponsor board views and visits, errors from players' games, and a download of all analytics as JSON |
| 🩺 **Crashes & speed** | Crash-free sessions (7 and 30 days, per day and per build), errors grouped by bug with the builds, devices and places they happen in, and frame rates by place, graphics quality, device and web or desktop app. See below. |
| 🏷 **Branding** | Company name and logo on the loading screen and menu, how often sponsor logos appear, and two switches: the **weekly fishing contest** and **DJ party mode in multiplayer rooms** (fishing, and a party on your own, always work) |
| 🔗 **Menu links** | The links at the bottom of the main menu: website, social pages, donations, "advertise with us" |
| 🤝 **Sponsors** | Upload, replace or delete sponsor logos and their links (shown on billboards in the towns and chapters) |
| 🎟 **Pass & challenges** | The season pass (make one-use Patron codes, give an account the Patron track), and sponsor challenges (goal, reward ink and cosmetic, dates) |
| ⚖ **Release & legal** | What a store release needs: the legal name and country in the Terms of Use, the minimum age for online play, the terms date (a new date asks every player to accept again), the health notice, asking for the terms before online play, hiding donation links in the desktop (Steam) app, and the credits list. See STEAM_PUBLISHING.md §7 |
| 🛠 **Maintenance** | Close the game for players while you fix or build something, with a return time. See below. |
| 👥 **Players & chat** | Recent chat and player reports (dismiss, or ban the player name); ban and unban names; the **photo contest** (view, hide, show again or remove entries); reported **gallery roads** (keep or remove) |
| 🔒 **Security** | Change the admin email and password; check which address the server sees for rate limits (needed behind Render's proxy, see HOSTING.md) |

### Maintenance: closing the game for a while

**🛠 Maintenance** closes the game for players while you update the server,
fix something, or build something new.

1. Tick **Close the game for players**.
2. Choose what players see:
   - **🔧 Maintenance:** "Back soon, we're touching up the paint". A little
     car sits on a jack while the road is repainted, with turning gears and
     dripping paint.
   - **✏ Development:** "New roads in the making". A pencil sketches a new road,
     colour washes in, and a crane lowers a piece of road into place.
3. Optional: add a **note to players** (up to 240 letters), for example "New
   chapter coming tonight!".
4. **Starts:** leave it empty to close straight away, or set a later time.
   Players who are playing then get a warning 15 minutes before.
5. **Opens again at:** the game reopens **by itself** at this time, so you
   don't have to remember. Use the quick buttons (+30 min, +1 hour, +2 hours,
   +6 hours, +1 day), or leave it empty to stay closed until you press
   **🟢 Open the game now**.
6. **Let players keep playing on their own meanwhile:** when ticked, players
   get a "Play on my own meanwhile" button, and only online play is closed.
   Leave it on for the desktop (Steam) app, where people have paid for the
   game.
7. **Save.** Players see the page within about half a minute. **👀 Preview**
   shows it to you exactly as players see it.

What players get:
- A painted page with your note and a live countdown ("Back in 1 hr 34 min").
  It shows the time the game opens in their own time zone, and it's
  translated into all 24 languages.
- Their game stops where it was, with the sound paused. When the page washes
  away, they carry on from the same spot. Saves are never touched.
- Multiplayer rooms close: players already in a room are let go, and new ones
  can't join until it opens.

What you get:
- While you're logged in to the admin panel, the game stays open **for you**,
  so you can test. A small banner at the top says it's closed for players,
  with a **Preview** button.
- The secret word still works on the closed page. On a phone, tap the logo
  five times.

A player whose game can't reach the server (for example the desktop app
offline) is never locked out. The closed page only appears when the server
says so right now.

### Crashes & speed

Every play session sends its build version, and every playing minute sends its
average frame rate. When the game hits an error, the crash reporter sends the
message, the line of code it came from and where the player was. All of it is
anonymous, and nothing is sent when a player turns statistics off.

- **Crash-free sessions:** the share of sessions with no crash. Aim for **99.5 %
  or more**. A tile turns red when it's below that.
- **Errors** are grouped by bug: the same message from the same place in the
  code counts as one bug, even across new builds. Click one to see which
  builds, devices and places it happens in.
  - **✓ Fixed:** when you've released a fix. The error is hidden, but if a
    build released **after** you marked it sends it again, it comes back as
    **⚠ regressed**, at the top of the list. Players still on an older build
    can keep sending it; that doesn't count.
  - **Ignore:** hides an error you don't plan to fix (it keeps counting).
  - **Reopen:** puts a fixed or ignored error back on the list.
- **By build:** crash-free rate and frame rate for each version. Check a new
  release here the day after it goes out. The Windows app reports its release
  number (for example `0.1.58`); the web version reports the package version
  and the commit (for example `0.1.0+10e7b64`).
- **Frame rate:** a minute under **30 fps** counts as slow. The tables list the
  slowest places, quality settings and devices first, which shows where
  optimising pays off most.
- **Renderer:** frame rates for WebGL (the default) and the WebGPU beta
  (see [WEBGPU.md](WEBGPU.md)). Errors from WebGPU players show `/webgpu` in
  their device list.

### Photo contest moderation

Contest photos are public and the weekly winner goes on the city billboards, so the photo contest has its own moderation:

- Three player reports hide an entry automatically.
- The **Photo contest** list in 👥 Players & chat shows this week's and last week's entries, most-reported first.
- **View** shows the picture, including hidden ones.
- **Hide** takes an entry down.
- **Show** puts a hidden entry back up, and later reports won't hide it again.
- **Remove** deletes the entry and its picture for good. If it was a winner, its billboard goes back to normal.

### What the admin can't see (on purpose)

- **Passwords:** player passwords are hashed like the admin's. Nobody can read them.
- **Postcards:** they're private between friends, so the admin can't read them. Players can block and report.
- **Analytics:** they're anonymous, with a random id per browser and no names or IP addresses (see the privacy policy).

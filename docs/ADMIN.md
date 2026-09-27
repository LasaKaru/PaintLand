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
| 🏷 **Branding** | Company name and logo on the loading screen and menu, and how often sponsor logos appear |
| 🔗 **Menu links** | The links at the bottom of the main menu: website, social pages, donations, "advertise with us" |
| 🤝 **Sponsors** | Upload, replace or delete sponsor logos and their links (shown on billboards in the towns and chapters) |
| 🎟 **Pass & challenges** | The season pass (make one-use Patron codes, give an account the Patron track), and sponsor challenges (goal, reward ink and cosmetic, dates) |
| 👥 **Players & chat** | Recent chat and player reports (dismiss, or ban the player name); ban and unban names; the **photo contest** (view, hide, show again or remove entries); reported **gallery roads** (keep or remove) |
| 🔒 **Security** | Change the admin email and password; check which address the server sees for rate limits (needed behind Render's proxy, see HOSTING.md) |

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

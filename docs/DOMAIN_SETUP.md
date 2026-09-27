# Your domain → your Linux server → Inkroads online

This guide connects the domain you bought to your Linux server, gets the game
running there with HTTPS, and then sets **`VITE_API_BASE`** and
**`VITE_SERVER_WS`** so the Windows app (and any other copy of the game)
connects to your server.

For server security, backups, voice chat and troubleshooting in more depth,
see [SELF_HOSTING.md](SELF_HOSTING.md). This guide is the short path through
the parts that involve your domain.

```
 Player's browser / Windows app
          │  https://play.yourdomain.com   (web page, API)
          │  wss://play.yourdomain.com     (multiplayer)
          ▼
 DNS (at the company you bought the domain from)
          │  "play.yourdomain.com is at 203.0.113.10"
          ▼
 Your Linux server 203.0.113.10
   ├─ Caddy  (ports 80/443: HTTPS certificate, automatic)
   └─ Inkroads game server (port 8787, private: only Caddy reaches it)
```

In every command below, replace:
- `yourdomain.com` with the domain you bought;
- `203.0.113.10` with **your** server's IP address.

---

## Part 1 · Choose the address

Use a **subdomain** such as **`play.yourdomain.com`**. It keeps the main domain
free for a website or store page later, and it's the simplest to set up.

(You can use the bare domain `yourdomain.com` instead. Part 3 shows the records
for both.)

---

## Part 2 · Find your server's IP address

It's shown on your VPS provider's dashboard (DigitalOcean "Droplets", Hetzner
"Servers", Vultr "Instances", and so on). Or log in to the server and run:
```bash
curl -4 ifconfig.me ; echo      # IPv4, e.g. 203.0.113.10
curl -6 ifconfig.me ; echo      # IPv6 (if it prints nothing, the server has no IPv6)
```
Write both down.

**Home server?** Use your home's public IP (the same command) and, in your
router, forward TCP **80** and **443** (and UDP 443) to the server's local
address. If your home IP changes now and then, see Part 3F.

---

## Part 3 · Add the DNS records at your domain company

You're adding one record that says "`play` → my server's IP". The screens
differ between companies, but the record is always the same:

| Type | Name / Host | Value / Points to | TTL |
|---|---|---|---|
| **A** | `play` | `203.0.113.10` (your IPv4) | Automatic, or 5 min / 300 s |
| **AAAA** *(only if your server has IPv6)* | `play` | your IPv6 address | Automatic |

Using the bare domain instead? Use **Name `@`** for the A record, and add a
**CNAME** with Name `www` pointing to `yourdomain.com`.

> **Remove clashing records first.** If a record with the same name already
> exists (a "parked" page, a default A record for `@` or `www`, a CNAME for
> `play`), delete or edit it. Be especially careful with an **old AAAA
> record**: if one points somewhere else, the HTTPS certificate will fail,
> because Let's Encrypt checks the IPv6 address first.

Here is where to click at common companies. Menu names change now and then;
look for "DNS", "Manage DNS" or "Advanced DNS".

### 3A · Namecheap
1. **Domain List** → **Manage** next to your domain → **Advanced DNS** tab.
2. Under *Host Records*, delete any "URL Redirect" or "Parking" record for the
   same host.
3. **Add New Record** → **A Record** → Host `play` → Value `203.0.113.10` →
   TTL *Automatic* → ✓ (save).

### 3B · GoDaddy
1. **My Products** → your domain → **DNS** (or *Manage DNS*).
2. **Add New Record** → Type **A** → Name `play` → Value `203.0.113.10` → TTL
   *Default* → **Save**.
3. If you use the bare domain: edit the existing **A `@`** record ("Parked") so
   it points to your IP.

### 3C · Cloudflare
1. Open your domain → **DNS → Records** → **Add record**.
2. Type **A**, Name `play`, IPv4 address `203.0.113.10`.
3. **Proxy status: turn it OFF (grey cloud, "DNS only").** Your server gets its
   own certificate and must see players' real addresses. (If you want the
   orange cloud later, see the note at the end of this part.)
4. **Save**.

### 3D · Hostinger
1. **hPanel → Domains** → **Manage** → **DNS / Nameservers** → *DNS records*.
2. Type **A**, Name `play`, Points to `203.0.113.10`, TTL 300 → **Add record**.

### 3E · A `.lk` domain (Sri Lanka), or a company with no DNS editor
Some registrars, including the LK Domain Registry, only let you set
**nameservers**, not records. Use free DNS from Cloudflare:
1. Create a free account at cloudflare.com → **Add a domain** →
   `yourdomain.lk` → Free plan.
2. Cloudflare shows **two nameservers** (like `anna.ns.cloudflare.com`).
3. At your registrar, replace the domain's nameservers with those two. This
   can take a few hours to a day for `.lk`.
4. Then add the record in Cloudflare as in **3C** (grey cloud).

### 3F · Home IP that changes (dynamic IP)
Use a free dynamic-DNS name such as **DuckDNS** (`yourname.duckdns.org`) with its
small update script on the server. Or, if your domain uses Cloudflare, set up
a DDNS client such as `ddclient` to keep the A record up to date.

> **Cloudflare orange cloud (optional, later).** It works with the game
> (WebSockets included), but then Cloudflare sits in front of Caddy. Set
> SSL/TLS mode to **Full (strict)**, and set `TRUST_PROXY: "2"` in
> `deploy/docker-compose.yml`, so rate limits still see each player's real
> address. Check it with step 10 of [SELF_HOSTING.md](SELF_HOSTING.md). Start
> with the grey cloud.

---

## Part 4 · Check that the domain reaches your server

DNS changes usually take 5–30 minutes, and sometimes a few hours.

On **Windows** (PowerShell) or **Mac/Linux**:
```bash
nslookup play.yourdomain.com
```
On Linux/Mac you can also use `dig +short play.yourdomain.com`.

It must print **your server's IP**. You can also check worldwide at
**dnschecker.org** (type `play.yourdomain.com`, record type A).

**Don't start the game until this is right.** Caddy asks Let's Encrypt for the
HTTPS certificate straight away, and Let's Encrypt limits how many failed tries
you get per hour.

---

## Part 5 · Run the game on the server

The short version is below. [SELF_HOSTING.md](SELF_HOSTING.md) explains every
step and adds SSH-key security, swap memory and backups; do its steps 2 and 4
too.

```bash
ssh youruser@203.0.113.10

# Firewall: SSH and web only
sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw allow 443/udp
sudo ufw enable

# Docker (log out and back in afterwards)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
exit
```
```bash
ssh youruser@203.0.113.10
git clone https://github.com/LasaKaru/PaintLand.git
cd PaintLand/deploy
cp .env.example .env
nano .env
```
In `.env`, set **your domain**, exactly as in Part 3 (no `https://`, no
slash):
```ini
DOMAIN=play.yourdomain.com
EMAIL=you@yourdomain.com
ADMIN_PASSWORD=a-long-random-password   # make one with: openssl rand -base64 24
```
Save (**Ctrl+O**, **Enter**, **Ctrl+X**) and start:
```bash
docker compose up -d --build        # first time: 5–15 minutes
docker compose ps                   # "paintland" and "caddy" both Up
docker compose logs caddy | grep -i "certificate obtained"
```
Open **https://play.yourdomain.com**. The game loads, with the padlock in the
address bar.

Quick test from any computer:
```bash
curl https://play.yourdomain.com/api/config
```
(It prints some JSON: the server is reachable over HTTPS.)

Then log in to the admin panel (type **kumara** on the menu) and **change the
password** in 🔒 Security (see [ADMIN.md](ADMIN.md)).

---

## Part 6 · `VITE_API_BASE` and `VITE_SERVER_WS`

### What they are

| Setting | What it tells the game | Value for you |
|---|---|---|
| **`VITE_API_BASE`** | Where the game's web API is: accounts, cloud saves, admin panel, branding, gallery, photos, analytics | `https://play.yourdomain.com` |
| **`VITE_SERVER_WS`** | Where multiplayer and the time-trial leaderboard are | `wss://play.yourdomain.com` |

Rules:
- **`https://`** for the API and **`wss://`** for multiplayer. The Windows app
  refuses plain `http://` and `ws://` except to localhost, for security.
- **Exactly** the domain from `DOMAIN=` in `.env`.
- **No slash at the end, no port, no path.**

They're **build settings**: they're written into the game when it's built.
Changing them later means building the game again.

### When you need them

| Copy of the game | Needs them? |
|---|---|
| The web game at **https://play.yourdomain.com** (served by your server) | **No.** It finds the server at its own address automatically. |
| The **Windows app** (`.exe`), including the Steam version | **Yes.** It isn't served by your server, so it must be told where the server is. |
| The **GitHub Pages** copy (built from `main`), or a copy on another host | **Yes.** |

Without them, the Windows app looks for a server on the player's own
computer (`localhost`) and finds none. Single-player works, but multiplayer,
leaderboards, accounts and cloud saves don't connect.

### Option A · Set them on GitHub (recommended: every automatic build uses them)

GitHub builds the Windows `.exe` on every push. The build reads these values
from two **repository variables** (named `INKROADS_…`; the workflow passes
them to the game as `VITE_API_BASE` and `VITE_SERVER_WS`).

1. On GitHub, open **LasaKaru/PaintLand** → **Settings** (top tab).
2. Left menu: **Secrets and variables** → **Actions**.
3. Open the **Variables** tab (**not** *Secrets*: these addresses are public,
   and the build only reads them from Variables).
4. **New repository variable**:
   - Name: `INKROADS_API_BASE`
   - Value: `https://play.yourdomain.com`
   - **Add variable**
5. **New repository variable** again:
   - Name: `INKROADS_SERVER_WS`
   - Value: `wss://play.yourdomain.com`
   - **Add variable**
6. Build again: **Actions** tab → **Desktop app (Windows)** → **Run workflow**
   (choose the branch) → **Run workflow**. Pushing any code change also
   triggers it.
7. Check it took effect: open the new run → job **build** → step **Build the
   game**. The log lists:
   ```
   env:
     VITE_API_BASE: https://play.yourdomain.com
     VITE_SERVER_WS: wss://play.yourdomain.com
   ```
   If they're empty, the variable names are misspelled or were added under
   *Secrets*.
8. When the run is green, download **Inkroads-Windows-…** under *Artifacts* at
   the bottom of the run page. It contains the installer and the portable
   `.exe`.

Only `.exe` files built **after** step 5 know your server. Older downloads keep
the empty address.

### Option B · Build on your own Windows PC

You need [Node.js 22](https://nodejs.org) and Git. In **PowerShell**:
```powershell
git clone https://github.com/LasaKaru/PaintLand.git
cd PaintLand
npm ci
$env:VITE_API_BASE  = "https://play.yourdomain.com"
$env:VITE_SERVER_WS = "wss://play.yourdomain.com"
npm run build
cd desktop
npm ci
npm run dist
```
The `.exe` files appear in `desktop\release\`.

Instead of typing the two `$env:` lines each time, you can create a file
named **`.env.production`** in the `PaintLand` folder:
```ini
VITE_API_BASE=https://play.yourdomain.com
VITE_SERVER_WS=wss://play.yourdomain.com
```
`npm run build` reads it automatically. These are public addresses, not
secrets, so the file can be committed.

(On Linux or Mac, the web build is the same with
`VITE_API_BASE=... VITE_SERVER_WS=... npm run build`. The Windows installer
itself is best built on Windows, or by GitHub as in Option A.)

### Option C · Test before rebuilding (no build needed)

In any copy of the game you can point *that one computer* at a server by
hand:
- **Multiplayer:** Menu → **Multiplayer** → field **Server (online play)** →
  `wss://play.yourdomain.com` → join.
- **API / admin:** type **kumara** on the menu. On the admin login card, open
  **Server** → *Admin server* and enter `https://play.yourdomain.com`.

The game remembers these on that computer. Good for testing; players need
Option A or B.

### Check that the Windows app is connected
1. Start the new `.exe` → **Menu → Multiplayer**: the server field shows
   `wss://play.yourdomain.com`.
2. **⏱ Time trials · leaderboard** shows the board (it may be empty on a new
   server) and a finished run says *Verified by re-simulation*.
3. Admin → **📊 Dashboard** → *Players online* counts you while you're in a
   room.

---

## Troubleshooting

| What you see | Cause and fix |
|---|---|
| `nslookup` shows a different IP or nothing | The record is wrong or not live yet (Part 3/4). Check the Name (`play`, not `play.yourdomain.com` at most companies) and wait. |
| Browser: "Your connection is not private", or no padlock | The certificate failed: `docker compose logs caddy`. Usually DNS wasn't ready, an old AAAA record points elsewhere, or ports 80/443 are closed (server firewall and the provider's dashboard firewall). Fix it, then `docker compose restart caddy`. |
| "Too many failed authorizations" in the Caddy log | Let's Encrypt's limit after repeated failures. Fix DNS/ports and wait an hour, then restart Caddy. |
| Site opens without the game, or `502 Bad Gateway` | The game container isn't up: `docker compose ps`, then `docker compose logs paintland`. |
| Windows app: online features say "offline" or "connection problem" | The `.exe` was built without the variables (check the build log, Option A step 7), or with `http://`/`ws://` instead of `https://`/`wss://`, or with a slash at the end. Rebuild. |
| Everyone gets "Too many attempts" at login | Cloudflare orange cloud or another proxy in front: set `TRUST_PROXY` (see the Cloudflare note in Part 3). |
| Changed domain later | Update `DOMAIN` in `deploy/.env` and run `docker compose up -d`, update both GitHub variables, and rebuild the Windows app. |

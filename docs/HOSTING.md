# Hosting Inkroads — step-by-step guide

This guide takes you from "the code is on GitHub" to "anyone can play at
`https://play.yourdomain.com`". It covers:

- which service to use and why
- every click on Render, the recommended host
- how to put only the web page on Vercel or Netlify, if you want that
- how to run it on your own server (VPS) instead

> Hosting websites change their buttons and prices from time to time. If a
> button has a slightly different name, look for the closest match. Always
> check the current price on the host's pricing page before you pay.

---

## 1. Which service? Vercel vs Netlify vs Render

Inkroads is two things:

1. **The game page.** This is plain files (HTML, JavaScript, images) that
   `npm run build` makes in `dist/`. Any host can serve these.
2. **The game server** (`server/relay.mjs`). It runs **all the time** and
   holds **WebSocket** connections open for multiplayer and voice signalling.
   It also keeps files on a **disk** (the leaderboard, admin login, sponsor
   logos, analytics, and player accounts with their cloud saves, friends and
   clubs).

| | Vercel | Netlify | **Render** |
| --- | --- | --- | --- |
| Game page (static files) | ✅ Excellent | ✅ Excellent | ✅ Good |
| Always-running Node server | ❌ Functions only run per request, then stop | ❌ Same | ✅ Yes (Web Service) |
| WebSockets (multiplayer) | ❌ Not for long-lived connections | ❌ No | ✅ Yes |
| Disk that survives restarts | ❌ No | ❌ No | ✅ Yes (on paid instances) |
| Runs our `Dockerfile` as is | ❌ | ❌ | ✅ |
| Automatic HTTPS and custom domain | ✅ | ✅ | ✅ |
| Deploys on every `git push` | ✅ | ✅ | ✅ |

**Verdict: use Render for the whole game.** Vercel and Netlify are great for
websites, but they cannot run the multiplayer server. With them you would
still need a second host for the server. Render runs everything, the page
included, from one service, one bill and one URL. That also means no
cross-site settings to get wrong.

- **Optional:** put *only* the game page on Vercel or Netlify for their fast
  global delivery, and keep the server on Render. See section 4.
- **Cheapest at large scale, or when you need voice relay (TURN):** your own
  VPS with the `deploy/` kit. See section 5.

---

## 2. Before you start (5 minutes)

1. **Merge the work into `main`.** The Render set-up deploys the `main`
   branch. On GitHub, open a pull request from `claude/gifted-albattani-h1x70l`
   into `main` and merge it. Or ask Claude to open the pull request for you.
2. **Pick an admin password:** a long passphrase, for example four random
   words. You will type it once into Render.
3. **Optional: a domain name**, such as `inkroads.com` or
   `play.helao2.com`. You can add it later; Render gives you a free
   `*.onrender.com` address first.

---

## 3. Render (recommended): the whole game in one service

### Step 1 · Create your Render account
1. Go to **https://render.com** and click **Get Started**.
2. Choose **Sign up with GitHub**. This lets Render see your repositories.
3. When GitHub asks which repositories Render may access, choose **Only select
   repositories** → **LasaKaru/PaintLand** → **Install / Authorize**.

### Step 2 · Create the service from the Blueprint
The repository contains `render.yaml` (a "Blueprint"). It tells Render
exactly what to build, so you don't have to fill in forms by hand.

1. In the Render dashboard click **New +** → **Blueprint**.
2. Pick the **PaintLand** repository, then click **Connect**.
3. Render reads `render.yaml` and shows one web service called **inkroads**
   with:
   - **Docker** (it builds our `Dockerfile`)
   - region **Singapore** (closest to Sri Lanka)
   - plan **Starter**
   - a **1 GB disk** at `/data`
4. It asks for **ADMIN_PASSWORD**. Paste the passphrase from section 2.
5. Click **Apply** (or **Create New Resources**). Render needs a payment card
   for the paid Starter instance and disk.

> **Why not the free plan?** Free instances go to sleep after some idle time,
> which disconnects everyone. They also cannot keep a disk, so the
> leaderboard, admin password and sponsor logos would be wiped on every
> restart. Starter is the smallest plan that keeps the game awake and saves
> its data.

### Step 3 · Wait for the first deploy
1. Open the **inkroads** service → **Events / Logs**.
2. The first build takes about 3–8 minutes: it installs packages, builds the
   game and builds the server.
3. It is ready when the logs show:
   ```
   [start] data in /data; running as uid 1000
   Inkroads relay listening on ws://localhost:… · leaderboard on …
   ```
   and the status turns **Live**.

### Step 4 · Open the game
1. At the top of the service page, click the address, e.g.
   `https://inkroads.onrender.com`.
2. The HelaO2 loading screen appears, then the Inkroads title. 🎉
3. Test multiplayer: open the game in two browsers (or on your phone),
   **Menu → Multiplayer → Join online** with the same room code. You should
   see each other. The server box already contains the right address, because
   the game connects to the same site it came from.

### Step 5 · Log in to the admin panel and change the password
1. On any menu screen, type **kumara** (on a phone, tap the Inkroads logo
   5 times).
2. Log in with `lasantha@helao2.com` and your **ADMIN_PASSWORD**.
3. Go to **🔒 Security** and set a new long password. From now on the
   password saved on the disk is used. The `ADMIN_PASSWORD` setting in Render
   only counts before the first password change.

### Step 6 · Check that rate limits see real player addresses
Render's own proxy sits in front of the game. The server must know how many
proxies are in front of it, so that login and leaderboard rate limits count
each player separately (and players cannot fake their address).

1. In the admin panel go to **🔒 Security → Hosting check → Check my
   address**.
2. On the same device, open **https://ifconfig.me** and note your address.
3. Compare it with **Used for rate limits**:
   - **Same address** → done. Keep `TRUST_PROXY` = `1`.
   - **A different, private-looking address** (such as `10.x.x.x`) while your
     real address appears *earlier* in the **X-Forwarded-For** line → there is
     one more proxy. In Render go to the **inkroads** service →
     **Environment** → set `TRUST_PROXY` to `2` → **Save** (it redeploys).
     Check again.
   - **Used for rate limits** equals **Connection from** and
     **X-Forwarded-For** is empty → set `TRUST_PROXY` to `0`.

### Step 7 · Your own domain (optional, recommended)
1. In Render: **inkroads** service → **Settings → Custom Domains → Add**, and
   type e.g. `play.inkroads.com`.
2. Render shows a DNS record to create, usually a **CNAME** pointing
   `play` to `inkroads.onrender.com`. For a bare domain like `inkroads.com`,
   Render shows an **A** record or asks you to use `www`.
3. Log in where you bought the domain (Namecheap, GoDaddy, Cloudflare…) →
   **DNS** → add exactly that record → save.
4. Back in Render, click **Verify**. The HTTPS certificate is issued
   automatically, often within minutes (DNS can take up to a day).
5. If you use Cloudflare DNS, set the record to **DNS only** (grey cloud) at
   first. You can turn the orange proxy on later, but then check step 6 again,
   because Cloudflare adds one more proxy.

### Step 8 · Point the other builds at your server
The GitHub Pages copy of the web game and the Windows `.exe` (for Steam)
need to know where the server is.

1. GitHub → **LasaKaru/PaintLand → Settings → Secrets and variables →
   Actions → Variables → New repository variable**.
2. Add `INKROADS_API_BASE` = `https://play.inkroads.com` (your address, no
   slash at the end).
3. Add `INKROADS_SERVER_WS` = `wss://play.inkroads.com`.
4. The next push (or **Actions → re-run**) builds the web and desktop
   versions with these addresses.

### Step 9 · Updating the game
Every push or merge to `main` redeploys automatically (`autoDeploy: true`).
Players on the old version stay connected until the new one is live. The
disk (leaderboard, admin login, logos, analytics, player accounts and cloud
saves) is kept across deploys.

### Step 10 · Backups
- **Admin → 📊 Dashboard → Export** downloads the analytics as JSON.
- Render keeps automatic snapshots of the disk (see the **Disks** section of
  the service). Before a big update, make a manual snapshot there.
- Player accounts live in `/data/accounts.json` and cloud saves in
  `/data/saves/`. Passwords and sign-in tokens are stored only as hashes, so
  a copy of the disk can't be used to sign in as a player, but it still holds
  player names and saves: keep backups private.

### Growing
- **More players:** in **Settings → Instance Type**, choose a bigger
  instance. One small instance comfortably carries a few hundred players (see
  [13 · Performance results](13-performance-results.md)).
- **Thousands of players:** run several game servers and split rooms between
  them. This is on the roadmap. Ask Claude before you get there.

### Troubleshooting
| Symptom | Fix |
| --- | --- |
| Build fails at `npm ci` | Open the logs and look for the first red line. Usually a temporary network error: click **Manual Deploy → Clear build cache & deploy** |
| Service keeps restarting | Logs → look for `could not prepare /data`. Check that the disk is attached at `/data` (Settings → Disks) |
| Multiplayer says "connection problem" | Check the address in Menu → Multiplayer → Server. It should be `wss://your-address`, or leave the default |
| Admin login says "Too many attempts" for everyone | Do step 6 (the proxy count is wrong) |
| Voice chat connects for some players but not others | Their networks block direct connections: set up a TURN relay (section 6) |

---

## 4. Optional: the game page on Vercel or Netlify, the server on Render

Do section 3 first (you need the server). Then:

### Vercel
1. **https://vercel.com** → **Sign up with GitHub** → **Add New… → Project**.
2. Import **LasaKaru/PaintLand**.
3. Framework preset: **Vite**. Build command: `npm run build`. Output
   directory: `dist`.
4. **Environment Variables** (add both):
   - `VITE_API_BASE` = `https://play.inkroads.com` (your Render address)
   - `VITE_SERVER_WS` = `wss://play.inkroads.com`
5. **Deploy**. Your page is at `https://<name>.vercel.app`. Add your domain
   under **Settings → Domains**.

### Netlify
1. **https://app.netlify.com** → **Add new site → Import an existing project
   → GitHub** → **LasaKaru/PaintLand**.
2. Build command: `npm run build`. Publish directory: `dist`.
3. **Site configuration → Environment variables**: add the same
   `VITE_API_BASE` and `VITE_SERVER_WS` as above.
4. **Deploy site**. Add your domain under **Domain management**.

The game server already allows the page to be on another site (it sends open
CORS headers for its public API; the admin API needs the login token). The
admin panel works from either address.

---

## 5. Your own server (VPS) with the deploy kit

This is cheapest for many players, and needed for a TURN voice relay.

1. Rent a small Linux VPS (e.g. DigitalOcean, Hetzner, Vultr, AWS Lightsail)
   with Ubuntu, 2 GB RAM or more, in Singapore or Mumbai.
2. Point your domain's **A** record at the server's IP address.
3. Log in over SSH and install Docker: `curl -fsSL https://get.docker.com | sh`.
4. `git clone https://github.com/LasaKaru/PaintLand.git && cd PaintLand/deploy`
5. `cp .env.example .env` and edit it (`nano .env`): set `DOMAIN`, `EMAIL`
   and `ADMIN_PASSWORD`.
6. Open the firewall for ports **80** and **443** (TCP) and **443/UDP**.
7. `docker compose up -d`. Caddy gets the HTTPS certificate by itself.
8. Visit `https://your-domain`, then do steps 5, 6 and 8 of section 3.
   `TRUST_PROXY` is already `1` for Caddy.
9. To update: `git pull && docker compose up -d --build`.

---

## 6. Voice chat relay (TURN)

Voice chat connects players directly. About 1 player in 10 is on a network
(some mobile carriers, schools, offices) that blocks that. For them, voice
needs a **TURN relay**. TURN uses UDP, which Render does not offer, so the
relay runs somewhere else. The game server only hands out the relay address
and a password (`/api/ice`); everything else in the game works without it.

### Option A · The relay in the deploy kit (your VPS, section 5)
1. Make a secret: `openssl rand -hex 32`.
2. In `deploy/.env` set:
   ```
   TURN_SECRET=<the secret>
   TURN_URLS=turn:play.inkroads.com:3478?transport=udp,turn:play.inkroads.com:3478?transport=tcp
   ```
3. Open the firewall: **UDP 3478**, **TCP 3478** and **UDP 49160–49200**.
4. Start everything with the voice profile:
   `docker compose --profile voice up -d`.
5. Each player gets a relay password that expires after 6 hours (made from
   the secret; the secret never leaves the server). The relay only carries
   voice between players: it refuses to connect into private or local
   networks, and it limits each player's bandwidth.
6. If the VPS sits behind NAT (for example AWS), add
   `--external-ip=<public IP>/<private IP>` to the `turn` command in
   `deploy/docker-compose.yml`.

### Option B · The game on Render + the relay elsewhere
Run only the relay on a small VPS (steps 1–4 above; you can remove the other
services), or use a managed TURN provider. Then add to the Render service
(**Environment**):
- self-hosted relay: `TURN_URLS` and `TURN_SECRET` (the same secret as the relay)
- managed provider that gives a fixed username and password: `TURN_URLS`,
  `TURN_USERNAME` and `TURN_CREDENTIAL`

Optional: `STUN_URLS` replaces the default public STUN server
(`stun:stun.l.google.com:19302`). Set it empty for none.

## 7. Launch checklist

- [ ] Work merged to `main`, Render service **Live**
- [ ] Game opens at your address; two devices see each other in multiplayer
- [ ] Admin password changed (step 5)
- [ ] Hosting check shows your real address (step 6)
- [ ] Custom domain with HTTPS (step 7)
- [ ] GitHub variables set for the Pages and desktop builds (step 8)
- [ ] First manual disk snapshot taken (step 10)

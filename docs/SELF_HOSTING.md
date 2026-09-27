# Host Inkroads on your own Linux server

A step-by-step guide to running the whole game online on a Linux server you
control. That includes the web game, multiplayer, leaderboards, player accounts
and cloud saves, and the admin panel. At the end, players open
`https://play.yourdomain.com` and the Windows app connects to the same server.

It uses the deploy kit in `deploy/`: the game server in one container behind
**Caddy**, which gets and renews the HTTPS certificate on its own. You don't
need to know Docker; every command is here. It takes about 30–45 minutes the
first time.

> Prefer a managed host with no server to look after? See
> [HOSTING.md](HOSTING.md) (Render). This guide is for your own machine.

---

## What you need

| | |
|---|---|
| **A Linux server** | A VPS (DigitalOcean, Hetzner, Vultr, Linode, AWS Lightsail…) or a machine at home. **Ubuntu 24.04 LTS**, **2 GB RAM or more** (4 GB is comfortable), 2 CPUs, 25 GB disk. Pick a region near your players (Singapore or Mumbai for Sri Lanka). About US$6–12 a month. |
| **A domain name** | For example `play.inkroads.com`. HTTPS needs one. A free subdomain from [DuckDNS](https://www.duckdns.org) also works. |
| **An email address** | Let's Encrypt uses it to warn you if a certificate ever has a problem. |
| **An SSH program** | Terminal on Mac/Linux, or Windows Terminal / PowerShell on Windows (`ssh` is built in). |

In the commands below, replace:
- `SERVER_IP` with your server's public IP address;
- `play.yourdomain.com` with your domain;
- `you@example.com` with your email.

---

## Step 1 · Point your domain at the server

> Step-by-step screens for Namecheap, GoDaddy, Cloudflare, Hostinger and `.lk`
> domains are in [DOMAIN_SETUP.md](DOMAIN_SETUP.md).

In your domain provider's DNS settings, add a record:

| Type | Name | Value |
|---|---|---|
| `A` | `play` (or `@` for the bare domain) | `SERVER_IP` |

If your server also has an IPv6 address, add an `AAAA` record for it too.

Check it (it can take from a few minutes to an hour):
```bash
ping play.yourdomain.com      # should show SERVER_IP
```

**Home server?** In your router, forward TCP ports **80** and **443** (and UDP
443) to the server's local IP. Many home connections change IP address, so
use a dynamic-DNS name such as DuckDNS.

---

## Step 2 · Log in and secure the server

```bash
ssh root@SERVER_IP
```

Update everything and create your own user (don't run things as root day to
day):
```bash
apt update && apt upgrade -y
adduser inkroads                 # choose a strong password
usermod -aG sudo inkroads
```

**Use an SSH key instead of a password.** On *your own computer* (not the
server), if you don't have a key yet:
```bash
ssh-keygen -t ed25519
ssh-copy-id inkroads@SERVER_IP   # on Windows: see the note below
```
> Windows: `type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh inkroads@SERVER_IP "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"`

Check that `ssh inkroads@SERVER_IP` logs you in **without asking for the
password**. Only then turn off password and root logins on the server:
```bash
sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/; s/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

Turn on automatic security updates:
```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades   # answer "Yes"
```

From now on, log in with `ssh inkroads@SERVER_IP`.

---

## Step 3 · Firewall

Open only SSH and the web ports. The game server's own port (8787) stays
closed: only Caddy talks to it, inside Docker.
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw enable                  # answer "y"
sudo ufw status
```
Many VPS providers also have a firewall in their web dashboard. Open the same
ports there.

---

## Step 4 · Add swap (servers with 2 GB RAM)

Building the game needs more memory than running it. Swap lets a 2 GB server
build without running out:
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## Step 5 · Install Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker inkroads
exit
```
Log in again (`ssh inkroads@SERVER_IP`) so the group change applies, then
check:
```bash
docker --version
docker compose version
```
Docker starts on its own when the server reboots, and the game restarts with
it.

---

## Step 6 · Get the game

```bash
cd ~
git clone https://github.com/LasaKaru/PaintLand.git
cd PaintLand/deploy
```

**If the repository is private**, GitHub asks for a login. Use a read-only
token:
1. GitHub → your picture → **Settings → Developer settings → Personal access
   tokens → Fine-grained tokens → Generate new token**.
2. Repository access: only **LasaKaru/PaintLand**. Permissions:
   **Contents: Read-only**.
3. When `git clone` asks for a password, paste the token (your username is
   your GitHub username).

---

## Step 7 · Your settings

```bash
cp .env.example .env
openssl rand -base64 24          # copy this: it becomes the admin password
nano .env
```
Set these three (use the arrow keys to move, **Ctrl+O** then **Enter** to save,
**Ctrl+X** to exit):
```ini
DOMAIN=play.yourdomain.com
EMAIL=you@example.com
ADMIN_PASSWORD=paste-the-long-random-password-here
```
Leave the voice-relay lines (`TURN_…`) as they are for now (see step 13).

Keep `.env` private: it's never committed to Git, and it holds your admin
password. Also save the password in a password manager.

---

## Step 8 · Start it

```bash
docker compose up -d --build
```
The first time, this builds the game (5–15 minutes on a small server) and
then starts two containers: **paintland** (the game) and **caddy** (HTTPS).

Check that both are running:
```bash
docker compose ps                 # both should say "Up" (paintland "healthy" after ~30 s)
docker compose logs caddy | grep -i certificate    # "certificate obtained successfully"
curl -s https://play.yourdomain.com/api/config | head -c 200; echo
```

Now open **https://play.yourdomain.com** in a browser. The game should load,
with a padlock in the address bar.

---

## Step 9 · Admin panel: check the login and change the password

1. On the game's main menu, type **kumara** on the keyboard (nothing shows
   while you type). On a phone: tap the logo 5 times, then type it.
2. Log in with the admin email (`lasantha@helao2.com`, unless you set
   `ADMIN_EMAIL`) and the `ADMIN_PASSWORD` from step 7.
3. Go to **🔒 Security** and set a **new long password**. The server stores it
   hashed on its disk, and from then on `ADMIN_PASSWORD` is no longer used.

See [ADMIN.md](ADMIN.md) for everything the panel does.

---

## Step 10 · Check that rate limits see real players

The server needs to know about Caddy in front of it, so that login and
leaderboard limits count each player separately. The deploy kit already sets
`TRUST_PROXY=1`. Confirm it:

1. Admin → **🔒 Security → Hosting check → Check my address**.
2. On the same device open **https://ifconfig.me**.
3. **Used for rate limits** should show the same address as ifconfig.me. If
   it shows a private address such as `172.x.x.x`, something else is in front
   of Caddy (a provider load balancer or Cloudflare). Set `TRUST_PROXY: "2"`
   in `docker-compose.yml` and run `docker compose up -d`.

---

## Step 11 · Point the Windows app (and the GitHub Pages copy) at your server

> More detail (building on your own PC, testing without a rebuild, checking
> the build log): Part 6 of [DOMAIN_SETUP.md](DOMAIN_SETUP.md).

The Windows `.exe` doesn't run on your server, so it has to be told where the
server is **when it's built**. Right now these settings are empty, so the
Windows app has no server address. Single-player works, but online play,
leaderboards and accounts don't connect.

1. GitHub → **LasaKaru/PaintLand → Settings → Secrets and variables → Actions →
   Variables tab → New repository variable**.
2. Add **`INKROADS_API_BASE`** = `https://play.yourdomain.com` (no slash at the
   end).
3. Add **`INKROADS_SERVER_WS`** = `wss://play.yourdomain.com`.
4. Push any change, or go to **Actions → Desktop app (Windows) → Run
   workflow**. The next `.exe` built connects to your server.

The web game on your own domain doesn't need this: it finds the server on the
same address by itself.

---

## Step 12 · Updating the game

When there are new commits:
```bash
cd ~/PaintLand
git pull
cd deploy
docker compose up -d --build
```
Players' data (accounts, saves, leaderboard, admin login, logos, analytics)
lives in a Docker volume and is kept across updates. Players online during an
update are disconnected for a few seconds and reconnect.

**Update the server and the Windows app together.** Time trials are checked
by re-running them on the server. When a change affects a course, both sides
must be the same version, or runs are refused with "old game version".
(Today's update did this for Skylines.)

---

## Step 13 · Optional: voice chat relay

Push-to-talk voice connects players directly. Some home and mobile networks
block that. A TURN relay passes their voice through your server instead.

1. Make a secret: `openssl rand -hex 32`.
2. In `deploy/.env` set:
   ```ini
   TURN_SECRET=the-secret-you-just-made
   TURN_URLS=turn:play.yourdomain.com:3478?transport=udp,turn:play.yourdomain.com:3478?transport=tcp
   ```
3. Open the relay's ports:
   ```bash
   sudo ufw allow 3478/tcp
   sudo ufw allow 3478/udp
   sudo ufw allow 49160:49200/udp
   ```
4. Start with the voice profile:
   ```bash
   docker compose --profile voice up -d
   ```
   (From now on, use `--profile voice` in the update command too.)

The relay only carries voice between players and refuses to reach into
private networks.

---

## Step 14 · Backups

Everything worth keeping is in one Docker volume, `paintland_paintland-data`.
It holds player accounts, cloud saves, the leaderboard, the road gallery,
photos, the admin login, sponsor logos and analytics.

**Back up now** (a `.tar.gz` in your home folder):
```bash
docker run --rm -v paintland_paintland-data:/data:ro -v ~/backups:/backup alpine \
  tar czf /backup/inkroads-$(date +%F).tar.gz -C /data .
ls -lh ~/backups
```

**Every night at 3:30**, keeping the last 14:
```bash
mkdir -p ~/backups
( crontab -l 2>/dev/null; echo '30 3 * * * docker run --rm -v paintland_paintland-data:/data:ro -v $HOME/backups:/backup alpine tar czf /backup/inkroads-$(date +\%F).tar.gz -C /data . && ls -1t $HOME/backups/inkroads-*.tar.gz | tail -n +15 | xargs -r rm' ) | crontab -
```

**Copy backups off the server** now and then (from your own computer):
```bash
scp inkroads@SERVER_IP:~/backups/inkroads-*.tar.gz .
```
Passwords and sign-in tokens are stored only as hashes, but backups still
contain player names and saves. Keep them private.

**Restore** a backup (stops the game for a moment):
```bash
cd ~/PaintLand/deploy
docker compose stop paintland
docker run --rm -v paintland_paintland-data:/data -v ~/backups:/backup alpine \
  sh -c 'rm -rf /data/* && tar xzf /backup/inkroads-2026-09-27.tar.gz -C /data && chown -R 1000:1000 /data'
docker compose start paintland
```

---

## Everyday commands

Run these from `~/PaintLand/deploy`.

| What | Command |
|---|---|
| Is it running? | `docker compose ps` |
| Live game logs | `docker compose logs -f paintland` (Ctrl+C to stop watching) |
| HTTPS logs | `docker compose logs -f caddy` |
| Restart the game | `docker compose restart paintland` |
| Stop everything | `docker compose down` (data is kept) |
| Start again | `docker compose up -d` |
| Disk space | `df -h` and `docker system df` |
| Clean old build layers | `docker image prune -f` |

---

## Troubleshooting

| Problem | What to do |
|---|---|
| `required variable DOMAIN is missing` | You're not in `~/PaintLand/deploy`, or `.env` is missing `DOMAIN`/`EMAIL`. |
| The build stops with "Killed" or `exit code 137` | Out of memory. Do step 4 (swap), then run the build again. |
| The browser warns the site is not secure / no padlock | `docker compose logs caddy`. Usually the DNS record (step 1) doesn't point at this server yet, or ports 80/443 are closed (step 3 and the provider's firewall). Fix it and run `docker compose restart caddy`. |
| `502 Bad Gateway` | The game container isn't up yet or crashed: `docker compose ps`, then `docker compose logs paintland`. |
| Game container keeps restarting with `could not prepare /data` | The data volume's owner is wrong. Run: `docker run --rm -v paintland_paintland-data:/data alpine chown -R 1000:1000 /data`, then `docker compose up -d`. |
| Everyone gets "Too many attempts" at the admin login | Step 10 (proxy count). |
| Windows app can't go online | Step 11: the build variables aren't set, or that `.exe` was built before you set them. |
| "Server did not accept this run: old game version" | The server and the game are on different versions: update both (step 12). |
| Forgot the admin password | See "If you forget the password" in [ADMIN.md](ADMIN.md). The file is inside the volume: `docker run --rm -v paintland_paintland-data:/data alpine rm /data/admin.json`, set a new `ADMIN_PASSWORD` in `.env`, then `docker compose up -d`. |

---

## Growing

- **Few hundred players:** one 2–4 GB server is enough (see
  [13 · Performance results](13-performance-results.md)).
- **More:** give the server more CPU and RAM first. Beyond that, several game
  servers can split the rooms between them: see section 7 of
  [HOSTING.md](HOSTING.md).

## Security checklist

- [ ] SSH keys only, root login off (step 2)
- [ ] Automatic security updates on (step 2)
- [ ] Firewall: only 22, 80, 443 open (plus the voice ports if used)
- [ ] Admin password changed in the panel (step 9)
- [ ] `.env` never shared or committed
- [ ] Nightly backups, copied off the server now and then (step 14)

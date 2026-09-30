# Inkroads on a Contabo VPS: from buying a domain to the Windows app

This guide takes you from nothing to:

- **`https://play.yourdomain.com`**, the web game, with online play, the
  leaderboard, accounts, postcards and the admin panel. It runs on a Contabo
  Linux VPS and starts by itself whenever the server boots.
- **A Windows `.exe`** (installer and portable) that connects to that server.

Allow about an hour, most of it waiting for Contabo and DNS.

> **How the pieces fit.** One Node.js program (`server/relay.mjs`) serves
> *everything*: the game's web pages, multiplayer rooms, the API and the admin
> panel. It runs as a **systemd service** called `inkroads`. In front of it,
> **Caddy** (a second service) handles HTTPS and gets a free certificate for
> your domain by itself. The Windows app doesn't run on the server. It's the
> same game packed into an `.exe`, told your server's address when it's built.
>
> ```
> Players (browser or Windows app)
>        │  https:// and wss://  (ports 443/80)
>        ▼
>   Caddy service  ── HTTPS certificate, security headers
>        │  http://localhost:8787  (never open to the internet)
>        ▼
>   inkroads service ── game pages + multiplayer + API + admin
>        │
>        ▼
>   /var/lib/inkroads  ── accounts, saves, leaderboard, admin login, logos
> ```

If you'd rather use Docker, [SELF_HOSTING.md](SELF_HOSTING.md) does the same
job with `docker compose`. Use one method or the other, not both. This guide
uses plain systemd services, which are easier to follow and use less memory.

In the commands below, replace:

| Placeholder | With |
|---|---|
| `yourdomain.com` | your domain, e.g. `helao2.com` |
| `play.yourdomain.com` | the game's address, e.g. `play.helao2.com` |
| `SERVER_IP` | the VPS's IPv4 address from Contabo's email |
| `you@example.com` | your email (for the HTTPS certificate notices) |

---

## Part 1 · Buy a domain name

Skip this part if you already own a domain (for example `helao2.com`). You'll
use a **subdomain** such as `play.helao2.com`, so the website on the main
domain is untouched.

1. Choose a registrar. Any of these is fine:
   - **Cloudflare Registrar** (sells at cost, good DNS editor; you need a free
     Cloudflare account first).
   - **Namecheap** or **Porkbun** (simple, cheap, free WHOIS privacy).
   - A **`.lk`** domain: buy through the LK Domain Registry or a Sri Lankan
     reseller. See 3E in [DOMAIN_SETUP.md](DOMAIN_SETUP.md) if their DNS
     editor is limited.
2. Search for the name, add it to the cart, and **turn on WHOIS privacy**
   (usually free). Decline the extras: you don't need their hosting, email or
   "SSL certificate". Caddy gets a free one.
3. Pay, confirm the email the registrar sends (unconfirmed domains can be
   suspended after about 15 days), and **turn on two-factor login** on the
   registrar account. Whoever controls this account controls your game's
   address.
4. Turn on **auto-renew**, so the domain doesn't lapse and get bought by
   someone else.

Prices change: check on the registrar's site. A `.com` is usually around
US $10–15 a year.

---

## Part 2 · Order the Contabo VPS

1. Go to **contabo.com → VPS** and pick a plan. The smallest **Cloud VPS**
   is plenty to start (Inkroads uses well under 1 GB of memory). Move up later
   if the admin dashboard shows the server getting busy.
2. **Region:** choose the one closest to most of your players. For players in
   Sri Lanka or India, an Asian region (for example Singapore or India, if
   offered) gives the lowest lag. Lag matters for multiplayer races.
3. **Image:** **Ubuntu 24.04** (plain OS, no control panel like cPanel or
   Plesk; you don't need one, and they cost extra).
4. **Login:** set a strong **root password** and, if the form offers it, paste
   your **SSH public key** (see below). Save the password in a password manager.
5. Skip the paid extras for now (extra storage, backup add-on, private
   networking). Order and pay.
6. Contabo emails you when the VPS is ready, often within an hour but
   sometimes longer. The email has the **IPv4 address** (`SERVER_IP`) and
   the login details.

**Make an SSH key** (on your own computer, once). On Windows, open
**PowerShell**; on Mac or Linux, open **Terminal**:
```bash
ssh-keygen -t ed25519 -C "inkroads-vps"
```
Press Enter to accept the file name and set a passphrase. Your **public** key is
the file ending in `.pub`:
```bash
cat ~/.ssh/id_ed25519.pub        # Windows: type $env:USERPROFILE\.ssh\id_ed25519.pub
```
Only ever share the `.pub` file. The other file is your private key.

**If you ever lock yourself out:** Contabo's customer panel
(**my.contabo.com**) has a **VNC console** for each VPS. It works even when
SSH doesn't. Note where it is now.

---

## Part 3 · Point the domain at the VPS (DNS)

At your registrar (or Cloudflare, if it runs your DNS), open the domain's
**DNS records** and add:

| Type | Name / Host | Value | TTL |
|---|---|---|---|
| `A` | `play` | `SERVER_IP` | Auto / 300 |

- Use the **subdomain part only** (`play`) in the Name box. Most editors add
  `.yourdomain.com` by themselves.
- **Cloudflare:** set the cloud icon to **grey (DNS only)** for now. An
  orange (proxied) record stops Caddy from getting its certificate. You can
  switch it later; see the troubleshooting table.
- **IPv6 (optional):** add an `AAAA` record only if the VPS really has a
  public IPv6 address. Check with `ip -6 addr show scope global` in Part 4. A
  wrong `AAAA` record breaks the site for some players.

Check that it has spread (from your own computer; can take 5 minutes to a
few hours):
```bash
nslookup play.yourdomain.com
```
It should answer with `SERVER_IP`. Carry on with Part 4 meanwhile.

---

## Part 4 · First login and basic security

From your own computer:
```bash
ssh root@SERVER_IP
```
Type `yes` the first time. Use the root password (or your key, if you added it).

**Update everything and turn on automatic security updates:**
```bash
apt update && apt -y full-upgrade
apt -y install unattended-upgrades ufw git curl ca-certificates gnupg
dpkg-reconfigure -plow unattended-upgrades     # choose "Yes"
timedatectl set-timezone Asia/Colombo          # or your own time zone
reboot
```
Wait a minute, then `ssh root@SERVER_IP` again.

**Make your own admin user** (replace `lasantha` with any name) and give it
your SSH key:
```bash
adduser lasantha                  # set a password; the other questions can be left empty
usermod -aG sudo lasantha
mkdir -p /home/lasantha/.ssh
cp ~/.ssh/authorized_keys /home/lasantha/.ssh/ 2>/dev/null || true
nano /home/lasantha/.ssh/authorized_keys   # paste your .pub line here if the file is empty; save with Ctrl+O, Enter, Ctrl+X
chown -R lasantha:lasantha /home/lasantha/.ssh
chmod 700 /home/lasantha/.ssh && chmod 600 /home/lasantha/.ssh/authorized_keys
```

**Test it in a second window before going further**, and keep the root window
open:
```bash
ssh lasantha@SERVER_IP
sudo whoami        # should print: root
```

**Only when that works**, turn off root login and passwords over SSH. Run this
in the new user's window:
```bash
sudo tee /etc/ssh/sshd_config.d/99-inkroads.conf > /dev/null <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
EOF
sudo systemctl restart ssh
```
Open a **third** window and check that `ssh lasantha@SERVER_IP` still gets in
before you close the others. If it doesn't, fix it from a window that's still
open (or from Contabo's VNC console).

**Firewall:** allow only SSH and the web:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp        # HTTP/3
sudo ufw enable               # answer y
sudo ufw status
```
Port 8787 (the game server itself) stays **closed**. Only Caddy talks to it,
from inside the machine.

---

## Part 5 · Install Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource_setup.sh
less /tmp/nodesource_setup.sh          # optional: look before you run it (q to quit)
sudo bash /tmp/nodesource_setup.sh
sudo apt -y install nodejs
node -v                                 # v22.x
```

---

## Part 6 · Get and build the game

The game runs as its own user, **`inkroads`**. It can't log in, has no
`sudo`, and can only write to its data folder.

```bash
sudo useradd --system --home-dir /opt/inkroads --create-home --shell /usr/sbin/nologin inkroads
sudo -u inkroads -H git clone https://github.com/LasaKaru/PaintLand.git /opt/inkroads/app
cd /opt/inkroads/app
sudo -u inkroads -H npm ci
sudo -u inkroads -H npm run build
sudo -u inkroads -H npm run build:server
```
- `npm run build` makes the web game (`dist/`).
- `npm run build:server` makes the time-trial checker (`dist-server/`), which
  lets the server verify leaderboard runs by re-simulating them.

This clones the repository's default branch. To run another branch, add
`--branch <name>` to the `git clone` line. If the repository is private, the
clone needs access: see the note at the end of Part 12.

---

## Part 7 · Settings (one private file)

```bash
sudo nano /etc/inkroads.env
```
Paste this, then change the password:
```ini
NODE_ENV=production
PORT=8787
# Where accounts, saves, the leaderboard, admin login and logos are kept.
DATA_DIR=/var/lib/inkroads
# One proxy (Caddy) in front: rate limits then see each player's real address.
TRUST_PROXY=1
# First admin password (used only on the very first start; change it in the
# admin panel afterwards, then delete this line). Long, and not used anywhere else.
ADMIN_PASSWORD=change-me-to-a-long-passphrase
# Optional: most players in one multiplayer room.
# MAX_ROOM=16
```
Save (Ctrl+O, Enter, Ctrl+X), then make it readable by root only (systemd
reads it for the service):
```bash
sudo chmod 600 /etc/inkroads.env
```
Tip: `openssl rand -base64 24` prints a good random password.

---

## Part 8 · Run the game as a service

```bash
sudo nano /etc/systemd/system/inkroads.service
```
Paste:
```ini
[Unit]
Description=Inkroads game server (web game, multiplayer, API, admin)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=inkroads
Group=inkroads
WorkingDirectory=/opt/inkroads/app
EnvironmentFile=/etc/inkroads.env
ExecStart=/usr/bin/node server/relay.mjs
Restart=always
RestartSec=3
# systemd creates /var/lib/inkroads, owned by the inkroads user.
StateDirectory=inkroads
StateDirectoryMode=0750

# Lock it down: read-only system, no access to home folders or devices,
# no way to gain privileges. Only /var/lib/inkroads is writable.
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
PrivateDevices=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectKernelLogs=true
ProtectControlGroups=true
ProtectClock=true
ProtectHostname=true
RestrictSUIDSGID=true
RestrictRealtime=true
RestrictNamespaces=true
LockPersonality=true
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
CapabilityBoundingSet=
UMask=0027
MemoryMax=1G
TasksMax=256

[Install]
WantedBy=multi-user.target
```
Start it, and have it start on every boot:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now inkroads
sudo systemctl status inkroads      # "active (running)"; q to quit
curl -s http://localhost:8787/api/config | head -c 200; echo
```
The last line prints the start of some JSON. If `status` shows an error,
`sudo journalctl -u inkroads -n 50` shows why.

---

## Part 9 · HTTPS with Caddy (the second service)

Install Caddy from its official package repository:
```bash
sudo apt -y install debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt -y install caddy
```
Caddy installs as a service called `caddy` and starts on boot by itself.

Replace its settings file:
```bash
sudo nano /etc/caddy/Caddyfile
```
Delete what's there and paste this (with your address and email):
```caddyfile
{
	email you@example.com
}

play.yourdomain.com {
	encode zstd gzip

	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "DENY"
		Referrer-Policy "strict-origin-when-cross-origin"
		# Microphone only for this site (voice chat); nothing else.
		Permissions-Policy "camera=(), geolocation=(), payment=(), usb=(), microphone=(self)"
		Cross-Origin-Opener-Policy "same-origin"
		-Server
	}

	# Keep admin uploads and API bodies small.
	request_body {
		max_size 3MB
	}

	reverse_proxy localhost:8787 {
		# Replace, never append to, whatever X-Forwarded-For the client sent.
		header_up X-Forwarded-For {remote_host}
	}
}
```
(It's the same as `deploy/Caddyfile` in the repository, with the address
filled in and `localhost` instead of the Docker name.)

Check it and load it:
```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo journalctl -u caddy -n 30 --no-pager
```
Within a minute the log should say it obtained a certificate for
`play.yourdomain.com`. This needs the DNS from Part 3 to have spread and
ports 80 and 443 open.

**Open `https://play.yourdomain.com` in a browser.** The game loads with the
padlock showing.

---

## Part 10 · Admin panel: log in and change the password

1. On the game's main menu, type **kumara** on the keyboard (nothing shows
   while you type). On a phone: tap the logo 5 times, then type it.
2. Log in with the admin email and the `ADMIN_PASSWORD` from Part 7.
3. **🔒 Security → set a new long password.** The server stores only a salted
   hash of it.
4. Remove the now-unused line from the settings file and restart:
   ```bash
   sudo sed -i '/^ADMIN_PASSWORD=/d' /etc/inkroads.env
   sudo systemctl restart inkroads
   ```
5. **🔒 Security → Hosting check → Check my address.** "Used for rate limits"
   should match what **https://ifconfig.me** shows on the same device. If it
   shows `127.0.0.1` instead, check that `TRUST_PROXY=1` is in the settings
   file.

See [ADMIN.md](ADMIN.md) for everything else in the panel.

---

## Part 11 · Pack the Windows app for your server

The `.exe` has to know your server's address **when it's built**. Without it,
single-player still works, but online play, the leaderboard, accounts and
postcards can't connect.

You **can't** usefully build the Windows installer on the Contabo VPS. Build it
on GitHub (easiest) or on a Windows PC.

### Option A · GitHub builds it (recommended)

1. GitHub → **LasaKaru/PaintLand → Settings → Secrets and variables →
   Actions → Variables tab** (Variables, *not* Secrets).
2. **New repository variable** `INKROADS_API_BASE` = `https://play.yourdomain.com`
   (no slash at the end).
3. **New repository variable** `INKROADS_SERVER_WS` = `wss://play.yourdomain.com`.
4. **Actions → Desktop app (Windows) → Run workflow.** (Pushing code changes
   also starts it; changes to docs alone don't.)
5. When the run is green, download **Inkroads-Windows-…** under *Artifacts*.
   It holds the installer and the portable `.exe`. A tag such as `v1.0.0`
   also publishes them as a GitHub Release.

### Option B · Build on your Windows PC

Install [Node.js 22](https://nodejs.org) and [Git](https://git-scm.com), then
in **PowerShell**:
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
The installer and portable `.exe` land in `desktop\release\`.

### Check the app is connected

1. Start the new `.exe`: **Menu → Multiplayer** shows
   `wss://play.yourdomain.com` as the server.
2. **⏱ Time trials · leaderboard** opens (empty on a new server).
3. Admin → **📊 Dashboard** counts you while you're in a multiplayer room.

Code signing (so Windows doesn't warn "unknown publisher") and store
publishing are covered in the [README](../README.md),
[STEAM_PUBLISHING.md](STEAM_PUBLISHING.md) and
[MICROSOFT_STORE.md](MICROSOFT_STORE.md).

---

## Part 12 · Updating the game

On the VPS, after new commits are pushed:
```bash
cd /opt/inkroads/app
sudo -u inkroads -H git pull
sudo -u inkroads -H npm ci
sudo -u inkroads -H npm run build
sudo -u inkroads -H npm run build:server
sudo systemctl restart inkroads
```
Players' data in `/var/lib/inkroads` isn't touched. Anyone online is
disconnected for a few seconds and reconnects.

**Update the server and the Windows app together.** Leaderboard runs are
re-simulated on the server. If a change alters a course, an older `.exe` has
its runs refused with "old game version" until players update.

**Private repository?** `git clone` and `git pull` then need access. Make a
**deploy key** (read-only, this one repository):
```bash
sudo -u inkroads -H ssh-keygen -t ed25519 -f /opt/inkroads/.ssh/id_ed25519 -N ""
sudo cat /opt/inkroads/.ssh/id_ed25519.pub
```
Add that line under GitHub → repository → **Settings → Deploy keys** (leave
"write access" off). Then clone with
`git@github.com:LasaKaru/PaintLand.git` instead of the `https://` address.

---

## Part 13 · Backups

Everything worth keeping is in **`/var/lib/inkroads`**: accounts, cloud saves,
the leaderboard, road gallery, photos, postcards, the admin login, sponsor
logos and analytics.

**Every night at 3:30, keeping the last 14:**
```bash
sudo mkdir -p /var/backups/inkroads
sudo tee /etc/cron.d/inkroads-backup > /dev/null <<'EOF'
30 3 * * * root tar czf /var/backups/inkroads/inkroads-$(date +\%F).tar.gz -C /var/lib/inkroads . && ls -1t /var/backups/inkroads/inkroads-*.tar.gz | tail -n +15 | xargs -r rm
EOF
sudo chmod 700 /var/backups/inkroads
```
**Copy them off the server** now and then. A backup that lives only on the
same VPS doesn't help if the VPS is lost. From your own computer:
```bash
ssh lasantha@SERVER_IP 'sudo tar czf - -C /var/backups/inkroads .' > inkroads-backups.tar.gz
```
Contabo's panel may also offer **snapshots** of the whole VPS, depending on
your plan. Take one before big changes. Backups contain player names and saves
(passwords and tokens only as hashes), so keep them private.

**Restore** a backup:
```bash
sudo systemctl stop inkroads
sudo find /var/lib/inkroads -mindepth 1 -delete
sudo tar xzf /var/backups/inkroads/inkroads-2026-09-29.tar.gz -C /var/lib/inkroads
sudo chown -R inkroads:inkroads /var/lib/inkroads
sudo systemctl start inkroads
```

---

## Part 14 · Optional: voice chat relay

Voice chat works player to player. Players behind strict networks (some mobile
and office networks) also need a **TURN relay**. It's optional; see Step 13
of [SELF_HOSTING.md](SELF_HOSTING.md). It adds `TURN_URLS` and `TURN_SECRET`
to `/etc/inkroads.env` and needs UDP ports 3478 and 49160–49200 open in `ufw`.

---

## Everyday commands

| To… | Run |
|---|---|
| See if the game is running | `sudo systemctl status inkroads` |
| Watch the game's log live | `sudo journalctl -u inkroads -f` (Ctrl+C to stop) |
| Restart the game | `sudo systemctl restart inkroads` |
| Stop / start | `sudo systemctl stop inkroads` · `sudo systemctl start inkroads` |
| Caddy's log (certificates, HTTPS) | `sudo journalctl -u caddy -n 50` |
| Reload Caddy after editing the Caddyfile | `sudo systemctl reload caddy` |
| Memory and CPU | `htop` (`sudo apt install htop`) |
| Disk space | `df -h /` |

---

## Troubleshooting

| What you see | Cause and fix |
|---|---|
| Browser can't reach `play.yourdomain.com` | DNS not spread yet, or the `A` record points at the wrong IP: `nslookup play.yourdomain.com`. Check `sudo ufw status` shows 80 and 443. |
| Certificate error, or Caddy's log says "challenge failed" | DNS doesn't point here yet, port 80 is closed, or Cloudflare's orange cloud is on. Fix it, then `sudo systemctl reload caddy`. |
| Using Cloudflare's orange cloud (proxy) | Set SSL/TLS mode to **Full (strict)** in Cloudflare, and `TRUST_PROXY=2` in `/etc/inkroads.env` (two proxies now), then restart `inkroads`. |
| "502 Bad Gateway" | The game service isn't running: `sudo systemctl status inkroads`, `sudo journalctl -u inkroads -n 50`. |
| Service fails with `Cannot find module` | A build step was skipped: rerun the four build commands in Part 12. |
| Leaderboard says runs can't be verified | `dist-server/` is missing: `sudo -u inkroads -H npm run build:server`, then restart. |
| Windows app shows online features as offline | The `.exe` was built before the `INKROADS_…` variables were set, or they were added as Secrets: rebuild (Part 11). |
| Can't SSH in any more | Use the **VNC console** in my.contabo.com, log in as your user, fix `/etc/ssh/sshd_config.d/99-inkroads.conf` or `ufw`. |
| Lag in multiplayer | Pick a Contabo region closer to your players (a new VPS; move with a backup and restore). |

---

## Security checklist

- [ ] Registrar account has two-factor login, auto-renew and WHOIS privacy on
- [ ] SSH: key only, no root login, no passwords (Part 4)
- [ ] `ufw` allows only SSH, 80 and 443 (port 8787 stays closed)
- [ ] Automatic security updates on (`unattended-upgrades`)
- [ ] The game runs as the `inkroads` user under the locked-down service
- [ ] Admin password changed in the panel, `ADMIN_PASSWORD` line removed
- [ ] `/etc/inkroads.env` is `chmod 600`
- [ ] Hosting check shows your real address (rate limits work)
- [ ] Nightly backups on, and copied off the server regularly
- [ ] Windows `.exe` rebuilt with the `INKROADS_API_BASE` / `INKROADS_SERVER_WS` variables

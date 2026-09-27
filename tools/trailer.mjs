// Trailer maker: films a scripted tour of the game frame by frame and encodes
// it as a WebM video (VP8), with painted title cards between shots.
//
//   npm run dev            (in another shell)
//   node tools/trailer.mjs [--width 1920] [--height 1080] [--fps 30] [--quality high] [--short]
//
// The game runs in capture mode (Game.debugCapture): time moves exactly one
// frame per picture, so the video is smooth even when rendering is slow. On a
// computer with a real graphics card use --quality high or ultra. In a build
// container (software rendering) keep it small, e.g. --width 960 --height 540
// --quality low --short. The result is tools/out/trailer.webm (no sound: add
// music in any editor; the game's own radio tracks are procedural).
import { createRequire } from 'node:module';
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  playwright = require('/opt/node22/lib/node_modules/playwright');
}

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
};
const W = Number(arg('width', 1920));
const H = Number(arg('height', 1080));
const FPS = Number(arg('fps', 30));
const QUALITY = arg('quality', 'high');
const SHORT = process.argv.includes('--short');
const URL_GAME = arg('url', 'http://localhost:5173/');
const out = new URL('./out/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const frames = `${out}trailer-frames.mjpeg`;
writeFileSync(frames, '');

/** Orbit the parked car in photo mode (the world holds still, the camera moves). */
const orbit = (radius, height, speed) => `(g, t) => {
  const c = g.hubCar; const pc = g.photoCam;
  // The car model's own height (hubs sit on raised plazas and quays).
  const e = g.vehicle.root.matrixWorld.elements;
  const a = c.heading + Math.PI + t * ${speed};
  pc.pos.set(e[12] - Math.sin(a) * ${radius}, e[13] + ${height}, e[14] - Math.cos(a) * ${radius});
  pc.yaw = a + Math.PI; pc.pitch = -0.2;
}`;

/** The shot list: a title card, or a setup in the page (plus an optional per-frame camera move). */
const SHOTS = [
  { card: ['Inkroads', 'a watercolour road trip'], secs: 3 },
  { secs: 5, setup: (g) => g.debugLandmark('serendib', 0, 'golden') },
  { secs: 4, setup: (g) => g.debugJump(900, 'morning', 'clear', 'serendib') },
  { card: ['Drive through paintings', 'five chapters · 33 districts'], secs: 2.5 },
  { secs: 4.5, setup: (g) => g.debugJump(600, 'golden', 'clear', 'lanterns') },
  { secs: 4, setup: (g) => g.debugLandmark('lanterns', 3, 'dusk') },
  { secs: 4, setup: (g) => g.debugLandmark('wonders', 1, 'dusk') },
  { secs: 4, setup: (g) => g.debugJump(1400, 'night', 'clear', 'postcards') },
  { secs: 4, setup: (g) => g.debugLandmark('postcards', 0, 'golden') },
  { card: ['Roam three towns', 'hidden pockets · murals · festivals'], secs: 2.5 },
  { secs: 5, setup: (g) => { g.debugCalendar(undefined, 'vesak'); g.debugHub(0, 30, 0, 'harbour'); g.debugTime('dusk'); }, photo: true, each: orbit(6.5, 1.9, 0.35) },
  { secs: 4, setup: (g) => { g.debugCalendar(undefined, 'off'); g.debugLandmark('serendib', 1, 'dusk'); } },
  { secs: 4, setup: (g) => g.debugLandmark('lanterns', 6, 'golden') },
  { card: ['Make it yours', '10 vehicles · 99 parts · 131 outfits'], secs: 2.5 },
  { secs: 4, setup: (g) => { g.profile.data.vehicle = 'coupe'; g.profile.setVehicleLook('coupe', { body: '#d8463a', trim: '#2b2622', accent: '#f4d23b', hubs: '#cfd6df', roofLoad: 'lanterns', wrap: 'waves', finish: 'glitter', spoiler: 'twin', wheelStyle: 'star', glow: '#9a5bd6' }); g.buildPawnModels(); g.debugHub(0, 30, 0, 'harbour'); g.debugTime('golden'); }, photo: true, each: orbit(6, 1.8, 0.5) },
  { card: ['Play together', 'convoys · contests · races · group photos'], secs: 2.5 },
  { secs: 4, setup: (g) => g.debugJump(300, 'noon', 'rain', 'sketch') },
  { card: ['Inkroads', 'wishlist it on Steam'], secs: 3.5 },
];
const ONLY = arg('only', '') ? arg('only', '').split(',').map(Number) : null;
const shots = ONLY ? SHOTS.filter((_, i) => ONLY.includes(i)) : SHORT ? SHOTS.filter((_, i) => [0, 1, 2, 3, 10, 17].includes(i)).map((s) => ({ ...s, secs: Math.min(s.secs, 2.5) })) : SHOTS;

const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', (e) => console.warn('[page]', e.message));
await page.goto(URL_GAME);
await page.waitForFunction(() => window.__paintland, null, { timeout: 120000 });
await page.waitForTimeout(2500);
await page.evaluate(([q, H]) => {
  const g = window.__paintland;
  g.debugLook(undefined, q);
  g.profile.data.seenIntro = true;
  // No HUD, menus or hints in the film; a card layer for titles.
  const css = document.createElement('style');
  css.textContent = `.hud,.menu,.touch-ui,.tip-card,.toast,.minimap,.photo-panel{display:none!important}
    #trailer-card{position:fixed;inset:0;display:none;place-items:center;text-align:center;z-index:99999;
      background:radial-gradient(ellipse at 50% 45%,#fbf6ea 0%,#f3e7cf 60%,#e8d6b4 100%);color:#2b2622;font-family:Caveat,cursive}
    #trailer-card h1{font-size:${Math.round(H / 7)}px;margin:0;letter-spacing:.02em}
    #trailer-card p{font-size:${Math.round(H / 22)}px;margin:.2em 0 0;font-family:'Noto Sans',sans-serif;opacity:.75}`;
  document.head.appendChild(css);
  const card = document.createElement('div');
  card.id = 'trailer-card';
  document.body.appendChild(card);
}, [QUALITY, H]);

let total = 0;
for (const shot of shots) {
  const n = Math.round(shot.secs * FPS);
  if (shot.card) {
    // Hold the game still under the card, so the picture isn't slowed by rendering.
    await page.evaluate((fps) => window.__paintland.debugCapture(fps), FPS);
    await page.evaluate(([t, s]) => {
      const c = document.getElementById('trailer-card');
      c.innerHTML = `<div><h1>${t}</h1><p>${s}</p></div>`;
      c.style.display = 'grid';
    }, shot.card);
    await page.waitForTimeout(300);
    // A still card: the same picture for every frame, with a quick fade in and out.
    for (let i = 0; i < n; i++) {
      const fade = Math.min(1, i / (FPS * 0.3), (n - 1 - i) / (FPS * 0.3));
      await page.evaluate((o) => (document.getElementById('trailer-card').style.opacity = String(o)), fade);
      appendFileSync(frames, await page.screenshot({ type: 'jpeg', quality: 92, timeout: 180000 }));
    }
    await page.evaluate(() => (document.getElementById('trailer-card').style.display = 'none'));
  } else {
    await page.evaluate((src) => {
      const g = window.__paintland;
      g.debugCapture(null);
      g.debugPhotoExit();
      new Function('g', `(${src})(g)`)(g);
    }, shot.setup.toString());
    // Let the scene load and settle in real time, then film in fixed steps.
    await page.waitForTimeout(2500);
    if (shot.photo) {
      await page.evaluate(() => window.__paintland.debugPhoto());
      await page.waitForTimeout(800);
    }
    await page.evaluate((fps) => {
      const g = window.__paintland;
      g.debugCapture(fps);
      g.debugStep(Math.round(fps * 0.5));
    }, FPS);
    for (let i = 0; i < n; i++) {
      if (shot.each) await page.evaluate(([src, t]) => new Function('g', 't', `(${src})(g, t)`)(window.__paintland, t), [shot.each, i / FPS]);
      await page.evaluate(() => window.__paintland.debugStep(1));
      appendFileSync(frames, await page.screenshot({ type: 'jpeg', quality: 92, timeout: 180000 }));
    }
  }
  total += n;
  console.log(`shot ${shot.card ? `“${shot.card[0]}”` : shot.setup.toString().slice(0, 60)} · ${n} frames`);
}
await page.evaluate(() => window.__paintland.debugCapture(null));
await browser.close();

// Encode with ffmpeg (the system one, or the one that comes with Playwright).
const candidates = ['ffmpeg', '/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux'];
const ffmpeg = candidates.find((c) => (c.includes('/') ? existsSync(c) : spawnSync(c, ['-version']).status === 0));
if (!ffmpeg) {
  console.log(`No ffmpeg found: frames are in ${frames} (JPEGs back to back, ${FPS} fps).`);
  process.exit(0);
}
const r = spawnSync(ffmpeg, ['-hide_banner', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', frames, '-c:v', 'libvpx', '-b:v', `${Math.max(1, Math.round((W * H * FPS) / 10_000_000))}M`, '-auto-alt-ref', '0', `${out}trailer.webm`], { stdio: 'inherit' });
console.log(r.status === 0 ? `Trailer: ${out}trailer.webm (${(total / FPS).toFixed(1)} s, ${W}×${H} @ ${FPS} fps)` : 'ffmpeg failed');

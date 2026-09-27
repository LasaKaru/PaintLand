// Store and press art: screenshots of the game plus store capsules in the
// standard sizes, all from the running game (npm run dev).
//
//   node tools/store-art.mjs [--quality high] [--shots-only | --capsules-only]
//
// Writes public/press/shots/*.jpg (1920×1080 press screenshots) and
// public/press/capsules/*.png (Steam header 920×430, small 462×174, main
// 1232×706, vertical 748×896, library hero 3840×1240 (JPEG) and library capsule
// 600×900; itch.io cover 630×500; a 1200×630 social card). Capsules are
// painted from the screenshots with the logo and the tagline on top.
// In a build container (software rendering) use --quality low: the pictures
// then look plainer than on a real graphics card.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
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
const QUALITY = arg('quality', 'high');
const URL_GAME = arg('url', 'http://localhost:5173/');
const root = new URL('../public/press/', import.meta.url).pathname;
mkdirSync(`${root}shots`, { recursive: true });
mkdirSync(`${root}capsules`, { recursive: true });

/** name, setup in the page. */
const SHOTS = [
  ['01-serendib-golden', (g) => g.debugLandmark('serendib', 0, 'golden')],
  ['02-lantern-roads', (g) => g.debugJump(600, 'golden', 'clear', 'lanterns')],
  ['03-wonders-dusk', (g) => g.debugLandmark('wonders', 1, 'dusk')],
  ['04-kyoto-night', (g) => g.debugJump(1400, 'night', 'clear', 'postcards')],
  ['05-harbour-town', (g) => { g.debugHub(0, 30, 0, 'harbour'); g.debugTime('golden'); }],
  ['06-serendib-city-night', (g) => { g.debugHub(-60, 40, 1.2, 'city'); g.debugTime('deep night'); }],
  ['07-sketch-rain', (g) => g.debugJump(300, 'noon', 'rain', 'sketch')],
  ['08-wonders-morning', (g) => g.debugJump(900, 'morning', 'clear', 'wonders')],
];

const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

if (!process.argv.includes('--capsules-only')) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(URL_GAME);
  await page.waitForFunction(() => window.__paintland, null, { timeout: 120000 });
  await page.waitForTimeout(2500);
  await page.evaluate((q) => {
    window.__paintland.debugLook(undefined, q);
    window.__paintland.profile.data.seenIntro = true;
    const css = document.createElement('style');
    css.textContent = '.hud,.menu,.touch-ui,.tip-card,.toast,.minimap{display:none!important}';
    document.head.appendChild(css);
  }, QUALITY);
  for (const [name, setup] of SHOTS) {
    await page.evaluate((src) => {
      window.__paintland.debugCapture(null);
      new Function('g', `(${src})(g)`)(window.__paintland);
    }, setup.toString());
    await page.waitForTimeout(6000);
    // Freeze the game (capture mode) and draw a few settled frames, so the screenshot isn't starved by rendering.
    await page.evaluate(() => {
      window.__paintland.debugCapture(30);
      window.__paintland.debugStep(3);
    });
    await page.screenshot({ path: `${root}shots/${name}.jpg`, type: 'jpeg', quality: 90, timeout: 120000 });
    console.log('shot', name);
  }
  await page.close();
}

if (!process.argv.includes('--shots-only')) {
  const shots = readdirSync(`${root}shots`).filter((f) => f.endsWith('.jpg')).sort();
  const dataUrl = (f) => `data:image/jpeg;base64,${readFileSync(`${root}shots/${f}`).toString('base64')}`;
  const pick = (i) => dataUrl(shots[i % shots.length]);
  const CAPSULES = [
    ['steam-header', 920, 430, 0],
    ['steam-small', 462, 174, 0],
    ['steam-main', 1232, 706, 4],
    ['steam-vertical', 748, 896, 2],
    ['steam-library-capsule', 600, 900, 1],
    ['steam-library-hero', 3840, 1240, 0, true],
    ['itch-cover', 630, 500, 4],
    ['social-card', 1200, 630, 1],
  ];
  const font = (f) => `data:font/woff2;base64,${readFileSync(new URL(`../node_modules/@fontsource/${f}`, import.meta.url)).toString('base64')}`;
  const fonts = `@font-face{font-family:Caveat;font-weight:700;src:url(${font('caveat/files/caveat-latin-700-normal.woff2')})}
    @font-face{font-family:'Noto Sans';font-weight:600;src:url(${font('noto-sans/files/noto-sans-latin-600-normal.woff2')})}`;
  const page = await browser.newPage();
  for (const [name, w, h, shot, noText] of CAPSULES) {
    await page.setViewportSize({ width: w, height: h });
    const small = Math.min(w, h * 1.6);
    await page.setContent(`<!doctype html><html><head><style>${fonts}
      html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:#f3e7cf}
      .pic{position:absolute;inset:0;background:url(${pick(shot)}) center/cover}
      .wash{position:absolute;inset:0;background:linear-gradient(180deg,rgba(251,246,234,0) 35%,rgba(251,246,234,.82) 78%,rgba(251,246,234,.95))}
      .edge{position:absolute;inset:0;box-shadow:inset 0 0 ${Math.round(small / 14)}px ${Math.round(small / 40)}px rgba(243,231,207,.9)}
      .t{position:absolute;left:0;right:0;bottom:${Math.round(h * 0.07)}px;text-align:center;color:#2b2622}
      h1{font-family:Caveat,cursive;font-size:${Math.round(small / 5.2)}px;line-height:.9;margin:0}
      p{font-family:'Noto Sans',sans-serif;font-size:${Math.max(11, Math.round(small / 30))}px;margin:.35em 0 0;opacity:.8;letter-spacing:.04em}
    </style></head><body><div class="pic"></div>${noText ? '' : `<div class="wash"></div><div class="edge"></div><div class="t"><h1>Inkroads</h1>${h > 200 ? '<p>A WATERCOLOUR ROAD TRIP</p>' : ''}</div>`}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    // The huge library hero as JPEG (a PNG would be ~5 MB); the rest as PNG.
    await page.screenshot(w > 2000 ? { path: `${root}capsules/${name}.jpg`, type: 'jpeg', quality: 88 } : { path: `${root}capsules/${name}.png` });
    console.log('capsule', name, `${w}×${h}`);
  }
}
await browser.close();

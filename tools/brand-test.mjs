// Dev tool (milestone 9): "HelaO2 presents" loading, the menu's brand footer, the secret word → admin login →
// dashboard, a sponsor upload, and the watercolour boards in Harbour Town, the city and on a chapter road.
// Needs the relay (npm run server, or DATA_DIR=… node server/relay.mjs) and the dev server. Screenshots: tools/out/brand-*.png
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }
const out = new URL('./out/', import.meta.url).pathname;
const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const browser = await playwright.chromium.launch({ args });
const logs = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') logs.push(`[error] ${m.text()}`); });
await page.goto('http://localhost:5173/', { waitUntil: 'commit' });
// Catch the "presents" card while the game loads.
await page.waitForSelector('.presents-logo', { timeout: 60000 });
await page.waitForTimeout(1400);
await page.screenshot({ path: `${out}brand-loading.png` });
await page.waitForFunction(() => window.__paintland, null, { timeout: 120000 });
await page.waitForTimeout(1500);
const game = (fn, arg) => page.evaluate(fn, arg);
await game(() => window.__paintland.debugMenu('main'));
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}brand-menu.png` });

// The secret word opens the login; wrong password first, then the right one.
await page.mouse.click(900, 400);
await page.keyboard.type('kumara', { delay: 60 });
const loginShown = await page.waitForSelector('.admin-login', { timeout: 10000 }).then(() => true).catch(() => false);
console.log('secret word opens login:', loginShown);
await page.fill('.admin-login input[name=email]', 'lasantha@helao2.com');
await page.fill('.admin-login input[name=password]', 'wrong-one');
await page.click('.admin-login button[type=submit]');
await page.waitForSelector('.admin-msg', { timeout: 10000 });
console.log('wrong password message:', await page.textContent('.admin-msg'));
await page.screenshot({ path: `${out}brand-login.png` });
await page.fill('.admin-login input[name=password]', 'www111');
await page.click('.admin-login button[type=submit]');
const panel = await page.waitForSelector('.kpi-row', { timeout: 20000 }).then(() => true).catch(() => false);
console.log('logged in, dashboard shown:', panel);

// Upload a sponsor logo made on the fly, and set the support links.
const upload = await game(async () => {
  const c = document.createElement('canvas');
  c.width = 480;
  c.height = 200;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 480, 200);
  g.fillStyle = '#1d7a46';
  g.beginPath();
  g.arc(90, 100, 70, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#f4c542';
  g.beginPath();
  g.ellipse(90, 100, 30, 52, 0.5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#1d7a46';
  g.font = 'bold 54px sans-serif';
  g.fillText('Ceylon', 180, 95);
  g.font = 'bold 40px sans-serif';
  g.fillStyle = '#b8472e';
  g.fillText('TEA CO.', 182, 145);
  const token = sessionStorage.getItem('paintland.admin');
  const h = { 'content-type': 'application/json', authorization: `Bearer ${token}` };
  const r1 = await fetch('/api/admin/sponsor', { method: 'POST', headers: h, body: JSON.stringify({ name: 'Ceylon Tea Co.', url: 'https://example.com/tea', image: c.toDataURL('image/png') }) });
  const r2 = await fetch('/api/admin/config', { method: 'PUT', headers: h, body: JSON.stringify({ links: { coffee: 'https://buymeacoffee.com/helao2', fund: 'https://gofundme.com/helao2', sponsor: 'mailto:support@helao2.com', custom: [{ label: 'Discord', url: 'https://discord.gg/example' }] }, logoFrequency: 0.45 }) });
  return { upload: r1.status, config: r2.status, sponsors: (await r2.json()).sponsors.length };
});
console.log('sponsor upload + links:', JSON.stringify(upload));
await page.click('[data-admin="refresh"]');
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}brand-dashboard.png` });
await page.click('[data-tab="sponsors"]');
await page.waitForTimeout(3000);
await page.screenshot({ path: `${out}brand-sponsors.png` });
await page.click('[data-admin="close"]');

// Players pick up the new branding on their next load.
await page.reload();
await page.waitForFunction(() => window.__paintland, null, { timeout: 120000 });
await page.waitForTimeout(1500);
await game(() => window.__paintland.debugMenu('main'));
await page.waitForTimeout(3000);
await page.screenshot({ path: `${out}brand-menu-links.png` });

// Boards in Harbour Town and the city.
const hub = await game(() => window.__paintland.debugBrandSpots('harbour'));
const b = hub[0];
await game((s) => window.__paintland.debugHub(s.x + Math.sin(s.yaw) * 13, s.z + Math.cos(s.yaw) * 13, s.yaw, 'harbour'), b);
await page.waitForTimeout(9000);
await page.keyboard.press('KeyU');
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}brand-hub.png` });
await page.keyboard.press('KeyU');
const city = await game(() => window.__paintland.debugBrandSpots('city'));
for (const [i, s] of [city[0], city[5]].entries()) {
  await game((q) => window.__paintland.debugHub(q.x + Math.sin(q.yaw) * 15, q.z + Math.cos(q.yaw) * 15, q.yaw, 'city'), s);
  await page.waitForTimeout(i ? 5000 : 12000);
  await page.keyboard.press('KeyU');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}brand-city-${i}.png` });
  await page.keyboard.press('KeyU');
}
// Look up at the blimp.
await game(() => window.__paintland.debugHub(-100, 60, Math.PI, 'city'));
await page.waitForTimeout(5000);
await page.screenshot({ path: `${out}brand-city-blimp.png` });

// A roadside board in a chapter.
await game(() => window.__paintland.debugJump(170, 'morning', false, 'sketch'));
await page.waitForTimeout(9000);
await page.screenshot({ path: `${out}brand-road.png` });

// The dashboard has counted this session.
const stats = await game(async () => {
  window.dispatchEvent(new Event('pagehide'));
  await new Promise((r) => setTimeout(r, 1500));
  const token = sessionStorage.getItem('paintland.admin');
  return (await fetch('/api/admin/stats', { headers: { authorization: `Bearer ${token}` } })).json();
});
console.log('stats totals', JSON.stringify(stats.totals), 'sponsors', JSON.stringify(stats.sponsors), 'helao2', JSON.stringify(stats.helao2), 'areas', JSON.stringify(stats.areas));
console.log(logs.length ? logs.join('\n') : 'no page errors');
await browser.close();

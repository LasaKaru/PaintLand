import '@fontsource/permanent-marker';
import '@fontsource/caveat/700.css';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';
// Script fonts for every language. Each is split by unicode-range, so the browser only
// downloads the pieces a page actually uses.
import '@fontsource/noto-sans/400.css';
import '@fontsource/noto-sans/700.css';
import '@fontsource/noto-sans-sinhala/400.css';
import '@fontsource/noto-sans-sinhala/700.css';
import '@fontsource/noto-sans-tamil/400.css';
import '@fontsource/noto-sans-tamil/700.css';
import '@fontsource/noto-sans-devanagari/400.css';
import '@fontsource/noto-sans-bengali/400.css';
import '@fontsource/noto-sans-arabic/400.css';
import '@fontsource/noto-sans-thai/400.css';
import '@fontsource/noto-sans-sc/400.css';
import '@fontsource/noto-sans-jp/400.css';
import '@fontsource/noto-sans-kr/400.css';
import './styles/main.css';
import { Game } from './core/Game';
import { installCrashReporter, reportError } from './net/CrashReporter';
import { lang, setLang } from './core/i18n';

void setLang(lang());

installCrashReporter();

const app = document.getElementById('app');
if (!app) throw new Error('#app missing');

const game = new Game(app);
game
  .init()
  .then(() => {
    // Dev tools (tools/*.mjs) drive the game through this handle once it has finished loading.
    if (import.meta.env.DEV) (window as unknown as { __paintland: Game }).__paintland = game;
  })
  .catch((err: unknown) => {
    console.error(err);
    reportError(`Start failed: ${err instanceof Error ? err.message : String(err)}`, 'init', err instanceof Error ? err.stack ?? '' : '');
    const msg = document.createElement('div');
    msg.className = 'card';
    msg.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);max-width:460px;font-family:monospace';
    msg.textContent = `Inkroads could not start: ${err instanceof Error ? err.message : String(err)}. It needs a browser with WebGL2.`;
    document.body.appendChild(msg);
  });

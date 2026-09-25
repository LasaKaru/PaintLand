import '@fontsource/permanent-marker';
import '@fontsource/caveat/700.css';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';
import './styles/main.css';
import { Game } from './core/Game';

const app = document.getElementById('app');
if (!app) throw new Error('#app missing');

const game = new Game(app);
if (import.meta.env.DEV) (window as unknown as { __paintland: Game }).__paintland = game;
game.init().catch((err: unknown) => {
  console.error(err);
  const msg = document.createElement('div');
  msg.className = 'card';
  msg.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);max-width:460px;font-family:monospace';
  msg.textContent = `PaintLand could not start: ${err instanceof Error ? err.message : String(err)}. It needs a browser with WebGL2.`;
  document.body.appendChild(msg);
});

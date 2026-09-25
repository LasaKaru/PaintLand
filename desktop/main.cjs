// PaintLand desktop shell (Electron). Security first:
//  - the game runs sandboxed, context-isolated, with no Node.js access at all;
//  - it is served from a private app:// scheme out of the signed ASAR archive
//    (never file://), with a strict Content-Security-Policy;
//  - it cannot navigate away, open windows, or ask for permissions it does
//    not need; outside links (sponsors, donations) open in the system browser
//    and only if they are https: or mailto:;
//  - Electron "fuses" (see fuses.cjs) switch off RunAsNode, NODE_OPTIONS,
//    --inspect, and enforce ASAR integrity in the packaged .exe.
'use strict';

const { app, BrowserWindow, Menu, protocol, session, shell, net } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { resolveAppPath, isSafeExternal, CSP } = require('./security.cjs');

const SCHEME = 'app';
const HOST = 'paintland';
const WEB_ROOT = path.join(__dirname, 'app');

protocol.registerSchemesAsPrivileged([{ scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);

// One copy of the game at a time.
if (!app.requestSingleInstanceLock()) app.quit();
// The OS sandbox is always on in the packaged app. Only an unpackaged dev run
// (e.g. CI containers running as root) may switch it off explicitly.
if (!app.isPackaged && process.env.PAINTLAND_NO_SANDBOX === '1') app.commandLine.appendSwitch('no-sandbox');
else app.enableSandbox();
app.setAppUserModelId('com.helao2.paintland');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 860,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#f1ecdd',
    title: 'PaintLand',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      spellcheck: false,
      devTools: !app.isPackaged,
    },
  });
  win.once('ready-to-show', () => win.show());

  // Never leave the game's own origin inside the app window.
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(`${SCHEME}://${HOST}/`)) {
      e.preventDefault();
      if (isSafeExternal(url)) void shell.openExternal(url);
    }
  });
  win.webContents.on('will-redirect', (e, url) => {
    if (!url.startsWith(`${SCHEME}://${HOST}/`)) e.preventDefault();
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternal(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-attach-webview', (e) => e.preventDefault());

  void win.loadURL(`${SCHEME}://${HOST}/index.html`);
  return win;
}

app.on('second-instance', () => {
  const [win] = BrowserWindow.getAllWindows();
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.whenReady().then(() => {
  if (app.isPackaged) Menu.setApplicationMenu(null);
  const ses = session.defaultSession;

  // Serve the built game from inside the app archive, with a strict CSP.
  protocol.handle(SCHEME, async (request) => {
    const file = resolveAppPath(WEB_ROOT, request.url, HOST);
    const notFound = () => new Response('{"ok":false}', { status: 404, headers: { 'content-type': 'application/json', 'Content-Security-Policy': CSP } });
    if (!file) return notFound();
    let res;
    try {
      res = await net.fetch(pathToFileURL(file).toString());
    } catch {
      return notFound();
    }
    if (!res.ok) return notFound();
    const headers = new Headers(res.headers);
    headers.set('Content-Security-Policy', CSP);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    return new Response(res.body, { status: 200, headers });
  });

  // Only what a game needs: pointer lock, fullscreen, gamepad, copying invite links,
  // and the microphone (never the camera) for push-to-talk voice chat.
  const allowed = new Set(['pointerLock', 'fullscreen', 'clipboard-sanitized-write']);
  const audioOnly = (details) => {
    const types = details?.mediaTypes ?? [];
    return types.length > 0 && types.every((t) => t === 'audio');
  };
  ses.setPermissionRequestHandler((_wc, permission, cb, details) => cb(allowed.has(permission) || (permission === 'media' && audioOnly(details))));
  ses.setPermissionCheckHandler((_wc, permission, _origin, details) => allowed.has(permission) || (permission === 'media' && details?.mediaType === 'audio'));

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Refuse to create any other kind of web contents.
app.on('web-contents-created', (_e, contents) => {
  contents.on('will-attach-webview', (e) => e.preventDefault());
});

app.on('window-all-closed', () => app.quit());

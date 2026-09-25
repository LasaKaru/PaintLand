'use strict';
// Pure helpers (unit-tested in test/security.test.cjs).
const path = require('node:path');

/** Content-Security-Policy for the game inside the desktop app. */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  // The game sets many small inline styles (bars, colours).
  "style-src 'self' 'unsafe-inline'",
  // Sponsor logos come from the game server; painted canvases are data:/blob:.
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' data: blob:",
  // The game server (admin, branding, leaderboard) and multiplayer sockets.
  "connect-src 'self' https: wss: http://localhost:* ws://localhost:*",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

/**
 * Map an app://paintland/… URL to a file inside `root`, or null if it tries to
 * leave the folder (../, encoded slashes, other hosts).
 */
function resolveAppPath(root, url, host) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.host !== host) return null;
  let rel;
  try {
    rel = decodeURIComponent(u.pathname);
  } catch {
    return null;
  }
  if (rel.includes('\0') || rel.includes('\\')) return null;
  if (rel === '/' || rel === '') rel = '/index.html';
  const full = path.normalize(path.join(root, rel));
  const base = path.normalize(root + path.sep);
  if (!full.startsWith(base)) return null;
  return full;
}

/** Links the game may open in the system browser. */
function isSafeExternal(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'mailto:';
  } catch {
    return false;
  }
}

module.exports = { CSP, resolveAppPath, isSafeExternal };

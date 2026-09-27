import { analytics } from './Analytics';

/**
 * Error and crash reporting (docs/12 §6 "crash-free sessions"): uncaught
 * errors and rejected promises go to the admin dashboard with the analytics,
 * so they respect the player's statistics opt-out. At most 8 distinct errors
 * per session; the same message is sent once. No names or chat are included,
 * and addresses in messages are trimmed to the file name.
 */

declare const __APP_VERSION__: string | undefined;

/** This build's version (set by vite.config.ts), sent with the analytics session. */
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';

const MAX_PER_SESSION = 8;
/** Where the player is (a chapter, town or menu), so crashes can be grouped by place. */
let placeOf: () => string = () => '';
export function setCrashPlace(fn: () => string): void {
  placeOf = fn;
}
function currentPlace(): string {
  try {
    return placeOf().slice(0, 40);
  } catch {
    return '';
  }
}
const sent = new Set<string>();

/** Keep a message short and free of query strings and full URLs. */
export function tidyError(text: string): string {
  return text
    .replace(/(https?|app|file):\/\/[^\s)]*\/([^/\s)?#]+)(\?[^\s):]*)?/g, '$2')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

export function reportError(message: string, where = '', stack = '', fatal = true): void {
  const msg = tidyError(message || 'Unknown error');
  if (sent.has(msg) || sent.size >= MAX_PER_SESSION) return;
  sent.add(msg);
  const top = tidyError((stack.split('\n').find((l) => l.includes('at ') || l.includes('@')) ?? '').trim()).slice(0, 160);
  analytics.track('error', { msg, where: tidyError(where).slice(0, 80), top, fatal, place: currentPlace() });
  analytics.flush();
}

export function installCrashReporter(): void {
  window.addEventListener('error', (e) => {
    const err = e.error as Error | undefined;
    reportError(e.message || err?.message || 'Script error', e.filename ? `${e.filename}:${e.lineno}` : '', err?.stack ?? '');
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason as Error | string | undefined;
    reportError(typeof r === 'string' ? r : r?.message ?? 'Unhandled rejection', 'promise', typeof r === 'object' ? r?.stack ?? '' : '');
  });
}

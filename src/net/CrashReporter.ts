import { analytics } from './Analytics';

/**
 * Error and crash reporting (docs/12 §6 "crash-free sessions"): uncaught
 * errors and rejected promises go to the admin dashboard with the analytics,
 * so they respect the player's statistics opt-out. At most 8 distinct errors
 * per session; the same message is sent once. No names or chat are included,
 * and addresses in messages are trimmed to the file name.
 */

const MAX_PER_SESSION = 8;
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
  analytics.track('error', { msg, where: tidyError(where).slice(0, 80), top, fatal });
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

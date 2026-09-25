import { api, apiUrl } from './Api';

/**
 * Anonymous play statistics for the owner's dashboard (server/admin.mjs).
 * A random id per browser, no names, nothing typed by the player. Events are
 * batched and sent every 30 s and when the page is hidden. Players can turn
 * it off in Settings → Accessibility.
 */
export type AnalyticsEvent =
  | 'session' | 'beat' | 'play' | 'area' | 'mission' | 'cityMission' | 'trophy' | 'restore' | 'trial' | 'race' | 'link' | 'sponsor_view' | 'sponsor_click' | 'benchmark';

const PID_KEY = 'paintland.pid';

function playerId(): string {
  try {
    let id = localStorage.getItem(PID_KEY);
    if (!id) {
      id = crypto.randomUUID?.() ?? `p-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      localStorage.setItem(PID_KEY, id);
    }
    return id;
  } catch {
    return `p-${Math.random().toString(36).slice(2)}`;
  }
}

class AnalyticsClient {
  enabled = true;
  private readonly pid = playerId();
  private readonly sid = Math.random().toString(36).slice(2, 12);
  private queue: { type: AnalyticsEvent; data?: Record<string, unknown>; at: number }[] = [];
  private started = false;
  private readonly seenSponsors = new Set<string>();

  start(info: Record<string, unknown>): void {
    if (this.started) return;
    this.started = true;
    this.track('session', info);
    setInterval(() => this.flush(), 30_000);
    const bye = (): void => {
      if (document.visibilityState === 'hidden') this.flush(true);
    };
    document.addEventListener('visibilitychange', bye);
    window.addEventListener('pagehide', () => this.flush(true));
  }

  track(type: AnalyticsEvent, data?: Record<string, unknown>): void {
    if (!this.enabled) return;
    this.queue.push({ type, data, at: Date.now() });
    if (this.queue.length > 50) this.flush();
  }

  /** A sponsor board was on screen long enough to count (once per board per session). */
  view(boardKey: string, logoId: string): void {
    if (this.seenSponsors.has(boardKey)) return;
    this.seenSponsors.add(boardKey);
    this.track('sponsor_view', { id: logoId });
  }

  flush(leaving = false): void {
    if (!this.queue.length || !this.enabled) return;
    const body = { pid: this.pid, sid: this.sid, events: this.queue.splice(0, 60) };
    if (leaving && navigator.sendBeacon) {
      navigator.sendBeacon(apiUrl('/api/analytics'), new Blob([JSON.stringify(body)], { type: 'application/json' }));
      return;
    }
    void api('/api/analytics', { method: 'POST', body, timeout: 5000 });
  }
}

export const analytics = new AnalyticsClient();

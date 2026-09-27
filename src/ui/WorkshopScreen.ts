import { t } from '../core/i18n';
import type { Profile } from '../gameplay/Profile';
import { decodeRoad, type CustomRoad } from '../creator/CustomRoad';
import { decodeLivery } from '../gameplay/Livery';

/** What the desktop app offers (desktop/preload.cjs); absent in browsers. */
interface DesktopWorkshop {
  status(): Promise<boolean>;
  list(): Promise<WorkshopItem[]>;
  publish(item: { kind: string; title: string; description: string; code: string }): Promise<{ ok: boolean; id?: string; reason?: string; agreement?: boolean }>;
}
export interface WorkshopItem {
  id: string;
  kind: 'road' | 'livery';
  title: string;
  code: string;
}

export function desktopWorkshop(): DesktopWorkshop | null {
  const w = (globalThis as { paintlandDesktop?: { workshop?: DesktopWorkshop } }).paintlandDesktop?.workshop;
  return w && typeof w.list === 'function' ? w : null;
}

export interface WorkshopHost {
  profile: Profile;
  testRoad(road: CustomRoad): void;
  vehicleChanged(): void;
}

const esc = (s: unknown): string => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Menu → Steam Workshop (desktop app with Steam only): play subscribed roads, wear liveries, publish share codes. */
export class WorkshopScreen {
  private items: WorkshopItem[] | null = null;
  private on: boolean | null = null;
  private busy = false;

  constructor(
    private readonly host: WorkshopHost,
    private readonly rerender: () => void,
    private readonly toast: (m: string) => void,
  ) {}

  static get offered(): boolean {
    return !!desktopWorkshop();
  }

  load(): void {
    const w = desktopWorkshop();
    if (!w) return;
    void w.status().then(async (on) => {
      this.on = on;
      this.items = on ? await w.list() : [];
      this.rerender();
    });
  }

  render(): string {
    if (!desktopWorkshop() || this.on === false) return `<p class="menu-hint">${t('ws.off')}</p>`;
    if (this.on === null || !this.items) return '<p class="menu-hint">…</p>';
    const rows = this.items.length
      ? this.items
          .map((i) => `<div class="card row"><b>${i.kind === 'road' ? '🛣' : '🎨'} ${esc(i.title)}</b><button class="btn small primary" data-ws-use="${esc(i.id)}">${i.kind === 'road' ? t('ws.drive') : t('ws.wear')}</button></div>`)
          .join('')
      : `<p class="menu-hint">${t('ws.none')}</p>`;
    return `<p class="menu-hint">${t('ws.hint')}</p><h4>${t('ws.subscribed')}</h4>${rows}
      <h4>${t('ws.publish')}</h4>
      <form data-form="workshop" class="stack">
        <label>${t('ws.code')} <input name="code" class="text-input" maxlength="2400" placeholder="R1.… / L1.…" required></label>
        <label>${t('ws.title')} <input name="title" class="text-input" maxlength="60" required></label>
        <label>${t('ws.desc')} <input name="description" class="text-input" maxlength="400"></label>
        <div class="row"><button class="btn primary" type="submit" ${this.busy ? 'disabled' : ''}>⬆ ${t('ws.publishButton')}</button></div>
      </form>`;
  }

  onClick(el: HTMLElement): boolean {
    const id = el.dataset.wsUse;
    if (!id) return false;
    const item = this.items?.find((i) => i.id === id);
    if (!item) return true;
    if (item.kind === 'road') {
      const road = decodeRoad(item.code);
      if (road) this.host.testRoad(road);
      else this.toast(t('ws.bad'));
    } else if (decodeLivery(item.code)) {
      const p = this.host.profile;
      p.setVehicleLook(p.data.vehicle, { livery: item.code });
      p.save();
      this.host.vehicleChanged();
      this.toast(t('ws.worn'));
    } else this.toast(t('ws.bad'));
    return true;
  }

  onSubmit(form: HTMLFormElement): boolean {
    if (form.dataset.form !== 'workshop') return false;
    const w = desktopWorkshop();
    const f = new FormData(form);
    const code = String(f.get('code') ?? '').trim();
    const kind = decodeRoad(code) ? 'road' : decodeLivery(code) ? 'livery' : null;
    if (!w || !kind) {
      this.toast(t('ws.bad'));
      return true;
    }
    this.busy = true;
    this.rerender();
    void w.publish({ kind, code, title: String(f.get('title') ?? ''), description: String(f.get('description') ?? '') }).then((r) => {
      this.busy = false;
      this.toast(r.ok ? (r.agreement ? t('ws.agreement') : t('ws.published')) : (r.reason ?? t('ws.bad')));
      this.rerender();
    });
    return true;
  }
}

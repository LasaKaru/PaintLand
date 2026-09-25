import type { ActionName, Input } from '../core/Input';

interface ButtonDef {
  id: string;
  label: string;
  /** Held while touched (throttle, boost…) or tapped once (hop, camera…). */
  hold?: ActionName | 'throttle' | 'brake';
  tap?: ActionName;
  cls: string;
}

const BUTTONS: ButtonDef[] = [
  { id: 'gas', label: 'GO', hold: 'throttle', cls: 'big gas' },
  { id: 'brake', label: 'BRAKE', hold: 'brake', cls: 'big brake' },
  { id: 'hop', label: 'HOP', tap: 'hop', cls: 'mid hop' },
  { id: 'boost', label: 'BOOST', hold: 'boost', cls: 'mid boost' },
  { id: 'act', label: 'E', tap: 'interact', cls: 'small act' },
  { id: 'cam', label: '🎥', tap: 'camera', cls: 'small cam' },
  { id: 'drift', label: 'DRIFT', hold: 'drift', cls: 'small drift' },
  { id: 'photo', label: '📷', tap: 'photo', cls: 'small photo' },
];

/**
 * On-screen controls for phones and tablets (docs/10 §5): a floating stick on
 * the left half (steer / walk), pedals and action buttons on the right, and
 * drag-to-look anywhere else. Appears on the first touch and writes into the
 * same Input the keyboard and gamepad use, so every system works unchanged.
 */
export class TouchControls {
  readonly root: HTMLDivElement;
  private readonly base: HTMLDivElement;
  private readonly knob: HTMLDivElement;
  private stickId: number | null = null;
  private stickOrigin = { x: 0, y: 0 };
  private lookId: number | null = null;
  private lookLast = { x: 0, y: 0 };
  private enabled = false;

  constructor(parent: HTMLElement, private readonly input: Input) {
    this.root = document.createElement('div');
    this.root.className = 'touch hidden';
    this.root.innerHTML = `<div class="stick-zone"><div class="stick-base"><div class="stick-knob"></div></div></div>
      <div class="touch-buttons">${BUTTONS.map((b) => `<button class="tbtn ${b.cls}" data-t="${b.id}">${b.label}</button>`).join('')}</div>`;
    parent.appendChild(this.root);
    this.base = this.root.querySelector('.stick-base')!;
    this.knob = this.root.querySelector('.stick-knob')!;
    const zone = this.root.querySelector<HTMLElement>('.stick-zone')!;
    zone.addEventListener('touchstart', this.stickStart, { passive: false });
    zone.addEventListener('touchmove', this.stickMove, { passive: false });
    zone.addEventListener('touchend', this.stickEnd);
    zone.addEventListener('touchcancel', this.stickEnd);
    for (const btn of this.root.querySelectorAll<HTMLButtonElement>('.tbtn')) {
      const def = BUTTONS.find((b) => b.id === btn.dataset.t);
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        btn.classList.add('down');
        if (btn.dataset.t === 'pause') this.input.press('pause');
        else if (def) this.down(def);
      }, { passive: false });
      const up = (e: Event): void => {
        e.preventDefault();
        btn.classList.remove('down');
        if (def) this.up(def);
      };
      btn.addEventListener('touchend', up);
      btn.addEventListener('touchcancel', up);
    }
    // Look: drag on the canvas outside the controls.
    window.addEventListener('touchstart', this.lookStart, { passive: true });
    window.addEventListener('touchmove', this.lookMove, { passive: true });
    window.addEventListener('touchend', this.lookEnd);
    // Show on the first touch anywhere.
    window.addEventListener('touchstart', () => this.enable(), { once: true, passive: true });
  }

  enable(): void {
    if (this.enabled) return;
    this.enabled = true;
    this.root.classList.remove('hidden');
    document.documentElement.classList.add('touch-ui');
  }

  /** Only while driving or walking (not in menus or photo mode). */
  setVisible(on: boolean): void {
    this.root.classList.toggle('off', !on);
    if (!on) this.reset();
  }

  private down(def: ButtonDef): void {
    const t = this.input.touch;
    if (def.hold === 'throttle') t.throttle = 1;
    else if (def.hold === 'brake') t.brake = 1;
    else if (def.hold) t.held.add(def.hold);
    if (def.tap) this.input.press(def.tap);
    if (def.id === 'boost') t.held.add('sprint');
    if (def.id === 'hop') t.held.add('hop');
  }

  private up(def: ButtonDef): void {
    const t = this.input.touch;
    if (def.hold === 'throttle') t.throttle = 0;
    else if (def.hold === 'brake') t.brake = 0;
    else if (def.hold) t.held.delete(def.hold);
    if (def.id === 'boost') t.held.delete('sprint');
    if (def.id === 'hop') t.held.delete('hop');
  }

  private reset(): void {
    const t = this.input.touch;
    t.moveX = t.moveY = t.throttle = t.brake = 0;
    t.held.clear();
    this.stickId = null;
    this.knob.style.transform = '';
  }

  private stickStart = (e: TouchEvent): void => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    this.stickId = touch.identifier;
    this.stickOrigin = { x: touch.clientX, y: touch.clientY };
    this.base.style.left = `${touch.clientX}px`;
    this.base.style.top = `${touch.clientY}px`;
    this.base.classList.add('active');
  };

  private stickMove = (e: TouchEvent): void => {
    e.preventDefault();
    for (const touch of Array.from(e.changedTouches)) {
      if (touch.identifier !== this.stickId) continue;
      const R = 56;
      let dx = touch.clientX - this.stickOrigin.x;
      let dy = touch.clientY - this.stickOrigin.y;
      const d = Math.hypot(dx, dy);
      if (d > R) {
        dx = (dx / d) * R;
        dy = (dy / d) * R;
      }
      this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const t = this.input.touch;
      t.moveX = Math.abs(dx) < 6 ? 0 : dx / R;
      t.moveY = Math.abs(dy) < 6 ? 0 : -dy / R;
    }
  };

  private stickEnd = (e: TouchEvent): void => {
    for (const touch of Array.from(e.changedTouches)) {
      if (touch.identifier !== this.stickId) continue;
      this.stickId = null;
      this.knob.style.transform = '';
      this.base.classList.remove('active');
      this.input.touch.moveX = this.input.touch.moveY = 0;
    }
  };

  private lookStart = (e: TouchEvent): void => {
    if (!this.enabled || this.lookId !== null) return;
    const touch = e.changedTouches[0];
    const target = touch.target as HTMLElement;
    if (target.closest('.touch-buttons, .stick-zone, .menu, .photo-panel, button, .card')) return;
    if (touch.clientX < window.innerWidth * 0.4) return;
    this.lookId = touch.identifier;
    this.lookLast = { x: touch.clientX, y: touch.clientY };
  };

  private lookMove = (e: TouchEvent): void => {
    for (const touch of Array.from(e.changedTouches)) {
      if (touch.identifier !== this.lookId) continue;
      this.input.addLook((touch.clientX - this.lookLast.x) * 1.6, (touch.clientY - this.lookLast.y) * 1.6);
      this.lookLast = { x: touch.clientX, y: touch.clientY };
    }
  };

  private lookEnd = (e: TouchEvent): void => {
    for (const touch of Array.from(e.changedTouches)) if (touch.identifier === this.lookId) this.lookId = null;
  };
}

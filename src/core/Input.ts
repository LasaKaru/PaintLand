/**
 * Input layer: keyboard, mouse and gamepad mapped to named actions.
 * Bindings are data, so they can be rebound and saved (docs/05 §6).
 *
 * Button presses are *buffered* until the fixed-step simulation consumes them,
 * so a tap between two sim ticks is never lost.
 */

export type ActionName =
  | 'forward' | 'back' | 'left' | 'right'
  | 'hop' | 'boost' | 'drift' | 'honk'
  | 'sprint' | 'crouch' | 'interact'
  | 'camera' | 'zoomIn' | 'zoomOut' | 'fovDown' | 'fovUp'
  | 'radio' | 'nextSong' | 'band'
  | 'respawn' | 'pause' | 'studio' | 'photo' | 'hud'
  | 'time1' | 'time2' | 'time3' | 'time4' | 'time5' | 'time6' | 'time7' | 'time8' | 'weather';

export type Bindings = Record<ActionName, string[]>;

export const DEFAULT_BINDINGS: Bindings = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  hop: ['Space'],
  boost: ['ShiftLeft', 'ShiftRight'],
  drift: ['ControlLeft'],
  honk: ['KeyH'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  crouch: ['ControlLeft', 'ControlRight'],
  interact: ['KeyF', 'KeyE'],
  camera: ['KeyC', 'KeyV'],
  zoomIn: [],
  zoomOut: [],
  fovDown: ['BracketLeft'],
  fovUp: ['BracketRight'],
  radio: ['KeyT'],
  nextSong: ['KeyN'],
  band: ['KeyB'],
  respawn: ['KeyR'],
  pause: ['Escape'],
  studio: ['F2', 'Backquote'],
  photo: ['KeyP'],
  hud: ['KeyU'],
  time1: ['Digit1'],
  time2: ['Digit2'],
  time3: ['Digit3'],
  time4: ['Digit4'],
  time5: ['Digit5'],
  time6: ['Digit6'],
  time7: ['Digit7'],
  time8: ['Digit8'],
  weather: ['Digit9'],
};

/** Standard-mapping gamepad button indices per action. */
const PAD_BUTTONS: Partial<Record<ActionName, number[]>> = {
  hop: [0],
  interact: [3],
  boost: [2],
  drift: [1],
  sprint: [10],
  crouch: [1],
  camera: [11],
  pause: [9],
  photo: [8],
  radio: [13],
  nextSong: [15],
  band: [14],
  honk: [10],
};

const STORAGE_KEY = 'paintland.bindings.v1';

export class Input {
  bindings: Bindings;
  private down = new Set<string>();
  private buffered = new Set<ActionName>();
  private padPrev = new Map<string, boolean>();
  private mouseDX = 0;
  private mouseDY = 0;
  private wheel = 0;
  private pointerLocked = false;
  /** Last device the player touched, for button prompts. */
  lastDevice: 'keyboard' | 'gamepad' = 'keyboard';

  // Analogue values refreshed by poll().
  padMoveX = 0;
  padMoveY = 0;
  padLookX = 0;
  padLookY = 0;
  padThrottle = 0;
  padBrake = 0;

  constructor(private readonly element: HTMLElement) {
    this.bindings = loadBindings();
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', () => this.down.clear());
    element.addEventListener('mousemove', this.onMouseMove);
    element.addEventListener('wheel', this.onWheel, { passive: true });
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === element;
    });
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (isTyping(e.target)) return;
    this.lastDevice = 'keyboard';
    if (!this.down.has(e.code)) {
      for (const action of this.actionsForKey(e.code)) this.buffered.add(action);
    }
    this.down.add(e.code);
    if (e.code === 'Space' || e.code.startsWith('Arrow') || e.code === 'Tab') e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.down.delete(e.code);
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.pointerLocked && e.buttons === 0) return;
    this.mouseDX += e.movementX;
    this.mouseDY += e.movementY;
  };

  private onWheel = (e: WheelEvent): void => {
    this.wheel += Math.sign(e.deltaY);
  };

  private actionsForKey(code: string): ActionName[] {
    const result: ActionName[] = [];
    for (const action in this.bindings) {
      if (this.bindings[action as ActionName].includes(code)) result.push(action as ActionName);
    }
    return result;
  }

  requestPointerLock(): void {
    if (!this.pointerLocked) this.element.requestPointerLock?.();
  }

  releasePointerLock(): void {
    if (this.pointerLocked) document.exitPointerLock?.();
  }

  get isPointerLocked(): boolean {
    return this.pointerLocked;
  }

  /** Read gamepads once per rendered frame. */
  poll(): void {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = Array.from(pads).find((p) => p && p.connected) ?? null;
    if (!pad) {
      this.padMoveX = this.padMoveY = this.padLookX = this.padLookY = this.padThrottle = this.padBrake = 0;
      return;
    }
    const dz = (v: number): number => (Math.abs(v) < 0.14 ? 0 : (v - Math.sign(v) * 0.14) / 0.86);
    this.padMoveX = dz(pad.axes[0] ?? 0);
    this.padMoveY = dz(pad.axes[1] ?? 0);
    this.padLookX = dz(pad.axes[2] ?? 0);
    this.padLookY = dz(pad.axes[3] ?? 0);
    this.padThrottle = pad.buttons[7]?.value ?? 0;
    this.padBrake = pad.buttons[6]?.value ?? 0;
    if (Math.abs(this.padMoveX) + Math.abs(this.padMoveY) + this.padThrottle > 0.2) this.lastDevice = 'gamepad';

    for (const [action, indices] of Object.entries(PAD_BUTTONS) as [ActionName, number[]][]) {
      for (const i of indices) {
        const pressed = pad.buttons[i]?.pressed ?? false;
        const key = `${action}:${i}`;
        if (pressed && !this.padPrev.get(key)) {
          this.buffered.add(action);
          this.lastDevice = 'gamepad';
        }
        this.padPrev.set(key, pressed);
      }
    }
  }

  /** True while any key bound to the action is held (or its pad button). */
  held(action: ActionName): boolean {
    for (const code of this.bindings[action]) if (this.down.has(code)) return true;
    const pad = navigator.getGamepads?.().find((p) => p && p.connected);
    const indices = PAD_BUTTONS[action];
    if (pad && indices) for (const i of indices) if (pad.buttons[i]?.pressed) return true;
    return false;
  }

  /** Returns true once per press; the press stays buffered until consumed. */
  consume(action: ActionName): boolean {
    if (this.buffered.has(action)) {
      this.buffered.delete(action);
      return true;
    }
    return false;
  }

  /** Throw away presses that no system consumed this frame (UI-only actions). */
  clearUnconsumed(keep: ActionName[] = []): void {
    for (const a of Array.from(this.buffered)) if (!keep.includes(a)) this.buffered.delete(a);
  }

  /** Movement axes in [-1, 1]: x = right, y = forward. */
  moveAxes(): { x: number; y: number } {
    let x = (this.held('right') ? 1 : 0) - (this.held('left') ? 1 : 0);
    let y = (this.held('forward') ? 1 : 0) - (this.held('back') ? 1 : 0);
    if (this.padMoveX !== 0 || this.padMoveY !== 0) {
      x = this.padMoveX;
      y = -this.padMoveY;
    }
    return { x, y };
  }

  throttle(): number {
    return Math.max(this.held('forward') ? 1 : 0, this.padThrottle);
  }

  brake(): number {
    return Math.max(this.held('back') ? 1 : 0, this.padBrake);
  }

  steer(): number {
    const k = (this.held('right') ? 1 : 0) - (this.held('left') ? 1 : 0);
    return k !== 0 ? k : this.padMoveX;
  }

  /** Mouse movement (pixels) plus scaled right-stick, since the last call. */
  takeLook(dt: number): { dx: number; dy: number } {
    const dx = this.mouseDX + this.padLookX * 900 * dt;
    const dy = this.mouseDY + this.padLookY * 600 * dt;
    this.mouseDX = this.mouseDY = 0;
    return { dx, dy };
  }

  takeWheel(): number {
    const w = this.wheel;
    this.wheel = 0;
    return w;
  }

  rebind(action: ActionName, codes: string[]): void {
    this.bindings[action] = codes;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.bindings));
    } catch {
      /* storage unavailable: bindings stay for this session only */
    }
  }
}

function loadBindings(): Bindings {
  const result = structuredClone(DEFAULT_BINDINGS);
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) Object.assign(result, JSON.parse(saved) as Partial<Bindings>);
  } catch {
    /* ignore corrupt or blocked storage */
  }
  return result;
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

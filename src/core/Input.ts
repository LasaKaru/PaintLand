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
  | 'time1' | 'time2' | 'time3' | 'time4' | 'time5' | 'time6' | 'time7' | 'time8' | 'weather'
  | 'drink' | 'cycleTonic' | 'emote' | 'chat'
  | 'shiftUp' | 'shiftDown';

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
  drink: ['KeyQ'],
  cycleTonic: ['KeyZ'],
  emote: ['KeyG'],
  chat: ['Enter'],
  shiftUp: ['Period'],
  shiftDown: ['Comma'],
};

/** Names and groups for the Controls screen. */
export const ACTION_INFO: { action: ActionName; label: string; group: 'Driving' | 'On foot' | 'Camera' | 'World' | 'Game' }[] = [
  { action: 'forward', label: 'Throttle / walk forward', group: 'Driving' },
  { action: 'back', label: 'Brake / reverse / walk back', group: 'Driving' },
  { action: 'left', label: 'Steer / walk left', group: 'Driving' },
  { action: 'right', label: 'Steer / walk right', group: 'Driving' },
  { action: 'hop', label: 'Hop / jump', group: 'Driving' },
  { action: 'boost', label: 'Boost', group: 'Driving' },
  { action: 'drift', label: 'Drift / handbrake', group: 'Driving' },
  { action: 'shiftUp', label: 'Gear up (manual gearbox)', group: 'Driving' },
  { action: 'shiftDown', label: 'Gear down (manual gearbox)', group: 'Driving' },
  { action: 'honk', label: 'Horn', group: 'Driving' },
  { action: 'respawn', label: 'Respawn', group: 'Driving' },
  { action: 'sprint', label: 'Sprint', group: 'On foot' },
  { action: 'crouch', label: 'Walk slowly', group: 'On foot' },
  { action: 'interact', label: 'Get in / out · talk', group: 'On foot' },
  { action: 'emote', label: 'Wave', group: 'On foot' },
  { action: 'camera', label: 'Change camera', group: 'Camera' },
  { action: 'fovDown', label: 'Narrower view', group: 'Camera' },
  { action: 'fovUp', label: 'Wider view', group: 'Camera' },
  { action: 'photo', label: 'Photo mode', group: 'Camera' },
  { action: 'hud', label: 'Hide HUD', group: 'Camera' },
  { action: 'weather', label: 'Change weather', group: 'World' },
  { action: 'time8', label: 'Auto day cycle', group: 'World' },
  { action: 'radio', label: 'Radio on/off', group: 'World' },
  { action: 'nextSong', label: 'Next song', group: 'World' },
  { action: 'band', label: 'Change station', group: 'World' },
  { action: 'drink', label: 'Drink tonic', group: 'Game' },
  { action: 'cycleTonic', label: 'Next tonic', group: 'Game' },
  { action: 'chat', label: 'Chat', group: 'Game' },
  { action: 'studio', label: 'Studio panel', group: 'Game' },
  { action: 'pause', label: 'Pause / menu', group: 'Game' },
];

/** Short label for a KeyboardEvent.code. */
export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Arrow')) return { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' }[code] ?? code;
  const names: Record<string, string> = {
    Space: 'Space', ShiftLeft: 'L-Shift', ShiftRight: 'R-Shift', ControlLeft: 'L-Ctrl', ControlRight: 'R-Ctrl', AltLeft: 'L-Alt', AltRight: 'R-Alt',
    Escape: 'Esc', Enter: 'Enter', Backquote: '`', BracketLeft: '[', BracketRight: ']', Period: '. period', Comma: ', comma', Slash: '/', Semicolon: ';', Quote: "'", Minus: '-', Equal: '=', Tab: 'Tab', Backspace: '⌫',
  };
  return names[code] ?? code;
}

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
  drink: [12],
  emote: [4],
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
  private capture: ((code: string) => void) | null = null;
  /** On-screen touch controls write here (see ui/TouchControls.ts). */
  readonly touch = { moveX: 0, moveY: 0, throttle: 0, brake: 0, held: new Set<ActionName>() };
  mouseSensitivity = 1;
  invertY = false;
  padLookSensitivity = 1;
  deadzone = 0.14;
  vibration = true;
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
    if (this.capture) {
      // Rebinding: the next key goes to the Controls screen, not the game.
      e.preventDefault();
      e.stopPropagation();
      const cb = this.capture;
      this.capture = null;
      cb(e.code);
      return;
    }
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
    const d = this.deadzone;
    const dz = (v: number): number => (Math.abs(v) < d ? 0 : (v - Math.sign(v) * d) / (1 - d));
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
    if (this.touch.held.has(action)) return true;
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
    if (this.touch.moveX !== 0 || this.touch.moveY !== 0) {
      x = this.touch.moveX;
      y = this.touch.moveY;
    }
    return { x, y };
  }

  throttle(): number {
    return Math.max(this.held('forward') ? 1 : 0, this.padThrottle, this.touch.throttle);
  }

  brake(): number {
    return Math.max(this.held('back') ? 1 : 0, this.padBrake, this.touch.brake);
  }

  steer(): number {
    const k = (this.held('right') ? 1 : 0) - (this.held('left') ? 1 : 0);
    return k !== 0 ? k : this.touch.moveX !== 0 ? this.touch.moveX : this.padMoveX;
  }

  /** Mouse movement (pixels) plus scaled right-stick, since the last call. */
  takeLook(dt: number): { dx: number; dy: number } {
    const dx = this.mouseDX * this.mouseSensitivity + this.padLookX * 900 * dt * this.padLookSensitivity;
    const dy = (this.mouseDY * this.mouseSensitivity + this.padLookY * 600 * dt * this.padLookSensitivity) * (this.invertY ? -1 : 1);
    this.mouseDX = this.mouseDY = 0;
    return { dx, dy };
  }

  /** A tap on a touch button: behaves like a key press. */
  press(action: ActionName): void {
    this.buffered.add(action);
    this.lastDevice = 'keyboard';
  }

  /** Touch-drag look (pixels). */
  addLook(dx: number, dy: number): void {
    this.mouseDX += dx;
    this.mouseDY += dy;
  }

  takeWheel(): number {
    const w = this.wheel;
    this.wheel = 0;
    return w;
  }

  rebind(action: ActionName, codes: string[]): void {
    this.bindings[action] = codes;
    this.saveBindings();
  }

  /** Bind `code` as the primary key for `action`, taking it away from any other action. */
  bindPrimary(action: ActionName, code: string): void {
    for (const a of Object.keys(this.bindings) as ActionName[]) {
      if (a !== action) this.bindings[a] = this.bindings[a].filter((c) => c !== code || sharedOk(a, action));
    }
    const rest = this.bindings[action].filter((c) => c !== code).slice(0, 1);
    this.bindings[action] = [code, ...rest];
    this.saveBindings();
  }

  resetBindings(): void {
    this.bindings = structuredClone(DEFAULT_BINDINGS);
    this.saveBindings();
  }

  /** Send the next key press to `cb` (Controls screen "press a key"). */
  captureNextKey(cb: ((code: string) => void) | null): void {
    this.capture = cb;
  }

  /** Gamepad rumble, if the pad supports it. */
  rumble(strength: number, ms: number): void {
    if (!this.vibration) return;
    const pad = navigator.getGamepads?.().find((p) => p && p.connected);
    const act = (pad as (Gamepad & { vibrationActuator?: { playEffect?: (t: string, p: object) => Promise<unknown> } }) | undefined)?.vibrationActuator;
    void act?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: Math.min(1, strength), weakMagnitude: Math.min(1, strength * 0.6) }).catch(() => undefined);
  }

  private saveBindings(): void {
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

/** Pairs that share keys on purpose (Shift boosts in the car and sprints on foot). */
function sharedOk(a: ActionName, b: ActionName): boolean {
  const pairs = [['boost', 'sprint'], ['drift', 'crouch']];
  return pairs.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

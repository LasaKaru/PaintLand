/**
 * Player options that are not art or graphics (docs/08 §4): controls, driving
 * model and assists, units, weather and accessibility. Saved per device.
 */
export interface GameOptions {
  // Comfort and accessibility
  calmLighting: boolean;
  hudScale: number;
  colourBlind: 'none' | 'protan' | 'deutan' | 'tritan';
  // Controls
  mouseSensitivity: number;
  invertY: boolean;
  padLookSensitivity: number;
  padDeadzone: number;
  vibration: boolean;
  // Driving
  handling: 'arcade' | 'realistic';
  gearbox: 'auto' | 'manual';
  /** Keep a minimum speed on flat road once moving (arcade comfort). */
  autoCruise: boolean;
  steerSensitivity: number;
  /** 0 = raw steering, 1 = very smooth. */
  steerSmoothing: number;
  /** Gently pulls the car back to the middle of the road when you let go. */
  steerAssist: number;
  units: 'kmh' | 'mph';
  // World
  autoWeather: boolean;
  dayMinutes: number;
  showGhost: boolean;
  // Online safety
  /** Chat: filtered (default), unfiltered, or off. */
  chat: 'filtered' | 'on' | 'off';
  /** Player names whose chat and avatar are hidden. */
  blocked: string[];
  /** Show the minimap in free roam. */
  minimap: boolean;
}

export const DEFAULT_OPTIONS: GameOptions = {
  calmLighting: false,
  hudScale: 1,
  colourBlind: 'none',
  mouseSensitivity: 1,
  invertY: false,
  padLookSensitivity: 1,
  padDeadzone: 0.14,
  vibration: true,
  handling: 'arcade',
  gearbox: 'auto',
  autoCruise: true,
  steerSensitivity: 1,
  steerSmoothing: 0.2,
  steerAssist: 0,
  units: 'kmh',
  autoWeather: false,
  dayMinutes: 12,
  showGhost: true,
  chat: 'filtered',
  blocked: [],
  minimap: true,
};

const KEY = 'paintland.settings.v1';

export function loadOptions(): GameOptions {
  const o = structuredClone(DEFAULT_OPTIONS);
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(o, JSON.parse(raw) as Partial<GameOptions>);
  } catch {
    /* storage blocked or corrupt */
  }
  return o;
}

export function saveOptions(o: GameOptions): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(o));
  } catch {
    /* storage blocked */
  }
}

/** Speed for display in the chosen units. */
export function displaySpeed(kmh: number, units: GameOptions['units']): number {
  return units === 'mph' ? kmh * 0.621371 : kmh;
}

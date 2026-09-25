/**
 * Every art-tuning value from the Studio panel (docs/03 §2.5). Saved per device.
 */
export interface StudioSettings {
  // Camera
  fov: number;
  renderScale: number;
  autoResolution: boolean;
  cameraRoll: number;
  cameraShake: number;
  // Ink
  inkStrength: number;
  lineWeight: number;
  lineCrispness: number;
  lineBoilFps: number;
  lineBoilAmount: number;
  pencilLines: number;
  // Paint
  colourBleed: number;
  edgeDarkening: number;
  wetEdges: number;
  granulation: number;
  hatching: number;
  // Paper and frame
  paperGrain: number;
  border: number;
  // Glow and grade
  glow: number;
  saturation: number;
  warmth: number;
  atmosphere: number;
  // Motion
  speedLines: number;
  reducedMotion: boolean;
  // World and sound
  wind: number;
  engineHum: number;
  musicBox: number;
  musicVolume: number;
  // Vibe
  vibe: string;
}

export const DEFAULT_STUDIO: StudioSettings = {
  fov: 72,
  renderScale: 1,
  autoResolution: true,
  cameraRoll: 1,
  cameraShake: 0.5,
  inkStrength: 0.85,
  lineWeight: 1.3,
  lineCrispness: 0.6,
  lineBoilFps: 10,
  lineBoilAmount: 0.8,
  pencilLines: 0.3,
  colourBleed: 4,
  edgeDarkening: 0.55,
  wetEdges: 0.4,
  granulation: 0.45,
  hatching: 0.6,
  paperGrain: 0.5,
  border: 0.6,
  glow: 0.8,
  saturation: 1.0,
  warmth: 0.08,
  atmosphere: 0.5,
  speedLines: 0.6,
  reducedMotion: false,
  wind: 0.5,
  engineHum: 0.35,
  musicBox: 0.8,
  musicVolume: 0.7,
  vibe: 'sketchbook',
};

/** Named bundles of settings (docs/03 §4). Only the listed keys change. */
export const VIBES: Record<string, Partial<StudioSettings>> = {
  sketchbook: {},
  postcard: { inkStrength: 0.6, paperGrain: 0.8, warmth: 0.25, border: 0.9, saturation: 0.95, colourBleed: 5 },
  nocturne: { inkStrength: 0.7, glow: 1.6, warmth: -0.35, saturation: 0.85, lineWeight: 1.0 },
  dreamy: { colourBleed: 7, wetEdges: 0.8, lineCrispness: 0.25, inkStrength: 0.55, saturation: 0.9, glow: 1.2 },
  velocity: { inkStrength: 1, lineCrispness: 0.9, speedLines: 1, saturation: 1.15, colourBleed: 2 },
  architect: { inkStrength: 1, lineWeight: 1.8, colourBleed: 1, saturation: 0.45, pencilLines: 0.8, warmth: -0.2 },
  maritime: { warmth: 0.18, saturation: 1.1, atmosphere: 0.8, wetEdges: 0.6 },
  charcoal: { saturation: 0.12, granulation: 1, inkStrength: 1, paperGrain: 0.9, hatching: 1 },
};

const KEY = 'paintland.studio.v1';

export function loadStudio(): StudioSettings {
  const s = { ...DEFAULT_STUDIO };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(s, JSON.parse(raw) as Partial<StudioSettings>);
  } catch {
    /* storage blocked or corrupt: use defaults */
  }
  return s;
}

export function saveStudio(s: StudioSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function applyVibe(s: StudioSettings, name: string): void {
  const vibe = VIBES[name];
  if (!vibe) return;
  // Reset the art keys that vibes touch, then apply the vibe on top.
  const artKeys: (keyof StudioSettings)[] = [
    'inkStrength', 'lineWeight', 'lineCrispness', 'pencilLines', 'colourBleed', 'edgeDarkening', 'wetEdges',
    'granulation', 'hatching', 'paperGrain', 'border', 'glow', 'saturation', 'warmth', 'atmosphere', 'speedLines',
  ];
  for (const k of artKeys) (s as unknown as Record<string, unknown>)[k] = DEFAULT_STUDIO[k];
  Object.assign(s, vibe);
  s.vibe = name;
}

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

  // Art style: 0 = watercolour sketchbook, 1 = realistic (docs/03 §7).
  artStyle: ArtStyle;
  realism: number;
  exposure: number;
  contrast: number;
  vignette: number;
  aoStrength: number;
  sunShafts: number;
  /** Depth of field in cinematics and photo mode, 0..1. */
  cinematicDof: number;

  // Graphics quality (docs/11 §4).
  quality: QualityLevel;
  maxPixelRatio: number;
  /** 0 off, 1 = 1024², 2 = 2048², 3 = 4096². */
  shadowQuality: number;
  /** Half-size of the sun's shadow box in metres. */
  shadowDistance: number;
  softShadows: boolean;
  /** Screen-space ambient occlusion: 0 off, 1 = 8 samples, 2 = 16 samples. */
  aoQuality: number;
  /** 0 off, 1 = normal, 2 = wide. */
  bloomQuality: number;
  shafts: boolean;
  fxaa: boolean;
  hdr: boolean;
  drawDistance: number;
  /** 0 = unlimited. */
  fpsCap: number;
}

export type ArtStyle = 'watercolour' | 'illustrated' | 'realistic';
export type QualityLevel = 'low' | 'medium' | 'high' | 'ultra' | 'custom';

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
  artStyle: 'watercolour',
  realism: 0,
  exposure: 1,
  contrast: 1.05,
  vignette: 0.25,
  aoStrength: 0.8,
  sunShafts: 0.6,
  cinematicDof: 0.6,
  quality: 'high',
  maxPixelRatio: 1.5,
  shadowQuality: 2,
  shadowDistance: 90,
  softShadows: true,
  aoQuality: 1,
  bloomQuality: 2,
  shafts: true,
  fxaa: true,
  hdr: true,
  drawDistance: 3500,
  fpsCap: 0,
};

/** Graphics presets. Only the listed keys change; `custom` is whatever the player set. */
export const QUALITY_PRESETS: Record<Exclude<QualityLevel, 'custom'>, Partial<StudioSettings>> = {
  low: { renderScale: 0.75, autoResolution: true, maxPixelRatio: 1, shadowQuality: 1, shadowDistance: 55, softShadows: false, aoQuality: 0, bloomQuality: 1, shafts: false, fxaa: false, hdr: false, drawDistance: 1800 },
  medium: { renderScale: 1, autoResolution: true, maxPixelRatio: 1, shadowQuality: 2, shadowDistance: 70, softShadows: false, aoQuality: 1, bloomQuality: 1, shafts: false, fxaa: true, hdr: true, drawDistance: 2600 },
  high: { renderScale: 1, autoResolution: true, maxPixelRatio: 1.5, shadowQuality: 2, shadowDistance: 90, softShadows: true, aoQuality: 1, bloomQuality: 2, shafts: true, fxaa: true, hdr: true, drawDistance: 3500 },
  ultra: { renderScale: 1, autoResolution: false, maxPixelRatio: 2, shadowQuality: 3, shadowDistance: 130, softShadows: true, aoQuality: 2, bloomQuality: 2, shafts: true, fxaa: true, hdr: true, drawDistance: 5000 },
};

export const QUALITY_KEYS = ['renderScale', 'autoResolution', 'maxPixelRatio', 'shadowQuality', 'shadowDistance', 'softShadows', 'aoQuality', 'bloomQuality', 'shafts', 'fxaa', 'hdr', 'drawDistance'] as const;

export function applyQuality(s: StudioSettings, level: QualityLevel): void {
  s.quality = level;
  if (level !== 'custom') Object.assign(s, QUALITY_PRESETS[level]);
}

/** A starting tier from what the device tells us (phones and small screens start Low). */
export function detectQuality(): QualityLevel {
  if (typeof navigator === 'undefined') return 'high';
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const cores = navigator.hardwareConcurrency ?? 4;
  if (mobile) return 'low';
  if (cores <= 4) return 'medium';
  return 'high';
}

/** Art style bundles: how far toward realism, and which painterly passes stay on. */
export const ART_STYLES: Record<ArtStyle, Partial<StudioSettings>> = {
  watercolour: { realism: 0, inkStrength: 0.85, lineWeight: 1.3, exposure: 1, contrast: 1.05, vignette: 0.25, saturation: 1, speedLines: 0.6 },
  illustrated: { realism: 0.55, inkStrength: 0.55, lineWeight: 1.1, exposure: 1.05, contrast: 1.05, vignette: 0.3, saturation: 1.05, speedLines: 0.4 },
  realistic: { realism: 1, inkStrength: 0, lineWeight: 1, exposure: 1.1, contrast: 1.08, vignette: 0.35, saturation: 1.08, speedLines: 0.15 },
};

export function applyArtStyle(s: StudioSettings, style: ArtStyle): void {
  s.artStyle = style;
  Object.assign(s, ART_STYLES[style]);
}

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
  let saved = false;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StudioSettings>;
      Object.assign(s, parsed);
      saved = 'shadowQuality' in parsed;
    }
  } catch {
    /* storage blocked or corrupt: use defaults */
  }
  // First run (or a save from before graphics settings existed): pick a tier for this device.
  if (!saved) applyQuality(s, detectQuality());
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

import * as THREE from 'three';
import { paintShared } from '../render/PaintMaterial';
import { skyUniforms, waterUniforms } from '../render/SkyWater';
import { clamp, damp, deg, lerp } from '../core/MathUtil';

/** One time-of-day look (docs/03 §5). Colours are display-space hex. */
interface LightPreset {
  hour: number;
  skyTop: string;
  skyHorizon: string;
  sunColor: string;
  sunElevation: number; // degrees
  shadowTint: string;
  fog: string;
  cloudLit: string;
  cloudShade: string;
  waterDeep: string;
  waterShallow: string;
  night: number;
}

export const TIME_PRESETS: { id: string; label: string; preset: LightPreset }[] = [
  { id: 'dawn', label: 'Dawn', preset: { hour: 5.75, skyTop: '#b9a9dc', skyHorizon: '#f6cdb2', sunColor: '#ffd9c8', sunElevation: 8, shadowTint: '#9c8fcf', fog: '#e9d6d6', cloudLit: '#fbe2d6', cloudShade: '#a99ad0', waterDeep: '#5aa9b8', waterShallow: '#a8d6d2', night: 0.2 } },
  { id: 'morning', label: 'Morning', preset: { hour: 9.5, skyTop: '#86bfe9', skyHorizon: '#f3efe0', sunColor: '#fff6e4', sunElevation: 32, shadowTint: '#8f93d6', fog: '#dfe9ef', cloudLit: '#fdfcf6', cloudShade: '#b6b6e0', waterDeep: '#2fb5b4', waterShallow: '#7fded3', night: 0 } },
  { id: 'noon', label: 'Noon', preset: { hour: 13, skyTop: '#62b7ea', skyHorizon: '#f5f7f2', sunColor: '#ffffff', sunElevation: 68, shadowTint: '#9aa2dc', fog: '#e6f0f4', cloudLit: '#ffffff', cloudShade: '#bcc3e6', waterDeep: '#23b2b6', waterShallow: '#83e4d8', night: 0 } },
  { id: 'golden', label: 'Golden', preset: { hour: 17, skyTop: '#e6b477', skyHorizon: '#f7d7a5', sunColor: '#ffc98a', sunElevation: 15, shadowTint: '#a07cc0', fog: '#f1d8b8', cloudLit: '#ffe2b8', cloudShade: '#c292b8', waterDeep: '#3b9fa6', waterShallow: '#c9d7a8', night: 0.05 } },
  { id: 'dusk', label: 'Dusk', preset: { hour: 19, skyTop: '#6e5aa8', skyHorizon: '#f19c8a', sunColor: '#f39ab0', sunElevation: 4, shadowTint: '#6f5ea8', fog: '#c9a2b8', cloudLit: '#f5b3a8', cloudShade: '#7a64a8', waterDeep: '#3c6f98', waterShallow: '#8c8fb8', night: 0.65 } },
  { id: 'night', label: 'Night', preset: { hour: 22.5, skyTop: '#1e2350', skyHorizon: '#3d5a86', sunColor: '#a9bce8', sunElevation: 40, shadowTint: '#3f4585', fog: '#34466e', cloudLit: '#5a6aa0', cloudShade: '#2a2f60', waterDeep: '#1d3f66', waterShallow: '#2f6480', night: 1 } },
  { id: 'deepnight', label: 'Deep night', preset: { hour: 3, skyTop: '#101433', skyHorizon: '#27365e', sunColor: '#8ea2d8', sunElevation: 30, shadowTint: '#333a78', fog: '#253455', cloudLit: '#3e4a80', cloudShade: '#1c2148', waterDeep: '#132c4c', waterShallow: '#1f4a66', night: 1 } },
];

export type WeatherId = 'clear' | 'rain';

interface LiveColours {
  skyTop: THREE.Color;
  skyHorizon: THREE.Color;
  sunColor: THREE.Color;
  shadowTint: THREE.Color;
  fog: THREE.Color;
  cloudLit: THREE.Color;
  cloudShade: THREE.Color;
  waterDeep: THREE.Color;
  waterShallow: THREE.Color;
}

/**
 * Time of day and weather. Presets blend over ~2 s; Auto runs a full day
 * in `dayMinutes` real minutes. Writes straight into the shared shader uniforms.
 */
export class Environment {
  readonly sun: THREE.DirectionalLight;
  readonly fogColor = new THREE.Color();
  hour = 9.5;
  auto = false;
  dayMinutes = 12;
  weather: WeatherId = 'clear';
  rain = 0;
  presetId = 'morning';

  private current: LiveColours;
  private target: LightPreset;
  private elevation: number;
  private night: number;
  private readonly sunDirWorld = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    this.target = TIME_PRESETS[1].preset;
    this.current = toLive(this.target);
    this.elevation = this.target.sunElevation;
    this.night = this.target.night;

    this.sun = new THREE.DirectionalLight(0xffffff, 1);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const cam = this.sun.shadow.camera;
    cam.left = cam.bottom = -70;
    cam.right = cam.top = 70;
    cam.near = 1;
    cam.far = 600;
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.04;
    scene.add(this.sun, this.sun.target);
  }

  setPreset(id: string): void {
    const p = TIME_PRESETS.find((t) => t.id === id);
    if (!p) return;
    this.presetId = id;
    this.auto = false;
    this.target = p.preset;
    this.hour = p.preset.hour;
  }

  setAuto(on: boolean): void {
    this.auto = on;
  }

  toggleRain(): void {
    this.weather = this.weather === 'rain' ? 'clear' : 'rain';
  }

  /** Name of the current time band shown on the clock (docs/01 §2). */
  bandLabel(): string {
    const h = this.hour;
    if (h >= 5 && h < 6.5) return 'DAWN';
    if (h >= 6.5 && h < 8) return 'EARLY';
    if (h >= 8 && h < 11) return 'MORNING';
    if (h >= 11 && h < 15) return 'NOON';
    if (h >= 15 && h < 18) return 'GOLDEN';
    if (h >= 18 && h < 20) return 'DUSK';
    if (h >= 20 || h < 2) return 'NIGHT';
    return 'DEEP NIGHT';
  }

  clockText(): string {
    const h = Math.floor(this.hour);
    const m = Math.floor((this.hour - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  get isNight(): boolean {
    return this.night > 0.5;
  }

  update(dt: number, focus: THREE.Vector3, camera: THREE.Camera, calm: boolean): void {
    if (this.auto) {
      this.hour = (this.hour + (24 / (this.dayMinutes * 60)) * dt) % 24;
      this.target = presetForHour(this.hour);
    }
    const k = damp(calm ? 0.6 : 1.6, dt);
    const t = this.target;
    const c = this.current;
    c.skyTop.lerp(tmp.set(t.skyTop), k);
    c.skyHorizon.lerp(tmp.set(t.skyHorizon), k);
    c.sunColor.lerp(tmp.set(t.sunColor), k);
    c.shadowTint.lerp(tmp.set(t.shadowTint), k);
    c.fog.lerp(tmp.set(t.fog), k);
    c.cloudLit.lerp(tmp.set(t.cloudLit), k);
    c.cloudShade.lerp(tmp.set(t.cloudShade), k);
    c.waterDeep.lerp(tmp.set(t.waterDeep), k);
    c.waterShallow.lerp(tmp.set(t.waterShallow), k);
    this.elevation = lerp(this.elevation, t.sunElevation, k);
    this.night = lerp(this.night, t.night, k);
    this.rain = lerp(this.rain, this.weather === 'rain' ? 1 : 0, damp(1.2, dt));

    // Sun direction: azimuth drifts with the hour so shadows swing through the day.
    const az = deg(55 + (this.hour - 12) * 10); // from behind-right in the morning, swinging right by evening
    const el = deg(clamp(this.elevation, 2, 85));
    this.sunDirWorld.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).normalize();

    // Rain greys the look down a little.
    const wetGrey = this.rain * 0.3;
    this.fogColor.copy(c.fog).lerp(tmp.set('#b8bfd0'), wetGrey);

    paintShared.uSunColor.value.copy(c.sunColor).lerp(tmp.set('#d8dce8'), wetGrey * 0.6);
    paintShared.uShadowTint.value.copy(c.shadowTint);
    paintShared.uSkyTint.value.copy(c.skyTop);
    paintShared.uNight.value = this.night;
    paintShared.uWet.value = this.rain;
    paintShared.uSunDir.value.copy(this.sunDirWorld).transformDirection(camera.matrixWorldInverse);

    skyUniforms.uTop.value.copy(c.skyTop).lerp(tmp.set('#9aa3b8'), wetGrey);
    skyUniforms.uHorizon.value.copy(c.skyHorizon).lerp(tmp.set('#c9cdd6'), wetGrey);
    skyUniforms.uSunDirWorld.value.copy(this.sunDirWorld);
    skyUniforms.uSunColor.value.copy(c.sunColor);
    skyUniforms.uCloudLit.value.copy(c.cloudLit);
    skyUniforms.uCloudShade.value.copy(c.cloudShade);
    skyUniforms.uNight.value = this.night;
    skyUniforms.uCloudCover.value = 0.5 + this.rain * 0.45;
    waterUniforms.uDeep.value.copy(c.waterDeep);
    waterUniforms.uShallow.value.copy(c.waterShallow);
    waterUniforms.uRain.value = this.rain;

    // The shadow camera follows the player.
    this.sun.position.copy(focus).addScaledVector(this.sunDirWorld, 250);
    this.sun.target.position.copy(focus);
    this.sun.target.updateMatrixWorld();
  }
}

const tmp = new THREE.Color();

function toLive(p: LightPreset): LiveColours {
  return {
    skyTop: new THREE.Color(p.skyTop),
    skyHorizon: new THREE.Color(p.skyHorizon),
    sunColor: new THREE.Color(p.sunColor),
    shadowTint: new THREE.Color(p.shadowTint),
    fog: new THREE.Color(p.fog),
    cloudLit: new THREE.Color(p.cloudLit),
    cloudShade: new THREE.Color(p.cloudShade),
    waterDeep: new THREE.Color(p.waterDeep),
    waterShallow: new THREE.Color(p.waterShallow),
  };
}

/** Choose the preset whose hour is closest (for Auto mode). */
function presetForHour(hour: number): LightPreset {
  let best = TIME_PRESETS[0].preset;
  let bestD = Infinity;
  for (const { preset } of TIME_PRESETS) {
    const d = Math.min(Math.abs(preset.hour - hour), 24 - Math.abs(preset.hour - hour));
    if (d < bestD) {
      bestD = d;
      best = preset;
    }
  }
  return best;
}

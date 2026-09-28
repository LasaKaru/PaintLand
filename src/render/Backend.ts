/**
 * Which renderer draws the game: WebGL 2 (the default) or WebGPU (a beta,
 * Settings → Graphics → Renderer). The choice applies on the next start. If
 * WebGPU fails to start or its device is lost, the game notes it and starts
 * with WebGL next time, so a bad driver can never lock a player out.
 */
import type * as THREE from 'three';
import type { RenderPipeline } from './PaintPipeline';
import type { StudioSettings } from './StudioSettings';

export type RendererChoice = 'webgl' | 'webgpu';

/** The part of a renderer the game uses (WebGLRenderer has it; render/gpu wraps WebGPURenderer). */
export interface GameRenderer {
  readonly domElement: HTMLCanvasElement;
  outputColorSpace: string;
  readonly shadowMap: { enabled: boolean; type: THREE.ShadowMapType };
  readonly info: { autoReset: boolean; reset(): void; readonly render: { readonly calls: number; readonly triangles: number } };
  setSize(width: number, height: number, updateStyle?: boolean): void;
  setPixelRatio(ratio: number): void;
  compile(scene: THREE.Object3D, camera: THREE.Camera): unknown;
}

/** A started WebGPU renderer (render/gpu/index.ts), handed to the game. */
export interface GpuKit {
  readonly renderer: GameRenderer;
  pipeline(settings: StudioSettings): RenderPipeline;
  /** The light whose shadow the painted materials receive. */
  setSun(light: THREE.DirectionalLight): void;
  /** Called when WebGPU stops working (device lost, or errors while starting). */
  onFailure: ((reason: string) => void) | null;
}

const KEY = 'inkroads.renderer';
const FAILED = 'inkroads.renderer.failed';

/** True while the WebGPU renderer is the one drawing (set once, before the game is built). */
export const backend = { gpu: false };

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* private mode: the choice lasts this session only */
  }
}

/** The player's choice (`?renderer=webgpu` in the address overrides it for testing). */
export function rendererChoice(): RendererChoice {
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('renderer') : null;
  if (q === 'webgpu' || q === 'webgl') return q;
  return read(KEY) === 'webgpu' ? 'webgpu' : 'webgl';
}

export function setRendererChoice(choice: RendererChoice): void {
  write(KEY, choice);
  if (choice === 'webgpu') write(FAILED, null);
}

/** Why WebGPU was switched off last time, if it was. */
export function gpuFailure(): string | null {
  return read(FAILED);
}

/** WebGPU failed: remember why and go back to WebGL for the next start. */
export function markGpuFailed(reason: string): void {
  write(FAILED, reason.slice(0, 200));
  write(KEY, 'webgl');
}

/** Restart with WebGL (dropping a `?renderer=webgpu` override, which would start WebGPU again). */
export function restartWithWebGL(): void {
  const url = new URL(location.href);
  url.searchParams.delete('renderer');
  location.replace(url.toString());
}

/** Whether this browser offers WebGPU at all (the Settings screen greys the option out otherwise). */
export function webgpuAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator && typeof window !== 'undefined' && window.isSecureContext;
}

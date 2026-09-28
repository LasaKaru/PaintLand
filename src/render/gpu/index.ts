import * as THREE from 'three/webgpu';
import type { GameRenderer, GpuKit } from '../Backend';
import type { StudioSettings } from '../StudioSettings';
import { PaintNodeMaterial, setSunLight } from './PaintNode';
import { ParticleNodeMaterial } from './ParticleNode';
import { PipelineGPU } from './PipelineGPU';
import { GalaxyNodeMaterial, SeaNodeMaterial, SkyNodeMaterial } from './SkyNodes';

/**
 * Start the WebGPU renderer (the beta; see render/Backend.ts). Loaded only when
 * the player chose it, so the WebGL game never downloads this code.
 */
export async function startWebGPU(): Promise<GpuKit> {
  installCompat();
  const r = new THREE.WebGPURenderer({ antialias: false, powerPreference: 'high-performance' });
  await r.init();
  if (!(r.backend as unknown as { isWebGPUBackend?: boolean }).isWebGPUBackend) {
    r.dispose();
    throw new Error('WebGPU is not available here');
  }
  // The game's materials stay what they are; the renderer builds these node twins from them.
  const lib = r.library as unknown as { addMaterial(cls: unknown, type: string): void };
  lib.addMaterial(PaintNodeMaterial, 'PaintMaterial');
  lib.addMaterial(SkyNodeMaterial, 'InkSky');
  lib.addMaterial(SeaNodeMaterial, 'InkSea');
  lib.addMaterial(GalaxyNodeMaterial, 'InkGalaxy');
  lib.addMaterial(ParticleNodeMaterial, 'InkParticles');
  r.setMRT(null);

  const kit: GpuKit = {
    renderer: wrap(r),
    pipeline: (settings: StudioSettings) => {
      const p = new PipelineGPU(r, settings);
      // Test harness (tools, CI): draw into a target and copy it to a 2D canvas on request.
      if (new URLSearchParams(location.search).has('gpuOffscreen')) {
        p.offscreen = new THREE.RenderTarget(2, 2);
        (window as unknown as { __gpuSnapshot?: () => Promise<string> }).__gpuSnapshot = () => snapshot(r, p.offscreen!);
      }
      return p;
    },
    setSun: (light) => setSunLight(light as unknown as THREE.DirectionalLight),
    onFailure: null,
  };
  const started = performance.now();
  r.onDeviceLost = (info: { message?: string }) => kit.onFailure?.(`WebGPU device lost: ${info?.message ?? 'unknown'}`);
  const device = (r.backend as unknown as { device?: EventTarget }).device;
  device?.addEventListener('uncapturederror', (e: Event) => {
    // Shader or pipeline errors while starting mean this GPU can't draw the game: fall back.
    const message = (e as Event & { error?: { message?: string } }).error?.message ?? 'unknown';
    if (performance.now() - started < 60_000) kit.onFailure?.(`WebGPU error: ${message.slice(0, 160)}`);
  });
  return kit;
}

/** The game's renderer interface over WebGPURenderer. */
function wrap(r: THREE.WebGPURenderer): GameRenderer {
  const info = r.info as unknown as { autoReset: boolean; reset(): void; render: { drawCalls: number; triangles: number } };
  return {
    get domElement() {
      return r.domElement;
    },
    get outputColorSpace() {
      return r.outputColorSpace;
    },
    set outputColorSpace(v: string) {
      r.outputColorSpace = v as THREE.ColorSpace;
    },
    shadowMap: r.shadowMap,
    info: {
      get autoReset() {
        return info.autoReset;
      },
      set autoReset(v: boolean) {
        info.autoReset = v;
      },
      reset: () => info.reset(),
      render: {
        get calls() {
          return info.render.drawCalls;
        },
        get triangles() {
          return info.render.triangles;
        },
      },
    },
    setSize: (w, h, style) => r.setSize(w, h, style),
    setPixelRatio: (ratio) => r.setPixelRatio(ratio),
    // Warm-up compiling needs the G-buffer bound; WebGPU builds pipelines asynchronously anyway.
    compile: () => undefined,
  };
}

/** Read the offscreen image back (test harness). */
async function snapshot(r: THREE.WebGPURenderer, rt: THREE.RenderTarget): Promise<string> {
  const w = rt.width;
  const h = rt.height;
  const px = (await r.readRenderTargetPixelsAsync(rt, 0, 0, w, h)) as Uint8Array;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const rowBytes = w * 4;
  const data = new Uint8ClampedArray(w * h * 4);
  // Rows may be padded to 256 bytes in the read-back buffer.
  const stride = Math.ceil(rowBytes / 256) * 256;
  for (let y = 0; y < h; y++) data.set(px.subarray(y * stride, y * stride + rowBytes), y * rowBytes);
  c.getContext('2d')!.putImageData(new ImageData(data, w, h), 0, 0);
  return c.toDataURL('image/png');
}

let compatDone = false;
/**
 * Some Chromium builds (141 among them) implement an older draft of texture
 * view swizzles and reject three's `swizzle: 'rgba'`. That value is the
 * default, so leaving it out changes nothing.
 */
type ViewDescriptor = Record<string, unknown> & { swizzle?: string };
function installCompat(): void {
  const Texture = (globalThis as { GPUTexture?: { prototype: { createView(d?: ViewDescriptor): unknown } } }).GPUTexture;
  if (compatDone || !Texture) return;
  compatDone = true;
  const proto = Texture.prototype;
  const createView = proto.createView;
  proto.createView = function (this: unknown, d?: ViewDescriptor) {
    if (d && d.swizzle === 'rgba') {
      const rest = { ...d };
      delete rest.swizzle;
      return createView.call(this, rest);
    }
    return createView.call(this, d);
  };
}

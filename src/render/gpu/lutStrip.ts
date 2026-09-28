import * as THREE from 'three';

/**
 * A LUT as a 2D strip (the blue slices side by side, size² × size), sampled
 * with the slices blended in WGSL. Same result as the 3D texture, and it keeps
 * to the plain 2D texture path.
 */
const strips = new WeakMap<THREE.Data3DTexture, THREE.DataTexture>();
export function lutStrip(t: THREE.Data3DTexture): THREE.DataTexture {
  let strip = strips.get(t);
  if (!strip) {
    const n = t.image.width;
    const src = t.image.data as Uint8Array;
    const out = new Uint8Array(n * n * n * 4);
    for (let z = 0; z < n; z++)
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) out.set(src.subarray(((z * n + y) * n + x) * 4, ((z * n + y) * n + x) * 4 + 4), (y * n * n + z * n + x) * 4);
    strip = new THREE.DataTexture(out, n * n, n);
    strip.minFilter = strip.magFilter = THREE.LinearFilter;
    strip.needsUpdate = true;
    strips.set(t, strip);
  }
  return strip;
}

import * as THREE from 'three/webgpu';
import { paintUniforms } from './PaintNode';
import { NOISE, T, fn, gbufferMrt, type N } from './wgsl';
import { PARTICLE, PARTICLE_LIB } from './skyWgsl';

let particleFn: N = null;
let normalFn: N = null;

/**
 * Particles as camera-facing quads (WebGPU draws points one pixel wide). The
 * geometry is a unit quad instanced once per particle (render/Particles.ts
 * builds it in WebGPU mode); a quad is as wide as the GLSL point sprite.
 */
export class ParticleNodeMaterial extends THREE.NodeMaterial {
  static override get type(): string {
    return 'ParticleNodeMaterial';
  }

  override setup(builder: THREE.NodeBuilder): unknown {
    this.lights = false;
    this.fog = false;
    particleFn ??= fn(PARTICLE, [NOISE, PARTICLE_LIB]);
    normalFn ??= fn(/* wgsl */ `fn ink_particleN(corner: vec2f) -> vec3f { return ink_particleNormal(corner); }`, [PARTICLE_LIB]);
    const s = paintUniforms();
    const corner = T.positionGeometry.xy;
    const size = T.attribute('size', 'float');
    const mv = T.modelViewMatrix.mul(T.vec4(T.attribute('ipos', 'vec3'), 1));
    this.vertexNode = T.cameraProjectionMatrix.mul(T.vec4(mv.xyz.add(T.vec3(corner.mul(size.mul(0.5)), 0)), 1));
    const col = particleFn({
      corner, colour: T.attribute('pcolor', 'vec4'), fade: T.attribute('fade', 'float'), frag: T.screenCoordinate,
      sunDir: s.sunDir, sunColor: s.sunColor, skyTint: s.skyTint, realism: s.realism,
    });
    this.outputNode = col;
    this.mrtNode = gbufferMrt(builder, { output: col, gnormal: T.vec4(normalFn({ corner }).mul(0.5).add(0.5), 0.777) });
    return super.setup(builder);
  }
}

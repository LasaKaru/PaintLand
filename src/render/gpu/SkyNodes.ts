import * as THREE from 'three/webgpu';
import { galaxyUniforms, skyUniforms, waterUniforms } from '../SkyWater';
import { FBM5, NOISE, T, fn, frameUniform, gbufferMrt, type N } from './wgsl';
import { GALAXY, GALAXY_LIB, SEA, SEA_LIB, SKY } from './skyWgsl';

const track = frameUniform;

/** No surface normal (the ink pass treats these as sky) and no object id. */
const SKY_NORMAL = (): N => T.vec4(0.5, 0.5, 0.5, 0);

let skyFn: N = null;
let seaFn: N = null;
let galaxyFn: N = null;

/** The painted sky dome (createSky). */
export class SkyNodeMaterial extends THREE.NodeMaterial {
  static override get type(): string {
    return 'SkyNodeMaterial';
  }

  override setup(builder: THREE.NodeBuilder): unknown {
    this.lights = false;
    this.fog = false;
    skyFn ??= fn(SKY, [NOISE, FBM5]);
    const u = skyUniforms;
    const dir = T.positionWorld.sub(T.cameraPosition);
    const col = skyFn({
      dir, top: track(u.uTop, 'color'), horizon: track(u.uHorizon, 'color'), sunDirW: track(u.uSunDirWorld), sunColor: track(u.uSunColor, 'color'),
      cloudLit: track(u.uCloudLit, 'color'), cloudShade: track(u.uCloudShade, 'color'), night: track(u.uNight), time: track(u.uTime),
      cloudCover: track(u.uCloudCover), realism: track(u.uRealism), flash: track(u.uFlash),
    });
    this.outputNode = col;
    this.mrtNode = gbufferMrt(builder, { output: col, gnormal: SKY_NORMAL() });
    return super.setup(builder);
  }
}

/** The painted sea (createWater). */
export class SeaNodeMaterial extends THREE.NodeMaterial {
  static override get type(): string {
    return 'SeaNodeMaterial';
  }

  override setup(builder: THREE.NodeBuilder): unknown {
    this.lights = false;
    this.fog = false;
    seaFn ??= fn(SEA, [NOISE, FBM5, SEA_LIB]);
    const u = waterUniforms;
    const col = seaFn({
      world: T.positionWorld, camPos: T.cameraPosition, deep: track(u.uDeep, 'color'), shallow: track(u.uShallow, 'color'), foam: track(u.uFoam, 'color'),
      sunDirW: track(u.uSunDirWorld), sunColor: track(u.uSunColor, 'color'), time: track(u.uTime), night: track(u.uNight), rain: track(u.uRain),
      realism: track(u.uRealism), top: track(u.uTop, 'color'), horizon: track(u.uHorizon, 'color'),
    });
    const up = T.cameraViewMatrix.mul(T.vec4(0, 1, 0, 0)).xyz.normalize();
    this.outputNode = col;
    this.mrtNode = gbufferMrt(builder, { output: col, gnormal: T.vec4(up.mul(0.5).add(0.5), 0.013) });
    return super.setup(builder);
  }
}

/** The World's End sky (createGalaxySky). */
export class GalaxyNodeMaterial extends THREE.NodeMaterial {
  static override get type(): string {
    return 'GalaxyNodeMaterial';
  }

  override setup(builder: THREE.NodeBuilder): unknown {
    this.lights = false;
    this.fog = false;
    galaxyFn ??= fn(GALAXY, [NOISE, FBM5, GALAXY_LIB]);
    const col = galaxyFn({ dir: T.positionWorld.sub(T.cameraPosition), time: track(galaxyUniforms.uTime) });
    this.outputNode = col;
    this.mrtNode = gbufferMrt(builder, { output: col, gnormal: SKY_NORMAL() });
    return super.setup(builder);
  }
}

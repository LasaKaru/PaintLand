import * as THREE from 'three';
import { ModelKit } from '../models/ModelKit';
import { PaintMaterial } from '../render/PaintMaterial';
import { brand, logoPool, pickLogo, type BrandLogo } from './Brand';
import { paintCta, paintedLogo } from './Watercolour';
import { analytics } from '../net/Analytics';

export type BoardStyle = 'billboard' | 'banner';

/** Where a board stands: position, and the direction its face looks (a yaw, or a full basis for tilted roads). */
export interface BoardSpot {
  x: number;
  y?: number;
  z: number;
  yaw?: number;
  basis?: THREE.Matrix4;
  style?: BoardStyle;
  scale?: number;
}

interface Board {
  root: THREE.Object3D;
  faces: THREE.Mesh[];
  centre: THREE.Vector3;
  logo: BrandLogo | null;
  seen: number;
  key: string;
  size: [number, number];
}

const TEX_SIZE: Record<BoardStyle | 'blimp', [number, number]> = { billboard: [512, 256], banner: [512, 192], blimp: [1024, 256] };
const textures = new Map<string, Promise<THREE.Texture | null>>();

/** A watercolour texture for a logo at a board size (shared between boards). */
function textureFor(logo: BrandLogo, style: BoardStyle | 'blimp'): Promise<THREE.Texture | null> {
  const [w, h] = TEX_SIZE[style];
  const key = `${logo.id}|${logo.image}|${style}`;
  let p = textures.get(key);
  if (!p) {
    const canvas =
      logo.kind === 'cta'
        ? document.fonts.load('40px "Permanent Marker"').catch(() => null).then(() => paintCta('Your brand here', logo.name, { width: w, height: h, seed: 3 }))
        : paintedLogo(logo.image, w, h);
    p = canvas.then((c) => {
      if (!c) return null;
      const t = new THREE.CanvasTexture(c);
      t.anisotropy = 4;
      t.generateMipmaps = true;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      return t;
    });
    textures.set(key, p);
  }
  return p;
}

/** Drop cached textures (after the admin changes logos). */
export function resetBrandTextures(): void {
  textures.clear();
}

const _v = new THREE.Vector3();

/**
 * Sponsor and company boards in the painted world (docs/12 §9 live service):
 * wooden billboards and festival banners showing watercolour versions of the
 * company logo, sponsor logos, or an "advertise here" card, picked at random
 * with the weights set in the admin panel. Counts a view when a board is on
 * screen and close for a moment, and lets players on foot visit the sponsor.
 */
export class BrandBoards {
  readonly group = new THREE.Group();
  private readonly boards: Board[] = [];
  private readonly frameMaterial = new PaintMaterial({ vertexColors: true, flat: true });
  private blimp: { root: THREE.Object3D; banner: Board; radius: number; height: number; cx: number; cz: number; speed: number } | null = null;
  private refreshId = 0;

  constructor(readonly area: string, spots: BoardSpot[], private readonly seed = 1) {
    this.group.name = `brand:${area}`;
    spots.forEach((spot, i) => this.addBoard(spot, i));
  }

  private addBoard(spot: BoardSpot, i: number): void {
    const style = spot.style ?? 'billboard';
    const s = spot.scale ?? 1;
    const [w, h] = style === 'billboard' ? [5.2 * s, 2.6 * s] : [4.4 * s, 1.65 * s];
    const lift = style === 'billboard' ? 2.6 * s : 2.2 * s;
    const kit = new ModelKit();
    if (style === 'billboard') {
      for (const sx of [-1, 1]) kit.cylinder(0.12 * s, 0.14 * s, lift + h, 6, '#7a5a3a', { position: [sx * w * 0.36, (lift + h) / 2, 0] });
      kit.box(w + 0.35 * s, h + 0.35 * s, 0.16, '#9a6a3a', { position: [0, lift + h / 2, 0] });
      kit.box(w + 0.5 * s, 0.14 * s, 0.4, '#f4d23b', { position: [0, lift + h + 0.24 * s, 0], nightGlow: 1 });
    } else {
      for (const sx of [-1, 1]) {
        kit.cylinder(0.07 * s, 0.08 * s, lift + h + 0.8 * s, 6, '#f6f0e4', { position: [sx * (w / 2 + 0.12), (lift + h + 0.8 * s) / 2, 0] });
        kit.cylinder(0.01, 0.22 * s, 0.5 * s, 3, ['#d8463a', '#f4a13b'][i % 2], { position: [sx * (w / 2 + 0.12), lift + h + 1.0 * s, 0], rotation: [0, 0, Math.PI] });
      }
      kit.box(w + 0.3, 0.08, 0.08, '#7a5a3a', { position: [0, lift + h + 0.02, 0] });
    }
    const root = new THREE.Group();
    const frame = new THREE.Mesh(kit.build(0.01, i), this.frameMaterial);
    frame.castShadow = true;
    root.add(frame);
    const faces: THREE.Mesh[] = [];
    for (const side of [1, -1]) {
      const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.frameMaterial);
      face.position.set(0, lift + h / 2, side * 0.09);
      if (side < 0) face.rotation.y = Math.PI;
      face.visible = false;
      root.add(face);
      faces.push(face);
    }
    if (spot.basis) {
      root.quaternion.setFromRotationMatrix(spot.basis);
      root.position.set(spot.x, spot.y ?? 0, spot.z);
    } else {
      root.position.set(spot.x, spot.y ?? 0, spot.z);
      root.rotation.y = spot.yaw ?? 0;
    }
    this.group.add(root);
    root.updateMatrixWorld(true);
    this.boards.push({ root, faces, centre: new THREE.Vector3(0, lift + h / 2, 0), logo: null, seen: 0, key: `${this.area}:${i}`, size: [w, h] });
  }

  /** A paper blimp towing a long banner in slow circles (good for the company logo). */
  addBlimp(cx: number, cz: number, radius: number, height: number): void {
    const k = new ModelKit();
    k.blob(1, '#f6f0e4', { scale: [3.2, 3.2, 9], detail: 2, roughness: 0.03 });
    for (let i = 0; i < 6; i++) k.box(0.05, 6.2, 0.4, i % 2 ? '#d8463a' : '#f4d23b', { position: [Math.sin((i / 6) * Math.PI * 2) * 3.1, 0, Math.cos((i / 6) * Math.PI * 2) * 0.2 - 2 + i * 0.8], rotation: [0, (i / 6) * Math.PI * 2, 0] });
    for (const r of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) k.box(0.15, 2.6, 2.6, '#2f8f86', { position: [Math.sin(r) * 1.6, Math.cos(r) * 1.6, 8], rotation: [0, 0, r] });
    k.box(1.4, 0.9, 2.6, '#9a6a3a', { position: [0, -3.4, 0] });
    for (let i = 0; i < 4; i++) k.box(0.3, 0.3, 0.05, '#ffe08a', { position: [0.72, -3.3, -0.9 + i * 0.6], nightGlow: 1 });
    const root = new THREE.Group();
    root.add(new THREE.Mesh(k.build(0.02, 5), this.frameMaterial));
    // The banner hangs on a line behind the tail.
    const bw = 22;
    const bh = 5.5;
    const faces: THREE.Mesh[] = [];
    for (const side of [1, -1]) {
      const face = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), this.frameMaterial);
      face.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      face.position.set(side * 0.05, -1.5, 22);
      face.visible = false;
      root.add(face);
      faces.push(face);
    }
    const line = new ModelKit().box(0.05, 0.05, 11, '#2b2622', { position: [0, -0.8, 14] }).build(0);
    root.add(new THREE.Mesh(line, this.frameMaterial));
    this.group.add(root);
    const banner: Board = { root, faces, centre: new THREE.Vector3(0, -1.5, 22), logo: null, seen: 0, key: `${this.area}:blimp`, size: [bw, bh] };
    this.blimp = { root, banner, radius, height, cx, cz, speed: 0.022 };
  }

  /** Pick logos for every board and paint them (call again when branding changes). */
  async refresh(): Promise<void> {
    const id = ++this.refreshId;
    const pool = logoPool(brand());
    let seed = this.seed * 9301 + 49297;
    const rand = (): number => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const jobs: Promise<void>[] = [];
    const assign = (b: Board, style: BoardStyle | 'blimp', logo: BrandLogo | null): void => {
      b.logo = logo;
      b.seen = 0;
      for (const f of b.faces) f.visible = false;
      if (!logo) return;
      jobs.push(
        textureFor(logo, style).then((tex) => {
          if (id !== this.refreshId || !tex) return;
          const mat = new PaintMaterial({ map: tex, gloss: 0.05 });
          for (const f of b.faces) {
            f.material = mat;
            f.visible = true;
          }
        }),
      );
    };
    for (const b of this.boards) assign(b, b.size[1] / b.size[0] < 0.45 ? 'banner' : 'billboard', pickLogo(pool, rand()));
    if (this.blimp) {
      // The blimp flies the company banner when there is one.
      const company = pool.find((l) => l.kind === 'company');
      assign(this.blimp.banner, 'blimp', company ?? pickLogo(pool, rand()));
    }
    await Promise.all(jobs);
  }

  /** Blimp flight and on-screen view counting. */
  update(dt: number, time: number, camera: THREE.Camera, player: THREE.Vector3): void {
    if (!this.group.visible) return;
    if (this.blimp) {
      const b = this.blimp;
      const a = time * b.speed;
      b.root.position.set(b.cx + Math.cos(a) * b.radius, b.height + Math.sin(time * 0.3) * 2, b.cz + Math.sin(a) * b.radius);
      // Nose along the circle's tangent.
      b.root.rotation.set(0, Math.atan2(Math.sin(a), -Math.cos(a)), Math.sin(time * 0.5) * 0.04);
      b.root.updateMatrixWorld(true);
    }
    const all = this.blimp ? [...this.boards, this.blimp.banner] : this.boards;
    for (const b of all) {
      if (!b.logo || b.logo.kind === 'cta') continue;
      const p = _v.copy(b.centre).applyMatrix4(b.root.matrixWorld);
      const far = b === this.blimp?.banner ? 260 : 70;
      if (p.distanceTo(player) > far) {
        b.seen = 0;
        continue;
      }
      p.project(camera);
      if (p.z > 1 || Math.abs(p.x) > 0.9 || Math.abs(p.y) > 0.9) {
        b.seen = 0;
        continue;
      }
      b.seen += dt;
      if (b.seen > 1.2) analytics.view(b.key, b.logo.id);
    }
  }

  /** The closest board within reach of the player (for "visit the sponsor"). */
  nearest(player: THREE.Vector3, reach = 7): BrandLogo | null {
    let best: BrandLogo | null = null;
    let bestD = reach;
    for (const b of this.boards) {
      if (!b.logo?.url) continue;
      const d = Math.hypot(b.root.position.x - player.x, b.root.position.z - player.z);
      if (d < bestD) {
        bestD = d;
        best = b.logo;
      }
    }
    return best;
  }

  get count(): number {
    return this.boards.length + (this.blimp ? 1 : 0);
  }

  dispose(): void {
    this.group.removeFromParent();
  }
}

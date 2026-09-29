import { addLeisure, leisureLabel } from './Leisure';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { MuralBoard } from './Murals';
import type { PlacedPocket } from './Pockets';
import { Random } from '../core/Random';
import { ModelKit, Pattern } from '../models/ModelKit';
import { PaintMaterial } from '../render/PaintMaterial';
import { buildLamp } from '../models/Props';
import { buildCypress, buildFloatingRock, buildHill, buildRoundTree } from '../models/Nature';
import { buildPeak } from '../models/LandmarksWorld';
import { buildWaterfall } from '../models/LandmarksPostcards';
import { HumanModel } from '../models/Human';
import { personOf } from './Peoples';
import { FreeWorld } from '../gameplay/FreeRoam';
import { t, type StringKey } from '../core/i18n';
import type { MapInfo } from '../ui/MapView';
import { AREA_Y, type AreaZone, type Chest, type FreeRoamArea, type Place, type Secret, type StuntJump } from './FreeRoamArea';

const INK = '#2b2622';

/** The south edge of the island: past it there is only sky. */
export const EDGE_Z = 96;

/**
 * World's End: the last page of the sketchbook, a calm floating island under
 * the Milky Way. No traffic, no missions, no shops — a lake that mirrors the
 * mountains, a flower meadow with fireflies, a forest path lit by lanterns, a
 * river that pours off the edge into the stars, and benches at the best
 * views. Sit on one and the camera slowly takes it all in.
 */
export class WorldsEnd implements FreeRoamArea {
  readonly id = 'worldsend';
  readonly secrets: Secret[] = [
    { id: 'we-edge', x: -92, z: 90, y: 0, hint: 'At the far west end of the edge' },
    { id: 'we-forest', x: -96, z: -92, y: 0, hint: 'Deep in the north-west woods' },
    { id: 'we-meadow', x: 100, z: -80, y: 0, hint: 'Where the meadow meets the mountains' },
  ];
  readonly chests: Chest[] = [
    { id: 'we-c1', x: 20, z: -40, tier: 1 },
    { id: 'we-c2', x: -20, z: 70, tier: 2 },
  ];
  readonly stunts: StuntJump[] = [];
  readonly places: Place[] = [
    { id: 'we-edge', name: 'the edge of the world', x: 0, z: 88 },
    { id: 'we-lake', name: 'Mirror Lake', x: -50, z: -20 },
    { id: 'we-meadow', name: 'the Milky Way meadow', x: 70, z: -30 },
    { id: 'we-falls', name: 'the last waterfall', x: 60, z: 90 },
    { id: 'we-forest', name: 'the lantern woods', x: -80, z: -60 },
  ];
  readonly group = new THREE.Group();
  readonly world: FreeWorld;
  readonly murals: MuralBoard[] = [];
  readonly pockets: PlacedPocket[] = [];
  readonly zones: AreaZone[] = [];
  readonly spawn = { x: -96, z: 4, heading: -Math.PI / 2 };
  private readonly labels: HTMLDivElement[] = [];
  private labelLang = '';
  private readonly zoneRings: THREE.Mesh[] = [];
  private readonly parts: THREE.BufferGeometry[] = [];
  private readonly nm = new THREE.Matrix3();
  private readonly rnd = new Random(20260927);
  private readonly material = new PaintMaterial({ vertexColors: true, flat: true });
  private readonly v = new THREE.Vector3();
  private readonly drifting: { mesh: THREE.Mesh; base: THREE.Vector3; phase: number }[] = [];
  private readonly gazers: { model: HumanModel; pose: 'sitdown' | 'idle' }[] = [];

  constructor(private readonly labelLayer: HTMLElement) {
    this.group.name = 'worldsend';
    this.group.position.y = AREA_Y;
    this.world = new FreeWorld({ minX: -110, maxX: 110, minZ: -110, maxZ: EDGE_Z - 2 });
    this.buildIsland();
    this.buildPaths();
    this.buildLake();
    this.buildForest();
    this.buildMeadow();
    this.buildEdge();
    this.buildMountains();
    this.buildZones();
    this.flush();
    this.buildDrifters();
    this.buildGazers();
    this.group.visible = false;
  }

  private put(geometry: THREE.BufferGeometry, x: number, z: number, yaw = 0, y = 0, scale = 1): void {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(_up, yaw), new THREE.Vector3(scale, scale, scale));
    const g = geometry.clone().applyMatrix4(m);
    const sn = g.getAttribute('smoothNormal') as THREE.BufferAttribute | undefined;
    if (sn) sn.applyNormalMatrix(this.nm.getNormalMatrix(m));
    this.parts.push(g);
  }

  private flush(): void {
    const buckets = new Map<string, THREE.BufferGeometry[]>();
    for (const g of this.parts) {
      g.computeBoundingSphere();
      const c = g.boundingSphere!.center;
      const key = `${Math.floor(c.x / 80)},${Math.floor(c.z / 80)}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(g);
    }
    for (const list of buckets.values()) {
      const merged = mergeGeometries(list, false);
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, this.material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      for (const g of list) g.dispose();
    }
    this.parts.length = 0;
  }

  /** The island: a meadow on top, and a great rock tapering into the void below. */
  private buildIsland(): void {
    const k = new ModelKit();
    k.box(236, 4, 214, '#7fb06a', { position: [0, -2.02, -9], pattern: Pattern.Grass });
    // The underside: layers of rock narrowing downward (seen from the edge).
    const layers = [
      [128, 112, 14, '#8a8398'],
      [112, 86, 22, '#77708a'],
      [86, 52, 30, '#655f7a'],
      [52, 14, 40, '#554f6a'],
    ] as const;
    let y = -4;
    for (const [top, bottom, h, colour] of layers) {
      k.cylinder(top, bottom, h, 14, colour, { position: [0, y - h / 2, -9], pattern: Pattern.Stone });
      y -= h;
    }
    this.put(k.build(0.3), 0, 0);
  }

  /** A stone path from the road sign to the edge, round the lake and into the meadow, lit by lanterns. */
  private buildPaths(): void {
    const k = new ModelKit();
    const seg = (x1: number, z1: number, x2: number, z2: number, w = 5): void => {
      const len = Math.hypot(x2 - x1, z2 - z1);
      k.box(w, 0.06, len, '#c9bfae', { position: [(x1 + x2) / 2, 0.02, (z1 + z2) / 2], rotation: [0, Math.atan2(x2 - x1, z2 - z1), 0], pattern: Pattern.Stone });
    };
    seg(-110, 0, -20, 0);
    seg(-20, 0, 0, 84);
    seg(-20, 0, 60, -20);
    seg(60, -20, 70, -60);
    seg(0, 84, 60, 84);
    seg(-20, 0, -80, -60);
    this.put(k.build(0), 0, 0);
    const lamp = buildLamp(this.rnd);
    for (const [x, z] of [[-90, 4], [-60, 4], [-35, 4], [-14, 24], [-8, 50], [-3, 72], [10, -6], [35, -14], [64, -40], [-40, -24], [-62, -44], [20, 88], [44, 88]] as const) {
      this.put(lamp, x, z);
      this.world.circle(x, z, 0.35);
    }
  }

  private buildLake(): void {
    const k = new ModelKit();
    k.cylinder(26, 25, 0.5, 40, '#c9b89a', { position: [0, -0.2, 0], pattern: Pattern.Stone });
    k.cylinder(23, 23, 0.4, 40, '#3b5f9a', { position: [0, 0.02, 0], pattern: Pattern.Glass, nightGlow: 0.15 });
    this.put(k.build(0), -50, -24);
    this.world.circle(-50, -24, 22);
    // Reeds and stones on the shore.
    const rnd = this.rnd;
    const reed = new ModelKit().cylinder(0.05, 0.08, 1.6, 4, '#6f8a4a', { position: [0, 0.8, 0] }).blob(0.12, '#7a5a3a', { position: [0, 1.6, 0], scale: [1, 2, 1], detail: 0 }).build(0.01);
    for (let i = 0; i < 40; i++) {
      const a = rnd.range(0, Math.PI * 2);
      const r = rnd.range(22.5, 24.5);
      this.put(reed, -50 + Math.cos(a) * r, -24 + Math.sin(a) * r, rnd.range(0, 3));
    }
  }

  /** Pines and round trees in the north-west woods, and a few everywhere else. */
  private buildForest(): void {
    const rnd = this.rnd;
    const pines = [0, 1, 2].map((i) => buildCypress(rnd.fork(i)));
    const rounds = [0, 1].map((i) => buildRoundTree(rnd.fork(i + 10), null));
    const clear = (x: number, z: number): boolean => {
      if (Math.hypot(x + 50, z + 24) < 30) return false; // the lake
      if (Math.abs(z) < 7 && x < -18) return false; // the path west
      if (z > EDGE_Z - 16) return false; // the edge
      if (x > 35 && z < 0 && z > -80) return false; // the meadow
      if (Math.hypot(x - this.spawn.x, z - this.spawn.z) < 10) return false;
      // Keep secrets, chests and the rings clear.
      if ([...this.secrets, ...this.chests].some((p) => Math.hypot(x - p.x, z - p.z) < 4)) return false;
      if (Math.hypot(x + 70, z - 30) < 9) return false;
      return true;
    };
    for (let i = 0; i < 170; i++) {
      const woods = i < 110;
      const x = woods ? rnd.range(-108, -10) : rnd.range(-105, 105);
      const z = woods ? rnd.range(-108, -30) : rnd.range(-108, EDGE_Z - 20);
      if (!clear(x, z) || this.world.resolve({ x, z }, 1.5)) continue;
      this.put(rnd.pick(woods ? pines : [...pines, ...rounds]), x, z, rnd.range(0, 6), 0, rnd.range(0.9, 1.5));
      this.world.circle(x, z, 0.8);
    }
  }

  /** The meadow: wildflowers, and a painted telescope pointed at the Milky Way. */
  private buildMeadow(): void {
    const rnd = this.rnd;
    // Wildflower patches: little clusters of painted blooms on stalks.
    const flowers = [['#e8559a', '#f4d23b'], ['#9a5bd6', '#f6f0e4'], ['#3e86c9', '#f08a2e']].map(([a, b], i) => {
      const k = new ModelKit();
      const r = rnd.fork(i + 20);
      for (let j = 0; j < 9; j++) {
        const x = r.range(-1.2, 1.2);
        const z = r.range(-1.2, 1.2);
        const h = r.range(0.35, 0.8);
        k.cylinder(0.03, 0.03, h, 4, '#5f8a3a', { position: [x, h / 2, z] });
        k.blob(r.range(0.12, 0.2), j % 3 ? a : b, { position: [x, h, z], scale: [1, 0.6, 1], detail: 0, seed: j });
      }
      k.blob(0.9, '#6f9a4a', { position: [0, 0.05, 0], scale: [1.4, 0.2, 1.4], detail: 0, pattern: Pattern.Grass });
      return k.build(0.01);
    });
    for (let i = 0; i < 90; i++) {
      const x = rnd.range(40, 105);
      const z = rnd.range(-78, -4);
      if (Math.hypot(x - 70, z + 20) < 5) continue;
      this.put(rnd.pick(flowers), x, z, rnd.range(0, 6), 0, rnd.range(0.7, 1.2));
    }
    const scope = new ModelKit()
      .cylinder(0.08, 0.08, 1.3, 5, INK, { position: [-0.3, 0.65, 0], rotation: [0, 0, 0.25] })
      .cylinder(0.08, 0.08, 1.3, 5, INK, { position: [0.3, 0.65, 0], rotation: [0, 0, -0.25] })
      .cylinder(0.08, 0.08, 1.3, 5, INK, { position: [0, 0.65, 0.3], rotation: [-0.25, 0, 0] })
      .cylinder(0.18, 0.12, 1.8, 10, '#d4a93a', { position: [0, 1.6, -0.3], rotation: [-0.9, 0, 0] })
      .build(0.01);
    this.put(scope, 76, -24, 0.6);
    this.world.circle(76, -24, 0.8);
  }

  /** The edge: a low stone wall along the south, and the river that falls off into the stars. */
  private buildEdge(): void {
    const k = new ModelKit();
    for (let x = -108; x <= 108; x += 6) {
      k.box(0.6, 1.1, 0.6, '#b4aed0', { position: [x, 0.55, EDGE_Z], pattern: Pattern.Stone });
      k.box(6, 0.25, 0.5, '#c9c2de', { position: [x + 3, 1.05, EDGE_Z], pattern: Pattern.Stone });
    }
    // The river: from the meadow down to the edge, and over it.
    k.box(6, 0.08, 70, '#3b5f9a', { position: [60, 0.03, 60], pattern: Pattern.Glass, nightGlow: 0.2 });
    for (const s of [-1, 1]) k.box(0.8, 0.3, 70, '#9a93b0', { position: [60 + s * 3.4, 0.15, 60], pattern: Pattern.Stone });
    this.put(k.build(0.02), 0, 0);
    this.world.box(60, 60, 3.8, 35);
    // The falls hang below the lip (the cliff face is under the island).
    this.put(buildWaterfall(70), 60, EDGE_Z + 5, Math.PI, -70);
  }

  /** Snowy mountains all along the north, and green peaks to the east and west. */
  private buildMountains(): void {
    const rnd = this.rnd;
    for (let i = 0; i < 9; i++) {
      const x = -240 + i * 60 + rnd.range(-15, 15);
      const z = -190 - rnd.range(0, 70);
      this.put(buildHill(rnd.fork(i + 40), rnd.range(55, 90), rnd.range(90, 170), 'snowpeak'), x, z, rnd.range(0, 6), -4);
    }
    for (const side of [-1, 1])
      for (let i = 0; i < 3; i++) this.put(buildPeak(rnd.fork(i + 60 + side), rnd.range(40, 60), rnd.range(70, 120), 0.7), side * (190 + i * 30), -60 + i * 60, 0, -4);
  }

  private buildZones(): void {
    // The road back to Harbour Town at the west end of the path.
    const sign = new ModelKit()
      .box(0.3, 4, 0.3, '#7a5a3a', { position: [0, 2, 0] })
      .box(6, 1.4, 0.2, '#2f8f86', { position: [0, 4, 0], nightGlow: 1 })
      .box(0.8, 0.8, 0.25, '#f6f0e4', { position: [-2.4, 4, 0.05], rotation: [0, 0, Math.PI / 4] })
      .build(0.01);
    this.put(sign, -104, -9, Math.PI / 2);
    this.world.circle(-104, -9, 0.4);
    this.zones.push({ kind: 'area', label: '⚓ Harbour Town', x: -106, z: 0, r: 6, area: 'harbour', colour: '#2f8f86' });
    this.zones.push({ kind: 'launch', label: '✈ Paper plane', x: -70, z: 30, r: 4, colour: '#f6f0e4' });
    const view = (id: string, x: number, z: number, yaw: number, pitch: number, lut: string, name: string): void => {
      this.zones.push({ kind: 'viewpoint', label: `🌌 ${name}`, x, z, r: 2.6, colour: '#c9b8f0', view: { id, yaw, pitch, lut, name } });
    };
    view('we-edge', 0, 88, Math.PI, -0.12, 'dream', 'The Edge of the World');
    view('we-lake', -50, 4, 0, 0.12, 'calm', 'Mirror Lake');
    view('we-meadow', 70, -18, -2.5, 0.6, 'moonlight', 'Milky Way Meadow');
    view('we-falls', 40, 86, Math.atan2(-20, -12), -0.08, 'calm', 'The Last Waterfall');
    // Fishing spots, resting at home and DJ stages (see Leisure.ts).
    addLeisure(this, 'worldsend');
    for (const z of this.zones) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(z.r - 0.35, z.r, 40).rotateX(-Math.PI / 2), new PaintMaterial({ color: z.colour, emissive: 0.8, side: THREE.DoubleSide }));
      ring.position.set(z.x, 0.1, z.z);
      this.group.add(ring);
      this.zoneRings.push(ring);
      const label = document.createElement('div');
      label.className = 'name-tag hub-label';
      label.innerHTML = `<span>${z.label}</span>`;
      label.style.display = 'none';
      this.labelLayer.appendChild(label);
      this.labels.push(label);
    }
  }

  /** Little islands and rocks drifting in the void beyond the edge. */
  private buildDrifters(): void {
    const rnd = this.rnd;
    const rocks = [0, 1, 2, 3].map((i) => buildFloatingRock(rnd.fork(i + 80), rnd.range(4, 11)));
    for (let i = 0; i < 16; i++) {
      const a = rnd.range(-0.2, Math.PI + 0.2);
      const r = rnd.range(150, 320);
      const base = new THREE.Vector3(Math.cos(a) * r, rnd.range(-60, 30), EDGE_Z + Math.sin(a) * r * 0.8);
      const mesh = new THREE.Mesh(rnd.pick(rocks), this.material);
      mesh.position.copy(base);
      this.group.add(mesh);
      this.drifting.push({ mesh, base, phase: rnd.range(0, 6) });
    }
  }

  /** A few stargazers: sitting on the grass, looking up. */
  private buildGazers(): void {
    const rnd = new Random(927);
    const spots: [number, number, number, 'sitdown' | 'idle'][] = [
      [66, -30, 0.8, 'sitdown'],
      [80, -12, -2.2, 'sitdown'],
      [-30, 80, Math.PI, 'sitdown'],
      [-38, -2, 0.2, 'idle'],
      [90, -50, 1.5, 'sitdown'],
    ];
    for (const [x, z, yaw, pose] of spots) {
      // Sitting and gazing: no wheelchair or stick needed for the pose.
      const model = new HumanModel(personOf('mixed', () => rnd.next(), { age: 'adult', aids: false }).look);
      model.root.position.set(x, 0, z);
      model.root.rotation.y = yaw;
      this.group.add(model.root);
      this.world.circle(x, z, 0.6);
      this.gazers.push({ model, pose });
    }
  }

  title(): { kicker: string; name: string; poem: string } {
    return { kicker: t('we.kicker'), name: t('we.name'), poem: t('we.poem') };
  }

  mapInfo(): MapInfo {
    return {
      id: this.id,
      name: t('we.name'),
      bounds: { minX: -125, maxX: 125, minZ: -125, maxZ: 110 },
      regions: [
        { id: 'worldsend', name: t('we.name'), rect: [-118, -116, 118, EDGE_Z], colour: '#9fc28a', paint: 1 },
        { id: 'we-meadow', name: 'Milky Way meadow', rect: [38, -80, 108, -2], colour: '#c9b8f0', paint: 1 },
      ],
      roads: [
        { x1: -110, z1: 0, x2: -20, z2: 0, w: 5 },
        { x1: -20, z1: 0, x2: 0, z2: 84, w: 5 },
        { x1: -20, z1: 0, x2: 60, z2: -20, w: 5 },
        { x1: 0, z1: 84, x2: 60, z2: 84, w: 5 },
      ],
      water: [],
      blocks: [
        { x: -50, z: -24, w: 46, d: 46, colour: 'rgba(59,95,154,0.85)' },
        { x: 60, z: 60, w: 6, d: 70, colour: 'rgba(59,95,154,0.85)' },
      ],
    };
  }

  ambienceAt(x: number, z: number): { nature: number; coast: number; city: number; water: number; wind: number } {
    // The river and the falls over the edge; the wind picks up toward the edge of the world.
    const falls = Math.max(0, 1 - Math.hypot(x - 60, z - EDGE_Z) / 60);
    const river = z > 20 ? Math.max(0, 1 - Math.abs(x - 60) / 22) * 0.55 : 0;
    const lake = Math.max(0, 1 - Math.hypot(x + 50, z + 24) / 40) * 0.2;
    return { nature: 0.9, coast: 0, city: 0, water: Math.max(falls, river, lake), wind: 0.2 + Math.max(0, (z - 50) / (EDGE_Z - 50)) * 0.7 };
  }

  dynamicBodies(): { x: number; z: number; r: number }[] {
    return [];
  }

  zoneLabel(z: AreaZone): string {
    const leisure = leisureLabel(z);
    if (leisure) return leisure;
    if (z.kind === 'viewpoint' && z.view) return `🌌 ${t(`view.${z.view.id}` as StringKey)}`;
    return z.kind === 'portal' || z.kind === 'area' ? z.label : t(`zone.${z.kind}` as StringKey);
  }

  zoneAt(x: number, z: number): AreaZone | null {
    for (const zn of this.zones) if (Math.hypot(x - zn.x, z - zn.z) < zn.r) return zn;
    return null;
  }

  show(on: boolean): void {
    this.group.visible = on;
    if (!on) for (const l of this.labels) l.style.display = 'none';
  }

  update(dt: number, time: number, player: { x: number; z: number }, camera: THREE.PerspectiveCamera): void {
    for (const d of this.drifting) {
      d.mesh.position.y = d.base.y + Math.sin(time * 0.2 + d.phase) * 3;
      d.mesh.rotation.y = time * 0.02 + d.phase;
    }
    for (const g of this.gazers) g.model.animate(dt, g.pose, 0, time);
    for (const ring of this.zoneRings) ring.scale.setScalar(1 + Math.sin(time * 2) * 0.03);
    const langNow = document.documentElement.lang;
    if (langNow !== this.labelLang) {
      this.labelLang = langNow;
      this.zones.forEach((z, i) => (this.labels[i].innerHTML = `<span>${this.zoneLabel(z)}</span>`));
    }
    this.zones.forEach((z, i) => {
      const label = this.labels[i];
      this.v.set(z.x, AREA_Y + 4, z.z).project(camera);
      const dist = Math.hypot(player.x - z.x, player.z - z.z);
      const on = this.group.visible && this.v.z < 1 && Math.abs(this.v.x) < 1.1 && Math.abs(this.v.y) < 1.1 && dist < 90;
      label.style.display = on ? 'block' : 'none';
      if (!on) return;
      label.style.left = `${(this.v.x * 0.5 + 0.5) * window.innerWidth}px`;
      label.style.top = `${(-this.v.y * 0.5 + 0.5) * window.innerHeight}px`;
      label.style.opacity = String(Math.max(0.35, 1 - dist / 100));
    });
  }

  dispose(): void {
    for (const l of this.labels) l.remove();
    this.group.removeFromParent();
  }
}

const _up = new THREE.Vector3(0, 1, 0);

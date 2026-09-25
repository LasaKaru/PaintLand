import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Random } from '../core/Random';
import { ModelKit, Pattern } from '../models/ModelKit';
import { PaintMaterial } from '../render/PaintMaterial';
import { buildHouse, buildKiosk, buildStall } from '../models/Buildings';
import { buildBench, buildLamp, buildLighthouse, buildPaperBoat } from '../models/Props';
import { buildBin, buildBicycle, buildCafeTable, buildCat, buildFountain, buildPlanter } from '../models/StreetProps';
import { buildBush, buildFlowerBush, buildPalm, buildRoundTree } from '../models/Nature';
import { buildOruwa, buildTukTukProp } from '../models/LandmarksSriLanka';
import { HumanModel, randomLook } from '../models/Human';
import { FreeWalker, FreeWorld } from '../gameplay/FreeRoam';
import { CHAPTERS } from './Chapters';
import { t, type StringKey } from '../core/i18n';

import { AREA_Y, type AreaZone, type Chest, type FreeRoamArea, type Place, type Secret, type StuntJump } from './FreeRoamArea';

/** Ground height of the hub above the sea. */
export const HUB_Y = AREA_Y;
export type HubZone = AreaZone;

interface Townsfolk {
  model: HumanModel;
  body: FreeWalker;
  target: { x: number; z: number };
  wait: number;
}

const WALLS = ['#f4e3c8', '#f2c6b4', '#e9b8c8', '#cfe3d6', '#f6f0e4', '#f7d9a8', '#d8d4ec', '#bfd9e8', '#f0c9a0'];
const INK = '#2b2622';

/**
 * Harbour Town (docs/04 §3): the walkable, drivable hub between chapters.
 * A cobbled plaza with a fountain, two avenues lined with shops and houses,
 * a harbour with boats and a lighthouse, painted gateways to each chapter,
 * and places to visit on foot or by car — garage, wardrobe, shop, mission
 * board, trophy hall. Free-roam physics (not the ribbon) with solid buildings.
 */
export class Hub implements FreeRoamArea {
  readonly id = 'harbour';
  readonly secrets: Secret[] = [
    { id: 'harbour-pier', x: 60, z: 112, y: 0.3, hint: 'At the end of the pier, under the lighthouse' },
    { id: 'harbour-alley', x: -108, z: -104, y: 0, hint: 'The far corner behind the western houses' },
    { id: 'harbour-fountain', x: 0, z: -2.8, y: 1.6, hint: 'Hop onto the fountain' },
  ];
  readonly chests: Chest[] = [
    { id: 'harbour-c1', x: -60, z: 30, tier: 0 },
    { id: 'harbour-c2', x: 90, z: -60, tier: 1 },
    { id: 'harbour-c3', x: -95, z: 60, tier: 2 },
  ];
  readonly stunts: StuntJump[] = [];
  readonly places: Place[] = [
    { id: 'plaza', name: 'the fountain plaza', x: 0, z: 10 },
    { id: 'pier', name: 'the pier', x: 60, z: 70 },
  ];
  readonly group = new THREE.Group();
  readonly world: FreeWorld;
  readonly zones: HubZone[] = [];
  readonly spawn = { x: 0, z: 30, heading: 0 };
  readonly folk: Townsfolk[] = [];
  private readonly labels: HTMLDivElement[] = [];
  private labelLang = '';
  private readonly zoneRings: THREE.Mesh[] = [];
  private readonly parts: THREE.BufferGeometry[] = [];
  private readonly nm = new THREE.Matrix3();
  private readonly rnd = new Random(20260925);
  private readonly material = new PaintMaterial({ vertexColors: true, flat: true });
  private readonly v = new THREE.Vector3();

  constructor(private readonly labelLayer: HTMLElement) {
    this.group.name = 'hub';
    this.group.position.y = HUB_Y;
    this.world = new FreeWorld({ minX: -118, maxX: 118, minZ: -118, maxZ: 68 });
    this.buildGround();
    this.buildStreets();
    this.buildPlaza();
    this.buildHarbour();
    this.buildZones();
    this.flush();
    this.buildFolk();
    this.group.visible = false;
  }

  // ————— building helpers —————

  /** Bake a ModelKit geometry into the hub at (x, z) turned by yaw. */
  private put(geometry: THREE.BufferGeometry, x: number, z: number, yaw = 0, y = 0, scale = 1): void {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(_up, yaw), new THREE.Vector3(scale, scale, scale));
    const g = geometry.clone().applyMatrix4(m);
    const sn = g.getAttribute('smoothNormal') as THREE.BufferAttribute | undefined;
    if (sn) sn.applyNormalMatrix(this.nm.getNormalMatrix(m));
    this.parts.push(g);
  }

  private flush(): void {
    // Merge into a few big meshes (by area) so the hub costs a handful of draw calls.
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

  private buildGround(): void {
    const k = new ModelKit();
    // Grass island, sand edge, then the quay.
    k.box(250, 4, 196, '#8cc36a', { position: [0, -2.02, -22], pattern: Pattern.Grass });
    k.box(252, 3.6, 198, '#e6cf9c', { position: [0, -2.4, -22] });
    // Avenues and the harbour front (cobbles).
    k.box(16, 0.06, 186, '#b9a9c9', { position: [0, 0.01, -25], pattern: Pattern.Stone });
    k.box(236, 0.06, 16, '#b9a9c9', { position: [0, 0.01, 0], pattern: Pattern.Stone });
    k.box(236, 0.06, 12, '#c9b89a', { position: [0, 0.01, 62], pattern: Pattern.Stone });
    // Pavements.
    for (const s of [-1, 1]) {
      k.box(3, 0.16, 186, '#e4dccb', { position: [s * 9.5, 0.08, -25] });
      k.box(236, 0.16, 3, '#e4dccb', { position: [0, 0.08, s * 9.5] });
    }
    this.put(k.build(0), 0, 0);
    // Quay wall down to the sea.
    const q = new ModelKit().box(252, HUB_Y + 3, 3, '#a79e92', { position: [0, -(HUB_Y + 3) / 2 + 0.1, 0], pattern: Pattern.Stone }).build(0);
    this.put(q, 0, 69.5);
  }

  private buildStreets(): void {
    const rnd = this.rnd;
    // Houses along both avenues, fronts facing the street.
    const rowAlongZ = (side: number, z0: number, z1: number): void => {
      let z = z0;
      while (z < z1) {
        const info = buildHouse(rnd, rnd.pick(WALLS));
        const x = side * (11.2 + info.depth / 2);
        const zc = z + info.width / 2;
        if (zc + info.width / 2 > z1) break;
        if (Math.abs(zc) > 26 || Math.abs(zc) < 13) {
          // Front faces +Z in the model; turn it to face the avenue (x = 0).
          this.put(info.geometry, x, zc, side > 0 ? -Math.PI / 2 : Math.PI / 2);
          this.world.box(x, zc, info.depth / 2, info.width / 2);
        }
        z += info.width + rnd.range(0.2, 1.2);
      }
    };
    const rowAlongX = (side: number, x0: number, x1: number): void => {
      let x = x0;
      while (x < x1) {
        const info = buildHouse(rnd, rnd.pick(WALLS));
        const xc = x + info.width / 2;
        const z = side * (11.2 + info.depth / 2);
        if (xc + info.width / 2 > x1) break;
        if (Math.abs(xc) > 26 || Math.abs(xc) < 13) {
          this.put(info.geometry, xc, z, side > 0 ? Math.PI : 0);
          this.world.box(xc, z, info.width / 2, info.depth / 2);
        }
        x += info.width + rnd.range(0.2, 1.2);
      }
    };
    rowAlongZ(-1, -104, -12);
    rowAlongZ(1, -104, -12);
    rowAlongX(-1, -104, -12);
    rowAlongX(1, 12, 104);
    rowAlongX(-1, 12, 104);
    // South side of the east-west avenue stays open toward the harbour: gardens and cafés.
    for (let i = 0; i < 9; i++) {
      for (const s of [-1, 1]) {
        const x = s * (22 + i * 10);
        this.put(i % 3 === 0 ? buildPalm(rnd) : buildRoundTree(rnd, rnd.chance(0.4) ? '#f4d23b' : null), x, 16 + rnd.range(0, 3), rnd.range(0, 6));
        this.world.circle(x, 17.5, 0.8);
        if (i % 2 === 0) {
          this.put(buildCafeTable(rnd), x + 4, 24, rnd.range(0, 6));
          this.world.circle(x + 4, 24, 1.1);
        }
        this.put(buildFlowerBush(rnd), x - 3, 30 + rnd.range(0, 10));
      }
    }
    // Lamps and trees on the pavements.
    for (let z = -100; z < 60; z += 14) {
      if (Math.abs(z) < 24) continue;
      for (const s of [-1, 1]) {
        this.put(buildLamp(rnd), s * 9.6, z, s > 0 ? -Math.PI / 2 : Math.PI / 2);
        this.world.circle(s * 9.6, z, 0.3);
      }
    }
    for (let x = -104; x < 104; x += 14) {
      if (Math.abs(x) < 24) continue;
      this.put(buildLamp(rnd), x, -9.6, 0);
      this.world.circle(x, -9.6, 0.3);
      this.put(buildBin(), x + 4, -9.8);
    }
    // Parked scooters, bikes, planters, a cat.
    for (let i = 0; i < 10; i++) {
      const z = -30 - i * 8;
      this.put(i % 2 ? buildBicycle(rnd.pick(['#d8463a', '#3e6fa8', '#f4d23b'])) : buildPlanter(rnd), rnd.pick([-1, 1]) * 9.2, z, Math.PI / 2);
    }
    this.put(buildCat('#f08a2e'), 8.8, 20, 1);
    this.put(buildTukTukProp('#2f8f86'), -5.5, 44, 0.3);
    this.world.box(-5.5, 44, 1, 1.6);
  }

  private buildPlaza(): void {
    const rnd = this.rnd;
    const k = new ModelKit().cylinder(24, 24, 0.12, 40, '#d9c7a4', { position: [0, 0.06, 0], pattern: Pattern.Stone }).cylinder(19, 19, 0.14, 40, '#c9b8d8', { position: [0, 0.07, 0], pattern: Pattern.Stone });
    this.put(k.build(0), 0, 0);
    this.put(buildFountain(), 0, 0, 0, 0, 1.8);
    this.world.circle(0, 0, 4.2);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const x = Math.cos(a) * 15;
      const z = Math.sin(a) * 15;
      if (i % 2) {
        this.put(buildBench(), x, z, -a + Math.PI / 2);
        this.world.circle(x, z, 0.9);
      } else {
        this.put(buildRoundTree(rnd, null, true), x, z, a);
        this.world.circle(x, z, 1);
      }
    }
    for (const [x, z] of [[-17, -17], [17, -17], [-17, 17], [17, 17]]) {
      this.put(buildLamp(rnd), x, z, Math.atan2(x, z) + Math.PI);
      this.world.circle(x, z, 0.3);
    }
  }

  private buildHarbour(): void {
    const rnd = this.rnd;
    // Bollards and rope along the quay.
    for (let x = -112; x <= 112; x += 8) {
      this.put(new ModelKit().cylinder(0.3, 0.35, 0.8, 8, INK, { position: [0, 0.4, 0] }).build(0), x, 67.5);
      this.world.circle(x, 67.5, 0.4);
    }
    // A pier with the lighthouse.
    const pier = new ModelKit().box(8, 0.5, 46, '#b58a5c', { position: [0, -0.25, 0], pattern: Pattern.Planks });
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) pier.cylinder(0.35, 0.35, HUB_Y + 3, 6, '#7a5a3a', { position: [s * 3.6, -(HUB_Y + 3) / 2, -20 + i * 8] });
    this.put(pier.build(0), 60, 92);
    this.put(buildLighthouse(), 60, 114, 0, 0, 1.3);
    // Boats bobbing in the harbour (static, sitting on the sea).
    for (let i = 0; i < 7; i++) {
      const x = -95 + i * 24 + rnd.range(-4, 4);
      if (Math.abs(x - 60) < 12) continue;
      const g = i % 2 ? buildOruwa() : buildPaperBoat();
      this.put(g, x, 82 + rnd.range(0, 16), rnd.range(0, Math.PI), -HUB_Y + 0.1, i % 2 ? 1.4 : 2.2);
    }
    // Stalls along the harbour front.
    for (let i = 0; i < 5; i++) {
      const x = -80 + i * 22;
      this.put(i % 2 ? buildStall(rnd) : buildKiosk(rnd), x, 58, Math.PI);
      this.world.box(x, 58, 2.2, 1.8);
    }
    // Palms and bushes along the quay.
    for (let x = -108; x <= 108; x += 18) {
      this.put(buildPalm(rnd), x + 6, 64);
      this.world.circle(x + 6, 64, 0.6);
      this.put(buildBush(rnd), x - 4, 64.5);
    }
  }

  private buildZones(): void {
    const rnd = this.rnd;
    // Painted gateways to each chapter at the ends of the avenues.
    const gates: [number, number, number][] = [[0, -108, 0], [-108, 0, Math.PI / 2], [108, 0, -Math.PI / 2]];
    CHAPTERS.forEach((ch, i) => {
      const [x, z, yaw] = gates[i % gates.length];
      const colour = ['#e8559a', '#f08a2e', '#3e9fd8'][i % 3];
      const gate = new ModelKit();
      for (const s of [-1, 1]) {
        gate.box(1.4, 11, 1.4, colour, { position: [s * 8, 5.5, 0] });
        gate.box(2, 0.6, 2, INK, { position: [s * 8, 11.2, 0] });
      }
      gate.box(17.4, 1.6, 1.2, '#f6f0e4', { position: [0, 10, 0] });
      gate.box(17.8, 0.4, 1.4, colour, { position: [0, 10.9, 0] });
      // A swirl of paint strokes in the doorway.
      for (let j = 0; j < 14; j++) {
        const a = (j / 14) * Math.PI * 2;
        gate.box(1.8, 0.35, 0.2, rnd.pick(['#e8559a', '#f4d23b', '#5dbb3f', '#3e9fd8', '#9a5bd6']), { position: [Math.cos(a) * 4, 5 + Math.sin(a) * 4, 0], rotation: [0, 0, a + Math.PI / 2], nightGlow: 1 });
      }
      this.put(gate.build(0.02), x, z, yaw);
      const off = yaw === 0 ? [8, 0] : [0, 8];
      this.world.circle(x + off[0], z + off[1], 0.9);
      this.world.circle(x - off[0], z - off[1], 0.9);
      this.zones.push({ kind: 'portal', label: `→ ${ch.name}`, x: x * 0.97, z: z * 0.97, r: 6, chapter: ch.id, colour });
    });

    // Services around the plaza.
    const garage = new ModelKit()
      .box(14, 6, 10, '#d8d4ec', { position: [0, 3, 0], pattern: Pattern.Brick })
      .box(15, 0.6, 11, INK, { position: [0, 6.3, 0] })
      .box(8, 4.4, 0.2, '#2f2a28', { position: [0, 2.2, 5.02] })
      .box(9, 1.2, 0.3, '#f4d23b', { position: [0, 5.2, 5.1], nightGlow: 1 })
      .build(0.02);
    this.put(garage, 34, -34, -Math.PI / 4);
    this.world.circle(34, -34, 7);
    this.zones.push({ kind: 'garage', label: '🔧 Garage', x: 28, z: -28, r: 4.5, colour: '#f4d23b' });

    const tent = new ModelKit()
      .cylinder(0.2, 5.5, 5, 8, '#e9b8c8', { position: [0, 4.5, 0] })
      .cylinder(5.4, 5.4, 2, 8, '#f6f0e4', { position: [0, 1, 0] })
      .box(2.4, 2.2, 0.3, '#9a5bd6', { position: [0, 1.1, 5.3] })
      .build(0.02);
    this.put(tent, -34, -34, Math.PI / 4);
    this.world.circle(-34, -34, 5.6);
    this.zones.push({ kind: 'wardrobe', label: '👒 Wardrobe', x: -28, z: -28, r: 4.5, colour: '#e8559a' });

    this.put(buildKiosk(rnd), -32, 32, (3 * Math.PI) / 4);
    this.world.circle(-32, 32, 2.6);
    this.zones.push({ kind: 'shop', label: '🧪 Shop', x: -27, z: 27, r: 4, colour: '#5dbb3f' });

    const board = new ModelKit()
      .box(0.3, 3, 0.3, '#7a5a3a', { position: [-2, 1.5, 0] })
      .box(0.3, 3, 0.3, '#7a5a3a', { position: [2, 1.5, 0] })
      .box(4.8, 2.4, 0.2, '#b58a5c', { position: [0, 2.6, 0], pattern: Pattern.Planks })
      .box(1, 0.7, 0.05, '#f6f0e4', { position: [-1.2, 2.9, 0.13] })
      .box(0.9, 0.9, 0.05, '#f4d23b', { position: [0.2, 2.5, 0.13] })
      .box(0.8, 0.6, 0.05, '#e9b8c8', { position: [1.4, 3.1, 0.13] })
      .build(0.02);
    this.put(board, 32, 32, (-3 * Math.PI) / 4);
    this.world.box(32, 32, 1.8, 1.8);
    this.zones.push({ kind: 'missions', label: '📋 Mission board', x: 27, z: 27, r: 4, colour: '#3e9fd8' });

    const statue = new ModelKit()
      .box(3, 1.4, 3, '#e4dccb', { position: [0, 0.7, 0], pattern: Pattern.Marble })
      .cylinder(0.5, 0.7, 2.6, 8, '#d4a93a', { position: [0, 2.7, 0] })
      .blob(1, '#f4d23b', { position: [0, 4.6, 0], detail: 1, roughness: 0 })
      .cylinder(0.9, 0.2, 1.2, 8, '#d4a93a', { position: [0, 3.9, 0] })
      .build(0);
    this.put(statue, 0, 44);
    this.world.box(0, 44, 1.6, 1.6);
    this.zones.push({ kind: 'trophies', label: '🏆 Trophy hall', x: 0, z: 39, r: 3.5, colour: '#f4d23b' });
    // The coast road east to Serendib City.
    const sign = new ModelKit()
      .box(0.3, 4, 0.3, '#7a5a3a', { position: [0, 2, 0] })
      .box(6, 1.4, 0.2, '#2f8f86', { position: [0, 4, 0], nightGlow: 1 })
      .box(0.8, 0.8, 0.25, '#f6f0e4', { position: [2.4, 4, 0.05], rotation: [0, 0, Math.PI / 4] })
      .build(0.01);
    this.put(sign, 104, 26, -Math.PI / 2);
    this.world.circle(104, 26, 0.4);
    this.zones.push({ kind: 'area', label: '🏙 Serendib City', x: 104, z: 40, r: 7, area: 'city', colour: '#2f8f86' });
    // A kicker ramp on the harbour front and boost pads down the avenue.
    this.world.ramps.push({ x: -40, z: 52, heading: Math.PI / 2, halfWidth: 3, halfLength: 2.2, power: 6, stunt: false });
    this.put(new ModelKit().box(6, 1.3, 4.4, '#e4dccb', { position: [0, 0.15, 0], rotation: [0.3, 0, 0], pattern: Pattern.Planks }).build(0), -40, 52, Math.PI / 2);
    for (const z of [-40, -70]) {
      this.world.pads.push({ x: 0, z, r: 2.4 });
      this.put(new ModelKit().box(4, 0.08, 5, '#3e9fd8', { position: [0, 0.07, 0], nightGlow: 1 }).box(0.8, 0.1, 2.6, '#f6f0e4', { position: [0, 0.1, 0], rotation: [0, Math.PI / 4, 0] }).build(0), 0, z);
    }

    // Glowing rings on the ground and floating labels.
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

  private buildFolk(): void {
    const rnd = new Random(77);
    for (let i = 0; i < 14; i++) {
      const model = new HumanModel(randomLook(() => rnd.next()));
      const body = new FreeWalker();
      const p = this.randomSpot(rnd);
      body.place(p.x, p.z, rnd.range(-3, 3));
      this.group.add(model.root);
      this.folk.push({ model, body, target: this.randomSpot(rnd), wait: rnd.range(0, 3) });
    }
  }

  /** A random point on the streets or the plaza. */
  private randomSpot(rnd: Random): { x: number; z: number } {
    const r = rnd.next();
    if (r < 0.3) return { x: rnd.range(-7, 7), z: rnd.range(-100, 55) };
    if (r < 0.6) return { x: rnd.range(-100, 100), z: rnd.range(-7, 7) };
    if (r < 0.8) return { x: rnd.range(-100, 100), z: rnd.range(40, 62) };
    const a = rnd.range(0, Math.PI * 2);
    return { x: Math.cos(a) * rnd.range(7, 20), z: Math.sin(a) * rnd.range(7, 20) };
  }

  /** Zone label in the current language (portals keep the chapter name). */
  title(): { kicker: string; name: string; poem: string } {
    return { kicker: t('hub.kicker'), name: t('hub.name'), poem: t('hub.poem') };
  }

  ambienceAt(_x: number, z: number): { nature: number; coast: number; city: number } {
    return { nature: 0.45, coast: Math.min(1, Math.max(0.2, (z + 20) / 90)), city: 0.2 };
  }

  dynamicBodies(): { x: number; z: number; r: number }[] {
    return [];
  }

  zoneLabel(z: HubZone): string {
    return z.kind === 'portal' || z.kind === 'area' ? z.label : t(`zone.${z.kind}` as StringKey);
  }

  zoneAt(x: number, z: number): HubZone | null {
    for (const zn of this.zones) if (Math.hypot(x - zn.x, z - zn.z) < zn.r) return zn;
    return null;
  }

  show(on: boolean): void {
    this.group.visible = on;
    if (!on) for (const l of this.labels) l.style.display = 'none';
  }

  /** Townsfolk stroll between spots; everyone waves at the player. Labels follow their zones. */
  update(dt: number, time: number, player: { x: number; z: number }, camera: THREE.PerspectiveCamera): void {
    const rnd = this.rnd;
    for (const f of this.folk) {
      const dx = f.target.x - f.body.x;
      const dz = f.target.z - f.body.z;
      const d = Math.hypot(dx, dz);
      const near = Math.hypot(player.x - f.body.x, player.z - f.body.z) < 5;
      let mx = 0;
      let my = 0;
      if (f.wait > 0) f.wait -= dt;
      else if (d < 1.2) {
        f.target = this.randomSpot(rnd);
        f.wait = rnd.range(1, 5);
      } else if (!near) {
        // Walk toward the target: express it as camera-relative input with a camera facing −Z.
        mx = dx / d;
        my = -dz / d;
      }
      f.body.step(dt, { moveX: mx * 0.45, moveY: my * 0.45, cameraYaw: 0, sprint: false, walk: false, jump: false, faceCamera: false }, this.world);
      if (near) f.body.heading = Math.atan2(-(player.x - f.body.x), -(player.z - f.body.z));
      f.model.root.position.set(f.body.x, f.body.y, f.body.z);
      f.model.root.rotation.y = f.body.heading;
      f.model.animate(dt, near ? 'wave' : f.body.pose, f.body.speed, time);
    }
    for (const ring of this.zoneRings) ring.scale.setScalar(1 + Math.sin(time * 3) * 0.04);
    // Labels (re-drawn when the language changes).
    const langNow = document.documentElement.lang;
    if (langNow !== this.labelLang) {
      this.labelLang = langNow;
      this.zones.forEach((z, i) => (this.labels[i].innerHTML = `<span>${this.zoneLabel(z)}</span>`));
    }
    this.zones.forEach((z, i) => {
      const label = this.labels[i];
      this.v.set(z.x, HUB_Y + (z.kind === 'portal' ? 12.5 : 5), z.z).project(camera);
      const dist = Math.hypot(player.x - z.x, player.z - z.z);
      const on = this.group.visible && this.v.z < 1 && Math.abs(this.v.x) < 1.1 && Math.abs(this.v.y) < 1.1 && dist < 120;
      label.style.display = on ? 'block' : 'none';
      if (!on) return;
      label.style.left = `${(this.v.x * 0.5 + 0.5) * window.innerWidth}px`;
      label.style.top = `${(-this.v.y * 0.5 + 0.5) * window.innerHeight}px`;
      label.style.opacity = String(Math.max(0.35, 1 - dist / 140));
    });
  }

  dispose(): void {
    for (const l of this.labels) l.remove();
    this.group.removeFromParent();
  }
}

const _up = new THREE.Vector3(0, 1, 0);

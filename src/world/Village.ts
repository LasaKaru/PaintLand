import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { addMuralBoards, type MuralBoard } from './Murals';
import { Random } from '../core/Random';
import { ModelKit, Pattern } from '../models/ModelKit';
import { PaintMaterial } from '../render/PaintMaterial';
import { buildKiosk, buildStall } from '../models/Buildings';
import { buildBench, buildPaperBoat } from '../models/Props';
import { buildBicycle, buildCat, buildPlanter } from '../models/StreetProps';
import { buildBush, buildFlowerBush } from '../models/Nature';
import { buildBambooClump, buildCherryTree, buildChorten, buildFox, buildFuji, buildJunk, buildKarst, buildLanternString, buildPagoda, buildPrayerFlags, buildShophouse, buildStoneLantern, buildTorii } from '../models/LandmarksAsia';
import { HumanModel, randomLook } from '../models/Human';
import { FreeWalker, FreeWorld } from '../gameplay/FreeRoam';
import { CHAPTERS } from './Chapters';
import { t, type StringKey } from '../core/i18n';
import type { MapInfo } from '../ui/MapView';
import { AREA_Y, type AreaZone, type Chest, type FreeRoamArea, type Place, type Secret, type StuntJump } from './FreeRoamArea';

interface Townsfolk {
  model: HumanModel;
  body: FreeWalker;
  target: { x: number; z: number };
  wait: number;
}

const INK = '#2b2622';
const VERMILION = '#e0432f';

/**
 * Lantern Village (Hub 3): the free-roam home of Chapter 4. A lantern street
 * of Hội An shophouses runs east–west; a tunnel of torii climbs north to the
 * painted gate of Lantern Roads; a pagoda stands in a cherry garden, a bamboo
 * grove whispers in the west, and junks sail among Hạ Long karsts off the
 * waterfront, with Fuji on the horizon. Same services as Harbour Town.
 */
export class Village implements FreeRoamArea {
  readonly id = 'village';
  readonly secrets: Secret[] = [
    { id: 'village-pagoda', x: 48, z: -52, y: 0, hint: 'Behind the red pagoda, under the cherry blossom' },
    { id: 'village-bamboo', x: -62, z: -60, y: 0, hint: 'Deep in the bamboo grove' },
    { id: 'village-pier', x: -40, z: 65, y: 0, hint: 'Where the lantern pier meets the quay' },
  ];
  readonly chests: Chest[] = [
    { id: 'village-c1', x: 88, z: -20, tier: 0 },
    { id: 'village-c2', x: -14, z: -96, tier: 1 },
    { id: 'village-c3', x: 96, z: 50, tier: 2 },
  ];
  readonly stunts: StuntJump[] = [];
  readonly places: Place[] = [
    { id: 'lantern-street', name: 'the lantern street', x: 50, z: 0 },
    { id: 'torii', name: 'the torii tunnel', x: 0, z: -60 },
    { id: 'pagoda', name: 'the pagoda garden', x: 45, z: -45 },
    { id: 'bamboo', name: 'the bamboo grove', x: -50, z: -50 },
    { id: 'waterfront', name: 'the waterfront', x: 0, z: 58 },
  ];
  readonly group = new THREE.Group();
  readonly world: FreeWorld;
  readonly murals: MuralBoard[] = [];
  readonly seaZ = 70;
  readonly zones: AreaZone[] = [];
  readonly spawn = { x: -90, z: 4, heading: -Math.PI / 2 };
  readonly folk: Townsfolk[] = [];
  private readonly labels: HTMLDivElement[] = [];
  private labelLang = '';
  private readonly zoneRings: THREE.Mesh[] = [];
  private readonly parts: THREE.BufferGeometry[] = [];
  private readonly nm = new THREE.Matrix3();
  private readonly rnd = new Random(20261004);
  private readonly material = new PaintMaterial({ vertexColors: true, flat: true });
  private readonly v = new THREE.Vector3();

  constructor(private readonly labelLayer: HTMLElement) {
    this.group.name = 'village';
    this.group.position.y = AREA_Y;
    this.world = new FreeWorld({ minX: -118, maxX: 118, minZ: -118, maxZ: 68 });
    this.buildGround();
    this.buildLanternStreet();
    this.buildToriiAvenue();
    this.buildGardens();
    this.buildWaterfront();
    this.buildZones();
    this.flush();
    this.buildFolk();
    this.group.visible = false;
  }

  // ————— building helpers —————

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

  private buildGround(): void {
    const k = new ModelKit();
    k.box(250, 4, 196, '#9cc46a', { position: [0, -2.02, -22], pattern: Pattern.Grass });
    k.box(252, 3.6, 198, '#e6cf9c', { position: [0, -2.4, -22] });
    // Lantern street (east–west), torii avenue (north), waterfront (south).
    k.box(236, 0.06, 14, '#c79a6a', { position: [0, 0.01, 0], pattern: Pattern.Stone });
    k.box(12, 0.06, 112, '#b9a9c9', { position: [0, 0.01, -60], pattern: Pattern.Stone });
    k.box(12, 0.06, 56, '#c79a6a', { position: [0, 0.01, 34], pattern: Pattern.Stone });
    k.box(236, 0.06, 12, '#c9b89a', { position: [0, 0.01, 62], pattern: Pattern.Planks });
    for (const s of [-1, 1]) k.box(236, 0.16, 2.4, '#e4dccb', { position: [0, 0.08, s * 8.2] });
    // The little plaza where the roads meet.
    k.cylinder(18, 18, 0.12, 36, '#d9c7a4', { position: [0, 0.06, 0], pattern: Pattern.Stone });
    this.put(k.build(0), 0, 0);
    const q = new ModelKit().box(252, AREA_Y + 3, 3, '#8f8a80', { position: [0, -(AREA_Y + 3) / 2 + 0.1, 0], pattern: Pattern.Stone }).build(0);
    this.put(q, 0, 69.5);
  }

  /** Shophouses facing the street with strings of silk lanterns overhead. */
  private buildLanternStreet(): void {
    const rnd = this.rnd;
    for (const side of [-1, 1]) {
      for (let x = -108; x < 108; x += 8.6) {
        if (Math.abs(x) < 22) continue;
        // Front faces −Z in the model: turn it toward the street.
        const z = side * 13.6;
        this.put(buildShophouse(rnd.fork(Math.round(x * 10) + side)), x, z, side < 0 ? Math.PI : 0);
        this.world.box(x, z, 3.8, 4.2);
      }
    }
    for (let x = -100; x <= 100; x += 10) {
      if (Math.abs(x) < 20) continue;
      this.put(buildLanternString(rnd, 8.8, 6.2), x, 0, Math.PI / 2);
    }
    // Stalls, bikes and planters on the pavement.
    for (let i = 0; i < 8; i++) {
      const x = -96 + i * 26 + rnd.range(-2, 2);
      if (Math.abs(x) < 24) continue;
      const side = i % 2 ? 1 : -1;
      this.put(i % 3 === 0 ? buildBicycle(rnd.pick([VERMILION, '#3e6fa8', '#f4d23b'])) : buildPlanter(rnd), x, side * 8.4, 0);
    }
    this.put(buildCat('#f6f0e4'), 22, 8.6, 2);
  }

  /** The Fushimi-style tunnel of gates climbing north to the chapter portal. */
  private buildToriiAvenue(): void {
    const rnd = this.rnd;
    const torii = buildTorii(6.6);
    for (let z = -24; z >= -92; z -= 4) this.put(torii, 0, z);
    for (let z = -24; z >= -92; z -= 4) for (const s of [-1, 1]) this.world.circle(s * 6.6, z, 0.5);
    for (let z = -20; z >= -96; z -= 12)
      for (const s of [-1, 1]) {
        this.put(buildStoneLantern(), s * 8.4, z);
        this.world.circle(s * 8.4, z, 0.6);
      }
    for (const s of [-1, 1]) {
      this.put(buildFox(), s * 8, -98, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0, 1.6);
      this.world.box(s * 8, -98, 0.8, 0.8);
    }
    for (let i = 0; i < 16; i++) {
      const s = i % 2 ? 1 : -1;
      this.put(buildBush(rnd), s * rnd.range(10, 14), -20 - i * 5);
    }
  }

  private buildGardens(): void {
    const rnd = this.rnd;
    // Pagoda garden (north-east).
    this.put(new ModelKit().cylinder(22, 22, 0.1, 30, '#b9d98a', { position: [0, 0.05, 0], pattern: Pattern.Grass }).build(0), 45, -48);
    this.put(buildPagoda(), 45, -45, Math.PI / 4);
    this.world.box(45, -45, 4, 4);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const x = 45 + Math.cos(a) * 16;
      const z = -48 + Math.sin(a) * 16;
      this.put(buildCherryTree(rnd), x, z, rnd.range(0, 6));
      this.world.circle(x, z, 0.6);
    }
    for (const [x, z] of [[33, -30], [58, -30], [70, -60]]) {
      this.put(buildBench(), x, z, Math.atan2(45 - x, -45 - z));
      this.world.circle(x, z, 0.9);
    }
    // A koi pond with a red bridge.
    this.put(new ModelKit().cylinder(8, 8, 0.1, 24, '#4f8fb8', { position: [0, 0.06, 0] }).box(1.2, 0.3, 0.8, '#f08a2e', { position: [2, 0.12, 1] }).box(1, 0.3, 0.7, '#f6f0e4', { position: [-3, 0.12, -2] }).build(0), 80, -80);
    this.put(new ModelKit().box(2.4, 0.4, 16, VERMILION, { position: [0, 0.9, 0], rotation: [0, 0, 0] }).box(0.2, 1, 16, VERMILION, { position: [1.2, 1.5, 0] }).box(0.2, 1, 16, VERMILION, { position: [-1.2, 1.5, 0] }).build(0), 80, -80, Math.PI / 2);
    this.world.circle(80, -80, 7);
    // Bamboo grove (north-west).
    for (let i = 0; i < 44; i++) {
      const x = -30 - rnd.range(0, 70);
      const z = -24 - rnd.range(0, 80);
      if (Math.hypot(x + 62, z + 60) < 5) continue; // the secret's clearing
      if (Math.abs(x + 50) < 3.5) continue; // a path through the grove
      this.put(buildBambooClump(rnd, rnd.range(9, 15)), x, z);
      this.world.circle(x, z, 0.8);
    }
    // A chorten with prayer flags by the grove.
    this.put(buildChorten(), -20, -30, 0, 0, 0.9);
    this.world.circle(-20, -30, 2.4);
    this.put(buildPrayerFlags(8, 5), -20, -30, 0.4);
    // Fuji and karsts on the horizon.
    this.put(buildFuji(260, 150), 60, -520);
    for (let i = 0; i < 9; i++) this.put(buildKarst(rnd, rnd.range(8, 16), rnd.range(25, 55)), -150 + i * 38 + rnd.range(-8, 8), 150 + rnd.range(0, 90), 0, -AREA_Y);
    for (let x = 30; x <= 104; x += 14) this.put(buildFlowerBush(rnd), x, -18 - rnd.range(0, 4));
  }

  private buildWaterfront(): void {
    const rnd = this.rnd;
    for (let x = -112; x <= 112; x += 8) {
      this.put(new ModelKit().cylinder(0.3, 0.35, 0.8, 8, INK, { position: [0, 0.4, 0] }).build(0), x, 67.5);
      this.world.circle(x, 67.5, 0.4);
    }
    for (let x = -108; x <= 108; x += 12) this.put(buildLanternString(rnd, 5.8, 5.4), x, 62, 0);
    // A lantern pier and boats.
    const pier = new ModelKit().box(6, 0.5, 30, '#b58a5c', { position: [0, -0.25, 0], pattern: Pattern.Planks });
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) pier.cylinder(0.3, 0.3, AREA_Y + 3, 6, '#7a5a3a', { position: [s * 2.6, -(AREA_Y + 3) / 2, -12 + i * 8] });
    this.put(pier.build(0), -40, 82);
    this.world.box(-40, 82, 3.2, 15.5);
    for (const z of [74, 86, 96]) for (const s of [-1, 1]) this.put(buildStoneLantern(), -40 + s * 2.4, z, 0, 0, 0.6);
    for (let i = 0; i < 6; i++) {
      const x = -95 + i * 36 + rnd.range(-4, 4);
      if (Math.abs(x + 40) < 10) continue;
      const z = 84 + rnd.range(0, 30);
      this.put(i % 2 ? buildJunk(rnd) : buildPaperBoat(), x, z, rnd.range(0, Math.PI), -AREA_Y + 0.1, i % 2 ? 1 : 2.2);
      this.world.circle(x, z, 2.2);
    }
    // Market stalls along the waterfront.
    for (let i = 0; i < 6; i++) {
      const x = -90 + i * 34;
      if (Math.abs(x) < 10) continue;
      this.put(i % 2 ? buildStall(rnd) : buildKiosk(rnd), x, 52, Math.PI);
      this.world.box(x, 52, 2.2, 1.8);
    }
    // A lantern-boat kicker on the waterfront and boost pads along the street.
    const r = { x: 96, z: 40, heading: Math.PI / 2, halfWidth: 4, halfLength: 3.5, power: 8, stunt: true, reach: 40 };
    this.world.ramps.push(r);
    this.put(new ModelKit().box(8, 2.2, 7.5, VERMILION, { position: [0, 0.3, 0], rotation: [0.32, 0, 0] }).box(8.4, 0.2, 0.4, '#f4d23b', { position: [0, 2.6, -3.6], nightGlow: 1 }).build(0), r.x, r.z, r.heading);
    const landX = r.x - Math.sin(r.heading) * r.reach;
    const landZ = r.z - Math.cos(r.heading) * r.reach;
    this.put(new ModelKit().cylinder(7, 7, 0.1, 24, '#f4d23b', { position: [0, 0.08, 0], nightGlow: 1 }).cylinder(5.5, 5.5, 0.12, 24, INK, { position: [0, 0.09, 0] }).build(0), landX, landZ);
    this.stunts.push({ id: 'village-leap', name: 'Lantern leap', ramp: r, land: { x: landX, z: landZ, r: 9 } });
    for (const x of [-60, 60]) {
      this.world.pads.push({ x, z: 0, r: 2.4 });
      this.put(new ModelKit().box(5, 0.08, 4, '#3e9fd8', { position: [0, 0.07, 0], nightGlow: 1 }).box(2.6, 0.1, 0.8, '#f6f0e4', { position: [0, 0.1, 0], rotation: [0, Math.PI / 4, 0] }).build(0), x, 0);
    }
  }

  private buildZones(): void {
    // The great torii gate to Lantern Roads at the top of the avenue.
    const ch = CHAPTERS.find((c) => c.id === 'lanterns') ?? CHAPTERS[CHAPTERS.length - 1];
    this.put(buildTorii(8.4, 11), 0, -106);
    for (const s of [-1, 1]) this.world.circle(s * 8.4, -106, 0.9);
    const swirl = new ModelKit();
    for (let j = 0; j < 14; j++) {
      const a = (j / 14) * Math.PI * 2;
      swirl.box(1.8, 0.35, 0.2, this.rnd.pick([VERMILION, '#f4d23b', '#f7b8cf', '#3e9fd8', '#f4a13b']), { position: [Math.cos(a) * 4, 5 + Math.sin(a) * 4, 0], rotation: [0, 0, a + Math.PI / 2], nightGlow: 1 });
    }
    this.put(swirl.build(0), 0, -106);
    this.zones.push({ kind: 'portal', label: `→ ${ch.name}`, x: 0, z: -102, r: 6, chapter: ch.id, colour: VERMILION });

    const shop = (kind: AreaZone['kind'], label: string, x: number, z: number, colour: string, geometry: THREE.BufferGeometry, yaw: number, r = 4.5): void => {
      this.put(geometry, x, z, yaw);
      this.world.circle(x, z, 3.2);
      const nx = x - Math.sign(x) * 6;
      const nz = z - Math.sign(z) * 6;
      this.zones.push({ kind, label, x: nx, z: nz, r, colour });
    };
    const tea = (roof: string): THREE.BufferGeometry =>
      new ModelKit()
        .box(7, 4, 6, '#f2c14e', { position: [0, 2, 0], pattern: Pattern.Brick })
        .gable(8, 2.2, 7, roof, { position: [0, 5.1, 0], pattern: Pattern.RoofTiles })
        .box(2.4, 3, 0.2, INK, { position: [0, 1.5, 3.02] })
        .box(3.2, 0.8, 0.25, '#ffe08a', { position: [0, 3.5, 3.1], nightGlow: 1 })
        .build(0.02);
    shop('garage', '🔧 Garage', 30, -26, '#f4d23b', tea('#3e6fa8'), (-3 * Math.PI) / 4);
    shop('wardrobe', '👒 Wardrobe', -30, -26, '#e8559a', tea('#b8472e'), (3 * Math.PI) / 4);
    shop('shop', '🧪 Shop', -30, 30, '#5dbb3f', tea('#5c9a32'), Math.PI / 4);
    shop('missions', '📋 Mission board', 30, 30, '#3e9fd8', tea('#9a5bd6'), -Math.PI / 4);

    // The road back to Harbour Town at the west end of the street.
    const sign = new ModelKit()
      .box(0.3, 4, 0.3, '#7a5a3a', { position: [0, 2, 0] })
      .box(6, 1.4, 0.2, '#2f8f86', { position: [0, 4, 0], nightGlow: 1 })
      .box(0.8, 0.8, 0.25, '#f6f0e4', { position: [-2.4, 4, 0.05], rotation: [0, 0, Math.PI / 4] })
      .build(0.01);
    this.put(sign, -104, -9, Math.PI / 2);
    this.world.circle(-104, -9, 0.4);
    this.zones.push({ kind: 'area', label: '⚓ Harbour Town', x: -108, z: 0, r: 6, area: 'harbour', colour: '#2f8f86' });

    this.murals.push(...addMuralBoards(this, 'village', this.spawn));
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
    const rnd = new Random(88);
    for (let i = 0; i < 14; i++) {
      const model = new HumanModel(randomLook(() => rnd.next()));
      const body = new FreeWalker();
      const p = this.randomSpot(rnd);
      body.place(p.x, p.z, rnd.range(-3, 3));
      this.group.add(model.root);
      this.folk.push({ model, body, target: this.randomSpot(rnd), wait: rnd.range(0, 3) });
    }
  }

  /** A random point on the street, the avenue, the waterfront or the plaza. */
  private randomSpot(rnd: Random): { x: number; z: number } {
    const r = rnd.next();
    if (r < 0.4) return { x: rnd.range(-100, 100), z: rnd.range(-6, 6) };
    if (r < 0.6) return { x: rnd.range(-4, 4), z: rnd.range(-95, -20) };
    if (r < 0.85) return { x: rnd.range(-100, 100), z: rnd.range(57, 64) };
    const a = rnd.range(0, Math.PI * 2);
    return { x: Math.cos(a) * rnd.range(4, 15), z: Math.sin(a) * rnd.range(4, 15) };
  }

  title(): { kicker: string; name: string; poem: string } {
    return { kicker: t('village.kicker'), name: t('village.name'), poem: t('village.poem') };
  }

  mapInfo(): MapInfo {
    return {
      id: this.id,
      name: t('village.name'),
      bounds: { minX: -125, maxX: 125, minZ: -125, maxZ: 90 },
      regions: [
        { id: 'village', name: t('village.name'), rect: [-118, -118, 118, 68], colour: '#f7b8cf', paint: 1 },
        { id: 'village-bamboo', name: 'Bamboo grove', rect: [-100, -104, -30, -24], colour: '#8cc36a', paint: 1 },
      ],
      roads: [
        { x1: -118, z1: 0, x2: 118, z2: 0, w: 14 },
        { x1: 0, z1: -116, x2: 0, z2: 62, w: 12 },
        { x1: -118, z1: 62, x2: 118, z2: 62, w: 12 },
      ],
      water: [{ x: 80, z: -80, r: 8 }],
      seaZ: this.seaZ,
      blocks: [
        { x: 45, z: -45, w: 7, d: 7, colour: 'rgba(224,67,47,0.9)' },
        { x: -40, z: 82, w: 6, d: 30, colour: 'rgba(122,90,58,0.8)' },
      ],
    };
  }

  ambienceAt(_x: number, z: number): { nature: number; coast: number; city: number } {
    return { nature: z < -20 ? 0.8 : 0.5, coast: Math.min(1, Math.max(0.15, (z + 20) / 90)), city: 0.15 };
  }

  dynamicBodies(): { x: number; z: number; r: number }[] {
    return [];
  }

  zoneLabel(z: AreaZone): string {
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
    const langNow = document.documentElement.lang;
    if (langNow !== this.labelLang) {
      this.labelLang = langNow;
      this.zones.forEach((z, i) => (this.labels[i].innerHTML = `<span>${this.zoneLabel(z)}</span>`));
    }
    this.zones.forEach((z, i) => {
      const label = this.labels[i];
      this.v.set(z.x, AREA_Y + (z.kind === 'portal' ? 13 : 5), z.z).project(camera);
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

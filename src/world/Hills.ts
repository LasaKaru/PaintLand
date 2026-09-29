import { addLeisure, leisureLabel } from './Leisure';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { addMuralBoards, type MuralBoard } from './Murals';
import type { PlacedPocket } from './Pockets';
import { Random } from '../core/Random';
import { ModelKit, Pattern } from '../models/ModelKit';
import { PaintMaterial } from '../render/PaintMaterial';
import { buildHouse, buildKiosk, buildStall } from '../models/Buildings';
import { buildBench, buildLamp } from '../models/Props';
import { buildBicycle, buildCat, buildPlanter } from '../models/StreetProps';
import { buildFlowerBush, buildHill, buildPalm, buildRoundTree } from '../models/Nature';
import { buildTeaFactory, buildTrain, buildTukTukProp } from '../models/LandmarksSriLanka';
import { buildTeaHut, buildWaterfall } from '../models/LandmarksPostcards';
import { buildClockTower, buildSwanBoat, buildTudorPostOffice } from '../models/LandmarksIsland';
import { HumanModel } from '../models/Human';
import { buildChurch, buildKodimaram } from '../models/LandmarksFaith';
import { buildGopuram } from '../models/LandmarksIndia';
import { personOf } from './Peoples';
import { TownLife } from './TownLife';
import { FreeWorld } from '../gameplay/FreeRoam';
import { CHAPTERS } from './Chapters';
import { t, type StringKey } from '../core/i18n';
import type { MapInfo } from '../ui/MapView';
import { AREA_Y, type AreaZone, type Chest, type FreeRoamArea, type Place, type Secret, type StuntJump } from './FreeRoamArea';

const INK = '#2b2622';
const TEA = '#4f9a4a';
const WALLS = ['#f2e2c2', '#9fd0c8', '#e8a07a', '#f4d98a', '#e9b8c8', '#c9d7f0', '#f6f0e4'];

/**
 * Tea Hills (Hub 4): a Sri Lankan hill-country town in the clouds. A colonial
 * main street with a clock tower and a Tudor post office runs east–west; tea
 * terraces and a tea factory climb north to the painted gate of the Island
 * Road Trip; the little station on the south side has the blue train in; a
 * waterfall pours off the western cliffs, and swan boats drift on the lake.
 * Same services as the other towns.
 */
export class Hills implements FreeRoamArea {
  readonly id = 'hills';
  readonly secrets: Secret[] = [
    { id: 'hills-falls', x: -92, z: -58, y: 0, hint: 'In the spray at the foot of the waterfall' },
    { id: 'hills-factory', x: 100, z: -96, y: 0, hint: 'Behind the tea factory, where the leaves are dried' },
    { id: 'hills-platform', x: 96, z: 34, y: 0, hint: 'At the far end of the railway platform' },
  ];
  readonly chests: Chest[] = [
    { id: 'hills-c1', x: -60, z: -30, tier: 0 },
    { id: 'hills-c2', x: -30, z: -110, tier: 1 },
    { id: 'hills-c3', x: -96, z: 50, tier: 2 },
  ];
  readonly stunts: StuntJump[] = [];
  readonly places: Place[] = [
    { id: 'hills-street', name: 'the main street', x: 50, z: 0 },
    { id: 'hills-terraces', name: 'the tea terraces', x: 6, z: -60 },
    { id: 'hills-factory', name: 'the tea factory', x: 84, z: -72 },
    { id: 'hills-station', name: 'the railway station', x: 50, z: 34 },
    { id: 'hills-falls', name: 'the waterfall', x: -92, z: -66 },
    { id: 'hills-lake', name: 'the lake', x: -40, z: 58 },
  ];
  readonly group = new THREE.Group();
  readonly world: FreeWorld;
  readonly murals: MuralBoard[] = [];
  readonly pockets: PlacedPocket[] = [];
  readonly seaZ = 70;
  readonly zones: AreaZone[] = [];
  readonly spawn = { x: -96, z: 4, heading: -Math.PI / 2 };
  /** Townspeople going about their day (see TownLife.ts). */
  readonly life = new TownLife((r) => this.randomSpot(r), new Random(1105001), { greetings: ['ayubowan', 'wave'] });
  private readonly labels: HTMLDivElement[] = [];
  private labelLang = '';
  private readonly zoneRings: THREE.Mesh[] = [];
  private readonly parts: THREE.BufferGeometry[] = [];
  private readonly nm = new THREE.Matrix3();
  private readonly rnd = new Random(20261105);
  private readonly material = new PaintMaterial({ vertexColors: true, flat: true });
  private readonly v = new THREE.Vector3();
  /** The blue train shuttles in and out of the station. */
  private train: THREE.Mesh | null = null;
  private readonly swans: THREE.Mesh[] = [];

  constructor(private readonly labelLayer: HTMLElement) {
    this.group.name = 'hills';
    this.group.position.y = AREA_Y;
    this.world = new FreeWorld({ minX: -118, maxX: 118, minZ: -118, maxZ: 68 });
    this.buildGround();
    this.buildMainStreet();
    this.buildTerraces();
    this.buildStation();
    this.buildFallsAndLake();
    this.buildFaith();
    this.buildZones();
    this.flush();
    this.buildMovers();
    this.buildFolk();
    this.group.visible = false;
  }

  // ————— building helpers —————

  /**
   * Hill-country towns have a kovil for the estate families and an old stone church.
   * (Own random numbers only, so nothing else in the town moves.)
   */
  private buildFaith(): void {
    this.put(buildGopuram(new Random(47)), 0, 22, Math.PI, 0, 0.7);
    this.world.box(0, 22, 8, 5);
    this.put(buildKodimaram(), 0, 31, 0, 0, 0.7);
    this.world.circle(0, 31, 1.2);
    this.put(buildChurch('stone'), -60, 40, Math.PI / 2, 0, 0.7);
    this.world.box(-60, 40, 12, 6.5);
    this.places.push({ id: 'hills-kovil', name: 'the kovil', x: 0, z: 36 }, { id: 'hills-church', name: 'the stone church', x: -46, z: 40 });
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

  private buildGround(): void {
    const k = new ModelKit();
    k.box(250, 4, 196, '#8fbf5a', { position: [0, -2.02, -22], pattern: Pattern.Grass });
    k.box(252, 3.6, 198, '#c9a07a', { position: [0, -2.4, -22] });
    // Main street (east–west), the estate road north, the station road south, the lakeside promenade.
    k.box(236, 0.06, 14, '#8f8a80', { position: [0, 0.01, 0], pattern: Pattern.Stone });
    k.box(10, 0.06, 104, '#b8744a', { position: [0, 0.01, -60] });
    k.box(10, 0.06, 26, '#8f8a80', { position: [0, 0.01, 20], pattern: Pattern.Stone });
    k.box(236, 0.06, 10, '#c9b89a', { position: [0, 0.01, 62], pattern: Pattern.Planks });
    for (const s of [-1, 1]) k.box(236, 0.16, 2.4, '#e4dccb', { position: [0, 0.08, s * 8.2] });
    k.cylinder(16, 16, 0.12, 36, '#d9c7a4', { position: [0, 0.06, 0], pattern: Pattern.Stone });
    this.put(k.build(0), 0, 0);
    const q = new ModelKit().box(252, AREA_Y + 3, 3, '#8f8a80', { position: [0, -(AREA_Y + 3) / 2 + 0.1, 0], pattern: Pattern.Stone }).build(0);
    this.put(q, 0, 69.5);
  }

  /** Colonial shops facing the street, the clock tower in the square and the post office. */
  private buildMainStreet(): void {
    const rnd = this.rnd;
    for (const side of [-1, 1]) {
      let x = -108;
      while (x < 108) {
        const info = buildHouse(rnd, rnd.pick(WALLS), rnd.chance(0.35) ? 'colonial' : 'shop');
        const xc = x + info.width / 2;
        if (xc + info.width / 2 > 108) break;
        // Leave the corners by the square open for the services, and room for the post office.
        if (Math.abs(xc) > 40 && !(side < 0 && xc > 34 && xc < 60)) {
          const z = side * (11.2 + info.depth / 2);
          this.put(info.geometry, xc, z, side > 0 ? Math.PI : 0);
          this.world.box(xc, z, info.width / 2, info.depth / 2);
        }
        x += info.width + rnd.range(0.3, 1.4);
      }
    }
    // The post office on the north side of the street, the clock tower in the square.
    this.put(buildTudorPostOffice(), 46, -18, 0);
    this.world.box(46, -18, 7, 5);
    this.put(buildClockTower(), 0, 0, 0, 0, 1.2);
    this.world.circle(0, 0, 2.6);
    for (let x = -100; x <= 100; x += 14) {
      if (Math.abs(x) < 20) continue;
      for (const s of [-1, 1]) {
        this.put(buildLamp(rnd), x, s * 9.6, s > 0 ? Math.PI : 0);
        this.world.circle(x, s * 9.6, 0.3);
      }
    }
    for (let i = 0; i < 8; i++) {
      const x = -92 + i * 25 + rnd.range(-2, 2);
      if (Math.abs(x) < 24) continue;
      const side = i % 2 ? 1 : -1;
      this.put(i % 3 === 0 ? buildBicycle(rnd.pick(['#d8463a', '#3e6fa8', '#f4d23b'])) : buildPlanter(rnd), x, side * 8.4, 0);
    }
    // Parked tuk-tuks and a cat on the square.
    for (const [x, z, c] of [[-26, 7, '#e0432f'], [26, -7, '#2d8a5a'], [70, 7, '#3e6fa8']] as const) {
      this.put(buildTukTukProp(c), x, z, Math.PI / 2);
      this.world.box(x, z, 1.6, 1);
    }
    this.put(buildCat('#f08a2e'), 12, 12, 1);
  }

  /** Tea terraces (rows of bushes on stepped hills), tea huts and the tea factory. */
  private buildTerraces(): void {
    const rnd = this.rnd;
    // Solid terraces either side of the estate road, with walkable gaps between the rows.
    for (const side of [-1, 1]) {
      for (let row = 0; row < 8; row++) {
        const z = -36 - row * 9;
        const x0 = side * 10;
        const len = 42 - row * 1.5;
        const h = 0.6 + row * 0.35;
        const k = new ModelKit();
        k.box(len, h, 6, '#7a9a4a', { position: [side * len / 2, h / 2, 0], pattern: Pattern.Grass });
        for (let b = 0; b < len; b += 2.4) k.blob(1.1, TEA, { position: [side * (b + 1.2), h + 0.5, rnd.range(-1.8, 1.8)], scale: [1.2, 0.7, 1.2], detail: 0, pattern: Pattern.Tea });
        this.put(k.build(0.03, row), x0, z);
        this.world.box(x0 + (side * len) / 2, z, len / 2, 3);
      }
    }
    // Tea pickers' huts and the factory on the upper slope (factory and huts are solid).
    for (const [x, z] of [[-62, -44], [60, -52], [-66, -84]]) {
      this.put(buildTeaHut(), x, z, rnd.range(0, 6));
      this.world.circle(x, z, 2.2);
    }
    this.put(buildTeaFactory(), 84, -84, Math.PI);
    this.world.box(84, -84, 11, 6);
    // Misty hills beyond.
    for (let i = 0; i < 12; i++) this.put(buildHill(rnd.fork(i), rnd.range(50, 90), rnd.range(30, 70), i % 3 ? 'tea' : 'jungle'), -220 + i * 40 + rnd.range(-10, 10), -210 - rnd.range(0, 80));
    for (let i = 0; i < 10; i++) {
      const x = rnd.pick([-1, 1]) * rnd.range(64, 104);
      const z = -24 - rnd.range(0, 50);
      this.put(buildRoundTree(rnd, null), x, z, rnd.range(0, 6));
      this.world.circle(x, z, 0.8);
    }
  }

  /** The station: a platform south of the street, the track east–west, and the train. */
  private buildStation(): void {
    const k = new ModelKit();
    k.box(236, 0.25, 4, '#6f6a62', { position: [0, 0.12, 40] });
    for (let x = -116; x <= 116; x += 2.2) k.box(0.4, 0.14, 3.6, '#7a5a3a', { position: [x, 0.3, 40] });
    for (const s of [-1, 1]) k.box(236, 0.18, 0.18, '#3a3a3a', { position: [0, 0.45, 40 + s * 1] });
    // The platform and the station house.
    k.box(70, 0.9, 5, '#d9c7a4', { position: [50, 0.45, 34.5], pattern: Pattern.Stone });
    k.box(18, 4.2, 6, '#f2e2c2', { position: [44, 2.1, 28], pattern: Pattern.Brick });
    k.gable(20, 2.4, 8, '#b0352a', { position: [44, 5.4, 28], pattern: Pattern.RoofTiles });
    k.box(9, 1.2, 0.3, '#2d4f8f', { position: [44, 3.5, 31.2], nightGlow: 1 });
    for (const x of [26, 60, 74]) k.cylinder(0.14, 0.14, 3.6, 6, INK, { position: [x, 2.2, 35] });
    k.box(52, 0.2, 4, '#b0352a', { position: [50, 4, 35] });
    this.put(k.build(0.01), 0, 0);
    this.world.box(44, 28, 9, 3.2);
    this.world.box(50, 34.5, 35, 2.5);
    this.put(buildBench(), 34, 34, Math.PI);
    this.put(buildBench(), 66, 34, Math.PI);
  }

  private buildFallsAndLake(): void {
    const rnd = this.rnd;
    // The waterfall off the western cliffs.
    this.put(buildWaterfall(28), -92, -76, 0);
    this.world.box(-92, -72, 12, 5);
    this.put(buildHill(rnd.fork(99), 30, 34, 'jungle'), -110, -96);
    // The lakeside promenade with palms and stalls; the lake is the water beyond the quay.
    for (let x = -108; x <= 108; x += 16) {
      this.put(buildPalm(rnd), x + 5, 66);
      this.world.circle(x + 5, 66, 0.6);
    }
    for (let i = 0; i < 5; i++) {
      const x = -84 + i * 40;
      if (Math.abs(x) < 10) continue;
      this.put(i % 2 ? buildStall(rnd) : buildKiosk(rnd), x, 55, Math.PI);
      this.world.box(x, 55, 2.2, 1.8);
    }
    for (let x = -100; x <= 100; x += 26) this.put(buildFlowerBush(rnd), x, 50 + rnd.range(-1, 1));
    // A kicker by the lake, and boost pads along the street.
    const r = { x: -70, z: 50, heading: -Math.PI / 2, halfWidth: 4, halfLength: 3.5, power: 8, stunt: true, reach: 38 };
    this.world.ramps.push(r);
    this.put(new ModelKit().box(8, 2.2, 7.5, TEA, { position: [0, 0.3, 0], rotation: [0.32, 0, 0], pattern: Pattern.Tea }).box(8.4, 0.2, 0.4, '#f4d23b', { position: [0, 2.6, -3.6], nightGlow: 1 }).build(0), r.x, r.z, r.heading);
    const landX = r.x - Math.sin(r.heading) * r.reach;
    const landZ = r.z - Math.cos(r.heading) * r.reach;
    this.put(new ModelKit().cylinder(7, 7, 0.1, 24, '#f4d23b', { position: [0, 0.08, 0], nightGlow: 1 }).cylinder(5.5, 5.5, 0.12, 24, INK, { position: [0, 0.09, 0] }).build(0), landX, landZ);
    this.stunts.push({ id: 'hills-leap', name: 'Tea-bush leap', ramp: r, land: { x: landX, z: landZ, r: 9 } });
    for (const x of [-60, 60]) {
      this.world.pads.push({ x, z: 0, r: 2.4 });
      this.put(new ModelKit().box(5, 0.08, 4, '#3e9fd8', { position: [0, 0.07, 0], nightGlow: 1 }).box(2.6, 0.1, 0.8, '#f6f0e4', { position: [0, 0.1, 0], rotation: [0, Math.PI / 4, 0] }).build(0), x, 0);
    }
  }

  private buildZones(): void {
    // The painted gate to the Island Road Trip at the top of the estate road.
    const ch = CHAPTERS.find((c) => c.id === 'islandtrip') ?? CHAPTERS[CHAPTERS.length - 1];
    const gate = new ModelKit();
    for (const s of [-1, 1]) {
      gate.box(1.4, 11, 1.4, '#2d8a5a', { position: [s * 8, 5.5, 0] });
      gate.box(2, 0.6, 2, INK, { position: [s * 8, 11.2, 0] });
    }
    gate.box(17.4, 1.6, 1.2, '#f6f0e4', { position: [0, 10, 0] });
    for (let j = 0; j < 14; j++) {
      const a = (j / 14) * Math.PI * 2;
      gate.box(1.8, 0.35, 0.2, this.rnd.pick(['#2d8a5a', '#f4d23b', '#e0432f', '#3e86c9']), { position: [Math.cos(a) * 4, 5 + Math.sin(a) * 4, 0], rotation: [0, 0, a + Math.PI / 2], nightGlow: 1 });
    }
    this.put(gate.build(0.02), 0, -108);
    for (const s of [-1, 1]) this.world.circle(s * 8, -108, 0.9);
    this.zones.push({ kind: 'portal', label: `→ ${ch.name}`, x: 0, z: -104, r: 6, chapter: ch.id, colour: '#2d8a5a' });

    const shop = (kind: AreaZone['kind'], label: string, x: number, z: number, colour: string, roof: string, yaw: number): void => {
      const g = new ModelKit()
        .box(7, 4, 6, '#f6f0e4', { position: [0, 2, 0], pattern: Pattern.Brick })
        .gable(8, 2.2, 7, roof, { position: [0, 5.1, 0], pattern: Pattern.RoofTiles })
        .box(2.4, 3, 0.2, INK, { position: [0, 1.5, 3.02] })
        .box(3.2, 0.8, 0.25, '#ffe08a', { position: [0, 3.5, 3.1], nightGlow: 1 })
        .build(0.02);
      this.put(g, x, z, yaw);
      this.world.circle(x, z, 3.2);
      this.zones.push({ kind, label, x: x - Math.sign(x) * 6, z: z - Math.sign(z) * 6, r: 4.5, colour });
    };
    shop('garage', '🔧 Garage', 28, -26, '#f4d23b', '#2d4f8f', (-3 * Math.PI) / 4);
    shop('wardrobe', '👒 Wardrobe', -28, -26, '#e8559a', '#b0352a', (3 * Math.PI) / 4);
    shop('shop', '🧪 Shop', -28, 24, '#5dbb3f', '#2d8a5a', Math.PI / 4);
    shop('missions', '📋 Mission board', 28, 24, '#3e9fd8', '#7a3b2e', -Math.PI / 4);

    // The road back to Harbour Town at the west end of the street.
    const sign = new ModelKit()
      .box(0.3, 4, 0.3, '#7a5a3a', { position: [0, 2, 0] })
      .box(6, 1.4, 0.2, '#2f8f86', { position: [0, 4, 0], nightGlow: 1 })
      .box(0.8, 0.8, 0.25, '#f6f0e4', { position: [-2.4, 4, 0.05], rotation: [0, 0, Math.PI / 4] })
      .build(0.01);
    this.put(sign, -106, -9, Math.PI / 2);
    this.world.circle(-106, -9, 0.4);
    this.zones.push({ kind: 'area', label: '⚓ Harbour Town', x: -110, z: 0, r: 6, area: 'harbour', colour: '#2f8f86' });
    this.zones.push({ kind: 'launch', label: '✈ Paper plane', x: -82, z: 4, r: 4, colour: '#f6f0e4' });
    this.zones.push({ kind: 'viewpoint', label: '🌅 The Lakeside Bench', x: -20, z: 58, r: 2.6, colour: '#c9b8f0', view: { id: 'hl-lake', yaw: Math.PI, pitch: 0, lut: 'calm', name: 'The Lakeside Bench' } });

    this.murals.push(...addMuralBoards(this, 'hills', this.spawn));
    // Fishing spots, resting at home and DJ stages (see Leisure.ts).
    addLeisure(this, 'hills');
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

  /** The train (in and out of the station) and swan boats on the lake. */
  private buildMovers(): void {
    const tr = buildTrain(3);
    this.train = new THREE.Mesh(tr.geometry, this.material);
    this.train.rotation.y = Math.PI / 2;
    this.train.position.set(0, 0.5, 40);
    this.group.add(this.train);
    const swan = buildSwanBoat();
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(swan, this.material);
      m.position.set(-80 + i * 45, -AREA_Y + 0.3, 90 + (i % 2) * 14);
      this.swans.push(m);
      this.group.add(m);
    }
  }

  private buildFolk(): void {
    this.group.add(this.life.group);
    const rnd = new Random(1105);
    for (let i = 0; i < 18; i++) {
      // Tea pickers (every third) dress for the estate; everyone else as they like.
      const look = personOf('lanka', () => rnd.next(), i % 3 === 0 ? { age: 'adult', aids: false, faith: false } : {}).look;
      // Tea pickers in saris with baskets, and people in sarongs.
      if (i % 3 === 0) Object.assign(look, { topStyle: 'sari', top: rnd.pick(['#e8559a', '#f08a2e', '#3e86c9', '#5dbb3f']), back: 'satchel' });
      else if (i % 3 === 1) Object.assign(look, { bottomStyle: 'sarong', bottom: rnd.pick(['#2d4f8f', '#7a3b2e', '#2d8a5a']) });
      const model = new HumanModel(look);
      const p = this.randomSpot(rnd);
      this.group.add(model.root);
      this.life.add(model, look, p.x, p.z);
    }
  }

  private randomSpot(rnd: Random): { x: number; z: number } {
    const r = rnd.next();
    if (r < 0.45) return { x: rnd.range(-100, 100), z: rnd.range(-6, 6) };
    if (r < 0.65) return { x: rnd.range(-3, 3), z: rnd.range(-95, -20) };
    if (r < 0.85) return { x: rnd.range(-100, 100), z: rnd.range(58, 63) };
    return { x: rnd.range(28, 72), z: rnd.range(33, 36) };
  }

  title(): { kicker: string; name: string; poem: string } {
    return { kicker: t('hills.kicker'), name: t('hills.name'), poem: t('hills.poem') };
  }

  mapInfo(): MapInfo {
    return {
      id: this.id,
      name: t('hills.name'),
      bounds: { minX: -125, maxX: 125, minZ: -125, maxZ: 90 },
      regions: [
        { id: 'hills', name: t('hills.name'), rect: [-118, -118, 118, 68], colour: '#b9d98a', paint: 1 },
        { id: 'hills-terraces', name: 'Tea terraces', rect: [-100, -104, 100, -22], colour: '#7fb65a', paint: 1 },
      ],
      roads: [
        { x1: -118, z1: 0, x2: 118, z2: 0, w: 14 },
        { x1: 0, z1: -112, x2: 0, z2: 0, w: 10 },
        { x1: 0, z1: 0, x2: 0, z2: 34, w: 10 },
        { x1: -118, z1: 62, x2: 118, z2: 62, w: 10 },
        { x1: -118, z1: 40, x2: 118, z2: 40, w: 3 },
      ],
      water: [],
      seaZ: this.seaZ,
      blocks: [
        { x: 84, z: -84, w: 22, d: 12, colour: 'rgba(224,67,47,0.85)' },
        { x: 44, z: 28, w: 18, d: 6, colour: 'rgba(176,53,42,0.85)' },
        { x: -92, z: -72, w: 24, d: 10, colour: 'rgba(111,106,98,0.85)' },
      ],
    };
  }

  ambienceAt(x: number, z: number): { nature: number; coast: number; city: number; water: number; wind: number } {
    // The waterfall off the western cliffs roars as you get near.
    const falls = Math.max(0, 1 - Math.hypot(x + 92, z + 76) / 70);
    return { nature: z < -20 ? 0.9 : 0.55, coast: Math.min(1, Math.max(0.1, (z + 10) / 90)), city: 0.15, water: falls, wind: z < -60 ? 0.35 : 0.1 };
  }

  dynamicBodies(): { x: number; z: number; r: number }[] {
    if (!this.train) return [];
    // The train blocks the crossing while it passes.
    return [{ x: this.train.position.x, z: 40, r: 3 }];
  }

  zoneLabel(z: AreaZone): string {
    const leisure = leisureLabel(z);
    if (leisure) return leisure;
    if (z.kind === 'viewpoint' && z.view) return `🌅 ${t(`view.${z.view.id}` as StringKey)}`;
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
    // The train: waits at the platform, then runs east and back again (a 70-second loop).
    if (this.train) {
      const cyc = (time % 70) / 70;
      const x = cyc < 0.3 ? 40 : cyc < 0.5 ? 40 + ((cyc - 0.3) / 0.2) * 200 : cyc < 0.7 ? 240 - ((cyc - 0.5) / 0.2) * 440 : -200 + ((cyc - 0.7) / 0.3) * 240;
      this.train.position.x = x - 30;
      this.train.visible = Math.abs(x - 30) < 150;
    }
    this.swans.forEach((s, i) => {
      s.position.x += Math.sin(time * 0.1 + i) * dt * 1.2;
      s.rotation.y = Math.sin(time * 0.1 + i) > 0 ? Math.PI / 2 : -Math.PI / 2;
      s.position.y = -AREA_Y + 0.3 + Math.sin(time * 1.3 + i) * 0.08;
    });
    this.life.update(dt, time, player, this.world);
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

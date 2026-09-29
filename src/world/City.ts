import { buildBuddhistTemple, buildChurch, buildKodimaram, buildRedMosque } from '../models/LandmarksFaith';
import { buildGopuram } from '../models/LandmarksIndia';
import { addLeisure, leisureLabel } from './Leisure';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { addMuralBoards, type MuralBoard } from './Murals';
import { addPockets, type PlacedPocket } from './Pockets';
import { Random } from '../core/Random';
import { ModelKit, Pattern } from '../models/ModelKit';
import { PaintMaterial } from '../render/PaintMaterial';
import { buildHouse } from '../models/Buildings';
import { buildBench, buildLamp, buildLighthouse, buildPaperBoat } from '../models/Props';
import { buildBin, buildFountain, buildBuntingLine } from '../models/StreetProps';
import { buildBush, buildFlowerBush, buildHill, buildPalm, buildRoundTree, buildCypress } from '../models/Nature';
import { buildCabana, buildElephant, buildLotusTower, buildOruwa, buildStupa, buildTukTukProp } from '../models/LandmarksSriLanka';
import { buildBillboard, buildBusStop, buildChest, buildCrossing, buildFoodCart, buildMarketUmbrella, buildPaintPot, buildParkedCar, buildSkyscraper, buildStatue, buildTrafficLight } from '../models/CityProps';
import { HumanModel } from '../models/Human';
import { personOf } from './Peoples';
import { VEHICLES, VehicleModel } from '../models/Vehicles';
import { FreeWalker, FreeWorld } from '../gameplay/FreeRoam';
import { PALETTE } from '../gameplay/Profile';
import { AREA_Y, type AreaZone, type Chest, type DynamicBody, type FreeRoamArea, type Place, type Secret, type StuntJump } from './FreeRoamArea';
import { t, type StringKey } from '../core/i18n';
import { paintShared } from '../render/PaintMaterial';
import { CITY_DISTRICTS, type District } from '../gameplay/Restoration';
import type { MapInfo } from '../ui/MapView';
import { Perahera } from './Perahera';

/** Road grid lines (centre lines, metres). */
/**
 * Places of worship in downtown Colombo, each on a block of its own (downtown blocks
 * use their own random numbers, so the rest of the city stays as it was).
 */
const FAITH_BLOCKS = [
  { i: 5, j: 3, kind: 'mosque', name: 'the Red Mosque' },
  { i: 5, j: 2, kind: 'kovil', name: 'the kovil' },
  { i: 3, j: 4, kind: 'church', name: 'the old church' },
  { i: 2, j: 5, kind: 'temple', name: 'the city temple' },
] as const;

export const CITY_X = [-620, -460, -340, -220, -100, 20, 140, 260, 380, 500, 620];
export const CITY_Z = [-560, -460, -340, -220, -100, 20, 140, 260, 380, 480];
const ROAD = 16;
/** Four-lane avenues with a palm median: the Galle Road (x = 140), the Baseline Road (z = -100) and Marine Drive along the coast (z = 480). */
const WIDE = 28;
const AVENUES_X: readonly number[] = [140];
const AVENUES_Z: readonly number[] = [-100, 480];
/** Width of the grid road running north-south at `x`. */
export const roadWidthX = (x: number): number => (AVENUES_X.includes(x) ? WIDE : ROAD);
/** Width of the grid road running east-west at `z`. */
export const roadWidthZ = (z: number): number => (AVENUES_Z.includes(z) ? WIDE : ROAD);
/**
 * The ring road round the whole city (about 5.4 km with the coast highway),
 * two lanes wide, through the countryside beyond the grid. It meets the grid
 * at both ends of Marine Drive and the Baseline Road, and two roads climb
 * through the tea hills to its northern side.
 */
export const RING = { minX: -740, maxX: 740, minZ: -790, maxZ: 480, w: 20 } as const;
/** Extra straight road pieces beyond the grid: [x1, z1, x2, z2, width]. */
const OUTER_ROADS: [number, number, number, number, number][] = [
  // The ring (the south side is Marine Drive, extended below).
  [RING.minX, RING.minZ, RING.maxX, RING.minZ, RING.w],
  [RING.minX, RING.minZ, RING.minX, RING.maxZ, RING.w],
  [RING.maxX, RING.minZ, RING.maxX, RING.maxZ, RING.w],
  // Marine Drive and the Baseline Road carried out to the ring as four-lane highways.
  [RING.minX, 480, -628, 480, WIDE],
  [628, 480, RING.maxX, 480, WIDE],
  [RING.minX, -100, -628, -100, WIDE],
  [628, -100, RING.maxX, -100, WIDE],
  // Up through the tea hills to the northern ring.
  [-460, RING.minZ, -460, -568, ROAD],
  [380, RING.minZ, 380, -568, ROAD],
];

/** Stunt ramps: id, name, x, z, heading, launch power, metres to the landing. */
const STUNT_RAMPS: [string, string, number, number, number, number, number][] = [
  ['stunt-bus', 'Over the bus', -520, 420, 0, 9, 48],
  ['stunt-gap', 'Big gap', -420, 200, Math.PI / 2, 11, 60],
  ['stunt-lake', 'Lake leap', 420, -300, -Math.PI / 2, 20, 150],
  ['stunt-plaza', 'Lotus loop', -100, -60, Math.PI, 8, 48],
  ['stunt-pier', 'Beach kicker', 120, 470, Math.PI / 2, 9, 48],
  ['stunt-hill', 'Hill hop', -300, -540, Math.PI / 2, 10, 48],
];

/** On a stunt's line: the run-up, the flight and the landing pad stay clear of lamps and posts. */
function inStuntLane(x: number, z: number, pad = 0): boolean {
  for (const [, , rx, rz, h, , reach] of STUNT_RAMPS) {
    const fx = -Math.sin(h);
    const fz = -Math.cos(h);
    const along = (x - rx) * fx + (z - rz) * fz;
    const across = Math.abs((x - rx) * -fz + (z - rz) * fx);
    if (along > -70 - pad && along < reach + 12 + pad && across < 7 + pad) return true;
  }
  return false;
}
const WALLS = ['#f4e3c8', '#f2c6b4', '#e9b8c8', '#cfe3d6', '#f6f0e4', '#f7d9a8', '#d8d4ec', '#bfd9e8', '#f0c9a0'];

type Region = 'downtown' | 'oldtown' | 'park' | 'stunt' | 'suburb' | 'hills' | 'beach';

interface TrafficCar {
  model: VehicleModel;
  loop: { x: number; z: number }[];
  seg: number;
  t: number;
  speed: number;
  x: number;
  z: number;
  heading: number;
}

interface Walker {
  model: HumanModel;
  body: FreeWalker;
  target: { x: number; z: number };
  wait: number;
}

/**
 * Serendib City (docs/04 §3 "hubs", scaled up to an open world): about 1.3 km
 * across. A downtown of glass towers around a Lotus Tower plaza; an old town
 * with a market and bunting; a park with a lake; a stunt park; suburbs; the
 * beach with a pier and lighthouse; tea hills with a stupa to the north.
 * A full road grid with traffic, pedestrians, secrets, loot chests, stunt
 * jumps, boost pads, and places for mission chains.
 */
export class City implements FreeRoamArea {
  readonly id = 'city';
  readonly group = new THREE.Group();
  readonly world = new FreeWorld({ minX: RING.minX - 30, maxX: RING.maxX + 30, minZ: RING.minZ - 30, maxZ: 548 });
  readonly murals: MuralBoard[] = [];
  readonly pockets: PlacedPocket[] = [];
  readonly seaZ = 550;
  readonly zones: AreaZone[] = [];
  readonly spawn = { x: -100, z: 470, heading: 0 };
  readonly secrets: Secret[] = [];
  readonly chests: Chest[] = [];
  readonly stunts: StuntJump[] = [];
  readonly places: Place[] = [];
  private readonly rnd = new Random(7_2026);
  private readonly material = new PaintMaterial({ vertexColors: true, flat: true, washable: true });
  readonly districts: District[] = CITY_DISTRICTS;
  /** The night perahera walks a loop around Pettah's streets (in the lanes, clear of the avenue medians). */
  readonly perahera = new Perahera([
    { x: 147, z: -334 },
    { x: 374, z: -334 },
    { x: 374, z: -107 },
    { x: 147, z: -107 },
  ]);
  private readonly merged: THREE.BufferGeometry[] = [];
  private readonly instances = new Map<string, { geo: THREE.BufferGeometry; mats: THREE.Matrix4[]; shadow: boolean }>();
  private readonly nm = new THREE.Matrix3();
  private readonly traffic: TrafficCar[] = [];
  private readonly walkers: Walker[] = [];
  private readonly labels: HTMLDivElement[] = [];
  private readonly rings: THREE.Mesh[] = [];
  private labelLang = '';
  private readonly v = new THREE.Vector3();

  constructor(private readonly labelLayer: HTMLElement) {
    this.group.name = 'city';
    this.group.position.y = AREA_Y;
    this.buildGround();
    this.buildRoads();
    this.buildOuterRoads();
    this.buildCountryside();
    this.buildBlocks();
    this.buildBeach();
    this.buildHills();
    this.buildLandmarks();
    this.buildStuntPark();
    this.buildContent();
    this.flush();
    this.buildTraffic();
    this.buildWalkers();
    this.buildZones();
    this.group.add(this.perahera.group);
    this.places.push(
      { id: 'beach', name: 'Galle Face Beach', x: -300, z: 505 },
      { id: 'pier', name: 'the pier', x: 300, z: 560 },
      { id: 'suburbs', name: 'Cinnamon Gardens', x: 260, z: 320 },
      { id: 'westgardens', name: 'West Gardens', x: -560, z: -200 },
      { id: 'teahills', name: 'the tea hills', x: -300, z: -585 },
      { id: 'elephants', name: 'the elephant grove', x: 435, z: -372 },
    );
    this.group.visible = false;
  }

  // ————— placement —————

  /** Add a unique piece (merged with other unique pieces). */
  private merge(geometry: THREE.BufferGeometry, x: number, z: number, yaw = 0, y = 0, scale = 1): void {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(_up, yaw), new THREE.Vector3(scale, scale, scale));
    const g = geometry.clone().applyMatrix4(m);
    const sn = g.getAttribute('smoothNormal') as THREE.BufferAttribute | undefined;
    if (sn) sn.applyNormalMatrix(this.nm.getNormalMatrix(m));
    this.merged.push(g);
  }

  /** Add an instance of a repeated model (one draw call per variant). */
  private inst(key: string, make: () => THREE.BufferGeometry, x: number, z: number, yaw = 0, y = 0, scale: number | THREE.Vector3 = 1, shadow = true): void {
    let bucket = this.instances.get(key);
    if (!bucket) {
      bucket = { geo: make(), mats: [], shadow };
      this.instances.set(key, bucket);
    }
    const s = typeof scale === 'number' ? new THREE.Vector3(scale, scale, scale) : scale;
    bucket.mats.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(_up, yaw), s));
  }

  private flush(): void {
    // Unique pieces, merged by 200 m tiles so frustum culling still helps.
    const tiles = new Map<string, THREE.BufferGeometry[]>();
    for (const g of this.merged) {
      g.computeBoundingSphere();
      const c = g.boundingSphere!.center;
      const key = `${Math.floor(c.x / 200)},${Math.floor(c.z / 200)}`;
      if (!tiles.has(key)) tiles.set(key, []);
      tiles.get(key)!.push(g);
    }
    for (const list of tiles.values()) {
      const m = mergeGeometries(list, false);
      if (!m) continue;
      m.computeBoundingSphere();
      const mesh = new THREE.Mesh(m, this.material);
      mesh.castShadow = mesh.receiveShadow = true;
      this.group.add(mesh);
      for (const g of list) g.dispose();
    }
    for (const b of this.instances.values()) {
      const mesh = new THREE.InstancedMesh(b.geo, this.material, b.mats.length);
      b.mats.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.computeBoundingSphere();
      mesh.castShadow = b.shadow;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
  }

  private region(x: number, z: number): Region {
    if (z > 480) return 'beach';
    if (Math.abs(x) > 640 || z < -600) return 'hills';
    if (z < -560) return 'hills';
    if (x >= -460 && x <= 140 && z >= -460 && z <= 140) return 'downtown';
    if (x > 140 && x <= 380 && z >= -460 && z <= 140) return 'oldtown';
    if (x > 380 && z < 20) return 'park';
    if (x < -340 && z > 140) return 'stunt';
    return 'suburb';
  }

  // ————— terrain and roads —————

  private buildGround(): void {
    const k = new ModelKit();
    const w = RING.maxX - RING.minX + 120;
    const zTop = RING.minZ - 60;
    k.box(w, 4, 554 - zTop, '#8cc36a', { position: [0, -2.02, (554 + zTop) / 2], pattern: Pattern.Grass });
    k.box(w + 2, 3.6, 70, '#ecd7a6', { position: [0, -2.2, 515] }); // beach sand
    this.merge(k.build(0), 0, 0);
    // Quay/sea wall at the south edge, and the lake in the park.
    this.merge(new ModelKit().box(RING.maxX - RING.minX + 122, AREA_Y + 3, 2, '#c9b58e', { position: [0, -(AREA_Y + 3) / 2 + 0.1, 0], pattern: Pattern.Stone }).build(0), 0, 550);
    this.merge(new ModelKit().cylinder(70, 72, 0.3, 40, '#2f8fb8', { position: [0, 0.05, 0], pattern: Pattern.Glass }).cylinder(74, 74, 0.2, 40, '#d9c7a4', { position: [0, 0.02, 0] }).build(0), 500, -300);
    this.world.circle(500, -300, 70, 0.6); // low: the Lake leap flies over it
    this.places.push({ id: 'lake', name: 'the lake', x: 500, z: -210 });
  }

  private buildRoads(): void {
    const asphalt = '#5d5a66';
    const k = new ModelKit();
    const zMin = CITY_Z[0];
    const zMax = CITY_Z[CITY_Z.length - 1];
    const xMin = CITY_X[0];
    const xMax = CITY_X[CITY_X.length - 1];
    for (const x of CITY_X) {
      const w = roadWidthX(x);
      k.box(w, 0.06, zMax - zMin + ROAD, asphalt, { position: [x, 0.03, (zMin + zMax) / 2] });
      for (const s of [-1, 1]) k.box(3, 0.18, zMax - zMin, '#e4dccb', { position: [x + s * (w / 2 + 1.5), 0.09, (zMin + zMax) / 2] });
    }
    for (const z of CITY_Z) {
      const w = roadWidthZ(z);
      k.box(xMax - xMin + ROAD, 0.07, w, asphalt, { position: [(xMin + xMax) / 2, 0.035, z] });
      for (const s of [-1, 1]) k.box(xMax - xMin, 0.19, 3, '#e4dccb', { position: [(xMin + xMax) / 2, 0.095, z + s * (w / 2 + 1.5)] });
    }
    this.merge(k.build(0), 0, 0);
    // Lane dashes (instanced): one centre line, or two lane lines each side of an avenue's median.
    const dashes = (w: number): number[] => (w === WIDE ? [-7, 7] : [0]);
    const dash = (): THREE.BufferGeometry => new ModelKit().box(0.3, 0.02, 3.5, '#f6f0e4', { position: [0, 0.08, 0] }).build(0);
    for (const x of CITY_X) for (let z = zMin + 12; z < zMax - 8; z += 12) if (!CITY_Z.some((cz) => Math.abs(cz - z) < roadWidthZ(cz) / 2 + 2)) for (const o of dashes(roadWidthX(x))) this.inst('dash', dash, x + o, z, 0, 0, 1, false);
    for (const z of CITY_Z) for (let x = xMin + 12; x < xMax - 8; x += 12) if (!CITY_X.some((cx) => Math.abs(cx - x) < roadWidthX(cx) / 2 + 2)) for (const o of dashes(roadWidthZ(z))) this.inst('dash', dash, x, z + o, Math.PI / 2, 0, 1, false);
    // Palm medians down the avenues, broken at every junction.
    for (const x of AVENUES_X) this.median(x, zMin, zMax, 'z', CITY_Z.map((z) => [z, roadWidthZ(z)]));
    for (const z of AVENUES_Z) this.median(z, xMin, xMax, 'x', CITY_X.map((x) => [x, roadWidthX(x)]));
    for (const x of CITY_X) for (const z of CITY_Z) {
      if (this.region(x, z) !== 'downtown' && this.region(x, z) !== 'oldtown') continue;
      const wx = roadWidthX(x);
      const wz = roadWidthZ(z);
      this.inst(`crossing${wx}`, () => buildCrossing(wx), x, z - wz / 2 - 1.8, 0, 0, 1, false);
      this.inst(`crossing${wz}`, () => buildCrossing(wz), x - wx / 2 - 1.8, z, Math.PI / 2, 0, 1, false);
      this.inst('trafficlight', buildTrafficLight, x + wx / 2 + 2.5, z + wz / 2 + 2.5, Math.PI);
      this.world.circle(x + wx / 2 + 2.5, z + wz / 2 + 2.5, 0.3);
    }
    // Street lamps down every road, both sides.
    const rnd = this.rnd;
    for (const x of CITY_X) for (let z = zMin + 20; z < zMax; z += 36) for (const s of [-1, 1]) {
      const lx = x + s * (roadWidthX(x) / 2 + 2.6);
      if (CITY_Z.some((cz) => Math.abs(cz - z) < roadWidthZ(cz) / 2 + 4) || inStuntLane(lx, z)) continue;
      this.inst('lamp', () => buildLamp(new Random(3)), lx, z, s > 0 ? -Math.PI / 2 : Math.PI / 2);
      this.world.circle(lx, z, 0.3);
    }
    for (const z of CITY_Z) for (let x = xMin + 20; x < xMax; x += 36) {
      const lz = z - (roadWidthZ(z) / 2 + 2.6);
      if (CITY_X.some((cx) => Math.abs(cx - x) < roadWidthX(cx) / 2 + 4) || inStuntLane(x, lz)) continue;
      this.inst('lamp', () => buildLamp(new Random(3)), x, lz, 0);
      this.world.circle(x, lz, 0.3);
      if (rnd.chance(0.25)) this.inst('bin', buildBin, x + 3, lz - 0.2);
    }
    // Boost pads on the long avenues.
    for (const [x, z, yaw] of [[-340, 300, 0], [147, -280, 0], [-160, 487, Math.PI / 2], [260, 487, Math.PI / 2], [620, -120, 0], [-620, -200, 0], [380, -500, 0], [-460, -160, 0], [20, 380, 0], [500, 200, 0], [-40, -560, Math.PI / 2], [300, 20, Math.PI / 2]] as [number, number, number][]) {
      this.world.pads.push({ x, z, r: 2.8 });
      this.inst('pad', padGeo, x, z, yaw, 0, 1, false);
    }
  }

  /**
   * A grassy median with palms down the middle of an avenue: along `axis`
   * ('z' = the road runs north-south at x = `at`), from `from` to `to`,
   * with gaps where the cross streets `[centre, width]` meet it.
   */
  private median(at: number, from: number, to: number, axis: 'x' | 'z', cross: [number, number][]): void {
    const gaps = cross.map(([c, w]) => [c - w / 2 - 6, c + w / 2 + 6]);
    let a = from;
    const pieces: [number, number][] = [];
    for (const [g0, g1] of [...gaps, [to, to]].sort((p, q) => p[0] - q[0])) {
      if (g0 > a + 4) pieces.push([a, Math.min(g0, to)]);
      a = Math.max(a, g1);
    }
    const k = new ModelKit();
    for (const [p0, p1] of pieces) {
      const len = p1 - p0;
      const mid = (p0 + p1) / 2;
      const [x, z] = axis === 'z' ? [at, mid] : [mid, at];
      const [sx, sz] = axis === 'z' ? [2.6, len] : [len, 2.6];
      k.box(sx + 0.4, 0.26, sz + 0.4, '#e4dccb', { position: [x, 0.13, z] });
      k.box(sx, 0.3, sz, '#7fb85a', { position: [x, 0.16, z], pattern: Pattern.Grass });
      for (let q = p0 + 8; q < p1 - 4; q += 24) {
        const [px, pz] = axis === 'z' ? [at, q] : [q, at];
        if (inStuntLane(px, pz, 1)) continue;
        this.inst(`mpalm${Math.abs(Math.round(q)) % 3}`, () => buildPalm(new Random(40 + (Math.abs(Math.round(q)) % 3))), px, pz, (q * 0.37) % 6, 0.3);
        this.world.circle(px, pz, 0.7);
      }
    }
    if (!k.isEmpty) this.merge(k.build(0), 0, 0);
  }

  /** The ring road, the coast highway and the roads that join them to the grid. */
  private buildOuterRoads(): void {
    const k = new ModelKit();
    const dash = (): THREE.BufferGeometry => new ModelKit().box(0.3, 0.02, 3.5, '#f6f0e4', { position: [0, 0.08, 0] }).build(0);
    for (const [x1, z1, x2, z2, w] of OUTER_ROADS) {
      const alongZ = x1 === x2;
      const len = Math.abs(alongZ ? z2 - z1 : x2 - x1);
      const cx = (x1 + x2) / 2;
      const cz = (z1 + z2) / 2;
      // Run the asphalt half a width past each end so corners and joins are filled.
      k.box(alongZ ? w : len + w, 0.065, alongZ ? len + w : w, '#5d5a66', { position: [cx, 0.032, cz] });
      for (const s of [-1, 1]) k.box(alongZ ? 1.2 : len, 0.14, alongZ ? len : 1.2, '#e4dccb', { position: [cx + (alongZ ? s * (w / 2 + 0.6) : 0), 0.07, cz + (alongZ ? 0 : s * (w / 2 + 0.6))] });
      const lanes = w === WIDE ? [-7, 7] : [0];
      const lo = Math.min(alongZ ? z1 : x1, alongZ ? z2 : x2);
      for (let q = lo + 10; q < lo + len - 6; q += 12) for (const o of lanes) this.inst('dash', dash, alongZ ? x1 + o : q, alongZ ? q : z1 + o, alongZ ? 0 : Math.PI / 2, 0, 1, false);
      if (w === WIDE) this.median(alongZ ? x1 : z1, lo, lo + len, alongZ ? 'z' : 'x', alongZ ? [] : [[RING.minX, RING.w], [RING.maxX, RING.w]]);
      // Lamps every 48 m on one side; boost pads on the long straights.
      for (let q = lo + 24; q < lo + len - 12; q += 48) {
        const lx = alongZ ? x1 + (w / 2 + 2.4) : q;
        const lz = alongZ ? q : z1 - (w / 2 + 2.4);
        this.inst('lamp', () => buildLamp(new Random(3)), lx, lz, alongZ ? -Math.PI / 2 : 0);
        this.world.circle(lx, lz, 0.3);
      }
      if (len > 1000) for (const t of [0.3, 0.7]) {
        const q = lo + len * t;
        const px = alongZ ? x1 - 4 : q;
        const pz = alongZ ? q : z1 + 4;
        this.world.pads.push({ x: px, z: pz, r: 2.8 });
        this.inst('pad', padGeo, px, pz, alongZ ? 0 : Math.PI / 2, 0, 1, false);
      }
    }
    this.merge(k.build(0), 0, 0);
    this.places.push(
      { id: 'ringnorth', name: 'the northern ring road', x: 0, z: RING.minZ },
      { id: 'coasthighway', name: 'the coast highway', x: RING.maxX - 60, z: 480 },
    );
  }

  /** Country between the grid and the ring: paddy fields, coconut groves, a roadside stall. */
  private buildCountryside(): void {
    const rnd = new Random(8_2026);
    const onRoad = (x: number, z: number, pad: number): boolean =>
      OUTER_ROADS.some(([x1, z1, x2, z2, w]) => x >= Math.min(x1, x2) - w / 2 - pad && x <= Math.max(x1, x2) + w / 2 + pad && z >= Math.min(z1, z2) - w / 2 - pad && z <= Math.max(z1, z2) + w / 2 + pad);
    // Paddy fields in the west and east bands.
    const paddy = (): THREE.BufferGeometry => new ModelKit().box(34, 0.5, 30, '#7a6a4a', { position: [0, 0.25, 0] }).box(32.6, 0.12, 28.6, '#8fc0b0', { position: [0, 0.5, 0], pattern: Pattern.Glass }).box(30, 0.3, 26, '#7fbf4a', { position: [0, 0.62, 0], pattern: Pattern.Grass }).build(0);
    for (const side of [-1, 1]) for (let z = -520; z < 440; z += 38) {
      if (Math.abs(z + 100) < 30) continue; // the Baseline Road
      const x = side * 685;
      if (!onRoad(x, z, 3)) this.inst('paddy', paddy, x, z, 0, 0, 1, false);
    }
    // Coconut palms along the ring road, both sides.
    const palm = (i: number): THREE.BufferGeometry => buildPalm(new Random(60 + i));
    for (const [x1, z1, x2, z2, w] of OUTER_ROADS) {
      if (w !== RING.w) continue;
      const alongZ = x1 === x2;
      const lo = Math.min(alongZ ? z1 : x1, alongZ ? z2 : x2);
      const hi = Math.max(alongZ ? z1 : x1, alongZ ? z2 : x2);
      for (let q = lo + 14; q < hi - 10; q += rnd.range(14, 26)) for (const s of [-1, 1]) {
        const off = s * (w / 2 + rnd.range(5, 14));
        const x = alongZ ? x1 + off : q;
        const z = alongZ ? q : z1 + off;
        if (onRoad(x, z, 2) || Math.abs(x) > RING.maxX + 25 || z < RING.minZ - 25) continue;
        const i = Math.floor(rnd.next() * 3);
        this.inst(`cpalm${i}`, () => palm(i), x, z, rnd.range(0, 6));
        this.world.circle(x, z, 0.7);
      }
    }
    // A king-coconut stall with tuk-tuks at the Baseline Road junction on each side.
    for (const side of [-1, 1]) {
      const x = side * (RING.maxX - 26);
      const z = -100 - 26;
      this.inst('foodcart', () => buildFoodCart(new Random(2)), x, z, side > 0 ? -Math.PI / 2 : Math.PI / 2);
      this.world.box(x, z, 0.8, 1.4);
      this.inst('tuktuk0', () => buildTukTukProp('#2f8f86'), x + side * 5, z - 6, 0);
    }
    this.places.push({ id: 'paddies', name: 'the paddy fields', x: -685, z: 200 });
  }

  // ————— city blocks —————

  private buildBlocks(): void {
    const rnd = this.rnd;
    const houses = Array.from({ length: 14 }, (_, i) => buildHouse(new Random(900 + i), WALLS[i % WALLS.length], (['townhouse', 'narrow', 'shop', 'townhouse', 'wooden', 'colonial'] as const)[i % 6]));
    for (let i = 0; i < CITY_X.length - 1; i++) {
      for (let j = 0; j < CITY_Z.length - 1; j++) {
        const x0 = CITY_X[i] + roadWidthX(CITY_X[i]) / 2 + 4;
        const x1 = CITY_X[i + 1] - roadWidthX(CITY_X[i + 1]) / 2 - 4;
        const z0 = CITY_Z[j] + roadWidthZ(CITY_Z[j]) / 2 + 4;
        const z1 = CITY_Z[j + 1] - roadWidthZ(CITY_Z[j + 1]) / 2 - 4;
        const cx = (x0 + x1) / 2;
        const cz = (z0 + z1) / 2;
        const region = this.region(cx, cz);
        // Pavement slab for built-up blocks.
        if (region === 'downtown' || region === 'oldtown') this.merge(new ModelKit().box(x1 - x0 + 6, 0.2, z1 - z0 + 6, '#ddd3c2', { position: [0, 0.1, 0], pattern: Pattern.Stone }).build(0), cx, cz);
        const faith = FAITH_BLOCKS.find((b) => b.i === i && b.j === j);
        if (faith) this.faithBlock(faith, cx, cz);
        else if (region === 'downtown') this.downtownBlock(x0, x1, z0, z1, i * 31 + j);
        else if (region === 'oldtown') this.rowBlock(houses, x0, x1, z0, z1, true);
        else if (region === 'suburb') {
          if (rnd.chance(0.55)) this.rowBlock(houses, x0, x1, z0, z1, false);
          else this.parkBlock(x0, x1, z0, z1, rnd.chance(0.3));
        } else if (region === 'park') this.parkBlock(x0, x1, z0, z1, false);
      }
    }
  }

  /** A place of worship on its own block, with a forecourt and shade trees. */
  private faithBlock(b: (typeof FAITH_BLOCKS)[number], cx: number, cz: number): void {
    const [geo, hx, hz, scale] =
      b.kind === 'mosque' ? [buildRedMosque(), 16, 12, 1.2] : b.kind === 'kovil' ? [buildGopuram(new Random(31)), 14, 9, 1.1] : b.kind === 'church' ? [buildChurch('colonial'), 9, 17, 1.2] : [buildBuddhistTemple(), 20, 17, 1.1];
    // Facing the street to the south (+z).
    this.merge(geo, cx, cz, Math.PI, 0, scale);
    this.world.box(cx, cz, hx * scale, hz * scale);
    if (b.kind === 'kovil') {
      this.merge(buildKodimaram(), cx, cz + 16, 0, 0, 1);
      this.world.circle(cx, cz + 16, 1.6);
    }
    for (const [dx, dz] of [[-36, -30], [36, -30], [-36, 30], [36, 30]]) {
      this.inst('ftree', () => buildRoundTree(new Random(61), null, true), cx + dx, cz + dz);
      this.world.circle(cx + dx, cz + dz, 1);
    }
    this.places.push({ id: `faith-${b.kind}`, name: b.name, x: cx, z: cz + 40 });
  }

  private downtownBlock(x0: number, x1: number, z0: number, z1: number, seed: number): void {
    const rnd = new Random(seed * 97 + 5);
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    // The Lotus Tower plaza sits in the middle of downtown.
    if (Math.abs(cx - -160) < 50 && Math.abs(cz - -160) < 50) return;
    if (rnd.chance(0.14)) {
      // A pocket plaza: fountain, benches, statue, trees.
      this.inst('fountain', buildFountain, cx, cz, 0, 0, 2.2);
      this.world.circle(cx, cz, 5);
      this.inst(`statue`, () => buildStatue(new Random(4)), cx + 28, cz - 28, rnd.range(0, 6));
      this.world.circle(cx + 28, cz - 28, 2);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        this.inst(`ptree${k % 3}`, () => buildRoundTree(new Random(50 + (k % 3)), null, true), cx + Math.cos(a) * 20, cz + Math.sin(a) * 20, a);
        this.world.circle(cx + Math.cos(a) * 20, cz + Math.sin(a) * 20, 1);
      }
      return;
    }
    // Four towers per block (2 × 2), heights rising toward the centre of downtown.
    const centre = 1 - Math.min(1, Math.hypot(cx + 160, cz + 160) / 420);
    for (const [fx, fz] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
      const w = rnd.range(26, 38);
      const d = rnd.range(26, 38);
      const h = rnd.range(24, 50) + centre * rnd.range(30, 90);
      const x = x0 + (x1 - x0) * fx;
      const z = z0 + (z1 - z0) * fz;
      const variant = `tower${Math.floor(rnd.next() * 10)}`;
      const ref = new Random(Number(variant.slice(5)) + 400);
      // Towers are built at unit size per variant and scaled: fewer unique geometries.
      this.inst(variant, () => buildSkyscraper(ref, 30, 60, 30), x, z, rnd.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]), 0, new THREE.Vector3(w / 30, h / 60, d / 30));
      this.world.box(x, z, w / 2, d / 2);
    }
    // Street furniture around the block edge.
    this.inst('busstop', () => buildBusStop(new Random(8)), x0 + 12, z1 + 3.5, Math.PI);
    this.world.box(x0 + 12, z1 + 3.5, 2.1, 1);
    if (rnd.chance(0.5)) {
      this.inst(`bill${seed % 3}`, () => buildBillboard(new Random(seed % 3)), x1 - 6, z0 - 1, rnd.chance(0.5) ? 0 : Math.PI);
      for (const s of [-3, 3]) this.world.circle(x1 - 6 + s, z0 - 1, 0.4);
    }
    if (rnd.chance(0.6)) {
      const pc = `pcar${seed % 5}`;
      this.inst(pc, () => buildParkedCar(new Random(seed % 5)), x1 + 2.2, (z0 + z1) / 2, 0);
      this.world.box(x1 + 2.2, (z0 + z1) / 2, 1.1, 2.2);
    }
  }

  /** Houses along all four edges of a block, facing the streets; a courtyard of trees inside. */
  private rowBlock(houses: ReturnType<typeof buildHouse>[], x0: number, x1: number, z0: number, z1: number, market: boolean): void {
    const rnd = this.rnd;
    const edge = (along: 'x' | 'z', fixed: number, from: number, to: number, facing: number): void => {
      let p = from;
      while (p < to) {
        const hi = Math.floor(rnd.next() * houses.length);
        const h = houses[hi];
        if (p + h.width > to) break;
        const c = p + h.width / 2;
        const inward = h.depth / 2;
        const pad = Math.max(h.width, h.depth) / 2;
        if (along === 'x' ? inStuntLane(c, fixed + (facing === 0 ? -inward : inward), pad) : inStuntLane(fixed + (facing === Math.PI / 2 ? -inward : inward), c, pad)) {
          // A gap in the row where a stunt jump runs through.
        } else if (along === 'x') {
          const z = fixed + (facing === 0 ? -inward : inward);
          this.inst(`house${hi}`, () => h.geometry, c, z, facing);
          this.world.box(c, z, h.width / 2, h.depth / 2);
        } else {
          const x = fixed + (facing === Math.PI / 2 ? -inward : inward);
          this.inst(`house${hi}`, () => h.geometry, x, c, facing);
          this.world.box(x, c, h.depth / 2, h.width / 2);
        }
        p += h.width + rnd.range(0.3, 1.5);
      }
    };
    // Fronts face +Z in the model: yaw 0 faces +Z (south street), π faces north, ±π/2 east/west.
    edge('x', z1, x0 + 10, x1 - 10, 0);
    edge('x', z0, x0 + 10, x1 - 10, Math.PI);
    edge('z', x1, z0 + 10, z1 - 10, Math.PI / 2);
    edge('z', x0, z0 + 10, z1 - 10, -Math.PI / 2);
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    for (let k = 0; k < 5; k++) {
      const x = cx + rnd.range(-18, 18);
      const z = cz + rnd.range(-18, 18);
      if (inStuntLane(x, z, 1.2)) continue;
      this.inst(`ctree${k % 3}`, () => buildRoundTree(new Random(70 + (k % 3)), k % 2 ? '#f4d23b' : null), x, z, rnd.range(0, 6));
      this.world.circle(x, z, 1.2);
    }
    if (market) {
      // Market street life outside the block: umbrellas, food carts, tuk-tuks, bunting.
      for (let k = 0; k < 4; k++) {
        const x = x0 + 16 + k * ((x1 - x0 - 32) / 3);
        this.inst(`umbrella${k % 3}`, () => buildMarketUmbrella(new Random(k % 3)), x, z1 + 4.5, 0);
        this.world.circle(x, z1 + 4.5, 1.2);
      }
      this.inst('foodcart', () => buildFoodCart(new Random(2)), x1 + 3.5, cz, Math.PI / 2);
      this.world.box(x1 + 3.5, cz, 0.8, 1.4);
      this.inst(`tuktuk${Math.floor(rnd.next() * 3)}`, () => buildTukTukProp(rnd.pick(['#2f8f86', '#d8463a', '#f4d23b'])), x0 - 3, cz + rnd.range(-20, 20), 0);
      this.merge(buildBuntingLine(rnd, (x1 - x0) / 2, 7), cx, z1 + 6, 0);
    }
  }

  private parkBlock(x0: number, x1: number, z0: number, z1: number, field: boolean): void {
    const rnd = this.rnd;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    if (field) {
      // A cricket ground: pale pitch, boundary rope.
      this.merge(new ModelKit().cylinder(40, 40, 0.08, 36, '#a9d67a', { position: [0, 0.05, 0], pattern: Pattern.Grass }).box(3, 0.1, 20, '#d9c7a4', { position: [0, 0.1, 0] }).build(0), cx, cz);
      this.places.push({ id: `field${this.places.length}`, name: 'the cricket ground', x: cx, z: cz });
      return;
    }
    const n = 10 + rnd.int(0, 8);
    for (let k = 0; k < n; k++) {
      const x = rnd.range(x0 + 4, x1 - 4);
      const z = rnd.range(z0 + 4, z1 - 4);
      if (Math.hypot(x - 500, z + 300) < 80) continue; // not in the lake
      if (inStuntLane(x, z, 1.5)) continue; // keep jump run-ups and landings clear
      const kind = k % 5;
      if (kind === 0) this.inst('cypress', () => buildCypress(new Random(11)), x, z, 0);
      else if (kind === 1) this.inst('flowerbush', () => buildFlowerBush(new Random(12)), x, z, rnd.range(0, 6));
      else if (kind === 2) this.inst('bush', () => buildBush(new Random(13)), x, z, rnd.range(0, 6));
      else this.inst(`ptree${kind}`, () => buildRoundTree(new Random(20 + kind), kind === 4 ? '#e8559a' : null), x, z, rnd.range(0, 6));
      this.world.circle(x, z, kind === 1 || kind === 2 ? 0.8 : 1.2);
    }
    if (rnd.chance(0.5)) {
      this.inst('bench', buildBench, cx, cz + 6, 0);
      this.world.circle(cx, cz + 6, 0.9);
    }
  }

  private buildBeach(): void {
    const rnd = this.rnd;
    for (let x = RING.minX + 20; x <= RING.maxX - 20; x += 22) {
      this.inst(`palm${Math.abs(x) % 3}`, () => buildPalm(new Random(30 + (Math.abs(x) % 3))), x + rnd.range(-5, 5), 500 + rnd.range(0, 30), rnd.range(0, 6));
      if (rnd.chance(0.3)) this.inst('cabana', () => buildCabana(new Random(2)), x + 8, 528, Math.PI);
    }
    // The pier and lighthouse.
    const pier = new ModelKit().box(10, 0.6, 90, '#b58a5c', { position: [0, -0.3, 0], pattern: Pattern.Planks });
    for (let i = 0; i < 10; i++) for (const s of [-1, 1]) pier.cylinder(0.4, 0.4, AREA_Y + 3, 6, '#7a5a3a', { position: [s * 4.4, -(AREA_Y + 3) / 2, -42 + i * 9.4] });
    this.merge(pier.build(0), 300, 590);
    this.merge(buildLighthouse(), 300, 640, 0, 0, 1.4);
    this.world.box(300, 597, 5.2, 48);
    this.world.bounds.maxZ = 548;
    for (let i = 0; i < 9; i++) {
      const x = -500 + i * 110 + rnd.range(-10, 10);
      const z = 600 + rnd.range(0, 40);
      this.merge(i % 2 ? buildOruwa() : buildPaperBoat(), x, z, rnd.range(0, 3), -AREA_Y + 0.1, i % 2 ? 1.6 : 2.4);
      this.world.circle(x, z, 2.5);
    }
    this.places.push({ id: 'pier', name: 'the pier', x: 300, z: 540 }, { id: 'beach', name: 'Mount Lavinia beach', x: -300, z: 520 });
  }

  private buildHills(): void {
    const rnd = this.rnd;
    for (let x = -660; x <= 660; x += 90) {
      const r = rnd.range(55, 72);
      const hx = x + rnd.range(-20, 20);
      const hz = -660 - rnd.range(0, 20);
      // Leave the two hill roads to the ring clear.
      if (Math.abs(hx + 460) < r + 12 || Math.abs(hx - 380) < r + 12) continue;
      const hill = buildHill(rnd, r, rnd.range(35, 70), rnd.chance(0.6) ? 'tea' : 'jungle');
      this.merge(hill, hx, hz);
      this.world.circle(hx, hz, r * 0.8);
    }
    this.world.bounds.minZ = RING.minZ - 30;
  }

  private buildLandmarks(): void {
    // Lotus Tower plaza (centre of downtown).
    this.merge(new ModelKit().cylinder(44, 44, 0.2, 40, '#d9c7a4', { position: [0, 0.1, 0], pattern: Pattern.Stone }).build(0), -160, -160);
    this.merge(buildLotusTower(), -160, -160, 0, 0, 0.6);
    this.world.circle(-160, -160, 10);
    this.places.push({ id: 'lotus', name: 'the Lotus Tower', x: -160, z: -130 });
    // A stupa on the northern hills, reached by the north road.
    this.merge(buildStupa(), 60, -600, 0, 0, 0.5);
    this.world.circle(60, -600, 15);
    this.places.push({ id: 'stupa', name: 'the white stupa', x: 60, z: -575 });
    // Elephants by the lake.
    this.merge(buildElephant(), 430, -380, 0.8, 0, 1.3);
    this.merge(buildElephant(), 440, -365, 2.4, 0, 0.9);
    this.world.circle(435, -372, 5);
    this.places.push({ id: 'oldtown', name: 'Pettah market', x: 260, z: -150 }, { id: 'downtown', name: 'the Fort business district', x: -40, z: 20 });
  }

  /** The stunt park: big ramps, a jump over a bus, kickers and pads. */
  private buildStuntPark(): void {
    const ramp = (id: string, name: string, x: number, z: number, heading: number, power: number, reach = 48): void => {
      const r = { x, z, heading, halfWidth: 4, halfLength: 3.5, power, stunt: true, reach };
      const landX = x - Math.sin(heading) * reach;
      const landZ = z - Math.cos(heading) * reach;
      this.world.ramps.push(r);
      this.merge(new ModelKit().box(8, 2.2, 7.5, '#e8559a', { position: [0, 0.3, 0], rotation: [0.32, 0, 0] }).box(8.4, 0.2, 0.4, '#f4d23b', { position: [0, 2.6, -3.6], nightGlow: 1 }).build(0), x, z, heading);
      this.merge(new ModelKit().cylinder(7, 7, 0.1, 24, '#f4d23b', { position: [0, 0.08, 0], nightGlow: 1 }).cylinder(5.5, 5.5, 0.12, 24, '#2b2622', { position: [0, 0.09, 0] }).build(0), landX, landZ);
      this.stunts.push({ id, name, ramp: r, land: { x: landX, z: landZ, r: 9 } });
    };
    for (const [id, name, x, z, heading, power, reach] of STUNT_RAMPS) ramp(id, name, x, z, heading, power, reach);
    this.merge(buildBusStop(new Random(4)), -520, 396, Math.PI / 2, 0, 2.2);
    this.places.push({ id: 'stuntpark', name: 'the stunt park', x: -480, z: 300 });
  }

  /** Secrets, loot chests and service rings. */
  private buildContent(): void {
    const secrets: [number, number, number, string][] = [
      [-160, -128, 0, 'At the foot of the Lotus Tower'],
      [308.5, 625, 0.4, 'Beside the lighthouse at the end of the pier (only a boat gets there)'],
      [-630, -590, 0, 'The far north-west corner'],
      [630, 540, 0, 'The eastern end of the beach'],
      [440, -372, 0, 'Between the elephants'],
      [60, -582, 0, 'Beside the stupa'],
      [-514, 372, 0, 'Where the bus jump lands'],
      [210, -30, 0, 'In a market courtyard'],
      [-400, -400, 0, 'A downtown alley'],
      [560, 400, 0, 'In a garden in the east suburbs'],
      [-50, 505, 0, 'Under the palms by the beach road'],
      [0, -250, 0, 'A plaza among the towers'],
      [620, -560, 0, 'The north-east corner'],
      [-620, 100, 0, 'On the west road'],
      [330, 250, 0, 'Behind a suburban house'],
      [-280, 120, 0, 'Beside a bus stop'],
      [470, -130, 0, 'On the lake shore'],
      [-560, 470, 0, 'The corner of the stunt park'],
      [140, -470, 0, 'Where downtown meets the old town'],
      [0, 540, 0, 'At the water’s edge'],
      [-545, -452, 0, 'On the road through the West Gardens'],
      [-611, -60, 0, 'Along the far west road'],
    ];
    secrets.forEach(([x, z, y, hint], i) => this.secrets.push({ id: `city-secret-${i}`, x, z, y, hint }));
    const chestSpots: [number, number, 0 | 1 | 2 | 3][] = [
      [-40, 470, 0], [200, -300, 0], [-380, 260, 1], [560, -120, 1], [-250, -480, 0], [420, 300, 1], [-600, -300, 2], [600, 100, 2],
      [100, -540, 1], [-160, -115, 3], [330, 487, 0], [-460, -40, 0], [250, 90, 1], [0, -420, 2], [480, 460, 3], [-600, 420, 1], [-611, -150, 1], [-540, 12, 0],
    ];
    chestSpots.forEach(([x, z, tier], i) => this.chests.push({ id: `city-chest-${i}`, x, z, tier }));
    for (const s of this.secrets) {
      const m = new THREE.Mesh(potGeo(), this.material);
      m.position.set(s.x, s.y, s.z);
      m.castShadow = true;
      this.group.add(m);
      s.mesh = m;
    }
    for (const c of this.chests) {
      const m = new THREE.Mesh(chestGeo(c.tier), this.material);
      m.position.set(c.x, 0, c.z);
      m.rotation.y = (c.x + c.z) % 6;
      m.castShadow = true;
      this.group.add(m);
      c.mesh = m;
    }
  }

  private buildZones(): void {
    const zones: AreaZone[] = [
      { kind: 'garage', label: '🔧 Garage', x: -60, z: 452, r: 5, colour: '#f4d23b' },
      { kind: 'wardrobe', label: '👒 Wardrobe', x: 60, z: 452, r: 5, colour: '#e8559a' },
      { kind: 'shop', label: '🧪 Shop', x: 250, z: 160, r: 5, colour: '#5dbb3f' },
      { kind: 'missions', label: '📋 Mission board', x: -130, z: 452, r: 5, colour: '#3e9fd8' },
      { kind: 'trophies', label: '🏆 Trophy hall', x: 130, z: 452, r: 5, colour: '#f4d23b' },
      { kind: 'area', label: '⚓ Harbour Town', x: -620, z: 520, r: 9, area: 'harbour', colour: '#2f8f86' },
      { kind: 'portal', label: '→ Postcards', x: -100, z: 428, r: 6, chapter: 'postcards', colour: '#2d6fb7' },
      { kind: 'portal', label: '→ City Lights', x: -160, z: 428, r: 6, chapter: 'citylights', colour: '#e0432f' },
      { kind: 'portal', label: '→ Skylines', x: -40, z: 428, r: 6, chapter: 'skylines', colour: '#3e86c9' },
      { kind: 'portal', label: '→ Island Road Trip', x: 20, z: 428, r: 6, chapter: 'islandtrip', colour: '#2d8a5a' },
    ];
    // Painted gates to the newer chapters, in a row just north of where you arrive.
    const gates: [number, string][] = [
      [-100, '#2d6fb7'],
      [-160, '#e0432f'],
      [-40, '#3e86c9'],
      [20, '#2d8a5a'],
    ];
    for (const [gx, colour] of gates) {
      const gate = new ModelKit();
      for (const s of [-1, 1]) {
        gate.box(1.4, 11, 1.4, colour, { position: [s * 8, 5.5, 0] });
        gate.box(2, 0.6, 2, '#2b2622', { position: [s * 8, 11.2, 0] });
      }
      gate.box(17.4, 1.6, 1.2, '#f6f0e4', { position: [0, 10, 0] });
      gate.box(17.8, 0.4, 1.4, '#e3c07a', { position: [0, 10.9, 0] });
      for (let j = 0; j < 14; j++) {
        const a = (j / 14) * Math.PI * 2;
        gate.box(1.8, 0.35, 0.2, ['#e3c07a', colour, '#b0352a', '#4f9a5a'][j % 4], { position: [Math.cos(a) * 4, 5 + Math.sin(a) * 4, 0], rotation: [0, 0, a + Math.PI / 2], nightGlow: 1 });
      }
      this.merge(gate.build(0.02), gx, 425);
      for (const s of [-1, 1]) this.world.circle(gx + s * 8, 425, 0.9);
    }
    this.zones.push({ kind: 'launch', label: '✈ Paper plane', x: -93, z: 506, r: 4, colour: '#f6f0e4' });
    this.murals.push(...addMuralBoards(this, 'city', this.spawn));
    this.pockets.push(...addPockets(this));
    // Fishing spots, resting at home and DJ stages (see Leisure.ts).
    addLeisure(this, 'city');
    for (const z of [...zones, ...this.zones.splice(0)]) {
      this.zones.push(z);
      const ring = new THREE.Mesh(new THREE.RingGeometry(z.r - 0.4, z.r, 40).rotateX(-Math.PI / 2), new PaintMaterial({ color: z.colour, emissive: 0.8, side: THREE.DoubleSide }));
      ring.position.set(z.x, 0.12, z.z);
      this.group.add(ring);
      this.rings.push(ring);
      const label = document.createElement('div');
      label.className = 'name-tag hub-label';
      label.style.display = 'none';
      this.labelLayer.appendChild(label);
      this.labels.push(label);
    }
  }

  // ————— life —————

  /** Cars drive rectangular loops on the right-hand side of the grid. */
  private buildTraffic(): void {
    const rnd = new Random(55);
    const loops: [number, number, number, number, number][] = [
      // x0, x1, z0, z1 (grid lines), cars
      [-460, 140, -460, 140, 4],
      [-220, 20, -340, 20, 2],
      [-620, 620, -560, 480, 5],
      [140, 380, -460, 140, 2],
      [-340, 260, 140, 380, 3],
      // Round the ring road and back along the coast highway.
      [RING.minX, RING.maxX, RING.minZ, RING.maxZ, 7],
    ];
    const bodies = VEHICLES.filter((v) => v.id !== 'scooter');
    for (const [x0, x1, z0, z1, n] of loops) {
      // North up the west side, east along the top, south, west: each lane 4 m to the driver's right.
      const o = 4;
      const loop = [
        { x: x0 + o, z: z1 - o },
        { x: x0 + o, z: z0 + o },
        { x: x1 - o, z: z0 + o },
        { x: x1 - o, z: z1 - o },
      ];
      for (let k = 0; k < n; k++) {
        const def = bodies[Math.floor(rnd.next() * bodies.length)];
        const model = new VehicleModel(def, { ...def.defaultLook, body: rnd.pick(PALETTE.paint), accent: rnd.pick(PALETTE.paint) });
        this.group.add(model.root);
        this.traffic.push({ model, loop, seg: k % 4, t: rnd.next(), speed: rnd.range(10, 15), x: 0, z: 0, heading: 0 });
      }
    }
  }

  private buildWalkers(): void {
    const rnd = new Random(66);
    // Colombo's people: Sinhala, Tamil, Muslim, Burgher and visitors, in everyday dress (see Peoples.ts).
    for (let i = 0; i < 44; i++) {
      const model = new HumanModel(personOf('lanka', () => rnd.next()).look);
      const body = new FreeWalker();
      const p = this.pavementSpot(rnd);
      body.place(p.x, p.z, rnd.range(-3, 3));
      this.group.add(model.root);
      this.walkers.push({ model, body, target: this.pavementSpot(rnd), wait: rnd.range(0, 3) });
    }
  }

  /** A point on a downtown or old-town pavement. */
  private pavementSpot(rnd: Random): { x: number; z: number } {
    if (rnd.chance(0.5)) {
      const cx = CITY_X[1 + rnd.int(0, 6)];
      const x = cx + rnd.pick([-1, 1]) * (roadWidthX(cx) / 2 + 1.5);
      return { x, z: rnd.range(-440, 130) };
    }
    const cz = CITY_Z[1 + rnd.int(0, 5)];
    const z = cz + rnd.pick([-1, 1]) * (roadWidthZ(cz) / 2 + 1.5);
    return { x: rnd.range(-440, 370), z };
  }

  // ————— FreeRoamArea —————

  title(): { kicker: string; name: string; poem: string } {
    return { kicker: t('city.kicker'), name: t('city.name'), poem: t('city.poem') };
  }

  show(on: boolean): void {
    this.group.visible = on;
    if (!on) for (const l of this.labels) l.style.display = 'none';
  }

  zoneAt(x: number, z: number): AreaZone | null {
    for (const zn of this.zones) if (Math.hypot(x - zn.x, z - zn.z) < zn.r) return zn;
    return null;
  }

  zoneLabel(z: AreaZone): string {
    const leisure = leisureLabel(z);
    if (leisure) return leisure;
    if (z.kind === 'viewpoint' && z.view) return `🌅 ${t(`view.${z.view.id}` as StringKey)}`;
    return z.kind === 'portal' || z.kind === 'area' ? z.label : t(`zone.${z.kind}` as StringKey);
  }

  ambienceAt(x: number, z: number): { nature: number; coast: number; city: number } {
    const r = this.region(x, z);
    const coast = Math.min(1, Math.max(0, (z - 380) / 150));
    if (r === 'downtown') return { nature: 0.15, coast, city: 0.9 };
    if (r === 'oldtown') return { nature: 0.25, coast, city: 0.7 };
    if (r === 'park' || r === 'hills') return { nature: 1, coast, city: 0.15 };
    if (r === 'beach') return { nature: 0.5, coast: 1, city: 0.1 };
    return { nature: 0.6, coast, city: 0.35 };
  }

  dynamicBodies(): DynamicBody[] {
    return [...this.traffic.map((c) => ({ x: c.x, z: c.z, r: 1.6 })), ...this.perahera.bodies()];
  }

  mapInfo(paint: (districtId: string) => number): MapInfo {
    const roads: MapInfo['roads'] = [];
    for (const x of CITY_X) roads.push({ x1: x, z1: CITY_Z[0], x2: x, z2: CITY_Z[CITY_Z.length - 1], w: roadWidthX(x) });
    for (const z of CITY_Z) roads.push({ x1: CITY_X[0], z1: z, x2: CITY_X[CITY_X.length - 1], z2: z, w: roadWidthZ(z) });
    for (const [x1, z1, x2, z2, w] of OUTER_ROADS) roads.push({ x1, z1, x2, z2, w });
    return {
      id: this.id,
      name: t('city.name'),
      bounds: { minX: RING.minX - 40, maxX: RING.maxX + 40, minZ: RING.minZ - 40, maxZ: 660 },
      regions: this.districts.map((d) => ({ id: d.id, name: d.name, rect: d.rect, colour: d.colour, paint: paint(d.id) })),
      roads,
      water: [{ x: 500, z: -300, r: 70 }],
      seaZ: this.seaZ,
      blocks: [
        { x: -160, z: -160, w: 60, d: 60, colour: 'rgba(217,199,164,0.9)' },
        { x: 60, z: -600, w: 30, d: 30, colour: 'rgba(246,240,228,0.95)' },
        { x: 300, z: 600, w: 10, d: 90, colour: 'rgba(122,90,58,0.8)' },
      ],
    };
  }

  update(dt: number, time: number, player: { x: number; z: number }, camera: THREE.PerspectiveCamera): void {
    this.perahera.update(dt, time, paintShared.uNight.value, player);
    // Traffic: follow the loop; wait if the player is just ahead.
    for (const car of this.traffic) {
      const a = car.loop[car.seg];
      const b = car.loop[(car.seg + 1) % car.loop.length];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      const dirX = (b.x - a.x) / len;
      const dirZ = (b.z - a.z) / len;
      const aheadX = car.x + dirX * 9;
      const aheadZ = car.z + dirZ * 9;
      const blocked = Math.hypot(player.x - aheadX, player.z - aheadZ) < 6 || this.traffic.some((o) => o !== car && Math.hypot(o.x - aheadX, o.z - aheadZ) < 5) || this.perahera.distanceTo(aheadX, aheadZ) < 7;
      if (!blocked) car.t += (car.speed * dt) / len;
      if (car.t >= 1) {
        car.t -= 1;
        car.seg = (car.seg + 1) % car.loop.length;
      }
      car.x = a.x + (b.x - a.x) * Math.min(1, car.t);
      car.z = a.z + (b.z - a.z) * Math.min(1, car.t);
      const target = Math.atan2(-dirX, -dirZ);
      car.heading += Math.atan2(Math.sin(target - car.heading), Math.cos(target - car.heading)) * Math.min(1, dt * 6);
      const near = Math.hypot(car.x - player.x, car.z - player.z) < 450;
      car.model.root.visible = near;
      if (!near) continue;
      car.model.root.position.set(car.x, 0.02, car.z);
      car.model.root.rotation.set(0, car.heading, 0);
      car.model.roll(blocked ? 0 : car.speed * dt);
      car.model.setBrakeLights(blocked);
    }
    // Pedestrians near the player.
    const rnd = this.rnd;
    for (const w of this.walkers) {
      const near = Math.hypot(w.body.x - player.x, w.body.z - player.z) < 160;
      w.model.root.visible = near;
      if (!near) continue;
      const dx = w.target.x - w.body.x;
      const dz = w.target.z - w.body.z;
      const d = Math.hypot(dx, dz);
      let mx = 0;
      let my = 0;
      if (w.wait > 0) w.wait -= dt;
      else if (d < 1.5) {
        w.target = this.pavementSpot(rnd);
        w.wait = rnd.range(1, 4);
      } else {
        mx = dx / d;
        my = -dz / d;
      }
      w.body.step(dt, { moveX: mx * 0.4, moveY: my * 0.4, cameraYaw: 0, sprint: false, walk: false, jump: false, faceCamera: false }, this.world);
      w.model.root.position.set(w.body.x, w.body.y, w.body.z);
      w.model.root.rotation.y = w.body.heading;
      w.model.animate(dt, w.body.pose, w.body.speed, time);
    }
    // Secrets and chests bob and spin.
    for (const s of this.secrets) if (s.mesh?.visible) {
      s.mesh.rotation.y = time * 1.5;
      s.mesh.position.y = s.y + 0.3 + Math.sin(time * 2 + s.x) * 0.15;
    }
    for (const r of this.rings) r.scale.setScalar(1 + Math.sin(time * 3) * 0.04);
    const langNow = document.documentElement.lang;
    if (langNow !== this.labelLang) {
      this.labelLang = langNow;
      this.zones.forEach((z, i) => (this.labels[i].innerHTML = `<span>${this.zoneLabel(z)}</span>`));
    }
    this.zones.forEach((z, i) => {
      const label = this.labels[i];
      this.v.set(z.x, AREA_Y + 5, z.z).project(camera);
      const dist = Math.hypot(player.x - z.x, player.z - z.z);
      const on = this.group.visible && this.v.z < 1 && Math.abs(this.v.x) < 1.1 && Math.abs(this.v.y) < 1.1 && dist < 180;
      label.style.display = on ? 'block' : 'none';
      if (!on) return;
      label.style.left = `${(this.v.x * 0.5 + 0.5) * window.innerWidth}px`;
      label.style.top = `${(-this.v.y * 0.5 + 0.5) * window.innerHeight}px`;
    });
  }

  dispose(): void {
    for (const l of this.labels) l.remove();
    this.group.removeFromParent();
  }
}

let _pot: THREE.BufferGeometry | null = null;
const potGeo = (): THREE.BufferGeometry => (_pot ??= buildPaintPot());
const _chests: THREE.BufferGeometry[] = [];
const chestGeo = (tier: number): THREE.BufferGeometry => (_chests[tier] ??= buildChest(tier));
const _up = new THREE.Vector3(0, 1, 0);
const padGeo = (): THREE.BufferGeometry =>
  new ModelKit()
    .box(4.5, 0.08, 6, '#3e9fd8', { position: [0, 0.1, 0], nightGlow: 1 })
    .box(1, 0.1, 3, '#f6f0e4', { position: [-0.7, 0.14, 0], rotation: [0, 0.6, 0], nightGlow: 1 })
    .box(1, 0.1, 3, '#f6f0e4', { position: [0.7, 0.14, 0], rotation: [0, -0.6, 0], nightGlow: 1 })
    .build(0);

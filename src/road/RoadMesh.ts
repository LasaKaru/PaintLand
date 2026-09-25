import * as THREE from 'three';
import { RoadPath, ROAD_STEP, createFrame } from './RoadPath';
import { PaintMaterial } from '../render/PaintMaterial';

/** Surface ids understood by the road shader (PaintMaterial USE_ROAD). */
const enum Surface {
  Road = 0,
  Kerb = 1,
  Pavement = 2,
  Wall = 3,
  Underside = 4,
}

interface PavingColours {
  road: THREE.Color;
  kerb: THREE.Color;
  pavement: THREE.Color;
  wall: THREE.Color;
  wallTop: THREE.Color;
  outer: THREE.Color;
  underside: THREE.Color;
}

const c = (hex: string): THREE.Color => new THREE.Color(hex);

/** Colour sets per paving style (index = Paving value). */
const PAVING_COLOURS: PavingColours[] = [
  // Slabs: lavender road, terracotta guard walls (the sketchbook look).
  { road: c('#a9aee0'), kerb: c('#f1e9d8'), pavement: c('#ead7ae'), wall: c('#d8643a'), wallTop: c('#ec9a5e'), outer: c('#cf6a3e'), underside: c('#c3bfe0') },
  // Cobbles: warm grey stones, white colonial walls.
  { road: c('#b8aa9c'), kerb: c('#efe6d6'), pavement: c('#e2cfa8'), wall: c('#f3ede0'), wallTop: c('#d9cfbd'), outer: c('#e8dfcd'), underside: c('#c9c0b6') },
  // Asphalt: blue-grey with ochre verges.
  { road: c('#7d8296'), kerb: c('#e9e4da'), pavement: c('#d9c7a2'), wall: c('#e2dccd'), wallTop: c('#f2eee4'), outer: c('#cfc6b4'), underside: c('#aeb0c6') },
  // Stone: sandy granite for wonders.
  { road: c('#c9b99a'), kerb: c('#b5a384'), pavement: c('#d8c8a6'), wall: c('#bfae8e'), wallTop: c('#cfbf9f'), outer: c('#b09f80'), underside: c('#a99b86') },
  // Planks: boardwalk wood.
  { road: c('#c8955a'), kerb: c('#a8743e'), pavement: c('#d9ad72'), wall: c('#9a6a3a'), wallTop: c('#b9824a'), outer: c('#8a5a30'), underside: c('#7a5a3a') },
  // Earth: red laterite road with green verges.
  { road: c('#c8704a'), kerb: c('#a9c86a'), pavement: c('#8cbf4f'), wall: c('#6fa84a'), wallTop: c('#8cc63f'), outer: c('#b6784c'), underside: c('#9a6a4a') },
];

export const KERB_WIDTH = 0.35;
export const KERB_HEIGHT = 0.18;
export const WALL_WIDTH = 0.35;
export const WALL_HEIGHT = 0.9;
export const PAVEMENT_WIDTH = 2.6;
export const ROAD_THICKNESS = 1.4;

/** Half-width of everything walkable at this frame (road + kerb + pavement + plaza). */
export function walkableHalfWidth(width: number, plaza: number): number {
  return width / 2 + KERB_WIDTH + PAVEMENT_WIDTH + plaza;
}

interface ProfileSegment {
  a: [number, number];
  b: [number, number];
  colour: THREE.Color;
  surface: Surface;
}

/**
 * Cross-section of the road, traversed clockwise when looking along the road,
 * so every face points outward (docs/04 §2 "road mesh").
 */
function profile(width: number, plaza: number, paving = 0): ProfileSegment[] {
  const COLOURS = PAVING_COLOURS[paving] ?? PAVING_COLOURS[0];
  const hw = width / 2;
  const inner = hw + KERB_WIDTH;
  const wallIn = inner + PAVEMENT_WIDTH + plaza;
  const o = wallIn + WALL_WIDTH;
  const k = KERB_HEIGHT;
  const wh = WALL_HEIGHT;
  const bottom = -ROAD_THICKNESS;
  const seg = (a: [number, number], b: [number, number], colour: THREE.Color, surface: Surface): ProfileSegment => ({ a, b, colour, surface });
  return [
    seg([-o, wh], [-wallIn, wh], COLOURS.wallTop, Surface.Wall),
    seg([-wallIn, wh], [-wallIn, k], COLOURS.wall, Surface.Wall),
    seg([-wallIn, k], [-inner, k], COLOURS.pavement, Surface.Pavement),
    seg([-inner, k], [-hw, k], COLOURS.kerb, Surface.Kerb),
    seg([-hw, k], [-hw, 0], COLOURS.kerb, Surface.Kerb),
    seg([-hw, 0], [hw, 0], COLOURS.road, Surface.Road),
    seg([hw, 0], [hw, k], COLOURS.kerb, Surface.Kerb),
    seg([hw, k], [inner, k], COLOURS.kerb, Surface.Kerb),
    seg([inner, k], [wallIn, k], COLOURS.pavement, Surface.Pavement),
    seg([wallIn, k], [wallIn, wh], COLOURS.wall, Surface.Wall),
    seg([wallIn, wh], [o, wh], COLOURS.wallTop, Surface.Wall),
    seg([o, wh], [o, bottom], COLOURS.outer, Surface.Wall),
    seg([o, bottom], [-o, bottom], COLOURS.underside, Surface.Underside),
    seg([-o, bottom], [-o, wh], COLOURS.outer, Surface.Wall),
  ];
}

/**
 * Build the road as ~100 m chunks (each its own mesh so off-screen chunks
 * are culled). Returns a group containing all chunk meshes.
 */
export function buildRoadMesh(path: RoadPath, chunkLength = 100): THREE.Group {
  const group = new THREE.Group();
  group.name = 'road';
  const material = new PaintMaterial({ vertexColors: true, road: true });
  const samplesPerChunk = Math.round(chunkLength / ROAD_STEP);
  for (let start = 0; start < path.count - 1; start += samplesPerChunk) {
    const end = Math.min(path.count - 1, start + samplesPerChunk);
    const mesh = new THREE.Mesh(buildChunk(path, start, end), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = `road-chunk-${start}`;
    group.add(mesh);
  }
  return group;
}

function buildChunk(path: RoadPath, i0: number, i1: number): THREE.BufferGeometry {
  const rows = i1 - i0 + 1;
  const segCount = profile(12, 0).length;
  const vertCount = rows * segCount * 2;
  const positions = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);
  const colours = new Float32Array(vertCount * 4);
  const uvs = new Float32Array(vertCount * 2);
  const info = new Float32Array(vertCount * 4);
  const indices: number[] = [];
  const frame = createFrame();
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();

  for (let r = 0; r < rows; r++) {
    const i = i0 + r;
    path.sample(i * ROAD_STEP, frame);
    const segs = profile(frame.width, frame.plaza, frame.paving);
    for (let k = 0; k < segs.length; k++) {
      const sg = segs[k];
      const du = sg.b[0] - sg.a[0];
      const dv = sg.b[1] - sg.a[1];
      const len = Math.hypot(du, dv) || 1;
      // Outward normal of a clockwise profile edge: (-dv, du) in (right, up) space.
      const nu = -dv / len;
      const nv = du / len;
      n.copy(frame.right).multiplyScalar(nu).addScaledVector(frame.up, nv).normalize();
      for (let e = 0; e < 2; e++) {
        const pt = e === 0 ? sg.a : sg.b;
        const v = (r * segCount + k) * 2 + e;
        p.copy(frame.position).addScaledVector(frame.right, pt[0]).addScaledVector(frame.up, pt[1]);
        p.toArray(positions, v * 3);
        n.toArray(normals, v * 3);
        colours[v * 4] = sg.colour.r;
        colours[v * 4 + 1] = sg.colour.g;
        colours[v * 4 + 2] = sg.colour.b;
        colours[v * 4 + 3] = 0;
        uvs[v * 2] = sg.surface === Surface.Underside || sg.surface === Surface.Wall ? pt[1] : pt[0];
        uvs[v * 2 + 1] = i * ROAD_STEP;
        info[v * 4] = sg.surface;
        info[v * 4 + 1] = frame.rails;
        info[v * 4 + 2] = frame.width / 2;
        info[v * 4 + 3] = frame.paving;
      }
    }
  }

  for (let r = 0; r < rows - 1; r++) {
    for (let k = 0; k < segCount; k++) {
      const a0 = (r * segCount + k) * 2;
      const b0 = a0 + 1;
      const a1 = ((r + 1) * segCount + k) * 2;
      const b1 = a1 + 1;
      indices.push(a0, b0, a1, b0, b1, a1);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  g.setAttribute('color', new THREE.BufferAttribute(colours, 4));
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  g.setAttribute('roadInfo', new THREE.BufferAttribute(info, 4));
  g.setIndex(indices);
  g.computeBoundingSphere();
  return g;
}

import * as THREE from 'three';

/** Distance between stored samples along the road, in metres (docs/04 §2). */
export const ROAD_STEP = 0.5;

/** Everything a system needs to know about one point of the road. */
export interface RoadFrame {
  s: number;
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  up: THREE.Vector3;
  right: THREE.Vector3;
  width: number;
  district: number;
  /** 1 where tram rails are painted into the road. */
  rails: number;
  /** Extra walkable plaza width on each side (town streets). */
  plaza: number;
}

export function createFrame(): RoadFrame {
  return {
    s: 0,
    position: new THREE.Vector3(),
    tangent: new THREE.Vector3(0, 0, -1),
    up: new THREE.Vector3(0, 1, 0),
    right: new THREE.Vector3(1, 0, 0),
    width: 12,
    district: 0,
    rails: 0,
    plaza: 0,
  };
}

export interface DistrictSpan {
  district: number;
  start: number;
  end: number;
}

/**
 * The road lookup table: position and orientation every ROAD_STEP metres.
 * The rover, the human, the camera, notes and decoration all ask it
 * "where is distance s?" (docs/11 §2).
 */
export class RoadPath {
  readonly count: number;
  readonly length: number;
  readonly spans: DistrictSpan[];

  constructor(
    readonly positions: Float32Array,
    readonly tangents: Float32Array,
    readonly ups: Float32Array,
    readonly widths: Float32Array,
    readonly districts: Uint8Array,
    readonly rails: Uint8Array,
    readonly plazas: Float32Array,
  ) {
    this.count = widths.length;
    this.length = (this.count - 1) * ROAD_STEP;
    this.spans = computeSpans(districts);
  }

  /** Fill `out` with the interpolated frame at distance `s` (clamped to the road). */
  sample(s: number, out: RoadFrame = createFrame()): RoadFrame {
    const clamped = s < 0 ? 0 : s > this.length ? this.length : s;
    const f = clamped / ROAD_STEP;
    let i = Math.floor(f);
    if (i >= this.count - 1) i = this.count - 2;
    const t = f - i;
    const j = i + 1;

    lerp3(this.positions, i, j, t, out.position);
    lerp3(this.tangents, i, j, t, out.tangent).normalize();
    lerp3(this.ups, i, j, t, out.up);
    // Re-orthonormalise: right = tangent x up, up = right x tangent.
    out.right.crossVectors(out.tangent, out.up).normalize();
    out.up.crossVectors(out.right, out.tangent).normalize();

    out.s = clamped;
    out.width = this.widths[i] + (this.widths[j] - this.widths[i]) * t;
    const nearest = t < 0.5 ? i : j;
    out.district = this.districts[nearest];
    out.rails = this.rails[nearest];
    out.plaza = this.plazas[i] + (this.plazas[j] - this.plazas[i]) * t;
    return out;
  }

  districtAt(s: number): number {
    const i = Math.min(this.count - 1, Math.max(0, Math.round(s / ROAD_STEP)));
    return this.districts[i];
  }

  spanOf(district: number): DistrictSpan | undefined {
    return this.spans.find((sp) => sp.district === district);
  }

  /** World position of a point given road coordinates (s, lateral x, height h). */
  pointAt(s: number, x: number, h: number, out: THREE.Vector3, frame: RoadFrame = _frame): THREE.Vector3 {
    this.sample(s, frame);
    return out.copy(frame.position).addScaledVector(frame.right, x).addScaledVector(frame.up, h);
  }

  /** Axis-aligned bounds of the whole road, for shadows and culling. */
  bounds(): THREE.Box3 {
    const box = new THREE.Box3();
    const v = new THREE.Vector3();
    for (let i = 0; i < this.count; i += 4) box.expandByPoint(v.fromArray(this.positions, i * 3));
    return box;
  }
}

const _frame = createFrame();

function lerp3(arr: Float32Array, i: number, j: number, t: number, out: THREE.Vector3): THREE.Vector3 {
  const a = i * 3;
  const b = j * 3;
  return out.set(
    arr[a] + (arr[b] - arr[a]) * t,
    arr[a + 1] + (arr[b + 1] - arr[a + 1]) * t,
    arr[a + 2] + (arr[b + 2] - arr[a + 2]) * t,
  );
}

function computeSpans(districts: Uint8Array): DistrictSpan[] {
  const spans: DistrictSpan[] = [];
  let start = 0;
  for (let i = 1; i <= districts.length; i++) {
    if (i === districts.length || districts[i] !== districts[start]) {
      spans.push({ district: districts[start], start: start * ROAD_STEP, end: (i - 1) * ROAD_STEP });
      start = i;
    }
  }
  return spans;
}

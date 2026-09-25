import * as THREE from 'three';

/**
 * Photo Hunt: a list of sights to photograph. A photo counts when the sight
 * is well inside the frame, close enough, and in front of the camera.
 */
export interface PhotoSubject {
  id: string;
  area: string;
  name: string;
  icon: string;
  /** World position of the sight's centre (area ground = 0; the area's height is added by the caller). */
  x: number;
  y: number;
  z: number;
  /** Farthest distance the photo still counts from. */
  range: number;
  ink: number;
}

export const PHOTO_SUBJECTS: PhotoSubject[] = [
  { id: 'lotus', area: 'city', name: 'The Lotus Tower', icon: '🪷', x: -160, y: 35, z: -160, range: 260, ink: 60 },
  { id: 'stupa', area: 'city', name: 'The white stupa', icon: '🛕', x: 60, y: 8, z: -600, range: 160, ink: 80 },
  { id: 'elephants', area: 'city', name: 'Elephants by the lake', icon: '🐘', x: 435, y: 2.5, z: -372, range: 70, ink: 80 },
  { id: 'lighthouse', area: 'city', name: 'The beach lighthouse', icon: '🗼', x: 300, y: 10, z: 640, range: 180, ink: 60 },
  { id: 'lake', area: 'city', name: 'Lotus Lake', icon: '🌊', x: 500, y: 0, z: -300, range: 140, ink: 50 },
  { id: 'busjump', area: 'city', name: 'The bus jump', icon: '🚌', x: -520, y: 2, z: 355, range: 70, ink: 60 },
  { id: 'skyline', area: 'city', name: 'The Fort skyline', icon: '🏙', x: -160, y: 30, z: -200, range: 700, ink: 70 },
  { id: 'fountain', area: 'harbour', name: 'The harbour fountain', icon: '⛲', x: 0, y: 2, z: 0, range: 50, ink: 40 },
  { id: 'pagoda', area: 'village', name: 'The red pagoda', icon: '🏯', x: 45, y: 10, z: -45, range: 110, ink: 60 },
  { id: 'torii', area: 'village', name: 'The thousand gates', icon: '⛩', x: 0, y: 4, z: -60, range: 70, ink: 60 },
  { id: 'harbour-light', area: 'harbour', name: 'The harbour lighthouse', icon: '🗼', x: 60, y: 8, z: 114, range: 140, ink: 40 },
  { id: 'perahera', area: 'city', name: 'The night perahera', icon: '🎆', x: 0, y: 3, z: 0, range: 60, ink: 150 },
];

const _p = new THREE.Vector3();

/**
 * Which subjects does this camera frame? `offsetY` is the area's ground
 * height; `where` can move a subject (the parade walks). Frame share: the
 * subject centre must lie within the middle `share` of the picture.
 */
export function subjectsInFrame(camera: THREE.Camera, area: string, offsetY: number, where: (s: PhotoSubject) => { x: number; y: number; z: number } | null = (s) => s, share = 0.8): PhotoSubject[] {
  const out: PhotoSubject[] = [];
  const cam = camera.getWorldPosition(new THREE.Vector3());
  for (const s of PHOTO_SUBJECTS) {
    if (s.area !== area) continue;
    const at = where(s);
    if (!at) continue;
    _p.set(at.x, at.y + offsetY, at.z);
    if (_p.distanceTo(cam) > s.range) continue;
    _p.project(camera);
    if (_p.z < -1 || _p.z > 1) continue;
    if (Math.abs(_p.x) > share || Math.abs(_p.y) > share) continue;
    out.push(s);
  }
  return out;
}

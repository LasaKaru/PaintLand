import * as THREE from 'three';
import { ModelKit, Pattern } from '../models/ModelKit';
import { PaintMaterial } from '../render/PaintMaterial';
import { decodeLivery, isEmptyLivery, paintLiveryCanvas } from '../gameplay/Livery';
import type { FreeWorld } from '../gameplay/FreeRoam';
import type { AreaZone } from './FreeRoamArea';

/**
 * Mural walls: big paper boards in each free-roam area that you paint with
 * the livery painter (32 × 16 dabs). Your murals are saved with your
 * progress (and in the cloud when signed in).
 */
export interface MuralSpot {
  id: string;
  x: number;
  z: number;
}

/** Open ground near each area's spawn (checked against the colliders by tests/murals.test.ts). */
export const MURAL_SPOTS: Record<string, MuralSpot[]> = {
  harbour: [
    { id: 'harbour-east', x: 16, z: 30 },
    { id: 'harbour-west', x: -16, z: 30 },
  ],
  village: [
    { id: 'village-east', x: -71, z: 4 },
    { id: 'village-north', x: -90, z: 23 },
  ],
  city: [
    { id: 'city-east', x: -91, z: 474 },
    { id: 'city-west', x: -109, z: 474 },
  ],
};

export const ALL_MURALS = Object.values(MURAL_SPOTS).flat().map((s) => s.id);

const BOARD_W = 6;
const BOARD_H = 3;

export interface MuralBoard {
  id: string;
  mesh: THREE.Mesh;
  code: string | null;
}

/** A blank board says "paint me". */
function blankTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = typeof c.getContext === 'function' ? c.getContext('2d') : null;
  if (!g) return null;
  g.fillStyle = '#f6f0e4';
  g.fillRect(0, 0, 256, 128);
  g.strokeStyle = '#c8b89a';
  g.setLineDash([6, 6]);
  g.lineWidth = 3;
  g.strokeRect(10, 10, 236, 108);
  g.font = '48px serif';
  g.textAlign = 'center';
  g.fillText('🎨', 128, 80);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Set a board's picture from a livery code (null = blank). */
export function paintMural(board: MuralBoard, code: string | null): void {
  if (board.code === code && board.mesh.userData.painted) return;
  board.code = code;
  board.mesh.userData.painted = true;
  const px = code ? decodeLivery(code) : null;
  let tex: THREE.Texture | null = null;
  if (px && !isEmptyLivery(px) && typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    // Paper background under the dabs.
    paintLiveryCanvas(c, px, 8);
    const bg = document.createElement('canvas');
    bg.width = c.width;
    bg.height = c.height;
    const g = typeof bg.getContext === 'function' ? bg.getContext('2d') : null;
    if (g) {
      g.fillStyle = '#f6f0e4';
      g.fillRect(0, 0, bg.width, bg.height);
      g.drawImage(c, 0, 0);
    }
    tex = new THREE.CanvasTexture(bg);
    tex.colorSpace = THREE.SRGBColorSpace;
  } else tex = blankTexture();
  // The paint map is fixed when a PaintMaterial is made, so swap in a new one.
  const old = board.mesh.material as PaintMaterial;
  const oldMap = old.uniforms?.uPaintMap?.value as THREE.Texture | undefined;
  board.mesh.material = new PaintMaterial({ color: '#ffffff', map: tex ?? undefined, gloss: 0.1 });
  oldMap?.dispose();
  old.dispose();
}

/**
 * Put an area's mural boards up: the frame and picture in `group`, a ring
 * in front (press E to paint), and colliders so cars bump into them.
 * Each board faces `towards` (the spawn).
 */
export function addMuralBoards(area: { zones: AreaZone[]; world: FreeWorld; group: THREE.Group }, areaId: string, towards: { x: number; z: number }): MuralBoard[] {
  const boards: MuralBoard[] = [];
  for (const spot of MURAL_SPOTS[areaId] ?? []) {
    const yaw = Math.atan2(towards.x - spot.x, towards.z - spot.z);
    const nx = Math.sin(yaw);
    const nz = Math.cos(yaw);
    const frame = new ModelKit();
    for (const s of [-1, 1]) frame.box(0.25, BOARD_H + 1.2, 0.25, '#7a5a3a', { position: [s * (BOARD_W / 2 + 0.15), (BOARD_H + 1.2) / 2, 0], pattern: Pattern.Planks });
    frame.box(BOARD_W + 0.8, 0.3, 0.4, '#9a5a32', { position: [0, BOARD_H + 1.25, 0], pattern: Pattern.Planks });
    frame.box(BOARD_W + 0.2, BOARD_H + 0.2, 0.12, '#e9dcc4', { position: [0, 0.6 + BOARD_H / 2, -0.08] });
    // A little shelf of paint pots.
    frame.box(1.6, 0.1, 0.4, '#7a5a3a', { position: [BOARD_W / 2 - 1, 0.5, 0.25] });
    for (const [i, c] of ['#d8463a', '#f4d23b', '#3e6fa8'].entries()) frame.cylinder(0.12, 0.12, 0.2, 8, c, { position: [BOARD_W / 2 - 1.5 + i * 0.4, 0.65, 0.25] });
    const frameMesh = new THREE.Mesh(frame.build(0.01, 31), new PaintMaterial({ vertexColors: true, flat: true }));
    frameMesh.castShadow = true;
    const picture = new THREE.Mesh(new THREE.PlaneGeometry(BOARD_W, BOARD_H), new PaintMaterial({ color: '#ffffff', map: blankTexture() ?? undefined, gloss: 0.1 }));
    picture.position.set(0, 0.6 + BOARD_H / 2, 0.0);
    const holder = new THREE.Group();
    holder.add(frameMesh, picture);
    holder.position.set(spot.x, 0, spot.z);
    holder.rotation.y = yaw;
    holder.name = `mural-${spot.id}`;
    area.group.add(holder);
    // Three small circles along the board stop cars (and people) walking through it.
    for (const s of [-1, 0, 1]) area.world.circle(spot.x + Math.cos(yaw) * s * (BOARD_W / 2 - 0.4), spot.z - Math.sin(yaw) * s * (BOARD_W / 2 - 0.4), 0.7);
    area.zones.push({ kind: 'mural', label: '🎨 Mural', x: spot.x + nx * 3.2, z: spot.z + nz * 3.2, r: 2.2, colour: '#e8559a', mural: spot.id });
    boards.push({ id: spot.id, mesh: picture, code: null });
  }
  return boards;
}

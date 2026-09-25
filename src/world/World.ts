import * as THREE from 'three';
import type { RoadPath } from '../road/RoadPath';
import { buildRoadMesh } from '../road/RoadMesh';
import { Decorator } from './Decorator';
import type { ChapterDef } from './Chapters';
import { Collectibles } from '../gameplay/Collectibles';
import { Population } from '../gameplay/Population';
import { missionsFor, type MissionDef } from '../gameplay/Missions';

/**
 * Everything that belongs to one loaded chapter: the route, its road mesh,
 * the dressing, the notes and pickups, and the people (docs/04 §1, docs/11 §6).
 * Swapping chapters disposes one World and builds another.
 */
export class World {
  readonly group = new THREE.Group();
  readonly path: RoadPath;
  readonly decor: Decorator;
  readonly items: Collectibles;
  readonly people: Population;
  readonly missions: MissionDef[];

  constructor(readonly chapter: ChapterDef) {
    this.group.name = `world:${chapter.id}`;
    this.path = chapter.buildRoute();
    this.group.add(buildRoadMesh(this.path));
    this.decor = new Decorator(this.path, chapter);
    this.group.add(this.decor.build());
    this.items = new Collectibles(this.path, chapter.districts);
    this.group.add(this.items.group);
    this.people = new Population(this.path, chapter.id);
    this.group.add(this.people.group);
    this.missions = missionsFor(chapter.id);
  }

  get districts() {
    return this.chapter.districts;
  }

  dispose(): void {
    this.group.removeFromParent();
    this.group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
  }
}

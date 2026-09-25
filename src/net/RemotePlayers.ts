import * as THREE from 'three';
import type { RoadPath } from '../road/RoadPath';
import { createFrame } from '../road/RoadPath';
import { HumanModel } from '../models/Human';
import { VehicleModel, vehicleById } from '../models/Vehicles';
import type { NetClient, RemotePeer } from './Net';

/** Hub states: s = z + HUB_S_OFFSET (keeps s positive across Serendib City), x = x, h = height above the hub ground, yaw = heading. */
export const HUB_S_OFFSET = 1000;

interface Avatar {
  key: string;
  vehicle: VehicleModel;
  human: HumanModel;
  label: HTMLDivElement;
  mode: 'drive' | 'foot' | '';
}

/**
 * Draws other players: their vehicle and character in their chosen looks,
 * moving smoothly along the road, with a paper name tag and chat bubble.
 */
export class RemotePlayers {
  private readonly avatars = new Map<string, Avatar>();
  private readonly frame = createFrame();
  private readonly basis = new THREE.Matrix4();
  private readonly yq = new THREE.Quaternion();
  private readonly tmp = new THREE.Vector3();

  constructor(private readonly scene: THREE.Scene, private readonly labels: HTMLElement) {}

  /** `hubY` set = everyone is in a free-roam hub (world coordinates), otherwise on `path`. */
  update(dt: number, time: number, net: NetClient, path: RoadPath, chapter: string, camera: THREE.PerspectiveCamera, hubY?: number): void {
    const seen = new Set<string>();
    for (const peer of net.peers.values()) {
      if (!peer.info || peer.info.chapter !== chapter) continue;
      const snap = net.sample(peer);
      if (!snap || snap.chapter !== chapter) continue;
      seen.add(peer.id);
      const av = this.ensure(peer);
      if (av.mode !== snap.mode) this.seat(av, snap.mode);
      const target = snap.mode === 'drive' ? av.vehicle.root : av.human.root;
      const f = this.frame;
      if (hubY !== undefined) {
        f.up.set(0, 1, 0);
        target.quaternion.setFromAxisAngle(_y, snap.yaw);
        target.position.set(snap.x, hubY + snap.h + (snap.mode === 'drive' ? 0.02 : 0), snap.s - HUB_S_OFFSET);
      } else {
        path.sample(snap.s, f);
        this.basis.makeBasis(f.right, f.up, this.tmp.copy(f.tangent).negate());
        target.quaternion.setFromRotationMatrix(this.basis).multiply(this.yq.setFromAxisAngle(_y, -snap.yaw));
        target.position.copy(f.position).addScaledVector(f.right, snap.x).addScaledVector(f.up, snap.h + (snap.mode === 'drive' ? 0.02 : 0));
      }
      if (snap.mode === 'drive') {
        av.vehicle.roll(snap.v * dt);
        av.human.animate(dt, av.vehicle.def.seatPose, 0, time);
      } else {
        av.human.animate(dt, snap.v > 5 ? 'run' : snap.v > 0.4 ? 'walk' : (snap.pose as 'wave') === 'wave' ? 'wave' : 'idle', snap.v, time);
      }
      // Name tag above the head.
      const head = target.position.clone().addScaledVector(f.up, snap.mode === 'drive' ? 3.4 : 2.3).project(camera);
      const onScreen = head.z < 1 && Math.abs(head.x) < 1.1 && Math.abs(head.y) < 1.1;
      av.label.style.display = onScreen ? 'block' : 'none';
      if (onScreen) {
        av.label.style.left = `${(head.x * 0.5 + 0.5) * window.innerWidth}px`;
        av.label.style.top = `${(-head.y * 0.5 + 0.5) * window.innerHeight}px`;
        const chat = peer.chat && peer.chat.until > performance.now() ? `<div class="bubble">${escapeHtml(peer.chat.text)}</div>` : '';
        const html = `${chat}<span>${escapeHtml(peer.info.name)}</span>`;
        if (av.label.innerHTML !== html) av.label.innerHTML = html;
      }
    }
    for (const [id, av] of this.avatars) {
      if (seen.has(id)) continue;
      av.vehicle.root.removeFromParent();
      av.human.root.removeFromParent();
      av.label.remove();
      this.avatars.delete(id);
    }
  }

  private ensure(peer: RemotePeer): Avatar {
    const info = peer.info!;
    const key = JSON.stringify([info.look, info.vehicle, info.vlook]);
    let av = this.avatars.get(peer.id);
    if (av && av.key === key) return av;
    if (av) {
      av.vehicle.root.removeFromParent();
      av.human.root.removeFromParent();
      av.label.remove();
    }
    const vehicle = new VehicleModel(vehicleById(info.vehicle), info.vlook);
    const human = new HumanModel(info.look);
    const label = document.createElement('div');
    label.className = 'name-tag';
    this.labels.appendChild(label);
    this.scene.add(vehicle.root);
    av = { key, vehicle, human, label, mode: '' };
    this.avatars.set(peer.id, av);
    return av;
  }

  private seat(av: Avatar, mode: 'drive' | 'foot'): void {
    av.human.root.removeFromParent();
    if (mode === 'drive') {
      av.vehicle.seat.add(av.human.root);
      av.human.root.position.set(0, -0.45, 0);
      av.human.root.quaternion.identity();
      av.human.root.scale.setScalar(0.85 * (av.human.look.height ?? 1));
    } else {
      this.scene.add(av.human.root);
      av.human.root.scale.setScalar(av.human.look.height ?? 1);
    }
    av.mode = mode;
  }

  clear(): void {
    for (const av of this.avatars.values()) {
      av.vehicle.root.removeFromParent();
      av.human.root.removeFromParent();
      av.label.remove();
    }
    this.avatars.clear();
  }

  count(): number {
    return this.avatars.size;
  }
}

const _y = new THREE.Vector3(0, 1, 0);

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}

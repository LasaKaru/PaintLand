import { BONE, CLIP_LOOPS, humanClips, type ClipName } from './HumanClips';
import * as THREE from 'three';
import { ModelKit, Pattern, applyPrint, printKind, type FabricPrint } from './ModelKit';
import { PaintMaterial } from '../render/PaintMaterial';

export type HairStyle = 'bob' | 'bun' | 'short' | 'curly' | 'long' | 'ponytail' | 'braids' | 'bald' | 'afro' | 'mohawk' | 'pigtails' | 'topknot' | 'spiky';
export type TopStyle = 'tee' | 'shirt' | 'hoodie' | 'dress' | 'sari' | 'osariya' | 'national' | 'jacket' | 'vest' | 'kurta' | 'kimono' | 'hanbok' | 'qipao' | 'aodai' | 'thobe' | 'abaya' | 'robe';
export type BottomStyle = 'trousers' | 'shorts' | 'skirt' | 'sarong' | 'cargo' | 'maxi';
export type HatStyle = 'none' | 'straw' | 'beret' | 'cap' | 'sunhat' | 'beanie' | 'crown' | 'helmet' | 'flowers' | 'conical' | 'catears' | 'wizard' | 'natcap' | 'bucket' | 'tophat' | 'visor' | 'headband' | 'bandana' | 'chef' | 'pirate' | 'party' | 'halo' | 'hijab' | 'turban' | 'kippah' | 'taqiyah';
export type GlassesStyle = 'none' | 'round' | 'sun' | 'star' | 'heart' | 'goggles' | 'monocle' | 'shield';
export type BackStyle = 'none' | 'backpack' | 'satchel' | 'guitar' | 'cape' | 'wings' | 'parasol' | 'kite' | 'rabana' | 'balloons' | 'jetpack' | 'easel';
export type EyeStyle = 'dots' | 'happy' | 'sleepy' | 'wink' | 'big' | 'sparkle' | 'lashes' | 'hearts';
export type MouthStyle = 'smile' | 'grin' | 'o' | 'cat' | 'smirk' | 'tongue' | 'fangs';
export type FaceDetail = 'none' | 'freckles' | 'moustache' | 'beard' | 'bindi' | 'facepaint' | 'gems' | 'whiskers';
export type Accessory = 'none' | 'earrings' | 'necklace' | 'headphones' | 'flower' | 'bowtie' | 'lei' | 'medal' | 'pearls' | 'tie' | 'cross';

/** Character creator values (docs/08 §1). */
export interface HumanLook {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  top: string;
  topStyle?: TopStyle;
  bottom: string;
  bottomStyle?: BottomStyle;
  shoes: string;
  scarf: string | null;
  hat: HatStyle;
  glasses?: GlassesStyle;
  back?: BackStyle;
  /** 0.9 – 1.1 */
  height?: number;
  eyes?: EyeStyle;
  mouth?: MouthStyle;
  face?: FaceDetail;
  acc?: Accessory;
  /** Fabric prints on the top and on the trousers/skirt. */
  print?: FabricPrint;
  bottomPrint?: FabricPrint;
  /** A pet that follows you on foot (see Pets.ts). */
  pet?: 'none' | 'fox' | 'cat' | 'crane';
  /** Body build: 1 average, lower slimmer, higher broader (0.85 – 1.3). Townspeople only. */
  build?: number;
  /** An older person's stoop, 0 – 0.35 (townspeople). */
  stoop?: number;
  /** A walking stick or a wheelchair (townspeople). */
  aid?: 'none' | 'cane' | 'wheelchair';
}

/**
 * Faith dress: worn by townspeople as part of everyday life (see world/Peoples.ts),
 * never sold in the shop or given as loot.
 */
export const FAITH_HATS: readonly HatStyle[] = ['hijab', 'turban', 'kippah', 'taqiyah'];
export const FAITH_TOPS: readonly TopStyle[] = ['robe'];
/** Long robes and dresses that reach the ankles. */
const LONG_TOPS: readonly TopStyle[] = ['dress', 'sari', 'osariya', 'kimono', 'qipao', 'aodai', 'thobe', 'abaya', 'robe'];

export const DEFAULT_HUMAN_LOOK: HumanLook = {
  skin: '#f0c7a6',
  hair: '#c8452e',
  hairStyle: 'bob',
  top: '#4f9a5a',
  topStyle: 'tee',
  bottom: '#3f5f9a',
  bottomStyle: 'trousers',
  shoes: '#2b2622',
  scarf: '#f4d23b',
  hat: 'none',
  glasses: 'none',
  back: 'none',
  height: 1,
};

/** Emotes from the emote wheel (the first is the quick wave). */
export const EMOTES = ['wave', 'ayubowan', 'cheer', 'dance', 'clap', 'bow', 'laugh', 'sitdown'] as const;
export type Emote = (typeof EMOTES)[number];
export const isEmote = (v: unknown): v is Emote => typeof v === 'string' && (EMOTES as readonly string[]).includes(v);

/** Quiet things to do in town: fishing, tea, tending plants, DJing, sleeping (see world/Leisure.ts). */
export const LEISURE_POSES = ['fish', 'reel', 'sip', 'tend', 'dj', 'sleep'] as const;
export type LeisurePose = (typeof LEISURE_POSES)[number];
export const isLeisurePose = (v: unknown): v is LeisurePose => typeof v === 'string' && (LEISURE_POSES as readonly string[]).includes(v);

export type HumanPose = 'idle' | 'walk' | 'run' | 'air' | 'sit' | 'ride' | Emote | LeisurePose;

const INK = '#2b2622';
const _clipQ = new THREE.Quaternion();
const _clipV = new THREE.Vector3();

/** A clip playing on a character, fading in or out. */
interface ClipLayer {
  name: ClipName;
  time: number;
  weight: number;
  target: number;
  fade: number;
  samplers: { bone: THREE.Object3D; position: boolean; interp: THREE.Interpolant }[];
}

/**
 * A paper-doll character: big head, strong silhouette, rigid body parts on a
 * skeleton of named bones (Hips, Spine, Head, LeftArm…, see HumanClips.ts).
 * Walking, running and the emotes are procedural; keyframed clips (throw,
 * pilot, climb, land) are crossfaded over them (docs/03 §6, docs/05 §3.4).
 * The parts are rigid (not a skinned mesh). Height ≈ 1.6 m, faces -Z,
 * origin at the feet.
 */
export class HumanModel {
  readonly root = new THREE.Group();
  readonly hips = new THREE.Bone();
  readonly chest = new THREE.Bone();
  readonly head = new THREE.Bone();
  private readonly legs: { hip: THREE.Bone; knee: THREE.Bone }[] = [];
  private readonly arms: { shoulder: THREE.Bone; elbow: THREE.Bone }[] = [];
  /** Every bone, for tools and for binding clips. */
  readonly skeleton: THREE.Skeleton;
  private layers: ClipLayer[] = [];
  private phase = Math.random() * 6;
  private blend = 0;
  private readonly headMeshes: THREE.Mesh[] = [];
  private hatMesh: THREE.Mesh | null = null;
  private hatOff = false;
  private headShown = true;

  constructor(readonly look: HumanLook = DEFAULT_HUMAN_LOOK) {
    this.root.name = 'human';
    this.hips.name = BONE.hips;
    this.chest.name = BONE.spine;
    this.head.name = BONE.head;
    const mat = new PaintMaterial({ vertexColors: true, flat: true, gloss: 0.08 });
    const topPrint = printKind(look.print);
    const bottomPrint = printKind(look.bottomPrint);
    const mesh = (g: THREE.BufferGeometry): THREE.Mesh => {
      applyPrint(g, look.top, topPrint, true);
      applyPrint(g, look.bottom, bottomPrint, true);
      const m = new THREE.Mesh(g, mat);
      m.castShadow = true;
      return m;
    };
    const topStyle = look.topStyle ?? 'tee';
    const bottomStyle = look.bottomStyle ?? 'trousers';
    const saree = topStyle === 'sari' || topStyle === 'osariya';
    const robe = LONG_TOPS.includes(topStyle) && topStyle !== 'dress' && !saree;
    const longSkirt = LONG_TOPS.includes(topStyle) || topStyle === 'hanbok' || bottomStyle === 'sarong' || bottomStyle === 'skirt' || bottomStyle === 'maxi';
    // The ao dai is worn over trousers: its panels fall to the knee.
    const legColour = topStyle === 'aodai' ? look.bottom : bottomStyle === 'shorts' || longSkirt ? look.skin : look.bottom;
    const skirtColour = topStyle === 'dress' || saree || robe ? look.top : look.bottom;

    this.root.scale.setScalar(look.height ?? 1);
    this.hips.position.y = 0.86;
    this.root.add(this.hips);

    // Pelvis, with a skirt, sarong or dress hem when chosen.
    const pelvis = new ModelKit().box(0.36, 0.2, 0.22, longSkirt ? skirtColour : look.bottom);
    if (longSkirt) {
      const len = topStyle === 'aodai' ? 0.5 : bottomStyle === 'sarong' || bottomStyle === 'maxi' || saree || robe || topStyle === 'hanbok' ? 0.72 : 0.42;
      pelvis.cylinder(0.2, 0.3, len, 8, skirtColour, { position: [0, -len / 2 + 0.05, 0], pattern: bottomStyle === 'sarong' ? Pattern.Planks : Pattern.None });
    }
    const pelvisMesh = mesh(pelvis.build(0.01, 1));
    pelvisMesh.scale.set(look.build ?? 1, 1, look.build ?? 1);
    this.hips.add(pelvisMesh);

    this.chest.position.y = 0.1;
    this.hips.add(this.chest);
    const torso = new ModelKit()
      .cylinder(0.2, 0.16, 0.5, 7, look.top, { position: [0, 0.25, 0] })
      .box(0.44, 0.12, 0.24, look.top, { position: [0, 0.46, 0] });
    if (topStyle === 'shirt') {
      torso.box(0.04, 0.42, 0.02, '#f6f0e4', { position: [0, 0.27, -0.2] });
      torso.box(0.26, 0.08, 0.06, '#f6f0e4', { position: [0, 0.5, -0.12] });
    } else if (topStyle === 'hoodie') {
      torso.blob(0.17, shadeHex(look.top, 0.85), { position: [0, 0.54, 0.12], scale: [1.2, 0.6, 0.8], detail: 1 });
      torso.box(0.26, 0.12, 0.04, shadeHex(look.top, 0.85), { position: [0, 0.14, -0.19] });
    } else if (topStyle === 'sari') {
      torso.box(0.14, 0.62, 0.3, shadeHex(look.top, 1.12), { position: [0.12, 0.22, 0], rotation: [0, 0, -0.5] });
      torso.box(0.5, 0.06, 0.3, '#e8c872', { position: [0, 0.0, 0] });
    } else if (topStyle === 'osariya') {
      // Kandyan osariya: the pleated frill (pota) round the waist, the pallu over the left shoulder.
      torso.cylinder(0.25, 0.3, 0.12, 14, shadeHex(look.top, 1.12), { position: [0, 0.02, 0], pattern: Pattern.Planks });
      torso.cylinder(0.305, 0.305, 0.025, 14, '#e8c872', { position: [0, -0.04, 0] });
      torso.box(0.14, 0.66, 0.3, shadeHex(look.top, 1.12), { position: [-0.12, 0.24, 0.02], rotation: [0, 0, 0.45] });
      torso.box(0.03, 0.66, 0.31, '#e8c872', { position: [-0.05, 0.24, 0.02], rotation: [0, 0, 0.45] });
    } else if (topStyle === 'national') {
      // Sri Lankan national dress: a long collarless white tunic over the sarong.
      torso.cylinder(0.2, 0.25, 0.32, 8, look.top, { position: [0, -0.1, 0] });
      torso.cylinder(0.1, 0.11, 0.05, 8, look.top, { position: [0, 0.54, 0] });
      for (let i = 0; i < 3; i++) torso.blob(0.014, '#e8c872', { position: [0, 0.44 - i * 0.1, -0.2], detail: 0 });
    } else if (topStyle === 'jacket') {
      // An open jacket: lapels, a light shirt showing down the front, pockets.
      torso.box(0.12, 0.44, 0.02, '#f6f0e4', { position: [0, 0.26, -0.195] });
      for (const s of [-1, 1]) {
        torso.box(0.07, 0.24, 0.03, shadeHex(look.top, 0.8), { position: [s * 0.075, 0.4, -0.2], rotation: [0, 0, s * 0.35] });
        torso.box(0.1, 0.06, 0.03, shadeHex(look.top, 0.8), { position: [s * 0.11, 0.1, -0.185] });
      }
    } else if (topStyle === 'vest') {
      // A sleeveless vest with a deep V and buttons.
      torso.box(0.1, 0.2, 0.02, look.skin, { position: [0, 0.44, -0.2], rotation: [0, 0, 0] });
      for (let i = 0; i < 3; i++) torso.blob(0.014, '#2b2622', { position: [0, 0.3 - i * 0.08, -0.2], detail: 0 });
    } else if (topStyle === 'kimono') {
      // Kimono or yukata: the left panel over the right, a white collar edge, a wide obi at the waist.
      torso.box(0.05, 0.4, 0.02, '#f6f0e4', { position: [-0.05, 0.3, -0.195], rotation: [0, 0, -0.45] });
      torso.cylinder(0.205, 0.2, 0.14, 10, shadeHex(look.top, 0.6), { position: [0, 0.06, 0] });
      torso.box(0.16, 0.12, 0.08, shadeHex(look.top, 0.6), { position: [0, 0.07, 0.2] });
    } else if (topStyle === 'hanbok') {
      // Hanbok: a short jeogori jacket with a white collar and a long ribbon (goreum); the skirt starts high.
      torso.cylinder(0.24, 0.3, 0.3, 12, look.bottom, { position: [0, -0.02, 0] });
      torso.box(0.16, 0.04, 0.02, '#f6f0e4', { position: [-0.03, 0.46, -0.2], rotation: [0, 0, -0.5] });
      torso.box(0.04, 0.26, 0.02, '#d8463a', { position: [0.04, 0.2, -0.22], rotation: [0, 0, 0.15] });
    } else if (topStyle === 'qipao') {
      // Qipao: a fitted dress with a mandarin collar and a curved closure.
      torso.cylinder(0.1, 0.11, 0.07, 10, look.top, { position: [0, 0.55, 0] });
      torso.box(0.14, 0.03, 0.02, '#e8c872', { position: [0.05, 0.44, -0.195], rotation: [0, 0, -0.4] });
      for (let i = 0; i < 3; i++) torso.blob(0.013, '#e8c872', { position: [0.1, 0.38 - i * 0.09, -0.195], detail: 0 });
    } else if (topStyle === 'aodai') {
      // Ao dai: a long tunic with a high collar, slit at the sides over trousers.
      torso.cylinder(0.1, 0.11, 0.07, 10, look.top, { position: [0, 0.55, 0] });
      torso.box(0.03, 0.2, 0.02, shadeHex(look.top, 0.8), { position: [0.08, 0.42, -0.195], rotation: [0, 0, -0.5] });
    } else if (topStyle === 'thobe') {
      // Thobe / kandura: a long plain robe with a small collar and buttons.
      torso.cylinder(0.09, 0.1, 0.06, 10, look.top, { position: [0, 0.55, 0] });
      for (let i = 0; i < 3; i++) torso.blob(0.012, shadeHex(look.top, 0.8), { position: [0, 0.46 - i * 0.07, -0.2], detail: 0 });
    } else if (topStyle === 'abaya') {
      // Abaya: a long, loose over-garment with a trim down the front.
      torso.box(0.03, 0.5, 0.02, shadeHex(look.top, 1.5), { position: [0, 0.24, -0.2] });
    } else if (topStyle === 'robe') {
      // A monastic robe: wrapped round, one end drawn over the left shoulder.
      torso.box(0.16, 0.66, 0.34, shadeHex(look.top, 0.88), { position: [-0.1, 0.24, 0], rotation: [0, 0, 0.5] });
      torso.cylinder(0.205, 0.205, 0.06, 10, shadeHex(look.top, 0.8), { position: [0, 0.02, 0] });
    } else if (topStyle === 'kurta') {
      // A long kurta: knee-length, with an embroidered placket.
      torso.cylinder(0.2, 0.27, 0.42, 8, look.top, { position: [0, -0.16, 0] });
      torso.box(0.06, 0.3, 0.02, '#e8c872', { position: [0, 0.4, -0.2] });
      torso.cylinder(0.271, 0.271, 0.03, 8, '#e8c872', { position: [0, -0.36, 0] });
    }
    if (look.scarf) torso.cylinder(0.12, 0.15, 0.1, 8, look.scarf, { position: [0, 0.54, 0] });
    const back = look.back ?? 'none';
    if (back === 'backpack') {
      torso.box(0.32, 0.36, 0.16, '#d8643a', { position: [0, 0.28, 0.2], pattern: Pattern.Planks });
      torso.box(0.26, 0.12, 0.05, '#f4d23b', { position: [0, 0.18, 0.29] });
    } else if (back === 'satchel') {
      torso.box(0.06, 0.6, 0.04, '#7a4a2a', { position: [0.05, 0.25, -0.18], rotation: [0, 0, 0.7] });
      torso.box(0.28, 0.22, 0.1, '#9a5a32', { position: [0.22, -0.05, 0.05] });
    } else if (back === 'guitar') {
      torso.blob(0.2, '#c8955a', { position: [0.05, 0.05, 0.2], scale: [1, 1.2, 0.35], detail: 1 });
      torso.box(0.06, 0.6, 0.05, '#7a4a2a', { position: [0.05, 0.5, 0.2], rotation: [0, 0, 0.1] });
    } else if (back === 'cape') {
      // A flowing painter's cape (loot).
      torso.box(0.46, 0.9, 0.04, '#9a2a4a', { position: [0, 0.12, 0.2], rotation: [0.18, 0, 0] });
      torso.box(0.5, 0.06, 0.2, '#f4c542', { position: [0, 0.55, 0.1] });
    } else if (back === 'wings') {
      // Paper-craft wings (legendary loot).
      for (const s of [-1, 1]) {
        torso.box(0.5, 0.28, 0.03, '#f6f0e4', { position: [s * 0.3, 0.38, 0.22], rotation: [0, s * -0.4, s * 0.35], nightGlow: 1 });
        torso.box(0.38, 0.2, 0.03, '#bfd9e8', { position: [s * 0.36, 0.18, 0.22], rotation: [0, s * -0.4, s * -0.2], nightGlow: 1 });
      }
    }
    if (back === 'kite') {
      // A diamond paper kite with a ribbon tail.
      torso.add(new THREE.OctahedronGeometry(0.28, 0).scale(0.8, 1.1, 0.06), '#e8559a', { position: [0, 0.4, 0.22] });
      torso.box(0.02, 0.6, 0.012, '#7a4a2a', { position: [0, 0.4, 0.235] });
      torso.box(0.45, 0.02, 0.012, '#7a4a2a', { position: [0, 0.45, 0.235] });
      for (let i = 0; i < 4; i++) torso.box(0.06, 0.04, 0.01, ['#f4d23b', '#3e6fa8'][i % 2], { position: [0.03 * (i % 2), 0.04 - i * 0.1, 0.24], rotation: [0, 0, 0.5] });
    } else if (back === 'rabana') {
      // A rabana (Sri Lankan frame drum) slung on the back.
      torso.cylinder(0.3, 0.3, 0.1, 18, '#c8955a', { position: [0, 0.28, 0.22], rotation: [Math.PI / 2, 0, 0], pattern: Pattern.Planks });
      torso.cylinder(0.27, 0.27, 0.105, 18, '#f0e0c0', { position: [0, 0.28, 0.225], rotation: [Math.PI / 2, 0, 0] });
      torso.box(0.06, 0.6, 0.03, '#7a4a2a', { position: [0.05, 0.25, -0.18], rotation: [0, 0, 0.7] });
    } else if (back === 'balloons') {
      torso.box(0.012, 0.9, 0.012, '#8c8a94', { position: [0.2, 0.7, 0.18] });
      for (let i = 0; i < 3; i++) torso.blob(0.12, ['#d8463a', '#f4d23b', '#3e6fa8'][i], { position: [0.2 + (i - 1) * 0.14, 1.2 + (i % 2) * 0.1, 0.18], scale: [1, 1.2, 1], detail: 1, roughness: 0 });
    } else if (back === 'jetpack') {
      for (const s of [-1, 1]) {
        torso.cylinder(0.09, 0.09, 0.42, 10, '#cfd6df', { position: [s * 0.1, 0.28, 0.22], pattern: Pattern.Glass });
        torso.cylinder(0.06, 0.09, 0.08, 10, INK, { position: [s * 0.1, 0.03, 0.22] });
        torso.cylinder(0.0, 0.06, 0.12, 8, '#ffb347', { position: [s * 0.1, -0.06, 0.22], rotation: [Math.PI, 0, 0], nightGlow: 1 });
      }
      torso.box(0.22, 0.2, 0.08, '#d8463a', { position: [0, 0.32, 0.2] });
    } else if (back === 'easel') {
      // A folded painter's easel and a canvas.
      for (const s of [-1, 1]) torso.box(0.03, 0.9, 0.03, '#9a5a32', { position: [s * 0.08, 0.3, 0.22], rotation: [0, 0, s * 0.08] });
      torso.box(0.34, 0.3, 0.02, '#f6f0e4', { position: [0, 0.32, 0.25] });
      torso.blob(0.06, '#3e86c9', { position: [-0.05, 0.33, 0.265], scale: [1.4, 1, 0.2], detail: 0 });
    }
    if (back === 'parasol') {
      // A paper parasol over the shoulder.
      torso.cylinder(0.012, 0.012, 1.1, 5, '#7a4a2a', { position: [0.18, 0.55, 0.14], rotation: [0.35, 0, -0.3] });
      torso.cylinder(0.02, 0.5, 0.2, 12, '#e0432f', { position: [0.34, 1.05, 0.33], rotation: [0.35, 0, -0.3], pattern: Pattern.Planks });
    }

    // Head: big, round-ish, with painted features.
    this.head.position.y = 0.6;
    this.chest.add(this.head);
    const headKit = new ModelKit()
      .cylinder(0.05, 0.06, 0.1, 6, look.skin, { position: [0, 0.03, 0] })
      .blob(0.2, look.skin, { position: [0, 0.24, 0], scale: [1, 1.08, 0.96], detail: 1, roughness: 0.04 })
      .blob(0.03, '#f09a8a', { position: [-0.12, 0.19, -0.16], scale: [1, 0.6, 0.4], detail: 0, roughness: 0 })
      .blob(0.03, '#f09a8a', { position: [0.12, 0.19, -0.16], scale: [1, 0.6, 0.4], detail: 0, roughness: 0 });
    addFace(headKit, look);
    // A headscarf or turban covers the hair.
    if (look.hat !== 'hijab' && look.hat !== 'turban') addHair(headKit, look);
    const hatKit = new ModelKit();
    addHat(hatKit, look);
    addAccessory(headKit, torso, look.acc ?? 'none');
    const torsoMesh = mesh(torso.build(0.012, 2));
    torsoMesh.scale.set(look.build ?? 1, 1, look.build ?? 1);
    this.chest.add(torsoMesh);
    addGlasses(headKit, look.glasses ?? 'none');
    const headMesh = mesh(headKit.build(0.008, 4));
    this.head.add(headMesh);
    this.headMeshes.push(headMesh);
    if (!hatKit.isEmpty) {
      this.hatMesh = mesh(hatKit.build(0.008, 5));
      this.head.add(this.hatMesh);
      this.headMeshes.push(this.hatMesh);
    }

    const sleeve = topStyle === 'tee' || topStyle === 'dress' || topStyle === 'osariya' || topStyle === 'vest' || topStyle === 'robe' ? look.skin : look.top;
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Bone();
      shoulder.name = side < 0 ? BONE.leftArm : BONE.rightArm;
      shoulder.position.set(side * 0.25, 0.44, 0);
      const upperKit = new ModelKit().cylinder(0.055, 0.05, 0.3, 6, topStyle === 'tee' || topStyle === 'osariya' ? look.top : sleeve, { position: [0, -0.15, 0] });
      if (topStyle === 'vest') upperKit.cylinder(0.075, 0.07, 0.06, 6, look.top, { position: [0, -0.01, 0] });
      // The osariya blouse has puffed sleeves.
      if (topStyle === 'osariya') upperKit.blob(0.08, look.top, { position: [0, -0.06, 0], scale: [1, 0.9, 1], detail: 0 });
      const upper = upperKit.build(0.006, side);
      shoulder.add(mesh(upper));
      const elbow = new THREE.Bone();
      elbow.name = side < 0 ? BONE.leftForeArm : BONE.rightForeArm;
      elbow.position.y = -0.3;
      const fore = new ModelKit()
        .cylinder(0.045, 0.04, 0.26, 6, sleeve, { position: [0, -0.13, 0] })
        .blob(0.055, look.skin, { position: [0, -0.29, 0], detail: 0 })
        .build(0.006, side + 3);
      elbow.add(mesh(fore));
      shoulder.add(elbow);
      this.chest.add(shoulder);
      this.arms.push({ shoulder, elbow });
    }

    for (const side of [-1, 1]) {
      const hip = new THREE.Bone();
      hip.name = side < 0 ? BONE.leftUpLeg : BONE.rightUpLeg;
      hip.position.set(side * 0.1, -0.06, 0);
      const thigh = new ModelKit().cylinder(0.075, 0.065, 0.42, 6, bottomStyle === 'shorts' ? look.bottom : legColour, { position: [0, -0.21, 0], scale: bottomStyle === 'shorts' ? [1, 0.5, 1] : [1, 1, 1] }).cylinder(0.06, 0.06, 0.24, 6, look.skin, { position: [0, -0.3, 0] });
      // Cargo trousers: a big patch pocket on each thigh.
      if (bottomStyle === 'cargo' && !longSkirt) thigh.box(0.03, 0.12, 0.1, shadeHex(look.bottom, 0.82), { position: [side * 0.075, -0.24, 0] });
      hip.add(mesh(thigh.build(0.006, side + 5)));
      const knee = new THREE.Bone();
      knee.name = side < 0 ? BONE.leftLeg : BONE.rightLeg;
      knee.position.y = -0.42;
      const shin = new ModelKit()
        .cylinder(0.06, 0.05, 0.36, 6, (bottomStyle === 'trousers' || bottomStyle === 'cargo') && !longSkirt ? look.bottom : look.skin, { position: [0, -0.18, 0] })
        .box(0.12, 0.09, 0.24, look.shoes, { position: [0, -0.37, -0.04] })
        .build(0.006, side + 7);
      knee.add(mesh(shin));
      hip.add(knee);
      this.hips.add(hip);
      this.legs.push({ hip, knee });
    }
    this.skeleton = new THREE.Skeleton([this.hips, this.chest, this.head, ...this.arms.flatMap((a) => [a.shoulder, a.elbow]), ...this.legs.flatMap((l) => [l.hip, l.knee])]);
    // A walking stick in the right hand, or a wheelchair to sit in.
    if (look.aid === 'cane') {
      const cane = new THREE.Mesh(caneGeometry(), mat);
      cane.rotation.x = Math.PI - 0.25;
      this.hold(cane);
    } else if (look.aid === 'wheelchair') {
      const chair = new THREE.Mesh(wheelchairGeometry(), mat);
      chair.castShadow = true;
      this.root.add(chair);
    }
  }

  /** Sits in a wheelchair (poses become sitting ones). */
  get seated(): boolean {
    return this.look.aid === 'wheelchair';
  }

  /** The clip playing most strongly now, if any. */
  get clip(): ClipName | null {
    let best: ClipLayer | null = null;
    for (const l of this.layers) if (l.target > 0 && (!best || l.weight > best.weight)) best = l;
    return best?.name ?? null;
  }

  /**
   * Crossfade into a keyframed clip over `fade` seconds (others fade out).
   * One-shot clips (throw, land) fade back to the procedural motion by themselves.
   */
  play(name: ClipName, fade = 0.15): void {
    for (const l of this.layers) if (l.name !== name) l.target = 0;
    let layer = this.layers.find((l) => l.name === name);
    if (!layer) {
      const clip = humanClips()[name];
      const samplers: ClipLayer['samplers'] = [];
      for (const track of clip.tracks) {
        const [boneName, prop] = track.name.split('.');
        const bone = this.skeleton.getBoneByName(boneName);
        if (!bone) continue;
        const position = prop === 'position';
        const size = position ? 3 : 4;
        const interp = position ? new THREE.LinearInterpolant(track.times, track.values, size, new Float32Array(size)) : new THREE.QuaternionLinearInterpolant(track.times, track.values, size, new Float32Array(size));
        samplers.push({ bone, position, interp });
      }
      layer = { name, time: 0, weight: 0, target: 1, fade, samplers };
      this.layers.push(layer);
    }
    // Restart a one-shot clip (another throw), keep a looping one going.
    if (!CLIP_LOOPS[name] || layer.target === 0) layer.time = 0;
    layer.target = 1;
    layer.fade = fade;
  }

  /** Fade a clip (or every clip) back out to the procedural motion. */
  stop(name?: ClipName, fade = 0.2): void {
    for (const l of this.layers)
      if (!name || l.name === name) {
        l.target = 0;
        l.fade = fade;
      }
  }

  /** Blend the playing clips over the pose the procedural code just set. */
  private applyClips(dt: number): void {
    for (const l of this.layers) {
      const clip = humanClips()[l.name];
      l.time += dt;
      if (CLIP_LOOPS[l.name]) l.time %= clip.duration;
      else if (l.time >= clip.duration - l.fade) l.target = 0;
      const step = dt / Math.max(0.01, l.fade);
      l.weight = l.target > l.weight ? Math.min(l.target, l.weight + step) : Math.max(l.target, l.weight - step);
      if (l.weight <= 0) continue;
      const t = Math.min(l.time, clip.duration);
      for (const s of l.samplers) {
        const v = s.interp.evaluate(t);
        if (s.position) s.bone.position.lerp(_clipV.set(v[0], v[1], v[2]), l.weight);
        else s.bone.quaternion.slerp(_clipQ.set(v[0], v[1], v[2], v[3]), l.weight);
      }
    }
    this.layers = this.layers.filter((l) => l.weight > 0 || l.target > 0);
  }

  /** Hold something in the right hand (a fishing rod); null lets go. */
  hold(obj: THREE.Object3D | null): void {
    const hand = this.arms[1].elbow;
    if (this.held) hand.remove(this.held);
    this.held = obj;
    if (obj) {
      obj.position.set(0, -0.29, 0);
      hand.add(obj);
    }
  }
  private held: THREE.Object3D | null = null;

  /** Hide the head in first person so it never covers the lens. */
  setHeadVisible(visible: boolean): void {
    this.headShown = visible;
    for (const m of this.headMeshes) m.visible = visible && !(m === this.hatMesh && this.hatOff);
  }

  /** Take the hat off (a tall hat in a low car) or put it back on. */
  setHatVisible(visible: boolean): void {
    this.hatOff = !visible;
    this.setHeadVisible(this.headShown);
  }

  get hatVisible(): boolean {
    return !!this.hatMesh && !this.hatOff;
  }

  /**
   * Procedural animation. `speed` in m/s drives stride; poses blend smoothly.
   */
  animate(dt: number, pose: HumanPose, speed: number, time: number): void {
    // In a wheelchair every pose is a seated one; the hands push the wheels while moving.
    if (this.seated) {
      this.procedural(dt, 'sit', 0, time);
      if (pose === 'walk' || pose === 'run') {
        const push = Math.sin(time * 4) * 0.35;
        for (const arm of this.arms) arm.shoulder.rotation.x = 0.2 + push;
      } else if (pose === 'wave') this.arms[1].shoulder.rotation.set(0, 0, -2.4 + Math.sin(time * 9) * 0.25);
    } else this.procedural(dt, pose, speed, time);
    if (this.layers.length) this.applyClips(dt);
    // An older person's gentle stoop.
    if (this.look.stoop) this.chest.rotation.x -= this.look.stoop;
  }

  private procedural(dt: number, pose: HumanPose, speed: number, time: number): void {
    const moving = pose === 'walk' || pose === 'run';
    this.blend += ((moving ? 1 : 0) - this.blend) * Math.min(1, dt * 8);
    const stride = pose === 'run' ? 1.0 : 0.6;
    this.phase += dt * (2.2 + speed * 1.35);
    const p = this.phase;
    const b = this.blend;
    const swing = Math.sin(p) * stride * b;
    const lift = Math.max(0, Math.cos(p)) * stride * b;
    const liftB = Math.max(0, -Math.cos(p)) * stride * b;
    this.hips.rotation.set(0, 0, 0);
    this.head.rotation.z = 0;

    if (pose === 'sit' || pose === 'ride') {
      const ride = pose === 'ride';
      for (const [i, leg] of this.legs.entries()) {
        leg.hip.rotation.set(ride ? 1.2 : 1.45, 0, ride ? (i ? -0.25 : 0.25) : 0);
        leg.knee.rotation.x = ride ? -1.0 : -1.4;
      }
      this.arms[0].shoulder.rotation.set(1.0, 0, 0.15);
      this.arms[1].shoulder.rotation.set(1.0, 0, -0.15);
      for (const arm of this.arms) arm.elbow.rotation.x = 0.4;
      this.hips.position.y = 0.5;
      this.chest.rotation.x = ride ? -0.2 : -0.05;
      this.head.rotation.set(Math.sin(time * 1.3) * 0.04, Math.sin(time * 0.7) * 0.15, 0);
      return;
    }
    for (const leg of this.legs) leg.hip.rotation.z = 0;

    if (pose === 'sleep') {
      // Lying on your back, arms by your sides, breathing slowly.
      for (const leg of this.legs) {
        leg.hip.rotation.set(0.05, 0, 0);
        leg.knee.rotation.x = -0.1;
      }
      this.arms[0].shoulder.rotation.set(0.1, 0, 0.2);
      this.arms[1].shoulder.rotation.set(0.1, 0, -0.2);
      for (const arm of this.arms) arm.elbow.rotation.x = 0.3;
      this.hips.rotation.x = -Math.PI / 2;
      this.hips.position.y = 0.22;
      this.chest.rotation.x = Math.sin(time * 0.9) * 0.02;
      this.head.rotation.set(0.1, 0.25, 0);
      return;
    }
    if (pose === 'air') {
      this.legs[0].hip.rotation.x = 0.7;
      this.legs[0].knee.rotation.x = -1.1;
      this.legs[1].hip.rotation.x = -0.3;
      this.legs[1].knee.rotation.x = -0.5;
      this.arms[0].shoulder.rotation.set(-0.4, 0, 0.9);
      this.arms[1].shoulder.rotation.set(0.2, 0, -0.9);
      this.hips.position.y = 0.86;
      return;
    }

    this.legs[0].hip.rotation.x = swing;
    this.legs[1].hip.rotation.x = -swing;
    this.legs[0].knee.rotation.x = -lift * 1.2;
    this.legs[1].knee.rotation.x = -liftB * 1.2;
    this.arms[0].shoulder.rotation.set(-swing * 0.8, 0, 0.12);
    this.arms[1].shoulder.rotation.set(swing * 0.8, 0, -0.12);
    this.arms[0].elbow.rotation.x = 0.3 + (pose === 'run' ? 0.8 : 0.2) * b;
    this.arms[1].elbow.rotation.x = 0.3 + (pose === 'run' ? 0.8 : 0.2) * b;
    const breathe = Math.sin(time * 2) * 0.01 * (1 - b);
    const bob = Math.abs(Math.sin(p)) * 0.05 * b * stride;
    this.hips.position.y = 0.86 + bob + breathe;
    this.chest.rotation.set(-(pose === 'run' ? 0.22 : 0.06) * b, 0, 0);
    this.head.rotation.set(-this.chest.rotation.x * 0.6, 0, 0);
    if (isEmote(pose)) this.emote(pose, time);
    else if (isLeisurePose(pose)) this.leisure(pose, time);
  }

  /** Standing poses for the quiet things to do (rotation.x > 0 swings a limb forward). */
  private leisure(p: LeisurePose, time: number): void {
    const [left, right] = this.arms;
    switch (p) {
      case 'fish':
      case 'reel': {
        // Both hands on the rod, held out in front; reeling winds the left hand round.
        const wind = p === 'reel' ? Math.sin(time * 11) * 0.25 : Math.sin(time * 1.3) * 0.03;
        right.shoulder.rotation.set(0.95, 0, -0.12);
        right.elbow.rotation.x = 0.55;
        left.shoulder.rotation.set(0.85 + wind, 0, 0.35);
        left.elbow.rotation.x = 1.2 + wind;
        this.chest.rotation.x = p === 'reel' ? 0.08 : -0.03;
        this.head.rotation.x = -0.12;
        break;
      }
      case 'sip': {
        // Tea: the cup comes up to the lips every few seconds.
        const up = Math.max(0, Math.sin(time * 0.9)) ** 2;
        right.shoulder.rotation.set(0.5 + up * 0.5, 0, -0.2);
        right.elbow.rotation.x = 1.3 + up * 0.8;
        left.shoulder.rotation.set(0.5, 0, 0.25);
        left.elbow.rotation.x = 1.4;
        this.head.rotation.x = -0.1 + up * 0.15;
        break;
      }
      case 'tend':
        // Bending to water the plants (or stroke a pet).
        this.chest.rotation.x = -0.55;
        this.head.rotation.x = -0.2;
        right.shoulder.rotation.set(1.1 + Math.sin(time * 2) * 0.12, 0, -0.1);
        right.elbow.rotation.x = 0.2;
        left.shoulder.rotation.set(0.4, 0, 0.2);
        left.elbow.rotation.x = 0.6;
        break;
      case 'dj': {
        // Hands on the decks, head nodding to the beat.
        const nod = Math.sin(time * 6.5);
        right.shoulder.rotation.set(0.9, 0, -0.25);
        left.shoulder.rotation.set(0.9 + Math.max(0, Math.sin(time * 3.2)) * 0.25, 0, 0.25);
        right.elbow.rotation.x = left.elbow.rotation.x = 0.9;
        this.head.rotation.set(0.1 + nod * 0.12, 0, 0);
        this.hips.position.y = 0.86 - Math.abs(nod) * 0.03;
        break;
      }
    }
  }

  /** Emote poses (rotation.x > 0 swings a limb forward; chest.x < 0 leans forward). */
  private emote(e: Emote, time: number): void {
    const [left, right] = this.arms;
    switch (e) {
      case 'wave':
        right.shoulder.rotation.set(0, 0, -2.6 + Math.sin(time * 9) * 0.25);
        right.elbow.rotation.x = 0.4;
        break;
      case 'ayubowan':
        // The Sri Lankan greeting: palms together at the chest, a small bow.
        left.shoulder.rotation.set(0.75, 0, 0.55);
        right.shoulder.rotation.set(0.75, 0, -0.55);
        left.elbow.rotation.x = right.elbow.rotation.x = 1.75;
        this.chest.rotation.x = -0.25 - Math.max(0, Math.sin(time * 1.5)) * 0.1;
        this.head.rotation.x = -0.15;
        break;
      case 'cheer': {
        const hop = Math.abs(Math.sin(time * 7));
        left.shoulder.rotation.set(0, 0, 2.7 + hop * 0.2);
        right.shoulder.rotation.set(0, 0, -2.7 - hop * 0.2);
        left.elbow.rotation.x = right.elbow.rotation.x = 0.2;
        this.hips.position.y = 0.86 + hop * 0.12;
        this.head.rotation.x = 0.2;
        break;
      }
      case 'dance': {
        const beat = Math.sin(time * 6);
        this.hips.rotation.z = beat * 0.12;
        this.hips.rotation.y = Math.sin(time * 3) * 0.3;
        this.hips.position.y = 0.86 - Math.abs(beat) * 0.05;
        left.shoulder.rotation.set(0.3, 0, 1.6 + beat * 0.8);
        right.shoulder.rotation.set(0.3, 0, -1.6 + beat * 0.8);
        left.elbow.rotation.x = right.elbow.rotation.x = 0.9;
        for (const [i, leg] of this.legs.entries()) {
          leg.hip.rotation.x = (i ? -1 : 1) * beat * 0.25;
          leg.knee.rotation.x = -Math.max(0, (i ? -1 : 1) * beat) * 0.6;
        }
        this.head.rotation.z = -beat * 0.15;
        break;
      }
      case 'clap': {
        const open = 0.35 + Math.max(0, Math.sin(time * 14)) * 0.35;
        left.shoulder.rotation.set(1.2, 0, open);
        right.shoulder.rotation.set(1.2, 0, -open);
        left.elbow.rotation.x = right.elbow.rotation.x = 0.5;
        break;
      }
      case 'bow':
        this.chest.rotation.x = -0.75;
        this.head.rotation.x = -0.2;
        left.shoulder.rotation.set(0.1, 0, 0.1);
        right.shoulder.rotation.set(0.1, 0, -0.1);
        left.elbow.rotation.x = right.elbow.rotation.x = 0.1;
        break;
      case 'laugh': {
        const shake = Math.sin(time * 18) * 0.04;
        this.chest.rotation.x = 0.18 + shake;
        this.head.rotation.x = 0.35 + shake;
        left.shoulder.rotation.set(0.6, 0, 0.5);
        right.shoulder.rotation.set(0.6, 0, -0.5);
        left.elbow.rotation.x = right.elbow.rotation.x = 1.5;
        break;
      }
      case 'sitdown':
        // Sitting on the ground, legs out, leaning back on the hands.
        this.hips.position.y = 0.2;
        for (const leg of this.legs) {
          leg.hip.rotation.set(1.45, 0, 0);
          leg.knee.rotation.x = -0.35;
        }
        left.shoulder.rotation.set(-0.5, 0, 0.3);
        right.shoulder.rotation.set(-0.5, 0, -0.3);
        left.elbow.rotation.x = right.elbow.rotation.x = 0;
        this.chest.rotation.x = 0.15;
        this.head.rotation.x = -0.1 + Math.sin(time * 0.8) * 0.05;
        break;
    }
  }
}

function addHair(k: ModelKit, look: HumanLook): void {
  const c = look.hair;
  switch (look.hairStyle) {
    case 'bob':
      k.blob(0.22, c, { position: [0, 0.3, 0.02], scale: [1.08, 0.9, 1.05], detail: 1, roughness: 0.08 });
      k.box(0.44, 0.2, 0.3, c, { position: [0, 0.17, 0.08] });
      k.box(0.3, 0.06, 0.08, c, { position: [0, 0.37, -0.17], rotation: [0.3, 0, 0] });
      break;
    case 'bun':
      k.blob(0.21, c, { position: [0, 0.3, 0.02], scale: [1.02, 0.85, 1.02], detail: 1, roughness: 0.05 });
      k.blob(0.1, c, { position: [0, 0.5, 0.1], detail: 1 });
      break;
    case 'short':
      k.blob(0.21, c, { position: [0, 0.32, 0.03], scale: [1.02, 0.75, 1.02], detail: 1, roughness: 0.1 });
      break;
    case 'curly':
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        k.blob(0.09, c, { position: [Math.cos(a) * 0.16, 0.36 + Math.sin(i) * 0.03, Math.sin(a) * 0.14 + 0.03], detail: 0, seed: i });
      }
      k.blob(0.17, c, { position: [0, 0.38, 0.03], detail: 1 });
      break;
    case 'long':
      k.blob(0.22, c, { position: [0, 0.3, 0.02], scale: [1.06, 0.9, 1.05], detail: 1, roughness: 0.06 });
      k.box(0.42, 0.55, 0.16, c, { position: [0, 0.02, 0.12] });
      break;
    case 'ponytail':
      k.blob(0.21, c, { position: [0, 0.31, 0.02], scale: [1.02, 0.85, 1.02], detail: 1, roughness: 0.05 });
      k.blob(0.09, c, { position: [0, 0.2, 0.26], scale: [0.8, 2.2, 0.8], rotation: [0.4, 0, 0], detail: 1 });
      break;
    case 'braids':
      k.blob(0.21, c, { position: [0, 0.31, 0.02], scale: [1.02, 0.85, 1.02], detail: 1, roughness: 0.05 });
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) k.blob(0.05, c, { position: [s * 0.17, 0.18 - i * 0.09, 0.04], detail: 0 });
      break;
    case 'afro':
      k.blob(0.27, c, { position: [0, 0.4, 0.1], scale: [1.08, 0.9, 0.95], detail: 2, roughness: 0.12 });
      break;
    case 'mohawk':
      k.blob(0.2, c, { position: [0, 0.3, 0.03], scale: [1, 0.7, 1], detail: 1, roughness: 0.04 });
      for (let i = 0; i < 5; i++) k.cylinder(0.0, 0.05, 0.16, 4, c, { position: [0, 0.5 - Math.abs(i - 2) * 0.015, -0.12 + i * 0.07], rotation: [(i - 2) * 0.25, 0, 0] });
      break;
    case 'pigtails':
      k.blob(0.21, c, { position: [0, 0.31, 0.02], scale: [1.02, 0.85, 1.02], detail: 1, roughness: 0.05 });
      for (const s of [-1, 1]) k.blob(0.08, c, { position: [s * 0.24, 0.24, 0.06], scale: [0.9, 1.8, 0.9], rotation: [0, 0, s * 0.5], detail: 1 });
      break;
    case 'topknot':
      k.blob(0.21, c, { position: [0, 0.3, 0.02], scale: [1.02, 0.8, 1.02], detail: 1, roughness: 0.05 });
      k.blob(0.08, c, { position: [0, 0.53, 0.02], scale: [1, 0.8, 1], detail: 1 });
      k.cylinder(0.05, 0.05, 0.03, 8, '#d8463a', { position: [0, 0.48, 0.02] });
      break;
    case 'spiky':
      k.blob(0.2, c, { position: [0, 0.31, 0.03], scale: [1.02, 0.75, 1.02], detail: 1, roughness: 0.04 });
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        k.cylinder(0.0, 0.05, 0.14, 4, c, { position: [Math.cos(a) * 0.12, 0.44, Math.sin(a) * 0.12 + 0.03], rotation: [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6] });
      }
      break;
    case 'bald':
      break;
  }
}

let caneGeo: THREE.BufferGeometry | null = null;
/** A wooden walking stick (along +Y from the hand). */
function caneGeometry(): THREE.BufferGeometry {
  return (caneGeo ??= new ModelKit()
    .cylinder(0.018, 0.022, 0.86, 6, '#7a4a2a', { position: [0, 0.43, 0] })
    .box(0.12, 0.03, 0.03, '#7a4a2a', { position: [0.04, 0.02, 0] })
    .cylinder(0.024, 0.024, 0.03, 6, INK, { position: [0, 0.86, 0] })
    .build(0.004, 6));
}

let chairGeo: THREE.BufferGeometry | null = null;
/** A wheelchair: two big wheels, small front castors, seat, back and footrest (seat at hip height when sitting). */
function wheelchairGeometry(): THREE.BufferGeometry {
  if (chairGeo) return chairGeo;
  const k = new ModelKit();
  const frame = '#5a6070';
  for (const s of [-1, 1]) {
    k.cylinder(0.3, 0.3, 0.04, 16, '#2b2622', { position: [s * 0.28, 0.3, 0.06], rotation: [0, 0, Math.PI / 2] });
    k.cylinder(0.24, 0.24, 0.045, 16, '#c9c9d6', { position: [s * 0.28, 0.3, 0.06], rotation: [0, 0, Math.PI / 2] });
    k.cylinder(0.06, 0.06, 0.04, 8, '#2b2622', { position: [s * 0.2, 0.06, -0.34], rotation: [0, 0, Math.PI / 2] });
    k.box(0.03, 0.03, 0.5, frame, { position: [s * 0.22, 0.46, -0.08] });
    k.box(0.03, 0.5, 0.03, frame, { position: [s * 0.22, 0.7, 0.2] });
  }
  k.box(0.44, 0.05, 0.42, '#3e6fa8', { position: [0, 0.46, -0.04] });
  k.box(0.44, 0.4, 0.04, '#3e6fa8', { position: [0, 0.72, 0.2] });
  k.box(0.36, 0.03, 0.14, frame, { position: [0, 0.12, -0.42] });
  return (chairGeo = k.build(0.006, 6));
}

/** The hat (its own mesh, so it can come off in a low car). */
function addHat(k: ModelKit, look: HumanLook): void {
  switch (look.hat) {
    case 'hijab': {
      // A headscarf: round the head and under the chin, falling to the shoulders; the face stays open.
      const c = look.scarf ?? shadeHex(look.top, 0.85);
      k.blob(0.228, c, { position: [0, 0.27, 0.05], scale: [1.02, 1.04, 0.86], detail: 1, roughness: 0.03 });
      k.cylinder(0.15, 0.22, 0.16, 12, c, { position: [0, 0.05, 0.02] });
      k.box(0.3, 0.2, 0.08, c, { position: [0, 0.02, 0.14], rotation: [0.25, 0, 0] });
      break;
    }
    case 'turban': {
      // A dastar: wound layers rising to a point at the front.
      const c = look.scarf ?? '#2d4f8f';
      k.blob(0.215, c, { position: [0, 0.33, 0.03], scale: [1.02, 0.78, 1.02], detail: 1, roughness: 0.03 });
      k.cylinder(0.2, 0.215, 0.1, 12, shadeHex(c, 0.88), { position: [0, 0.37, 0.03] });
      k.box(0.22, 0.12, 0.05, shadeHex(c, 1.12), { position: [0, 0.42, -0.17], rotation: [0.4, 0, 0] });
      break;
    }
    case 'kippah':
      k.cylinder(0.1, 0.1, 0.025, 12, look.scarf ?? '#2d3f6f', { position: [0, 0.445, 0.05] });
      break;
    case 'taqiyah':
      // A round white prayer cap with a stitched pattern.
      k.cylinder(0.19, 0.2, 0.09, 14, '#f6f0e4', { position: [0, 0.43, 0.02], pattern: Pattern.Thatch });
      break;
    case 'straw':
      k.cylinder(0.34, 0.34, 0.03, 14, '#e8c872', { position: [0, 0.42, 0], pattern: Pattern.Thatch });
      k.cylinder(0.16, 0.19, 0.14, 12, '#e8c872', { position: [0, 0.5, 0], pattern: Pattern.Thatch });
      k.cylinder(0.195, 0.195, 0.04, 12, '#d8463a', { position: [0, 0.45, 0] });
      break;
    case 'natcap':
      // A round white cap with a gold band (worn with the national dress).
      k.cylinder(0.2, 0.215, 0.11, 14, '#f6f0e4', { position: [0, 0.43, 0.01] });
      k.cylinder(0.218, 0.218, 0.03, 14, '#e8c872', { position: [0, 0.39, 0.01] });
      break;
    case 'beret':
      k.blob(0.2, '#d8463a', { position: [0.03, 0.45, 0.02], scale: [1.1, 0.4, 1.1], detail: 1, roughness: 0.02 });
      break;
    case 'cap':
      k.blob(0.2, '#3e6fa8', { position: [0, 0.4, 0.02], scale: [1.05, 0.6, 1.05], detail: 1, roughness: 0.02 });
      k.box(0.24, 0.02, 0.16, '#3e6fa8', { position: [0, 0.37, -0.22] });
      break;
    case 'sunhat':
      k.cylinder(0.4, 0.42, 0.02, 16, '#f6f0e4', { position: [0, 0.4, 0] });
      k.blob(0.19, '#f6f0e4', { position: [0, 0.44, 0], scale: [1, 0.6, 1], detail: 1 });
      k.cylinder(0.2, 0.2, 0.05, 12, '#e8559a', { position: [0, 0.44, 0] });
      break;
    case 'beanie':
      k.blob(0.21, '#f08a2e', { position: [0, 0.38, 0.02], scale: [1.02, 0.8, 1.02], detail: 1, roughness: 0.02 });
      k.blob(0.06, '#f6f0e4', { position: [0, 0.55, 0.02], detail: 0 });
      break;
    case 'crown':
      k.cylinder(0.19, 0.2, 0.1, 10, '#f4c542', { position: [0, 0.47, 0], pattern: Pattern.Glass });
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        k.cylinder(0.0, 0.04, 0.1, 4, '#f4c542', { position: [Math.cos(a) * 0.18, 0.56, Math.sin(a) * 0.18] });
        k.blob(0.025, '#e8559a', { position: [Math.cos(a) * 0.195, 0.47, Math.sin(a) * 0.195], detail: 0, nightGlow: 1 });
      }
      break;
    case 'helmet':
      k.blob(0.24, '#f6f0e4', { position: [0, 0.36, 0.02], scale: [1.04, 0.95, 1.08], detail: 1, roughness: 0 });
      k.box(0.3, 0.08, 0.02, '#3e9fd8', { position: [0, 0.3, -0.24], pattern: Pattern.Glass });
      k.box(0.04, 0.04, 0.48, '#d8463a', { position: [0, 0.6, 0.02] });
      break;
    case 'flowers':
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        k.blob(0.05, ['#e8559a', '#f4d23b', '#f6f0e4', '#9a5bd6'][i % 4], { position: [Math.cos(a) * 0.19, 0.44, Math.sin(a) * 0.19], detail: 0 });
      }
      break;
    case 'conical':
      // Nón lá: the Vietnamese leaf hat.
      k.cylinder(0.01, 0.4, 0.22, 16, '#e8d49a', { position: [0, 0.5, 0], pattern: Pattern.Thatch });
      k.cylinder(0.401, 0.401, 0.012, 16, '#c8a65a', { position: [0, 0.39, 0] });
      break;
    case 'catears':
      k.box(0.36, 0.03, 0.05, INK, { position: [0, 0.43, 0.02], rotation: [0.2, 0, 0] });
      for (const s of [-1, 1]) {
        k.cylinder(0.0, 0.07, 0.13, 4, INK, { position: [s * 0.12, 0.5, 0.02], rotation: [0, Math.PI / 4, s * -0.3] });
        k.cylinder(0.0, 0.04, 0.08, 4, '#f7b8cf', { position: [s * 0.118, 0.49, -0.0], rotation: [0, Math.PI / 4, s * -0.3] });
      }
      break;
    case 'wizard':
      k.cylinder(0.3, 0.3, 0.02, 16, '#3e3a8a', { position: [0, 0.41, 0] });
      k.cylinder(0.0, 0.19, 0.5, 12, '#3e3a8a', { position: [0, 0.66, 0.03], rotation: [0.15, 0, 0] });
      k.blob(0.035, '#f4d23b', { position: [0.06, 0.62, -0.13], detail: 0, nightGlow: 1 });
      k.blob(0.025, '#f4d23b', { position: [-0.07, 0.72, -0.08], detail: 0, nightGlow: 1 });
      break;
    case 'bucket':
      k.cylinder(0.19, 0.21, 0.14, 12, '#c8955a', { position: [0, 0.47, 0.01] });
      k.cylinder(0.21, 0.3, 0.06, 14, '#c8955a', { position: [0, 0.4, 0.01] });
      break;
    case 'tophat':
      k.cylinder(0.3, 0.3, 0.02, 16, INK, { position: [0, 0.41, 0] });
      k.cylinder(0.17, 0.18, 0.34, 14, INK, { position: [0, 0.58, 0] });
      k.cylinder(0.182, 0.182, 0.05, 14, '#d8463a', { position: [0, 0.45, 0] });
      break;
    case 'visor':
      k.add(new THREE.TorusGeometry(0.2, 0.025, 4, 16, Math.PI * 1.3).rotateX(Math.PI / 2).rotateY(Math.PI * 0.35), '#f6f0e4', { position: [0, 0.38, 0.02] });
      k.box(0.3, 0.02, 0.16, '#3e9fd8', { position: [0, 0.37, -0.24] });
      break;
    case 'headband':
      k.cylinder(0.215, 0.215, 0.05, 14, '#e8559a', { position: [0, 0.34, 0.02] });
      break;
    case 'bandana':
      k.blob(0.215, '#d8463a', { position: [0, 0.37, 0.03], scale: [1.02, 0.62, 1.02], detail: 1, roughness: 0.02 });
      k.box(0.08, 0.14, 0.03, '#d8463a', { position: [0.04, 0.26, 0.23], rotation: [0.3, 0, 0.3] });
      break;
    case 'chef':
      k.cylinder(0.2, 0.2, 0.1, 14, '#f6f0e4', { position: [0, 0.44, 0.01] });
      k.blob(0.24, '#f6f0e4', { position: [0, 0.6, 0.01], scale: [1, 0.7, 1], detail: 1, roughness: 0.1 });
      break;
    case 'pirate':
      k.box(0.5, 0.16, 0.16, INK, { position: [0, 0.48, 0.02], rotation: [0, 0, 0] });
      k.blob(0.2, INK, { position: [0, 0.48, 0.02], scale: [1.2, 0.5, 0.9], detail: 1 });
      k.blob(0.035, '#f6f0e4', { position: [0, 0.52, -0.16], detail: 0 });
      break;
    case 'party':
      k.cylinder(0.0, 0.12, 0.3, 10, '#9a5bd6', { position: [0.04, 0.58, 0], rotation: [0, 0, -0.15] });
      k.blob(0.04, '#f4d23b', { position: [0.07, 0.74, 0], detail: 0 });
      break;
    case 'halo':
      k.add(new THREE.TorusGeometry(0.16, 0.025, 5, 20).rotateX(Math.PI / 2), '#f4d23b', { position: [0, 0.66, 0.02], nightGlow: 1 });
      break;
    default:
      break;
  }
}

/** Eyes, mouth and face details (wardrobe · face). */
function addFace(k: ModelKit, look: HumanLook): void {
  const z = -0.18;
  const eyes = look.eyes ?? 'dots';
  for (const s of [-1, 1]) {
    const x = s * 0.075;
    const style = eyes === 'wink' ? (s < 0 ? 'dots' : 'sleepy') : eyes;
    if (style === 'dots') k.blob(0.028, INK, { position: [x, 0.26, z], detail: 0, roughness: 0 });
    else if (style === 'sleepy') k.box(0.055, 0.013, 0.02, INK, { position: [x, 0.255, z - 0.005] });
    else if (style === 'happy') for (const d of [-1, 1]) k.box(0.034, 0.013, 0.02, INK, { position: [x + d * 0.013, 0.262, z - 0.005], rotation: [0, 0, d * -0.6] });
    else if (style === 'big') {
      k.blob(0.042, '#f6f0e4', { position: [x, 0.265, z + 0.004], scale: [1, 1.15, 0.5], detail: 0, roughness: 0 });
      k.blob(0.026, INK, { position: [x, 0.26, z - 0.012], scale: [1, 1.1, 0.5], detail: 0, roughness: 0 });
      k.blob(0.009, '#ffffff', { position: [x + 0.01, 0.272, z - 0.024], detail: 0, roughness: 0 });
    } else if (style === 'lashes') {
      k.blob(0.028, INK, { position: [x, 0.26, z], detail: 0, roughness: 0 });
      for (const d of [-1, 0, 1]) k.box(0.008, 0.03, 0.01, INK, { position: [x + s * 0.012 + d * 0.014, 0.29, z - 0.004], rotation: [0, 0, d * 0.35 - s * 0.2] });
    } else if (style === 'hearts') {
      for (const d of [-1, 1]) k.blob(0.016, '#e8263a', { position: [x + d * 0.011, 0.268, z - 0.005], scale: [1, 1, 0.5], detail: 0, roughness: 0 });
      k.cylinder(0.0, 0.024, 0.03, 4, '#e8263a', { position: [x, 0.248, z - 0.005], rotation: [Math.PI, Math.PI / 4, 0] });
    } else {
      // Sparkle: a little four-point star.
      k.box(0.05, 0.012, 0.02, '#f4c542', { position: [x, 0.26, z - 0.005], nightGlow: 1 });
      k.box(0.012, 0.05, 0.02, '#f4c542', { position: [x, 0.26, z - 0.005], nightGlow: 1 });
    }
  }
  const lip = '#9a4a3a';
  const mz = -0.19;
  switch (look.mouth ?? 'smile') {
    case 'grin':
      k.box(0.085, 0.028, 0.02, '#f6f0e4', { position: [0, 0.15, mz] });
      k.box(0.09, 0.008, 0.022, lip, { position: [0, 0.136, mz] });
      break;
    case 'o':
      k.blob(0.02, lip, { position: [0, 0.145, mz], scale: [1, 1.2, 0.5], detail: 0, roughness: 0 });
      break;
    case 'cat':
      for (const d of [-1, 1]) k.box(0.035, 0.011, 0.02, lip, { position: [d * 0.016, 0.148, mz], rotation: [0, 0, d * 0.5] });
      break;
    case 'smirk':
      k.box(0.06, 0.012, 0.02, lip, { position: [0.01, 0.152, mz], rotation: [0, 0, 0.25] });
      break;
    case 'tongue':
      k.box(0.06, 0.012, 0.02, lip, { position: [0, 0.15, mz] });
      k.blob(0.02, '#e8667a', { position: [0.01, 0.136, mz - 0.004], scale: [1, 1.2, 0.5], detail: 0, roughness: 0 });
      break;
    case 'fangs':
      k.box(0.06, 0.012, 0.02, lip, { position: [0, 0.15, mz] });
      for (const d of [-1, 1]) k.cylinder(0.008, 0.0, 0.022, 4, '#f6f0e4', { position: [d * 0.018, 0.136, mz - 0.004], rotation: [Math.PI, 0, 0] });
      break;
    default:
      k.box(0.06, 0.012, 0.02, lip, { position: [0, 0.15, mz] });
  }
  switch (look.face ?? 'none') {
    case 'freckles':
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) k.blob(0.008, '#9a5a3a', { position: [s * (0.09 + i * 0.018), 0.215 + (i % 2) * 0.012, -0.172], detail: 0, roughness: 0 });
      break;
    case 'moustache':
      for (const s of [-1, 1]) k.box(0.05, 0.02, 0.02, look.hair, { position: [s * 0.024, 0.172, -0.192], rotation: [0, 0, s * -0.25] });
      break;
    case 'beard':
      k.blob(0.13, look.hair, { position: [0, 0.12, -0.09], scale: [1.2, 0.75, 0.85], detail: 1, roughness: 0.08 });
      k.box(0.06, 0.012, 0.02, lip, { position: [0, 0.15, -0.205] });
      break;
    case 'bindi':
      k.blob(0.014, '#d8263a', { position: [0, 0.325, -0.19], scale: [1, 1, 0.5], detail: 0, roughness: 0 });
      break;
    case 'gems':
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) k.blob(0.01, ['#3ef0ff', '#e8559a', '#f4d23b'][i], { position: [s * (0.12 + i * 0.012), 0.24 - i * 0.018, -0.168], detail: 0, roughness: 0, nightGlow: 1 });
      break;
    case 'whiskers':
      for (const s of [-1, 1]) for (const d of [-1, 0, 1]) k.box(0.08, 0.006, 0.01, INK, { position: [s * 0.1, 0.18 + d * 0.014, -0.182], rotation: [0, s * 0.35, d * s * 0.2] });
      k.blob(0.014, '#f7b8cf', { position: [0, 0.195, -0.2], detail: 0 });
      break;
    case 'facepaint':
      for (const s of [-1, 1]) {
        k.box(0.07, 0.016, 0.02, '#3e9fd8', { position: [s * 0.12, 0.205, -0.168], rotation: [0, s * 0.5, 0] });
        k.box(0.07, 0.016, 0.02, '#f4d23b', { position: [s * 0.12, 0.183, -0.168], rotation: [0, s * 0.5, 0] });
      }
      break;
    default:
      break;
  }
}

/** Jewellery and gadgets: some sit on the head, some round the neck. */
function addAccessory(head: ModelKit, torso: ModelKit, acc: Accessory): void {
  const gold = '#f4c542';
  switch (acc) {
    case 'earrings':
      for (const s of [-1, 1]) head.blob(0.022, gold, { position: [s * 0.195, 0.16, 0], detail: 0, roughness: 0 });
      break;
    case 'necklace':
      torso.add(new THREE.TorusGeometry(0.13, 0.012, 5, 18).rotateX(Math.PI / 2), gold, { position: [0, 0.52, -0.02], rotation: [0.25, 0, 0] });
      torso.blob(0.03, '#3e9fd8', { position: [0, 0.47, -0.15], detail: 0, nightGlow: 1 });
      break;
    case 'headphones':
      head.add(new THREE.TorusGeometry(0.215, 0.018, 5, 14, Math.PI), INK, { position: [0, 0.27, 0.01], rotation: [0, Math.PI / 2, 0] });
      for (const s of [-1, 1]) head.cylinder(0.06, 0.06, 0.05, 10, '#e8559a', { position: [s * 0.215, 0.24, 0.01], rotation: [0, 0, Math.PI / 2] });
      break;
    case 'flower':
      head.blob(0.045, '#f7b8cf', { position: [0.17, 0.33, -0.04], scale: [1, 1, 0.5], detail: 0 });
      head.blob(0.018, '#f4d23b', { position: [0.175, 0.33, -0.065], detail: 0 });
      break;
    case 'bowtie':
      for (const s of [-1, 1]) torso.cylinder(0.0, 0.05, 0.08, 4, '#d8463a', { position: [s * 0.04, 0.52, -0.14], rotation: [0, 0, s * Math.PI / 2] });
      torso.blob(0.018, '#9a2a2a', { position: [0, 0.52, -0.15], detail: 0 });
      break;
    case 'lei':
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        torso.blob(0.035, ['#e8559a', '#f4d23b', '#f6f0e4', '#f08a2e'][i % 4], { position: [Math.cos(a) * 0.17, 0.5 - Math.max(0, -Math.sin(a)) * 0.08, Math.sin(a) * 0.14], detail: 0 });
      }
      break;
    case 'medal':
      for (const s of [-1, 1]) torso.box(0.03, 0.2, 0.01, s < 0 ? '#3e6fa8' : '#d8463a', { position: [s * 0.04, 0.46, -0.19], rotation: [0, 0, s * 0.3] });
      torso.cylinder(0.04, 0.04, 0.012, 12, gold, { position: [0, 0.34, -0.2], rotation: [Math.PI / 2, 0, 0], pattern: Pattern.Glass });
      break;
    case 'pearls':
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        torso.blob(0.016, '#f6f0e4', { position: [Math.cos(a) * 0.13, 0.52 - Math.max(0, -Math.sin(a)) * 0.05, Math.sin(a) * 0.12], detail: 0, roughness: 0 });
      }
      break;
    case 'cross':
      // A small cross on a fine chain.
      torso.box(0.012, 0.16, 0.012, '#c9a24a', { position: [0, 0.48, -0.19], rotation: [0.2, 0, 0] });
      torso.box(0.03, 0.05, 0.012, '#c9a24a', { position: [0, 0.38, -0.2] });
      torso.box(0.05, 0.012, 0.012, '#c9a24a', { position: [0, 0.39, -0.2] });
      break;
    case 'tie':
      torso.box(0.05, 0.05, 0.02, '#3e6fa8', { position: [0, 0.5, -0.2] });
      torso.box(0.06, 0.3, 0.02, '#3e6fa8', { position: [0, 0.32, -0.2] });
      break;
    default:
      break;
  }
}

function addGlasses(k: ModelKit, style: GlassesStyle): void {
  if (style === 'none') return;
  if (style === 'star' || style === 'heart') {
    const c = style === 'star' ? '#f4d23b' : '#e8559a';
    for (const s of [-1, 1]) {
      if (style === 'star') k.add(new THREE.CircleGeometry(0.065, 5).rotateY(Math.PI), c, { position: [s * 0.078, 0.26, -0.205], rotation: [0, 0, Math.PI / 2] });
      else {
        for (const d of [-1, 1]) k.blob(0.03, c, { position: [s * 0.078 + d * 0.02, 0.272, -0.205], scale: [1, 1, 0.3], detail: 0 });
        k.cylinder(0.0, 0.045, 0.05, 4, c, { position: [s * 0.078, 0.245, -0.205], rotation: [Math.PI, Math.PI / 4, 0] });
      }
    }
    k.box(0.2, 0.015, 0.015, INK, { position: [0, 0.27, -0.21] });
    return;
  }
  if (style === 'goggles') {
    for (const s of [-1, 1]) {
      k.cylinder(0.055, 0.055, 0.05, 10, '#7a5a3a', { position: [s * 0.075, 0.27, -0.19], rotation: [Math.PI / 2, 0, 0] });
      k.cylinder(0.042, 0.042, 0.02, 10, '#8fd0e8', { position: [s * 0.075, 0.27, -0.215], rotation: [Math.PI / 2, 0, 0], pattern: Pattern.Glass });
    }
    k.add(new THREE.TorusGeometry(0.205, 0.015, 4, 16).rotateX(Math.PI / 2), '#5a3a22', { position: [0, 0.27, 0.01] });
    return;
  }
  if (style === 'monocle') {
    k.add(new THREE.TorusGeometry(0.045, 0.008, 4, 14), '#f4c542', { position: [0.075, 0.26, -0.205] });
    k.box(0.006, 0.14, 0.006, '#f4c542', { position: [0.11, 0.18, -0.2] });
    return;
  }
  if (style === 'shield') {
    k.box(0.3, 0.07, 0.02, '#3e3a8a', { position: [0, 0.265, -0.205], pattern: Pattern.Glass });
    return;
  }
  const lens = style === 'sun' ? INK : '#dfe9ef';
  for (const s of [-1, 1]) k.cylinder(0.05, 0.05, 0.02, 10, lens, { position: [s * 0.075, 0.26, -0.2], rotation: [Math.PI / 2, 0, 0] });
  k.box(0.2, 0.015, 0.015, INK, { position: [0, 0.27, -0.205] });
}

export function shadeHex(hex: string, f: number): string {
  const c = new THREE.Color(hex).multiplyScalar(f);
  c.r = Math.min(1, c.r);
  c.g = Math.min(1, c.g);
  c.b = Math.min(1, c.b);
  return `#${c.getHexString()}`;
}

/** A random look for pedestrians and new players. */
export function randomLook(r: () => number): HumanLook {
  const pick = <T,>(a: readonly T[]): T => a[Math.floor(r() * a.length)];
  return {
    skin: pick(['#f0c7a6', '#d9a57e', '#b27b52', '#8a5a3a', '#f6d8c0', '#6b4630']),
    hair: pick(['#c8452e', '#2b2622', '#6b4a2a', '#e8c872', '#9a5bd6', '#3e6fa8', '#8a8a9a']),
    hairStyle: pick(['bob', 'bun', 'short', 'curly', 'long', 'ponytail', 'braids', 'bald'] as const),
    top: pick(['#4f9a5a', '#d8463a', '#f4d23b', '#3e6fa8', '#e8559a', '#f6f0e4', '#2f8f86', '#f08a2e']),
    topStyle: pick(['tee', 'tee', 'shirt', 'hoodie', 'dress', 'sari'] as const),
    bottom: pick(['#3f5f9a', '#2b2622', '#c8955a', '#6a6f8a', '#f6f0e4', '#9a3a2a']),
    bottomStyle: pick(['trousers', 'trousers', 'shorts', 'skirt', 'sarong'] as const),
    shoes: pick(['#2b2622', '#d8463a', '#f6f0e4', '#7a4a2a']),
    scarf: r() < 0.35 ? pick(['#f4d23b', '#e8559a', '#2f8f86']) : null,
    hat: pick(['none', 'none', 'none', 'straw', 'beret', 'cap', 'sunhat', 'beanie'] as const),
    glasses: pick(['none', 'none', 'round', 'sun'] as const),
    back: pick(['none', 'none', 'backpack', 'satchel', 'guitar'] as const),
    height: 0.92 + r() * 0.16,
    eyes: pick(['dots', 'dots', 'dots', 'happy', 'big', 'sleepy'] as const),
    mouth: pick(['smile', 'smile', 'grin', 'o', 'smirk'] as const),
    face: pick(['none', 'none', 'none', 'none', 'freckles', 'moustache', 'beard', 'bindi'] as const),
    acc: pick(['none', 'none', 'none', 'earrings', 'necklace', 'headphones', 'flower'] as const),
  };
}

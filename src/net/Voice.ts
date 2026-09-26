import { api } from './Api';
import type { RtcMessage } from '../../server/validate.mjs';

/**
 * Push-to-talk voice chat (docs/09 §4). Each pair of players who have voice
 * switched on gets a direct WebRTC audio link; the relay only passes the
 * signalling along (to the one player it is for). The microphone is asked for
 * only when the player turns voice on, and it sends silence unless the talk
 * key is held. Blocked players are never connected; anyone can be muted.
 *
 * Direct links mean players in the room can learn each other's network
 * address — the setting says so, and voice is off by default.
 */

interface VoicePeer {
  pc: RTCPeerConnection;
  audio: HTMLAudioElement;
  analyser: AnalyserNode | null;
  level: number;
  muted: boolean;
}

export interface VoiceHost {
  selfId(): string;
  send(msg: RtcMessage): void;
  /** Player name for a peer id (for block checks), if known. */
  nameOf(id: string): string | undefined;
  isBlocked(name: string): boolean;
}

/** Built-in fallback when the game server does not answer /api/ice. */
const FALLBACK_ICE: RTCIceServer[] = (import.meta.env.VITE_STUN ?? 'stun:stun.l.google.com:19302')
  .split(',')
  .map((u: string) => u.trim())
  .filter(Boolean)
  .map((urls: string) => ({ urls }));

export class Voice {
  enabled = false;
  talking = false;
  private stream: MediaStream | null = null;
  /** STUN (and TURN relay, with short-lived passwords) from the game server. */
  private ice: RTCIceServer[] = FALLBACK_ICE;
  private readonly peers = new Map<string, VoicePeer>();
  private readonly greeted = new Set<string>();
  private ctx: AudioContext | null = null;
  private readonly buf = new Uint8Array(256);
  /** Peers muted by the player (kept across reconnects by id for the session). */
  readonly muted = new Set<string>();
  volume = 1;

  constructor(private readonly host: VoiceHost) {}

  static supported(): boolean {
    return typeof RTCPeerConnection !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  }

  /** Turn voice on: asks for the microphone, then says hello to the room. */
  async enable(): Promise<boolean> {
    if (this.enabled) return true;
    if (!Voice.supported()) return false;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
    } catch {
      return false;
    }
    for (const t of this.stream.getAudioTracks()) t.enabled = false;
    const res = await api<{ iceServers: RTCIceServer[] }>('/api/ice', { timeout: 4000 });
    if (res.ok && Array.isArray(res.data?.iceServers)) this.ice = res.data.iceServers;
    this.enabled = true;
    this.greeted.clear();
    this.host.send({ t: 'rtc', a: 'hi' });
    return true;
  }

  disable(): void {
    if (!this.enabled) return;
    this.host.send({ t: 'rtc', a: 'bye' });
    for (const id of [...this.peers.keys()]) this.drop(id);
    for (const t of this.stream?.getTracks() ?? []) t.stop();
    this.stream = null;
    this.enabled = false;
    this.talking = false;
  }

  /** Hold-to-talk: the microphone track only carries sound while this is on. */
  setTalking(on: boolean): void {
    this.talking = on && this.enabled;
    for (const t of this.stream?.getAudioTracks() ?? []) t.enabled = this.talking;
  }

  setMuted(id: string, muted: boolean): void {
    if (muted) this.muted.add(id);
    else this.muted.delete(id);
    const p = this.peers.get(id);
    if (p) p.audio.muted = p.muted = muted;
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    for (const p of this.peers.values()) p.audio.volume = this.volume;
  }

  /** Is this peer speaking right now (for the 🔊 on their name tag)? */
  speaking(id: string): boolean {
    const p = this.peers.get(id);
    return !!p && !p.muted && !this.muted.has(id) && p.level > 0.06;
  }

  connectedCount(): number {
    let n = 0;
    for (const p of this.peers.values()) if (p.pc.connectionState === 'connected') n++;
    return n;
  }

  /** Measure how loud each peer is (call once a frame). */
  update(): void {
    for (const p of this.peers.values()) {
      if (!p.analyser) continue;
      p.analyser.getByteTimeDomainData(this.buf);
      let sum = 0;
      for (let i = 0; i < this.buf.length; i++) {
        const v = (this.buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / this.buf.length);
      p.level += (rms - p.level) * 0.3;
    }
  }

  /** Hang up on everyone `keep` says no to (left the room, or blocked). */
  prune(keep: (id: string) => boolean): void {
    for (const id of [...this.peers.keys()]) if (!keep(id)) this.drop(id);
  }

  /** A peer left the room (or was blocked): hang up. */
  drop(id: string): void {
    const p = this.peers.get(id);
    if (!p) return;
    p.pc.close();
    p.audio.srcObject = null;
    p.audio.remove();
    this.peers.delete(id);
    this.greeted.delete(id);
  }

  async onMessage(from: string, msg: RtcMessage): Promise<void> {
    if (!this.enabled) return;
    const name = this.host.nameOf(from);
    if (name && this.host.isBlocked(name)) {
      this.drop(from);
      return;
    }
    switch (msg.a) {
      case 'hi': {
        // Already talking to them: nothing to do.
        const state = this.peers.get(from)?.pc.connectionState;
        if (state === 'connected' || state === 'connecting' || state === 'new') break;
        this.drop(from);
        // The player with the smaller id makes the offer, so the two never both do;
        // the other answers the hello (to them only) so the first one knows to call.
        if (this.host.selfId() < from) await this.call(from);
        else if (!this.greeted.has(from)) {
          this.greeted.add(from);
          this.host.send({ t: 'rtc', a: 'hi', to: from });
        }
        break;
      }
      case 'bye':
        this.drop(from);
        break;
      case 'offer': {
        this.drop(from);
        const p = this.link(from);
        await p.pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp });
        const answer = await p.pc.createAnswer();
        await p.pc.setLocalDescription(answer);
        this.host.send({ t: 'rtc', a: 'answer', to: from, sdp: answer.sdp ?? '' });
        break;
      }
      case 'answer': {
        const p = this.peers.get(from);
        if (p && p.pc.signalingState === 'have-local-offer') await p.pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp });
        break;
      }
      case 'ice': {
        const p = this.peers.get(from);
        if (p && msg.cand.candidate) await p.pc.addIceCandidate(msg.cand).catch(() => undefined);
        break;
      }
    }
  }

  private async call(id: string): Promise<void> {
    const p = this.link(id);
    const offer = await p.pc.createOffer();
    await p.pc.setLocalDescription(offer);
    this.host.send({ t: 'rtc', a: 'offer', to: id, sdp: offer.sdp ?? '' });
  }

  private link(id: string): VoicePeer {
    const pc = new RTCPeerConnection({ iceServers: this.ice });
    const audio = document.createElement('audio');
    audio.autoplay = true;
    audio.volume = this.volume;
    audio.muted = this.muted.has(id);
    const peer: VoicePeer = { pc, audio, analyser: null, level: 0, muted: audio.muted };
    for (const t of this.stream?.getAudioTracks() ?? []) pc.addTrack(t, this.stream!);
    pc.onicecandidate = (e) => {
      if (e.candidate) this.host.send({ t: 'rtc', a: 'ice', to: id, cand: { candidate: e.candidate.candidate, sdpMid: e.candidate.sdpMid, sdpMLineIndex: e.candidate.sdpMLineIndex } });
    };
    pc.ontrack = (e) => {
      const stream = e.streams[0] ?? new MediaStream([e.track]);
      audio.srcObject = stream;
      void audio.play().catch(() => undefined);
      try {
        this.ctx ??= new AudioContext();
        const analyser = this.ctx.createAnalyser();
        analyser.fftSize = 256;
        // Only measured, not played through the context (the <audio> element plays it).
        this.ctx.createMediaStreamSource(stream).connect(analyser);
        peer.analyser = analyser;
      } catch {
        /* no level meter: still hear them */
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') this.drop(id);
    };
    this.peers.set(id, peer);
    return peer;
  }
}

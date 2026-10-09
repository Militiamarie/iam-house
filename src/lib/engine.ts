import { buildDesk, paintDesk, shaperCurve, strike, type Desk } from "@/lib/desk";
import {
  noteHz,
  type HouseKey,
  type Pattern,
  type Rack,
  type Voice,
  VOICES,
} from "@/lib/patterns";

export type Live = {
  bpm: number;
  swing: number;
  key: HouseKey;
  patternId: string;
  arrangeOn: boolean;
  arrangement: string[];
  patterns: Record<string, Pattern>;
  rack: Rack;
  gains: Record<Voice, number>;
  mutes: Record<Voice, boolean>;
};

export const live: { current: Live | null } = { current: null };

export class HouseEngine {
  private ctx: AudioContext | null = null;
  private desk: Desk | null = null;
  private lastGrit = -1;
  private micMeter: AnalyserNode | null = null;
  private micGain: GainNode | null = null;
  private micNode: MediaStreamAudioSourceNode | null = null;
  private micStream: MediaStream | null = null;
  private relay: OscillatorNode | null = null;
  private relayGain: GainNode | null = null;
  private pitchBuf = new Float32Array(2048);
  private timer = 0;
  private step = 0;
  private bar = 0;
  private next = 0;
  private onStep: ((step: number) => void) | null = null;

  get armed(): boolean {
    return this.micStream != null;
  }

  private ensure(): AudioContext {
    if (typeof window === "undefined") throw new Error("Audio is only available in the browser.");
    if (this.ctx) return this.ctx;
    const ctx = new AudioContext();
    this.ctx = ctx;
    const desk = buildDesk(ctx);
    this.desk = desk;
    this.applyRack();
    const micMeter = ctx.createAnalyser();
    micMeter.fftSize = 2048;
    micMeter.smoothingTimeConstant = 0.65;
    this.micMeter = micMeter;
    const micGain = ctx.createGain();
    micGain.gain.value = 0;
    micGain.connect(desk.sum);
    this.micGain = micGain;

    const relay = ctx.createOscillator();
    relay.type = "sawtooth";
    relay.frequency.value = 220;
    const relayGain = ctx.createGain();
    relayGain.gain.value = 0;
    relay.connect(relayGain);
    relayGain.connect(desk.sum);
    relay.start();
    this.relay = relay;
    this.relayGain = relayGain;

    this.applyRack();
    return ctx;
  }

  private applyRack() {
    const rack = live.current?.rack;
    const desk = this.desk;
    const ctx = this.ctx;
    if (!rack || !desk || !ctx) return;
    paintDesk(desk, rack, ctx.currentTime);
    if (this.lastGrit !== rack.grit) {
      desk.shaper.curve = shaperCurve(rack.grit);
      this.lastGrit = rack.grit;
    }
  }

  private applyMix() {
    const L = live.current;
    const desk = this.desk;
    const ctx = this.ctx;
    if (!L || !desk || !ctx) return;
    const now = ctx.currentTime;
    for (const v of VOICES) {
      const g = L.mutes[v] ? 0 : L.gains[v];
      desk.buses[v].gain.setTargetAtTime(g, now, 0.02);
    }
  }

  private hit(pat: Pattern, step: number, t: number) {
    const ctx = this.ctx;
    const desk = this.desk;
    const L = live.current;
    if (!ctx || !desk || !L) return;
    strike(ctx, desk.buses, desk, pat, step, t, L.key, L.bpm, L.swing);
  }

  private patternForStep(): Pattern | null {
    const L = live.current;
    if (!L) return null;
    const id = L.arrangeOn ? L.arrangement[this.bar % Math.max(1, L.arrangement.length)] : L.patternId;
    return L.patterns[id ?? L.patternId] ?? L.patterns[L.patternId] ?? null;
  }

  private tick = () => {
    const ctx = this.ctx;
    if (!ctx) return;
    this.applyMix();
    this.applyRack();
    while (this.next < ctx.currentTime + 0.12) {
      const pat = this.patternForStep();
      if (pat) this.hit(pat, this.step, this.next);
      this.onStep?.(this.step);
      const stepDur = 60 / Math.max(40, live.current?.bpm ?? 90) / 4;
      this.next += stepDur;
      this.step = (this.step + 1) % 16;
      if (this.step === 0) {
        const len = live.current?.arrangement.length ?? 1;
        this.bar = (this.bar + 1) % Math.max(1, len);
      }
    }
  };

  async resume() {
    const ctx = this.ensure();
    if (ctx.state !== "running") await ctx.resume();
    return ctx;
  }

  play(onStep: (step: number) => void) {
    this.onStep = onStep;
    const ctx = this.ensure();
    void ctx.resume();
    if (this.timer) return;
    this.step = 0;
    this.bar = 0;
    this.next = ctx.currentTime + 0.05;
    this.timer = window.setInterval(this.tick, 25);
  }

  stop() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = 0;
    this.onStep?.(-1);
  }

  get playing() {
    return this.timer !== 0;
  }

  preview(patternId: string): boolean {
    if (this.timer) return false;
    const pat = live.current?.patterns[patternId];
    if (!pat || !live.current) return false;
    const ctx = this.ensure();
    void ctx.resume();
    this.applyMix();
    this.applyRack();
    const start = ctx.currentTime + 0.05;
    const stepDur = 60 / Math.max(40, live.current.bpm) / 4;
    for (let i = 0; i < 32; i++) this.hit(pat, i % 16, start + i * stepDur);
    return true;
  }

  async armMic(): Promise<string | null> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      return "This browser won’t open a mic. Hear the scale instead, or open the house in Chrome or Safari.";
    }
    try {
      const ctx = await this.resume();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      this.disarmMic();
      this.micStream = stream;
      const node = ctx.createMediaStreamSource(stream);
      this.micNode = node;
      if (this.micMeter) node.connect(this.micMeter);
      if (this.micGain) {
        this.micGain.gain.value = 0.95;
        node.connect(this.micGain);
      }
      return null;
    } catch {
      return "Mic stayed shut. Allow the microphone when the browser asks, then open it again. The rack still plays without it.";
    }
  }

  disarmMic() {
    this.micStream?.getTracks().forEach((t) => t.stop());
    this.micStream = null;
    this.micNode?.disconnect();
    this.micNode = null;
    if (this.micGain) this.micGain.gain.value = 0;
    if (this.relayGain) this.relayGain.gain.value = 0;
  }

  readVoice(): { hz: number | null; rms: number; name: string } {
    if (!this.micMeter || !this.ctx) return { hz: null, rms: 0, name: "—" };
    this.micMeter.getFloatTimeDomainData(this.pitchBuf);
    let sum = 0;
    for (let i = 0; i < this.pitchBuf.length; i++) sum += this.pitchBuf[i]! ** 2;
    const rms = Math.sqrt(sum / this.pitchBuf.length);
    if (rms < 0.02) return { hz: null, rms, name: "—" };
    const hz = detectPitch(this.pitchBuf, this.ctx.sampleRate);
    if (!hz) return { hz: null, rms, name: "—" };
    const names = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
    const midi = Math.round(69 + 12 * Math.log2(hz / 440));
    return { hz, rms, name: names[((midi % 12) + 12) % 12]! };
  }

  feedRelay(rms: number, hz: number | null) {
    const ctx = this.ctx;
    const rack = live.current?.rack;
    if (!ctx || !this.relay || !this.relayGain || !rack) return;
    if (!rack.relay || hz == null || rms < 0.02) {
      this.relayGain.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
      return;
    }
    const key = live.current?.key ?? "C";
    const snapped = snapToHouse(hz, key);
    this.relay.frequency.setTargetAtTime(snapped, ctx.currentTime, 0.015);
    this.relayGain.gain.setTargetAtTime(Math.min(0.22, rms * 1.6), ctx.currentTime, 0.02);
  }

  guide() {
    const ctx = this.ensure();
    void ctx.resume();
    const L = live.current;
    if (!L) return;
    const pat = L.patterns[L.patternId];
    if (!pat) return;
    const start = ctx.currentTime + 0.05;
    const bus = this.desk?.buses.lead;
    if (!bus) return;
    for (let d = 0; d < 8; d++) {
      const when = start + d * 0.18;
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = noteHz(L.key, d, 60);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(0.2, when + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 0.16);
      o.connect(g);
      g.connect(bus);
      o.start(when);
      o.stop(when + 0.2);
    }
  }
}

function detectPitch(buf: Float32Array, sampleRate: number): number | null {
  const minLag = Math.floor(sampleRate / 880);
  const maxLag = Math.floor(sampleRate / 70);
  let best = 0;
  let bestLag = -1;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    for (let i = 0; i < buf.length - lag; i += 2) corr += buf[i]! * buf[i + lag]!;
    if (corr > best) {
      best = corr;
      bestLag = lag;
    }
  }
  if (bestLag < 0 || best < 0.02) return null;
  return sampleRate / bestLag;
}

function snapToHouse(hz: number, key: HouseKey): number {
  const midi = 69 + 12 * Math.log2(hz / 440);
  const root = { C: 0, D: 2, F: 5, G: 7, A: 9 }[key];
  const rel = ((midi - root) % 12 + 12) % 12;
  let best = 0;
  let dist = 99;
  for (const iv of [0, 2, 3, 5, 7, 8, 10, 12]) {
    const d = Math.abs(rel - iv);
    if (d < dist) {
      dist = d;
      best = iv;
    }
  }
  const snapped = midi - rel + best;
  return 440 * 2 ** ((snapped - 69) / 12);
}

let singleton: HouseEngine | null = null;

export function getEngine(): HouseEngine {
  if (!singleton) singleton = new HouseEngine();
  return singleton;
}

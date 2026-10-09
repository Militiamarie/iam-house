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

type Bus = { gain: GainNode };

function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function impulse(ctx: AudioContext): AudioBuffer {
  const seconds = 1.7;
  const len = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.4;
    }
  }
  return buffer;
}

function shaperCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 256;
  const curve = new Float32Array(n);
  const k = 1 + amount * 16;
  const norm = Math.tanh(k);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * k) / norm;
  }
  return curve;
}

function envGain(ctx: AudioContext, t: number, peak: number, dur: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.03, dur));
  return g;
}

export class HouseEngine {
  private ctx: AudioContext | null = null;
  private sum: GainNode | null = null;
  private master: GainNode | null = null;
  private buses: Partial<Record<Voice, Bus>> = {};
  private eqLow: BiquadFilterNode | null = null;
  private eqMid: BiquadFilterNode | null = null;
  private eqHigh: BiquadFilterNode | null = null;
  private shaper: WaveShaperNode | null = null;
  private comp: DynamicsCompressorNode | null = null;
  private delay: DelayNode | null = null;
  private feedback: GainNode | null = null;
  private echoSend: GainNode | null = null;
  private echoWet: GainNode | null = null;
  private roomSend: GainNode | null = null;
  private roomWet: GainNode | null = null;
  private hatBuf: AudioBuffer | null = null;
  private snareBuf: AudioBuffer | null = null;
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
    this.hatBuf = noiseBuffer(ctx, 0.08);
    this.snareBuf = noiseBuffer(ctx, 0.2);

    const sum = ctx.createGain();
    sum.gain.value = 1;
    this.sum = sum;

    const buses = {} as Record<Voice, Bus>;
    for (const v of VOICES) {
      const gain = ctx.createGain();
      gain.gain.value = 0.7;
      gain.connect(sum);
      buses[v] = { gain };
    }
    this.buses = buses;

    const eqLow = ctx.createBiquadFilter();
    eqLow.type = "lowshelf";
    eqLow.frequency.value = 140;
    const eqMid = ctx.createBiquadFilter();
    eqMid.type = "peaking";
    eqMid.frequency.value = 1100;
    eqMid.Q.value = 0.8;
    const eqHigh = ctx.createBiquadFilter();
    eqHigh.type = "highshelf";
    eqHigh.frequency.value = 5200;
    this.eqLow = eqLow;
    this.eqMid = eqMid;
    this.eqHigh = eqHigh;

    const shaper = ctx.createWaveShaper();
    shaper.curve = shaperCurve(0);
    shaper.oversample = "2x";
    this.shaper = shaper;

    const comp = ctx.createDynamicsCompressor();
    comp.knee.value = 10;
    comp.attack.value = 0.008;
    comp.release.value = 0.18;
    this.comp = comp;

    const dry = ctx.createGain();
    dry.gain.value = 1;

    const delay = ctx.createDelay(1.2);
    delay.delayTime.value = 0.32;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.28;
    const echoSend = ctx.createGain();
    const echoWet = ctx.createGain();
    echoSend.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(echoWet);
    this.delay = delay;
    this.feedback = feedback;
    this.echoSend = echoSend;
    this.echoWet = echoWet;

    const conv = ctx.createConvolver();
    conv.buffer = impulse(ctx);
    const roomSend = ctx.createGain();
    const roomWet = ctx.createGain();
    roomSend.connect(conv);
    conv.connect(roomWet);
    this.roomSend = roomSend;
    this.roomWet = roomWet;

    const master = ctx.createGain();
    master.gain.value = 0.78;
    this.master = master;

    sum.connect(eqLow);
    eqLow.connect(eqMid);
    eqMid.connect(eqHigh);
    eqHigh.connect(shaper);
    shaper.connect(comp);
    comp.connect(dry);
    comp.connect(echoSend);
    comp.connect(roomSend);
    dry.connect(master);
    echoWet.connect(master);
    roomWet.connect(master);
    master.connect(ctx.destination);

    const micMeter = ctx.createAnalyser();
    micMeter.fftSize = 2048;
    micMeter.smoothingTimeConstant = 0.65;
    this.micMeter = micMeter;
    const micGain = ctx.createGain();
    micGain.gain.value = 0;
    micGain.connect(sum);
    this.micGain = micGain;

    const relay = ctx.createOscillator();
    relay.type = "sawtooth";
    relay.frequency.value = 220;
    const relayGain = ctx.createGain();
    relayGain.gain.value = 0;
    relay.connect(relayGain);
    relayGain.connect(sum);
    relay.start();
    this.relay = relay;
    this.relayGain = relayGain;

    this.applyRack();
    return ctx;
  }

  private applyRack() {
    const rack = live.current?.rack;
    const ctx = this.ctx;
    if (!rack || !ctx || !this.eqLow || !this.eqMid || !this.eqHigh || !this.comp || !this.shaper) return;
    const now = ctx.currentTime;
    this.eqLow.gain.setTargetAtTime(rack.low, now, 0.03);
    this.eqMid.gain.setTargetAtTime(rack.mid, now, 0.03);
    this.eqHigh.gain.setTargetAtTime(rack.high, now, 0.03);
    this.comp.threshold.setTargetAtTime(-8 - rack.press * 22, now, 0.04);
    this.comp.ratio.setTargetAtTime(1.4 + rack.press * 6, now, 0.04);
    this.shaper.curve = shaperCurve(rack.grit);
    if (this.echoSend && this.echoWet && this.feedback && this.delay) {
      this.echoSend.gain.setTargetAtTime(rack.echo, now, 0.03);
      this.echoWet.gain.setTargetAtTime(rack.echo > 0.01 ? 0.85 : 0, now, 0.03);
      this.feedback.gain.setTargetAtTime(Math.min(0.52, 0.18 + rack.echo * 0.4), now, 0.03);
      this.delay.delayTime.setTargetAtTime(Math.min(0.9, Math.max(0.04, rack.delayTime)), now, 0.03);
    }
    if (this.roomSend && this.roomWet) {
      this.roomSend.gain.setTargetAtTime(rack.room, now, 0.03);
      this.roomWet.gain.setTargetAtTime(rack.room > 0.01 ? 0.9 : 0, now, 0.03);
    }
  }

  private applyMix() {
    const L = live.current;
    const ctx = this.ctx;
    if (!L || !ctx) return;
    const now = ctx.currentTime;
    for (const v of VOICES) {
      const bus = this.buses[v];
      if (!bus) continue;
      const g = L.mutes[v] ? 0 : L.gains[v];
      bus.gain.gain.setTargetAtTime(g, now, 0.02);
    }
  }

  private trigger(voice: Voice, node: AudioNode, t: number, stopAt: number) {
    const bus = this.buses[voice];
    if (!bus) return;
    node.connect(bus.gain);
    if ("stop" in node && typeof node.stop === "function") {
      try {
        (node as AudioBufferSourceNode).stop(stopAt);
      } catch {
        /* already stopped */
      }
    }
  }

  private hit(pat: Pattern, step: number, t: number) {
    const ctx = this.ctx;
    const L = live.current;
    if (!ctx || !L || !this.hatBuf || !this.snareBuf) return;
    const swing = step % 2 === 1 ? (60 / L.bpm / 4) * L.swing * 0.5 : 0;
    const when = t + swing;

    if (pat.drums.kick[step]) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(168, when);
      o.frequency.exponentialRampToValueAtTime(46, when + 0.09);
      const g = envGain(ctx, when, 0.95, 0.28);
      o.connect(g);
      this.trigger("kick", g, when, when + 0.32);
      o.start(when);
      o.stop(when + 0.32);
    }
    if (pat.drums.snare[step]) {
      const src = ctx.createBufferSource();
      src.buffer = this.snareBuf;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1800;
      bp.Q.value = 0.7;
      const g = envGain(ctx, when, 0.55, 0.16);
      src.connect(bp);
      bp.connect(g);
      this.trigger("snare", g, when, when + 0.2);
      src.start(when);
      const tone = ctx.createOscillator();
      tone.type = "triangle";
      tone.frequency.value = 196;
      const tg = envGain(ctx, when, 0.22, 0.1);
      tone.connect(tg);
      this.trigger("snare", tg, when, when + 0.14);
      tone.start(when);
      tone.stop(when + 0.14);
    }
    if (pat.drums.hat[step]) {
      const src = ctx.createBufferSource();
      src.buffer = this.hatBuf;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 6800;
      const g = envGain(ctx, when, 0.28, 0.035);
      src.connect(hp);
      hp.connect(g);
      this.trigger("hat", g, when, when + 0.06);
      src.start(when);
    }
    if (pat.drums.perc[step]) {
      const o = ctx.createOscillator();
      o.type = "square";
      o.frequency.value = 740;
      const g = envGain(ctx, when, 0.16, 0.07);
      o.connect(g);
      this.trigger("perc", g, when, when + 0.09);
      o.start(when);
      o.stop(when + 0.09);
    }
    const bass = pat.bass[step];
    if (bass != null) {
      const held = pat.bass[(step + 1) % 16] == null;
      const o = ctx.createOscillator();
      o.type = "sine";
      const hz = noteHz(L.key, bass, 36);
      o.frequency.setValueAtTime(hz * 1.5, when);
      o.frequency.exponentialRampToValueAtTime(Math.max(30, hz), when + 0.05);
      const g = envGain(ctx, when, 0.7, held ? 0.42 : 0.12);
      o.connect(g);
      this.trigger("bass", g, when, when + (held ? 0.48 : 0.16));
      o.start(when);
      o.stop(when + (held ? 0.5 : 0.18));
    }
    const lead = pat.lead[step];
    if (lead != null) {
      const held = pat.lead[(step + 1) % 16] == null;
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = noteHz(L.key, lead, 60);
      const g = envGain(ctx, when, 0.22, held ? 0.28 : 0.12);
      o.connect(g);
      this.trigger("lead", g, when, when + (held ? 0.32 : 0.16));
      o.start(when);
      o.stop(when + (held ? 0.34 : 0.18));
    }
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
      return "This browser won't open the booth mic.";
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
      return "Mic stayed shut. You can still audition the rack.";
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
    for (let d = 0; d < 8; d++) {
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = noteHz(L.key, d, 60);
      const g = envGain(ctx, start + d * 0.18, 0.2, 0.16);
      o.connect(g);
      this.trigger("lead", g, start, start + d * 0.18 + 0.2);
      o.start(start + d * 0.18);
      o.stop(start + d * 0.18 + 0.22);
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

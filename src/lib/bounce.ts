import type { Live } from "@/lib/engine";
import { noteHz, VOICES, type Pattern, type Rack, type Voice } from "@/lib/patterns";

type Graph = {
  ctx: OfflineAudioContext;
  buses: Record<Voice, GainNode>;
  hat: AudioBuffer;
  snare: AudioBuffer;
};

function noise(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function impulse(ctx: BaseAudioContext): AudioBuffer {
  const seconds = 1.7;
  const len = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.4;
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

function envGain(ctx: BaseAudioContext, t: number, peak: number, dur: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.03, dur));
  return g;
}

function build(ctx: OfflineAudioContext, rack: Rack, gains: Live["gains"], mutes: Live["mutes"]): Graph {
  const hat = noise(ctx, 0.08);
  const snare = noise(ctx, 0.2);
  const sum = ctx.createGain();
  const buses = {} as Record<Voice, GainNode>;
  for (const voice of VOICES) {
    const gain = ctx.createGain();
    gain.gain.value = mutes[voice] ? 0 : gains[voice];
    gain.connect(sum);
    buses[voice] = gain;
  }

  const eqLow = ctx.createBiquadFilter();
  eqLow.type = "lowshelf";
  eqLow.frequency.value = 140;
  eqLow.gain.value = rack.low;
  const eqMid = ctx.createBiquadFilter();
  eqMid.type = "peaking";
  eqMid.frequency.value = 1100;
  eqMid.Q.value = 0.8;
  eqMid.gain.value = rack.mid;
  const eqHigh = ctx.createBiquadFilter();
  eqHigh.type = "highshelf";
  eqHigh.frequency.value = 5200;
  eqHigh.gain.value = rack.high;

  const shaper = ctx.createWaveShaper();
  shaper.curve = shaperCurve(rack.grit);
  shaper.oversample = "2x";

  const comp = ctx.createDynamicsCompressor();
  comp.knee.value = 10;
  comp.attack.value = 0.008;
  comp.release.value = 0.18;
  comp.threshold.value = -8 - rack.press * 22;
  comp.ratio.value = 1.4 + rack.press * 6;

  const dry = ctx.createGain();
  const delay = ctx.createDelay(1.2);
  delay.delayTime.value = Math.min(0.9, Math.max(0.04, rack.delayTime));
  const feedback = ctx.createGain();
  feedback.gain.value = Math.min(0.52, 0.18 + rack.echo * 0.4);
  const echoSend = ctx.createGain();
  echoSend.gain.value = rack.echo;
  const echoWet = ctx.createGain();
  echoWet.gain.value = rack.echo > 0.01 ? 0.85 : 0;
  echoSend.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(echoWet);

  const conv = ctx.createConvolver();
  conv.buffer = impulse(ctx);
  const roomSend = ctx.createGain();
  roomSend.gain.value = rack.room;
  const roomWet = ctx.createGain();
  roomWet.gain.value = rack.room > 0.01 ? 0.9 : 0;
  roomSend.connect(conv);
  conv.connect(roomWet);

  const master = ctx.createGain();
  master.gain.value = 0.78;
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

  return { ctx, buses, hat, snare };
}

function hit(graph: Graph, board: Live, pat: Pattern, step: number, t: number) {
  const { ctx, buses } = graph;
  const swing = step % 2 === 1 ? (60 / board.bpm / 4) * board.swing * 0.5 : 0;
  const when = t + swing;
  const fire = (voice: Voice, node: AudioNode, stopAt: number) => {
    node.connect(buses[voice]);
    if ("stop" in node && typeof node.stop === "function") {
      try {
        (node as AudioBufferSourceNode).stop(stopAt);
      } catch {
        /* already stopped */
      }
    }
  };

  if (pat.drums.kick[step]) {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(168, when);
    o.frequency.exponentialRampToValueAtTime(46, when + 0.09);
    const g = envGain(ctx, when, 0.95, 0.28);
    o.connect(g);
    fire("kick", g, when + 0.32);
    o.start(when);
    o.stop(when + 0.32);
  }
  if (pat.drums.snare[step]) {
    const src = ctx.createBufferSource();
    src.buffer = graph.snare;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800;
    bp.Q.value = 0.7;
    const g = envGain(ctx, when, 0.55, 0.16);
    src.connect(bp);
    bp.connect(g);
    fire("snare", g, when + 0.2);
    src.start(when);
    const tone = ctx.createOscillator();
    tone.type = "triangle";
    tone.frequency.value = 196;
    const tg = envGain(ctx, when, 0.22, 0.1);
    tone.connect(tg);
    fire("snare", tg, when + 0.14);
    tone.start(when);
    tone.stop(when + 0.14);
  }
  if (pat.drums.hat[step]) {
    const src = ctx.createBufferSource();
    src.buffer = graph.hat;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 6800;
    const g = envGain(ctx, when, 0.28, 0.035);
    src.connect(hp);
    hp.connect(g);
    fire("hat", g, when + 0.06);
    src.start(when);
  }
  if (pat.drums.perc[step]) {
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.value = 740;
    const g = envGain(ctx, when, 0.16, 0.07);
    o.connect(g);
    fire("perc", g, when + 0.09);
    o.start(when);
    o.stop(when + 0.09);
  }
  const bass = pat.bass[step];
  if (bass != null) {
    const held = pat.bass[(step + 1) % 16] == null;
    const o = ctx.createOscillator();
    o.type = "sine";
    const hz = noteHz(board.key, bass, 36);
    o.frequency.setValueAtTime(hz * 1.5, when);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, hz), when + 0.05);
    const g = envGain(ctx, when, 0.7, held ? 0.42 : 0.12);
    o.connect(g);
    fire("bass", g, when + (held ? 0.48 : 0.16));
    o.start(when);
    o.stop(when + (held ? 0.5 : 0.18));
  }
  const lead = pat.lead[step];
  if (lead != null) {
    const held = pat.lead[(step + 1) % 16] == null;
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = noteHz(board.key, lead, 60);
    const g = envGain(ctx, when, 0.22, held ? 0.28 : 0.12);
    o.connect(g);
    fire("lead", g, when + (held ? 0.32 : 0.16));
    o.start(when);
    o.stop(when + (held ? 0.34 : 0.18));
  }
}

export async function bounceBoard(board: Live, bars = 8): Promise<Blob> {
  const bpm = Math.max(40, board.bpm);
  const stepDur = 60 / bpm / 4;
  const steps = bars * 16;
  const seconds = steps * stepDur + 2.4;
  const rate = 44100;
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * rate), rate);
  const graph = build(ctx, board.rack, board.gains, board.mutes);
  const start = 0.08;
  for (let i = 0; i < steps; i++) {
    const bar = Math.floor(i / 16);
    const step = i % 16;
    const id = board.arrangeOn
      ? board.arrangement[bar % Math.max(1, board.arrangement.length)]
      : board.patternId;
    const pat = board.patterns[id ?? board.patternId] ?? board.patterns[board.patternId];
    if (!pat) continue;
    hit(graph, { ...board, bpm }, pat, step, start + i * stepDur);
  }
  return encodeWav(await ctx.startRendering());
}

function encodeWav(buffer: AudioBuffer): Blob {
  const channels = 2;
  const rate = buffer.sampleRate;
  const left = buffer.getChannelData(0);
  const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;
  const samples = buffer.length;
  const bytes = new ArrayBuffer(44 + samples * channels * 2);
  const view = new DataView(bytes);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + samples * channels * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples * channels * 2, true);
  let offset = 44;
  for (let i = 0; i < samples; i++) {
    const l = Math.max(-1, Math.min(1, left[i] ?? 0));
    const r = Math.max(-1, Math.min(1, right[i] ?? 0));
    view.setInt16(offset, l < 0 ? l * 0x8000 : l * 0x7fff, true);
    view.setInt16(offset + 2, r < 0 ? r * 0x8000 : r * 0x7fff, true);
    offset += 4;
  }
  return new Blob([bytes], { type: "audio/wav" });
}

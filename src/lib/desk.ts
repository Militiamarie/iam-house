import { noteHz, type HouseKey, type Pattern, type Rack, type Voice, VOICES } from "@/lib/patterns";

export type Desk = {
  sum: GainNode;
  buses: Record<Voice, GainNode>;
  eqLow: BiquadFilterNode;
  eqMid: BiquadFilterNode;
  eqHigh: BiquadFilterNode;
  shaper: WaveShaperNode;
  comp: DynamicsCompressorNode;
  delay: DelayNode;
  feedback: GainNode;
  echoSend: GainNode;
  echoWet: GainNode;
  roomSend: GainNode;
  roomWet: GainNode;
  hat: AudioBuffer;
  snare: AudioBuffer;
  master: GainNode;
};

function noise(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function plate(ctx: BaseAudioContext): AudioBuffer {
  const seconds = 2.1;
  const len = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, len, ctx.sampleRate);
  const taps = [0.012, 0.019, 0.031, 0.047, 0.068];
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < len; i++) {
      const t = i / ctx.sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-3.1 * t);
    }
    for (const tap of taps) {
      const at = Math.floor((tap + c * 0.003) * ctx.sampleRate);
      if (at < len) data[at] += (c ? -0.4 : 0.4);
    }
  }
  return buffer;
}

export function shaperCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 512;
  const curve = new Float32Array(n);
  const k = 1 + amount * 22;
  const norm = Math.tanh(k);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * k) / norm;
  }
  return curve;
}

function aim(param: AudioParam, value: number, glide: number | null) {
  if (glide == null) {
    param.value = value;
    return;
  }
  param.setTargetAtTime(value, glide, 0.03);
}

export function paintDesk(desk: Desk, rack: Rack, glide: number | null) {
  aim(desk.eqLow.gain, rack.low, glide);
  aim(desk.eqMid.gain, rack.mid, glide);
  aim(desk.eqHigh.gain, rack.high, glide);
  aim(desk.comp.threshold, -10 - rack.press * 16, glide);
  aim(desk.comp.ratio, 1.6 + rack.press * 5, glide);
  if (glide == null) desk.shaper.curve = shaperCurve(rack.grit);
  aim(desk.echoSend.gain, rack.echo * 0.85, glide);
  aim(desk.echoWet.gain, rack.echo > 0.01 ? 0.7 : 0, glide);
  aim(desk.feedback.gain, Math.min(0.46, 0.16 + rack.echo * 0.34), glide);
  aim(desk.delay.delayTime, Math.min(0.9, Math.max(0.05, rack.delayTime)), glide);
  aim(desk.roomSend.gain, rack.room * 0.8, glide);
  aim(desk.roomWet.gain, rack.room > 0.01 ? 0.75 : 0, glide);
}

export function buildDesk(ctx: BaseAudioContext): Desk {
  const sum = ctx.createGain();
  sum.gain.value = 1;
  const buses = {} as Record<Voice, GainNode>;
  for (const voice of VOICES) {
    const gain = ctx.createGain();
    gain.gain.value = 0.7;
    gain.connect(sum);
    buses[voice] = gain;
  }

  const rumble = ctx.createBiquadFilter();
  rumble.type = "highpass";
  rumble.frequency.value = 28;
  rumble.Q.value = 0.7;

  const eqLow = ctx.createBiquadFilter();
  eqLow.type = "lowshelf";
  eqLow.frequency.value = 90;
  const eqMid = ctx.createBiquadFilter();
  eqMid.type = "peaking";
  eqMid.frequency.value = 900;
  eqMid.Q.value = 0.9;
  const eqHigh = ctx.createBiquadFilter();
  eqHigh.type = "highshelf";
  eqHigh.frequency.value = 6500;

  const shaper = ctx.createWaveShaper();
  shaper.curve = shaperCurve(0);
  shaper.oversample = "4x";

  const comp = ctx.createDynamicsCompressor();
  comp.knee.value = 8;
  comp.attack.value = 0.012;
  comp.release.value = 0.22;

  const dry = ctx.createGain();
  dry.gain.value = 1;

  const delay = ctx.createDelay(1.2);
  delay.delayTime.value = 0.28;
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 3400;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.28;
  const echoSend = ctx.createGain();
  const echoWet = ctx.createGain();
  echoSend.connect(delay);
  delay.connect(tone);
  tone.connect(feedback);
  feedback.connect(delay);
  tone.connect(echoWet);

  const conv = ctx.createConvolver();
  conv.buffer = plate(ctx);
  const roomSend = ctx.createGain();
  const roomWet = ctx.createGain();
  roomSend.connect(conv);
  conv.connect(roomWet);

  const glue = ctx.createGain();
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -2.2;
  limiter.knee.value = 0;
  limiter.ratio.value = 14;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.1;

  const master = ctx.createGain();
  master.gain.value = 0.82;

  sum.connect(rumble);
  rumble.connect(eqLow);
  eqLow.connect(eqMid);
  eqMid.connect(eqHigh);
  eqHigh.connect(shaper);
  shaper.connect(comp);
  comp.connect(dry);
  comp.connect(echoSend);
  comp.connect(roomSend);
  dry.connect(glue);
  echoWet.connect(glue);
  roomWet.connect(glue);
  glue.connect(limiter);
  limiter.connect(master);
  master.connect(ctx.destination);

  return {
    sum,
    buses,
    eqLow,
    eqMid,
    eqHigh,
    shaper,
    comp,
    delay,
    feedback,
    echoSend,
    echoWet,
    roomSend,
    roomWet,
    hat: noise(ctx, 0.12),
    snare: noise(ctx, 0.35),
    master,
  };
}

function env(ctx: BaseAudioContext, t: number, peak: number, dur: number, attack = 0.003): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(attack + 0.02, dur));
  return g;
}

function hang(bus: GainNode, node: AudioNode, stopAt: number) {
  node.connect(bus);
  if ("stop" in node && typeof node.stop === "function") {
    try {
      (node as AudioBufferSourceNode).stop(stopAt);
    } catch {
      /* already stopped */
    }
  }
}

function tone(
  ctx: BaseAudioContext,
  when: number,
  type: OscillatorType,
  hz: number,
  peak: number,
  dur: number,
): GainNode {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(Math.max(20, hz), when);
  const g = env(ctx, when, peak, dur, 0.002);
  o.connect(g);
  o.start(when);
  o.stop(when + dur + 0.02);
  return g;
}

export function strike(
  ctx: BaseAudioContext,
  buses: Record<Voice, GainNode>,
  dust: { hat: AudioBuffer; snare: AudioBuffer },
  pat: Pattern,
  step: number,
  t: number,
  key: HouseKey,
  bpm: number,
  swing: number,
) {
  const when = t + (step % 2 === 1 ? (60 / bpm / 4) * swing * 0.5 : 0);

  if (pat.drums.kick[step]) {
    const body = ctx.createOscillator();
    body.type = "sine";
    body.frequency.setValueAtTime(148, when);
    body.frequency.exponentialRampToValueAtTime(58, when + 0.04);
    body.frequency.exponentialRampToValueAtTime(44, when + 0.2);
    const bodyG = env(ctx, when, 0.92, 0.36, 0.002);
    body.connect(bodyG);
    hang(buses.kick, bodyG, when + 0.4);
    body.start(when);
    body.stop(when + 0.42);

    const click = ctx.createBufferSource();
    click.buffer = dust.hat;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2200;
    const clickG = env(ctx, when, 0.42, 0.014, 0.001);
    click.connect(hp);
    hp.connect(clickG);
    hang(buses.kick, clickG, when + 0.03);
    click.start(when);
  }

  if (pat.drums.snare[step]) {
    const src = ctx.createBufferSource();
    src.buffer = dust.snare;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1900;
    bp.Q.value = 0.85;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 900;
    const g = env(ctx, when, 0.5, 0.18, 0.001);
    src.connect(bp);
    bp.connect(hp);
    hp.connect(g);
    hang(buses.snare, g, when + 0.24);
    src.start(when);
    hang(buses.snare, tone(ctx, when, "triangle", 186, 0.28, 0.12), when + 0.16);
    hang(buses.snare, tone(ctx, when, "sine", 332, 0.08, 0.04), when + 0.06);
  }

  if (pat.drums.hat[step]) {
    const pan = ctx.createStereoPanner();
    pan.pan.value = 0.28;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    const g = env(ctx, when, 0.22, 0.045, 0.001);
    const ratios = [1, 1.42, 1.73, 2.16, 2.71, 3.18];
    for (const ratio of ratios) {
      const o = ctx.createOscillator();
      o.type = "square";
      o.frequency.value = 318 * ratio;
      const bit = ctx.createGain();
      bit.gain.value = 0.07;
      o.connect(bit);
      bit.connect(hp);
      o.start(when);
      o.stop(when + 0.06);
    }
    const dustSrc = ctx.createBufferSource();
    dustSrc.buffer = dust.hat;
    const dustG = ctx.createGain();
    dustG.gain.value = 0.35;
    dustSrc.connect(dustG);
    dustG.connect(hp);
    hp.connect(g);
    g.connect(pan);
    hang(buses.hat, pan, when + 0.07);
    dustSrc.start(when);
  }

  if (pat.drums.perc[step]) {
    const pan = ctx.createStereoPanner();
    pan.pan.value = -0.22;
    const mix = ctx.createGain();
    mix.connect(pan);
    tone(ctx, when, "sine", 980, 0.22, 0.05).connect(mix);
    tone(ctx, when, "sine", 1460, 0.1, 0.03).connect(mix);
    const tick = ctx.createBufferSource();
    tick.buffer = dust.hat;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2400;
    const tickG = env(ctx, when, 0.16, 0.02, 0.001);
    tick.connect(hp);
    hp.connect(tickG);
    tickG.connect(mix);
    hang(buses.perc, pan, when + 0.08);
    tick.start(when);
  }

  const bass = pat.bass[step];
  if (bass != null) {
    const held = pat.bass[(step + 1) % 16] == null;
    const hz = noteHz(key, bass, 36);
    const dur = held ? 0.5 : 0.16;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(hz * 1.4, when);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, hz), when + 0.055);
    const harm = ctx.createOscillator();
    harm.type = "sine";
    harm.frequency.setValueAtTime(hz * 2.8, when);
    harm.frequency.exponentialRampToValueAtTime(Math.max(40, hz * 2), when + 0.055);
    const harmG = ctx.createGain();
    harmG.gain.value = 0.16;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 220;
    const shape = ctx.createWaveShaper();
    shape.curve = shaperCurve(0.22);
    shape.oversample = "2x";
    const g = env(ctx, when, 0.78, dur, 0.004);
    o.connect(lp);
    harm.connect(harmG);
    harmG.connect(lp);
    lp.connect(shape);
    shape.connect(g);
    hang(buses.bass, g, when + dur + 0.05);
    o.start(when);
    harm.start(when);
    o.stop(when + dur + 0.06);
    harm.stop(when + dur + 0.06);
  }

  const lead = pat.lead[step];
  if (lead != null) {
    const held = pat.lead[(step + 1) % 16] == null;
    const hz = noteHz(key, lead, 60);
    const dur = held ? 0.32 : 0.14;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 0.7;
    lp.frequency.setValueAtTime(480, when);
    lp.frequency.exponentialRampToValueAtTime(2400, when + 0.035);
    lp.frequency.exponentialRampToValueAtTime(880, when + dur);
    const g = env(ctx, when, 0.2, dur, 0.008);
    for (const [detune, panValue] of [
      [1, -0.22],
      [1.007, 0.22],
    ] as const) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = hz * detune;
      const pan = ctx.createStereoPanner();
      pan.pan.value = panValue;
      o.connect(pan);
      pan.connect(lp);
      o.start(when);
      o.stop(when + dur + 0.04);
    }
    lp.connect(g);
    hang(buses.lead, g, when + dur + 0.05);
  }
}

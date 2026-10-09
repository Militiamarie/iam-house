import { buildDesk, paintDesk, strike } from "@/lib/desk";
import type { Live } from "@/lib/engine";
import { VOICES } from "@/lib/patterns";

export async function bounceBoard(board: Live, bars = 8): Promise<Blob> {
  const bpm = Math.max(40, board.bpm);
  const stepDur = 60 / bpm / 4;
  const steps = bars * 16;
  const seconds = steps * stepDur + 2.6;
  const rate = 44100;
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * rate), rate);
  const desk = buildDesk(ctx);
  paintDesk(desk, board.rack, null);
  for (const voice of VOICES) {
    desk.buses[voice].gain.value = board.mutes[voice] ? 0 : board.gains[voice];
  }
  const start = 0.08;
  for (let i = 0; i < steps; i++) {
    const bar = Math.floor(i / 16);
    const step = i % 16;
    const id = board.arrangeOn ? board.arrangement[bar % Math.max(1, board.arrangement.length)] : board.patternId;
    const pat = board.patterns[id ?? board.patternId] ?? board.patterns[board.patternId];
    if (!pat) continue;
    strike(ctx, desk.buses, desk, pat, step, start + i * stepDur, board.key, bpm, board.swing);
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

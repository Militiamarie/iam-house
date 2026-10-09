export const STEPS = 16;

export const DRUMS = ["kick", "snare", "hat", "perc"] as const;
export type DrumKey = (typeof DRUMS)[number];
export type Voice = DrumKey | "bass" | "lead";

export const KEY_OFFSET = { C: 0, D: 2, F: 5, G: 7, A: 9 } as const;
export type HouseKey = keyof typeof KEY_OFFSET;
export const KEYS = Object.keys(KEY_OFFSET) as HouseKey[];

const SCALE = [0, 2, 3, 5, 7, 8, 10, 12];
const NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

export type Rack = {
  low: number;
  mid: number;
  high: number;
  press: number;
  echo: number;
  room: number;
  grit: number;
  relay: boolean;
  delayTime: number;
};

export type Pattern = {
  id: string;
  name: string;
  vibe: string;
  homeBpm: number;
  homeSwing: number;
  drums: Record<DrumKey, boolean[]>;
  bass: (number | null)[];
  lead: (number | null)[];
};

export const DEFAULT_RACK: Rack = {
  low: 1.5,
  mid: 0,
  high: 0.8,
  press: 0.35,
  echo: 0.14,
  room: 0.2,
  grit: 0.06,
  relay: false,
  delayTime: 0.32,
};

export const DEFAULT_GAINS: Record<Voice, number> = {
  kick: 0.86,
  snare: 0.5,
  hat: 0.22,
  perc: 0.32,
  bass: 0.78,
  lead: 0.3,
};

export const DEFAULT_MUTES: Record<Voice, boolean> = {
  kick: false,
  snare: false,
  hat: false,
  perc: false,
  bass: false,
  lead: false,
};

function bits(s: string): boolean[] {
  if (s.length !== STEPS) throw new Error(`pattern width ${s}`);
  return [...s].map((c) => c === "x");
}

function line(s: string): (number | null)[] {
  const parts = s.trim().split(/\s+/);
  if (parts.length !== STEPS) throw new Error(`line width ${s}`);
  return parts.map((p) => (p === "." ? null : Number(p)));
}

function pat(
  id: string,
  name: string,
  vibe: string,
  homeBpm: number,
  homeSwing: number,
  kick: string,
  snare: string,
  hat: string,
  perc: string,
  bass: string,
  lead: string,
): Pattern {
  return {
    id,
    name,
    vibe,
    homeBpm,
    homeSwing,
    drums: { kick: bits(kick), snare: bits(snare), hat: bits(hat), perc: bits(perc) },
    bass: line(bass),
    lead: line(lead),
  };
}

export const PRESET_LIST: Pattern[] = [
  pat(
    "candle",
    "Candle",
    "Dusty pocket. Late room.",
    86,
    0.18,
    "x.......x..x....",
    "....x.......x...",
    "x.x.x.x.x.x.x.x.",
    "........x.......",
    "0 . . . . . 0 . 7 . . . 5 . . .",
    "0 . 3 . 7 . . . 3 . 5 . 7 . . .",
  ),
  pat(
    "afters",
    "Afters",
    "Half-time knock. 808 holds the floor.",
    142,
    0.04,
    "x..x.x..x..x....",
    "....x.......x...",
    "xxxxxxxxxxxxxxxx",
    "..x...x...x...x.",
    "0 0 . . . . 0 . . . 3 . 0 . . .",
    "7 . . 8 . . 7 . 3 . . 5 . . 3 .",
  ),
  pat(
    "concrete",
    "Concrete",
    "Four on the floor. Alley light.",
    124,
    0.06,
    "x...x...x...x...",
    "....x.......x...",
    "x.x.x.x.x.x.x.x.",
    "x.......x.....x.",
    "0 . . 0 . . 0 . 3 . . 0 . . 7 .",
    "0 3 7 8 7 3 0 . 0 3 7 8 7 5 3 .",
  ),
  pat(
    "hymn",
    "Hymn",
    "Space first. The choir can wait.",
    76,
    0.1,
    "x.......x...x...",
    "....x.......x...",
    "x.....x.x.....x.",
    "............x...",
    "0 . . . 3 . . . 7 . . . 5 . . .",
    "0 . 3 . 7 . 8 . 7 . 5 . 3 . 0 .",
  ),
];

export const PRESETS: Record<string, Pattern> = Object.fromEntries(PRESET_LIST.map((p) => [p.id, p]));

export function clonePresets(): Record<string, Pattern> {
  return structuredClone(PRESETS);
}

export function noteHz(key: HouseKey, degree: number, baseMidi: number): number {
  const d = Math.max(0, Math.min(7, degree));
  const semi = baseMidi + KEY_OFFSET[key] + SCALE[d]!;
  return 440 * 2 ** ((semi - 69) / 12);
}

export function degreeName(key: HouseKey, degree: number): string {
  const d = Math.max(0, Math.min(7, degree));
  return NAMES[(KEY_OFFSET[key] + SCALE[d]!) % 12]!;
}

export const VOICES: Voice[] = ["kick", "snare", "hat", "perc", "bass", "lead"];

export const VOICE_LABEL: Record<Voice, string> = {
  kick: "Kick",
  snare: "Snare",
  hat: "Hat",
  perc: "Perc",
  bass: "808",
  lead: "Lead",
};

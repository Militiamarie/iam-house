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
  low: 2,
  mid: -1,
  high: 1.4,
  press: 0.4,
  echo: 0.12,
  room: 0.18,
  grit: 0.08,
  relay: false,
  delayTime: 0.28,
};

export const CHAINS: { id: string; name: string; note: string; rack: Rack }[] = [
  { id: "house", name: "House", note: "The room as it was tuned. Low present, hook in front.", rack: { ...DEFAULT_RACK } },
  { id: "velvet", name: "Velvet", note: "Warm shelf, a small room, almost no grit.", rack: { low: 3.5, mid: -1.5, high: 0.4, press: 0.32, echo: 0.08, room: 0.24, grit: 0.04, delayTime: 0.22, relay: false } },
  { id: "club", name: "Club", note: "Kick and 808 forward. Short room. The press holds the peak.", rack: { low: 4, mid: -2, high: 1, press: 0.62, echo: 0.06, room: 0.1, grit: 0.12, delayTime: 0.18, relay: false } },
  { id: "plate", name: "Plate", note: "Bright tail. The snare and the hook sit in it.", rack: { low: 1, mid: 0.5, high: 3, press: 0.36, echo: 0.16, room: 0.42, grit: 0.05, delayTime: 0.2, relay: false } },
  { id: "tape", name: "Tape", note: "Rolled top, a little dirt, like the machine was warm.", rack: { low: 2.5, mid: 1, high: -2.5, press: 0.48, echo: 0.1, room: 0.14, grit: 0.28, delayTime: 0.26, relay: false } },
  { id: "tunnel", name: "Tunnel", note: "A long echo that stays dark so the words can return.", rack: { low: 1, mid: -0.5, high: -1, press: 0.4, echo: 0.58, room: 0.34, grit: 0.06, delayTime: 0.48, relay: false } },
  { id: "radio", name: "Radio", note: "Narrow band. A handset in the alley.", rack: { low: -10, mid: 6, high: -8, press: 0.55, echo: 0.04, room: 0.04, grit: 0.22, delayTime: 0.12, relay: false } },
  { id: "choir", name: "Choir", note: "Air on the top, a short plate, no shout.", rack: { low: 0, mid: 0.5, high: 3.5, press: 0.24, echo: 0.22, room: 0.46, grit: 0, delayTime: 0.1, relay: false } },
  { id: "dry", name: "Dry", note: "No room. Hear the kit before you color it.", rack: { low: 1, mid: 0, high: 0.6, press: 0.2, echo: 0, room: 0, grit: 0.02, delayTime: 0.2, relay: false } },
  { id: "relay", name: "Relay", note: "Snaps a sung note to the house scale.", rack: { low: 2, mid: 1.5, high: 0.5, press: 0.45, echo: 0.16, room: 0.14, grit: 0.1, delayTime: 0.22, relay: true } },
];

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
  perc: "Rim",
  bass: "808",
  lead: "Lead",
};

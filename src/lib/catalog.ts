import type { HouseKey } from "@/lib/patterns";
import type { FilterId } from "@/lib/filters";

export type Post = {
  id: string;
  author: string;
  handle: string;
  time: string;
  text: string;
  image?: string;
  video?: string;
  poster?: string;
  likes: number;
  tag: string;
  pocket?: string;
};

export type StoryFrame = {
  id: string;
  kind: "image" | "video";
  src: string;
  poster?: string;
  filter: FilterId;
  caption: string;
};

export type StoryThread = {
  id: string;
  name: string;
  avatar: string;
  sku?: string;
  frames: StoryFrame[];
};

export type LinkCard = {
  id: string;
  name: string;
  role: string;
  city: string;
  looking: string;
  pocket: string;
  monogram: string;
};

export type BeatListing = {
  id: string;
  patternId: string;
  name: string;
  maker: string;
  price: number;
  license: string;
  note: string;
};

export type Edition = {
  id: string;
  name: string;
  kind: string;
  price: number;
  image?: string;
  video?: string;
  poster?: string;
  note: string;
};

export type Lesson = {
  id: string;
  title: string;
  minutes: number;
  kicker: string;
};

export type RankSeed = {
  id: string;
  name: string;
  city: string;
  score: number;
};

export const THREADS: StoryThread[] = [
  {
    id: "melitia",
    name: "Melitia",
    avatar: "/media/reina-face.jpg",
    frames: [
      {
        id: "m1",
        kind: "image",
        src: "/media/reina-face.jpg",
        filter: "film",
        caption: "Cap low. Name stays up. The house is open.",
      },
      {
        id: "m2",
        kind: "video",
        src: "/media/booth-tape.mp4",
        poster: "/media/tape-poster.jpg",
        filter: "neon",
        caption: "Bleed the Block. Same take, neon grade.",
      },
      {
        id: "m3",
        kind: "image",
        src: "/media/comic.jpg",
        filter: "concrete",
        caption: "Lime on concrete. The wall already knew the spelling.",
      },
    ],
  },
  {
    id: "room",
    name: "The room",
    avatar: "/media/studio.jpg",
    frames: [
      {
        id: "r1",
        kind: "image",
        src: "/media/studio.jpg",
        filter: "gold",
        caption: "Console warm. Neon says the only name that matters.",
      },
      {
        id: "r2",
        kind: "video",
        src: "/media/booth-tape.mp4",
        poster: "/media/tape-poster.jpg",
        filter: "vhs",
        caption: "House tape on VHS. The hook still hits.",
      },
    ],
  },
  {
    id: "after",
    name: "After hours",
    avatar: "/media/tape-poster.jpg",
    sku: "thread-after",
    frames: [
      {
        id: "a1",
        kind: "video",
        src: "/media/booth-tape.mp4",
        poster: "/media/tape-poster.jpg",
        filter: "blood",
        caption: "Inner tape. Blood Moon grade. Pay the house to stay.",
      },
    ],
  },
  {
    id: "seen",
    name: "Seen",
    avatar: "/media/ian-seen.jpg",
    frames: [
      {
        id: "s1",
        kind: "image",
        src: "/media/ian-seen.jpg",
        filter: "night",
        caption: "CorLee DTM with Melitia Marie. IAN SEEN. 818 Night.",
      },
    ],
  },
];

export const SEED_POSTS: Post[] = [
  {
    id: "p-room",
    author: "Melitia Marie",
    handle: "melitia",
    time: "2h",
    text: "Board is up. Candles on the meter bridge, vinyl on the floor, and the neon that doesn’t blink. If you came to learn the pocket, the academy is in the same house.",
    image: "/media/studio.jpg",
    likes: 128,
    tag: "Room",
    pocket: "candle",
  },
  {
    id: "p-seen",
    author: "Melitia Marie",
    handle: "melitia",
    time: "5h",
    text: "IAN SEEN — CorLee DTM featuring Melitia Marie. Blue on the eyes. Don’t look away on the hook.",
    image: "/media/ian-seen.jpg",
    likes: 246,
    tag: "Drop",
    pocket: "afters",
  },
  {
    id: "p-ink",
    author: "Melitia Marie",
    handle: "melitia",
    time: "1d",
    text: "Painted the name where the alley could read it. Same woman who runs the booth.",
    image: "/media/comic.jpg",
    likes: 190,
    tag: "Ink",
    pocket: "concrete",
  },
  {
    id: "p-tape",
    author: "Melitia Marie",
    handle: "melitia",
    time: "1d",
    text: "Bleed the Block. Gangsta in the veins, blood sweat for the name. Produced in-house.",
    video: "/media/booth-tape.mp4",
    poster: "/media/tape-poster.jpg",
    likes: 312,
    tag: "Tape",
    pocket: "hymn",
  },
  {
    id: "p-nova",
    author: "Nova Reed",
    handle: "nova",
    time: "3h",
    text: "Left the last bar empty. If you can sing into that hole without filling it, the hook is yours.",
    likes: 64,
    tag: "Hook",
    pocket: "hymn",
  },
  {
    id: "p-ocho",
    author: "Saint Ocho",
    handle: "ocho",
    time: "6h",
    text: "Knock sits late. Don’t rap on the one. The 808 already said it.",
    likes: 88,
    tag: "Knock",
    pocket: "afters",
  },
  {
    id: "p-lumen",
    author: "Lumen Paz",
    handle: "lumen",
    time: "8h",
    text: "Topline is a candle, not a siren. One note, then the room.",
    likes: 41,
    tag: "Topline",
    pocket: "candle",
  },
];

export const FACES: Record<string, { city: string; line: string }> = {
  melitia: { city: "SFV", line: "The house. The board, the booth, and the name on the wall." },
  nova: { city: "Oakland", line: "Hooks with air left in them." },
  ocho: { city: "SFV", line: "808s that sit behind the verse, not on it." },
  lumen: { city: "Boyle Heights", line: "Toplines for a night that stays lit." },
  you: { city: "Here", line: "Your notes, on whatever pocket the board is holding." },
};

export const LINKS: LinkCard[] = [
  {
    id: "nova",
    name: "Nova Reed",
    role: "Keys & hooks",
    city: "Oakland",
    looking: "A writer who will leave air in the chorus.",
    pocket: "Hymn",
    monogram: "NR",
  },
  {
    id: "ocho",
    name: "Saint Ocho",
    role: "808s",
    city: "SFV",
    looking: "Verses that sit behind the knock, not on it.",
    pocket: "Afters",
    monogram: "SO",
  },
  {
    id: "lumen",
    name: "Lumen Paz",
    role: "Toplines",
    city: "Boyle Heights",
    looking: "A night record with one candle still lit.",
    pocket: "Candle",
    monogram: "LP",
  },
  {
    id: "kit",
    name: "Kit Vale",
    role: "Cuts & texture",
    city: "Burbank",
    looking: "Someone who treats silence like a hit.",
    pocket: "Candle",
    monogram: "KV",
  },
  {
    id: "low",
    name: "Low Choir",
    role: "Stacks",
    city: "Inglewood",
    looking: "A lead that can hold a hymn without getting pretty.",
    pocket: "Hymn",
    monogram: "LC",
  },
  {
    id: "mar",
    name: "Mar Isolde",
    role: "Club edits",
    city: "Downtown",
    looking: "A four-on-the-floor that still feels like the alley.",
    pocket: "Concrete",
    monogram: "MI",
  },
];

export const BEATS: BeatListing[] = [
  {
    id: "beat-candle",
    patternId: "candle",
    name: "Candle Kit",
    maker: "House",
    price: 36,
    license: "Lease · wav & stems",
    note: "Swing on the hat. Leave the 2 and the 4 alone.",
  },
  {
    id: "beat-afters",
    patternId: "afters",
    name: "818 Afters",
    maker: "House",
    price: 48,
    license: "Lease · wav & stems",
    note: "Half-time clap. The 808 is the sentence.",
  },
  {
    id: "beat-concrete",
    patternId: "concrete",
    name: "Concrete Hour",
    maker: "House",
    price: 42,
    license: "Lease · wav",
    note: "Floor drum. Lead walks the minor.",
  },
  {
    id: "beat-hymn",
    patternId: "hymn",
    name: "Pocket Prayer",
    maker: "House",
    price: 64,
    license: "Exclusive hold",
    note: "Slow. One perc. Don’t fill it.",
  },
];

export const EDITIONS: Edition[] = [
  {
    id: "ed-seen",
    name: "IAN SEEN",
    kind: "Cover · 1 of 1",
    price: 80,
    image: "/media/ian-seen.jpg",
    note: "CorLee DTM ft Melitia Marie. House print of the cover.",
  },
  {
    id: "ed-room",
    name: "The Board",
    kind: "Still · 1 of 1",
    price: 54,
    image: "/media/studio.jpg",
    note: "The room the record was finished in.",
  },
  {
    id: "ed-ink",
    name: "Name on the Wall",
    kind: "Ink · 1 of 1",
    price: 60,
    image: "/media/comic.jpg",
    note: "Street frame. Lime, black, and the spelling.",
  },
  {
    id: "ed-tape",
    name: "Bleed the Block",
    kind: "Tape · 1 of 1",
    price: 72,
    video: "/media/booth-tape.mp4",
    poster: "/media/tape-poster.jpg",
    note: "Session visual. Produced by the house.",
  },
];

export const LESSONS: Lesson[] = [
  { id: "pocket", title: "Put the snare on the 2 and the 4", minutes: 6, kicker: "Pocket" },
  { id: "hook", title: "Choose the line that can be a hook", minutes: 5, kicker: "Writing" },
  { id: "eight", title: "Let the 808 finish the sentence", minutes: 7, kicker: "Bass" },
  { id: "rack", title: "Darken the hats without killing the air", minutes: 6, kicker: "Rack" },
  { id: "release", title: "License, stems, exclusive — in that order", minutes: 4, kicker: "Release" },
];

export const RANKS: RankSeed[] = [
  { id: "melitia", name: "Melitia Marie", city: "818", score: 240 },
  { id: "ocho", name: "Saint Ocho", city: "SFV", score: 188 },
  { id: "lumen", name: "Lumen Paz", city: "Boyle Heights", score: 164 },
  { id: "nova", name: "Nova Reed", city: "Oakland", score: 141 },
  { id: "you", name: "You", city: "In the house", score: 36 },
  { id: "low", name: "Low Choir", city: "Inglewood", score: 120 },
];

export type Bout = {
  id: string;
  left: { id: string; name: string; pattern: string; lines: string[] };
  right: { id: string; name: string; pattern: string; lines: string[] };
};

export const BOUTS: Bout[] = [
  {
    id: "cheap-light",
    left: { id: "ocho", name: "Saint Ocho", pattern: "afters", lines: ["Knock when the lights go cheap,", "I still count the pocket in my sleep."] },
    right: { id: "lumen", name: "Lumen Paz", pattern: "candle", lines: ["Leave the snare where the truth can land,", "I don’t decorate a shaking hand."] },
  },
  {
    id: "name-up",
    left: { id: "nova", name: "Nova Reed", pattern: "hymn", lines: ["Air in the hook, I don’t fill the room,", "The last bar can carry the whole tune."] },
    right: { id: "melitia", name: "Melitia Marie", pattern: "concrete", lines: ["Name on the wall, and the wall stays up,", "I don’t borrow a voice to fill a cup."] },
  },
  {
    id: "choir-cut",
    left: { id: "low", name: "Low Choir", pattern: "hymn", lines: ["Hold it. The pretty note can wait.", "Silence is a hit if you don’t decorate."] },
    right: { id: "ocho", name: "Saint Ocho", pattern: "afters", lines: ["Behind the kick, not on the one,", "If you rush it, the pocket’s already done."] },
  },
  {
    id: "alley-four",
    left: { id: "lumen", name: "Lumen Paz", pattern: "candle", lines: ["One candle, then the alley knows,", "I don’t spell the feeling out in rows."] },
    right: { id: "nova", name: "Nova Reed", pattern: "concrete", lines: ["Four on the floor, but leave a door,", "The chorus needs a place to want some more."] },
  },
];

export type Call = { id: string; from: string; pattern: string; line: string; land: string };

export const CALLS: Call[] = [
  { id: "quiet", from: "Nova Reed", pattern: "hymn", line: "If the room goes quiet, I still", land: "name" },
  { id: "late", from: "Saint Ocho", pattern: "afters", line: "The knock is late so the verse can", land: "wait" },
  { id: "candle", from: "Low Choir", pattern: "candle", line: "Hold the note until the candle", land: "stays" },
  { id: "alley", from: "Lumen Paz", pattern: "concrete", line: "Four on the floor, but the alley", land: "knows" },
];

export const PRICE: Record<string, { name: string; price: number }> = Object.fromEntries(
  [...BEATS, ...EDITIONS].map((item) => [item.id, { name: item.name, price: item.price }]),
);

export type Draft = {
  title: string;
  bpm: number;
  key: HouseKey;
  pocket: string;
  note: string;
  source: "reina" | "house";
  sections: { name: string; lines: string[] }[];
};

export function houseSketch(prompt: string, pocket: string, mood: string): Draft {
  const cleaned = prompt.trim().replace(/\s+/g, " ");
  const seed = cleaned.split(" ").slice(0, 4).join(" ") || "the quiet room";
  const title = seed.replace(/\b\w/g, (c) => c.toUpperCase());
  const pockets: Record<string, { bpm: number; key: HouseKey }> = {
    candle: { bpm: 86, key: "F" },
    afters: { bpm: 142, key: "A" },
    concrete: { bpm: 124, key: "D" },
    hymn: { bpm: 76, key: "C" },
  };
  const home = pockets[pocket] ?? pockets.candle!;
  const moodLine =
    mood === "devotion"
      ? "I keep the light low enough to tell the truth."
      : mood === "street"
        ? "Name on the wall, and the wall don’t clap back."
        : mood === "tender"
          ? "Come closer. The hook can whisper and still hit."
          : mood === "crown"
            ? "I am the one that doesn’t drop the name."
            : "Night session. The board remembers who stayed.";
  return {
    title,
    bpm: home.bpm,
    key: home.key,
    pocket,
    source: "house",
    note: "House sketch — Reina didn’t write this pass.",
    sections: [
      { name: "Intro", lines: [moodLine, `Hold “${seed}” for a bar and let the hat speak.`] },
      {
        name: "Verse",
        lines: [
          `I walked ${seed} back into the booth alone.`,
          "Count the kick, then say less than you planned.",
        ],
      },
      {
        name: "Hook",
        lines: ["I stay on the one. I don’t decorate the two.", `Say ${seed}. Leave the rest to the 808.`],
      },
      { name: "Outro", lines: ["Candles down. Neon stays.", "One more take, then print it."] },
    ],
  };
}

export const FREESTYLE_WORDS = [
  "candle",
  "block",
  "crown",
  "818",
  "veins",
  "afters",
  "hymn",
  "concrete",
  "neon",
  "pocket",
  "papers",
  "alley",
];

export const HOOK_QUIZ = {
  prompt: "Which line can actually be the hook?",
  options: [
    {
      id: "a",
      text: "I was thinking about a lot of different things that happened earlier when I was outside.",
      right: false,
    },
    {
      id: "b",
      text: "I stay on the one. I don’t decorate the two.",
      right: true,
    },
    {
      id: "c",
      text: "Furthermore the snare is positioned approximately on beat two in common time.",
      right: false,
    },
  ],
  why: "A hook is short enough to repeat and physical enough to feel. The middle line has a picture and a pocket. The others explain. Explanations don’t get sung twice.",
};

export const RELEASE_ORDER = ["Lease", "Stems", "Exclusive"] as const;

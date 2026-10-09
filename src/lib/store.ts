import { create } from "zustand";
import { persist } from "zustand/middleware";
import { live, type Live } from "@/lib/engine";
import {
  PRICE,
  RANKS,
  SEED_POSTS,
  type Draft,
  type Post,
  type StoryFrame,
} from "@/lib/catalog";
import { OFFERS } from "@/lib/offers";
import {
  clonePresets,
  DEFAULT_GAINS,
  DEFAULT_MUTES,
  DEFAULT_RACK,
  type DrumKey,
  type HouseKey,
  type Rack,
  type Voice,
} from "@/lib/patterns";
import { makeCodes, storeLabel, WIRE_COST, type StoreId, type WireRelease } from "@/lib/wire";

export type RoomId =
  | "pulse"
  | "studio"
  | "booth"
  | "forge"
  | "cipher"
  | "market"
  | "gallery"
  | "wire"
  | "vault"
  | "link"
  | "academy";

export type Activity = { id: string; label: string; amount: number; at: number };
export type Note = { id: string; name: string; text: string };
export type ChatLine = { id: string; role: "you" | "reina"; text: string };

type Data = {
  room: RoomId;
  credits: number;
  activity: Activity[];
  owned: string[];
  likes: Record<string, boolean>;
  likeBoost: Record<string, number>;
  comments: Record<string, Note[]>;
  posts: Post[];
  userFrames: StoryFrame[];
  paid: string[];
  payoutUrl: string;
  booksNonce: number;
  follows: Record<string, boolean>;
  matches: string[];
  passed: string[];
  scores: Record<string, number>;
  battleVote: "left" | "right" | null;
  cleared: Record<string, boolean>;
  rewarded: Record<string, boolean>;
  draft: Draft | null;
  locks: { drums: boolean; bass: boolean; lead: boolean };
  messages: ChatLine[];
  releases: WireRelease[];
  reinaOpen: boolean;
  moreOpen: boolean;
  sessionWith: string | null;
  bpm: number;
  swing: number;
  key: HouseKey;
  patternId: string;
  arrangeOn: boolean;
  arrangement: string[];
  patterns: ReturnType<typeof clonePresets>;
  rack: Rack;
  gains: Record<Voice, number>;
  mutes: Record<Voice, boolean>;
  playing: boolean;
  step: number;
};

type Actions = {
  setRoom: (room: RoomId) => void;
  setReina: (open: boolean) => void;
  setMore: (open: boolean) => void;
  setPlaying: (playing: boolean) => void;
  setStep: (step: number) => void;
  setBpm: (bpm: number) => void;
  setSwing: (swing: number) => void;
  setKey: (key: HouseKey) => void;
  setArrange: (on: boolean) => void;
  hear: (id: string) => void;
  cycleSlot: (index: number) => void;
  toggleDrum: (drum: DrumKey, index: number) => void;
  setTone: (voice: "bass" | "lead", index: number, degree: number | null) => void;
  setGain: (voice: Voice, value: number) => void;
  toggleMute: (voice: Voice) => void;
  patchRack: (partial: Partial<Rack>) => void;
  toggleLike: (id: string) => void;
  addComment: (postId: string, text: string) => void;
  addPost: (text: string) => void;
  foldSeeds: () => void;
  addFrame: (frame: StoryFrame) => void;
  markPaid: (sku: string) => void;
  mergePaid: (skus: string[]) => void;
  bumpBooks: () => void;
  setPayout: (url: string) => void;
  toggleFollow: (id: string) => void;
  spend: (id: string) => "ok" | "owned" | "broke" | "missing";
  swipe: (id: string, yes: boolean) => void;
  resetDeck: () => void;
  vote: (side: "left" | "right") => void;
  addScore: (id: string, amount: number) => void;
  clearLesson: (id: string) => void;
  setDraft: (draft: Draft | null) => void;
  setLocks: (partial: Partial<Data["locks"]>) => void;
  pushMessage: (role: ChatLine["role"], text: string) => void;
  openSession: (name: string) => void;
  sendWire: (
    input: Omit<WireRelease, "id" | "catalog" | "isrc" | "upc" | "status" | "pressedAt" | "liveAt" | "report">,
  ) => "ok" | "broke" | "empty";
  settleWire: (id: string) => void;
};

export type House = Data & Actions;

const ORDER = ["candle", "afters", "concrete", "hymn"];

function sync(s: Data) {
  const next: Live = {
    bpm: s.bpm,
    swing: s.swing,
    key: s.key,
    patternId: s.patternId,
    arrangeOn: s.arrangeOn,
    arrangement: s.arrangement,
    patterns: s.patterns,
    rack: s.rack,
    gains: s.gains,
    mutes: s.mutes,
  };
  live.current = next;
}

const initial: Data = {
  room: "pulse",
  credits: 818,
  activity: [{ id: "grant", label: "House grant", amount: 818, at: Date.now() }],
  owned: [],
  likes: {},
  likeBoost: {},
  comments: {
    "p-room": [{ id: "c1", name: "Nova Reed", text: "Leave the hat. The candle is the hook." }],
    "p-seen": [{ id: "c2", name: "Saint Ocho", text: "Blue hits harder than a clap." }],
  },
  posts: SEED_POSTS,
  userFrames: [],
  paid: [],
  payoutUrl: "",
  booksNonce: 0,
  follows: { melitia: true },
  matches: [],
  passed: [],
  scores: Object.fromEntries(RANKS.map((r) => [r.id, r.score])),
  battleVote: null,
  cleared: {},
  rewarded: {},
  draft: null,
  locks: { drums: false, bass: false, lead: false },
  messages: [
    {
      id: "hello",
      role: "reina",
      text: "I’m Reina. The house voice. Ask me to write a hook, check a pocket, or walk a lesson. I don’t do small talk about other people’s software.",
    },
  ],
  releases: [],
  reinaOpen: false,
  moreOpen: false,
  sessionWith: null,
  bpm: 86,
  swing: 0.18,
  key: "F",
  patternId: "candle",
  arrangeOn: false,
  arrangement: ["candle", "candle", "afters", "candle", "hymn", "afters", "concrete", "candle"],
  patterns: clonePresets(),
  rack: DEFAULT_RACK,
  gains: DEFAULT_GAINS,
  mutes: DEFAULT_MUTES,
  playing: false,
  step: -1,
};

export const useHouse = create<House>()(
  persist(
    (set, get) => ({
      ...initial,
      setRoom: (room) => set({ room, moreOpen: false }),
      setReina: (reinaOpen) => set({ reinaOpen, moreOpen: reinaOpen ? false : get().moreOpen }),
      setMore: (moreOpen) => set({ moreOpen, reinaOpen: moreOpen ? false : get().reinaOpen }),
      setPlaying: (playing) => set({ playing, step: playing ? get().step : -1 }),
      setStep: (step) => set({ step }),
      setBpm: (bpm) => {
        set({ bpm });
        sync(get());
      },
      setSwing: (swing) => {
        set({ swing });
        sync(get());
      },
      setKey: (key) => {
        set({ key });
        sync(get());
      },
      setArrange: (arrangeOn) => {
        set({ arrangeOn });
        sync(get());
      },
      hear: (id) => {
        const pat = get().patterns[id];
        if (!pat) return;
        set({ patternId: id, arrangeOn: false, bpm: pat.homeBpm, swing: pat.homeSwing });
        sync(get());
      },
      cycleSlot: (index) => {
        const arrangement = [...get().arrangement];
        const current = arrangement[index] ?? "candle";
        const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]!;
        arrangement[index] = next;
        set({ arrangement });
        sync(get());
      },
      toggleDrum: (drum, index) => {
        const s = get();
        const pat = s.patterns[s.patternId];
        if (!pat) return;
        const row = pat.drums[drum].map((on, i) => (i === index ? !on : on));
        const patterns = {
          ...s.patterns,
          [s.patternId]: { ...pat, drums: { ...pat.drums, [drum]: row } },
        };
        set({ patterns });
        sync(get());
      },
      setTone: (voice, index, degree) => {
        const s = get();
        const pat = s.patterns[s.patternId];
        if (!pat) return;
        const row = pat[voice].map((n, i) => (i === index ? degree : n));
        const patterns = { ...s.patterns, [s.patternId]: { ...pat, [voice]: row } };
        set({ patterns });
        sync(get());
      },
      setGain: (voice, value) => {
        set({ gains: { ...get().gains, [voice]: value } });
        sync(get());
      },
      toggleMute: (voice) => {
        set({ mutes: { ...get().mutes, [voice]: !get().mutes[voice] } });
        sync(get());
      },
      patchRack: (partial) => {
        set({ rack: { ...get().rack, ...partial } });
        sync(get());
      },
      toggleLike: (id) => {
        const on = !get().likes[id];
        set({
          likes: { ...get().likes, [id]: on },
          likeBoost: { ...get().likeBoost, [id]: (get().likeBoost[id] ?? 0) + (on ? 1 : -1) },
        });
      },
      addComment: (postId, text) => {
        const clean = text.trim();
        if (!clean) return;
        const note: Note = { id: crypto.randomUUID(), name: "You", text: clean.slice(0, 240) };
        set({ comments: { ...get().comments, [postId]: [...(get().comments[postId] ?? []), note] } });
      },
      addPost: (text) => {
        const clean = text.trim();
        if (!clean) return;
        const post: Post = {
          id: crypto.randomUUID(),
          author: "You",
          handle: "you",
          time: "now",
          text: clean.slice(0, 400),
          likes: 0,
          tag: get().patterns[get().patternId]?.name ?? "Note",
          pocket: get().patternId,
        };
        set({ posts: [post, ...get().posts] });
      },
      foldSeeds: () => {
        const posts = get().posts;
        const byId = new Map(SEED_POSTS.map((post) => [post.id, post]));
        let changed = false;
        const next = posts.map((post) => {
          const seed = byId.get(post.id);
          if (!seed?.pocket || post.pocket) return post;
          changed = true;
          return { ...post, pocket: seed.pocket };
        });
        for (const seed of SEED_POSTS) {
          if (!posts.some((post) => post.id === seed.id)) {
            next.push(seed);
            changed = true;
          }
        }
        if (changed) set({ posts: next });
      },
      addFrame: (frame) => set({ userFrames: [frame, ...get().userFrames].slice(0, 16) }),
      markPaid: (sku) => {
        const offer = OFFERS[sku];
        const paid = get().paid.includes(sku) ? get().paid : [...get().paid, sku];
        const owns = offer?.owns;
        const owned = owns && !get().owned.includes(owns) ? [...get().owned, owns] : get().owned;
        set({ paid, owned, booksNonce: get().booksNonce + 1 });
      },
      mergePaid: (skus) => {
        let paid = get().paid;
        let owned = get().owned;
        let changed = false;
        for (const sku of skus) {
          if (!paid.includes(sku)) {
            paid = [...paid, sku];
            changed = true;
          }
          const owns = OFFERS[sku]?.owns;
          if (owns && !owned.includes(owns)) {
            owned = [...owned, owns];
            changed = true;
          }
        }
        if (changed) set({ paid, owned });
      },
      bumpBooks: () => set({ booksNonce: get().booksNonce + 1 }),
      setPayout: (payoutUrl) => set({ payoutUrl }),
      toggleFollow: (id) => set({ follows: { ...get().follows, [id]: !get().follows[id] } }),
      spend: (id) => {
        const item = PRICE[id];
        if (!item) return "missing";
        if (get().owned.includes(id)) return "owned";
        if (get().credits < item.price) return "broke";
        const activity: Activity = {
          id: crypto.randomUUID(),
          label: item.name,
          amount: -item.price,
          at: Date.now(),
        };
        set({
          credits: get().credits - item.price,
          owned: [...get().owned, id],
          activity: [activity, ...get().activity].slice(0, 20),
        });
        return "ok";
      },
      swipe: (id, yes) => {
        if (yes) set({ matches: [...get().matches, id], passed: get().passed.filter((p) => p !== id) });
        else set({ passed: [...get().passed, id] });
      },
      resetDeck: () => set({ passed: [], matches: [] }),
      vote: (side) => {
        if (get().battleVote) return;
        const id = side === "left" ? "ocho" : "lumen";
        set({
          battleVote: side,
          scores: { ...get().scores, [id]: (get().scores[id] ?? 0) + 8 },
        });
      },
      addScore: (id, amount) => set({ scores: { ...get().scores, [id]: (get().scores[id] ?? 0) + amount } }),
      clearLesson: (id) => {
        if (get().cleared[id]) return;
        const rewarded = get().rewarded[id];
        const grant = rewarded ? 0 : 18;
        const activity: Activity[] = grant
          ? [
              { id: crypto.randomUUID(), label: "Lesson kept", amount: grant, at: Date.now() },
              ...get().activity,
            ].slice(0, 20)
          : get().activity;
        set({
          cleared: { ...get().cleared, [id]: true },
          rewarded: { ...get().rewarded, [id]: true },
          credits: get().credits + grant,
          activity,
        });
      },
      setDraft: (draft) => {
        if (!draft) {
          set({ draft });
          return;
        }
        const locked = get().locks.drums || get().locks.bass || get().locks.lead;
        const patch: Partial<Data> = {
          draft,
          key: draft.key,
          bpm: draft.bpm,
        };
        if (!locked && get().patterns[draft.pocket]) {
          const pat = get().patterns[draft.pocket]!;
          patch.patternId = draft.pocket;
          patch.swing = pat.homeSwing;
          patch.bpm = draft.bpm || pat.homeBpm;
          patch.arrangeOn = true;
          const hook = draft.pocket === "hymn" ? "hymn" : "afters";
          patch.arrangement = ["hymn", draft.pocket, draft.pocket, hook, draft.pocket, hook, "concrete", hook];
        }
        set(patch);
        sync(get());
      },
      setLocks: (partial) => set({ locks: { ...get().locks, ...partial } }),
      pushMessage: (role, text) =>
        set({
          messages: [...get().messages, { id: crypto.randomUUID(), role, text }].slice(-30),
        }),
      openSession: (name) => set({ sessionWith: name, room: "studio", moreOpen: false, reinaOpen: false }),
      sendWire: (input) => {
        const title = input.title.trim().slice(0, 80);
        const stores = input.stores.filter((id): id is StoreId => Boolean(id));
        if (!title || stores.length === 0) return "empty";
        if (get().credits < WIRE_COST) return "broke";
        const codes = makeCodes(get().releases.length);
        const release: WireRelease = {
          ...input,
          ...codes,
          title,
          artist: input.artist.trim().slice(0, 80) || "Melitia Marie",
          featuring: input.featuring.trim().slice(0, 80),
          lyrics: input.lyrics.slice(0, 4000),
          stores,
          id: crypto.randomUUID(),
          status: "review",
          pressedAt: Date.now(),
          liveAt: null,
          report: 0,
        };
        set({
          credits: get().credits - WIRE_COST,
          releases: [release, ...get().releases].slice(0, 12),
          activity: [
            { id: crypto.randomUUID(), label: `Wire press · ${title}`, amount: -WIRE_COST, at: Date.now() },
            ...get().activity,
          ].slice(0, 20),
        });
        return "ok";
      },
      settleWire: (id) => {
        const release = get().releases.find((row) => row.id === id);
        if (!release || release.status !== "review") return;
        const report = 4 * release.stores.length;
        const names = release.stores.map(storeLabel).join(", ");
        const post: Post = {
          id: crypto.randomUUID(),
          author: release.artist,
          handle: "melitia",
          time: "now",
          text: `${release.title} is on the wire — ${names}. Catalog ${release.catalog}.`,
          image: release.cover,
          likes: 0,
          tag: "Wire",
        };
        set({
          releases: get().releases.map((row) =>
            row.id === id ? { ...row, status: "live", liveAt: Date.now(), report } : row,
          ),
          credits: get().credits + report,
          activity: [
            { id: crypto.randomUUID(), label: `First report · ${release.title}`, amount: report, at: Date.now() },
            ...get().activity,
          ].slice(0, 20),
          posts: [post, ...get().posts],
        });
      },
    }),
    {
      name: "iam-house-v2",
      skipHydration: true,
      partialize: (s) => {
        const {
          playing: _p,
          step: _st,
          reinaOpen: _r,
          moreOpen: _m,
          setRoom: _a,
          setReina: _b,
          setMore: _c,
          setPlaying: _d,
          setStep: _e,
          setBpm: _f,
          setSwing: _g,
          setKey: _h,
          setArrange: _i,
          hear: _j,
          cycleSlot: _k,
          toggleDrum: _l,
          setTone: _n,
          setGain: _o,
          toggleMute: _q,
          patchRack: _rck,
          toggleLike: _t,
          addComment: _u,
          addPost: _v,
          foldSeeds: _fold,
          addFrame: _frame,
          markPaid: _paid,
          mergePaid: _merge,
          bumpBooks: _bump,
          setPayout: _pay,
          toggleFollow: _w,
          spend: _x,
          swipe: _y,
          resetDeck: _z,
          vote: _aa,
          addScore: _ab,
          clearLesson: _ac,
          setDraft: _ad,
          setLocks: _ae,
          pushMessage: _af,
          openSession: _ag,
          sendWire: _wire,
          settleWire: _settle,
          ...data
        } = s;
        return {
          ...data,
          userFrames: data.userFrames.filter((frame) => frame.src.startsWith("/")),
        };
      },
    },
  ),
);

export function publishLive() {
  sync(useHouse.getState());
}

import type { Live } from "@/lib/engine";

export const WIRE_COST = 24;

export const STORES = [
  { id: "spotify", label: "Spotify" },
  { id: "apple", label: "Apple Music" },
  { id: "youtube", label: "YouTube Music" },
  { id: "amazon", label: "Amazon Music" },
  { id: "tidal", label: "Tidal" },
  { id: "deezer", label: "Deezer" },
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
] as const;

export type StoreId = (typeof STORES)[number]["id"];

export type WireRelease = {
  id: string;
  catalog: string;
  isrc: string;
  upc: string;
  title: string;
  artist: string;
  featuring: string;
  genre: string;
  language: string;
  explicit: boolean;
  cover: string;
  releaseOn: string;
  stores: StoreId[];
  lyrics: string;
  splits: { name: string; share: number }[];
  status: "review" | "live";
  pressedAt: number;
  liveAt: number | null;
  report: number;
  board: Live;
};

export function storeLabel(id: StoreId): string {
  return STORES.find((store) => store.id === id)?.label ?? id;
}

export function makeCodes(index: number) {
  const n = index + 1;
  const catalog = `IAM-818-${String(n).padStart(3, "0")}`;
  const year = String(new Date().getFullYear()).slice(2);
  const isrc = `US-IAM-${year}-${String(10000 + ((n * 173) % 90000)).padStart(5, "0")}`;
  const upc = `818${String(260000000 + n * 17).padStart(9, "0")}`.slice(0, 12);
  return { catalog, isrc, upc };
}

export function releaseSheet(release: WireRelease) {
  return {
    catalog: release.catalog,
    isrc: release.isrc,
    upc: release.upc,
    title: release.title,
    artist: release.artist,
    featuring: release.featuring || null,
    genre: release.genre,
    language: release.language,
    explicit: release.explicit,
    releaseDate: release.releaseOn,
    cover: release.cover,
    stores: release.stores.map(storeLabel),
    splits: release.splits,
    bpm: release.board.bpm,
    key: `${release.board.key} minor`,
    lyrics: release.lyrics,
    audio: `${release.catalog}.wav`,
  };
}

export function releaseCaption(release: WireRelease) {
  const withWho = release.featuring ? ` ft. ${release.featuring}` : "";
  const stores = release.stores.map(storeLabel).join(", ");
  return `${release.artist}${withWho} — ${release.title}\n${release.releaseOn} · ${stores}\n${release.catalog} · ${release.isrc}`;
}

import { useEffect, useRef, useState } from "react";
import { bounceBoard } from "@/lib/bounce";
import type { Live } from "@/lib/engine";
import { useHouse } from "@/lib/store";
import { releaseCaption, releaseSheet, STORES, WIRE_COST, storeLabel, type StoreId, type WireRelease } from "@/lib/wire";
import { Card, Ghost, Kicker, Primary } from "@/components/house/bits";

const COVERS = [
  { src: "/media/studio.jpg", label: "The room" },
  { src: "/media/comic.jpg", label: "Comic" },
  { src: "/media/ian-seen.jpg", label: "Ian Seen" },
  { src: "/media/reina-face.jpg", label: "Reina" },
];

const GENRES = ["Hip-hop", "R&B", "Gospel", "Latin", "Alternative"];
const TONGUES = ["English", "Spanglish", "Tagalog"];

function daysOut(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function lyricsOf(draft: { sections: { name: string; lines: string[] }[] } | null) {
  if (!draft) return "";
  return draft.sections.map((section) => `${section.name}\n${section.lines.join("\n")}`).join("\n\n");
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function takeBoard(): Live {
  const state = useHouse.getState();
  return {
    bpm: state.bpm,
    swing: state.swing,
    key: state.key,
    patternId: state.patternId,
    arrangeOn: state.arrangeOn,
    arrangement: [...state.arrangement],
    patterns: structuredClone(state.patterns),
    rack: { ...state.rack },
    gains: { ...state.gains },
    mutes: { ...state.mutes },
  };
}

export function Wire() {
  const draft = useHouse((s) => s.draft);
  const patternId = useHouse((s) => s.patternId);
  const patterns = useHouse((s) => s.patterns);
  const credits = useHouse((s) => s.credits);
  const releases = useHouse((s) => s.releases);
  const sendWire = useHouse((s) => s.sendWire);
  const [title, setTitle] = useState(draft?.title || patterns[patternId]?.name || "Untitled");
  const [artist, setArtist] = useState("Melitia Marie");
  const [featuring, setFeaturing] = useState("");
  const [genre, setGenre] = useState("Hip-hop");
  const [language, setLanguage] = useState("English");
  const [explicit, setExplicit] = useState(false);
  const [cover, setCover] = useState(COVERS[0]!.src);
  const [releaseOn, setReleaseOn] = useState(daysOut(14));
  const [lyrics, setLyrics] = useState(lyricsOf(draft));
  const [stores, setStores] = useState<StoreId[]>(STORES.map((store) => store.id));
  const [cut, setCut] = useState<{ url: string; blob: Blob; board: Live } | null>(null);
  const [busy, setBusy] = useState<"cut" | string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const cutRef = useRef(cut);
  const listRef = useRef<HTMLElement>(null);
  cutRef.current = cut;

  useEffect(() => {
    return () => {
      if (cutRef.current) URL.revokeObjectURL(cutRef.current.url);
    };
  }, []);

  function toggleStore(id: StoreId) {
    setStores((current) => (current.includes(id) ? current.filter((store) => store !== id) : [...current, id]));
  }

  async function cutMaster() {
    setBusy("cut");
    setNote(null);
    try {
      const board = takeBoard();
      const blob = await bounceBoard(board, board.arrangeOn ? board.arrangement.length : 8);
      const url = URL.createObjectURL(blob);
      setCut((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return { url, blob, board };
      });
      setNote("Master is cut. Hear it, then press.");
    } catch {
      setNote("The master didn’t cut. Play the board once, then try again.");
    }
    setBusy(null);
  }

  function press() {
    if (!cut) return;
    const share = featuring.trim() ? 70 : 100;
    const splits = [{ name: artist.trim() || "Melitia Marie", share }];
    if (featuring.trim()) splits.push({ name: featuring.trim(), share: 30 });
    const result = sendWire({
      title,
      artist,
      featuring,
      genre,
      language,
      explicit,
      cover,
      releaseOn,
      stores,
      lyrics,
      splits,
      board: cut.board,
    });
    if (result === "broke") {
      setNote(`The vault is short. A press is ${WIRE_COST} IAM.`);
      return;
    }
    if (result === "empty") {
      setNote("Name the record and leave at least one store on.");
      return;
    }
    setNote("On the wire. Review clears in a moment, then the first report hits the vault.");
    requestAnimationFrame(() => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function hearRelease(release: WireRelease) {
    setBusy(release.id);
    setNote(null);
    try {
      const blob = await bounceBoard(release.board, release.board.arrangeOn ? release.board.arrangement.length : 8);
      downloadBlob(blob, `${release.catalog}.wav`);
      setNote(`Master saved · ${release.catalog}.wav`);
    } catch {
      setNote("That master wouldn’t render.");
    }
    setBusy(null);
  }

  async function copyCaption(release: WireRelease) {
    const text = releaseCaption(release);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(release.id);
    } catch {
      setNote(text);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header>
        <Kicker>Wire</Kicker>
        <h1 className="mt-2 font-display text-4xl italic">Press it out</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-mute">
          The wire cuts a real WAV from the board in the header and writes the sheet a distributor files — catalog, ISRC, splits, and the stores on the line. Pressing costs {WIRE_COST} IAM. The first report comes back to the vault, and Pulse carries the drop.
        </p>
      </header>

      <Card>
        <p className="text-xs tracking-widest text-faint uppercase">Stores on the line</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {STORES.map((store) => (
            <li key={store.id} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-raise px-3 text-sm">
              <span className="size-2 rounded-full bg-gold" aria-hidden="true" />
              {store.label}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-xs tracking-widest text-faint uppercase">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-line bg-raise px-3"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs tracking-widest text-faint uppercase">Artist</span>
            <input
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-line bg-raise px-3"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs tracking-widest text-faint uppercase">Featuring</span>
            <input
              value={featuring}
              onChange={(e) => setFeaturing(e.target.value)}
              placeholder="Optional"
              className="mt-1 h-11 w-full rounded-xl border border-line bg-raise px-3"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs tracking-widest text-faint uppercase">Street date</span>
            <input
              type="date"
              value={releaseOn}
              onChange={(e) => setReleaseOn(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-line bg-raise px-3"
            />
          </label>
        </div>

        <p className="mt-4 text-xs tracking-widest text-faint uppercase">Cover</p>
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {COVERS.map((item) => (
            <button
              key={item.src}
              type="button"
              onClick={() => setCover(item.src)}
              className={`w-16 shrink-0 overflow-hidden rounded-xl border-2 ${cover === item.src ? "border-violet" : "border-transparent"}`}
              aria-label={item.label}
            >
              <img src={item.src} alt="" className="h-20 w-full object-cover" />
            </button>
          ))}
        </div>

        <p className="mt-4 text-xs tracking-widest text-faint uppercase">Genre</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {GENRES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setGenre(item)}
              className={`h-10 rounded-full px-3 text-sm ${genre === item ? "bg-violet text-ink" : "bg-raise text-mute"}`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {TONGUES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setLanguage(item)}
              className={`h-10 rounded-full px-3 text-sm ${language === item ? "border border-gold text-gold" : "text-faint"}`}
            >
              {item}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setExplicit((on) => !on)}
            className={`h-10 rounded-full px-3 text-sm ${explicit ? "border border-gold text-gold" : "text-faint"}`}
          >
            {explicit ? "Explicit" : "Clean"}
          </button>
        </div>

        <p className="mt-4 text-xs tracking-widest text-faint uppercase">This drop</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {STORES.map((store) => {
            const on = stores.includes(store.id);
            return (
              <button
                key={store.id}
                type="button"
                onClick={() => toggleStore(store.id)}
                aria-pressed={on}
                className={`h-10 rounded-full px-3 text-sm ${on ? "bg-violet text-ink" : "bg-raise text-mute"}`}
              >
                {store.label}
              </button>
            );
          })}
        </div>

        <label className="mt-4 block text-sm">
          <span className="text-xs tracking-widest text-faint uppercase">Lyrics on the sheet</span>
          <textarea
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-xl border border-line bg-raise p-3 text-sm leading-relaxed"
          />
        </label>

        {cut && (
          <audio controls src={cut.url} className="mt-4 w-full" preload="metadata">
            Master preview
          </audio>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Ghost onClick={() => void cutMaster()} disabled={busy !== null}>
            {busy === "cut" ? "Cutting…" : cut ? "Cut again" : "Cut the master"}
          </Ghost>
          <Primary onClick={press} disabled={!cut || busy !== null || credits < WIRE_COST}>
            Press · {WIRE_COST} IAM
          </Primary>
        </div>
        <p className="mt-3 text-sm text-mute">
          Vault holds <span className="text-gold tabular-nums">{credits}</span> IAM.
          {featuring.trim() ? " Split is 70 / 30." : " You keep the whole split."}
        </p>
        {note && <p className="mt-2 text-sm text-gold">{note}</p>}
      </Card>

      <section ref={listRef} className="flex flex-col gap-3">
        <h2 className="font-display text-3xl italic">On the wire</h2>
        {releases.length === 0 && (
          <p className="text-sm text-mute">Nothing filed yet. Cut the board you hear in the header.</p>
        )}
        {releases.map((release) => (
          <Card key={release.id}>
            <div className="flex gap-3">
              <img src={release.cover} alt="" className="h-20 w-16 shrink-0 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-xs tracking-widest text-violet uppercase">
                  {release.status === "live" ? "Live" : "In review"} · {release.catalog}
                </p>
                <h3 className="truncate font-display text-2xl italic">{release.title}</h3>
                <p className="truncate text-sm text-mute">
                  {release.artist}
                  {release.featuring ? ` ft. ${release.featuring}` : ""} · {release.releaseOn}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-faint">
              {release.isrc} · {release.upc}
              {release.status === "live" ? ` · first report +${release.report} IAM` : " · stores clearing"}
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {release.stores.map((id) => (
                <li
                  key={id}
                  className={`inline-flex h-8 items-center rounded-full px-3 text-xs ${release.status === "live" ? "bg-raise text-gold" : "bg-raise text-mute"}`}
                >
                  {storeLabel(id)}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Ghost onClick={() => void hearRelease(release)} disabled={busy !== null}>
                {busy === release.id ? "Rendering…" : "Download master"}
              </Ghost>
              <Ghost
                onClick={() =>
                  downloadBlob(
                    new Blob([JSON.stringify(releaseSheet(release), null, 2)], { type: "application/json" }),
                    `${release.catalog}-sheet.json`,
                  )
                }
              >
                Release sheet
              </Ghost>
              <Ghost onClick={() => void copyCaption(release)}>{copied === release.id ? "Copied" : "Copy caption"}</Ghost>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}

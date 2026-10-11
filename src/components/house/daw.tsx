import { useEffect, useState } from "react";
import { getEngine } from "@/lib/engine";
import { PRESET_LIST, VOICE_LABEL, type DrumKey, type Voice } from "@/lib/patterns";
import { publishLive, useHouse } from "@/lib/store";

const TRACKS: { voice: Voice; name: string; color: string }[] = [
  { voice: "lead", name: "Vocals", color: "#c8ff00" },
  { voice: "bass", name: "808", color: "#00f0ff" },
  { voice: "kick", name: "Kick", color: "#ff2d55" },
  { voice: "hat", name: "Hats", color: "#888888" },
  { voice: "snare", name: "Snare", color: "#f5f5f5" },
];

const PADS: Record<string, { label: string; drum?: DrumKey; tone?: "bass" | "lead" }[]> = {
  trap: [
    { label: "Kick", drum: "kick" },
    { label: "Snare", drum: "snare" },
    { label: "Hat", drum: "hat" },
    { label: "Clap", drum: "perc" },
    { label: "808", tone: "bass" },
    { label: "Perc", drum: "perc" },
    { label: "Rim", drum: "perc" },
    { label: "Open Hat", drum: "hat" },
  ],
  hyphy: [
    { label: "Kick", drum: "kick" },
    { label: "Clap", drum: "perc" },
    { label: "Hat", drum: "hat" },
    { label: "Tom", drum: "perc" },
    { label: "Bass", tone: "bass" },
    { label: "Perc", drum: "perc" },
    { label: "Snap", drum: "perc" },
    { label: "Open Hat", drum: "hat" },
  ],
  drill: [
    { label: "Kick", drum: "kick" },
    { label: "Snare", drum: "snare" },
    { label: "Hat", drum: "hat" },
    { label: "Rim", drum: "perc" },
    { label: "808", tone: "bass" },
    { label: "Perc", drum: "perc" },
    { label: "Click", drum: "hat" },
    { label: "Open Hat", drum: "hat" },
  ],
  night: [
    { label: "Kick", drum: "kick" },
    { label: "Snare", drum: "snare" },
    { label: "Hat", drum: "hat" },
    { label: "Clap", drum: "perc" },
    { label: "Sub", tone: "bass" },
    { label: "Keys", tone: "lead" },
    { label: "Perc", drum: "perc" },
    { label: "Open Hat", drum: "hat" },
  ],
};

const TAGS = ["Dark", "808", "Female vocal", "Night drive", "Hyphy", "Trap"];
const MOVES = [
  "Tightening low end on 808…",
  "Lifting vocal air…",
  "Reducing mud at 250 Hz…",
  "Widening the melody…",
  "Balancing hat transients…",
];

type Gen = "beat" | "song" | "stems";

function transport(action: "stop" | "play" | "rec", rec: boolean, setRec: (v: boolean) => void) {
  const eng = getEngine();
  const house = useHouse.getState();
  if (action === "rec") {
    setRec(!rec);
    if (!house.playing) {
      publishLive();
      eng.play((step) => useHouse.getState().setStep(step));
      house.setPlaying(true);
    }
    return;
  }
  if (action === "stop" || house.playing) {
    eng.stop();
    house.setPlaying(false);
    setRec(false);
    return;
  }
  publishLive();
  eng.play((step) => useHouse.getState().setStep(step));
  house.setPlaying(true);
}

export function Daw() {
  const playing = useHouse((s) => s.playing);
  const step = useHouse((s) => s.step);
  const bpm = useHouse((s) => s.bpm);
  const arrangement = useHouse((s) => s.arrangement);
  const patterns = useHouse((s) => s.patterns);
  const mutes = useHouse((s) => s.mutes);
  const rack = useHouse((s) => s.rack);
  const toggleMute = useHouse((s) => s.toggleMute);
  const patchRack = useHouse((s) => s.patchRack);
  const cycleSlot = useHouse((s) => s.cycleSlot);
  const hear = useHouse((s) => s.hear);
  const toggleDrum = useHouse((s) => s.toggleDrum);
  const setTone = useHouse((s) => s.setTone);
  const setArrange = useHouse((s) => s.setArrange);
  const addPost = useHouse((s) => s.addPost);

  const [track, setTrack] = useState<Voice>("lead");
  const [genre, setGenre] = useState<keyof typeof PADS>("trap");
  const [hit, setHit] = useState<string | null>(null);
  const [gen, setGen] = useState<Gen>("song");
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("Balancing vocal presence…");
  const [genNote, setGenNote] = useState("");
  const [padNote, setPadNote] = useState("Trap pads");
  const [rec, setRec] = useState(false);
  const [dropped, setDropped] = useState<{ label: string; left: number; tone: string }[]>([]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setStatus(MOVES[Math.floor(Math.random() * MOVES.length)] ?? MOVES[0]!);
    }, 3200);
    return () => window.clearInterval(id);
  }, [playing]);

  function place(label: string, tone: string) {
    setDropped((list) => [...list.slice(-6), { label, left: 8 + Math.round(Math.random() * 55), tone }]);
  }

  function tapPad(label: string, drum?: DrumKey, tone?: "bass" | "lead") {
    setHit(label);
    window.setTimeout(() => setHit((cur) => (cur === label ? null : cur)), 150);
    const index = step >= 0 ? step : 0;
    if (drum) toggleDrum(drum, index);
    if (tone) setTone(tone, index, tone === "bass" ? 0 : 7);
    setPadNote(`${label} hit`);
    setStatus("Beat hit placed — tightening the rhythm…");
    if (rec) place(label, "#00f0ff");
  }

  function generate() {
    const words = (prompt.trim() || "dark night drive 808s").split(/\s+/).slice(0, 3).join(" ");
    const low = `${prompt} ${words}`.toLowerCase();
    const pick = low.includes("hyphy") ? PRESET_LIST[1] : low.includes("drill") ? PRESET_LIST[2] : PRESET_LIST.find((item) => low.includes(item.name.toLowerCase())) ?? (gen === "beat" ? PRESET_LIST[1] : PRESET_LIST[0]);
    const id = pick?.id ?? "candle";
    setGenNote(`Generating ${gen}…`);
    setStatus("Preparing the stem…");
    window.setTimeout(() => {
      hear(id);
      if (gen === "stems") setArrange(true);
      const label = gen === "beat" ? "Beat" : gen === "stems" ? "Stems" : "Song";
      place(`${label} · ${words}`, gen === "beat" ? "#00f0ff" : "#c8ff00");
      setGenNote(`${label} dropped. Mix and master are on it.`);
      setStatus("Balancing the new generation into the session…");
    }, 500);
  }

  const meter = rec ? 48 : playing ? 74 : 62;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-panel px-3 py-2">
        <button type="button" onClick={() => transport("stop", rec, setRec)} className="h-11 rounded-lg border border-line px-3 text-sm">
          Stop
        </button>
        <button type="button" onClick={() => transport("play", rec, setRec)} className="h-11 rounded-lg border border-violet px-3 text-sm text-violet">
          {playing ? "Playing" : "Play"}
        </button>
        <button type="button" onClick={() => transport("rec", rec, setRec)} className={`h-11 rounded-lg border px-3 text-sm ${rec ? "border-gold text-gold" : "border-line text-mute"}`}>
          {rec ? "Recording" : "Record"}
        </button>
        <span className="text-xs text-faint tabular-nums">{step >= 0 ? `${Math.floor(step / 4) + 1}.${(step % 4) + 1}.1` : "1.1.1"}</span>
        <span className="ml-auto text-sm text-violet tabular-nums">{bpm} BPM</span>
        <span className="text-xs text-faint">AI mix on</span>
      </div>

      <div className="grid gap-3 xl:grid-cols-[12rem_minmax(0,1fr)_17rem]">
        <div className="rounded-2xl border border-line bg-panel p-2">
          {TRACKS.map((item) => (
            <button
              key={item.voice}
              type="button"
              onClick={() => setTrack(item.voice)}
              className={`mb-1 flex h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-sm ${track === item.voice ? "border border-violet bg-raise" : ""}`}
            >
              <span className="h-7 w-1.5 rounded-full" style={{ background: item.color }} />
              <span className="flex-1">{item.name}</span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute(item.voice);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") toggleMute(item.voice);
                }}
                className="text-xs text-faint"
              >
                {mutes[item.voice] ? "M" : VOICE_LABEL[item.voice]}
              </span>
            </button>
          ))}
          <p className="px-2 pt-1 text-xs text-faint">Master rides the rack.</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-line bg-ink">
          <div className="flex h-7 items-center gap-8 border-b border-line px-3 text-xs text-faint">
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </div>
          <div className="relative min-h-56">
            {arrangement.map((id, i) => (
              <button
                key={`${id}-${i}`}
                type="button"
                onClick={() => cycleSlot(i)}
                className="absolute flex h-10 items-center rounded px-2 text-xs font-medium text-ink"
                style={{
                  top: 16 + (i % 4) * 48,
                  left: `${6 + i * 11}%`,
                  width: "18%",
                  background: i % 3 === 0 ? "#c8ff00" : i % 3 === 1 ? "#00f0ff" : "#ff2d55",
                  color: i % 3 === 2 ? "#fff" : "#000",
                }}
              >
                {patterns[id]?.name ?? id}
              </button>
            ))}
            {dropped.map((clip, i) => (
              <span
                key={`${clip.label}-${i}`}
                className="absolute flex h-8 items-center rounded px-2 text-xs font-medium text-ink"
                style={{ top: 12 + (i % 3) * 36, left: `${clip.left}%`, background: clip.tone }}
              >
                {clip.label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <section className="rounded-2xl border border-line bg-panel p-3">
            <h3 className="text-sm text-gold">Generate</h3>
            <div className="mt-2 flex gap-1">
              {(["beat", "song", "stems"] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setGen(kind)}
                  className={`h-9 flex-1 rounded-full text-xs capitalize ${gen === kind ? "bg-violet text-ink" : "border border-line text-mute"}`}
                >
                  {kind === "song" ? "Full song" : kind}
                </button>
              ))}
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Dark LA night drive, heavy 808s, female rap"
              className="mt-2 h-16 w-full resize-none rounded-lg border border-line bg-ink px-2 py-2 text-sm"
            />
            <div className="mt-2 flex flex-wrap gap-1">
              {TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setPrompt((value) => (value.includes(tag) ? value : `${value} ${tag}`.trim()))}
                  className="h-8 rounded-full border border-line px-2 text-xs text-mute"
                >
                  {tag}
                </button>
              ))}
            </div>
            <button type="button" onClick={generate} className="mt-2 h-11 w-full rounded-full bg-gold text-sm font-medium text-ink">
              Generate and drop
            </button>
            {genNote && <p className="mt-2 text-xs text-gold">{genNote}</p>}
          </section>
          <section className="rounded-2xl border border-line bg-panel p-3">
            <h3 className="text-sm text-violet">AI mix · live</h3>
            <p className="mt-1 text-xs leading-relaxed text-mute">{status}</p>
            <p className="mt-2 text-xs text-faint">
              {track === "lead" ? "Vocal" : TRACKS.find((item) => item.voice === track)?.name} shelf {rack.low > 0 ? "+" : ""}
              {rack.low.toFixed(0)} dB
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-raise">
              <div className="h-full bg-violet" style={{ width: `${meter}%` }} />
            </div>
            <p className="mt-1 text-xs text-faint">Master {playing ? "moving" : "holding"} · peak under zero</p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-mute">
              <label>
                Low
                <input type="range" min={-12} max={12} value={rack.low} onChange={(e) => patchRack({ low: Number(e.target.value) })} className="w-full" />
              </label>
              <label>
                Mid
                <input type="range" min={-12} max={12} value={rack.mid} onChange={(e) => patchRack({ mid: Number(e.target.value) })} className="w-full" />
              </label>
              <label>
                High
                <input type="range" min={-12} max={12} value={rack.high} onChange={(e) => patchRack({ high: Number(e.target.value) })} className="w-full" />
              </label>
            </div>
          </section>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-panel p-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm text-violet">Beat maker</h3>
          {(Object.keys(PADS) as (keyof typeof PADS)[]).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setGenre(name);
                setPadNote(`${name} pads loaded`);
              }}
              className={`h-8 rounded-full px-3 text-xs capitalize ${genre === name ? "bg-violet text-ink" : "border border-line text-mute"}`}
            >
              {name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setPadNote("AI finishing the pattern…");
              hear("afters");
              setArrange(true);
              place("AI pattern", "#00f0ff");
              setStatus("AI finished the beat — mixing now…");
              setPadNote("Pattern dropped. Mix is balancing.");
            }}
            className="h-8 rounded-full border border-line px-3 text-xs text-mute"
          >
            Finish it
          </button>
          <button
            type="button"
            onClick={() => {
              addPost("New beat from the pads. Tap to use it.");
              setPadNote("Beat is on the wall.");
            }}
            className="h-8 rounded-full border border-line px-3 text-xs text-mute"
          >
            Share
          </button>
          <span className="text-xs text-faint">{padNote}</span>
        </div>
        <div className="mt-3 grid max-w-md grid-cols-4 gap-2">
          {PADS[genre].map((pad) => (
            <button
              key={pad.label}
              type="button"
              onClick={() => tapPad(pad.label, pad.drum, pad.tone)}
              className={`flex aspect-square items-center justify-center rounded-lg border text-xs font-medium ${hit === pad.label ? "border-violet bg-violet text-ink" : "border-line bg-raise text-bone"}`}
            >
              {pad.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

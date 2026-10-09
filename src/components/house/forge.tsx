import { useState } from "react";
import { houseSketch, type Draft } from "@/lib/catalog";
import { KEYS, type HouseKey } from "@/lib/patterns";
import { askReina } from "@/lib/reina.functions";
import { sayError } from "@/lib/say";
import { publishLive, useHouse } from "@/lib/store";
import { getEngine } from "@/lib/engine";
import { Card, Ghost, Kicker, Primary } from "@/components/house/bits";

const POCKETS = [
  { id: "candle", label: "Candle" },
  { id: "afters", label: "Afters" },
  { id: "concrete", label: "Concrete" },
  { id: "hymn", label: "Hymn" },
];

const MOODS = ["night", "devotion", "street", "tender", "crown"];

function stripFence(text: string) {
  return text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
}

function asDraft(text: string, fallback: Draft): Draft {
  try {
    const parsed = JSON.parse(stripFence(text)) as Partial<Draft>;
    const pocket = POCKETS.some((p) => p.id === parsed.pocket) ? String(parsed.pocket) : fallback.pocket;
    const key = (KEYS as readonly string[]).includes(String(parsed.key)) ? (parsed.key as HouseKey) : fallback.key;
    const sections = Array.isArray(parsed.sections)
      ? parsed.sections
          .filter((s) => s && typeof s.name === "string" && Array.isArray(s.lines))
          .map((s) => ({ name: String(s.name), lines: s.lines.map((l) => String(l)).slice(0, 4) }))
      : [];
    if (!sections.length) return { ...fallback, note: text.slice(0, 280), source: "house" };
    return {
      title: String(parsed.title || fallback.title).slice(0, 80),
      bpm: Math.max(68, Math.min(160, Number(parsed.bpm) || fallback.bpm)),
      key,
      pocket,
      note: String(parsed.note || "Reina laid the form.").slice(0, 240),
      source: "reina",
      sections,
    };
  } catch {
    return { ...fallback, note: "Reina answered in prose, so the house kept a sketch.", source: "house" };
  }
}

async function ask(mode: "forge" | "section", text: string, context: string) {
  try {
    return await askReina({ data: { mode, text, context } });
  } catch (err) {
    return { ok: false as const, error: sayError(err).fix };
  }
}

export function Forge() {
  const draft = useHouse((s) => s.draft);
  const locks = useHouse((s) => s.locks);
  const setDraft = useHouse((s) => s.setDraft);
  const setLocks = useHouse((s) => s.setLocks);
  const setRoom = useHouse((s) => s.setRoom);
  const [idea, setIdea] = useState("A night drive where the hook refuses to beg.");
  const [pocket, setPocket] = useState("candle");
  const [mood, setMood] = useState("night");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function smith() {
    const sketch = houseSketch(idea, pocket, mood);
    setBusy(true);
    setStatus(null);
    const res = await ask("forge", idea, `mood ${mood}, pocket ${pocket}`);
    const next = res.ok ? asDraft(res.text, sketch) : { ...sketch, note: `${sketch.note} ${res.error}` };
    setDraft(next);
    setBusy(false);
    setStatus(next.source === "reina" ? "Reina wrote the form." : next.note);
  }

  async function rewrite(index: number) {
    if (!draft) return;
    const section = draft.sections[index];
    if (!section) return;
    setBusy(true);
    const res = await ask(
      "section",
      section.lines.join(" / "),
      `${draft.title}. Section ${section.name}. Mood ${mood}.`,
    );
    let lines = section.lines;
    if (res.ok) {
      try {
        const parsed = JSON.parse(stripFence(res.text)) as { lines?: string[] };
        if (Array.isArray(parsed.lines) && parsed.lines.length) lines = parsed.lines.map((l) => String(l)).slice(0, 4);
      } catch {
        setStatus("That pass didn’t come back as lines.");
      }
    } else {
      lines = houseSketch(idea, pocket, mood).sections[index]?.lines ?? lines;
      setStatus(res.error);
    }
    const sections = draft.sections.map((s, i) => (i === index ? { ...s, lines } : s));
    setDraft({ ...draft, sections, source: res.ok ? "reina" : draft.source });
    setBusy(false);
  }

  function editLine(si: number, li: number, value: string) {
    if (!draft) return;
    const sections = draft.sections.map((s, i) =>
      i === si ? { ...s, lines: s.lines.map((line, j) => (j === li ? value : line)) } : s,
    );
    setDraft({ ...draft, sections });
  }

  function dropOnBoard() {
    if (!draft) return;
    setDraft(draft);
    publishLive();
    getEngine().play((step) => useHouse.getState().setStep(step));
    useHouse.getState().setPlaying(true);
    setRoom("studio");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header>
        <Kicker>Forge</Kicker>
        <h1 className="mt-2 font-display text-4xl italic">Write it in pieces</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-mute">
          Not one button and a mystery file. You get a form, editable lines, a pocket you can hear, and locks so the next pass doesn’t throw the drums away.
        </p>
      </header>

      <Card>
        <label className="block text-xs tracking-widest text-faint uppercase" htmlFor="idea">
          The idea
        </label>
        <textarea
          id="idea"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          rows={3}
          className="mt-2 w-full rounded-xl border border-line bg-raise p-3 text-sm leading-relaxed"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {POCKETS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPocket(item.id)}
              className={`h-10 rounded-full px-3 text-sm ${pocket === item.id ? "bg-violet text-ink" : "bg-raise text-mute"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {MOODS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMood(item)}
              className={`h-10 rounded-full px-3 text-sm capitalize ${mood === item ? "border border-gold text-gold" : "text-faint"}`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Lock
            on={locks.drums}
            label="Lock drums"
            onClick={() => setLocks({ drums: !locks.drums })}
          />
          <Lock on={locks.bass} label="Lock 808" onClick={() => setLocks({ bass: !locks.bass })} />
          <Lock on={locks.lead} label="Lock lead" onClick={() => setLocks({ lead: !locks.lead })} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Primary onClick={() => void smith()} disabled={busy}>
            {busy ? "Writing…" : "Lay the form"}
          </Primary>
          {draft && (
            <Ghost onClick={dropOnBoard} disabled={busy}>
              Drop it on the board
            </Ghost>
          )}
          {draft && (
            <Ghost onClick={() => setRoom("wire")} disabled={busy}>
              Send it on the wire
            </Ghost>
          )}
        </div>
        {status && <p className="mt-3 text-sm text-gold">{status}</p>}
      </Card>

      {draft && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs tracking-widest text-violet uppercase">{draft.source === "reina" ? "Reina" : "House sketch"}</p>
              <h2 className="font-display text-3xl italic">{draft.title}</h2>
            </div>
            <p className="text-sm text-mute">
              {draft.key} minor · <span className="tabular-nums">{draft.bpm}</span> · {draft.pocket}
            </p>
          </div>
          <p className="text-sm text-mute">{draft.note}</p>
          {draft.sections.map((section, si) => (
            <Card key={`${section.name}-${si}`}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="font-display text-2xl italic">{section.name}</h3>
                <button type="button" onClick={() => void rewrite(si)} disabled={busy} className="h-10 text-sm text-violet disabled:opacity-40">
                  Rewrite
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {section.lines.map((line, li) => (
                  <input
                    key={li}
                    value={line}
                    onChange={(e) => editLine(si, li, e.target.value)}
                    className="h-11 rounded-xl border border-line bg-raise px-3 text-sm"
                  />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Lock({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`h-10 rounded-full px-3 text-xs ${on ? "bg-gold text-ink" : "border border-line text-mute"}`}
    >
      {label}
    </button>
  );
}

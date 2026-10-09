import { useState } from "react";
import { HOOK_QUIZ, LESSONS, RELEASE_ORDER } from "@/lib/catalog";
import { getEngine } from "@/lib/engine";
import { useHouse } from "@/lib/store";
import { Card, Ghost, Kicker, Primary } from "@/components/house/bits";

export function Academy() {
  const cleared = useHouse((s) => s.cleared);
  const clearLesson = useHouse((s) => s.clearLesson);
  const setReina = useHouse((s) => s.setReina);
  const pushMessage = useHouse((s) => s.pushMessage);
  const done = LESSONS.filter((l) => cleared[l.id]).length;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header>
        <Kicker>Academy</Kicker>
        <h1 className="mt-2 font-display text-4xl italic">Learn the room</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-mute">
          Five drills. Each one you keep pays 18 IAM once. {done} of {LESSONS.length} held.
        </p>
      </header>
      <PocketDrill cleared={!!cleared.pocket} onClear={() => clearLesson("pocket")} />
      <HookDrill cleared={!!cleared.hook} onClear={() => clearLesson("hook")} />
      <BassDrill cleared={!!cleared.eight} onClear={() => clearLesson("eight")} />
      <RackDrill cleared={!!cleared.rack} onClear={() => clearLesson("rack")} />
      <ReleaseDrill cleared={!!cleared.release} onClear={() => clearLesson("release")} />
      <Card>
        <h2 className="font-display text-2xl italic">Ask the house</h2>
        <p className="mt-2 text-sm text-mute">Reina will walk the part you’re stuck on. She won’t do the drill for you.</p>
        <div className="mt-3">
          <Ghost
            onClick={() => {
              pushMessage("you", "Walk me through why the snare belongs on 2 and 4.");
              setReina(true);
            }}
          >
            Ask Reina about the pocket
          </Ghost>
        </div>
      </Card>
    </div>
  );
}

function Mark({ ok, text }: { ok: boolean; text: string }) {
  return <p className={`mt-3 text-sm ${ok ? "text-gold" : "text-mute"}`}>{text}</p>;
}

function PocketDrill({ cleared, onClear }: { cleared: boolean; onClear: () => void }) {
  const [snare, setSnare] = useState<boolean[]>(Array.from({ length: 16 }, () => false));
  const [msg, setMsg] = useState<string | null>(null);
  const right = snare.every((on, i) => on === (i === 4 || i === 12));

  return (
    <Card>
      <p className="text-xs tracking-widest text-violet uppercase">{LESSONS[0]!.kicker}</p>
      <h2 className="mt-1 font-display text-2xl italic">{LESSONS[0]!.title}</h2>
      <p className="mt-2 text-sm text-mute">In a bar of sixteen, the backbeat is steps 5 and 13 — musicians call them the 2 and the 4. Light only those.</p>
      <div className="mt-3 flex gap-1 overflow-x-auto">
        {snare.map((on, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={on}
            onClick={() => setSnare((row) => row.map((v, idx) => (idx === i ? !v : v)))}
            className={`size-9 shrink-0 rounded-md text-xs ${on ? "bg-violet text-ink" : "bg-raise text-faint"}`}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <Primary
          onClick={() => {
            if (right) {
              setMsg("That’s the backbeat. Keep it.");
              onClear();
            } else setMsg("Not yet. Only the 2 and the 4. Clear the rest.");
          }}
        >
          {cleared ? "Kept" : "Check the pocket"}
        </Primary>
      </div>
      {msg && <Mark ok={right || cleared} text={msg} />}
    </Card>
  );
}

function HookDrill({ cleared, onClear }: { cleared: boolean; onClear: () => void }) {
  const [pick, setPick] = useState<string | null>(null);
  const chosen = HOOK_QUIZ.options.find((o) => o.id === pick);
  return (
    <Card>
      <p className="text-xs tracking-widest text-violet uppercase">{LESSONS[1]!.kicker}</p>
      <h2 className="mt-1 font-display text-2xl italic">{LESSONS[1]!.title}</h2>
      <p className="mt-2 text-sm text-mute">{HOOK_QUIZ.prompt}</p>
      <div className="mt-3 flex flex-col gap-2">
        {HOOK_QUIZ.options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => {
              setPick(opt.id);
              if (opt.right) onClear();
            }}
            className={`rounded-xl border px-3 py-3 text-left text-sm ${pick === opt.id ? "border-violet" : "border-line"}`}
          >
            {opt.text}
          </button>
        ))}
      </div>
      {chosen && <Mark ok={chosen.right} text={chosen.right ? HOOK_QUIZ.why : "That one explains. A hook doesn’t explain."} />}
      {cleared && !chosen && <Mark ok text="Kept." />}
    </Card>
  );
}

function BassDrill({ cleared, onClear }: { cleared: boolean; onClear: () => void }) {
  const hear = useHouse((s) => s.hear);
  const [pick, setPick] = useState<string | null>(null);
  return (
    <Card>
      <p className="text-xs tracking-widest text-violet uppercase">{LESSONS[2]!.kicker}</p>
      <h2 className="mt-1 font-display text-2xl italic">{LESSONS[2]!.title}</h2>
      <p className="mt-2 text-sm text-mute">
        Play both. The verse 808 should move and then sit, not chatter on every step. Candle holds. Afters talks too much for this lesson.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Ghost
          onClick={() => {
            hear("candle");
            const eng = getEngine();
            if (!eng.playing) eng.preview("candle");
          }}
        >
          Hear Candle
        </Ghost>
        <Ghost
          onClick={() => {
            hear("afters");
            const eng = getEngine();
            if (!eng.playing) eng.preview("afters");
          }}
        >
          Hear Afters
        </Ghost>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Primary
          onClick={() => {
            setPick("candle");
            onClear();
          }}
        >
          Candle holds the verse
        </Primary>
        <Ghost
          onClick={() => {
            setPick("afters");
          }}
        >
          Afters holds the verse
        </Ghost>
      </div>
      {pick && (
        <Mark
          ok={pick === "candle"}
          text={
            pick === "candle"
              ? "Right. Long notes, then air. The busy one is a hook machine, not the verse."
              : "Afters is a hook. The verse wants the longer candle line."
          }
        />
      )}
      {cleared && !pick && <Mark ok text="Kept." />}
    </Card>
  );
}

function RackDrill({ cleared, onClear }: { cleared: boolean; onClear: () => void }) {
  const high = useHouse((s) => s.rack.high);
  const patchRack = useHouse((s) => s.patchRack);
  const ok = high <= -3;
  return (
    <Card>
      <p className="text-xs tracking-widest text-violet uppercase">{LESSONS[3]!.kicker}</p>
      <h2 className="mt-1 font-display text-2xl italic">{LESSONS[3]!.title}</h2>
      <p className="mt-2 text-sm text-mute">
        Pull the high shelf to −3 or lower. Hats should sit in the room, not razor the ear. Play the board and listen while you move it.
      </p>
      <label className="mt-3 block text-xs text-mute">
        High shelf <span className="text-gold tabular-nums">{high.toFixed(0)}</span>
        <input type="range" min={-12} max={12} value={high} onChange={(e) => patchRack({ high: Number(e.target.value) })} />
      </label>
      <div className="mt-3">
        <Primary
          onClick={() => {
            if (ok) onClear();
          }}
          disabled={!ok && !cleared}
        >
          {cleared ? "Kept" : "Keep this shelf"}
        </Primary>
      </div>
      {!ok && <Mark ok={false} text="Still bright. Take it down." />}
      {ok && <Mark ok text="Dark enough. The air is still there because you didn’t kill the mids." />}
    </Card>
  );
}

function ReleaseDrill({ cleared, onClear }: { cleared: boolean; onClear: () => void }) {
  const [order, setOrder] = useState<string[]>([]);
  const done = order.join("|") === RELEASE_ORDER.join("|");
  return (
    <Card>
      <p className="text-xs tracking-widest text-violet uppercase">{LESSONS[4]!.kicker}</p>
      <h2 className="mt-1 font-display text-2xl italic">{LESSONS[4]!.title}</h2>
      <p className="mt-2 text-sm text-mute">Tap them from the smallest rights to the one that takes the beat off the wall.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {RELEASE_ORDER.map((name) => (
          <button
            key={name}
            type="button"
            disabled={order.includes(name)}
            onClick={() => setOrder((o) => [...o, name])}
            className="h-11 rounded-full border border-line px-4 text-sm disabled:opacity-30"
          >
            {name}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-bone">{order.length ? order.join(" → ") : "Nothing picked."}</p>
      <div className="mt-3 flex gap-2">
        <Primary
          onClick={() => {
            if (done) onClear();
          }}
          disabled={!done && !cleared}
        >
          {cleared ? "Kept" : "Lock the order"}
        </Primary>
        <Ghost onClick={() => setOrder([])}>Reset</Ghost>
      </div>
      {order.length === 3 && !done && <Mark ok={false} text="Exclusive is last. Lease is first. Stems sit in the middle." />}
      {done && <Mark ok text="Lease, then stems, then exclusive. You just described the market." />}
    </Card>
  );
}

import { useEffect, useMemo, useState } from "react";
import { BOUTS, CALLS, FREESTYLE_WORDS, RANKS } from "@/lib/catalog";
import { getEngine } from "@/lib/engine";
import { publishLive, useHouse } from "@/lib/store";
import { Card, Ghost, Kicker, Primary } from "@/components/house/bits";

type Pit = "floor" | "clock" | "echo";

function ride(pattern: string) {
  useHouse.getState().hear(pattern);
  publishLive();
  const eng = getEngine();
  if (!eng.playing) {
    eng.play((step) => useHouse.getState().setStep(step));
    useHouse.getState().setPlaying(true);
  }
}

export function Cipher() {
  const scores = useHouse((s) => s.scores);
  const votes = useHouse((s) => s.votes);
  const vote = useHouse((s) => s.vote);
  const award = useHouse((s) => s.award);
  const addPost = useHouse((s) => s.addPost);
  const setRoom = useHouse((s) => s.setRoom);
  const [pit, setPit] = useState<Pit>("floor");
  const [bout, setBout] = useState(0);
  const [call, setCall] = useState(0);
  const [bars, setBars] = useState("");
  const [answer, setAnswer] = useState("");
  const [left, setLeft] = useState(30);
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [deal, setDeal] = useState(0);

  const words = useMemo(() => {
    const copy = [...FREESTYLE_WORDS];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy.slice(0, 4);
  }, [deal]);

  useEffect(() => {
    if (!running || left <= 0) return;
    const id = window.setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => window.clearTimeout(id);
  }, [running, left]);

  const fight = BOUTS[bout % BOUTS.length]!;
  const echo = CALLS[call % CALLS.length]!;
  const picked = votes?.[fight.id];
  const board = [...RANKS].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));
  const landed = words.filter((word) => bars.toLowerCase().includes(word.toLowerCase()));

  function pinClock() {
    const clean = bars.trim();
    if (!clean) return;
    const key = `clock-${[...words].sort().join("-")}`;
    const hit = landed.length >= 3;
    const paid = hit ? award(key, "Clock", 12) : "paid";
    addPost(clean);
    setRunning(false);
    setNote(hit && paid === "ok" ? "Three words landed. 12 IAM, and the bar is on the wall." : "On the wall. Land three of the words for the purse.");
    setRoom("pulse");
  }

  function sendEcho() {
    const clean = answer.trim();
    if (!clean) return;
    const hit = clean.toLowerCase().includes(echo.land.toLowerCase());
    if (!hit) {
      setNote(`Land on “${echo.land}”. Fit it in the bar, don’t tack it on.`);
      return;
    }
    const paid = award(`echo-${echo.id}`, "Echo", 8);
    addPost(`${echo.line} ${clean}`);
    setAnswer("");
    setNote(paid === "ok" ? "That answers. 8 IAM." : "That answers. This call already paid.");
    setCall((n) => (n + 1) % CALLS.length);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header>
        <Kicker>Cipher</Kicker>
        <h1 className="mt-2 font-display text-4xl italic">Three rooms</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-mute">
          The floor is a vote. The clock is thirty seconds and four words. The echo throws you a line and a word you have to land.
        </p>
      </header>

      <div className="flex gap-1" role="tablist" aria-label="Battle rooms">
        {(
          [
            ["floor", "Floor"],
            ["clock", "Clock"],
            ["echo", "Echo"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={pit === id}
            onClick={() => {
              setPit(id);
              setNote(null);
            }}
            className={`h-9 rounded-full px-3 text-sm ${pit === id ? "bg-violet text-ink" : "text-mute"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {note && <p className="text-sm text-gold">{note}</p>}

      {pit === "floor" && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs tracking-widest text-faint uppercase">
              Bout {(bout % BOUTS.length) + 1} of {BOUTS.length}
            </p>
            <button
              type="button"
              onClick={() => {
                setBout((n) => (n + 1) % BOUTS.length);
                setNote(null);
              }}
              className="h-9 text-sm text-violet"
            >
              Next fight
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <BattleCard
              name={fight.left.name}
              lines={fight.left.lines}
              picked={picked === "left"}
              disabled={!!picked}
              onPlay={() => ride(fight.left.pattern)}
              onVote={() => {
                vote(fight.id, "left", fight.left.id);
                setNote(`${fight.left.name} takes the floor. 6 IAM for stepping in.`);
              }}
            />
            <BattleCard
              name={fight.right.name}
              lines={fight.right.lines}
              picked={picked === "right"}
              disabled={!!picked}
              onPlay={() => ride(fight.right.pattern)}
              onVote={() => {
                vote(fight.id, "right", fight.right.id);
                setNote(`${fight.right.name} takes the floor. 6 IAM for stepping in.`);
              }}
            />
          </div>
        </>
      )}

      {pit === "clock" && (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl italic">Thirty seconds</h2>
            <p className={`font-display text-4xl tabular-nums ${running && left <= 10 ? "text-gold" : "text-bone"}`}>{running ? left : "30"}</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {words.map((word) => {
              const hit = bars.toLowerCase().includes(word.toLowerCase());
              return (
                <span key={word} className={`rounded-full border px-3 py-2 text-sm ${hit ? "border-gold text-gold" : "border-line text-violet"}`}>
                  {word}
                </span>
              );
            })}
          </div>
          <textarea
            value={bars}
            onChange={(e) => setBars(e.target.value)}
            rows={4}
            placeholder="Use the words. Don’t explain them."
            className="mt-3 w-full rounded-xl border border-line bg-raise p-3 text-sm leading-relaxed"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {!running ? (
              <Primary
                onClick={() => {
                  setNote(null);
                  setLeft(30);
                  setRunning(true);
                }}
              >
                Start the clock
              </Primary>
            ) : (
              <Ghost
                onClick={() => {
                  setRunning(false);
                  setLeft(30);
                }}
              >
                Stop
              </Ghost>
            )}
            <Ghost onClick={() => setDeal((n) => n + 1)}>New words</Ghost>
            <Ghost disabled={!bars.trim()} onClick={pinClock}>
              Pin it
            </Ghost>
          </div>
          <p className="mt-3 text-xs text-faint">{landed.length} of 4 in the bar. Three pays the first time for that set.</p>
        </Card>
      )}

      {pit === "echo" && (
        <Card>
          <p className="text-xs tracking-widest text-faint uppercase">{echo.from}</p>
          <p className="mt-2 font-display text-2xl italic leading-snug">
            {echo.line} <span className="text-gold">{echo.land}</span>…
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Ghost onClick={() => ride(echo.pattern)}>Hear the pocket</Ghost>
            <Ghost
              onClick={() => {
                setCall((n) => (n + 1) % CALLS.length);
                setAnswer("");
                setNote(null);
              }}
            >
              Another call
            </Ghost>
          </div>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={3}
            placeholder={`Finish it. The word “${echo.land}” has to be in the bar.`}
            className="mt-3 w-full rounded-xl border border-line bg-raise p-3 text-sm leading-relaxed"
          />
          <div className="mt-3">
            <Primary onClick={sendEcho}>Answer</Primary>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 font-display text-2xl italic">The board</h2>
        <ol className="flex flex-col">
          {board.map((row, i) => (
            <li key={row.id} className="flex items-center gap-3 border-t border-line py-3 first:border-t-0">
              <span className="w-6 text-sm text-faint tabular-nums">{i + 1}</span>
              <span className="flex-1">
                <span className="block text-sm">{row.name}</span>
                <span className="block text-xs text-faint">{row.city}</span>
              </span>
              <span className="text-sm text-gold tabular-nums">{scores[row.id] ?? row.score}</span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

function BattleCard({
  name,
  lines,
  onPlay,
  onVote,
  picked,
  disabled,
}: {
  name: string;
  lines: string[];
  onPlay: () => void;
  onVote: () => void;
  picked: boolean;
  disabled: boolean;
}) {
  return (
    <Card>
      <p className="text-xs tracking-widest text-faint uppercase">{name}</p>
      {lines.map((line) => (
        <p key={line} className="mt-2 font-display text-xl italic leading-snug">
          {line}
        </p>
      ))}
      <div className="mt-4 flex gap-2">
        <Ghost onClick={onPlay}>Hear it</Ghost>
        <Primary onClick={onVote} disabled={disabled && !picked}>
          {picked ? "Your pick" : "This one"}
        </Primary>
      </div>
    </Card>
  );
}

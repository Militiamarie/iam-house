import { useEffect, useMemo, useState } from "react";
import { BATTLE, FREESTYLE_WORDS, RANKS } from "@/lib/catalog";
import { getEngine } from "@/lib/engine";
import { publishLive, useHouse } from "@/lib/store";
import { Card, Ghost, Kicker, Primary } from "@/components/house/bits";

export function Cipher() {
  const scores = useHouse((s) => s.scores);
  const vote = useHouse((s) => s.vote);
  const battleVote = useHouse((s) => s.battleVote);
  const hear = useHouse((s) => s.hear);
  const addPost = useHouse((s) => s.addPost);
  const addScore = useHouse((s) => s.addScore);
  const setRoom = useHouse((s) => s.setRoom);
  const [bars, setBars] = useState("");
  const [left, setLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [posted, setPosted] = useState(false);
  const words = useMemo(() => {
    const copy = [...FREESTYLE_WORDS];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy.slice(0, 4);
  }, [running]);

  useEffect(() => {
    if (!running) return;
    if (left <= 0) return;
    const id = window.setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => window.clearTimeout(id);
  }, [running, left]);

  const board = [...RANKS].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));

  function playSide(pattern: string) {
    hear(pattern);
    publishLive();
    const eng = getEngine();
    if (!eng.playing) {
      eng.play((step) => useHouse.getState().setStep(step));
      useHouse.getState().setPlaying(true);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header>
        <Kicker>Cipher</Kicker>
        <h1 className="mt-2 font-display text-4xl italic">Bars, then the board</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-mute">
          Hear both pockets, pick the line that sits, then take a timed pass of your own. The ranking lives in this house.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        <BattleCard
          name={BATTLE.left.name}
          lines={BATTLE.left.lines}
          picked={battleVote === "left"}
          disabled={!!battleVote}
          onPlay={() => playSide(BATTLE.left.pattern)}
          onVote={() => vote("left")}
        />
        <BattleCard
          name={BATTLE.right.name}
          lines={BATTLE.right.lines}
          picked={battleVote === "right"}
          disabled={!!battleVote}
          onPlay={() => playSide(BATTLE.right.pattern)}
          onVote={() => vote("right")}
        />
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl italic">Thirty seconds</h2>
          <p className="font-display text-4xl text-gold tabular-nums">{running ? left : "30"}</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(running ? words : ["candle", "block", "crown", "pocket"]).map((word) => (
            <span key={word} className="rounded-full border border-line px-3 py-2 text-sm text-violet">
              {word}
            </span>
          ))}
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
                setPosted(false);
                setLeft(30);
                setRunning(true);
              }}
            >
              Start the clock
            </Primary>
          ) : (
            <Ghost onClick={() => setRunning(false)}>Stop</Ghost>
          )}
          <Ghost
            disabled={!bars.trim() || posted}
            onClick={() => {
              addPost(bars.trim());
              addScore("you", 5);
              setPosted(true);
              setRunning(false);
              setRoom("pulse");
            }}
          >
            Pin it to the wall
          </Ghost>
        </div>
      </Card>

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

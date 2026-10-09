import { useEffect, useState } from "react";
import { CHAINS } from "@/lib/patterns";
import { getEngine } from "@/lib/engine";
import { useHouse } from "@/lib/store";
import { Card, Ghost, Kicker, Primary } from "@/components/house/bits";

export function Booth() {
  const patchRack = useHouse((s) => s.patchRack);
  const rack = useHouse((s) => s.rack);
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pitch, setPitch] = useState("—");
  const [level, setLevel] = useState(0);
  const [preset, setPreset] = useState("velvet");

  useEffect(() => {
    if (!armed) return;
    let frame = 0;
    const loop = () => {
      const voice = getEngine().readVoice();
      setPitch(voice.name);
      setLevel(Math.min(1, voice.rms * 4));
      getEngine().feedRelay(voice.rms, voice.hz);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [armed]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header>
        <Kicker>Booth</Kicker>
        <h1 className="mt-2 font-display text-4xl italic">The voice</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-mute">
          The rack is the same one on the board. Pick a chain, open the mic, and hear the room change the take. Relay locks you to the key you set in the studio.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {CHAINS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setPreset(item.id);
              patchRack(item.rack);
            }}
            className={`rounded-2xl border p-4 text-left ${preset === item.id ? "border-violet bg-raise" : "border-line bg-panel"}`}
          >
            <span className="font-display text-2xl italic">{item.name}</span>
            <span className="mt-1 block text-sm text-mute">{item.note}</span>
          </button>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs tracking-widest text-faint uppercase">Pitch</p>
            <p className="font-display text-6xl italic tabular-nums">{pitch}</p>
            <div className="mt-3 h-1.5 w-40 overflow-hidden rounded-full bg-line">
              <div className="h-full bg-violet" style={{ width: `${Math.round(level * 100)}%` }} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Primary
              onClick={() => {
                void (async () => {
                  const err = await getEngine().armMic();
                  setError(err);
                  setArmed(!err);
                })();
              }}
            >
              {armed ? "Mic live" : "Open mic"}
            </Primary>
            <Ghost
              onClick={() => {
                getEngine().disarmMic();
                setArmed(false);
              }}
            >
              Close mic
            </Ghost>
            <Ghost
              onClick={() => {
                void getEngine().resume().then(() => getEngine().guide());
              }}
            >
              Hear the scale
            </Ghost>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-gold">{error}</p>}
        <p className="mt-4 text-xs leading-relaxed text-faint">
          {rack.relay
            ? "Relay is on. Sing and a tuned saw follows the nearest house note."
            : "Relay is off. You’re hearing yourself through the shelves, press, echo, and room."}
        </p>
      </Card>

      <Card className="overflow-hidden p-0">
        <video
          src="/media/booth-tape.mp4"
          poster="/media/tape-poster.jpg"
          controls
          playsInline
          className="max-h-[32rem] w-full bg-ink object-cover"
        />
        <div className="p-4">
          <p className="text-xs tracking-widest text-violet uppercase">Session tape</p>
          <p className="mt-1 font-display text-2xl italic">Bleed the Block</p>
          <p className="mt-1 text-sm text-mute">Produced in-house. Gangsta in the veins. Blood, sweat, and the name.</p>
        </div>
      </Card>
    </div>
  );
}

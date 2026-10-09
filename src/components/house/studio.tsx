import type { ReactNode } from "react";
import { useState } from "react";
import { CHAINS, DRUMS, KEYS, PRESET_LIST, STEPS, VOICES, VOICE_LABEL, degreeName, type DrumKey, type Voice } from "@/lib/patterns";
import { useHouse } from "@/lib/store";
import { Card, Kicker } from "@/components/house/bits";

export function Studio() {
  const patternId = useHouse((s) => s.patternId);
  const patterns = useHouse((s) => s.patterns);
  const step = useHouse((s) => s.step);
  const bpm = useHouse((s) => s.bpm);
  const swing = useHouse((s) => s.swing);
  const key = useHouse((s) => s.key);
  const arrangeOn = useHouse((s) => s.arrangeOn);
  const arrangement = useHouse((s) => s.arrangement);
  const rack = useHouse((s) => s.rack);
  const gains = useHouse((s) => s.gains);
  const mutes = useHouse((s) => s.mutes);
  const sessionWith = useHouse((s) => s.sessionWith);
  const hear = useHouse((s) => s.hear);
  const setBpm = useHouse((s) => s.setBpm);
  const setSwing = useHouse((s) => s.setSwing);
  const setKey = useHouse((s) => s.setKey);
  const setArrange = useHouse((s) => s.setArrange);
  const cycleSlot = useHouse((s) => s.cycleSlot);
  const toggleDrum = useHouse((s) => s.toggleDrum);
  const setTone = useHouse((s) => s.setTone);
  const setGain = useHouse((s) => s.setGain);
  const toggleMute = useHouse((s) => s.toggleMute);
  const patchRack = useHouse((s) => s.patchRack);
  const [chain, setChain] = useState<string | null>(null);

  const pat = patterns[patternId] ?? PRESET_LIST[0]!;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <header className="max-w-2xl">
        <Kicker>Studio</Kicker>
        <h1 className="mt-2 font-display text-4xl italic">The board</h1>
        <p className="mt-2 text-sm leading-relaxed text-mute">
          The kick has a click, the 808 has weight, the hook is a filtered saw, and the rim is wood. Chains on the rack are starting points. Press play in the bar above.
        </p>
        <button
          type="button"
          onClick={() => useHouse.getState().setRoom("wire")}
          className="mt-3 h-11 text-sm text-violet"
        >
          Send this board on the wire
        </button>
        {sessionWith && <p className="mt-2 text-sm text-gold">Session open with {sessionWith}.</p>}
      </header>

      <div className="flex flex-wrap gap-2">
        {PRESET_LIST.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => hear(item.id)}
            className={`h-11 rounded-full px-4 text-sm ${item.id === patternId ? "bg-violet text-ink" : "border border-line bg-raise text-bone"}`}
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
        <div className="flex flex-col gap-4">
          <Card>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-2xl italic">{pat.name}</h2>
              <p className="text-xs text-faint">{pat.vibe}</p>
            </div>
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <Field label="Tempo">
                <input type="range" min={68} max={160} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
                <span className="text-xs text-gold tabular-nums">{bpm}</span>
              </Field>
              <Field label="Swing">
                <input
                  type="range"
                  min={0}
                  max={60}
                  value={Math.round(swing * 100)}
                  onChange={(e) => setSwing(Number(e.target.value) / 100)}
                />
                <span className="text-xs text-gold tabular-nums">{Math.round(swing * 100)}</span>
              </Field>
              <Field label="Key">
                <div className="flex gap-1">
                  {KEYS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKey(k)}
                      className={`h-10 flex-1 rounded-lg text-sm ${k === key ? "bg-violet text-ink" : "bg-raise text-mute"}`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
            <DrumGrid drums={pat.drums} step={step} onToggle={toggleDrum} />
          </Card>
          <Card>
            <h2 className="mb-3 font-display text-2xl italic">808</h2>
            <Roll
              rows={pat.bass}
              step={step}
              keyName={key}
              onPick={(index, degree) => setTone("bass", index, degree)}
            />
          </Card>
          <Card>
            <h2 className="mb-3 font-display text-2xl italic">Lead</h2>
            <Roll
              rows={pat.lead}
              step={step}
              keyName={key}
              onPick={(index, degree) => setTone("lead", index, degree)}
            />
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-2xl italic">Song</h2>
              <button
                type="button"
                onClick={() => setArrange(!arrangeOn)}
                className={`h-10 rounded-full px-3 text-xs ${arrangeOn ? "bg-violet text-ink" : "border border-line text-mute"}`}
              >
                {arrangeOn ? "Arrangement on" : "Loop the kit"}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {arrangement.map((id, i) => (
                <button
                  key={`${id}-${i}`}
                  type="button"
                  onClick={() => cycleSlot(i)}
                  className="h-14 rounded-xl border border-line bg-raise text-xs text-bone"
                >
                  <span className="block text-faint tabular-nums">{i + 1}</span>
                  {patterns[id]?.name ?? id}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-faint">Tap a bar to cycle the kit. Turn the arrangement on to walk all eight.</p>
          </Card>
          <Card>
            <h2 className="mb-3 font-display text-2xl italic">Rack</h2>
            <div className="flex flex-wrap gap-2">
              {CHAINS.filter((item) => !item.rack.relay).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setChain(item.id);
                    patchRack(item.rack);
                  }}
                  className={`h-9 rounded-full px-3 text-sm ${chain === item.id ? "bg-violet text-ink" : "border border-line text-mute"}`}
                >
                  {item.name}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-faint">
              {CHAINS.find((item) => item.id === chain)?.note ?? "The sliders left the chain. This mix is yours."}
            </p>
            <div className="mt-4">
            <RackSlider label="Low shelf" min={-12} max={12} value={rack.low} onChange={(low) => { setChain(null); patchRack({ low }); }} />
            <RackSlider label="Mid" min={-12} max={12} value={rack.mid} onChange={(mid) => { setChain(null); patchRack({ mid }); }} />
            <RackSlider label="High shelf" min={-12} max={12} value={rack.high} onChange={(high) => { setChain(null); patchRack({ high }); }} />
            <RackSlider label="Press" min={0} max={100} value={Math.round(rack.press * 100)} onChange={(n) => { setChain(null); patchRack({ press: n / 100 }); }} />
            <RackSlider label="Echo" min={0} max={100} value={Math.round(rack.echo * 100)} onChange={(n) => { setChain(null); patchRack({ echo: n / 100 }); }} />
            <RackSlider label="Room" min={0} max={100} value={Math.round(rack.room * 100)} onChange={(n) => { setChain(null); patchRack({ room: n / 100 }); }} />
            <RackSlider label="Grit" min={0} max={100} value={Math.round(rack.grit * 100)} onChange={(n) => { setChain(null); patchRack({ grit: n / 100 }); }} />
            <RackSlider
              label="Echo time"
              min={5}
              max={70}
              value={Math.round(rack.delayTime * 100)}
              onChange={(n) => { setChain(null); patchRack({ delayTime: n / 100 }); }}
            />
            </div>
          </Card>
          <Card>
            <h2 className="mb-3 font-display text-2xl italic">Mixer</h2>
            <div className="flex flex-col gap-3">
              {VOICES.map((voice) => (
                <div key={voice} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleMute(voice)}
                    className={`h-10 w-16 shrink-0 rounded-lg text-xs ${mutes[voice] ? "bg-gold text-ink" : "bg-raise text-mute"}`}
                  >
                    {mutes[voice] ? "Muted" : VOICE_LABEL[voice]}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(gains[voice] * 100)}
                    aria-label={`${VOICE_LABEL[voice]} level`}
                    onChange={(e) => setGain(voice, Number(e.target.value) / 100)}
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs tracking-widest text-faint uppercase">{label}</span>
      {children}
    </label>
  );
}

function DrumGrid({
  drums,
  step,
  onToggle,
}: {
  drums: Record<DrumKey, boolean[]>;
  step: number;
  onToggle: (drum: DrumKey, index: number) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max flex-col gap-1.5">
        {DRUMS.map((drum) => (
          <div key={drum} className="flex items-center gap-1">
            <span className="w-12 shrink-0 text-xs text-mute">{VOICE_LABEL[drum]}</span>
            {drums[drum].map((on, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${drum} step ${i + 1}`}
                aria-pressed={on}
                onClick={() => onToggle(drum, i)}
                className={`size-8 rounded-md sm:size-9 ${on ? "bg-violet" : "bg-raise"} ${step === i ? "ring-2 ring-gold ring-inset" : ""} ${i % 4 === 0 && !on ? "bg-line" : ""}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Roll({
  rows,
  step,
  keyName,
  onPick,
}: {
  rows: (number | null)[];
  step: number;
  keyName: (typeof KEYS)[number];
  onPick: (index: number, degree: number | null) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max flex-col gap-1">
        {Array.from({ length: 8 }, (_, row) => {
          const degree = 7 - row;
          return (
            <div key={degree} className="flex items-center gap-1">
              <span className="w-12 shrink-0 text-xs text-faint">{degreeName(keyName, degree)}</span>
              {Array.from({ length: STEPS }, (_, i) => {
                const on = rows[i] === degree;
                return (
                  <button
                    key={i}
                    type="button"
                    aria-label={`${degreeName(keyName, degree)} step ${i + 1}`}
                    aria-pressed={on}
                    onClick={() => onPick(i, on ? null : degree)}
                    className={`size-8 rounded-md sm:size-9 ${on ? "bg-gold" : "bg-raise"} ${step === i ? "ring-2 ring-violet ring-inset" : ""}`}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RackSlider({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="mb-2 block">
      <span className="flex justify-between text-xs text-mute">
        {label}
        <span className="tabular-nums text-gold">{value}</span>
      </span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

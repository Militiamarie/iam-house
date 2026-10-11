import { useEffect, useRef, useState } from "react";
import { getEngine } from "@/lib/engine";
import {
  CHAINS,
  DRUMS,
  KEYS,
  PRESET_LIST,
  STEPS,
  VOICES,
  VOICE_LABEL,
  degreeName,
  type DrumKey,
  type Voice,
} from "@/lib/patterns";
import { publishLive, useHouse } from "@/lib/store";

const BAR = 76;

const LANES: { id: string; name: string; color: string; voice?: Voice }[] = [
  { id: "song", name: "Song", color: "#64d2ff" },
  { id: "vocal", name: "Vocal", color: "#ff375f" },
  { id: "audio", name: "Audio", color: "#ff9f0a" },
  { id: "kick", name: "Kick", color: "#ffd60a", voice: "kick" },
  { id: "snare", name: "Snare", color: "#ffe066", voice: "snare" },
  { id: "hat", name: "Hats", color: "#f2f2f7", voice: "hat" },
  { id: "perc", name: "Perc", color: "#ff9f0a", voice: "perc" },
  { id: "bass", name: "808", color: "#bf5af2", voice: "bass" },
  { id: "lead", name: "Keys", color: "#30d158", voice: "lead" },
];

function pressPlay() {
  const eng = getEngine();
  const house = useHouse.getState();
  if (house.playing) {
    eng.stop();
    house.setPlaying(false);
    return;
  }
  publishLive();
  eng.play((step) => useHouse.getState().setStep(step));
  house.setPlaying(true);
}

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
  const playing = useHouse((s) => s.playing);
  const hear = useHouse((s) => s.hear);
  const setBpm = useHouse((s) => s.setBpm);
  const setSwing = useHouse((s) => s.setSwing);
  const setKey = useHouse((s) => s.setKey);
  const setArrange = useHouse((s) => s.setArrange);
  const toggleDrum = useHouse((s) => s.toggleDrum);
  const setTone = useHouse((s) => s.setTone);
  const setGain = useHouse((s) => s.setGain);
  const toggleMute = useHouse((s) => s.toggleMute);
  const patchRack = useHouse((s) => s.patchRack);

  const [pos, setPos] = useState({ bar: 0, step: -1 });
  const [now, setNow] = useState(0);
  const [clips, setClips] = useState<{ id: string; name: string; trackId: string; startBar: number; duration: number; mute: boolean }[]>([]);
  const [tab, setTab] = useState<"steps" | "piano" | "mixer" | "mix">("steps");
  const [laneId, setLaneId] = useState("vocal");
  const [note, setNote] = useState<string | null>(null);
  const [rec, setRec] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [chain, setChain] = useState<string | null>(null);
  const songRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);

  const pat = patterns[patternId] ?? PRESET_LIST[0]!;
  const barDur = (60 / Math.max(40, bpm)) * 4;
  const viewBars = Math.max(
    16,
    ...clips.map((clip) => Math.ceil(clip.startBar + clip.duration / barDur)),
  );

  useEffect(() => {
    const eng = getEngine();
    const offPos = eng.onPosition((nextStep, bar) => setPos({ bar, step: nextStep }));
    const offClips = eng.onClips(() => {
      setClips(eng.listClips());
      setRec(eng.recording);
    });
    setClips(eng.listClips());
    return () => {
      offPos();
      offClips();
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      setNow(getEngine().seconds);
      setRec(getEngine().recording);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  async function pressRecord() {
    const eng = getEngine();
    if (eng.recording) {
      await eng.endTake("Vocal");
      setRec(false);
      setNote("Take is on the Vocal track.");
      return;
    }
    if (!useHouse.getState().playing) pressPlay();
    const err = await eng.beginTake();
    setRec(eng.recording);
    setMicOn(eng.armed);
    setNote(err ?? "Recording onto Vocal. Hit record again to keep the take.");
  }

  async function connectMic() {
    const eng = getEngine();
    if (eng.armed) {
      eng.disarmMic();
      setMicOn(false);
      setNote("Mic disconnected.");
      return;
    }
    const err = await eng.armMic();
    setMicOn(eng.armed);
    setNote(err ?? "Mic connected. Record will use it.");
  }

  async function onFile(file: File | undefined, trackId: string) {
    if (!file) return;
    const err = await getEngine().importAudio(file, trackId, trackId === "song" ? 0 : pos.bar);
    setNote(err ?? `${file.name} is on ${trackId === "song" ? "Song" : "Audio"}. Press play.`);
  }

  const shownBar = pos.step < 0 ? 1 : pos.bar + 1;
  const shownBeat = pos.step < 0 ? 1 : Math.floor((pos.step % 16) / 4) + 1;
  const shownTick = pos.step < 0 ? 1 : (pos.step % 4) + 1;
  const playhead = playing ? (now / barDur) * BAR : 0;

  return (
    <div className="studio-desk -mx-4 -mt-5 flex h-[calc(100dvh-11.5rem)] min-h-[32rem] flex-col overflow-hidden bg-[#141416] text-[#f2f2f4] md:-mx-8 md:h-[calc(100dvh-6.25rem)]">
      <div className="sticky top-0 z-20 flex min-h-12 shrink-0 flex-wrap items-center gap-1.5 border-b border-black bg-[#2c2c2e] px-2 py-1">
        <DawButton onClick={() => { getEngine().stop(); useHouse.getState().setPlaying(false); setNow(0); }}>
          Stop
        </DawButton>
        <DawButton onClick={pressPlay} hot={playing}>
          {playing ? "Playing" : "Play"}
        </DawButton>
        <button
          type="button"
          onClick={() => void pressRecord()}
          className={`h-8 rounded-full px-3 text-xs font-semibold ${rec ? "bg-[#ff2d2d] text-white" : "bg-[#3a3a3e] text-[#ff453a]"}`}
        >
          {rec ? "Recording" : "Record"}
        </button>
        <button
          type="button"
          onClick={() => setArrange(!arrangeOn)}
          className={`h-8 rounded px-2 text-xs ${arrangeOn ? "bg-[#0a84ff] text-white" : "bg-[#3a3a3e] text-[#d1d1d6]"}`}
        >
          Loop
        </button>
        <span className="ml-1 font-mono text-sm tabular-nums text-[#f2f2f4]">
          {shownBar}.{shownBeat}.{shownTick}
        </span>
        <label className="ml-1 flex items-center gap-1 text-[11px] text-[#aeaeb2]">
          BPM
          <input
            type="number"
            min={60}
            max={180}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value) || bpm)}
            className="h-8 w-14 rounded bg-[#1c1c1e] px-1 text-center text-sm text-white"
          />
        </label>
        <label className="hidden items-center gap-1 text-[11px] text-[#aeaeb2] sm:flex">
          Key
          <select
            value={key}
            onChange={(e) => setKey(e.target.value as (typeof KEYS)[number])}
            className="h-8 rounded bg-[#1c1c1e] px-1 text-sm text-white"
          >
            {KEYS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="hidden items-center gap-1 text-[11px] text-[#aeaeb2] md:flex">
          Kit
          <select
            value={patternId}
            onChange={(e) => hear(e.target.value)}
            className="h-8 max-w-28 rounded bg-[#1c1c1e] px-1 text-sm text-white"
          >
            {PRESET_LIST.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex items-center gap-1">
          <DawButton onClick={() => void connectMic()} hot={micOn}>
            {micOn ? "Mic on" : "Mic"}
          </DawButton>
          <DawButton onClick={() => audioRef.current?.click()}>Upload audio</DawButton>
          <DawButton onClick={() => songRef.current?.click()}>Upload song</DawButton>
        </div>
        <input
          ref={audioRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            void onFile(e.target.files?.[0], "audio");
            e.target.value = "";
          }}
        />
        <input
          ref={songRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            void onFile(e.target.files?.[0], "song");
            e.target.value = "";
          }}
        />
      </div>
      {note && <p className="shrink-0 bg-[#1c1c1e] px-3 py-1 text-xs text-[#ffd60a]">{note}</p>}

      <div className="flex min-h-0 flex-1">
        <div className="w-40 shrink-0 border-r border-black bg-[#1c1c1e] sm:w-48">
          <div className="h-7 border-b border-black" />
          {LANES.map((lane) => {
            const audioClips = clips.filter((clip) => clip.trackId === lane.id);
            const muted = lane.voice ? mutes[lane.voice] : audioClips.length > 0 && audioClips.every((clip) => clip.mute);
            return (
              <button
                key={lane.id}
                type="button"
                onClick={() => setLaneId(lane.id)}
                className={`flex h-11 w-full items-center gap-1 border-b border-black px-2 text-left ${laneId === lane.id ? "bg-[#3a3a3e]" : ""}`}
              >
                <span className="h-6 w-1 rounded-sm" style={{ background: lane.color }} />
                <span className="min-w-0 flex-1 truncate text-xs">{lane.name}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (lane.voice) toggleMute(lane.voice);
                    else getEngine().setTrackMute(lane.id, !muted);
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.stopPropagation();
                    if (lane.voice) toggleMute(lane.voice);
                    else getEngine().setTrackMute(lane.id, !muted);
                  }}
                  className={`rounded px-1 text-[10px] ${muted ? "bg-[#ff9f0a] text-black" : "bg-[#2c2c2e] text-[#aeaeb2]"}`}
                >
                  M
                </span>
              </button>
            );
          })}
        </div>

        <div className="min-w-0 flex-1 overflow-auto bg-[#121214]">
          <div style={{ width: viewBars * BAR }}>
            <div className="sticky top-0 z-10 flex h-7 border-b border-black bg-[#1c1c1e] text-[10px] text-[#8e8e93]">
              {Array.from({ length: viewBars }, (_, i) => (
                <span key={i} className="shrink-0 border-r border-[#2c2c2e] pl-1" style={{ width: BAR }}>
                  {i + 1}
                </span>
              ))}
            </div>
            <div className="relative">
              {LANES.map((lane) => (
                <div key={lane.id} className="relative h-11 border-b border-[#222226]">
                  {lane.voice &&
                    (arrangeOn ? arrangement : Array.from({ length: 8 }, () => patternId)).map((id, i) => (
                      <div
                        key={`${id}-${i}`}
                        className="absolute top-1.5 flex h-8 items-center overflow-hidden rounded-sm px-1 text-[11px] font-medium text-black"
                        style={{ left: i * BAR + 2, width: BAR - 4, background: lane.color }}
                      >
                        {patterns[id]?.name ?? pat.name}
                      </div>
                    ))}
                  {clips
                    .filter((clip) => clip.trackId === lane.id)
                    .map((clip) => (
                      <div
                        key={clip.id}
                        className="absolute top-1.5 flex h-8 items-center gap-1 overflow-hidden rounded-sm px-1 text-[11px] font-medium text-black"
                        style={{
                          left: clip.startBar * BAR + 2,
                          width: Math.max(48, (clip.duration / barDur) * BAR - 4),
                          background: lane.color,
                          opacity: clip.mute ? 0.4 : 1,
                        }}
                      >
                        <span className="truncate">{clip.name}</span>
                        <button
                          type="button"
                          onClick={() => getEngine().removeClip(clip.id)}
                          className="ml-auto text-black/70"
                          aria-label="Remove clip"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                </div>
              ))}
              <div className="pointer-events-none absolute top-0 bottom-0 w-px bg-[#ff453a]" style={{ left: playhead }} />
            </div>
          </div>
        </div>
      </div>

      <div className="h-44 shrink-0 border-t border-black bg-[#1c1c1e] md:h-56">
        <div className="flex h-9 items-center gap-1 border-b border-black px-2">
          {(
            [
              ["steps", "Steps"],
              ["piano", "Piano"],
              ["mixer", "Mixer"],
              ["mix", "Mix"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`h-7 rounded px-3 text-xs ${tab === id ? "bg-[#3a3a3e] text-white" : "text-[#8e8e93]"}`}
            >
              {label}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-[#8e8e93]">{pat.name}</span>
        </div>
        <div className="h-[calc(100%-2.25rem)] overflow-auto p-3">
          {tab === "steps" && <DrumGrid drums={pat.drums} step={step} onToggle={toggleDrum} />}
          {tab === "piano" && (
            <div className="flex flex-col gap-3">
              <p className="text-[11px] text-[#8e8e93]">808</p>
              <Roll rows={pat.bass} step={step} keyName={key} onPick={(index, degree) => setTone("bass", index, degree)} />
              <p className="text-[11px] text-[#8e8e93]">Keys</p>
              <Roll rows={pat.lead} step={step} keyName={key} onPick={(index, degree) => setTone("lead", index, degree)} />
            </div>
          )}
          {tab === "mixer" && (
            <div className="flex h-full items-end gap-3 overflow-x-auto">
              {VOICES.map((voice) => (
                <label key={voice} className="flex w-14 shrink-0 flex-col items-center gap-1 text-[10px] text-[#aeaeb2]">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(gains[voice] * 100)}
                    aria-label={`${VOICE_LABEL[voice]} level`}
                    onChange={(e) => setGain(voice, Number(e.target.value) / 100)}
                    className="h-24"
                  />
                  <button
                    type="button"
                    onClick={() => toggleMute(voice)}
                    className={`h-6 w-full rounded text-[10px] ${mutes[voice] ? "bg-[#ff9f0a] text-black" : "bg-[#2c2c2e]"}`}
                  >
                    {mutes[voice] ? "M" : VOICE_LABEL[voice]}
                  </button>
                </label>
              ))}
              <label className="ml-4 flex w-36 flex-col gap-1 text-[11px] text-[#aeaeb2]">
                Swing
                <input
                  type="range"
                  min={0}
                  max={60}
                  value={Math.round(swing * 100)}
                  onChange={(e) => setSwing(Number(e.target.value) / 100)}
                />
              </label>
            </div>
          )}
          {tab === "mix" && (
            <div>
              <div className="mb-3 flex flex-wrap gap-1">
                {CHAINS.filter((item) => !item.rack.relay).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setChain(item.id);
                      patchRack(item.rack);
                    }}
                    className={`h-7 rounded px-2 text-xs ${chain === item.id ? "bg-[#0a84ff] text-white" : "bg-[#2c2c2e] text-[#d1d1d6]"}`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <RackSlider label="Low" min={-12} max={12} value={rack.low} onChange={(low) => { setChain(null); patchRack({ low }); }} />
                <RackSlider label="Mid" min={-12} max={12} value={rack.mid} onChange={(mid) => { setChain(null); patchRack({ mid }); }} />
                <RackSlider label="High" min={-12} max={12} value={rack.high} onChange={(high) => { setChain(null); patchRack({ high }); }} />
                <RackSlider label="Compress" min={0} max={100} value={Math.round(rack.press * 100)} onChange={(n) => { setChain(null); patchRack({ press: n / 100 }); }} />
                <RackSlider label="Delay" min={0} max={100} value={Math.round(rack.echo * 100)} onChange={(n) => { setChain(null); patchRack({ echo: n / 100 }); }} />
                <RackSlider label="Reverb" min={0} max={100} value={Math.round(rack.room * 100)} onChange={(n) => { setChain(null); patchRack({ room: n / 100 }); }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DawButton({ children, onClick, hot = false }: { children: string; onClick: () => void; hot?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 rounded px-2.5 text-xs font-medium ${hot ? "bg-[#30d158] text-black" : "bg-[#3a3a3e] text-[#f2f2f4]"}`}
    >
      {children}
    </button>
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
      <div className="flex min-w-max flex-col gap-1">
        {DRUMS.map((drum) => (
          <div key={drum} className="flex items-center gap-1">
            <span className="w-10 shrink-0 text-[10px] text-[#aeaeb2]">{VOICE_LABEL[drum]}</span>
            {drums[drum].map((on, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${drum} step ${i + 1}`}
                aria-pressed={on}
                onClick={() => onToggle(drum, i)}
                className={`size-7 rounded-sm ${on ? "bg-[#ffd60a]" : "bg-[#2c2c2e]"} ${step === i ? "outline outline-1 outline-[#ff453a]" : ""}`}
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
      <div className="flex min-w-max flex-col gap-0.5">
        {Array.from({ length: 8 }, (_, row) => {
          const degree = 7 - row;
          return (
            <div key={degree} className="flex items-center gap-1">
              <span className="w-8 shrink-0 text-[10px] text-[#8e8e93]">{degreeName(keyName, degree)}</span>
              {Array.from({ length: STEPS }, (_, i) => {
                const on = rows[i] === degree;
                return (
                  <button
                    key={i}
                    type="button"
                    aria-label={`${degreeName(keyName, degree)} step ${i + 1}`}
                    aria-pressed={on}
                    onClick={() => onPick(i, on ? null : degree)}
                    className={`size-6 rounded-sm ${on ? "bg-[#bf5af2]" : "bg-[#2c2c2e]"} ${step === i ? "outline outline-1 outline-[#ff453a]" : ""}`}
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
    <label className="block text-[11px] text-[#aeaeb2]">
      <span className="flex justify-between">
        {label}
        <span className="tabular-nums text-white">{value}</span>
      </span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    </label>
  );
}

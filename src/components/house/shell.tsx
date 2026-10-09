import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import {
  AudioLines,
  Crown,
  Disc3,
  GraduationCap,
  Handshake,
  Image as ImageIcon,
  Mic,
  Radio,
  RadioTower,
  Sparkles,
  Square,
  Swords,
  Wallet,
  Play,
} from "lucide-react";
import { getEngine } from "@/lib/engine";
import { publishLive, useHouse, type RoomId } from "@/lib/store";
import { Pulse } from "@/components/house/pulse";
import { Studio } from "@/components/house/studio";
import { Booth } from "@/components/house/booth";
import { Forge } from "@/components/house/forge";
import { Cipher } from "@/components/house/cipher";
import { Market } from "@/components/house/market";
import { Gallery } from "@/components/house/gallery";
import { Wire } from "@/components/house/wire";
import { Vault } from "@/components/house/vault";
import { LinkRoom } from "@/components/house/link-room";
import { Academy } from "@/components/house/academy";
import { ReinaPanel } from "@/components/house/reina";
import { InstallSheet } from "@/components/house/install";
import { RoomGuard } from "@/lib/error-component";

const ROOMS: { id: RoomId; label: string; icon: typeof Radio; hint: string }[] = [
  { id: "pulse", label: "Pulse", icon: Radio, hint: "Feed, stories, tapes" },
  { id: "studio", label: "Studio", icon: AudioLines, hint: "Board, rack, song" },
  { id: "booth", label: "Booth", icon: Mic, hint: "Voice through the rack" },
  { id: "forge", label: "Forge", icon: Sparkles, hint: "Write it in sections" },
  { id: "cipher", label: "Cipher", icon: Swords, hint: "Floor, clock, echo" },
  { id: "market", label: "Market", icon: Disc3, hint: "License a pocket" },
  { id: "gallery", label: "Gallery", icon: ImageIcon, hint: "House prints" },
  { id: "wire", label: "Wire", icon: RadioTower, hint: "Press it out" },
  { id: "vault", label: "Vault", icon: Wallet, hint: "What the house made" },
  { id: "link", label: "Link", icon: Handshake, hint: "Find a collab" },
  { id: "academy", label: "Academy", icon: GraduationCap, hint: "Learn the room" },
];

const MOBILE: RoomId[] = ["pulse", "studio", "forge", "link"];

function toggleTransport() {
  const eng = getEngine();
  const playing = useHouse.getState().playing;
  if (playing) {
    eng.stop();
    useHouse.getState().setPlaying(false);
    return;
  }
  publishLive();
  eng.play((step) => useHouse.getState().setStep(step));
  useHouse.getState().setPlaying(true);
}

export function Shell() {
  const room = useHouse((s) => s.room);
  const setRoom = useHouse((s) => s.setRoom);
  const credits = useHouse((s) => s.credits);
  const playing = useHouse((s) => s.playing);
  const step = useHouse((s) => s.step);
  const patternId = useHouse((s) => s.patternId);
  const patterns = useHouse((s) => s.patterns);
  const bpm = useHouse((s) => s.bpm);
  const moreOpen = useHouse((s) => s.moreOpen);
  const setMore = useHouse((s) => s.setMore);
  const setReina = useHouse((s) => s.setReina);
  const reinaOpen = useHouse((s) => s.reinaOpen);
  const releases = useHouse((s) => s.releases);
  const [installOpen, setInstallOpen] = useState(false);

  useEffect(() => {
    publishLive();
    const finish = () => {
      publishLive();
      useHouse.getState().foldSeeds();
    };
    const unsub = useHouse.persist.onFinishHydration(finish);
    void useHouse.persist.rehydrate();
    if (useHouse.persist.hasHydrated()) finish();
    return () => unsub();
  }, []);

  useEffect(() => {
    const timers: number[] = [];
    for (const release of releases) {
      if (release.status !== "review") continue;
      const wait = Math.max(0, release.pressedAt + 2400 - Date.now());
      timers.push(window.setTimeout(() => useHouse.getState().settleWire(release.id), wait));
    }
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [releases]);

  const current = ROOMS.find((r) => r.id === room) ?? ROOMS[0]!;
  const patName = patterns[patternId]?.name ?? "Candle";

  return (
    <div className="house-safe flex h-dvh overflow-hidden bg-ink text-bone">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-line bg-panel md:flex">
        <button
          type="button"
          onClick={() => setRoom("pulse")}
          className="px-5 pt-6 pb-4 text-left"
        >
          <span className="neon font-display text-3xl text-violet italic">I AM</span>
          <span className="mt-1 block text-xs tracking-widest text-mute uppercase">The house</span>
        </button>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-6">
          {ROOMS.map((item) => {
            const Icon = item.icon;
            const on = item.id === room;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setRoom(item.id)}
                className={`flex h-11 items-center gap-3 rounded-xl px-3 text-left text-sm ${on ? "bg-raise text-bone" : "text-mute hover:text-bone"}`}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="overflow-hidden px-3 pb-5">
          <SignedOut>
            <Link to="/login" className="flex h-11 items-center justify-center rounded-full bg-violet text-sm font-medium text-ink">
              Enter
            </Link>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
          <button
            type="button"
            onClick={() => setInstallOpen(true)}
            className="mt-2 flex h-11 w-full items-center justify-center rounded-full border border-line text-sm text-bone"
          >
            Install
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-20 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-ink/90 px-4 backdrop-blur-md md:px-6">
          <button type="button" onClick={() => setRoom("pulse")} className="neon font-display text-2xl text-violet italic md:hidden">
            I AM
          </button>
          <SignedOut>
            <Link to="/login" className="inline-flex h-11 items-center rounded-full bg-violet px-3 text-sm font-medium text-ink md:hidden">
              Enter
            </Link>
          </SignedOut>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-bone">{current.label}</p>
            <p className="truncate text-xs text-faint">
              {patName} · <span className="tabular-nums">{bpm}</span>
            </p>
          </div>
          <div className="hidden items-center gap-1 lg:flex" aria-hidden="true">
            {Array.from({ length: 16 }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${step === i ? "bg-gold" : i % 4 === 0 ? "bg-mute" : "bg-line"}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={toggleTransport}
            aria-label={playing ? "Stop the board" : "Play the board"}
            className="flex size-11 items-center justify-center rounded-full bg-violet text-ink transition-transform duration-150 ease-out active:scale-[0.96]"
          >
            {playing ? <Square className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
          </button>
          <button
            type="button"
            onClick={() => setRoom("vault")}
            className="hidden h-11 items-center rounded-full border border-line px-3 text-sm text-gold tabular-nums sm:inline-flex"
          >
            {credits} IAM
          </button>
          <button
            type="button"
            onClick={() => setReina(!reinaOpen)}
            className="flex size-11 items-center justify-center overflow-hidden rounded-full border border-violet"
            aria-label="Open Reina"
          >
            <img src="/media/reina-face.jpg" alt="" className="size-full object-cover object-top" />
          </button>
        </header>

        <main className="house-main min-h-0 flex-1 overflow-y-auto px-4 pt-5 md:px-8">
          <RoomGuard key={room} name={ROOMS.find((item) => item.id === room)?.label ?? "House"}>
            {room === "pulse" && <Pulse />}
            {room === "studio" && <Studio />}
            {room === "booth" && <Booth />}
            {room === "forge" && <Forge />}
            {room === "cipher" && <Cipher />}
            {room === "market" && <Market />}
            {room === "gallery" && <Gallery />}
            {room === "wire" && <Wire />}
            {room === "vault" && <Vault />}
            {room === "link" && <LinkRoom />}
            {room === "academy" && <Academy />}
          </RoomGuard>
        </main>
      </div>

      <nav className="house-dock fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-ink/95 backdrop-blur-md md:hidden">
        {MOBILE.map((id) => {
          const item = ROOMS.find((r) => r.id === id)!;
          const Icon = item.icon;
          const on = room === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setRoom(id)}
              className={`flex h-16 flex-1 flex-col items-center justify-center gap-1 text-xs ${on ? "text-violet" : "text-mute"}`}
            >
              <Icon className="size-5" aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMore(!moreOpen)}
          className={`flex h-16 flex-1 flex-col items-center justify-center gap-1 text-xs ${moreOpen ? "text-violet" : "text-mute"}`}
        >
          <Crown className="size-5" aria-hidden="true" />
          More
        </button>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" className="absolute inset-0 bg-ink/70" aria-label="Close menu" onClick={() => setMore(false)} />
          <div className="house-more absolute inset-x-0 rounded-t-2xl border border-line bg-panel p-4">
            <p className="mb-3 text-xs tracking-widest text-mute uppercase">The rest of the house</p>
            <div className="grid grid-cols-2 gap-2">
              {ROOMS.filter((r) => !MOBILE.includes(r.id)).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRoom(item.id)}
                    className="flex h-16 items-center gap-3 rounded-xl border border-line bg-raise px-3 text-left"
                  >
                    <Icon className="size-4 text-violet" aria-hidden="true" />
                    <span>
                      <span className="block text-sm text-bone">{item.label}</span>
                      <span className="block text-xs text-faint">{item.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setMore(false);
                  setInstallOpen(true);
                }}
                className="flex h-11 items-center justify-center rounded-full border border-line text-sm text-bone"
              >
                Install on this device
              </button>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </div>
          </div>
        </div>
      )}

      {reinaOpen && <ReinaPanel />}
      {installOpen && <InstallSheet onClose={() => setInstallOpen(false)} />}
    </div>
  );
}

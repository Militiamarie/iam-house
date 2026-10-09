import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { SKINS, setSkin, type SkinId } from "@/lib/skin.functions";
import { sayError } from "@/lib/say";

const LOOKS: { id: SkinId; name: string; line: string; ink: string; accent: string }[] = [
  { id: "house", name: "House", line: "Violet neon, warm black.", ink: "#0c0a09", accent: "#d2b0ff" },
  { id: "candle", name: "Candle", line: "Amber on a brown room.", ink: "#120d0a", accent: "#ffb089" },
  { id: "alley", name: "Alley", line: "Night blue, a cold light.", ink: "#070b10", accent: "#7ee0ff" },
  { id: "ink", name: "Ink", line: "Black and lime, like the wall.", ink: "#070807", accent: "#c6f54a" },
  { id: "chapel", name: "Chapel", line: "Wine and a soft gold.", ink: "#10080c", accent: "#f0a0c0" },
];

export function wearSkin(skin: SkinId) {
  if (typeof document === "undefined") return;
  if (skin === "house") delete document.documentElement.dataset.skin;
  else document.documentElement.dataset.skin = skin;
}

export function Skins({ worn }: { worn: SkinId }) {
  const router = useRouter();
  const [current, setCurrent] = useState<SkinId>(worn);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function pick(id: SkinId) {
    if (!SKINS.includes(id) || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const row = await setSkin({ data: { skin: id } });
      wearSkin(row.skin);
      setCurrent(row.skin);
      setNote(`${LOOKS.find((look) => look.id === row.skin)?.name ?? "House"} is on the house.`);
      await router.invalidate();
    } catch (error) {
      setNote(sayError(error).fix);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-panel p-4">
      <h2 className="font-display text-2xl italic">Skins</h2>
      <p className="mt-2 text-sm leading-relaxed text-mute">The whole house wears the one you pick. Guests see it the next time they open the door.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {LOOKS.map((look) => (
          <button
            key={look.id}
            type="button"
            disabled={busy}
            onClick={() => void pick(look.id)}
            className={`flex h-16 items-center gap-3 rounded-xl border px-3 text-left ${current === look.id ? "border-violet" : "border-line"}`}
          >
            <span className="relative size-9 shrink-0 rounded-full" style={{ background: look.ink }}>
              <span className="absolute right-0 bottom-0 size-3.5 rounded-full" style={{ background: look.accent }} />
            </span>
            <span>
              <span className="block text-sm">{look.name}</span>
              <span className="block text-xs text-faint">{look.line}</span>
            </span>
          </button>
        ))}
      </div>
      {note && <p className="mt-3 text-sm text-gold">{note}</p>}
    </section>
  );
}

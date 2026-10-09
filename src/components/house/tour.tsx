import { useRef, useState } from "react";
import type { RoomId } from "@/lib/store";
import { useHouse } from "@/lib/store";
import { Ghost, Primary } from "@/components/house/bits";

const STOPS: { id: string; room: RoomId; title: string; plate: string; line: string }[] = [
  {
    id: "board",
    room: "studio",
    title: "The board",
    plate: "/media/studio.jpg",
    line: "Candles on the meter bridge. The neon doesn’t blink. The board is the next step in.",
  },
  {
    id: "booth",
    room: "booth",
    title: "The booth",
    plate: "/media/tape-poster.jpg",
    line: "Same rack as the studio. Open the mic, or just hear the scale.",
  },
  {
    id: "wall",
    room: "pulse",
    title: "The wall",
    plate: "/media/comic.jpg",
    line: "Notes and tapes. A pocket on a post is something you can ride.",
  },
  {
    id: "ink",
    room: "gallery",
    title: "The ink",
    plate: "/media/ian-seen.jpg",
    line: "Prints of the house. One of one. The take is written in the vault.",
  },
  {
    id: "wire",
    room: "wire",
    title: "The wire",
    plate: "/media/studio.jpg",
    line: "Cut a master from the board. The sheet is what a distributor files.",
  },
  {
    id: "lesson",
    room: "academy",
    title: "The lesson",
    plate: "/media/reina.jpg",
    line: "I teach the pocket here. Snare, hook, 808, rack, then the release.",
  },
];

export function Tour() {
  const setRoom = useHouse((s) => s.setRoom);
  const [index, setIndex] = useState(0);
  const [yaw, setYaw] = useState(0);
  const drag = useRef<{ x: number; yaw: number } | null>(null);
  const yawRef = useRef(0);
  const stop = STOPS[index]!;

  function turn(next: number) {
    const clamped = Math.max(-32, Math.min(32, next));
    yawRef.current = clamped;
    setYaw(clamped);
  }

  function go(dir: number) {
    setIndex((n) => (n + dir + STOPS.length) % STOPS.length);
    turn(0);
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <header>
        <p className="text-xs tracking-widest text-violet uppercase">Tour</p>
        <h1 className="mt-2 font-display text-4xl italic">Walk it with her</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-mute">
          Drag the room. Reina stays in the hologram and tells you where you are. Step in when you want the real door.
        </p>
      </header>

      <div
        className="relative h-[32rem] max-h-[70dvh] overflow-hidden rounded-2xl border border-line bg-ink"
        style={{ perspective: "900px" }}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, yaw };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          turn(drag.current.yaw + (e.clientX - drag.current.x) / 8);
        }}
        onPointerUp={() => {
          if (yawRef.current > 18) go(-1);
          else if (yawRef.current < -18) go(1);
          else turn(0);
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
          turn(0);
        }}
      >
        <img
          key={stop.id}
          src={stop.plate}
          alt=""
          className="hologram-plate absolute inset-0 size-full object-cover"
          style={{ transform: `rotateY(${yaw}deg) scale(1.12)`, objectPosition: stop.id === "wire" ? "center 70%" : "center" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/25 to-ink/30" />
        <div className="grade-vignette pointer-events-none absolute inset-0" />

        <div className="pointer-events-none absolute inset-x-0 bottom-16 flex justify-center">
          <div className="relative h-64 w-40">
            <div className="absolute inset-x-6 top-2 bottom-8 overflow-hidden bg-ink">
              <img src="/media/reina-face.jpg" alt="Reina, as a violet hologram" className="hologram-figure size-full object-cover object-top" />
              <div className="pointer-events-none absolute inset-0 bg-violet/35 mix-blend-color" />
              <div className="hologram-scan pointer-events-none absolute inset-x-0 top-0 h-1/2" />
              <div className="grade-scan pointer-events-none absolute inset-0 opacity-80" />
            </div>
            <div className="absolute inset-x-0 bottom-0 h-8 rounded-[100%] border border-violet/70 bg-violet/20" />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
          <p className="text-xs tracking-widest text-violet uppercase">
            {index + 1} / {STOPS.length} · {stop.title}
          </p>
          <p className="mt-1 max-w-sm text-sm leading-relaxed text-bone">{stop.line}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Ghost onClick={() => go(-1)}>Back</Ghost>
        <Ghost onClick={() => go(1)}>Further</Ghost>
        <Primary onClick={() => setRoom(stop.room)}>Step in</Primary>
        <div className="flex gap-0" aria-label="Stops">
          {STOPS.map((item, i) => (
            <button
              key={item.id}
              type="button"
              aria-label={item.title}
              aria-current={i === index}
              onClick={() => {
                setIndex(i);
                turn(0);
              }}
              className="flex size-11 items-center justify-center"
            >
              <span className={`size-2.5 rounded-full ${i === index ? "bg-violet" : "bg-line"}`} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

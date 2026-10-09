import { useState } from "react";
import { LINKS, type LinkCard } from "@/lib/catalog";
import { useHouse } from "@/lib/store";
import { Card, Ghost, Kicker, Primary } from "@/components/house/bits";

export function LinkRoom() {
  const matches = useHouse((s) => s.matches);
  const passed = useHouse((s) => s.passed);
  const swipe = useHouse((s) => s.swipe);
  const resetDeck = useHouse((s) => s.resetDeck);
  const openSession = useHouse((s) => s.openSession);
  const [drag, setDrag] = useState(0);
  const [origin, setOrigin] = useState<number | null>(null);
  const [linked, setLinked] = useState<LinkCard | null>(null);

  const deck = LINKS.filter((card) => !matches.includes(card.id) && !passed.includes(card.id));
  const top = deck[0];

  function finish(yes: boolean) {
    if (!top) return;
    swipe(top.id, yes);
    if (yes) setLinked(top);
    setDrag(0);
    setOrigin(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <header>
        <Kicker>Link</Kicker>
        <h1 className="mt-2 font-display text-4xl italic">Find the next session</h1>
        <p className="mt-2 text-sm leading-relaxed text-mute">
          Swipe for a collab, not a date. Pass if the pocket’s wrong. Link if you want them on the board.
        </p>
      </header>

      <div className="relative mx-auto h-[28rem] w-full max-w-sm">
        {deck.slice(0, 2).reverse().map((card, index, arr) => {
          const front = index === arr.length - 1;
          return (
            <article
              key={card.id}
              className="absolute inset-0"
              style={{
                transform: front ? `translateX(${drag}px) rotate(${drag / 18}deg)` : "scale(0.96) translateY(12px)",
              }}
              onPointerDown={(e) => {
                if (!front) return;
                setOrigin(e.clientX);
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (!front || origin == null) return;
                setDrag(e.clientX - origin);
              }}
              onPointerUp={() => {
                if (!front) return;
                if (drag > 90) finish(true);
                else if (drag < -90) finish(false);
                else {
                  setDrag(0);
                  setOrigin(null);
                }
              }}
            >
              <Person card={card} hint={front && drag > 40 ? "Link" : front && drag < -40 ? "Pass" : card.pocket} />
            </article>
          );
        })}
        {!top && (
          <Card className="flex h-full flex-col items-start justify-center">
            <h2 className="font-display text-3xl italic">The deck is quiet.</h2>
            <p className="mt-2 text-sm text-mute">Everyone in the house has been seen.</p>
            <div className="mt-4">
              <Primary onClick={resetDeck}>Reset the deck</Primary>
            </div>
          </Card>
        )}
      </div>

      {top && (
        <div className="flex justify-center gap-3">
          <Ghost onClick={() => finish(false)}>Pass</Ghost>
          <Primary onClick={() => finish(true)}>Link</Primary>
        </div>
      )}

      {matches.length > 0 && (
        <Card>
          <h2 className="mb-2 font-display text-2xl italic">Sessions waiting</h2>
          <ul className="flex flex-col gap-2">
            {matches.map((id) => {
              const card = LINKS.find((c) => c.id === id);
              if (!card) return null;
              return (
                <li key={id} className="flex items-center justify-between gap-3">
                  <span className="text-sm">
                    {card.name}
                    <span className="text-faint"> · {card.role}</span>
                  </span>
                  <button type="button" onClick={() => openSession(card.name)} className="h-10 text-sm text-violet">
                    Open studio
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {linked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4">
          <Card className="w-full max-w-sm">
            <p className="text-xs tracking-widest text-violet uppercase">Linked</p>
            <h2 className="mt-1 font-display text-4xl italic">{linked.name}</h2>
            <p className="mt-2 text-sm text-mute">{linked.looking}</p>
            <div className="mt-4 flex gap-2">
              <Primary
                onClick={() => {
                  openSession(linked.name);
                  setLinked(null);
                }}
              >
                Open the session
              </Primary>
              <Ghost onClick={() => setLinked(null)}>Keep looking</Ghost>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Person({ card, hint }: { card: LinkCard; hint: string }) {
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-line bg-panel p-5">
      <div>
        <div className="flex size-20 items-center justify-center rounded-2xl bg-raise font-display text-3xl text-violet italic">
          {card.monogram}
        </div>
        <h2 className="mt-5 font-display text-4xl italic">{card.name}</h2>
        <p className="mt-1 text-sm text-mute">
          {card.role} · {card.city}
        </p>
        <p className="mt-4 text-base leading-relaxed">{card.looking}</p>
      </div>
      <p className="text-xs tracking-widest text-gold uppercase">{hint}</p>
    </div>
  );
}

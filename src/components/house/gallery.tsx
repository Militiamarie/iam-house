import { useState } from "react";
import { EDITIONS } from "@/lib/catalog";
import { useHouse } from "@/lib/store";
import { Ghost, Kicker } from "@/components/house/bits";
import { PayButton } from "@/components/house/pay";
import { dollars, OFFERS } from "@/lib/offers";

export function Gallery() {
  const owned = useHouse((s) => s.owned);
  const spend = useHouse((s) => s.spend);
  const [note, setNote] = useState<string | null>(null);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <header>
        <Kicker>Gallery</Kicker>
        <h1 className="mt-2 font-display text-4xl italic">Prints, not promises</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-mute">
          One-of-one editions. Pay the house in dollars — that sale is yours to keep — or claim one with IAM if you already hold credits.
        </p>
      </header>
      {note && <p className="text-sm text-gold">{note}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {EDITIONS.map((item) => {
          const has = owned.includes(item.id);
          return (
            <article key={item.id} className="overflow-hidden rounded-2xl border border-line bg-panel">
              {item.image && <img src={item.image} alt={item.name} className="aspect-[4/5] w-full object-cover" />}
              {item.video && (
                <video src={item.video} poster={item.poster} controls playsInline className="aspect-[4/5] w-full bg-ink object-cover" />
              )}
              <div className="p-4">
                <p className="text-xs tracking-widest text-faint uppercase">{item.kind}</p>
                <h2 className="mt-1 font-display text-3xl italic">{item.name}</h2>
                <p className="mt-2 text-sm text-mute">{item.note}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-gold tabular-nums">{dollars(OFFERS[`usd-${item.id}`]?.cents ?? 0)}</span>
                  <div className="flex flex-wrap gap-2">
                    <PayButton sku={`usd-${item.id}`} done="Yours" />
                    <Ghost
                      disabled={has}
                      onClick={() => {
                        const result = spend(item.id);
                        setNote(
                          result === "ok" ? `${item.name} is in your papers.` : result === "broke" ? `Short ${item.price} IAM. The academy and the cipher both pay.` : "Already yours.",
                        );
                      }}
                    >
                      {has ? "In your papers" : `${item.price} IAM`}
                    </Ghost>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

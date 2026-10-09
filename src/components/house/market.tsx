import { useState } from "react";
import { BEATS } from "@/lib/catalog";
import { getEngine } from "@/lib/engine";
import { publishLive, useHouse } from "@/lib/store";
import { Card, Ghost, Kicker } from "@/components/house/bits";
import { PayButton } from "@/components/house/pay";
import { dollars, OFFERS } from "@/lib/offers";

export function Market() {
  const owned = useHouse((s) => s.owned);
  const spend = useHouse((s) => s.spend);
  const hear = useHouse((s) => s.hear);
  const credits = useHouse((s) => s.credits);
  const [note, setNote] = useState<string | null>(null);

  function play(patternId: string) {
    hear(patternId);
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
        <Kicker>Market</Kicker>
        <h1 className="mt-2 font-display text-4xl italic">License a pocket</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-mute">
          Pay the house in dollars and the lease is yours — that sale stays in the books. IAM is the in-house way, if you already hold credits. You have{" "}
          <span className="text-gold tabular-nums">{credits}</span> IAM.
        </p>
      </header>
      {note && <p className="text-sm text-gold">{note}</p>}
      <div className="grid gap-3">
        {BEATS.map((beat) => {
          const has = owned.includes(beat.id);
          return (
            <Card key={beat.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-3xl italic">{beat.name}</h2>
                  <p className="mt-1 text-xs tracking-widest text-faint uppercase">
                    {beat.maker} · {beat.license}
                  </p>
                  <p className="mt-2 max-w-md text-sm text-mute">{beat.note}</p>
                </div>
                <p className="font-display text-3xl text-gold tabular-nums">{dollars(OFFERS[`usd-${beat.id}`]?.cents ?? 0)}</p>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Ghost onClick={() => play(beat.patternId)}>Play</Ghost>
                <PayButton sku={`usd-${beat.id}`} done="Leased" />
                <Ghost
                  disabled={has}
                  onClick={() => {
                    const result = spend(beat.id);
                    setNote(
                      result === "ok"
                        ? `${beat.name} is in your papers.`
                        : result === "broke"
                          ? `Short ${beat.price} IAM. Clear a lesson or take the cipher, then license it.`
                          : "Already licensed.",
                    );
                  }}
                >
                  {has ? "Licensed" : `${beat.price} IAM`}
                </Ghost>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

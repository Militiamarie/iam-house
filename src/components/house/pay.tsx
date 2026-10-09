import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { houseTake, myBooks, placeOrder } from "@/lib/house.functions";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { dollars, money, OFFERS, PASS_IDS, offerFor } from "@/lib/offers";
import { useHouse } from "@/lib/store";
import { Card, Kicker, Primary } from "@/components/house/bits";

export function PayButton({
  sku,
  about,
  done = "Paid",
}: {
  sku: string;
  about?: string;
  done?: string;
}) {
  const offer = offerFor(sku);
  const paid = useHouse((s) => s.paid);
  const markPaid = useHouse((s) => s.markPaid);
  const bumpBooks = useHouse((s) => s.bumpBooks);
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  if (!offer) return null;
  const sale = offer;
  const owned = sale.kind !== "tip" && paid.includes(sku);

  async function pay() {
    if (owned || busy) return;
    if (isPending) return;
    if (!user) {
      await navigate({ to: "/login" });
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      const res = await placeOrder({ data: { sku, about: about ?? "" } });
      if (sale.kind !== "tip") markPaid(sku);
      else bumpBooks();
      const url = useHouse.getState().payoutUrl;
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
        setNote(res.already ? "Already in the books. Payout link opened." : "Booked. Payout link opened.");
      } else {
        setNote(res.already ? "Already in the books." : `Booked ${money(res.cents)} to the house.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("unauthorized")) {
        await navigate({ to: "/login" });
      } else {
        setNote("That charge didn’t land. Enter the house and try again.");
      }
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Primary disabled={owned || busy} onClick={() => void pay()}>
        {owned ? done : busy ? "Booking…" : `Pay ${dollars(offer.cents)}`}
      </Primary>
      {note && <p className="text-xs text-gold">{note}</p>}
    </div>
  );
}

export function HouseBooks() {
  const nonce = useHouse((s) => s.booksNonce);
  const mergePaid = useHouse((s) => s.mergePaid);
  const payoutUrl = useHouse((s) => s.payoutUrl);
  const setPayout = useHouse((s) => s.setPayout);
  const paid = useHouse((s) => s.paid);
  const [draft, setDraft] = useState(payoutUrl);
  const [take, setTake] = useState<{ cents: number; count: number; recent: { id?: string; label: string; cents: number; at: string }[] } | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void houseTake()
      .then((row) => {
        if (live) setTake(row);
      })
      .catch(() => {
        if (live) setNote("The books didn’t open.");
      });
    void myBooks()
      .then((rows) => {
        if (live) mergePaid(rows.filter((row) => row.kind !== "tip").map((row) => row.sku));
      })
      .catch(() => {
        /* signed out — the public take still shows */
      });
    return () => {
      live = false;
    };
  }, [nonce, mergePaid]);

  return (
    <>
      <Card>
        <Kicker>House take</Kicker>
        <p className="mt-2 font-display text-6xl text-gold tabular-nums">{take ? money(take.cents) : "—"}</p>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-mute">
          Tips, passes, locked tapes, leases, and prints. You keep all of it. {take ? `${take.count} checkout${take.count === 1 ? "" : "s"} in the books.` : "Counting."}
        </p>
        {note && <p className="mt-2 text-sm text-gold">{note}</p>}
        {take && take.recent.length > 0 && (
          <ul className="mt-4 flex flex-col">
            {take.recent.map((row, i) => (
              <li key={`${row.at}-${i}`} className="flex items-center justify-between gap-3 border-t border-line py-3 text-sm first:border-t-0">
                <span className="min-w-0 truncate">{row.label}</span>
                <span className="shrink-0 text-gold tabular-nums">{money(row.cents)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="font-display text-2xl italic">Passes</h2>
        <p className="mt-2 text-sm text-mute">Monthly money from the room. Inner and Patron open After Hours.</p>
        <div className="mt-4 grid gap-3">
          {PASS_IDS.map((id) => {
            const offer = OFFERS[id]!;
            const has = paid.includes(id);
            return (
              <div key={id} className="rounded-xl border border-line bg-raise p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-2xl italic">{offer.label}</p>
                    <p className="mt-1 text-sm text-mute">{offer.line}</p>
                  </div>
                  <p className="font-display text-2xl text-gold tabular-nums">{dollars(offer.cents)}</p>
                </div>
                <div className="mt-3">{has ? <p className="text-sm text-gold">On your name.</p> : <PayButton sku={id} />}</div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-2xl italic">Payout link</h2>
        <p className="mt-2 text-sm leading-relaxed text-mute">
          Paste a Stripe, Cash App, PayPal, or Coinbase link. When someone pays, that link opens and the sale is still written here. Without a link, the sale is booked so you can see the take.
        </p>
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            const raw = draft.trim();
            if (!raw) {
              setPayout("");
              setNote("Payout link cleared. Sales still book here.");
              return;
            }
            try {
              const url = new URL(raw);
              if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("bad");
              setPayout(url.toString());
              setNote("Payout link saved.");
            } catch {
              setNote("That link needs to start with https.");
            }
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="https://"
            aria-label="Payout link"
            className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-raise px-3 text-sm"
          />
          <Primary type="submit">Save link</Primary>
        </form>
      </Card>
    </>
  );
}

import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BEATS, EDITIONS } from "@/lib/catalog";
import { useHouse } from "@/lib/store";
import { Card, Kicker, Primary } from "@/components/house/bits";
import { HouseBooks } from "@/components/house/pay";

export function Vault() {
  const credits = useHouse((s) => s.credits);
  const activity = useHouse((s) => s.activity);
  const owned = useHouse((s) => s.owned);
  const [to, setTo] = useState("nova");
  const [amount, setAmount] = useState("18");
  const [note, setNote] = useState<string | null>(null);
  const releases = useHouse((s) => s.releases);
  const setRoom = useHouse((s) => s.setRoom);

  const series = useMemo(() => {
    const ordered = [...activity].reverse();
    let running = 0;
    return ordered.map((row, i) => {
      running += row.amount;
      return { name: String(i + 1), balance: running };
    });
  }, [activity]);

  const papers = [...BEATS, ...EDITIONS].filter((item) => owned.includes(item.id));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header>
        <Kicker>Vault</Kicker>
        <h1 className="mt-2 font-display text-4xl italic">What the house made</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-mute">
          Dollars below are what fans pay you — tips, passes, tapes, leases, prints. You keep every one. IAM underneath is house credit for the room, not cash.
        </p>
      </header>

      <HouseBooks />

      <Card>
        <p className="text-xs tracking-widest text-faint uppercase">IAM credits</p>
        <p className="font-display text-6xl text-gold tabular-nums">{credits}</p>
        <p className="text-sm text-mute">IAM · handle iam.melitia.house</p>
        <div className="mt-4 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <XAxis dataKey="name" hide />
              <YAxis hide domain={["dataMin - 20", "dataMax + 20"]} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-panel)",
                  border: "1px solid var(--color-line)",
                  borderRadius: 12,
                  color: "var(--color-bone)",
                }}
                formatter={(value) => [`${value ?? 0} IAM`, "Balance"]}
              />
              <Area type="monotone" dataKey="balance" stroke="var(--color-violet)" fill="var(--color-violet)" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-2xl italic">Send inside the house</h2>
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Math.round(Number(amount));
            if (!to.trim() || !Number.isFinite(n) || n <= 0) {
              setNote("Name a room and a real amount.");
              return;
            }
            if (credits < n) {
              setNote("The vault is short.");
              return;
            }
            useHouse.setState((s) => ({
              credits: s.credits - n,
              activity: [
                { id: crypto.randomUUID(), label: `To ${to.trim()}`, amount: -n, at: Date.now() },
                ...s.activity,
              ].slice(0, 20),
            }));
            setNote(`Sent ${n} IAM to ${to.trim()}.`);
          }}
        >
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            aria-label="Send to"
            className="h-11 flex-1 rounded-xl border border-line bg-raise px-3 text-sm"
          />
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
            aria-label="Amount"
            className="h-11 w-full rounded-xl border border-line bg-raise px-3 text-sm tabular-nums sm:w-28"
          />
          <Primary type="submit">Send</Primary>
        </form>
        {note && <p className="mt-3 text-sm text-gold">{note}</p>}
      </Card>

      <Card>
        <h2 className="mb-2 font-display text-2xl italic">Papers</h2>
        {papers.length === 0 && <p className="text-sm text-mute">Nothing licensed yet. The market and the gallery are down the hall.</p>}
        <ul className="flex flex-col">
          {papers.map((item) => (
            <li key={item.id} className="flex items-center justify-between border-t border-line py-3 text-sm first:border-t-0">
              <span>{item.name}</span>
              <span className="text-faint">kept</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl italic">On the wire</h2>
          <button type="button" onClick={() => setRoom("wire")} className="h-11 text-sm text-violet">
            Open the wire
          </button>
        </div>
        {releases.length === 0 && (
          <p className="text-sm text-mute">No record filed. Cut a master in Wire and the first report lands here.</p>
        )}
        <ul className="flex flex-col">
          {releases.map((release) => (
            <li key={release.id} className="flex items-center justify-between gap-3 border-t border-line py-3 text-sm first:border-t-0">
              <span className="min-w-0">
                <span className="block truncate">{release.title}</span>
                <span className="block text-xs text-faint">
                  {release.catalog} · {release.status === "live" ? "live" : "in review"}
                </span>
              </span>
              <span className="shrink-0 text-gold tabular-nums">{release.status === "live" ? `+${release.report}` : "—"}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-2 font-display text-2xl italic">Ledger</h2>
        <ul className="flex flex-col">
          {activity.map((row) => (
            <li key={row.id} className="flex items-center justify-between border-t border-line py-3 text-sm first:border-t-0">
              <span>{row.label}</span>
              <span className={`tabular-nums ${row.amount < 0 ? "text-mute" : "text-gold"}`}>
                {row.amount > 0 ? "+" : ""}
                {row.amount}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { OFFERS, type BookLine } from "@/lib/offers";

function parseOrder(input: unknown): { sku: string; about: string } {
  const raw = (input ?? {}) as { sku?: unknown; about?: unknown };
  const sku = typeof raw.sku === "string" ? raw.sku : "";
  if (!OFFERS[sku]) throw new Error("That isn’t for sale.");
  const about = typeof raw.about === "string" ? raw.about.replace(/[^\w .'-]/g, "").slice(0, 32) : "";
  return { sku, about };
}

function asLine(row: { kind: string; sku: string; label: string; cents: number | string; at: string }): BookLine {
  return {
    kind: String(row.kind),
    sku: String(row.sku),
    label: String(row.label),
    cents: Number(row.cents),
    at: String(row.at),
  };
}

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseOrder)
  .handler(async ({ data, context }) => {
    const offer = OFFERS[data.sku]!;
    const sql = await getSql();
    if (offer.kind !== "tip") {
      const existing = await sql<{ sku: string }>`
        select sku from house_orders where user_id = ${context.userId} and sku = ${data.sku} limit 1
      `;
      if (existing.length) {
        return { ok: true as const, already: true, cents: offer.cents, label: offer.label, sku: data.sku };
      }
    }
    const label = data.about && offer.kind === "tip" ? `${offer.label} · ${data.about}` : offer.label;
    await sql`
      insert into house_orders (id, user_id, kind, sku, label, cents)
      values (${crypto.randomUUID()}, ${context.userId}, ${offer.kind}, ${data.sku}, ${label}, ${offer.cents})
    `;
    return { ok: true as const, already: false, cents: offer.cents, label, sku: data.sku };
  });

export const myBooks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ kind: string; sku: string; label: string; cents: number; at: string }>`
      select kind, sku, label, cents, created_at::text as at
      from house_orders
      where user_id = ${context.userId}
      order by created_at desc
      limit 40
    `;
    return rows.map(asLine);
  });

export const houseTake = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const totals = await sql<{ cents: number; n: number }>`
    select coalesce(sum(cents), 0)::int as cents, count(*)::int as n from house_orders
  `;
  const recent = await sql<{ kind: string; sku: string; label: string; cents: number; at: string }>`
    select kind, sku, label, cents, created_at::text as at
    from house_orders
    order by created_at desc
    limit 8
  `;
  const row = totals[0];
  return {
    cents: Number(row?.cents ?? 0),
    count: Number(row?.n ?? 0),
    recent: recent.map(asLine),
  };
});

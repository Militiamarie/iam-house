export type OfferKind = "pass" | "tip" | "unlock" | "lease" | "print";

export type Offer = {
  kind: OfferKind;
  cents: number;
  label: string;
  line: string;
  owns?: string;
};

/** Prices the house keeps. The server is the source of truth — the client only sends a sku. */
export const OFFERS: Record<string, Offer> = {
  "pass-key": {
    kind: "pass",
    cents: 900,
    label: "House Key",
    line: "A month on the wall. Your notes wear a gold Key.",
  },
  "pass-inner": {
    kind: "pass",
    cents: 2800,
    label: "Inner Room",
    line: "After Hours stays open, and your name reads Inner.",
  },
  "pass-patron": {
    kind: "pass",
    cents: 8800,
    label: "Patron",
    line: "Every locked tape. First listen. Patron on your name.",
  },
  "tip-3": { kind: "tip", cents: 300, label: "Tip", line: "A small light on the tape." },
  "tip-8": { kind: "tip", cents: 800, label: "Tip", line: "Enough to keep the booth warm." },
  "tip-18": { kind: "tip", cents: 1800, label: "Tip", line: "A real thank you." },
  "thread-after": {
    kind: "unlock",
    cents: 800,
    label: "After Hours",
    line: "The locked tape. One payment, it stays open.",
  },
  "usd-beat-candle": {
    kind: "lease",
    cents: 2400,
    label: "Candle Kit",
    line: "Lease. The record stays yours.",
    owns: "beat-candle",
  },
  "usd-beat-afters": {
    kind: "lease",
    cents: 3600,
    label: "818 Afters",
    line: "Lease. The record stays yours.",
    owns: "beat-afters",
  },
  "usd-beat-concrete": {
    kind: "lease",
    cents: 2800,
    label: "Concrete Hour",
    line: "Lease. The record stays yours.",
    owns: "beat-concrete",
  },
  "usd-beat-hymn": {
    kind: "lease",
    cents: 18000,
    label: "Pocket Prayer",
    line: "Exclusive hold. Off the open wall.",
    owns: "beat-hymn",
  },
  "usd-ed-seen": {
    kind: "print",
    cents: 4800,
    label: "IAN SEEN",
    line: "The cover, paid to the house.",
    owns: "ed-seen",
  },
  "usd-ed-room": {
    kind: "print",
    cents: 3200,
    label: "The Board",
    line: "The room the record was finished in.",
    owns: "ed-room",
  },
  "usd-ed-ink": {
    kind: "print",
    cents: 3600,
    label: "Name on the Wall",
    line: "The ink, paid to the house.",
    owns: "ed-ink",
  },
  "usd-ed-tape": {
    kind: "print",
    cents: 4000,
    label: "Bleed the Block",
    line: "The session visual, paid to the house.",
    owns: "ed-tape",
  },
};

export const PASS_IDS = ["pass-key", "pass-inner", "pass-patron"] as const;
export const TIP_IDS = ["tip-3", "tip-8", "tip-18"] as const;

export type BookLine = {
  kind: string;
  sku: string;
  label: string;
  cents: number;
  at: string;
};

export function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function dollars(cents: number) {
  const n = cents / 100;
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

export function threadOpen(paid: string[], sku?: string) {
  if (!sku) return true;
  return paid.includes(sku) || paid.includes("pass-inner") || paid.includes("pass-patron");
}

export function offerFor(id: string): Offer | null {
  return OFFERS[id] ?? null;
}

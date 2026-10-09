import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { authClient, authEnabled, signOut } from "@/lib/auth/client";
import { deskGate, mayCutKey } from "@/lib/admin.functions";
import { sayError } from "@/lib/say";
import { useHouse } from "@/lib/store";
import { HouseBooks } from "@/components/house/pay";
import { Skins } from "@/components/house/skins";
import { getSkin, type SkinId } from "@/lib/skin.functions";

export const Route = createFileRoute("/admin")({ component: AdminDoor });

type EmailResult = {
  data?: { token?: string | null } | null;
  error?: { message?: string } | null;
};

function rememberToken(token: string | null | undefined) {
  if (!token || typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem("grok-auth.bearer-token", token);
  } catch {
    /* the cookie still counts when it sticks */
  }
}

function AdminDoor() {
  const [gate, setGate] = useState<"load" | "out" | "guest" | "house">(authEnabled ? "load" : "house");

  useEffect(() => {
    if (!authEnabled) return;
    let live = true;
    const headers = new Headers();
    try {
      const token = window.sessionStorage.getItem("grok-auth.bearer-token");
      if (token) headers.set("Authorization", `Bearer ${token}`);
    } catch {
      /* cookie path */
    }
    void fetch("/api/auth/get-session", { headers, credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return null;
        const body = (await res.json()) as { user?: { email?: string | null } | null };
        return body.user?.email ?? null;
      })
      .then(async (email) => {
        if (!live) return;
        if (!email) {
          setGate("out");
          return;
        }
        const row = await deskGate();
        if (!live) return;
        setGate(row.admin ? "house" : "guest");
      })
      .catch(() => {
        if (live) setGate("out");
      });
    return () => {
      live = false;
    };
  }, []);

  return (
    <main className="min-h-dvh bg-ink px-4 py-10 text-bone">
      <div className="mx-auto w-full max-w-3xl">
        <Link to="/" className="neon font-display text-4xl text-gold italic">
          I AM
        </Link>
        <p className="mt-2 text-sm text-mute">House desk. Not the guest door.</p>
        <div className="mt-6">
          {gate === "load" ? (
            <div className="h-48 animate-pulse rounded-2xl bg-raise" />
          ) : gate === "house" ? (
            <Desk preview={!authEnabled} />
          ) : gate === "guest" ? (
            <GuestSession />
          ) : (
            <DeskForm />
          )}
        </div>
      </div>
    </main>
  );
}

function GuestSession() {
  return (
    <section className="max-w-sm rounded-2xl border border-line bg-panel p-5">
      <h1 className="font-display text-3xl italic">Wrong door</h1>
      <p className="mt-2 text-sm leading-relaxed text-mute">
        This session is a guest. The desk only opens for the house key. The other door is still yours.
      </p>
      <Link to="/" className="mt-5 inline-flex h-11 items-center text-sm text-violet">
        Back to the house
      </Link>
    </section>
  );
}

function DeskForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish(result: EmailResult) {
    if (result.error) {
      setError(sayError(result.error.message ?? result.error).fix);
      setBusy(false);
      return;
    }
    rememberToken(result.data?.token);
    window.location.assign("/admin");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!authEnabled) {
      setError("Sign-in is off.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    const gate = await mayCutKey({ data: { email } });
    if (!gate.allowed) {
      setError("This door is not for guests. Use the other door.");
      setBusy(false);
      return;
    }
    const client = authClient as typeof authClient & {
      signIn: { email: (body: { email: string; password: string }) => Promise<EmailResult> };
    };
    try {
      await finish(await client.signIn.email({ email: email.trim(), password }));
    } catch (err) {
      setError(sayError(err).fix);
      setBusy(false);
    }
  }

  async function cutKey() {
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    const gate = await mayCutKey({ data: { email } });
    if (!gate.allowed) {
      setError("This door is not for guests. Use the other door.");
      setBusy(false);
      return;
    }
    const client = authClient as typeof authClient & {
      signUp: { email: (body: { email: string; password: string; name: string }) => Promise<EmailResult> };
    };
    try {
      await finish(await client.signUp.email({ email: email.trim(), password, name: "House" }));
    } catch (err) {
      setError(sayError(err).fix);
      setBusy(false);
    }
  }

  return (
    <section className="max-w-sm rounded-2xl border border-line bg-panel p-5">
      <h1 className="font-display text-3xl italic">House key</h1>
      <p className="mt-2 text-sm leading-relaxed text-mute">Email and password for the desk. Guests are turned away before the lock turns.</p>
      <form onSubmit={(e) => void submit(e)} className="mt-4 flex flex-col gap-3">
        <label className="block text-sm">
          <span className="mb-1 block text-xs tracking-widest text-faint uppercase">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            className="h-11 w-full rounded-xl border border-line bg-raise px-3 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs tracking-widest text-faint uppercase">Password</span>
          <span className="flex gap-2">
            <input
              type={show ? "text" : "password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-raise px-3 text-sm"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="flex size-11 items-center justify-center rounded-xl border border-line text-mute"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </span>
        </label>
        {error && <p className="text-sm text-gold">{error}</p>}
        <button type="submit" disabled={busy} className="h-11 rounded-full bg-gold text-sm font-medium text-ink disabled:opacity-40">
          {busy ? "Checking…" : "Open the desk"}
        </button>
      </form>
      <button type="button" onClick={() => void cutKey()} disabled={busy} className="mt-3 h-11 text-sm text-mute">
        Cut the house key
      </button>
      <Link to="/login" className="mt-2 block text-xs tracking-widest text-faint uppercase">
        Guest door
      </Link>
    </section>
  );
}

function Desk({ preview }: { preview: boolean }) {
  const payoutUrl = useHouse((s) => s.payoutUrl);
  const setPayout = useHouse((s) => s.setPayout);
  const [draft, setDraft] = useState(payoutUrl);
  const [note, setNote] = useState<string | null>(null);
  const [worn, setWorn] = useState<SkinId>("house");

  useEffect(() => {
    let live = true;
    void getSkin()
      .then((skin) => {
        if (live) setWorn(skin);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl italic">The desk</h1>
        {preview ? null : (
          <button type="button" onClick={() => void signOut("/admin")} className="h-11 rounded-full border border-line px-4 text-sm">
            Lock the desk
          </button>
        )}
      </div>
      {preview && (
        <p className="max-w-xl text-sm text-mute">
          Sign-in is off in this preview, so the desk is open on this device. When the door is on, only the house key gets in.
        </p>
      )}
      <Skins worn={worn} />
      <section className="rounded-2xl border border-line bg-panel p-4">
        <h2 className="font-display text-2xl italic">Payout link</h2>
        <p className="mt-2 text-sm leading-relaxed text-mute">
          Stripe, Cash App, PayPal, or Coinbase. Fans who pay still open it. Guests can see the take. They cannot change this.
        </p>
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            const raw = draft.trim();
            if (!raw) {
              setPayout("");
              setNote("Payout link cleared. Sales still book in the vault.");
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
          <button type="submit" className="h-11 rounded-full bg-gold px-5 text-sm font-medium text-ink">
            Save link
          </button>
        </form>
        {note && <p className="mt-2 text-sm text-gold">{note}</p>}
      </section>
      <HouseBooks desk />
    </div>
  );
}

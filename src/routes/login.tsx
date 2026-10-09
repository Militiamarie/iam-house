import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { sayError } from "@/lib/say";

export const Route = createFileRoute("/login")({ component: Login });

const BEARER_KEY = "grok-auth.bearer-token";

type EmailResult = {
  data?: { token?: string | null } | null;
  error?: { message?: string } | null;
};

function rememberToken(token: string | null | undefined) {
  if (!token || typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(BEARER_KEY, token);
  } catch {
    /* preview storage can be blocked; the cookie still counts when it sticks */
  }
}

function Login() {
  const { user, isPending } = useCurrentUserState();

  return (
    <main className="grid min-h-dvh place-items-center bg-ink px-4 py-10 text-bone">
      <div className="w-full max-w-sm">
        <Link to="/" className="neon font-display text-4xl text-violet italic">
          I AM
        </Link>
        <p className="mt-2 text-sm text-mute">The door to the house. Email and a password, or Google, or X.</p>
        <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-panel">
          <img src="/media/studio.jpg" alt="" className="h-36 w-full object-cover" />
          <div className="p-5">
            {isPending ? (
              <div className="h-48 animate-pulse rounded-xl bg-raise" />
            ) : user ? (
              <Inside name={user.displayName ?? user.primaryEmail ?? "You"} />
            ) : (
              <Door />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Inside({ name }: { name: string }) {
  return (
    <div>
      <h1 className="font-display text-3xl italic">You’re already in</h1>
      <p className="mt-2 text-sm leading-relaxed text-mute">
        {name}. Guests who aren’t in yet use an email and a password on this door.
      </p>
      <Link
        to="/"
        className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full bg-violet text-sm font-medium text-ink"
      >
        Back to the house
      </Link>
    </div>
  );
}

function Door() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish(result: EmailResult) {
    if (result.error) {
      const said = sayError(result.error.message ?? result.error);
      if (said.flip) setMode(said.flip);
      setError(said.fix);
      setBusy(false);
      return;
    }
    rememberToken(result.data?.token);
    try {
      await authClient.getSession();
    } catch {
      /* the next paint asks again */
    }
    await navigate({ to: "/" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!authEnabled) {
      setError("Sign-in is disabled.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    const client = authClient as typeof authClient & {
      signIn: { email: (body: { email: string; password: string }) => Promise<EmailResult> };
      signUp: { email: (body: { email: string; password: string; name: string }) => Promise<EmailResult> };
    };
    try {
      if (mode === "up") {
        if (!name.trim()) {
          setError("Put a name on the door.");
          setBusy(false);
          return;
        }
        await finish(await client.signUp.email({ email: email.trim(), password, name: name.trim() }));
      } else {
        await finish(await client.signIn.email({ email: email.trim(), password }));
      }
    } catch (err) {
      const said = sayError(err);
      if (said.flip) setMode(said.flip);
      setError(said.fix);
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode("in")}
          className={`h-11 rounded-full text-sm ${mode === "in" ? "bg-violet text-ink" : "border border-line text-mute"}`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("up")}
          className={`h-11 rounded-full text-sm ${mode === "up" ? "bg-violet text-ink" : "border border-line text-mute"}`}
        >
          Create account
        </button>
      </div>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
        {mode === "up" && (
          <label className="block text-sm">
            <span className="mb-1 block text-xs tracking-widest text-faint uppercase">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="h-11 w-full rounded-xl border border-line bg-raise px-3 text-sm text-bone"
            />
          </label>
        )}
        <label className="block text-sm">
          <span className="mb-1 block text-xs tracking-widest text-faint uppercase">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="h-11 w-full rounded-xl border border-line bg-raise px-3 text-sm text-bone"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs tracking-widest text-faint uppercase">Password</span>
          <span className="flex gap-2">
            <input
              type={show ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "up" ? "new-password" : "current-password"}
              minLength={8}
              className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-raise px-3 text-sm text-bone"
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
          <span className="mt-1 block text-xs text-faint">At least 8 characters.</span>
        </label>
        {error && <p className="text-sm text-gold">{error}</p>}
        <button
          type="submit"
          disabled={busy || !authEnabled}
          className="h-11 rounded-full bg-violet text-sm font-medium text-ink disabled:opacity-40"
        >
          {busy ? "Opening…" : mode === "up" ? "Create the account" : "Enter with password"}
        </button>
      </form>
      {authEnabled && (
        <div className="mt-4 flex flex-col gap-2">
          {GROK_PROVIDERS.map((p) => (
            <button
              key={p.providerId}
              type="button"
              onClick={() => void signIn(p.providerId, { callbackURL: "/" })}
              className="h-11 rounded-full border border-line text-sm text-bone"
            >
              Continue with {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

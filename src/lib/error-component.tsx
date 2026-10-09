import { Component, type ReactNode } from "react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { sayError } from "@/lib/say";

export function AppErrorComponent({ error, reset }: ErrorComponentProps) {
  const said = sayError(error);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-xs tracking-widest text-violet uppercase">House</p>
      <h1 className="font-display text-4xl italic">{said.title}</h1>
      <p className="max-w-sm text-sm leading-relaxed text-mute">{said.fix}</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={() => reset()} className="h-11 rounded-full bg-violet px-5 text-sm text-ink">
          Try again
        </button>
        <Link to="/" className="inline-flex h-11 items-center rounded-full border border-line px-5 text-sm">
          Back to the wall
        </Link>
        <button type="button" onClick={() => window.location.reload()} className="h-11 rounded-full px-4 text-sm text-mute">
          Reload
        </button>
      </div>
    </main>
  );
}

export function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-xs tracking-widest text-violet uppercase">House</p>
      <h1 className="font-display text-4xl italic">That room isn’t here.</h1>
      <p className="max-w-sm text-sm leading-relaxed text-mute">The address doesn’t match a door. The wall is still open.</p>
      <Link to="/" className="inline-flex h-11 items-center rounded-full bg-violet px-5 text-sm text-ink">
        Back to the wall
      </Link>
    </main>
  );
}

export class RoomGuard extends Component<{ name: string; children: ReactNode }, { error: unknown }> {
  state = { error: null as unknown };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    const said = sayError(this.state.error);
    return (
      <div className="mx-auto flex max-w-md flex-col items-start gap-3 py-8">
        <p className="text-xs tracking-widest text-violet uppercase">{this.props.name}</p>
        <h2 className="font-display text-3xl italic">{said.title}</h2>
        <p className="text-sm leading-relaxed text-mute">{said.fix}</p>
        <button type="button" onClick={() => this.setState({ error: null })} className="h-11 rounded-full bg-violet px-5 text-sm text-ink">
          Open it again
        </button>
      </div>
    );
  }
}

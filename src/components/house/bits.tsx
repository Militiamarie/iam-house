import type { ReactNode } from "react";

export function Kicker({ children }: { children: ReactNode }) {
  return <p className="text-xs font-medium tracking-widest text-violet uppercase">{children}</p>;
}

export function RoomIntro({ kicker, title, lede }: { kicker: string; title: string; lede: string }) {
  return (
    <header className="mb-6 max-w-2xl">
      <Kicker>{kicker}</Kicker>
      <h1 className="mt-2 font-display text-4xl text-bone italic md:text-5xl">{title}</h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-mute">{lede}</p>
    </header>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-panel/90 p-4 ${className}`}>{children}</section>;
}

export function Primary({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="tap inline-flex h-11 items-center justify-center rounded-full bg-violet px-5 text-sm font-medium text-ink transition-transform duration-150 ease-out active:scale-[0.96] disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function Ghost({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="tap inline-flex h-11 items-center justify-center rounded-full border border-line bg-raise px-4 text-sm text-bone transition-transform duration-150 ease-out active:scale-[0.96] disabled:opacity-40"
    >
      {children}
    </button>
  );
}

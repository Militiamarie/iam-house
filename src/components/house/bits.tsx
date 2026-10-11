import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function Stage({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready || typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

export function Look({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <Stage>
      <div className="fixed inset-0 z-[80] bg-ink" role="dialog" aria-label={alt}>
        <img src={src} alt={alt} className="size-full object-contain" />
        <button type="button" onClick={onClose} className="absolute top-4 right-4 z-10 h-11 rounded-full border border-line bg-ink/80 px-4 text-sm">
          Close
        </button>
      </div>
    </Stage>
  );
}

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

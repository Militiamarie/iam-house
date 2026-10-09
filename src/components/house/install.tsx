import { useEffect, useState } from "react";
import { Card, Primary } from "@/components/house/bits";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

type Kind = "ios" | "android" | "desktop";

const STORES = [
  { name: "iPhone & iPad", line: "Share, then Add to Home Screen. It opens full screen." },
  { name: "Android", line: "Install from the browser. It sits with your other apps." },
  { name: "Mac & Windows", line: "Install from the browser menu. It gets its own window." },
];

function deviceKind(): Kind {
  const ua = navigator.userAgent;
  const ipad = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (/iPad|iPhone|iPod/.test(ua) || ipad) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function alreadyInstalled() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

export function InstallSheet({ onClose }: { onClose: () => void }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [kind, setKind] = useState<Kind>("desktop");
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    setInstalled(alreadyInstalled());
    setKind(deviceKind());
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/house-sw.js").catch(() => undefined);
    }
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    setPrompt(null);
    if (choice.outcome === "accepted") setInstalled(true);
    else setNote("Install stayed in the browser. You can add it later.");
  }

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" className="absolute inset-0 bg-ink/70" aria-label="Close install" onClick={onClose} />
      <div className="house-sheet absolute inset-x-0 bottom-0 rounded-t-2xl border border-line bg-panel p-5 md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:w-[32rem] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl">
        <p className="text-xs font-medium tracking-widest text-violet uppercase">On every device</p>
        <h2 className="mt-2 font-display text-4xl italic">Put the house on this screen</h2>
        <p className="mt-2 text-sm leading-relaxed text-mute">
          Phone, tablet, and computer. Once it’s installed it opens like an app — no browser bar, same rooms, same board.
        </p>

        {installed ? (
          <p className="mt-4 text-sm text-gold">This device already has the house.</p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {prompt && <Primary onClick={() => void install()}>Install</Primary>}
            {kind === "ios" && (
              <a
                href="/?install=1&platform=ios"
                className="inline-flex h-11 items-center justify-center rounded-full bg-violet px-5 text-sm font-medium text-ink"
              >
                iPhone & iPad steps
              </a>
            )}
          </div>
        )}

        {!installed && kind === "ios" && !prompt && (
          <p className="mt-3 text-sm text-mute">On iPhone or iPad: Share, then Add to Home Screen.</p>
        )}
        {!installed && kind === "android" && !prompt && (
          <p className="mt-3 text-sm text-mute">On Android: browser menu, then Install app or Add to Home screen.</p>
        )}
        {!installed && kind === "desktop" && !prompt && (
          <p className="mt-3 text-sm text-mute">On a computer: the install icon in the address bar, or the browser menu.</p>
        )}
        {note && <p className="mt-3 text-sm text-gold">{note}</p>}

        <ul className="mt-4 flex flex-col gap-2">
          {STORES.map((store) => (
            <li key={store.name}>
              <Card>
                <p className="text-sm text-bone">{store.name}</p>
                <p className="mt-1 text-sm text-mute">{store.line}</p>
              </Card>
            </li>
          ))}
        </ul>

        <Card className="mt-2">
          <p className="text-sm text-bone">App Store, Play, Galaxy, Microsoft</p>
          <p className="mt-1 text-sm leading-relaxed text-mute">
            Those counters need the house owner’s developer accounts to file a listing. They aren’t connected, so the house can’t submit itself. The install above is what puts it on the device today.
          </p>
        </Card>
      </div>
    </div>
  );
}

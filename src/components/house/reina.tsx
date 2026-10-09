import { useState } from "react";
import { askReina } from "@/lib/reina.functions";
import { useHouse } from "@/lib/store";

export function ReinaPanel() {
  const messages = useHouse((s) => s.messages);
  const pushMessage = useHouse((s) => s.pushMessage);
  const setReina = useHouse((s) => s.setReina);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const clean = text.trim();
    if (!clean || busy) return;
    pushMessage("you", clean);
    setText("");
    setBusy(true);
    const res = await askReina({ data: { mode: "chat", text: clean, context: "Standing in the house." } });
    pushMessage("reina", res.ok ? res.text : res.error);
    setBusy(false);
  }

  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-line bg-panel">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <img src="/media/reina-face.jpg" alt="" className="size-10 rounded-full object-cover object-top" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-2xl italic">Reina</p>
          <p className="text-xs text-faint">House voice</p>
        </div>
        <button type="button" onClick={() => setReina(false)} className="h-11 rounded-full border border-line px-4 text-sm">
          Close
        </button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {messages.map((line) => (
          <p key={line.id} className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${line.role === "you" ? "self-end bg-raise" : "self-start border border-line"}`}>
            {line.text}
          </p>
        ))}
        {busy && <p className="text-sm text-faint">Reina is at the board.</p>}
      </div>
      <form onSubmit={(e) => void send(e)} className="flex gap-2 border-t border-line p-3">
        <label className="sr-only" htmlFor="reina-ask">
          Ask Reina
        </label>
        <input
          id="reina-ask"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask about the pocket"
          className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-raise px-3 text-sm"
        />
        <button type="submit" className="h-11 rounded-full bg-violet px-4 text-sm font-medium text-ink">
          Send
        </button>
      </form>
    </aside>
  );
}

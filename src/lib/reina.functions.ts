import { createServerFn } from "@tanstack/react-start";

type Mode = "chat" | "forge" | "section";

type Ask = {
  mode: Mode;
  text: string;
  context: string;
};

const SYSTEM = `You are Reina, the voice of I AM — Melitia Marie's house studio.
You teach like a producer standing at the board: specific, calm, short.
No hype. No corporate tone. No mention of other companies or products.
Talk about pocket, melody, words, and the room.
When the user asks for JSON, return only JSON with no markdown fence.`;

let windowStart = Date.now();
let calls = 0;

function overCap(): boolean {
  const now = Date.now();
  if (now - windowStart > 60_000) {
    windowStart = now;
    calls = 0;
  }
  calls += 1;
  return calls > 16;
}

function parseAsk(input: unknown): Ask {
  const raw = (input ?? {}) as Partial<Ask>;
  const mode: Mode = raw.mode === "forge" || raw.mode === "section" ? raw.mode : "chat";
  const text = typeof raw.text === "string" ? raw.text.slice(0, 900).trim() : "";
  const context = typeof raw.context === "string" ? raw.context.slice(0, 700) : "";
  if (!text) throw new Error("Say something first.");
  return { mode, text, context };
}

export const askReina = createServerFn({ method: "POST" })
  .validator(parseAsk)
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Reina can’t reach the wire from here." };
    if (overCap()) return { ok: false as const, error: "Reina needs a minute. The house is busy." };

    const user =
      data.mode === "forge"
        ? `Write a song draft as JSON only.
Schema: {"title":string,"bpm":number,"key":"C"|"D"|"F"|"G"|"A","pocket":"candle"|"afters"|"concrete"|"hymn","note":string,"sections":[{"name":string,"lines":[string,string]}]}
Four sections named Intro, Verse, Hook, Outro. Two short singable lines each.
Pocket meanings: candle = dusty swing, afters = half-time 808, concrete = four on the floor, hymn = slow and sparse.
Context: ${data.context}
Idea: ${data.text}`
        : data.mode === "section"
          ? `Rewrite only this song section. JSON only: {"lines":[string,string]}.
Two short singable lines. Keep the idea, change the wording.
Context: ${data.context}
Section idea: ${data.text}`
          : `Context: ${data.context}\nQuestion: ${data.text}\nAnswer in under 120 words.`;

    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-4.5",
          temperature: data.mode === "chat" ? 0.7 : 0.8,
          max_tokens: data.mode === "chat" ? 280 : 520,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: user },
          ],
        }),
      });
      if (!res.ok) return { ok: false as const, error: `Reina stepped out (${res.status}).` };
      const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = body.choices?.[0]?.message?.content?.trim() ?? "";
      if (!text) return { ok: false as const, error: "Reina came back quiet." };
      return { ok: true as const, text };
    } catch {
      return { ok: false as const, error: "The wire dropped." };
    }
  });

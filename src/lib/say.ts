export type Said = { title: string; fix: string; flip?: "in" };

export function sayError(error: unknown): Said {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : error && typeof error === "object" && "message" in error && typeof error.message === "string"
          ? error.message
          : "";
  const text = raw.replace(/\s+/g, " ").trim();
  const low = text.toLowerCase();

  if (low.includes("failed to fetch") || low.includes("networkerror") || low.includes("load failed") || low.includes("network request")) {
    return { title: "The house didn’t answer.", fix: "Check the connection, then try again. Nothing was lost." };
  }
  if (low.includes("unauthorized") || low.includes("sign in") || low.includes("not authenticated")) {
    return { title: "The door is shut.", fix: "Sign in, then do it again." };
  }
  if (low.includes("already") && (low.includes("exist") || low.includes("registered") || low.includes("email"))) {
    return { title: "That email already has a key.", fix: "Sign in with it. The door switched for you.", flip: "in" };
  }
  if (low.includes("invalid") && (low.includes("password") || low.includes("credential") || low.includes("email"))) {
    return { title: "That key doesn’t fit.", fix: "Check the email and password. If this is your first time, create the account." };
  }
  if (low.includes("at least 8") || low.includes("password") && low.includes("short")) {
    return { title: "The password is too short.", fix: "Use at least 8 characters, then try the door again." };
  }
  if (!text || text.length > 160 || /at\s+\w+\s+\(/.test(text) || low.includes("is not a function") || low.includes("cannot read")) {
    return {
      title: "The house stumbled.",
      fix: "Open it again. If it sticks, reload. The board and your credits stay on this device.",
    };
  }
  return { title: "That didn’t land.", fix: text };
}

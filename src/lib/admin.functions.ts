import { createMiddleware, createServerFn } from "@tanstack/react-start";

const withDesk = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const { getBearerToken } = await import("@/lib/auth/client");
    return next({ sendContext: { bearerToken: getBearerToken() ?? undefined } });
  })
  .server(async ({ next, context }) => {
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const { isHouseEmail } = await import("@/lib/admin.server");
    const token = (context as { bearerToken?: string }).bearerToken;
    const user = await getSessionUser(token);
    const email = user?.email?.toLowerCase() ?? null;
    return next({ context: { admin: !!email && isHouseEmail(email) } });
  });

export const deskGate = createServerFn({ method: "GET" })
  .middleware([withDesk])
  .handler(async ({ context }) => {
    return { admin: context.admin };
  });

function parseEmail(input: unknown): { email: string } {
  const raw = (input ?? {}) as { email?: unknown };
  const email = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
  return { email };
}

export const mayCutKey = createServerFn({ method: "POST" })
  .validator(parseEmail)
  .handler(async ({ data }) => {
    const { isHouseEmail } = await import("@/lib/admin.server");
    return { allowed: data.email.length > 0 && isHouseEmail(data.email) };
  });

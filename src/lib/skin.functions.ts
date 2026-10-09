import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";

export const SKINS = ["house", "candle", "alley", "ink", "chapel"] as const;
export type SkinId = (typeof SKINS)[number];

export function isSkin(value: string): value is SkinId {
  return (SKINS as readonly string[]).includes(value);
}

const withDesk = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const { getBearerToken } = await import("@/lib/auth/client");
    return next({ sendContext: { bearerToken: getBearerToken() ?? undefined } });
  })
  .server(async ({ next, context }) => {
    const { authConfigured, getSessionUser } = await import("@/lib/auth/verify.server");
    const { isHouseEmail } = await import("@/lib/admin.server");
    if (!authConfigured) return next({ context: { admin: true } });
    const token = (context as { bearerToken?: string }).bearerToken;
    const user = await getSessionUser(token);
    const email = user?.email?.toLowerCase() ?? null;
    return next({ context: { admin: !!email && isHouseEmail(email) } });
  });

export const getSkin = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const sql = await getSql();
    const rows = await sql<{ skin: string }>`select skin from house_skin where id = 'house' limit 1`;
    const skin = rows[0]?.skin ?? "house";
    return isSkin(skin) ? skin : "house";
  } catch {
    return "house" as const;
  }
});

export const setSkin = createServerFn({ method: "POST" })
  .middleware([withDesk])
  .validator((input: unknown) => {
    const skin = typeof (input as { skin?: unknown })?.skin === "string" ? (input as { skin: string }).skin : "";
    if (!isSkin(skin)) throw new Error("That skin is not in the house.");
    return { skin };
  })
  .handler(async ({ data, context }) => {
    if (!context.admin) throw new Error("The desk cuts the skin.");
    const sql = await getSql();
    await sql`
      insert into house_skin (id, skin) values ('house', ${data.skin})
      on conflict (id) do update set skin = ${data.skin}
    `;
    return { skin: data.skin };
  });

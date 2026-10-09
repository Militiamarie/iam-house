/** House desk allowlist. Server-only. Extra addresses: ADMIN_EMAILS=a@b.com,c@d.com */
export function isHouseEmail(email: string): boolean {
  const extra = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  const house = ["melissamariefernandez1990@gmail.com", ...extra];
  return house.includes(email.trim().toLowerCase());
}

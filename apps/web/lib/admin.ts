/**
 * 세션이 관리자(운영자)인지 판별.
 * ADMIN_EMAIL 또는 ADMIN_USERNAME(아이디) 중 하나와 일치하면 관리자.
 */
export function isAdmin(session: {
  user: { email?: string | null; username?: string | null };
} | null): boolean {
  if (!session) return false;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminUsername = process.env.ADMIN_USERNAME;
  const byEmail =
    typeof adminEmail === "string" &&
    adminEmail.length > 0 &&
    session.user.email === adminEmail;
  const byUsername =
    typeof adminUsername === "string" &&
    adminUsername.length > 0 &&
    session.user.username === adminUsername;
  return byEmail || byUsername;
}

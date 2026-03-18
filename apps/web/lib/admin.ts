type AdminSession = {
  user: {
    email?: string | null;
    username?: string | null;
    memberType?: string | null;
    member_type?: string | null;
  };
} | null;

/**
 * 세션이 주 관리자(env에 등록된 1명)인지 판별.
 * ADMIN_EMAIL 또는 ADMIN_USERNAME 중 하나와 일치할 때만 true. 운영자(memberType 'operator')는 제외.
 */
export function isPrimaryAdmin(session: AdminSession): boolean {
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

/**
 * 세션이 관리자(운영자)인지 판별.
 * - ADMIN_EMAIL 또는 ADMIN_USERNAME(아이디) 중 하나와 일치하면 관리자.
 * - 운영자 전용 인증키로 가입한 계정(memberType === 'operator')도 관리자.
 */
export function isAdmin(session: AdminSession): boolean {
  if (!session) return false;
  const memberType = session.user.memberType ?? session.user.member_type;
  if (memberType === "operator") return true;
  return isPrimaryAdmin(session);
}

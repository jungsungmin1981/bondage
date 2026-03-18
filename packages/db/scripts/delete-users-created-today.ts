/**
 * 오늘 가입한 모든 회원 및 연관 데이터 삭제.
 * 주 관리자(ADMIN_EMAIL/ADMIN_USERNAME)는 제외하고 삭제함.
 * 실행: pnpm --filter @workspace/db run db:delete-users-created-today
 */
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { eq, gte, inArray } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.join(__dirname, "..");

config({ path: path.join(pkgRoot, "../../.env") });
config({ path: path.join(pkgRoot, "../../apps/web/.env") });
config({ path: path.join(pkgRoot, ".env") });
config({ path: path.join(pkgRoot, "../../apps/web/.env.local"), override: true });

function startOfTodayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

function isAdminUser(email: string, username: string | null): boolean {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminUsername = process.env.ADMIN_USERNAME?.trim();
  if (adminEmail && email === adminEmail) return true;
  if (adminUsername && username && username === adminUsername) return true;
  return false;
}

async function main() {
  const { db } = await import("../src/client/node.js");
  const { users } = await import("../src/schema/user.js");
  const { sessions } = await import("../src/schema/session.js");
  const { accounts } = await import("../src/schema/account.js");
  const { verification } = await import("../src/schema/verification.js");
  const { inviteKeys } = await import("../src/schema/invite-key.js");
  const { memberProfiles } = await import("../src/schema/member-profile.js");

  const startOfToday = startOfTodayLocal();
  const todayUsers = await db
    .select()
    .from(users)
    .where(gte(users.createdAt, startOfToday));

  const toDelete = todayUsers.filter((u) => !isAdminUser(u.email, u.username));
  const skipped = todayUsers.filter((u) => isAdminUser(u.email, u.username));

  if (skipped.length > 0) {
    console.log("주 관리자(ADMIN_EMAIL/ADMIN_USERNAME) 계정은 삭제 대상에서 제외합니다.");
    skipped.forEach((u) => console.log(`  제외: ${u.username ?? u.email} (${u.email})`));
  }

  if (toDelete.length === 0) {
    console.log("삭제할 회원이 없습니다 (오늘 가입 회원 없음 또는 전부 관리자).");
    process.exit(0);
  }

  const userIds = toDelete.map((u) => u.id);
  const emails = toDelete.map((u) => u.email);
  const inviteKeyIds = toDelete.map((u) => u.inviteKeyId).filter((id): id is string => id != null);

  await db.delete(sessions).where(inArray(sessions.userId, userIds));
  await db.delete(accounts).where(inArray(accounts.userId, userIds));
  await db.delete(verification).where(inArray(verification.identifier, emails));
  await db.delete(memberProfiles).where(inArray(memberProfiles.userId, userIds));
  if (inviteKeyIds.length > 0) {
    for (const keyId of inviteKeyIds) {
      await db.update(inviteKeys).set({ usedAt: null }).where(eq(inviteKeys.id, keyId));
    }
  }
  await db.delete(users).where(inArray(users.id, userIds));

  console.log(`삭제 완료: 오늘 가입 회원 ${toDelete.length}명.`);
  toDelete.forEach((u) => console.log(`  - ${u.username ?? u.email} (${u.email})`));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

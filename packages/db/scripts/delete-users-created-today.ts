/**
 * 오늘 가입한 모든 회원 및 연관 데이터 삭제.
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

  if (todayUsers.length === 0) {
    console.log("오늘 가입한 회원이 없습니다.");
    process.exit(0);
  }

  const userIds = todayUsers.map((u) => u.id);
  const emails = todayUsers.map((u) => u.email);
  const inviteKeyIds = todayUsers.map((u) => u.inviteKeyId).filter((id): id is string => id != null);

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

  console.log(`삭제 완료: 오늘 가입 회원 ${todayUsers.length}명.`);
  todayUsers.forEach((u) => console.log(`  - ${u.username ?? u.email} (${u.email})`));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

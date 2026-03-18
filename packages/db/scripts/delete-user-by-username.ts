/**
 * username으로 사용자 및 연관 데이터 삭제 (재가입용).
 * 주 관리자(ADMIN_EMAIL/ADMIN_USERNAME)는 삭제하지 않음.
 * 실행: pnpm --filter @workspace/db run db:delete-user -- wjffkeh80
 */
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { eq } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.join(__dirname, "..");

config({ path: path.join(pkgRoot, "../../.env") });
config({ path: path.join(pkgRoot, "../../apps/web/.env") });
config({ path: path.join(pkgRoot, ".env") });
config({ path: path.join(pkgRoot, "../../apps/web/.env.local"), override: true });

const USERNAME = process.argv[2] ?? "wjffkeh80";

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

  const [user] = await db.select().from(users).where(eq(users.username, USERNAME)).limit(1);
  if (!user) {
    console.warn(`사용자를 찾을 수 없습니다: username="${USERNAME}"`);
    process.exit(1);
  }

  if (isAdminUser(user.email, user.username)) {
    console.warn(
      "주 관리자(ADMIN_EMAIL/ADMIN_USERNAME) 계정은 삭제할 수 없습니다. 해당 사용자는 건너뜁니다.",
    );
    process.exit(1);
  }

  const userId = user.id;
  await db.delete(sessions).where(eq(sessions.userId, userId));
  await db.delete(accounts).where(eq(accounts.userId, userId));
  await db.delete(verification).where(eq(verification.identifier, user.email));
  await db.delete(memberProfiles).where(eq(memberProfiles.userId, userId));
  if (user.inviteKeyId) {
    await db.update(inviteKeys).set({ usedAt: null }).where(eq(inviteKeys.id, user.inviteKeyId));
  }
  await db.delete(users).where(eq(users.id, userId));

  console.log(`삭제 완료: ${USERNAME} (${user.email}). 동일 인증키로 재가입 가능합니다.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

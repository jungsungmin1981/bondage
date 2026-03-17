/**
 * 관리자 계정(ADMIN_EMAIL 또는 ADMIN_USERNAME)의 월간 핫픽 투표 기록 삭제.
 * 실행: pnpm --filter @workspace/db run db:delete-admin-hotpick-votes
 */
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { and, eq, or } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.join(__dirname, "..");

config({ path: path.join(pkgRoot, "../../.env") });
config({ path: path.join(pkgRoot, "../../apps/web/.env") });
config({ path: path.join(pkgRoot, ".env") });
config({ path: path.join(pkgRoot, "../../apps/web/.env.local"), override: true });

async function main() {
  const { db } = await import("../src/client/node.js");
  const { users } = await import("../src/schema/user.js");
  const { monthlyHotpickVotes } = await import("../src/schema/monthly-hotpick.js");

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminUsername = process.env.ADMIN_USERNAME;

  const conditions = [];
  if (typeof adminEmail === "string" && adminEmail.length > 0) {
    conditions.push(eq(users.email, adminEmail));
  }
  if (typeof adminUsername === "string" && adminUsername.length > 0) {
    conditions.push(eq(users.username, adminUsername));
  }
  if (conditions.length === 0) {
    console.warn("ADMIN_EMAIL 또는 ADMIN_USERNAME이 설정되지 않았습니다.");
    process.exit(1);
  }

  const [admin] = await db
    .select({ id: users.id, email: users.email, username: users.username })
    .from(users)
    .where(or(...conditions))
    .limit(1);

  if (!admin) {
    console.warn("관리자 계정을 찾을 수 없습니다.");
    process.exit(1);
  }

  const deleted = await db
    .delete(monthlyHotpickVotes)
    .where(eq(monthlyHotpickVotes.voterUserId, admin.id))
    .returning({ id: monthlyHotpickVotes.id });

  console.log(
    `관리자 투표 삭제 완료: ${admin.username ?? admin.email} (user id: ${admin.id}), 삭제된 투표 ${deleted.length}건`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

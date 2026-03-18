/**
 * username에 해당하는 운영진 프로필을 승인 대기(status: pending)로 변경.
 * 실행: pnpm --filter @workspace/db run db:set-operator-pending -- sub01
 */
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { and, eq } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.join(__dirname, "..");

config({ path: path.join(pkgRoot, "../../.env") });
config({ path: path.join(pkgRoot, "../../apps/web/.env") });
config({ path: path.join(pkgRoot, ".env") });
config({ path: path.join(pkgRoot, "../../apps/web/.env.local"), override: true });

const USERNAME = process.argv[2] ?? "sub01";

async function main() {
  const { db } = await import("../src/client/node.js");
  const { users } = await import("../src/schema/user.js");
  const { memberProfiles } = await import("../src/schema/member-profile.js");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, USERNAME))
    .limit(1);
  if (!user) {
    console.warn(`사용자를 찾을 수 없습니다: username="${USERNAME}"`);
    process.exit(1);
  }

  const updated = await db
    .update(memberProfiles)
    .set({ status: "pending", updatedAt: new Date() })
    .where(
      and(
        eq(memberProfiles.userId, user.id),
        eq(memberProfiles.memberType, "operator"),
      ),
    )
    .returning({ id: memberProfiles.id, status: memberProfiles.status });

  if (updated.length === 0) {
    console.warn(
      `운영진 프로필을 찾을 수 없습니다: username="${USERNAME}" (member_type=operator인 프로필이 없습니다)`,
    );
    process.exit(1);
  }

  console.log(
    `운영진 승인 대기로 변경 완료: username="${USERNAME}", profileId=${updated[0].id}`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

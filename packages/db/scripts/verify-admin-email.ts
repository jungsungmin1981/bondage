/**
 * 관리자 계정(wjffkeh) 이메일 인증 처리.
 * 실행: pnpm --filter @workspace/db run db:verify-admin-email
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

const ADMIN_USERNAME = "wjffkeh";

async function main() {
  const { db } = await import("../src/client/node.js");
  const { users } = await import("../src/schema/user.js");

  const result = await db
    .update(users)
    .set({ emailVerified: true })
    .where(eq(users.username, ADMIN_USERNAME))
    .returning({ id: users.id, email: users.email, username: users.username });

  if (result.length === 0) {
    console.warn(`사용자를 찾을 수 없습니다: username="${ADMIN_USERNAME}"`);
    process.exit(1);
  }
  console.log(`이메일 인증 처리 완료: ${result[0].username} (${result[0].email})`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * 가입된 전체 회원 이메일 인증 완료 처리.
 * 실행: pnpm --filter @workspace/db run db:verify-all-users-email
 */
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.join(__dirname, "..");

config({ path: path.join(pkgRoot, "../../.env") });
config({ path: path.join(pkgRoot, "../../apps/web/.env") });
config({ path: path.join(pkgRoot, ".env") });
config({ path: path.join(pkgRoot, "../../apps/web/.env.local"), override: true });

async function main() {
  const { db } = await import("../src/client/node.js");
  const { users } = await import("../src/schema/user.js");

  const result = await db
    .update(users)
    .set({ emailVerified: true })
    .returning({ id: users.id, email: users.email, username: users.username });

  console.log(`이메일 인증 완료 처리: ${result.length}명`);
  if (result.length > 0) {
    result.forEach((r) => {
      console.log(`  - ${r.username ?? r.id} (${r.email})`);
    });
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

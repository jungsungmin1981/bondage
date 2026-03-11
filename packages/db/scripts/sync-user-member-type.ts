/**
 * member_profiles에 있는데 users.member_type이 비어 있는 경우 동기화.
 * 한 번 실행: pnpm --filter @workspace/db exec tsx scripts/sync-user-member-type.ts
 */
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { sql } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.join(__dirname, "..");

config({ path: path.join(pkgRoot, "../../.env") });
config({ path: path.join(pkgRoot, "../../apps/web/.env") });
config({ path: path.join(pkgRoot, ".env") });
config({ path: path.join(pkgRoot, "../../apps/web/.env.local"), override: true });

async function main() {
  const { db } = await import("../src/client/node.js");

  await db.execute(sql`
    UPDATE users u
    SET member_type = p.member_type, updated_at = now()
    FROM member_profiles p
    WHERE p.user_id = u.id AND (u.member_type IS NULL OR u.member_type = '')
  `);
  console.log("sync-user-member-type: 완료.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

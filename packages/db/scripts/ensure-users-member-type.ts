/**
 * users 테이블에 member_type 컬럼이 없으면 추가.
 * Better Auth "column member_type does not exist" 발생 시 실행:
 *   pnpm --filter @workspace/db run db:ensure-users-member-type
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

  const exists = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'member_type'
  `);

  if (Array.isArray(exists) && exists.length > 0) {
    console.log("users.member_type 컬럼이 이미 존재합니다.");
    process.exit(0);
  }

  console.log("users.member_type 컬럼 추가 중...");
  await db.execute(sql`ALTER TABLE "users" ADD COLUMN "member_type" text`);
  console.log("users.member_type 컬럼 추가 완료.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

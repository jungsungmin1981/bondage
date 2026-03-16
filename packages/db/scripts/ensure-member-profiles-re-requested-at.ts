/**
 * member_profiles 테이블에 re_requested_at 컬럼이 없으면 추가.
 * "column re_requested_at does not exist" 발생 시 실행:
 *   pnpm --filter @workspace/db run db:ensure-member-profiles-re-requested-at
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

const COLUMN = "re_requested_at";

async function main() {
  const { db } = await import("../src/client/node.js");

  const exists = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'member_profiles' AND column_name = ${COLUMN}
  `);
  if (Array.isArray(exists) && exists.length > 0) {
    console.log(`member_profiles.${COLUMN} 이미 존재`);
    process.exit(0);
    return;
  }
  await db.execute(sql.raw(`ALTER TABLE "member_profiles" ADD COLUMN "${COLUMN}" timestamp`));
  console.log(`member_profiles.${COLUMN} 추가 완료`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

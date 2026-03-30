/**
 * member_profiles 테이블에 tier_manual_override 컬럼이 없으면 추가.
 *   - tier_manual_override : 관리자가 수동으로 등급/별을 변경한 경우 true
 *
 * 실행:
 *   pnpm --filter @workspace/db run db:ensure-member-profiles-tier-manual-override
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

async function columnExists(db: Awaited<ReturnType<typeof import("../src/client/node.js")>>["db"], column: string): Promise<boolean> {
  const rows = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'member_profiles' AND column_name = ${column}
  `);
  return Array.isArray(rows) && rows.length > 0;
}

async function main() {
  const { db } = await import("../src/client/node.js");

  const col = "tier_manual_override";
  if (await columnExists(db, col)) {
    console.log(`member_profiles.${col} 이미 존재`);
  } else {
    await db.execute(sql.raw(`ALTER TABLE "member_profiles" ADD COLUMN "${col}" boolean NOT NULL DEFAULT false`));
    console.log(`member_profiles.${col} 추가 완료`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

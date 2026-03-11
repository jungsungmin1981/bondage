/**
 * member_profiles 테이블에 상세 컬럼(division, bunny_recruit 등)이 없으면 추가.
 * "column division does not exist" 발생 시 실행:
 *   pnpm --filter @workspace/db run db:ensure-member-profiles-detail-columns
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

const DETAIL_COLUMNS = [
  "division",
  "bunny_recruit",
  "bondage_rating",
  "activity_region",
  "style",
] as const;

async function main() {
  const { db } = await import("../src/client/node.js");

  for (const col of DETAIL_COLUMNS) {
    const exists = await db.execute<{ n: number }>(sql`
      SELECT 1 AS n FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'member_profiles' AND column_name = ${col}
    `);
    if (Array.isArray(exists) && exists.length > 0) {
      console.log(`member_profiles.${col} 이미 존재`);
      continue;
    }
    await db.execute(sql.raw(`ALTER TABLE "member_profiles" ADD COLUMN "${col}" text`));
    console.log(`member_profiles.${col} 추가 완료`);
  }

  console.log("완료.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

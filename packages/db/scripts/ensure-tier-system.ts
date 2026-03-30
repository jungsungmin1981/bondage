/**
 * member_profiles에 tier/stars 컬럼 추가 + tier_conditions 테이블 생성 및 기본값 삽입.
 * 실행: pnpm --filter @workspace/db tsx scripts/ensure-tier-system.ts
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

  // 1. member_profiles.tier
  const hasTier = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'member_profiles' AND column_name = 'tier'
  `);
  if (!Array.isArray(hasTier) || hasTier.length === 0) {
    console.log("member_profiles.tier 컬럼 추가 중...");
    await db.execute(sql`ALTER TABLE "member_profiles" ADD COLUMN "tier" text NOT NULL DEFAULT 'bronze'`);
    console.log("완료.");
  } else {
    console.log("member_profiles.tier 이미 존재.");
  }

  // 2. member_profiles.stars
  const hasStars = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'member_profiles' AND column_name = 'stars'
  `);
  if (!Array.isArray(hasStars) || hasStars.length === 0) {
    console.log("member_profiles.stars 컬럼 추가 중...");
    await db.execute(sql`ALTER TABLE "member_profiles" ADD COLUMN "stars" integer NOT NULL DEFAULT 0`);
    console.log("완료.");
  } else {
    console.log("member_profiles.stars 이미 존재.");
  }

  // 3. tier_conditions 테이블
  const hasTable = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tier_conditions'
  `);
  if (!Array.isArray(hasTable) || hasTable.length === 0) {
    console.log("tier_conditions 테이블 생성 중...");
    await db.execute(sql`
      CREATE TABLE "tier_conditions" (
        "id" text PRIMARY KEY NOT NULL,
        "tier" text NOT NULL DEFAULT 'bronze',
        "condition_type" text NOT NULL,
        "threshold" integer NOT NULL DEFAULT 0,
        "star_index" integer NOT NULL,
        "label" text NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`CREATE INDEX "tier_conditions_tier_idx" ON "tier_conditions" ("tier")`);
    await db.execute(sql`CREATE INDEX "tier_conditions_star_index_idx" ON "tier_conditions" ("star_index")`);

    // 기본 브론즈 조건 삽입
    await db.execute(sql`
      INSERT INTO "tier_conditions" ("id", "tier", "condition_type", "threshold", "star_index", "label") VALUES
        ('bronze-1', 'bronze', 'first_post',       1,  1, '공개 게시물 최초 등록'),
        ('bronze-2', 'bronze', 'total_likes',      10, 2, '좋아요 10개 이상'),
        ('bronze-3', 'bronze', 'total_likes',      20, 3, '좋아요 20개 이상'),
        ('bronze-4', 'bronze', 'total_likes',      30, 4, '좋아요 30개 이상'),
        ('bronze-5', 'bronze', 'class_clear_rate', 50, 5, '초급 클래스 클리어율 50% 이상')
    `);
    console.log("tier_conditions 테이블 생성 및 기본값 삽입 완료.");
  } else {
    console.log("tier_conditions 테이블 이미 존재.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

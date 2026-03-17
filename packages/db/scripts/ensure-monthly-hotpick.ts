/**
 * monthly_hotpick_submissions, monthly_hotpick_votes 테이블 생성.
 * 실행: pnpm --filter @workspace/db run db:ensure-monthly-hotpick
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

  const subsExists = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'monthly_hotpick_submissions'
  `);

  if (!Array.isArray(subsExists) || subsExists.length === 0) {
    console.log("monthly_hotpick_submissions 테이블 생성 중...");
    await db.execute(sql`
      CREATE TABLE "monthly_hotpick_submissions" (
        "id" text PRIMARY KEY NOT NULL,
        "month" text NOT NULL,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "image_url" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp,
        UNIQUE("month", "user_id")
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "monthly_hotpick_submissions_month_idx"
      ON "monthly_hotpick_submissions" ("month")
    `);
    console.log("monthly_hotpick_submissions 테이블 생성 완료.");
  } else {
    console.log("monthly_hotpick_submissions 테이블이 이미 존재합니다.");
    const hasUpdatedAt = await db.execute<{ n: number }>(sql`
      SELECT 1 AS n FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'monthly_hotpick_submissions' AND column_name = 'updated_at'
    `);
    if (!Array.isArray(hasUpdatedAt) || hasUpdatedAt.length === 0) {
      console.log("monthly_hotpick_submissions.updated_at 컬럼 추가 중...");
      await db.execute(sql`ALTER TABLE "monthly_hotpick_submissions" ADD COLUMN "updated_at" timestamp`);
      await db.execute(sql`UPDATE "monthly_hotpick_submissions" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL`);
      console.log("updated_at 컬럼 추가 및 backfill 완료.");
    }
  }

  const votesExists = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'monthly_hotpick_votes'
  `);

  if (!Array.isArray(votesExists) || votesExists.length === 0) {
    console.log("monthly_hotpick_votes 테이블 생성 중...");
    await db.execute(sql`
      CREATE TABLE "monthly_hotpick_votes" (
        "id" text PRIMARY KEY NOT NULL,
        "submission_id" text NOT NULL REFERENCES "monthly_hotpick_submissions"("id") ON DELETE CASCADE,
        "voter_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "created_at" timestamp DEFAULT now() NOT NULL,
        UNIQUE("submission_id", "voter_user_id")
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "monthly_hotpick_votes_submission_id_idx"
      ON "monthly_hotpick_votes" ("submission_id")
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "monthly_hotpick_votes_voter_user_id_idx"
      ON "monthly_hotpick_votes" ("voter_user_id")
    `);
    console.log("monthly_hotpick_votes 테이블 생성 완료.");
  } else {
    console.log("monthly_hotpick_votes 테이블이 이미 존재합니다.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * class_challenge_approvals 테이블이 없으면 생성.
 * pnpm --filter @workspace/db run db:ensure-class-challenge-approvals
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
    SELECT 1 AS n FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'class_challenge_approvals'
  `);

  if (Array.isArray(exists) && exists.length > 0) {
    console.log("class_challenge_approvals 테이블이 이미 존재합니다.");
    process.exit(0);
  }

  console.log("class_challenge_approvals 테이블 생성 중...");
  await db.execute(sql`
    CREATE TABLE "class_challenge_approvals" (
      "challenge_id" text NOT NULL REFERENCES "class_challenges"("id") ON DELETE CASCADE,
      "staff_user_id" text NOT NULL,
      "decision" text NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      PRIMARY KEY ("challenge_id", "staff_user_id")
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "class_challenge_approvals_challenge_id_idx" ON "class_challenge_approvals" ("challenge_id")
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "class_challenge_approvals_staff_user_id_idx" ON "class_challenge_approvals" ("staff_user_id")
  `);

  console.log("class_challenge_approvals 테이블 생성 완료.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

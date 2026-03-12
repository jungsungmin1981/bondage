/**
 * 앱과 동일한 .env 로드 후, class_challenges 테이블이 없으면 생성.
 * "relation class_challenges does not exist" 발생 시 실행:
 * pnpm --filter @workspace/db run db:ensure-class-challenges
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
    WHERE table_schema = 'public' AND table_name = 'class_challenges'
  `);

  if (Array.isArray(exists) && exists.length > 0) {
    console.log("class_challenges 테이블이 이미 존재합니다.");
    process.exit(0);
  }

  console.log("class_challenges 테이블 생성 중...");
  await db.execute(sql`
    CREATE TABLE "class_challenges" (
      "id" text PRIMARY KEY NOT NULL,
      "class_post_id" text NOT NULL,
      "user_id" text NOT NULL,
      "note" text NOT NULL,
      "image_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
      "status" text DEFAULT 'pending' NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "class_challenges_class_post_id_idx" ON "class_challenges" ("class_post_id")
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "class_challenges_user_id_idx" ON "class_challenges" ("user_id")
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "class_challenges_user_post_unique" ON "class_challenges" ("user_id", "class_post_id")
  `);

  console.log("class_challenges 테이블 생성 완료.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

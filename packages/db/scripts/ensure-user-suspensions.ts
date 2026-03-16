/**
 * user_suspensions 테이블 생성.
 * 실행: pnpm --filter @workspace/db run db:ensure-user-suspensions
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

  const tableExists = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_suspensions'
  `);

  if (!Array.isArray(tableExists) || tableExists.length === 0) {
    console.log("user_suspensions 테이블 생성 중...");
    await db.execute(sql`
      CREATE TABLE "user_suspensions" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "suspended_until" timestamp,
        "reason" text,
        "created_by_user_id" text REFERENCES "users"("id"),
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "user_suspensions_user_id_idx"
      ON "user_suspensions" ("user_id")
    `);
    console.log("user_suspensions 테이블 생성 완료.");
  } else {
    console.log("user_suspensions 테이블이 이미 존재합니다.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

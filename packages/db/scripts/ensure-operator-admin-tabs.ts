/**
 * operator_admin_tabs 테이블 생성.
 * 실행: pnpm --filter @workspace/db run db:ensure-operator-admin-tabs
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
    WHERE table_schema = 'public' AND table_name = 'operator_admin_tabs'
  `);
  if (!Array.isArray(exists) || exists.length === 0) {
    console.log("operator_admin_tabs 테이블 생성 중...");
    await db.execute(sql`
      CREATE TABLE "operator_admin_tabs" (
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "tab_id" text NOT NULL,
        PRIMARY KEY ("user_id", "tab_id")
      )
    `);
    console.log("operator_admin_tabs 테이블 생성 완료.");
  } else {
    console.log("operator_admin_tabs 테이블이 이미 존재합니다.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * direct_messages 테이블이 없으면 생성.
 * 실행:
 *   pnpm --filter @workspace/db run db:ensure-direct-messages
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
    WHERE table_schema = 'public' AND table_name = 'direct_messages'
  `);
  if (Array.isArray(exists) && exists.length > 0) {
    console.log("direct_messages 이미 존재");
    process.exit(0);
    return;
  }

  await db.execute(sql.raw(`
    CREATE TABLE "direct_messages" (
      "id" text PRIMARY KEY,
      "from_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "to_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "body" text NOT NULL,
      "read_at" timestamp,
      "created_at" timestamp NOT NULL DEFAULT now()
    );
  `));
  await db.execute(sql.raw(`
    CREATE INDEX "direct_messages_to_user_id_created_at_idx"
    ON "direct_messages" ("to_user_id", "created_at");
  `));
  await db.execute(sql.raw(`
    CREATE INDEX "direct_messages_from_user_id_created_at_idx"
    ON "direct_messages" ("from_user_id", "created_at");
  `));

  console.log("direct_messages 생성 완료");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


/**
 * direct_messages 테이블에 class_post_id 컬럼이 없으면 추가.
 * 실행:
 *   pnpm --filter @workspace/db run db:ensure-direct-messages-class-post-id
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

const COLUMN = "class_post_id";

async function main() {
  const { db } = await import("../src/client/node.js");

  const exists = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'direct_messages' AND column_name = ${COLUMN}
  `);
  if (Array.isArray(exists) && exists.length > 0) {
    console.log(`direct_messages.${COLUMN} 이미 존재`);
    process.exit(0);
    return;
  }
  await db.execute(
    sql.raw(
      `ALTER TABLE "direct_messages" ADD COLUMN "${COLUMN}" text REFERENCES "class_posts"("id") ON DELETE SET NULL`,
    ),
  );
  console.log(`direct_messages.${COLUMN} 추가 완료`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

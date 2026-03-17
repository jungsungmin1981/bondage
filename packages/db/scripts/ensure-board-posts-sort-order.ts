/**
 * bunny_board_posts, shared_board_posts에 sort_order 컬럼 추가.
 * 실행: pnpm --filter @workspace/db run db:ensure-board-posts-sort-order
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

  for (const table of ["bunny_board_posts", "shared_board_posts"] as const) {
    const colExists = await db.execute<{ n: number }>(sql`
      SELECT 1 AS n FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${table} AND column_name = 'sort_order'
    `);

    if (!Array.isArray(colExists) || colExists.length === 0) {
      console.log(`${table}.sort_order 컬럼 추가 중...`);
      await db.execute(
        sql.raw(
          `ALTER TABLE "${table}" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL`,
        ),
      );
      console.log(`${table}.sort_order 컬럼 추가 완료.`);
    } else {
      console.log(`${table}.sort_order 컬럼이 이미 존재합니다.`);
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * site_config 테이블이 없으면 생성.
 *
 * 실행:
 *   pnpm --filter @workspace/db run db:ensure-site-config
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

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS site_config (
      key text PRIMARY KEY,
      value text NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL
    )
  `);
  console.log("site_config 테이블 생성 완료 (이미 있으면 건너뜀)");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });

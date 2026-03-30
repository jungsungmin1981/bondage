/**
 * silver-5: class_clear_rate → intermediate_class_clear (중급 클래스)
 * gold-5:   class_clear_rate → advanced_class_clear (고급 클래스)
 *
 * 실행: pnpm --filter @workspace/db run db:update-tier-conditions-class-level
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
    UPDATE tier_conditions
    SET condition_type = 'intermediate_class_clear',
        label = '중급 클래스 클리어율 70% 이상'
    WHERE id = 'silver-5'
  `);
  console.log("silver-5: intermediate_class_clear 로 변경 완료");

  await db.execute(sql`
    UPDATE tier_conditions
    SET condition_type = 'advanced_class_clear',
        label = '고급 클래스 클리어율 90% 이상'
    WHERE id = 'gold-5'
  `);
  console.log("gold-5: advanced_class_clear 로 변경 완료");

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });

/**
 * 실버/골드/레전드 tier_conditions 기본값 삽입.
 * 실행: pnpm --filter @workspace/db tsx scripts/ensure-tier-conditions-all.ts
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

const newConditions = [
  // 실버
  { id: "silver-1", tier: "silver", conditionType: "post_count",       threshold: 3,    starIndex: 1, label: "공개 게시물 3개 이상" },
  { id: "silver-2", tier: "silver", conditionType: "total_likes",       threshold: 50,   starIndex: 2, label: "좋아요 50개 이상" },
  { id: "silver-3", tier: "silver", conditionType: "total_likes",       threshold: 100,  starIndex: 3, label: "좋아요 100개 이상" },
  { id: "silver-4", tier: "silver", conditionType: "total_likes",       threshold: 150,  starIndex: 4, label: "좋아요 150개 이상" },
  { id: "silver-5", tier: "silver", conditionType: "class_clear_rate",  threshold: 70,   starIndex: 5, label: "초급 클래스 클리어율 70% 이상" },
  // 골드
  { id: "gold-1",   tier: "gold",   conditionType: "post_count",        threshold: 10,   starIndex: 1, label: "공개 게시물 10개 이상" },
  { id: "gold-2",   tier: "gold",   conditionType: "total_likes",       threshold: 200,  starIndex: 2, label: "좋아요 200개 이상" },
  { id: "gold-3",   tier: "gold",   conditionType: "total_likes",       threshold: 300,  starIndex: 3, label: "좋아요 300개 이상" },
  { id: "gold-4",   tier: "gold",   conditionType: "total_likes",       threshold: 400,  starIndex: 4, label: "좋아요 400개 이상" },
  { id: "gold-5",   tier: "gold",   conditionType: "class_clear_rate",  threshold: 90,   starIndex: 5, label: "초급 클래스 클리어율 90% 이상" },
  // 레전드
  { id: "legend-1", tier: "legend", conditionType: "post_count",        threshold: 20,   starIndex: 1, label: "공개 게시물 20개 이상" },
  { id: "legend-2", tier: "legend", conditionType: "total_likes",       threshold: 500,  starIndex: 2, label: "좋아요 500개 이상" },
  { id: "legend-3", tier: "legend", conditionType: "total_likes",       threshold: 1000, starIndex: 3, label: "좋아요 1000개 이상" },
  { id: "legend-4", tier: "legend", conditionType: "total_likes",       threshold: 2000, starIndex: 4, label: "좋아요 2000개 이상" },
  { id: "legend-5", tier: "legend", conditionType: "class_clear_rate",  threshold: 100,  starIndex: 5, label: "초급 클래스 클리어율 100% 이상" },
];

async function main() {
  const { db } = await import("../src/client/node.js");

  for (const c of newConditions) {
    const exists = await db.execute<{ n: number }>(sql`
      SELECT 1 AS n FROM tier_conditions WHERE id = ${c.id}
    `);
    if (Array.isArray(exists) && exists.length > 0) {
      console.log(`${c.id} 이미 존재 — 건너뜀`);
      continue;
    }
    await db.execute(sql`
      INSERT INTO tier_conditions (id, tier, condition_type, threshold, star_index, label)
      VALUES (${c.id}, ${c.tier}, ${c.conditionType}, ${c.threshold}, ${c.starIndex}, ${c.label})
    `);
    console.log(`${c.id} 삽입 완료`);
  }
  console.log("완료");
}

main().catch((e) => { console.error(e); process.exit(1); });

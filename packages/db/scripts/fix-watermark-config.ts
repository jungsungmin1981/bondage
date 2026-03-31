/**
 * DB의 watermark_config를 텍스트 타입 기본값으로 교체합니다.
 * 실행: pnpm --filter @workspace/db run db:fix-watermark-config
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

  const newConfig = JSON.stringify({
    type: "text",
    text: "워터마크",
    positionX: 0.5,
    positionY: 0.05,
    opacity: 1,
    scale: 1.8,
    rotation: 0,
  });

  await db.execute(sql`
    INSERT INTO site_config (key, value, updated_at)
    VALUES ('watermark_config', ${newConfig}, now())
    ON CONFLICT (key) DO UPDATE SET value = ${newConfig}, updated_at = now()
  `);
  console.log("워터마크 설정 업데이트 완료:", newConfig);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });

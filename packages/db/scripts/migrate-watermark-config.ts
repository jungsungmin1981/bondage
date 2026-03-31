/**
 * 기존 watermark-config.json 설정을 DB site_config 테이블로 마이그레이션.
 * 실행: pnpm --filter @workspace/db run db:migrate-watermark-config
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

  // 이미 DB에 설정이 있으면 건너뜀
  const existing = await db.execute<{ value: string }>(sql`
    SELECT value FROM site_config WHERE key = 'watermark_config' LIMIT 1
  `);
  if (Array.isArray(existing) && existing.length > 0) {
    console.log("이미 DB에 워터마크 설정 존재 — 건너뜀");
    console.log("현재 값:", existing[0].value);
    process.exit(0);
  }

  // 기본값으로 설정 삽입 (opacity 0.5 = 반투명)
  const defaultConfig = JSON.stringify({
    type: "text",
    text: "워터마크",
    positionX: 0.5,
    positionY: 0.05,
    opacity: 0.5,
    scale: 1.8,
    rotation: 0,
  });

  await db.execute(sql`
    INSERT INTO site_config (key, value, updated_at)
    VALUES ('watermark_config', ${defaultConfig}, now())
    ON CONFLICT (key) DO UPDATE SET value = ${defaultConfig}, updated_at = now()
  `);
  console.log("워터마크 설정 DB 마이그레이션 완료:", defaultConfig);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });

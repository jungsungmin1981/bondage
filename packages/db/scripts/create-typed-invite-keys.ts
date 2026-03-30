/**
 * 리거 전용 / 버니 전용 재사용 가능 초대키 생성 (각 999회)
 * 실행: pnpm --filter @workspace/db run db:create-typed-invite-keys
 */
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.join(__dirname, "..");

config({ path: path.join(pkgRoot, "../../.env") });
config({ path: path.join(pkgRoot, "../../apps/web/.env") });
config({ path: path.join(pkgRoot, ".env") });
config({ path: path.join(pkgRoot, "../../apps/web/.env.local"), override: true });

async function main() {
  const { db } = await import("../src/client/node.js");

  const year = new Date().getFullYear();
  const riggerSuffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  const bunnySuffix  = Math.random().toString(36).slice(2, 6).toUpperCase();
  const riggerKey = `RIGGER${year}-${riggerSuffix}`;
  const bunnyKey  = `BUNNY${year}-${bunnySuffix}`;

  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  const expiresStr = expiresAt.toISOString();

  await db.execute(sql`
    INSERT INTO invite_keys (id, key, member_type, max_uses, used_count, expires_at, created_at)
    VALUES (${randomUUID()}, ${riggerKey}, 'rigger', 999, 0, ${expiresStr}, NOW())
  `);

  await db.execute(sql`
    INSERT INTO invite_keys (id, key, member_type, max_uses, used_count, expires_at, created_at)
    VALUES (${randomUUID()}, ${bunnyKey}, 'bunny', 999, 0, ${expiresStr}, NOW())
  `);

  const expires = expiresAt.toLocaleDateString("ko-KR");

  console.log("\n✅ 초대키 생성 완료!\n");
  console.log(`[리거 전용]`);
  console.log(`  키    : ${riggerKey}`);
  console.log(`  만료  : ${expires} (1년)`);
  console.log(`  최대  : 999회 사용 가능`);
  console.log(`  URL   : https://www.bondage.co.kr/register?invite=${riggerKey}`);
  console.log();
  console.log(`[버니 전용]`);
  console.log(`  키    : ${bunnyKey}`);
  console.log(`  만료  : ${expires} (1년)`);
  console.log(`  최대  : 999회 사용 가능`);
  console.log(`  URL   : https://www.bondage.co.kr/register?invite=${bunnyKey}`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

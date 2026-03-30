/**
 * invite_keys 테이블에 max_uses, used_count 컬럼 추가.
 * 실행: pnpm --filter @workspace/db run db:ensure-invite-keys-reusable
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

  // max_uses 컬럼 추가
  const maxUsesExists = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invite_keys' AND column_name = 'max_uses'
  `);
  if (!Array.isArray(maxUsesExists) || maxUsesExists.length === 0) {
    console.log("invite_keys.max_uses 컬럼 추가 중...");
    await db.execute(sql`ALTER TABLE "invite_keys" ADD COLUMN "max_uses" integer`);
    console.log("invite_keys.max_uses 컬럼 추가 완료.");
  } else {
    console.log("invite_keys.max_uses 컬럼이 이미 존재합니다.");
  }

  // used_count 컬럼 추가
  const usedCountExists = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invite_keys' AND column_name = 'used_count'
  `);
  if (!Array.isArray(usedCountExists) || usedCountExists.length === 0) {
    console.log("invite_keys.used_count 컬럼 추가 중...");
    await db.execute(sql`ALTER TABLE "invite_keys" ADD COLUMN "used_count" integer NOT NULL DEFAULT 0`);
    console.log("invite_keys.used_count 컬럼 추가 완료.");
  } else {
    console.log("invite_keys.used_count 컬럼이 이미 존재합니다.");
  }

  // 기존에 usedAt이 있는 키는 used_count = 1로 동기화
  await db.execute(sql`
    UPDATE "invite_keys" SET "used_count" = 1 WHERE "used_at" IS NOT NULL AND "used_count" = 0
  `);
  console.log("기존 사용된 키 used_count 동기화 완료.");

  // 방금 생성한 공용 키(memberType IS NULL, used_at IS NULL)에 max_uses = 999 설정
  const updated = await db.execute<{ key: string }>(sql`
    UPDATE "invite_keys"
    SET "max_uses" = 999
    WHERE "member_type" IS NULL
      AND "used_at" IS NULL
      AND ("max_uses" IS NULL OR "max_uses" = 0)
    RETURNING key
  `);
  if (Array.isArray(updated) && updated.length > 0) {
    console.log(`공용 키 max_uses=999 설정 완료: ${updated.map((r) => r.key).join(", ")}`);
  }

  console.log("\n✅ 마이그레이션 완료!");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

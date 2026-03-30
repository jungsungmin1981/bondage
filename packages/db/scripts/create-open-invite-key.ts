/**
 * memberType = null 인 공용 초대키 생성.
 * 가입 시 리거/버니 선택 화면이 표시됨.
 * 실행: pnpm --filter @workspace/db run db:create-open-invite-key
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

  // 기존에 미사용 공용 키가 있으면 표시만 하고 종료
  const existing = await db.execute<{ key: string; expires_at: Date }>(sql`
    SELECT key, expires_at FROM invite_keys
    WHERE member_type IS NULL
      AND used_at IS NULL
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 5
  `);

  if (Array.isArray(existing) && existing.length > 0) {
    console.log("기존 공용 초대키 (미사용):");
    for (const row of existing) {
      console.log(`  키: ${row.key}  |  만료: ${row.expires_at}`);
    }
    console.log("\n새 키도 추가로 생성합니다...");
  }

  const id = randomUUID();
  // 직관적이고 입력하기 쉬운 키 (현재 연도 포함)
  const year = new Date().getFullYear();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  const key = `BOND${year}-${suffix}`;

  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1년 후 만료

  await db.execute(sql`
    INSERT INTO invite_keys (id, key, member_type, expires_at, created_at)
    VALUES (${id}, ${key}, NULL, ${expiresAt.toISOString()}, NOW())
  `);

  console.log("\n✅ 공용 초대키 생성 완료!");
  console.log(`  키 값  : ${key}`);
  console.log(`  만료일 : ${expiresAt.toLocaleDateString("ko-KR")}`);
  console.log(`  용도   : 리거/버니 모두 가입 가능 (가입 시 회원 종류 선택 화면 표시)`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

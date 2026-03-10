/**
 * 더미 버니(회원) 30명 생성
 * 실행: packages/db 에서 pnpm db:seed-bunny-users
 *
 * - users.email 이 unique라서 이미 존재하면 스킵합니다.
 * - .env 는 레포 루트 또는 apps/web/.env 또는 packages/db/.env 중 하나에
 *   DATABASE_URL (또는 DATABASE_HOST/USER/PASSWORD/NAME/PORT) 설정 필요
 */
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { users } from "../src/schema/user";
import type { InferInsertModel } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "../../.env") });
config({ path: path.join(__dirname, "../../apps/web/.env") });
config({ path: path.join(__dirname, "../.env") });

type NewUser = InferInsertModel<typeof users>;

function buildSeedUsers(count: number): NewUser[] {
  const base = "bunny";
  return Array.from({ length: count }).map((_, i) => {
    const n = i + 1;
    const email = `${base}${String(n).padStart(2, "0")}@example.com`;
    return {
      id: randomUUID(),
      email,
      name: `버니 ${n}`,
      emailVerified: true,
      image: null,
      // createdAt/updatedAt 는 DB defaultNow 사용
    };
  });
}

async function main() {
  // IMPORTANT: dotenv 설정 이후에 db를 import 해야 함
  const { db } = await import("../src/client/node");
  const seed = buildSeedUsers(30);

  let inserted = 0;
  let skipped = 0;

  for (const u of seed) {
    // drizzle insert + on conflict do nothing (email unique)
    const res = await db
      .insert(users)
      .values(u)
      .onConflictDoNothing({ target: users.email })
      .returning({ id: users.id });

    if (res.length > 0) inserted++;
    else skipped++;
  }

  const total = await db.execute<{ count: number }>(
    sql`SELECT COUNT(*)::int AS count FROM users`,
  );

  console.log(`완료: 삽입 ${inserted}명, 스킵 ${skipped}명`);
  console.log(`현재 users 총합: ${total[0]?.count ?? "?"}명`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


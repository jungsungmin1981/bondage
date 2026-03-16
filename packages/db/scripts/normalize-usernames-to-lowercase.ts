/**
 * 기존 users.username을 소문자로 통일.
 * 실행: pnpm --filter @workspace/db run db:normalize-usernames-lowercase
 */
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { eq } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.join(__dirname, "..");

config({ path: path.join(pkgRoot, "../../.env") });
config({ path: path.join(pkgRoot, "../../apps/web/.env") });
config({ path: path.join(pkgRoot, ".env") });
config({ path: path.join(pkgRoot, "../../apps/web/.env.local"), override: true });

async function main() {
  const { db } = await import("../src/client/node.js");
  const { users } = await import("../src/schema/user.js");

  const allRows = await db.select({ id: users.id, username: users.username }).from(users);
  const toUpdate = allRows.filter(
    (row) => typeof row.username === "string" && row.username !== row.username.toLowerCase(),
  );

  if (toUpdate.length === 0) {
    console.log("소문자로 변경할 username이 없습니다.");
    process.exit(0);
    return;
  }

  let updated = 0;
  let skipped = 0;
  for (const row of toUpdate) {
    const lower = row.username?.toLowerCase() ?? "";
    if (!lower) continue;
    try {
      const result = await db
        .update(users)
        .set({ username: lower })
        .where(eq(users.id, row.id))
        .returning({ username: users.username });
      if (result.length > 0) {
        updated++;
        console.log(`  ${row.username} → ${result[0].username}`);
      }
    } catch (e) {
      const msg = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : "";
      if (msg === "23505") {
        skipped++;
        console.warn(`  ${row.username} → ${lower} 스킵 (이미 존재하는 소문자 아이디와 충돌)`);
      } else {
        throw e;
      }
    }
  }

  console.log(`완료: ${updated}건 변경, ${skipped}건 충돌로 스킵`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

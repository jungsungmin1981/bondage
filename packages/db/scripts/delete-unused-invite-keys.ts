/**
 * 사용하지 않은(used_at IS NULL) 인증키 전부 삭제.
 * 사용된 키(used_at 있음)는 users.invite_key_id에서 참조하므로 삭제하지 않음.
 * 실행: pnpm --filter @workspace/db run db:delete-unused-invite-keys
 */
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { isNull } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.join(__dirname, "..");

config({ path: path.join(pkgRoot, "../../.env") });
config({ path: path.join(pkgRoot, "../../apps/web/.env") });
config({ path: path.join(pkgRoot, ".env") });
config({ path: path.join(pkgRoot, "../../apps/web/.env.local"), override: true });

async function main() {
  const { db } = await import("../src/client/node.js");
  const { inviteKeys } = await import("../src/schema/invite-key.js");

  const deleted = await db
    .delete(inviteKeys)
    .where(isNull(inviteKeys.usedAt))
    .returning({ id: inviteKeys.id });

  const count = deleted.length;
  console.log(`사용하지 않은 인증키 ${count}건 삭제 완료.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

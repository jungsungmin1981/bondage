/**
 * 만료된 지 일정 기간(기본 7일) 지난 미사용 인증키 삭제.
 * 사용된 키(usedAt 있음)는 users.invite_key_id에서 참조하므로 삭제하지 않음.
 * 실행: pnpm --filter @workspace/db run db:cleanup-expired-invite-keys
 * 옵션: pnpm --filter @workspace/db run db:cleanup-expired-invite-keys -- 14  (14일 지난 것만 삭제)
 */
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { and, isNull, lt } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.join(__dirname, "..");

config({ path: path.join(pkgRoot, "../../.env") });
config({ path: path.join(pkgRoot, "../../apps/web/.env") });
config({ path: path.join(pkgRoot, ".env") });
config({ path: path.join(pkgRoot, "../../apps/web/.env.local"), override: true });

/** 만료 후 이 일수 지난 미사용 키를 삭제 (기본 7일) */
const DEFAULT_DAYS_AFTER_EXPIRY = 7;

function parseDaysArg(): number {
  const arg = process.argv[2];
  if (arg == null) return DEFAULT_DAYS_AFTER_EXPIRY;
  const n = parseInt(arg, 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_DAYS_AFTER_EXPIRY;
  return Math.min(n, 365);
}

async function main() {
  const days = parseDaysArg();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const { db } = await import("../src/client/node.js");
  const { inviteKeys } = await import("../src/schema/invite-key.js");

  const deleted = await db
    .delete(inviteKeys)
    .where(
      and(isNull(inviteKeys.usedAt), lt(inviteKeys.expiresAt, cutoff)),
    )
    .returning({ id: inviteKeys.id });

  const count = deleted.length;
  console.log(
    `만료 후 ${days}일 지난 미사용 인증키 ${count}건 삭제 완료. (기준 시각: ${cutoff.toISOString()})`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

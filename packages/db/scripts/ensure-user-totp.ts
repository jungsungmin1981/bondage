/**
 * user_totp, otp_setup_pending 테이블 생성.
 * 실행: pnpm --filter @workspace/db run db:ensure-user-totp
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

  const userTotpExists = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_totp'
  `);
  if (!Array.isArray(userTotpExists) || userTotpExists.length === 0) {
    console.log("user_totp 테이블 생성 중...");
    await db.execute(sql`
      CREATE TABLE "user_totp" (
        "user_id" text PRIMARY KEY NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "secret" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    console.log("user_totp 테이블 생성 완료.");
  } else {
    console.log("user_totp 테이블이 이미 존재합니다.");
  }

  const pendingExists = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'otp_setup_pending'
  `);
  if (!Array.isArray(pendingExists) || pendingExists.length === 0) {
    console.log("otp_setup_pending 테이블 생성 중...");
    await db.execute(sql`
      CREATE TABLE "otp_setup_pending" (
        "user_id" text PRIMARY KEY NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "secret" text NOT NULL,
        "expires_at" timestamp NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    console.log("otp_setup_pending 테이블 생성 완료.");
  } else {
    console.log("otp_setup_pending 테이블이 이미 존재합니다.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

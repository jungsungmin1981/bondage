/**
 * invite_keys 테이블 및 users.invite_key_id 컬럼 생성.
 * 실행: pnpm --filter @workspace/db run db:ensure-invite-keys
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

  const tableExists = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'invite_keys'
  `);

  if (!Array.isArray(tableExists) || tableExists.length === 0) {
    console.log("invite_keys 테이블 생성 중...");
    await db.execute(sql`
      CREATE TABLE "invite_keys" (
        "id" text PRIMARY KEY NOT NULL,
        "key" text NOT NULL UNIQUE,
        "rigger_id" text,
        "member_type" text,
        "expires_at" timestamp NOT NULL,
        "used_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    console.log("invite_keys 테이블 생성 완료.");
  } else {
    console.log("invite_keys 테이블이 이미 존재합니다.");
  }

  const memberTypeColExists = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invite_keys' AND column_name = 'member_type'
  `);
  if (!Array.isArray(memberTypeColExists) || memberTypeColExists.length === 0) {
    console.log("invite_keys.member_type 컬럼 추가 중...");
    await db.execute(sql`ALTER TABLE "invite_keys" ADD COLUMN "member_type" text`);
    console.log("invite_keys.member_type 컬럼 추가 완료.");
  } else {
    console.log("invite_keys.member_type 컬럼이 이미 존재합니다.");
  }

  // 운영자 전용 인증키용: rigger_id가 NOT NULL이면 nullable로 변경
  const riggerIdNullable = await db.execute<{ is_nullable: string }>(sql`
    SELECT is_nullable FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invite_keys' AND column_name = 'rigger_id'
  `);
  if (
    Array.isArray(riggerIdNullable) &&
    riggerIdNullable.length > 0 &&
    riggerIdNullable[0].is_nullable === "NO"
  ) {
    console.log("invite_keys.rigger_id nullable로 변경 중...");
    await db.execute(sql`ALTER TABLE "invite_keys" ALTER COLUMN "rigger_id" DROP NOT NULL`);
    console.log("invite_keys.rigger_id 변경 완료.");
  } else {
    console.log("invite_keys.rigger_id는 이미 nullable이거나 컬럼이 없습니다.");
  }

  const createdByColExists = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invite_keys' AND column_name = 'created_by_user_id'
  `);
  if (!Array.isArray(createdByColExists) || createdByColExists.length === 0) {
    console.log("invite_keys.created_by_user_id 컬럼 추가 중...");
    await db.execute(sql`ALTER TABLE "invite_keys" ADD COLUMN "created_by_user_id" text`);
    console.log("invite_keys.created_by_user_id 컬럼 추가 완료.");
  } else {
    console.log("invite_keys.created_by_user_id 컬럼이 이미 존재합니다.");
  }

  const colExists = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'invite_key_id'
  `);

  if (!Array.isArray(colExists) || colExists.length === 0) {
    console.log("users.invite_key_id 컬럼 추가 중...");
    await db.execute(sql`ALTER TABLE "users" ADD COLUMN "invite_key_id" text`);
    console.log("users.invite_key_id 컬럼 추가 완료.");
  } else {
    console.log("users.invite_key_id 컬럼이 이미 존재합니다.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * 앱과 동일한 .env 로드 후, member_profiles 테이블이 없으면 생성.
 * "relation member_profiles does not exist" 발생 시 실행: pnpm --filter @workspace/db run db:ensure-member-profiles
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
  // env 로드 후에 db를 import 해야 process.env가 반영됨
  const { db } = await import("../src/client/node.js");

  const exists = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'member_profiles'
  `);

  if (Array.isArray(exists) && exists.length > 0) {
    console.log("member_profiles 테이블이 이미 존재합니다.");
    process.exit(0);
  }

  console.log("member_profiles 테이블 생성 중...");
  await db.execute(sql`
    CREATE TABLE "member_profiles" (
      "id" text PRIMARY KEY NOT NULL,
      "user_id" text NOT NULL,
      "member_type" text NOT NULL,
      "nickname" text NOT NULL,
      "icon_url" text,
      "bio" text,
      "status" text NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL,
      CONSTRAINT "member_profiles_user_id_unique" UNIQUE("user_id")
    )
  `);
  await db.execute(sql`
    ALTER TABLE "member_profiles"
    ADD CONSTRAINT "member_profiles_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
  `);
  await db.execute(sql`CREATE UNIQUE INDEX "member_profiles_user_id_idx" ON "member_profiles" USING btree ("user_id")`);
  await db.execute(sql`CREATE INDEX "member_profiles_member_type_idx" ON "member_profiles" USING btree ("member_type")`);
  await db.execute(sql`CREATE INDEX "member_profiles_status_idx" ON "member_profiles" USING btree ("status")`);

  console.log("member_profiles 테이블 생성 완료.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

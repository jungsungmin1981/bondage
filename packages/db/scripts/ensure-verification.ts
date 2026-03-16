/**
 * better-auth 비밀번호 재설정용 verification 테이블 생성.
 * 실행: pnpm --filter @workspace/db run db:ensure-verification
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

  const exists = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'verification'
  `);

  if (Array.isArray(exists) && exists.length > 0) {
    console.log("verification 테이블이 이미 존재합니다.");
    process.exit(0);
    return;
  }

  console.log("verification 테이블 생성 중...");
  await db.execute(sql`
    CREATE TABLE "verification" (
      "id" text PRIMARY KEY NOT NULL,
      "identifier" text NOT NULL,
      "value" text NOT NULL,
      "expires_at" timestamp NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);
  console.log("verification 테이블 생성 완료.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

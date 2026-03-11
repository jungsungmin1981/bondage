/**
 * users 테이블에 username, display_username 컬럼 추가 (Better Auth username 플러그인용).
 * 앱과 동일한 .env를 로드. 이미 컬럼이 있어도 안전하게 실행됨.
 * 실행: pnpm --filter @workspace/db db:add-username-columns
 */
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.join(__dirname, "..");

config({ path: path.join(pkgRoot, "../../.env") });
config({ path: path.join(pkgRoot, "../../apps/web/.env") });
config({ path: path.join(pkgRoot, ".env") });
config({ path: path.join(pkgRoot, "../../apps/web/.env.local"), override: true });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL이 없습니다. .env 또는 apps/web/.env를 확인하세요.");
  process.exit(1);
}

const sql = postgres(url);

async function main() {
  console.log("users 테이블에 username, display_username 컬럼 추가 중...");
  await sql.unsafe(`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" text;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "display_username" text;
  `);
  await sql.unsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "users_username_unique" ON "users" ("username");
  `);
  console.log("완료.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => sql.end());

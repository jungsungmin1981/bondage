/**
 * 버니 사진 테이블(bunny_photos) 생성.
 * 실행: pnpm --filter @workspace/db run db:ensure-bunny-photos
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

  const exist = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bunny_photos'
  `);

  if (Array.isArray(exist) && exist.length > 0) {
    console.log("bunny_photos 테이블이 이미 존재합니다.");
    return;
  }

  console.log("bunny_photos 테이블 생성 중...");
  await db.execute(sql`
    CREATE TABLE "bunny_photos" (
      "id" text PRIMARY KEY NOT NULL,
      "bunny_profile_id" text NOT NULL,
      "user_id" text NOT NULL,
      "image_path" text NOT NULL,
      "caption" text,
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "bunny_photos_bunny_profile_id_idx" ON "bunny_photos" ("bunny_profile_id")
  `);
  console.log("bunny_photos 테이블 생성 완료.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

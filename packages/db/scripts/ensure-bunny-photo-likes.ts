/**
 * bunny_photos 테이블에 post_id, like_count 컬럼 추가 + bunny_photo_likes 테이블 생성.
 * 실행: pnpm --filter @workspace/db run db:ensure-bunny-photo-likes
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

  // 1. bunny_photos.post_id 컬럼 추가
  const hasPostId = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bunny_photos' AND column_name = 'post_id'
  `);
  if (!Array.isArray(hasPostId) || hasPostId.length === 0) {
    console.log("bunny_photos.post_id 컬럼 추가 중...");
    await db.execute(sql`ALTER TABLE "bunny_photos" ADD COLUMN "post_id" text`);
    console.log("bunny_photos.post_id 컬럼 추가 완료.");
  } else {
    console.log("bunny_photos.post_id 컬럼 이미 존재.");
  }

  // 2. bunny_photos.like_count 컬럼 추가
  const hasLikeCount = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bunny_photos' AND column_name = 'like_count'
  `);
  if (!Array.isArray(hasLikeCount) || hasLikeCount.length === 0) {
    console.log("bunny_photos.like_count 컬럼 추가 중...");
    await db.execute(sql`ALTER TABLE "bunny_photos" ADD COLUMN "like_count" integer NOT NULL DEFAULT 0`);
    console.log("bunny_photos.like_count 컬럼 추가 완료.");
  } else {
    console.log("bunny_photos.like_count 컬럼 이미 존재.");
  }

  // 3. bunny_photo_likes 테이블 생성
  const hasTable = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bunny_photo_likes'
  `);
  if (!Array.isArray(hasTable) || hasTable.length === 0) {
    console.log("bunny_photo_likes 테이블 생성 중...");
    await db.execute(sql`
      CREATE TABLE "bunny_photo_likes" (
        "id" text PRIMARY KEY NOT NULL,
        "photo_id" text NOT NULL REFERENCES "bunny_photos"("id") ON DELETE CASCADE,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX "bunny_photo_likes_photo_user_idx" ON "bunny_photo_likes" ("photo_id", "user_id")
    `);
    console.log("bunny_photo_likes 테이블 생성 완료.");
  } else {
    console.log("bunny_photo_likes 테이블 이미 존재.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

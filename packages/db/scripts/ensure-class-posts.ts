/**
 * 앱과 동일한 .env 로드 후, class_posts 테이블이 없으면 생성.
 * "relation class_posts does not exist" 발생 시 실행:
 * pnpm --filter @workspace/db run db:ensure-class-posts
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
    WHERE table_schema = 'public' AND table_name = 'class_posts'
  `);

  if (Array.isArray(exists) && exists.length > 0) {
    console.log("class_posts 테이블이 이미 존재합니다.");
    process.exit(0);
  }

  console.log("class_posts 테이블 생성 중...");
  await db.execute(sql`
    CREATE TABLE "class_posts" (
      "id" text PRIMARY KEY NOT NULL,
      "level" text NOT NULL,
      "visibility" text DEFAULT 'private' NOT NULL,
      "title" text NOT NULL,
      "description" text NOT NULL,
      "rope_thickness_mm" integer NOT NULL,
      "rope_length_m" integer NOT NULL,
      "quantity" integer NOT NULL,
      "cover_image_url" text NOT NULL,
      "extra_image_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
      "video_url" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "class_posts_level_idx" ON "class_posts" ("level")
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "class_posts_visibility_idx" ON "class_posts" ("visibility")
  `);

  console.log("class_posts 테이블 생성 완료.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


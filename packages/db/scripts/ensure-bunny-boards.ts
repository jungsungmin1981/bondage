/**
 * 버니 게시판 테이블(bunny_boards, bunny_board_posts) 생성 및 기본 게시판 시딩.
 * 실행: pnpm --filter @workspace/db run db:ensure-bunny-boards
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

const DEFAULT_BOARDS = [
  { slug: "notice", name: "공지사항", description: "버니 게시판 공지", sortOrder: 0 },
  { slug: "free", name: "자유게시판", description: "자유롭게 이야기해요", sortOrder: 1 },
  { slug: "review", name: "후기", description: "체험·활동 후기", sortOrder: 2 },
  { slug: "qna", name: "질문·답변", description: "궁금한 점을 묻고 답해요", sortOrder: 3 },
] as const;

async function main() {
  const { db } = await import("../src/client/node.js");

  const tablesExist = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bunny_boards'
  `);

  if (!Array.isArray(tablesExist) || tablesExist.length === 0) {
    console.log("bunny_boards 테이블 생성 중...");
    await db.execute(sql`
      CREATE TABLE "bunny_boards" (
        "id" text PRIMARY KEY NOT NULL,
        "slug" text NOT NULL UNIQUE,
        "name" text NOT NULL,
        "description" text,
        "sort_order" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    console.log("bunny_boards 테이블 생성 완료.");
  }

  const postsExist = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bunny_board_posts'
  `);

  if (!Array.isArray(postsExist) || postsExist.length === 0) {
    console.log("bunny_board_posts 테이블 생성 중...");
    await db.execute(sql`
      CREATE TABLE "bunny_board_posts" (
        "id" text PRIMARY KEY NOT NULL,
        "board_id" text NOT NULL REFERENCES "bunny_boards"("id") ON DELETE CASCADE,
        "author_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "post_number" integer NOT NULL,
        "title" text NOT NULL,
        "body" text NOT NULL,
        "cover_image_url" text,
        "is_published" boolean DEFAULT true NOT NULL,
        "scheduled_publish_at" timestamp,
        "updated_by_user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "bunny_board_posts_board_post_number_idx" ON "bunny_board_posts" ("board_id", "post_number")
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "bunny_board_posts_board_id_idx" ON "bunny_board_posts" ("board_id")
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "bunny_board_posts_created_at_idx" ON "bunny_board_posts" ("created_at")
    `);
    console.log("bunny_board_posts 테이블 생성 완료.");
  } else {
    const colExist = await db.execute<{ n: number }>(sql`
      SELECT 1 AS n FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'bunny_board_posts' AND column_name = 'post_number'
    `);
    if (!Array.isArray(colExist) || colExist.length === 0) {
      console.log("bunny_board_posts.post_number 컬럼 추가 및 백필 중...");
      await db.execute(sql`ALTER TABLE "bunny_board_posts" ADD COLUMN "post_number" integer`);
      await db.execute(sql`
        UPDATE bunny_board_posts p SET post_number = rn FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY board_id ORDER BY created_at, id) AS rn FROM bunny_board_posts
        ) sub WHERE p.id = sub.id
      `);
      await db.execute(sql`ALTER TABLE "bunny_board_posts" ALTER COLUMN "post_number" SET NOT NULL`);
      await db.execute(sql`
        CREATE UNIQUE INDEX IF NOT EXISTS "bunny_board_posts_board_post_number_idx" ON "bunny_board_posts" ("board_id", "post_number")
      `);
      console.log("post_number 컬럼 추가 완료.");
    }
    const coverColExist = await db.execute<{ n: number }>(sql`
      SELECT 1 AS n FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'bunny_board_posts' AND column_name = 'cover_image_url'
    `);
    if (!Array.isArray(coverColExist) || coverColExist.length === 0) {
      console.log("bunny_board_posts.cover_image_url 컬럼 추가 중...");
      await db.execute(sql`ALTER TABLE "bunny_board_posts" ADD COLUMN "cover_image_url" text`);
      console.log("cover_image_url 컬럼 추가 완료.");
    }
    const publishedColExist = await db.execute<{ n: number }>(sql`
      SELECT 1 AS n FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'bunny_board_posts' AND column_name = 'is_published'
    `);
    if (!Array.isArray(publishedColExist) || publishedColExist.length === 0) {
      console.log("bunny_board_posts.is_published 컬럼 추가 중...");
      await db.execute(sql`ALTER TABLE "bunny_board_posts" ADD COLUMN "is_published" boolean DEFAULT true NOT NULL`);
      console.log("is_published 컬럼 추가 완료.");
    }
    const updatedByColExist = await db.execute<{ n: number }>(sql`
      SELECT 1 AS n FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'bunny_board_posts' AND column_name = 'updated_by_user_id'
    `);
    if (!Array.isArray(updatedByColExist) || updatedByColExist.length === 0) {
      console.log("bunny_board_posts.updated_by_user_id 컬럼 추가 중...");
      await db.execute(sql`ALTER TABLE "bunny_board_posts" ADD COLUMN "updated_by_user_id" text REFERENCES "users"("id") ON DELETE SET NULL`);
      console.log("updated_by_user_id 컬럼 추가 완료.");
    }
    const scheduledPublishColExist = await db.execute<{ n: number }>(sql`
      SELECT 1 AS n FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'bunny_board_posts' AND column_name = 'scheduled_publish_at'
    `);
    if (!Array.isArray(scheduledPublishColExist) || scheduledPublishColExist.length === 0) {
      console.log("bunny_board_posts.scheduled_publish_at 컬럼 추가 중...");
      await db.execute(sql`ALTER TABLE "bunny_board_posts" ADD COLUMN "scheduled_publish_at" timestamp`);
      console.log("scheduled_publish_at 컬럼 추가 완료.");
    }
  }

  const commentsExist = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bunny_board_post_comments'
  `);
  if (!Array.isArray(commentsExist) || commentsExist.length === 0) {
    console.log("bunny_board_post_comments 테이블 생성 중...");
    await db.execute(sql`
      CREATE TABLE "bunny_board_post_comments" (
        "id" text PRIMARY KEY NOT NULL,
        "post_id" text NOT NULL REFERENCES "bunny_board_posts"("id") ON DELETE CASCADE,
        "parent_id" text,
        "author_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "body" text NOT NULL,
        "deleted_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      ALTER TABLE "bunny_board_post_comments"
      ADD CONSTRAINT "bunny_board_post_comments_parent_id_fkey"
      FOREIGN KEY ("parent_id") REFERENCES "bunny_board_post_comments"("id") ON DELETE CASCADE
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "bunny_board_post_comments_post_id_idx" ON "bunny_board_post_comments" ("post_id")
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "bunny_board_post_comments_parent_id_idx" ON "bunny_board_post_comments" ("parent_id")
    `);
    console.log("bunny_board_post_comments 테이블 생성 완료.");
  } else {
    const fkExist = await db.execute<{ n: number }>(sql`
      SELECT 1 AS n FROM information_schema.table_constraints
      WHERE constraint_name = 'bunny_board_post_comments_parent_id_fkey'
    `);
    if (!Array.isArray(fkExist) || fkExist.length === 0) {
      try {
        await db.execute(sql`
          ALTER TABLE "bunny_board_post_comments"
          ADD CONSTRAINT "bunny_board_post_comments_parent_id_fkey"
          FOREIGN KEY ("parent_id") REFERENCES "bunny_board_post_comments"("id") ON DELETE CASCADE
        `);
        console.log("bunny_board_post_comments parent_id FK 추가 완료.");
      } catch (e) {
        console.warn("parent_id FK 추가 스킵:", e);
      }
    }
  }

  const recommendsExist = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bunny_board_post_recommends'
  `);
  if (!Array.isArray(recommendsExist) || recommendsExist.length === 0) {
    console.log("bunny_board_post_recommends 테이블 생성 중...");
    await db.execute(sql`
      CREATE TABLE "bunny_board_post_recommends" (
        "post_id" text NOT NULL REFERENCES "bunny_board_posts"("id") ON DELETE CASCADE,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "bunny_board_post_recommends_post_user_idx"
      ON "bunny_board_post_recommends" ("post_id", "user_id")
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "bunny_board_post_recommends_post_id_idx"
      ON "bunny_board_post_recommends" ("post_id")
    `);
    console.log("bunny_board_post_recommends 테이블 생성 완료.");
  }

  for (const b of DEFAULT_BOARDS) {
    const existing = await db.execute<{ n: number }>(sql`
      SELECT 1 AS n FROM bunny_boards WHERE slug = ${b.slug}
    `);
    if (Array.isArray(existing) && existing.length > 0) continue;
    const id = crypto.randomUUID();
    await db.execute(sql`
      INSERT INTO bunny_boards (id, slug, name, description, sort_order, created_at, updated_at)
      VALUES (${id}, ${b.slug}, ${b.name}, ${b.description ?? null}, ${b.sortOrder}, now(), now())
    `);
    console.log(`기본 게시판 추가: ${b.name} (${b.slug})`);
  }

  console.log("버니 게시판 설정 완료.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

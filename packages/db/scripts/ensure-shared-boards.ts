/**
 * 공용 게시판 테이블(shared_boards, shared_board_posts, shared_board_post_comments, shared_board_post_recommends) 생성 및 기본 게시판 시딩.
 * 실행: pnpm --filter @workspace/db run db:ensure-shared-boards
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
  {
    slug: "notice",
    name: "공지사항",
    description: "공용 게시판 공지",
    sortOrder: 0,
  },
  {
    slug: "free",
    name: "자유게시판",
    description: "자유롭게 이야기해요",
    sortOrder: 1,
  },
  {
    slug: "suggestion",
    name: "제안하기",
    description: "서비스 개선 제안",
    sortOrder: 2,
  },
  {
    slug: "qna",
    name: "Q & A",
    description: null,
    sortOrder: 3,
  },
] as const;

async function main() {
  const { db } = await import("../src/client/node.js");

  const tablesExist = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'shared_boards'
  `);

  if (!Array.isArray(tablesExist) || tablesExist.length === 0) {
    console.log("shared_boards 테이블 생성 중...");
    await db.execute(sql`
      CREATE TABLE "shared_boards" (
        "id" text PRIMARY KEY NOT NULL,
        "slug" text NOT NULL UNIQUE,
        "name" text NOT NULL,
        "description" text,
        "sort_order" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    console.log("shared_boards 테이블 생성 완료.");
  }

  const postsExist = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'shared_board_posts'
  `);

  if (!Array.isArray(postsExist) || postsExist.length === 0) {
    console.log("shared_board_posts 테이블 생성 중...");
    await db.execute(sql`
      CREATE TABLE "shared_board_posts" (
        "id" text PRIMARY KEY NOT NULL,
        "board_id" text NOT NULL REFERENCES "shared_boards"("id") ON DELETE CASCADE,
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
      CREATE UNIQUE INDEX IF NOT EXISTS "shared_board_posts_board_post_number_idx" ON "shared_board_posts" ("board_id", "post_number")
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "shared_board_posts_board_id_idx" ON "shared_board_posts" ("board_id")
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "shared_board_posts_created_at_idx" ON "shared_board_posts" ("created_at")
    `);
    console.log("shared_board_posts 테이블 생성 완료.");
  }

  const commentsExist = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'shared_board_post_comments'
  `);
  if (!Array.isArray(commentsExist) || commentsExist.length === 0) {
    console.log("shared_board_post_comments 테이블 생성 중...");
    await db.execute(sql`
      CREATE TABLE "shared_board_post_comments" (
        "id" text PRIMARY KEY NOT NULL,
        "post_id" text NOT NULL REFERENCES "shared_board_posts"("id") ON DELETE CASCADE,
        "parent_id" text,
        "author_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "body" text NOT NULL,
        "deleted_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      ALTER TABLE "shared_board_post_comments"
      ADD CONSTRAINT "shared_board_post_comments_parent_id_fkey"
      FOREIGN KEY ("parent_id") REFERENCES "shared_board_post_comments"("id") ON DELETE CASCADE
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "shared_board_post_comments_post_id_idx" ON "shared_board_post_comments" ("post_id")
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "shared_board_post_comments_parent_id_idx" ON "shared_board_post_comments" ("parent_id")
    `);
    console.log("shared_board_post_comments 테이블 생성 완료.");
  } else {
    const fkExist = await db.execute<{ n: number }>(sql`
      SELECT 1 AS n FROM information_schema.table_constraints
      WHERE constraint_name = 'shared_board_post_comments_parent_id_fkey'
    `);
    if (!Array.isArray(fkExist) || fkExist.length === 0) {
      try {
        await db.execute(sql`
          ALTER TABLE "shared_board_post_comments"
          ADD CONSTRAINT "shared_board_post_comments_parent_id_fkey"
          FOREIGN KEY ("parent_id") REFERENCES "shared_board_post_comments"("id") ON DELETE CASCADE
        `);
        console.log("shared_board_post_comments parent_id FK 추가 완료.");
      } catch (e) {
        console.warn("parent_id FK 추가 스킵:", e);
      }
    }
  }

  const recommendsExist = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'shared_board_post_recommends'
  `);
  if (!Array.isArray(recommendsExist) || recommendsExist.length === 0) {
    console.log("shared_board_post_recommends 테이블 생성 중...");
    await db.execute(sql`
      CREATE TABLE "shared_board_post_recommends" (
        "post_id" text NOT NULL REFERENCES "shared_board_posts"("id") ON DELETE CASCADE,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "shared_board_post_recommends_post_user_idx"
      ON "shared_board_post_recommends" ("post_id", "user_id")
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "shared_board_post_recommends_post_id_idx"
      ON "shared_board_post_recommends" ("post_id")
    `);
    console.log("shared_board_post_recommends 테이블 생성 완료.");
  }

  for (const b of DEFAULT_BOARDS) {
    const existing = await db.execute<{ n: number }>(sql`
      SELECT 1 AS n FROM shared_boards WHERE slug = ${b.slug}
    `);
    if (Array.isArray(existing) && existing.length > 0) {
      if (b.slug === "qna" || b.slug === "suggestion") {
        await db.execute(sql`
          UPDATE shared_boards SET name = ${b.name}, description = ${b.description ?? null}, updated_at = now()
          WHERE slug = ${b.slug}
        `);
        console.log(`기본 게시판 이름 업데이트: ${b.name} (${b.slug})`);
      }
      continue;
    }
    const id = crypto.randomUUID();
    await db.execute(sql`
      INSERT INTO shared_boards (id, slug, name, description, sort_order, created_at, updated_at)
      VALUES (${id}, ${b.slug}, ${b.name}, ${b.description ?? null}, ${b.sortOrder}, now(), now())
    `);
    console.log(`기본 게시판 추가: ${b.name} (${b.slug})`);
  }

  console.log("공용 게시판 설정 완료.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

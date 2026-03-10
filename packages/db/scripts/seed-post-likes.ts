/**
 * 게시물(post_id)별로 임의 좋아요 데이터 삽입 (확인용)
 * 실행: packages/db 에서 pnpm db:seed-post-likes
 * .env 는 레포 루트 또는 apps/web/.env 에 DATABASE_URL 등 설정 필요
 */
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "../../.env") });
config({ path: path.join(__dirname, "../../apps/web/.env") });
config({ path: path.join(__dirname, "../.env") });

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

async function main() {
  const { db } = await import("../src/client/node");

  const postRows = await db.execute<{ pid: string }>(sql`
    SELECT DISTINCT COALESCE(post_id, id) AS pid
    FROM rigger_photos
    WHERE COALESCE(post_id, id) IS NOT NULL
  `);
  const postIds = postRows.map((r) => r.pid).filter(Boolean);
  if (postIds.length === 0) {
    console.log("rigger_photos 에 게시물이 없습니다. 사진을 먼저 등록하세요.");
    process.exit(0);
  }

  const userRows = await db.execute<{ id: string }>(sql`
    SELECT id FROM users LIMIT 100
  `);
  const userIds = userRows.map((r) => r.id).filter(Boolean);
  if (userIds.length === 0) {
    console.log("users 테이블에 사용자가 없습니다.");
    process.exit(1);
  }

  let attempted = 0;
  for (const postId of postIds) {
    // user가 적으면 최대 user 수만큼만 넣음
    const n = Math.min(1 + Math.floor(Math.random() * 8), userIds.length);
    const picks = shuffle(userIds).slice(0, Math.max(1, n));
    for (const userId of picks) {
      const id = randomUUID();
      attempted++;
      try {
        await db.execute(sql`
          INSERT INTO post_likes (id, post_id, user_id)
          VALUES (${id}, ${postId}, ${userId})
          ON CONFLICT (post_id, user_id) DO NOTHING
        `);
      } catch {
        // unique 없는 환경 등
      }
    }
  }

  console.log(
    `완료: post ${postIds.length}개, INSERT 시도 ${attempted}건 (이미 있는 조합은 DB가 무시)`,
  );
  console.log("리거 상세 페이지를 새로고침하면 좋아요 수가 반영됩니다.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

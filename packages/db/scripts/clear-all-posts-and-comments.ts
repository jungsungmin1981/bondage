/**
 * 게시물·댓글·DM·쇼오프 등 전체 초기화.
 * FK 순서대로 자식 → 부모 삭제.
 * 실행: packages/db 에서 pnpm db:clear-all-posts-and-comments
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

async function main() {
  const { db } = await import("../src/client/node.js");

  const report: { table: string; count: number }[] = [];

  const del = async (tableName: string, tableSql: string) => {
    const res = await db.execute(
      sql.raw(`DELETE FROM ${tableSql} RETURNING 1`),
    );
    const count = Array.isArray(res) ? res.length : 0;
    report.push({ table: tableName, count });
  };

  // 1. 리거 사진 관련 (댓글, 좋아요, 추천, 버니 승인)
  await del("photo_comments", "photo_comments");
  await del("photo_likes", "photo_likes");
  await del("post_likes", "post_likes");
  await del("bunny_approvals", "bunny_approvals");

  // 2. 클래스 챌린지 관련
  await del("class_challenge_approvals", "class_challenge_approvals");
  await del("class_challenges", "class_challenges");

  // 3. DM
  await del("direct_messages", "direct_messages");

  // 4. 리거 사진, 클래스 게시물
  await del("rigger_photos", "rigger_photos");
  await del("class_posts", "class_posts");

  // 5. 공유 게시판 (추천 → 댓글 → 게시물)
  await del("shared_board_post_recommends", "shared_board_post_recommends");
  await del("shared_board_post_comments", "shared_board_post_comments");
  await del("shared_board_posts", "shared_board_posts");

  // 6. 버니 게시판 (추천 → 댓글 → 게시물)
  await del("bunny_board_post_recommends", "bunny_board_post_recommends");
  await del("bunny_board_post_comments", "bunny_board_post_comments");
  await del("bunny_board_posts", "bunny_board_posts");

  // 7. 버니 사진
  await del("bunny_photos", "bunny_photos");

  // 8. 월간 핫픽 (투표 → 접수)
  await del("monthly_hotpick_votes", "monthly_hotpick_votes");
  await del("monthly_hotpick_submissions", "monthly_hotpick_submissions");

  // 9. DM 스레드 (첨부 → 메시지 → 참가자 → 스레드)
  await del("dm_attachments", "dm_attachments");
  await del("dm_messages", "dm_messages");
  await del("dm_participants", "dm_participants");
  await del("dm_threads", "dm_threads");

  console.log("DB 초기화 완료:");
  report.forEach(({ table, count }) => console.log(`  ${table}: ${count}건`));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

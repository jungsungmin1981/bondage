/**
 * 게시물·댓글 등 콘텐츠 초기화 후, 관리자 포함 모든 회원 및 연관 데이터 삭제.
 * 실행: pnpm --filter @workspace/db run db:delete-all-users
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

  const del = async (tableName: string, tableSql: string): Promise<number> => {
    const res = await db.execute(
      sql.raw(`DELETE FROM ${tableSql} RETURNING 1`),
    );
    return Array.isArray(res) ? res.length : 0;
  };

  console.log("1. 콘텐츠 초기화 (게시물·댓글·DM·쇼오프 등)...");
  // FK 순서: 자식 → 부모 (clear-all-posts-and-comments.ts와 동일)
  await del("photo_comments", "photo_comments");
  await del("photo_likes", "photo_likes");
  await del("post_likes", "post_likes");
  await del("bunny_approvals", "bunny_approvals");
  await del("class_challenge_approvals", "class_challenge_approvals");
  await del("class_challenges", "class_challenges");
  await del("direct_messages", "direct_messages");
  await del("rigger_photos", "rigger_photos");
  await del("class_posts", "class_posts");
  await del("shared_board_post_recommends", "shared_board_post_recommends");
  await del("shared_board_post_comments", "shared_board_post_comments");
  await del("shared_board_posts", "shared_board_posts");
  await del("bunny_board_post_recommends", "bunny_board_post_recommends");
  await del("bunny_board_post_comments", "bunny_board_post_comments");
  await del("bunny_board_posts", "bunny_board_posts");
  await del("bunny_photos", "bunny_photos");
  await del("monthly_hotpick_votes", "monthly_hotpick_votes");
  await del("monthly_hotpick_submissions", "monthly_hotpick_submissions");
  await del("dm_attachments", "dm_attachments");
  await del("dm_messages", "dm_messages");
  await del("dm_participants", "dm_participants");
  await del("dm_threads", "dm_threads");

  console.log("2. 회원 연관 데이터 삭제...");
  await db.execute(sql.raw(`UPDATE users SET invite_key_id = NULL`));
  const sessionCount = await del("session", "session");
  const accountCount = await del("account", "account");
  await db.execute(
    sql.raw(
      `DELETE FROM verification WHERE identifier IN (SELECT email FROM users)`,
    ),
  );
  const memberCount = await del("member_profiles", "member_profiles");
  await del("user_totp", "user_totp");
  await del("otp_setup_pending", "otp_setup_pending");
  await del("operator_admin_tabs", "operator_admin_tabs");
  await del("user_suspensions", "user_suspensions");

  const userRes = await db.execute(sql.raw(`DELETE FROM users RETURNING 1`));
  const userCount = Array.isArray(userRes) ? userRes.length : 0;

  console.log("삭제 완료:");
  console.log(`  세션: ${sessionCount}건`);
  console.log(`  계정(account): ${accountCount}건`);
  console.log(`  회원프로필: ${memberCount}건`);
  console.log(`  회원(users): ${userCount}건`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

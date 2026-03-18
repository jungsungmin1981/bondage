/**
 * 인덱스 및 FK 일괄 추가.
 * 이미 존재하면 무시(IF NOT EXISTS). 안전하게 여러 번 실행 가능.
 * 실행: npx tsx scripts/ensure-indexes-and-fks.ts
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

  // ─── 인덱스 추가 ───

  console.log("[1/8] session.user_id 인덱스...");
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "session_user_id_idx" ON "session" ("user_id")
  `);

  console.log("[2/8] photo_likes (photo_id, user_id) UNIQUE 인덱스...");
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "photo_likes_photo_user_idx" ON "photo_likes" ("photo_id", "user_id")
  `);

  console.log("[3/8] photo_comments (photo_id), (parent_id) 인덱스...");
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "photo_comments_photo_id_idx" ON "photo_comments" ("photo_id")
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "photo_comments_parent_id_idx" ON "photo_comments" ("parent_id")
  `);

  console.log("[4/8] class_challenges (class_post_id), (user_id), (status) 인덱스...");
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "class_challenges_class_post_id_idx" ON "class_challenges" ("class_post_id")
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "class_challenges_user_id_idx" ON "class_challenges" ("user_id")
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "class_challenges_status_idx" ON "class_challenges" ("status")
  `);

  console.log("[5/8] class_posts (level, visibility) 인덱스...");
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "class_posts_level_visibility_idx" ON "class_posts" ("level", "visibility")
  `);

  console.log("[6/8] user_suspensions (user_id) 인덱스...");
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "user_suspensions_user_id_idx" ON "user_suspensions" ("user_id")
  `);

  console.log("[7/8] invite_keys (created_by_user_id), (rigger_id) 인덱스...");
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "invite_keys_created_by_user_id_idx" ON "invite_keys" ("created_by_user_id")
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "invite_keys_rigger_id_idx" ON "invite_keys" ("rigger_id")
  `);

  console.log("[8/8] dm_threads (last_message_at) 인덱스...");
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "dm_threads_last_message_at_idx" ON "dm_threads" ("last_message_at")
  `);

  // ─── FK 추가 (존재 여부 확인 후) ───

  const fks: { name: string; table: string; column: string; ref: string }[] = [
    { name: "rigger_photos_rigger_id_fk", table: "rigger_photos", column: "rigger_id", ref: "users(id)" },
    { name: "rigger_photos_user_id_fk", table: "rigger_photos", column: "user_id", ref: "users(id)" },
    { name: "bunny_photos_user_id_fk", table: "bunny_photos", column: "user_id", ref: "users(id)" },
    { name: "class_challenges_class_post_id_fk", table: "class_challenges", column: "class_post_id", ref: "class_posts(id)" },
    { name: "class_challenges_user_id_fk", table: "class_challenges", column: "user_id", ref: "users(id)" },
    { name: "class_challenge_approvals_staff_user_id_fk", table: "class_challenge_approvals", column: "staff_user_id", ref: "users(id)" },
    { name: "photo_comments_photo_id_fk", table: "photo_comments", column: "photo_id", ref: "rigger_photos(id)" },
    { name: "photo_comments_user_id_fk", table: "photo_comments", column: "user_id", ref: "users(id)" },
    { name: "photo_likes_photo_id_fk", table: "photo_likes", column: "photo_id", ref: "rigger_photos(id)" },
    { name: "photo_likes_user_id_fk", table: "photo_likes", column: "user_id", ref: "users(id)" },
    { name: "invite_keys_rigger_id_fk", table: "invite_keys", column: "rigger_id", ref: "users(id)" },
    { name: "invite_keys_created_by_user_id_fk", table: "invite_keys", column: "created_by_user_id", ref: "users(id)" },
  ];

  for (const fk of fks) {
    const exists = await db.execute(sql.raw(`
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = '${fk.name}'
        AND table_schema = 'public'
        AND constraint_type = 'FOREIGN KEY'
    `));
    if (Array.isArray(exists) && exists.length > 0) {
      console.log(`  FK ${fk.name} 이미 존재, 건너뜀`);
      continue;
    }
    console.log(`  FK ${fk.name} 추가 중...`);
    try {
      await db.execute(sql.raw(`
        ALTER TABLE "${fk.table}"
        ADD CONSTRAINT "${fk.name}"
        FOREIGN KEY ("${fk.column}") REFERENCES ${fk.ref}
        ON DELETE CASCADE
      `));
    } catch (e) {
      console.warn(`  FK ${fk.name} 추가 실패 (데이터 정합성 문제 가능):`, (e as Error).message);
    }
  }

  console.log("\n완료.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

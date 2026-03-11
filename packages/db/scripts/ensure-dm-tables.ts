/**
 * dm_threads / dm_participants / dm_messages / dm_attachments 테이블이 없으면 생성.
 * 실행:
 *   pnpm --filter @workspace/db run db:ensure-dm-tables
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

async function ensureTable(db: any, tableName: string, createSql: string) {
  const exists = await db.execute<{ n: number }>(sql`
    SELECT 1 AS n FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ${tableName}
  `);
  if (Array.isArray(exists) && exists.length > 0) return false;
  await db.execute(sql.raw(createSql));
  return true;
}

async function main() {
  const { db } = await import("../src/client/node.js");

  const createdThreads = await ensureTable(
    db,
    "dm_threads",
    `
    CREATE TABLE "dm_threads" (
      "id" text PRIMARY KEY,
      "created_at" timestamp NOT NULL DEFAULT now(),
      "last_message_at" timestamp
    );
  `,
  );

  const createdParticipants = await ensureTable(
    db,
    "dm_participants",
    `
    CREATE TABLE "dm_participants" (
      "id" text PRIMARY KEY,
      "thread_id" text NOT NULL REFERENCES "dm_threads"("id") ON DELETE CASCADE,
      "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "joined_at" timestamp NOT NULL DEFAULT now(),
      "last_read_at" timestamp
    );
  `,
  );

  const createdMessages = await ensureTable(
    db,
    "dm_messages",
    `
    CREATE TABLE "dm_messages" (
      "id" text PRIMARY KEY,
      "thread_id" text NOT NULL REFERENCES "dm_threads"("id") ON DELETE CASCADE,
      "sender_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "body" text,
      "created_at" timestamp NOT NULL DEFAULT now()
    );
  `,
  );

  const createdAttachments = await ensureTable(
    db,
    "dm_attachments",
    `
    CREATE TABLE "dm_attachments" (
      "id" text PRIMARY KEY,
      "message_id" text NOT NULL REFERENCES "dm_messages"("id") ON DELETE CASCADE,
      "type" text NOT NULL,
      "url" text NOT NULL,
      "width" text,
      "height" text
    );
  `,
  );

  // indexes (idempotent via IF NOT EXISTS)
  await db.execute(
    sql.raw(`
      CREATE UNIQUE INDEX IF NOT EXISTS "dm_participants_thread_user_idx"
      ON "dm_participants" ("thread_id", "user_id");
    `),
  );
  await db.execute(
    sql.raw(`
      CREATE INDEX IF NOT EXISTS "dm_participants_user_thread_idx"
      ON "dm_participants" ("user_id", "thread_id");
    `),
  );
  await db.execute(
    sql.raw(`
      CREATE INDEX IF NOT EXISTS "dm_messages_thread_created_at_idx"
      ON "dm_messages" ("thread_id", "created_at");
    `),
  );
  await db.execute(
    sql.raw(`
      CREATE INDEX IF NOT EXISTS "dm_attachments_message_id_idx"
      ON "dm_attachments" ("message_id");
    `),
  );

  const createdAny =
    createdThreads || createdParticipants || createdMessages || createdAttachments;
  console.log(createdAny ? "dm 테이블 생성 완료" : "dm 테이블 이미 존재");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


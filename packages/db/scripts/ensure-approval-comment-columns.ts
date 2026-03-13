/**
 * class_challenge_approvals 에 comment, rejection_note, rejection_image_urls 컬럼이 없으면 추가.
 * pnpm --filter @workspace/db run db:ensure-approval-comment-columns
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

  const columns = await db.execute<{ column_name: string }>(sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'class_challenge_approvals'
  `);
  const existing = new Set(
    (Array.isArray(columns) ? columns : []).map((r) => r.column_name),
  );

  const toAdd: { name: string; def: string }[] = [];
  if (!existing.has("comment")) toAdd.push({ name: "comment", def: "text" });
  if (!existing.has("rejection_note"))
    toAdd.push({ name: "rejection_note", def: "text" });
  if (!existing.has("rejection_image_urls"))
    toAdd.push({ name: "rejection_image_urls", def: "jsonb" });

  if (toAdd.length === 0) {
    console.log("comment, rejection_note, rejection_image_urls 컬럼이 이미 존재합니다.");
    process.exit(0);
  }

  if (toAdd.some((c) => c.name === "comment")) {
    console.log('컬럼 "comment" 추가 중...');
    await db.execute(sql`ALTER TABLE "class_challenge_approvals" ADD COLUMN "comment" text`);
  }
  if (toAdd.some((c) => c.name === "rejection_note")) {
    console.log('컬럼 "rejection_note" 추가 중...');
    await db.execute(sql`ALTER TABLE "class_challenge_approvals" ADD COLUMN "rejection_note" text`);
  }
  if (toAdd.some((c) => c.name === "rejection_image_urls")) {
    console.log('컬럼 "rejection_image_urls" 추가 중...');
    await db.execute(sql`ALTER TABLE "class_challenge_approvals" ADD COLUMN "rejection_image_urls" jsonb`);
  }
  console.log("컬럼 추가 완료.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

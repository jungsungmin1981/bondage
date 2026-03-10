/**
 * rigger_photos.visibility 컬럼 존재 확인용
 * 실행: packages/db 에서 pnpm exec tsx scripts/check-rigger-photos-visibility.ts
 */
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { sql } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 웹앱 DB 우선(.env)
config({ path: path.join(__dirname, "../../../apps/web/.env") });
config({ path: path.join(__dirname, "../../../.env") });

const { db } = await import("../src/client/node");

const rows = await db.execute<{ column_name: string }>(sql`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_name = 'rigger_photos' AND column_name = 'visibility'
`);

console.log(rows.length ? "visibility:OK" : "visibility:MISSING");

// drizzle migrations applied?
const mig = await db.execute<{ id: number; hash: string; created_at: string }>(sql`
  SELECT id, hash, created_at
  FROM drizzle.__drizzle_migrations
  ORDER BY id DESC
  LIMIT 5
`);
console.log("last_migrations:", mig);

const cols = await db.execute<{ column_name: string }>(sql`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_name = 'rigger_photos'
  ORDER BY ordinal_position
`);
console.log("rigger_photos.columns:", cols.map((c) => c.column_name));


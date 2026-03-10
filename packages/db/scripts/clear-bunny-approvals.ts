/**
 * bunny_approvals 테이블의 모든 레코드를 삭제하여 버니 승인요청 목록을 비웁니다.
 * 실행: packages/db 에서 pnpm db:clear-bunny-approvals
 */
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "../../.env") });
config({ path: path.join(__dirname, "../../apps/web/.env") });
config({ path: path.join(__dirname, "../.env") });

async function main() {
  const { db } = await import("../src/client/node.js");
  const schema = await import("../src/schema/index.js");

  const deleted = await db
    .delete(schema.bunnyApprovals)
    .returning({ id: schema.bunnyApprovals.id });
  console.log(`버니 승인요청 ${deleted.length}건을 삭제했습니다.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

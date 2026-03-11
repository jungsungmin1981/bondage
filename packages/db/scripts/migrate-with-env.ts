/**
 * 앱과 동일한 .env를 로드한 뒤 drizzle-kit migrate 실행.
 * 레포 루트 또는 apps/web 에서 DATABASE_URL을 쓰는 경우 이 스크립트로 실행하세요.
 * 실행: pnpm --filter @workspace/db db:migrate
 */
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.join(__dirname, "..");

// Next.js와 동일한 우선순위: 나중에 로드할수록 덮어씀 (.env.local > .env)
config({ path: path.join(pkgRoot, "../../.env") });
config({ path: path.join(pkgRoot, "../../apps/web/.env") });
config({ path: path.join(pkgRoot, ".env") });
config({ path: path.join(pkgRoot, "../../apps/web/.env.local"), override: true });

const result = spawnSync("pnpm", ["exec", "drizzle-kit", "migrate"], {
  stdio: "inherit",
  cwd: pkgRoot,
  shell: true,
});
process.exit(result.status ?? 1);

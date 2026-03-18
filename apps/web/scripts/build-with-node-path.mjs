/**
 * Vercel/pnpm: 루트 node_modules를 NODE_PATH에 넣어 Next가 PostCSS 등 플러그인을 찾을 수 있게 함
 */
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootNodeModules = path.resolve(__dirname, "..", "..", "node_modules");

process.env.NODE_PATH = rootNodeModules;
const result = spawnSync(
  "node",
  ["--max-old-space-size=4096", "./node_modules/next/dist/bin/next", "build", "--webpack"],
  { cwd: path.resolve(__dirname, ".."), stdio: "inherit", env: { ...process.env, NODE_PATH: rootNodeModules } }
);
process.exit(result.status ?? 1);

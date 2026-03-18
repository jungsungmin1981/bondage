/** Vercel/pnpm에서 절대 경로로 플러그인 resolve */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const _require = createRequire(import.meta.url);
const __dirname = fileURLToPath(new URL(".", import.meta.url));

let pluginPath;
try {
  pluginPath = _require.resolve("@tailwindcss/postcss");
} catch {
  // pnpm 모노레포에서 앱/루트 node_modules를 직접 탐색
  const appNM = path.join(__dirname, "node_modules");
  const rootNM = path.join(__dirname, "../../node_modules");
  pluginPath = _require.resolve("@tailwindcss/postcss", {
    paths: [appNM, rootNM],
  });
}

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: { [pluginPath]: {} },
};

export default config;
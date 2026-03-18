/** Vercel/pnpm에서 Next는 .pnpm 내부에서 require.resolve하므로, 앱·루트 node_modules를 paths로 넣어 절대 경로로 resolve 후 사용 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const appNodeModules = path.join(__dirname, "node_modules");
const rootNodeModules = path.join(__dirname, "../../node_modules");

const pluginPath = require.resolve("@tailwindcss/postcss", {
  paths: [appNodeModules, rootNodeModules],
});

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: { [pluginPath]: {} },
};

export default config;
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const inRoot = path.resolve(__dirname, "..", "..", "node_modules", "@tailwindcss", "postcss");

/** 로컬은 apps/web에서 resolve, Vercel은 루트 node_modules 경로 사용 */
let tailwindPostcssPath;
try {
  tailwindPostcssPath = require.resolve("@tailwindcss/postcss", { paths: [__dirname] });
} catch {
  tailwindPostcssPath = fs.existsSync(inRoot) ? inRoot : path.resolve(__dirname, "node_modules", "@tailwindcss", "postcss");
}

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: { [tailwindPostcssPath]: {} },
};

export default config;
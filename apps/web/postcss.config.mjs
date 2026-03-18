import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

/** apps/web 기준으로 resolve해 Vercel/pnpm에서도 플러그인을 찾도록 함 */
const tailwindPostcssPath = require.resolve("@tailwindcss/postcss", {
  paths: [__dirname],
});

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: { [tailwindPostcssPath]: {} },
};

export default config;
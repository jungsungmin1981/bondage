/** 루트 package.json에 @tailwindcss/postcss 추가해 Vercel/pnpm에서 require.resolve가 루트 node_modules에서 찾도록 함 */
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: { "@tailwindcss/postcss": {} },
};

export default config;
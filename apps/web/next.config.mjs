import path from "path";
import { fileURLToPath } from "url";
import withPWAInit from "@ducanh2912/next-pwa";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const betterAuthReactPath = path.resolve(
  __dirname,
  "node_modules/better-auth/dist/client/react/index.mjs"
);

const workspaceDbPath = path.resolve(__dirname, "../../packages/db/src/index.ts");
const workspaceAuthPath = path.resolve(__dirname, "../../packages/auth/src/index.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.amazonaws.com", pathname: "/**" },
      { protocol: "https", hostname: "**.cloudfront.net", pathname: "/**" },
    ],
  },
  experimental: {
    serverActions: {
      // 이미지 자동 압축/리사이즈를 위해 원본 입력은 더 크게 허용
      bodySizeLimit: "60mb",
    },
  },
  transpilePackages: ["@workspace/ui", "better-auth"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname),
      "@workspace/db": workspaceDbPath,
      "@workspace/auth": workspaceAuthPath,
      "better-auth/react$": betterAuthReactPath,
    };
    return config;
  },
};

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});
export default withPWA(nextConfig);

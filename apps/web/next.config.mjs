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
    // Vercel 등 메모리 제한 환경에서 정적 생성 시 OOM 방지
    staticGenerationMaxConcurrency: 4,
    staticGenerationMinPagesPerWorker: 25,
    // 클라이언트 라우터 캐시: 한 번 방문한 페이지를 재방문 시 캐시에서 즉시 렌더링
    staleTimes: {
      dynamic: 30,  // 동적 페이지: 30초간 클라이언트 캐시 유지
      static: 300,  // 정적 페이지: 5분간 클라이언트 캐시 유지
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
  workboxOptions: {
    // 네비게이션(페이지 이동) 요청은 네트워크 우선, 실패 시 캐시
    runtimeCaching: [
      {
        urlPattern: ({ request }) => request.mode === "navigate",
        handler: "NetworkFirst",
        options: {
          cacheName: "pages",
          networkTimeoutSeconds: 10,
        },
      },
      {
        urlPattern: ({ url }) =>
          url.pathname.startsWith("/api/") ||
          url.pathname.startsWith("/_next/"),
        handler: "NetworkFirst",
        options: {
          cacheName: "api-and-next",
          networkTimeoutSeconds: 10,
        },
      },
    ],
  },
});
export default withPWA(nextConfig);

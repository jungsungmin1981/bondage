import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const betterAuthReactPath = path.resolve(
  __dirname,
  "node_modules/better-auth/dist/client/react/index.mjs"
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui", "better-auth"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "better-auth/react$": betterAuthReactPath,
    };
    return config;
  },
};

export default nextConfig;

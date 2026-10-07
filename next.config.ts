import type { NextConfig } from "next";

const apiOrigin = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";
const config: NextConfig = {
  distDir: process.env.NEXT_BUILD_DIR ?? ".next",
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${apiOrigin}/api/v1/:path*` }];
  },
};
export default config;

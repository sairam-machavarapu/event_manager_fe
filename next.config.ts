import type { NextConfig } from "next";

const apiOrigin = (process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000").trim().replace(/\/$/, "");
const apiUrl = new URL(apiOrigin);
if (!["http:", "https:"].includes(apiUrl.protocol) || apiUrl.username || apiUrl.password || apiUrl.search || apiUrl.hash || apiUrl.pathname !== "/") {
  throw new Error("API_INTERNAL_URL must be an HTTP(S) origin without credentials, path, query or fragment.");
}
const config: NextConfig = {
  distDir: process.env.NEXT_BUILD_DIR ?? ".next",
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${apiOrigin}/api/v1/:path*` }];
  },
};
export default config;

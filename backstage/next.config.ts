import type { NextConfig } from "next";
import path from "path";

// Node.js 22 exposes a broken localStorage global (no storage path set).
// Patch it out before Next.js loads any modules so that packages like
// `debug` that call localStorage.getItem() don't crash during SSR.
if (typeof globalThis.localStorage !== "undefined") {
  const noop = () => null;
  (globalThis as any).localStorage = {
    getItem: noop,
    setItem: noop,
    removeItem: noop,
    clear: noop,
    key: noop,
    length: 0,
  };
}

const nextConfig: NextConfig = {
  output: "standalone",
  // When building inside a pnpm monorepo, the real node_modules live at the
  // workspace root (one level up). This tells Next.js to trace files from
  // there so symlinks resolve correctly in the standalone bundle.
  outputFileTracingRoot: path.join(__dirname, "../"),
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${process.env.BACKEND_URL ?? "http://localhost:8000"}/:path*`,
      },
    ];
  },
};

export default nextConfig;

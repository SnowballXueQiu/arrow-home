import type { NextConfig } from "next";

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
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: "http://localhost:8000/:path*",
      },
    ];
  },
};

export default nextConfig;

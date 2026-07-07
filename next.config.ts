import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root — an unrelated package-lock.json in the parent
  // directory tree otherwise makes Next.js infer the wrong monorepo root.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root — an unrelated package-lock.json in the parent
  // directory tree otherwise makes Next.js infer the wrong monorepo root.
  turbopack: {
    root: __dirname,
  },
  experimental: {
    // Reuse client-cached page segments for 30s so hopping between the four
    // tabs is instant instead of a server roundtrip per tap. Write-safe:
    // every mutation action calls revalidatePath for the routes it affects,
    // which purges these cached segments immediately.
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;

import type { NextConfig } from "next";

// STATIC_EXPORT=true builds the old static GitHub Pages bundle (served from the
// /alex-creates sub-path). With it unset we run as a normal Node app: API routes
// + real file uploads work, and the site is served from the root. This is the
// mode used locally now and on the future Linux server.
const staticExport = process.env.STATIC_EXPORT === "true";
const repoBase = "/alex-creates";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  // Hide the Next.js dev indicator badge (the "N" logo) in the bottom corner.
  devIndicators: false,
  ...(staticExport
    ? { output: "export" as const, basePath: repoBase, assetPrefix: repoBase, trailingSlash: true }
    : {}),
};

export default nextConfig;

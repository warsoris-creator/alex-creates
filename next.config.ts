import type { NextConfig } from "next";

// Deployed to GitHub Pages at https://warsoris-creator.github.io/alex-creates/
// so the app is served from the /alex-creates sub-path.
const repoBase = "/alex-creates";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  basePath: repoBase,
  assetPrefix: repoBase,
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;

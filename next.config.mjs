/** @type {import('next').NextConfig} */
const nextConfig = {
  // OpenAQ is fetched by GitHub Actions; the browser reads static snapshots.
  output: 'export',
  trailingSlash: true,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  env: { NEXT_PUBLIC_BASE_PATH: process.env.GH_PAGES_BASE ? `/${process.env.GH_PAGES_BASE}` : '' },
  // Optional subpath deployment: set via env GH_PAGES_BASE
  assetPrefix: process.env.GH_PAGES_BASE ? `/${process.env.GH_PAGES_BASE}/` : undefined,
  basePath: process.env.GH_PAGES_BASE ? `/${process.env.GH_PAGES_BASE}` : undefined,
  images: { unoptimized: true }, // required for static export
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Hide Next.js's floating "N" badge in development (it never shows on the live site)
  devIndicators: false,
  // Admin edits to curated places are read from this file at runtime
  outputFileTracingIncludes: { "/api/curated/overrides": ["./data/curated-overrides.json"] },
  // Food and Explore were merged into City Guides (query strings like ?city= carry over)
  async redirects() {
    return [
      { source: "/food", destination: "/guides", permanent: false },
      { source: "/explore", destination: "/guides", permanent: false },
    ];
  },
  experimental: {
    // Import only the icons/components actually used instead of whole barrels (big dev-speed win).
    optimizePackageImports: ["@phosphor-icons/react", "@dnd-kit/core", "@dnd-kit/sortable"],
  },
};

export default nextConfig;

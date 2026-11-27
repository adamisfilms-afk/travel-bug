/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Admin edits to curated places are read from this file at runtime
  outputFileTracingIncludes: { "/api/curated/overrides": ["./data/curated-overrides.json"] },
  experimental: {
    // Import only the icons/components actually used instead of whole barrels (big dev-speed win).
    optimizePackageImports: ["@phosphor-icons/react", "@dnd-kit/core", "@dnd-kit/sortable"],
  },
};

export default nextConfig;

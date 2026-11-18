/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Import only the icons/components actually used instead of whole barrels (big dev-speed win).
    optimizePackageImports: ["@phosphor-icons/react", "@dnd-kit/core", "@dnd-kit/sortable"],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // prisma, @prisma/client, pg and express are already on Next 16's built-in
  // auto-external list. These are not, and bundling them breaks Keystone's
  // Node-specific code paths in a serverless function.
  serverExternalPackages: [
    "@keystone-6/core",
    "@keystone-6/auth",
    "@prisma/adapter-pg",
    "graphql",
  ],
  images: {
    // Gallery images are served from Vercel Blob. Inert until components move
    // off raw <img> onto next/image.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;

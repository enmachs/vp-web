import type { NextConfig } from 'next';

const imageHost = (() => {
  const base = process.env.IMAGE_PUBLIC_URL || process.env.S3_ENDPOINT;
  if (!base) return undefined;
  try {
    return new URL(base).hostname;
  } catch {
    return undefined;
  }
})();

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ['graphql'],
  // Workaround since we diverged from Keystone reltionship and document views
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
  images: {
    // Where Keystone's image URLs point (see features/keystone/storage.ts):
    // the public host when IMAGE_PUBLIC_URL is set, otherwise the S3 API host.
    // An empty list, not a bogus hostname, when neither is configured.
    remotePatterns: imageHost
      ? [{ protocol: 'https', hostname: imageHost, port: '', pathname: '/**' }]
      : [],
  },
};

export default nextConfig;
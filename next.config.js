/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Optimize for containerized deployments (Digital Ocean App Platform)
  output: 'standalone',
  // Exclude server-side packages from webpack bundling (Next.js 15 syntax)
  serverExternalPackages: ['archiver', 'unzipper'],
  // Disable typescript and linting checks during build (run separately in CI/CD)
  typescript: {
    // !! WARN !!
    // Only enable this in production if you're running type-check in CI
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
  eslint: {
    // Same as above - run linting in CI, not in production builds
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;

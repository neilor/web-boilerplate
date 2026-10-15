import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The SDK packages ship TypeScript source; Next compiles them like app code.
  transpilePackages: ['@web-boilerplate/sdk-core', '@web-boilerplate/sdk-react'],
  poweredByHeader: false,
};

export default nextConfig;

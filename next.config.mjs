/** @type {import('next').NextConfig} */
const nextConfig = {
  // Moved from experimental to root level
  serverExternalPackages: ['@resvg/resvg-js'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push(
        '@resvg/resvg-js',
        '@resvg/resvg-js-linux-x64-gnu',
        '@resvg/resvg-js-linux-x64-musl'
      );
    }
    return config;
  }
};

export default nextConfig;

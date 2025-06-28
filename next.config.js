/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['undici'],
  },
  webpack: (config, { dev, isServer }) => {
    // Fix for undici compatibility
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }

    // Handle SVG imports
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'www.akshayapatra.org' },
      { protocol: 'https', hostname: 'www.udayfoundation.org' },
      { protocol: 'https', hostname: 'www.annamrita.org' },
      { protocol: 'https', hostname: 'www.feedingindia.org' },
      { protocol: 'https', hostname: 'www.riseagainsthungerindia.org' },
      { protocol: 'https', hostname: 'upload.wikimedia.org'},
      { protocol: 'https', hostname: 'riseagainsthungerindia.org' },
    ],
    formats: ['image/webp', 'image/avif'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  output: 'standalone',
  generateEtags: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  productionBrowserSourceMaps: false,
  optimizeFonts: true,
};

module.exports = nextConfig;
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // cacheComponents is required by experimental.cachedNavigations, which keeps
  // visited routes renderable from the router cache; keep it on in dev too so
  // development behavior matches production.
  cacheComponents: true,
  serverExternalPackages: ["pdf-parse"],
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    // Keep visited routes warm for the browsing session in dev too: the client
    // router reads these flags directly (no dev gate), so without them
    // DYNAMIC_STALETIME_MS is 0 and every back/forward navigation refetches,
    // making visited pages appear uncached while developing.
    cachedNavigations: true,
    staleTimes: {
      // Keep visited dynamic routes warm for the current browsing session unless
      // they are explicitly refreshed or invalidated by a mutation/realtime update.
      dynamic: 1800,
      static: 300,
    },
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
  },
  // Ensure service worker is served correctly
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

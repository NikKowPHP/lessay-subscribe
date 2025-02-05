import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Properly configure base URL for all environments
    NEXT_PUBLIC_BASE_URL: process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_BASE_URL || 'https://lessay-app.vercel.app',
  },
  experimental: {
    // Performance optimizations
    turbo: {
      loaders: {
        // Add loaders for better asset optimization
        '.png': ['file-loader'],
        '.jpg': ['file-loader'],
        '.svg': ['file-loader'],
      },
      resolveAlias: {
        // Add module aliases for better tree-shaking
        '@': './src',
      },
    },
    // Enable optimizations
    optimizePackageImports: ['@/components'],
    // Enable next-sitemap integration
    nextScriptWorkers: true,
  },
  // Add sitemap and robots.txt configuration
  sitemap: {
    hostname: process.env.NEXT_PUBLIC_BASE_URL,
    exclude: ['/api/*'],
    routes: async () => {
      const pages = [
        { url: '/', lastModified: new Date() },
        { url: '/about', lastModified: new Date() },
        { url: '/privacy', lastModified: new Date() },
        { url: '/terms', lastModified: new Date() },
      ];
      return pages;
    },
  },
  robotsTxt: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
    ],
    additionalSitemaps: [
      `${process.env.NEXT_PUBLIC_BASE_URL}/sitemap.xml`,
    ],
  },
  // Core optimizations
  swcMinify: true,      // Use SWC for minification
  reactStrictMode: true,
  optimizeFonts: true,   // Optimize fonts automatically
  compress: true,        // Enable compression
  poweredByHeader: false, // Remove X-Powered-By header
  generateEtags: true,   // Generate ETags for caching
  productionBrowserSourceMaps: false, // Disable source maps in production
  
  // Cache and performance
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000, // 1 hour
    pagesBufferLength: 5,
  },
  
  // Asset optimization
  images: {
    domains: [
      new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://lessay-app.vercel.app').hostname
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  
  // Output optimization
  output: 'standalone',
};

export default nextConfig;

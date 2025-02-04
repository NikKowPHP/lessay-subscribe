import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    serverComponentsExternalPackages: [],
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
    domains: [],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  
  // Output optimization
  output: 'standalone',
};

export default nextConfig;

// todo: seo, sitemap, robots.txt, etc.
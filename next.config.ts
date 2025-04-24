import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverActions: {
    bodySizeLimit: '5mb', // Increase the limit (e.g., to 5MB or adjust as needed)
  },
  env: {
    // Properly configure base URL for all environments
    NEXT_PUBLIC_BASE_URL: process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_BASE_URL || 'https://lessay-app.vercel.app',
  },
  experimental: {
    // Performance optimizations
    turbo: {
      rules: {
        "*.png": ["file-loader"],
        "*.jpg": ["file-loader"],
        "*.svg": ["file-loader"],
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
 
  reactStrictMode: true,
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

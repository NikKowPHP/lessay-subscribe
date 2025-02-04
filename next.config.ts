import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  swcMinify: true,      // Use SWC for minification for optimal performance
  reactStrictMode: true,
  optimizeFonts: true,   // Optimize fonts automatically
  // Add any additional performance options here
};

export default nextConfig;

// todo: seo, sitemap, robots.txt, etc.
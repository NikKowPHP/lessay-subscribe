const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://lessay-app.vercel.app';

const config = {
  siteUrl: siteUrl,
  generateRobotsTxt: true,
  exclude: ['/api/*', '/404'],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/*'],
      },
    ],
    additionalSitemaps: [
      `${siteUrl}/server-sitemap.xml`,
    ],
  },
  transform: async (config, path) => {
    return {
      loc: path,
      changefreq: 'daily',
      priority: config.priority,
      lastmod: new Date().toISOString(),
    };
  },
};

export default config;
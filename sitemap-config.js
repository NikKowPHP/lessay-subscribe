module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://lessay-app.vercel.app',
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
      `${process.env.NEXT_PUBLIC_BASE_URL}/server-sitemap.xml`,
    ],
  },
  transform: async (config, path) => {
    return {
      loc: path,
      changefreq: 'daily',
      priority: config.priority,
      lastmod: new Date().toISOString(),
    }
  },
};
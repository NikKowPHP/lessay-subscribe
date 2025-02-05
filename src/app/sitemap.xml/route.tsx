import { NextResponse } from "next/server";

export async function GET() {
  // Base URL for your site. Make sure to set NEXT_PUBLIC_BASE_URL in your environment.
  const baseUrl = "https://lessay-app.vercel.app";

  // List all your important pages here.
  const pages = [
    "", // home page
    "/about",
    "/privacy",
    "/terms"
    // Add more pages as needed
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map((page) => {
    const loc = `${baseUrl}${page}`;
    const priority = page === "" ? "1.0" : "0.7";
    return `
  <url>
    <loc>${loc}</loc>
    <changefreq>daily</changefreq>
    <priority>${priority}</priority>
  </url>`;
  })
  .join("")}
</urlset>
`;

  return new NextResponse(sitemap, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
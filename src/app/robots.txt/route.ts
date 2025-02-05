import { NextResponse } from "next/server";

export function GET() {
  // You can modify these rules based on your needs.
  const content = `
User-agent: *
Allow: /

Sitemap: https://lessay.app/sitemap.xml
`;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
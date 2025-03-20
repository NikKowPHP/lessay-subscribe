import './globals.css';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';
import { ErrorProvider } from '@/hooks/useError';
import { PostHogProvider } from '@/context/posthog-context';





import { siteMetadata } from '@/utils/metadata';
export const metadata = siteMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Add preconnect for critical third-party resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.cdnfonts.com/css/segoe-ui-4?styles=18006,18005,18004,18003" rel="stylesheet"></link>

        {/* Add preload for critical assets */}
        <link rel="preload" as="image" href="/og-image.webp" />
      </head>
      <body
        className={`antialiased relative`}
      >
        <ErrorProvider>
          <PostHogProvider>{children}</PostHogProvider>
        </ErrorProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}

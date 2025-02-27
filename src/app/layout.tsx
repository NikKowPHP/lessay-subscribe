import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/react"
import { ErrorProvider } from "@/hooks/useError";
import { PostHogProvider } from "@/context/posthog-context";

// Optimize font loading
const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: 'swap', // Add this for better font loading
  preload: true,   // Add this to prioritize font loading
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: 'swap',
  preload: true,
});



import { siteMetadata } from '@/utils/metadata';
import { SubscriptionProvider } from "@/context/subscription-context";
import { RecordingProvider } from "@/context/recording-context";
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
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        
        {/* Add preload for critical assets */}
        <link rel="preload" as="image" href="/og-image.webp" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased relative`}
      >
        <ErrorProvider>
          <PostHogProvider>
            <SubscriptionProvider>
              <RecordingProvider>
                {children}
              </RecordingProvider>
            </SubscriptionProvider>
          </PostHogProvider>
        </ErrorProvider>
     
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}

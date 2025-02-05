import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const rawBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
const baseUrl =
  rawBaseUrl && rawBaseUrl.startsWith("http")
    ? rawBaseUrl
    : "https://lessay-app.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "lessay - AI-Powered Language Learning Platform",
    template: "%s | lessay - Smart Language Learning"
  },
  description: "Transform your language learning journey with lessay's AI-powered platform. Personalized lessons, adaptive learning, and efficient progress tracking for faster fluency.",
  keywords: [
    "language learning app",
    "AI language tutor",
    "adaptive learning platform",
    "personalized language lessons",
    "efficient language learning",
    "smart language app",
    "language fluency tool",
    "AI education platform",
    "language learning software",
    "custom language courses"
  ],
  authors: [{ name: "lessay" }],
  creator: "lessay",
  publisher: "lessay",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  verification: {
    google: "4dBatA2Gt_G8fuxhTD9jhkv6T6FBmD1jDdu1c6IztxQ"
  },
  openGraph: {
    title: "lessay - Smart Language Learning",
    description: "Revolutionary AI-driven platform for efficient language mastery",
    url: baseUrl,
    siteName: "lessay",
    images: [
      {
        url: `${baseUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
      }
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "lessay - Learn Languages Smarter",
    description: "AI-powered adaptive language learning platform",
    images: [`${baseUrl}/og-image.jpg`],
    creator: "@lessay_app"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    }
  },
  icons: {
    icon: "/favicons/favicon.ico",
    shortcut: "/favicons/favicon-16x16.png",
    apple: "/favicons/apple-touch-icon.png",
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" }
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
      <SpeedInsights />
    </html>
  );
}

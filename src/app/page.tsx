import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import SubscriptionForm from '../components/Form';
import type { Metadata } from 'next';
import Script from 'next/script';
import YouTubeVideoWrapper from '@/components/YoutubeWrapper';

const FeaturesDropdown = dynamic(() => import('../components/FeaturesDropdown'), {
  loading: () => <div className="animate-pulse h-40 bg-gray-200 rounded-xl" />,
  ssr: true
});

const Footer = dynamic(() => import('@/components/Footer'), {
  ssr: true 
});

const Recording = dynamic(() => import('../components/Recording'), {
  ssr: true,
  loading: () => <div className="animate-pulse h-40 bg-gray-200 rounded-xl" />,
});

export const metadata: Metadata = {
  title: "AI Accent & Pronunciation Analysis | lessay",
  description: "Get instant AI-powered feedback on your accent, pronunciation patterns, and speech characteristics. Join lessay's waitlist for advanced accent analysis.",
  keywords: ["accent analysis", "pronunciation feedback", "accent detection", "speech analysis", "phonological assessment"],
  openGraph: {
    title: "AI-Powered Accent & Pronunciation Analysis | lessay",
    description: "Revolutionary AI technology for detailed accent assessment and pronunciation feedback",
    images: [
      {
        url: "/og-accent-analysis.jpg",
        width: 1200,
        height: 630,
        alt: "AI Accent Analysis Interface",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Accent & Pronunciation Analysis | lessay",
    description: "Get instant feedback on your accent and pronunciation with AI technology",
    images: ["/og-accent-analysis.jpg"],
  },
};


export default function Home() {

   const generateJsonLd = () => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How does the AI accent analysis work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Our AI system analyzes your speech patterns, pronunciation, and phonological features using advanced machine learning models to provide detailed feedback on your accent characteristics."
        }
      },
      {
        "@type": "Question",
        "name": "What languages are supported for accent analysis?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The system currently supports accent analysis for 50+ languages including English, Spanish, Mandarin, French, and German, identifying regional accents and pronunciation patterns."
        }
      }
    ]
  });
  
  const jsonLd = generateJsonLd();

  const videoId = process.env.NEXT_PUBLIC_YOUTUBE_VIDEO_ID;

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-2 sm:p-8 pb-20 gap-16  font-[family-name:var(--font-geist-sans)] max-w-4xl mx-auto">
      <main className="flex flex-col gap-8 row-start-2 items-center max-w-full sm:max-w-[1000px]">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-black to-black/70 dark:from-white dark:to-white/70 inline-block bg-clip-text text-transparent">
              lessay
            </span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Analyze your accent, not the fluff
          </p>
        </div>

        {/* <YouTubeVodeo videoId="vNMmQsKgOgs" pageLoaded={true} /> */}
        <div className="w-full h-96">
          {process.env.NODE_ENV === 'development' && <div className="w-full h-96 bg-gray-200 rounded-xl"></div>}
          {videoId && process.env.NODE_ENV === 'production' && <YouTubeVideoWrapper videoId={videoId} />}
        </div>

        <div
          id="waitlist"
          className="sticky top-8 w-full max-w-4xl bg-white/80 dark:bg-black/80 backdrop-blur-sm p-6 rounded-xl border border-black/[.08] dark:border-white/[.145]"
        >
          <h2 className="text-xl font-semibold mb-2 text-center">
            Join the waitlist
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
            Be the first to experience advanced AI accent and pronunciation analysis.
          </p>
          <Suspense
            fallback={
              <div className="animate-pulse h-10 bg-gray-200 rounded w-full" />
            }
          >
            <SubscriptionForm />
          </Suspense>
        </div>

        <Suspense
          fallback={
            <div className="animate-pulse h-40 bg-gray-200 rounded-xl" />
          }
        >
          <Recording />
        </Suspense>

        <Suspense
          fallback={
            <div className="animate-pulse h-40 bg-gray-200 rounded-xl" />
          }
        >
          <FeaturesDropdown />
        </Suspense>

        <div>
          <h3 className="text-xl font-semibold mb-2 text-center">Contact Us</h3>
          <a href="mailto:lessay.tech@gmail.com">lessay.tech@gmail.com</a>
        </div>
      </main>

      <Suspense fallback={<div className="h-20" />}>
        <Footer />
      </Suspense>

      <Script
        id="json-ld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}

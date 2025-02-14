import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import SubscriptionForm from '../components/form';
import type { Metadata } from 'next';
import Script from 'next/script';
import YouTubeVideoWrapper from '@/components/YoutubeWrapper';

// Dynamically import non-critical components
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

// const YouTubeVideo = dynamic(() => import('../components/YoutubeVideo'), {
//   ssr: false,
//   loading: () => <div className="animate-pulse h-40 bg-gray-200 rounded-xl" />,
// });

export const metadata: Metadata = {
  title: "AI Accent Analysis & Language Learning | lessay",
  description: "Get instant AI-powered feedback on pronunciation, fluency, and language patterns. Join lessay's waitlist for advanced language learning.",
  keywords: ["accent analysis", "pronunciation feedback", "language learning AI", "fluency assessment"],
  openGraph: {
    title: "AI-Powered Language Analysis | lessay",
    description: "Revolutionary AI technology for accent assessment and language learning",
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
    title: "AI Accent Analysis & Language Learning | lessay",
    description: "Get instant feedback on your pronunciation with AI technology",
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
          "text": "Our AI system analyzes your speech patterns, pronunciation, and language structure using advanced machine learning models to provide detailed feedback"
        }
      },
      {
        "@type": "Question",
        "name": "What languages are supported?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The system currently supports analysis for 50+ languages including English, Spanish, Mandarin, French, and German"
        }
      }
    ]
  });
  
  const jsonLd = generateJsonLd();

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-2 sm:p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center max-w-full sm:max-w-[1000px]">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            <span
              className="bg-gradient-to-r from-black to-black/70 dark:from-white dark:to-white/70 inline-block bg-clip-text text-transparent"
            >
              lessay
            </span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Learn a language, not the fluff
          </p>
        </div>

       
          {/* <YouTubeVideo videoId="vNMmQsKgOgs" pageLoaded={true} /> */}
          <YouTubeVideoWrapper videoId="vNMmQsKgOgs" /> 

        <div
          id="waitlist"
          className="sticky top-8 w-full max-w-4xl bg-white/80 dark:bg-black/80 backdrop-blur-sm p-6 rounded-xl border border-black/[.08] dark:border-white/[.145]"
        >
          <h2 className="text-xl font-semibold mb-2 text-center">
            Join the waitlist
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
            Be the first to experience smarter language learning.
          </p>
          <Suspense fallback={<div className="animate-pulse h-10 bg-gray-200 rounded w-full" />}>
            <SubscriptionForm />
          </Suspense>
        </div>

         <Suspense fallback={<div className="animate-pulse h-40 bg-gray-200 rounded-xl" />}>
          <Recording />
        </Suspense>

        <Suspense fallback={<div className="animate-pulse h-40 bg-gray-200 rounded-xl" />}>
          <FeaturesDropdown />
        </Suspense>
     
        
      
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

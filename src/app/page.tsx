import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import SubscriptionForm from '../components/form';
import type { Metadata } from 'next';
import Script from 'next/script';

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

export const metadata: Metadata = {
  title: "AI-Powered Language Learning Platform | lessay",
  description: "Join lessay's waitlist for revolutionary AI-driven language learning. Skip the fluff and learn efficiently with personalized, adaptive lessons.",
  openGraph: {
    title: "Join lessay - Revolutionary Language Learning Platform",
    description: "Transform your language learning journey with AI-powered personalized lessons. Join our waitlist today.",
  },
};


export default function Home() {

   const generateJsonLd = () => {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'lessay',
      description: 'AI-Powered Language Learning Platform',
      url: 'https://lessay-app.vercel.app',
      potentialAction: {
        '@type': 'SignUp',
        name: 'Join Waitlist',
        target: 'https://lessay-app.vercel.app/#waitlist'
      }
    };
  };
  
  const jsonLd = generateJsonLd();

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-2 sm:p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center max-w-full sm:max-w-[1000px]">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            <span
              style={{
                WebkitTextFillColor: 'transparent',
                WebkitBackgroundClip: 'text',
              }}
              className="bg-gradient-toaiResponse-r from-black to-black/70 dark:from-white dark:to-white/70 inline-block !text-transparent bg-clip-text"
            >
              lessay
            </span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Learn a language, not the fluff
          </p>
        </div>

        <div
          id="waitlist"
          className="sticky top-8 w-full max-w-md bg-white/80 dark:bg-black/80 backdrop-blur-sm p-6 rounded-xl border border-black/[.08] dark:border-white/[.145]"
        >
          <h2 className="text-xl font-semibold mb-2 text-center">
            Join the waitlist
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
            Be the first to experience smarter language learning.
          </p>
          <Suspense fallback={<div className="animate-pulse h-10 bg-gray-200 rounded" />}>
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

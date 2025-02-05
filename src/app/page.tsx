import SubscriptionForm from '../components/form';
import FeaturesDropdown from '../components/FeaturesDropdown';
import Footer from '@/components/Footer';

export default function Home() {
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
              className="bg-gradient-to-r from-black to-black/70 dark:from-white dark:to-white/70 inline-block !text-transparent bg-clip-text"
            >
              lessay
            </span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Learn a language, not the fluff
          </p>
        </div>

        <div className="sticky top-8 w-full max-w-md bg-white/80 dark:bg-black/80 backdrop-blur-sm p-6 rounded-xl border border-black/[.08] dark:border-white/[.145]">
          <h2 className="text-xl font-semibold mb-2 text-center">
            Join the waitlist
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
            Be the first to experience smarter language learning.
          </p>
          <SubscriptionForm />
        </div>

        <FeaturesDropdown />
      </main>

      <Footer />
    </div>
  );
}

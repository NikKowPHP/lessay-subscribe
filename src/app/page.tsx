import Image from "next/image";
import SubscriptionForm from "../components/form";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start max-w-2xl">
        <div className="text-center sm:text-left">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-black to-black/70 dark:from-white dark:to-white/70 inline-block text-transparent bg-clip-text">
              lessay
            </span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Learn a language, not the fluff
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 w-full mt-4">
          <div className="group p-6 rounded-xl border border-black/[.08] dark:border-white/[.145] hover:border-black/20 dark:hover:border-white/30 transition-all">
            <div className="flex items-start space-x-4">
              <div className="bg-gradient-to-b from-black/[.08] to-black/[.04] dark:from-white/[.08] dark:to-white/[.04] rounded-lg p-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Adaptive Learning</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Our AI tailors lessons to your goals and learning style
                </p>
                <div className="overflow-hidden max-h-0 group-hover:max-h-40 transition-all duration-300">
                  <p className="text-sm text-gray-500 dark:text-gray-400 pt-2 border-t border-black/[.08] dark:border-white/[.145]">
                    Skip repetitive content and focus on what matters. Our AI analyzes your progress 
                    and adjusts the curriculum in real-time.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="group p-6 rounded-xl border border-black/[.08] dark:border-white/[.145] hover:border-black/20 dark:hover:border-white/30 transition-all">
            <div className="flex items-start space-x-4">
              <div className="bg-gradient-to-b from-black/[.08] to-black/[.04] dark:from-white/[.08] dark:to-white/[.04] rounded-lg p-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Smart Progress</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Focus on what matters - skip what you already know
                </p>
                <div className="overflow-hidden max-h-0 group-hover:max-h-40 transition-all duration-300">
                  <p className="text-sm text-gray-500 dark:text-gray-400 pt-2 border-t border-black/[.08] dark:border-white/[.145]">
                    Our platform assesses your current level and creates a personalized learning path
                    that evolves with your progress.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky top-8 w-full max-w-md mt-8 bg-white/80 dark:bg-black/80 backdrop-blur-sm p-6 rounded-xl border border-black/[.08] dark:border-white/[.145]">
          <h2 className="text-xl font-semibold mb-2 text-center sm:text-left">
            Join the waitlist
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center sm:text-left">
            Be the first to experience smarter language learning.
          </p>
          <SubscriptionForm />
        </div>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <button
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black text-sm sm:text-base h-10 sm:h-12 px-6 sm:px-8 group"
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
          >
            How it works
            <svg className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center text-sm text-gray-600 dark:text-gray-400">
        <a
          className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          href="#"
        >
          About
        </a>
        <a
          className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          href="#"
        >
          Blog
        </a>
        <a
          className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          href="#"
        >
          Privacy
        </a>
        <a
          className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          href="#"
        >
          Terms
        </a>
      </footer>
    </div>
  );
}

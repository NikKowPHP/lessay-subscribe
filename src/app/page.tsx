import Image from "next/image";
import SubscriptionForm from "../components/form";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start max-w-2xl">
        <div className="text-center sm:text-left">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-blue-500 inline-block text-transparent bg-clip-text">
            Lessay
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Learn a language, not the fluff
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mt-4">
          <div className="p-4 rounded-xl border border-black/[.08] dark:border-white/[.145] hover:border-purple-500/50 transition-colors">
            <h3 className="font-semibold mb-2">Adaptive Learning</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Our AI tailors lessons to your goals and learning style
            </p>
          </div>
          <div className="p-4 rounded-xl border border-black/[.08] dark:border-white/[.145] hover:border-blue-500/50 transition-colors">
            <h3 className="font-semibold mb-2">Smart Progress</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Focus on what matters - skip what you already know
            </p>
          </div>
        </div>

        <div className="w-full max-w-md mt-8">
          <h2 className="text-xl font-semibold mb-2 text-center sm:text-left">
            Join the waitlist
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center sm:text-left">
            Be the first to experience smarter language learning.
          </p>
          <SubscriptionForm />
        </div>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-500 text-white gap-2 hover:opacity-90 text-sm sm:text-base h-10 sm:h-12 px-6 sm:px-8"
            href="#"
            target="_blank"
            rel="noopener noreferrer"
          >
            Try Demo
          </a>
          <a
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent text-sm sm:text-base h-10 sm:h-12 px-6 sm:px-8"
            href="#"
            target="_blank"
            rel="noopener noreferrer"
          >
            How it works
          </a>
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

import Footer from "@/components/Footer";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "About Us - Accent & Pronunciation Analysis | lessay",
  description: "Discover how lessay is revolutionizing accent and pronunciation analysis with AI technology. Learn about our mission to provide detailed feedback on your pronunciation and accent characteristics.",
  openGraph: {
    title: "About lessay - AI-Powered Accent and Pronunciation Analysis",
    description: "Learn about lessay's innovative approach to accent and pronunciation analysis using AI technology and personalized feedback.",
  },
};

export default function About() {
  return (
    <div className="flex flex-col items-center justify-items-center  sm:p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center max-w-full sm:max-w-[1000px]">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-black to-black/70 dark:from-white dark:to-white/70 inline-block text-transparent bg-clip-text">
              lessay
            </span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Analyze your accent, not the fluff
          </p>
        </div>

        <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl bg-white/80 dark:bg-black/80 backdrop-blur-sm p-6 rounded-xl dark:border-white/[.145]">
          <h2 className="text-xl font-semibold mb-4 text-center">About lessay</h2>
          <div className="space-y-6">
            <p className="text-base text-gray-600 dark:text-gray-400">
              lessay is an innovative AI-powered platform specializing in detailed accent and pronunciation analysis. We focus on providing personalized feedback to help you refine your spoken language skills. We believe in efficiency, personalized learning, and making accent improvement effective.
            </p>
            <p className="text-base text-gray-600 dark:text-gray-400">
              Our platform uses cutting-edge AI to assess your pronunciation and accent characteristics, providing tailored insights. By identifying key areas for improvement, lessay helps you enhance your clarity and confidence in speaking.
            </p>
          </div>
        </div>

        <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl bg-white/80 dark:bg-black/80 backdrop-blur-sm p-6 rounded-xl ">
          <h3 className="text-xl font-semibold mb-4 text-center">Our Mission</h3>
          <p className="text-base text-gray-600 dark:text-gray-400">
            At lessay, our mission is to revolutionize accent and pronunciation analysis by delivering tailored feedback—specific to your unique speaking style—so you can achieve clear and confident communication in the most efficient way possible.
          </p>
        </div>

        <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl bg-white/80 dark:bg-black/80 backdrop-blur-sm p-6 rounded-xl ">
          <h3 className="text-xl font-semibold mb-4 text-center">Our Vision</h3>
          <p className="text-base text-gray-600 dark:text-gray-400">
            We envision a world where everyone has access to detailed, personalized accent and pronunciation analysis. lessay empowers you to refine your speaking style, unlocking new opportunities for connection and growth.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

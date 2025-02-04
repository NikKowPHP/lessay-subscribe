import Footer from "@/components/Footer";

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
            Learn a language, not the fluff
          </p>
        </div>

        <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl bg-white/80 dark:bg-black/80 backdrop-blur-sm p-6 rounded-xl dark:border-white/[.145]">
          <h2 className="text-xl font-semibold mb-4 text-center">About lessay</h2>
          <div className="space-y-6">
            <p className="text-base text-gray-600 dark:text-gray-400">
              lessay is an innovative adaptive language learning platform that focuses on teaching you only what you need. We believe in efficiency, personalized learning, and making language acquisition fun and effective.
            </p>
            <p className="text-base text-gray-600 dark:text-gray-400">
              Our platform uses cutting-edge AI to assess your skill level and tailor lessons specifically for you. By skipping repetitive content and honing in on your unique strengths, lessay helps you progress faster.
            </p>
          </div>
        </div>

        <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl bg-white/80 dark:bg-black/80 backdrop-blur-sm p-6 rounded-xl ">
          <h3 className="text-xl font-semibold mb-4 text-center">Our Mission</h3>
          <p className="text-base text-gray-600 dark:text-gray-400">
            At lessay, our mission is to revolutionize language learning by delivering only what you need—tailored to your learning style—so you can achieve fluency in the most efficient way possible.
          </p>
        </div>

        <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl bg-white/80 dark:bg-black/80 backdrop-blur-sm p-6 rounded-xl ">
          <h3 className="text-xl font-semibold mb-4 text-center">Our Vision</h3>
          <p className="text-base text-gray-600 dark:text-gray-400">
            We envision a world where learning languages is accessible, efficient, and enjoyable. lessay empowers you to reach fluency faster, unlocking new opportunities for connection and growth.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

import Footer from "@/components/Footer";

export default function Terms() {
  return (
    <div className="flex flex-col items-center justify-items-center sm:p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center max-w-full sm:max-w-[1000px]">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            <span 
              style={{ 
                WebkitTextFillColor: "transparent",
                WebkitBackgroundClip: "text"
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

        <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl bg-white/80 dark:bg-black/80 backdrop-blur-sm p-6 rounded-xl">
          <h2 className="text-xl font-semibold mb-4 text-center">Terms of Service</h2>
          <div className="space-y-6">
            <p className="text-base text-gray-600 dark:text-gray-400">
              By using lessay&lsquo;s adaptive language learning platform, you agree to these Terms. Our AI-driven approach focuses on teaching only what you need, avoiding unnecessary repetition.
            </p>

            <div className="space-y-4">
              <h3 className="font-semibold">1. Acceptance of Terms</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Accessing or using our AI-powered language lessons constitutes agreement to these Terms. We personalize content based on your learning patterns and goals.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">2. User Responsibilities</h3>
              <p className="text-gray-600 dark:text-gray-400">
                You agree to provide accurate learning preferences and not misuse our adaptive algorithms. Content is for personal use only - no redistribution of AI-generated lesson plans.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">3. AI-Generated Content</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Our platform dynamically creates lessons using machine learning. While we strive for accuracy, language patterns may evolve and outcomes cannot be guaranteed.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold">4. Subscription & Access</h3>
              <p className="text-gray-600 dark:text-gray-400">
              During our beta phase, you join a waitlist for early access. Future subscriptions will auto-renew but can be canceled anytime through your adaptive learning profile.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold">5. Termination</h3>
              <p className="text-gray-600 dark:text-gray-400">
                We may suspend accounts that abuse our AI systems or attempt to reverse-engineer our adaptive learning algorithms. You may opt-out of personalized tracking at any time.
              </p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl bg-white/80 dark:bg-black/80 backdrop-blur-sm p-6 rounded-xl">
          <div className="space-y-6">
           

         

            <div className="space-y-4">
              <h3 className="font-semibold text-center">Updates to Terms</h3>
              <p className="text-gray-600 dark:text-gray-400">
                As our machine learning models evolve, we may update these Terms. Continued use after changes constitutes acceptance of new AI-driven features and policies.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}


import Footer from "@/components/Footer";

export default function Privacy() {
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
          <h2 className="text-xl font-semibold mb-4 text-center">Data Collection</h2>
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Learning Data</h3>
              <p className="text-gray-600 dark:text-gray-400">
                We collect data about your learning progress, including:
                <ul className="list-disc pl-6 mt-2">
                  <li>Lesson completion rates</li>
                  <li>Vocabulary retention patterns</li>
                  <li>Grammar concept mastery</li>
                  <li>Interaction with adaptive exercises</li>
                </ul>
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">User Information</h3>
              <p className="text-gray-600 dark:text-gray-400">
                We store information you provide directly:
                <ul className="list-disc pl-6 mt-2">
                  <li>Email address for account notifications</li>
                  <li>Language learning preferences</li>
                  <li>Self-reported proficiency levels</li>
                </ul>
              </p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl bg-white/80 dark:bg-black/80 backdrop-blur-sm p-6 rounded-xl">
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-center">Data Usage</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your data helps us:
                <ul className="list-disc pl-6 mt-2">
                  <li>Personalize lesson plans using AI</li>
                  <li>Improve adaptive learning algorithms</li>
                  <li>Send progress reports and platform updates</li>
                  <li>Develop new language learning features</li>
                </ul>
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-center">Email Communications</h3>
              <p className="text-gray-600 dark:text-gray-400">
                We use your email to:
                <ul className="list-disc pl-6 mt-2">
                  <li>Notify about lesson recommendations</li>
                  <li>Share learning progress updates</li>
                  <li>Inform about new platform features</li>
                  <li>Send security-related announcements</li>
                </ul>
              </p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl bg-white/80 dark:bg-black/80 backdrop-blur-sm p-6 rounded-xl">
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-center">Your Rights</h3>
              <p className="text-gray-600 dark:text-gray-400">
                You can:
                <ul className="list-disc pl-6 mt-2">
                  <li>Request access to collected data</li>
                  <li>Correct inaccurate information</li>
                  <li>Delete your learning profile</li>
                  <li>Opt-out of non-essential emails</li>
                </ul>
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
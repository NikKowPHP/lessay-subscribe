'use client';

import { useRouter } from 'next/navigation';
import { useLesson } from '@/context/lesson-context';
import { useOnboarding } from '@/context/onboarding-context';
import { LessonModel } from '@/models/AppAllModels.model';
import HeaderWithProfile from '@/components/HeaderWithProfile';
import { useEffect, useState } from 'react';
import logger from '@/utils/logger';

export default function LessonsPage() {
  const router = useRouter();
  const { onboarding } = useOnboarding();
  const { lessons, loading, initialized, refreshLessons, isGeneratingInitial, error } = useLesson(); // Add isGeneratingInitial and error
  const [hasAttemptedRefetch, setHasAttemptedRefetch] = useState(false);

  const handleStartLesson = (lesson: LessonModel) => {
    router.push(`/app/lessons/${lesson.id}`);
  };

  // Effect to trigger refetch if initialized with no lessons (remains the same, but added isGeneratingInitial check)
  useEffect(() => {
    if (initialized && !loading && lessons.length === 0 && !hasAttemptedRefetch && !isGeneratingInitial) { // Don't refetch if generating
      logger.warn("LessonsPage: Initialized but no lessons found. Attempting refetch.");
      setHasAttemptedRefetch(true);
      refreshLessons().catch(err => {
        logger.error("LessonsPage: Error during automatic refetch:", err);
      });
    }
  }, [initialized, loading, lessons.length, hasAttemptedRefetch, refreshLessons, isGeneratingInitial]); // Add isGeneratingInitial

  // Initial loading state (before context is initialized or while generating)
  if (!initialized || isGeneratingInitial) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-1">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-6 mb-4"></div>
        <p className="text-xl text-neutral-12">
          {isGeneratingInitial ? "Generating Your First Lessons..." : "Loading your learning plan..."}
        </p>
        <p className="text-sm text-neutral-8 mt-2">
          {isGeneratingInitial ? "This might take a moment..." : "Please wait..."}
        </p>
      </div>
    );
  }

  // Loading state (while fetching/refreshing after initialization)
  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 bg-neutral-1 min-h-screen">
        <HeaderWithProfile />
        <h1 className="text-3xl font-bold mb-8 text-neutral-12">Your Lessons</h1>
        <div className="text-center py-12 border rounded-[4px] p-8 bg-neutral-2">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent-6 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold mb-4 text-neutral-12">
            Loading Lessons...
          </h2>
          <p className="text-neutral-10">
            Please wait...
          </p>
        </div>
      </div>
    );
  }

  // Content rendering after loading/generation is complete
  return (
    <div className="container mx-auto py-8 px-4 bg-neutral-1 min-h-screen">
      <HeaderWithProfile />
      <h1 className="text-3xl font-bold mb-8 text-neutral-12">Your Lessons</h1>

      {/* Handle potential errors during fetch/generation */}
      {error && !loading && !isGeneratingInitial && (
        <div className="text-center py-12 border border-red-300 rounded-[4px] p-8 bg-red-50 text-red-700">
          <h2 className="text-2xl font-bold mb-4">
            Oops! Something went wrong.
          </h2>
          <p className="mb-6">
            {error}
          </p>
          <button
            onClick={() => {
              setHasAttemptedRefetch(false); // Allow manual refresh to try again
              refreshLessons();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-[4px] hover:bg-red-700 text-sm"
            disabled={loading || isGeneratingInitial} // Disable while loading/generating
          >
            {loading ? "Retrying..." : "Try Again"}
          </button>
        </div>
      )}

      {/* Handle case where no lessons exist AND no error occurred */}
      {!error && lessons.length === 0 && !loading && !isGeneratingInitial ? (
        <div className="text-center py-12 border rounded-[4px] p-8 bg-neutral-2">
          <h2 className="text-2xl font-bold mb-4 text-neutral-12">
            No Lessons Found Yet
          </h2>
          <p className="text-neutral-10 mb-6">
            It seems your initial lessons haven't been generated or loaded correctly.
          </p>
          <button
            onClick={() => {
              setHasAttemptedRefetch(false); // Allow manual refresh to try again
              refreshLessons();
            }}
            className="px-4 py-2 bg-accent-6 text-white rounded-[4px] hover:bg-accent-7 text-sm"
            disabled={loading || isGeneratingInitial} // Disable while loading/generating
          >
            {loading ? "Refreshing..." : "Try Refreshing"}
          </button>
          <p className="text-xs text-neutral-8 mt-4">
            If the problem persists after refreshing, please contact support.
          </p>
        </div>
      ) : null}

      {/* Display lessons if they exist and there's no error */}
      {!error && lessons.length > 0 && !loading && !isGeneratingInitial ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="border rounded-[4px] overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-neutral-2"
            >
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-2 text-neutral-12">
                  {lesson.focusArea}
                </h2>
                <div className="mb-4">
                  <p className="text-sm text-neutral-8">
                    {lesson.targetSkills.join(', ')}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${lesson.completed
                        ? 'bg-accent-1 text-accent-9'
                        : 'bg-accent-2 text-accent-10'
                      }`}
                  >
                    {lesson.completed ? 'Completed' : 'In Progress'}
                  </span>
                  <button
                    onClick={() => handleStartLesson(lesson)}
                    className="px-4 py-2 bg-accent-6 text-white rounded-[4px] hover:bg-accent-7 text-sm"
                  >
                    {lesson.completed ? 'Review' : 'Start'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
// --- NEW CODE END ---

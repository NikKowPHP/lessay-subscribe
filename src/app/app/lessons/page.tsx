// src/app/app/lessons/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useLesson } from '@/context/lesson-context';
import { useOnboarding } from '@/context/onboarding-context';
import { LessonModel } from '@/models/AppAllModels.model';
import HeaderWithProfile from '@/components/HeaderWithProfile';
import { useEffect, useState } from 'react'; // Import useEffect and useState
import logger from '@/utils/logger'; // Import logger

export default function LessonsPage() {
  const router = useRouter();
  const { onboarding } = useOnboarding();
  const { lessons, loading, initialized, refreshLessons } = useLesson(); // Add refreshLessons
  const [hasAttemptedRefetch, setHasAttemptedRefetch] = useState(false); // Local state for refetch attempt

  const handleStartLesson = (lesson: LessonModel) => {
    router.push(`/app/lessons/${lesson.id}`);
  };

  // Effect to trigger refetch if initialized with no lessons
  useEffect(() => {
    if (initialized && !loading && lessons.length === 0 && !hasAttemptedRefetch) {
      logger.warn("LessonsPage: Initialized but no lessons found. Attempting refetch.");
      setHasAttemptedRefetch(true); // Mark that we've attempted the refetch
      refreshLessons().catch(err => {
        logger.error("LessonsPage: Error during automatic refetch:", err);
        // Error is likely already shown by the context's callAction
      });
    }
  }, [initialized, loading, lessons.length, hasAttemptedRefetch, refreshLessons]);

  // Initial loading state (before context is initialized)
  if (!initialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-1">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-6 mb-4"></div>
        <p className="text-xl text-neutral-12">
          Loading your personalized lessons...
        </p>
        <p className="text-sm text-neutral-8 mt-2">
          We're preparing content based on your assessment
        </p>
      </div>
    );
  }

  // Loading state (while fetching/refreshing)
  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 bg-neutral-1 min-h-screen">
        <HeaderWithProfile />
        <h1 className="text-3xl font-bold mb-8 text-neutral-12">Your Lessons</h1>
        <div className="text-center py-12 border rounded-[4px] p-8 bg-neutral-2">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent-6 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold mb-4 text-neutral-12">
            {hasAttemptedRefetch ? "Refreshing Lessons..." : "Generating Your Learning Plan..."}
          </h2>
          <p className="text-neutral-10">
            Please wait a moment.
          </p>
        </div>
      </div>
    );
  }

  // Content rendering after loading is complete
  return (
    <div className="container mx-auto py-8 px-4 bg-neutral-1 min-h-screen">
      <HeaderWithProfile />
      <h1 className="text-3xl font-bold mb-8 text-neutral-12">Your Lessons</h1>

      {lessons.length === 0 ? (
        // State: No lessons found, even after potential refetch
        <div className="text-center py-12 border rounded-[4px] p-8 bg-neutral-2">
          <h2 className="text-2xl font-bold mb-4 text-neutral-12">
            No Lessons Found Yet
          </h2>
          <p className="text-neutral-10 mb-6">
            We couldn't find any lessons for you at the moment. This might happen if generation is still in progress or if there was an issue.
          </p>
          <button
            onClick={() => {
              setHasAttemptedRefetch(false); // Allow manual refresh to try again
              refreshLessons();
            }}
            className="px-4 py-2 bg-accent-6 text-white rounded-[4px] hover:bg-accent-7 text-sm"
            disabled={loading} // Disable while loading
          >
            {loading ? "Refreshing..." : "Try Refreshing"}
          </button>
          <p className="text-xs text-neutral-8 mt-4">
            If the problem persists, please contact support.
          </p>
        </div>
      ) : (
        // State: Lessons found, display them
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
                    className={`px-2 py-1 text-xs rounded-full ${
                      lesson.completed
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
      )}
    </div>
  );
}
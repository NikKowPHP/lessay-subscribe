'use client';

import { useRouter } from 'next/navigation';
import { useLesson } from '@/context/lesson-context';
import { useOnboarding } from '@/context/onboarding-context';
import { LessonModel } from '@/models/AppAllModels.model';
import HeaderWithProfile from '@/components/HeaderWithProfile';

export default function LessonsPage() {
  const router = useRouter();
  const { onboarding } = useOnboarding();
  const { lessons, loading, initialized } = useLesson();

  const handleStartLesson = (lesson: LessonModel) => {
    router.push(`/app/lessons/${lesson.id}`);
  };

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-1">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-6 mb-4"></div>
        <p className="text-xl text-neutral-12">
          Loading your personalized lessons...
        </p>
        <p className="text-sm text-neutral-8 mt-2">
          We&apos;re preparing content based on your assessment
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 bg-neutral-1 min-h-screen">
      <HeaderWithProfile />
      <h1 className="text-3xl font-bold mb-8 text-neutral-12">Your Lessons</h1>

      {lessons.length === 0 ? (
        <div className="text-center py-12 border rounded-[4px] p-8 bg-neutral-2">
          <h2 className="text-2xl font-bold mb-4 text-neutral-12">
            Generating Your Personalized Learning Plan
          </h2>
          <p className="text-xl mb-4 text-neutral-11">
            Based on your {onboarding?.proficiencyLevel || 'beginner'}{' '}
            proficiency in{' '}
            {onboarding?.targetLanguage || 'your chosen language'}
          </p>
          <div className="animate-pulse bg-neutral-4 h-4 w-3/4 mx-auto mb-3 rounded-[4px]"></div>
          <div className="animate-pulse bg-neutral-4 h-4 w-1/2 mx-auto mb-8 rounded-[4px]"></div>
          <p className="text-neutral-10">
            We&apos;re creating lessons tailored to your goals. Please check back
            in a few moments.
          </p>
        </div>
      ) : (
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

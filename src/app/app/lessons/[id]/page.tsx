'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLesson } from '@/context/lesson-context';
import { useOnboarding } from '@/context/onboarding-context';
import {
  LessonModel,
  LessonStep,
  isPerformanceMetrics,
} from '@/models/AppAllModels.model';
import LessonChat from '@/components/lessons/lessonChat';
import logger from '@/utils/logger';

export default function LessonDetailPage() {
  const router = useRouter();
  const { id } = useParams();

  const { onboarding } = useOnboarding();
  const { getLessonById, completeLesson, recordStepAttempt, loading } =
    useLesson();
  const [lesson, setLesson] = useState<LessonModel | null>(null);
  const [results, setResults] = useState<LessonModel | null>(null);

  useEffect(() => {
    const init = async () => {
      logger.info('init', { id });
      const fetchedLesson = await getLessonById(id as string);
      setLesson(fetchedLesson);
    };
    init();
  }, [id]);

  const handleStepComplete = async (step: LessonStep, userResponse: string) => {
    // todo: improve this
    // Fix comparison to use translation instead of content

    logger.info('handleStepComplete', { step, userResponse });
    if (!userResponse) {
      throw new Error('there is no response');
    }
    if (userResponse.length < 3) {
      throw new Error('the response is too short');
    }

    const correct =
      userResponse.trim().toLowerCase() ===
      (step.translation as string).trim().toLowerCase();

    // Add error handling and use step.stepNumber for updates
    try {
      await recordStepAttempt(lesson!.id, String(step.stepNumber), {
        userResponse,
        correct,
      });

      setLesson((prev) =>
        prev
          ? {
              ...prev,
              steps: prev.steps.map((s) =>
                s.stepNumber === step.stepNumber ? { ...s, userResponse } : s
              ),
            }
          : null
      );
    } catch (error) {
      logger.error('Failed to record step attempt:', error);
    }
  };

  const handleLessonComplete = async () => {
    if (lesson) {
      const results = await completeLesson(lesson.id);
      logger.info('lesson complete results', { results });
      setResults(results);
      // Don't navigate away immediately so user can see results
      // router.push('/app/lessons')
    }
  };

  if (!lesson || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black mb-4"></div>
        <p className="text-xl">Loading lesson...</p>
      </div>
    );
  }

  // Show results if available
  if (results) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="p-6 bg-black text-white">
            <h2 className="text-2xl font-bold">
              Lesson Results: {results.focusArea}
            </h2>
          </div>

          <div className="p-6">
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">
                Performance Summary
              </h3>

              {results.performanceMetrics &&
              isPerformanceMetrics(results.performanceMetrics) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Accuracy */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-700">
                        Accuracy
                      </span>
                      <span className="text-xl font-bold">
                        {results.performanceMetrics.accuracy || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full"
                        style={{
                          width: `${results.performanceMetrics.accuracy || 0}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Pronunciation Score */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-700">
                        Pronunciation
                      </span>
                      <span className="text-xl font-bold">
                        {results.performanceMetrics.pronunciationScore || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-green-600 h-2.5 rounded-full"
                        style={{
                          width: `${
                            results.performanceMetrics.pronunciationScore || 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">
                  No performance metrics available.
                </p>
              )}
            </div>

            {/* Error Patterns */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">
                Areas for Improvement
              </h3>
              {results.performanceMetrics &&
              isPerformanceMetrics(results.performanceMetrics) &&
              results.performanceMetrics.errorPatterns &&
              results.performanceMetrics.errorPatterns.length > 0 ? (
                <ul className="list-disc pl-5 space-y-2">
                  {results.performanceMetrics.errorPatterns.map(
                    (error, index) => (
                      <li key={index} className="text-gray-700">
                        {error}
                      </li>
                    )
                  )}
                </ul>
              ) : (
                <p className="text-gray-500">
                  No specific error patterns detected.
                </p>
              )}
            </div>

            {/* Steps Review */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">
                Step-by-Step Review
              </h3>
              <div className="space-y-4">
                {results.steps.map((step, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      step.correct
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <p className="font-medium">{step.content}</p>
                    {step.userResponse && (
                      <div className="mt-2">
                        <span className="text-gray-700 text-sm">
                          Your response:
                        </span>
                        <p
                          className={`font-medium ${
                            step.correct ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {step.userResponse}
                        </p>
                      </div>
                    )}
                    {!step.correct && step.translation && (
                      <div className="mt-2">
                        <span className="text-gray-700 text-sm">Expected:</span>
                        <p className="font-medium text-gray-700">
                          {step.translation}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => router.push('/app/lessons')}
                className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
              >
                Return to Lessons
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <LessonChat
        lesson={lesson}
        onComplete={handleLessonComplete}
        onStepComplete={handleStepComplete}
        loading={loading}
        targetLanguage={onboarding?.targetLanguage || 'English'}
      />
    </div>
  );
}

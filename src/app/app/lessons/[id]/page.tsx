'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLesson } from '@/context/lesson-context';
import { useOnboarding } from '@/context/onboarding-context';
import {
  AssessmentStep as AssessmentStepModel,
  LessonModel,
  LessonStep,
  isPerformanceMetrics,
} from '@/models/AppAllModels.model';
import LessonChat from '@/components/lessons/lessonChat';
import logger from '@/utils/logger';
import { AudioMetrics } from '@/models/AppAllModels.model';
import { toast } from 'react-hot-toast';
import { RecordingBlob } from '@/lib/interfaces/all-interfaces';

export default function LessonDetailPage() {
  const router = useRouter();
  const { id } = useParams();

  const { onboarding } = useOnboarding();
  const {
    getLessonById,
    completeLesson,
    recordStepAttempt,
    loading,
    processLessonRecording,
  } = useLesson();
  const [lesson, setLesson] = useState<LessonModel | null>(null);
  const [results, setResults] = useState<LessonModel | null>(null);
  const [pronunciationResults, setPronunciationResults] =
    useState<AudioMetrics | null>(null);
  const [pronunciationResultsLoading, setPronunciationResultsLoading] =
    useState<boolean>(false);
  const [sessionRecording, setSessionRecording] = useState<RecordingBlob | null>(null);

  useEffect(() => {
    const init = async () => {
      logger.info('init', { id });
      const fetchedLesson = await getLessonById(id as string);
      setLesson(fetchedLesson);
      logger.info('fetchedLesson', { fetchedLesson });
    };
    init();
  }, [id]);

  useEffect(() => {
    const processPronunciation = async () => {
      if (sessionRecording && lesson) {
        if (!sessionRecording.lastModified || !sessionRecording.size) {
          return
        }
        try {
          const recordingTime = sessionRecording.lastModified - sessionRecording.lastModified;
          const recordingSize = sessionRecording.size;
        
          const lessonWithAudioMetrics = await processLessonRecording(
            sessionRecording,
            lesson,
            recordingTime,
            recordingSize
          );
          if (!lessonWithAudioMetrics.audioMetrics) {
            throw new Error('No audio metrics found');
          }
          setPronunciationResults(lessonWithAudioMetrics.audioMetrics);
          // TODO: render the pronunciation resuilts metrics
          // TODO: render a seperate pronunciation loading state

        } catch (error) {
          logger.error('Failed to process pronunciation:', error);
          toast.error('Failed to process pronunciation');
        } finally {
          setPronunciationResultsLoading(false);
        }
      }
    };
    processPronunciation();
  }, [sessionRecording]);

  const handleStepComplete = async (
    step: LessonStep | AssessmentStepModel,
    userResponse: string
  ): Promise<LessonStep | AssessmentStepModel> => {
    logger.info('handleStepComplete', { step, userResponse });

    try {
      if (!lesson) {
        throw new Error('Lesson is not loaded');
      }
      return await recordStepAttempt(lesson.id, step.id, userResponse);
    } catch (error) {
      logger.error('Failed to record step attempt:', error);
      throw error;
    }
  };

  const handleLessonComplete = async (sessionRecording: Blob | null) => {
    if (lesson) {
      setSessionRecording(sessionRecording);
      const results = await completeLesson(lesson.id, sessionRecording);
      logger.info('lesson complete results', { results });
      setResults(results);
    }
  };

  if (!lesson && loading) {
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
    lesson && (
      <div className="container mx-auto h-screen flex flex-col py-4 px-4 overflow-hidden">
        <div className="flex-1 min-h-0">
          <LessonChat
            lesson={lesson as LessonModel}
            onComplete={handleLessonComplete}
            onStepComplete={handleStepComplete}
            loading={loading}
            targetLanguage={onboarding?.targetLanguage || 'English'}
          />
        </div>
      </div>
    )
  );
}

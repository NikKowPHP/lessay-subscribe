import React, { useState, useEffect } from 'react';
import { useOnboarding } from '@/context/onboarding-context';
import {
  AssessmentLesson,
  AssessmentStep as AssessmentStepModel,
  LessonStep,
  isAssessmentMetrics,
} from '@/models/AppAllModels.model';
import { toast } from 'react-hot-toast';
import LessonChat from '@/components/lessons/lessonChat';

interface AssessmentStepProps {
  onComplete: () => void;
  loading: boolean;
  targetLanguage: string;
  lesson: AssessmentLesson | null;
}

export default function AssessmentStep({
  onComplete,
  loading,
  targetLanguage,
  lesson,
}: AssessmentStepProps) {
  const {
    completeAssessmentLesson,
    completeOnboardingWithLessons,
    recordAssessmentStepAttempt,
  } = useOnboarding();
  const [usingChat, setUsingChat] = useState(true); // Default to chat interface
  const [isCompleting, setIsCompleting] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Handle step completion - align with lesson page approach
  const handleStepComplete = async (
    step: LessonStep | AssessmentStepModel,
    userResponse: string
  ): Promise<AssessmentStepModel | LessonStep> => {
    try {
      if (!lesson) {
        throw new Error('Lesson is not loaded');
      }
      // Record the step attempt, similar to how lessons work
      return await recordAssessmentStepAttempt(
        lesson.id,
        step.id,
        userResponse
      );
      // Update local state if needed
      // (This matches how the lesson page updates local lesson state)
    } catch (error) {
      toast.error('Failed to record assessment response');
      throw error;
    }
  };

  // Handle assessment completion
  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      if (!lesson) {
        throw new Error('Lesson is not loaded');
      }
      await completeAssessmentLesson(lesson.id, 'Assessment completed');
      setShowResults(true);
      // After completion, show results instead of immediately navigating
    } catch (error) {
      toast.error('Something went wrong completing your assessment');
    } finally {
      setIsCompleting(false);
    }
  };

  // Navigate to lessons after viewing results
  const handleFinishAndGoToLessons = () => {
    completeOnboardingWithLessons();
    onComplete();
  };

  // Check if the assessment was already completed previously
  useEffect(() => {
    if (lesson && lesson.completed) {
      setShowResults(true);
    }
  }, [lesson]);

  if (!lesson) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin mr-3 h-5 w-5 text-accent-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
        <span className="text-neutral-9">Loading assessment...</span>
      </div>
    );
  }

  // Results view after assessment is completed
  if (showResults) {
    const metrics =
      lesson.metrics && isAssessmentMetrics(lesson.metrics)
        ? lesson.metrics
        : null;

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-neutral-1 border border-neutral-4 rounded-lg overflow-hidden shadow-sm">
          <div className="bg-accent-6 text-neutral-1 p-5">
            <h2 className="text-xl font-semibold text-center">
              Assessment Results
            </h2>
          </div>

          <div className="p-6 space-y-6">
            {/* Summary */}
            <div className="p-4 bg-neutral-2 rounded-lg border border-neutral-4">
              <h3 className="font-medium text-lg mb-2">Summary</h3>
              <p className="text-neutral-9">
                {lesson.summary ||
                  "Your assessment has been completed. Based on your responses, we've prepared personalized lessons for you."}
              </p>
            </div>

            {/* Scores */}
            {metrics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-neutral-2 p-4 rounded-lg border border-neutral-4 text-center">
                  <p className="text-sm text-neutral-7">Overall Score</p>
                  <p className="text-2xl font-bold text-accent-8">
                    {metrics.overallScore || 0}%
                  </p>
                </div>
                <div className="bg-neutral-2 p-4 rounded-lg border border-neutral-4 text-center">
                  <p className="text-sm text-neutral-7">Accuracy</p>
                  <p className="text-2xl font-bold text-accent-8">
                    {metrics.accuracy || 0}%
                  </p>
                </div>
                <div className="bg-neutral-2 p-4 rounded-lg border border-neutral-4 text-center">
                  <p className="text-sm text-neutral-7">Grammar</p>
                  <p className="text-2xl font-bold text-accent-8">
                    {metrics.grammarScore || 0}%
                  </p>
                </div>
                <div className="bg-neutral-2 p-4 rounded-lg border border-neutral-4 text-center">
                  <p className="text-sm text-neutral-7">Pronunciation</p>
                  <p className="text-2xl font-bold text-accent-8">
                    {metrics.pronunciationScore || 0}%
                  </p>
                </div>
              </div>
            )}

            {/* Strengths & Weaknesses */}
            {metrics && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-neutral-2 rounded-lg border border-neutral-4">
                  <h3 className="font-medium text-success flex items-center mb-3">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Strengths
                  </h3>
                  <ul className="space-y-2">
                    {metrics.strengths && metrics.strengths.length > 0 ? (
                      metrics.strengths.map((strength, index) => (
                        <li
                          key={index}
                          className="text-neutral-9 flex items-start"
                        >
                          <span className="text-success mr-2">•</span>{' '}
                          {strength}
                        </li>
                      ))
                    ) : (
                      <li className="text-neutral-7">
                        No specific strengths identified
                      </li>
                    )}
                  </ul>
                </div>
                <div className="p-4 bg-neutral-2 rounded-lg border border-neutral-4">
                  <h3 className="font-medium text-warning flex items-center mb-3">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Areas for Improvement
                  </h3>
                  <ul className="space-y-2">
                    {metrics.weaknesses && metrics.weaknesses.length > 0 ? (
                      metrics.weaknesses.map((weakness, index) => (
                        <li
                          key={index}
                          className="text-neutral-9 flex items-start"
                        >
                          <span className="text-warning mr-2">•</span>{' '}
                          {weakness}
                        </li>
                      ))
                    ) : (
                      <li className="text-neutral-7">
                        No specific weaknesses identified
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {/* Proposed Topics */}
            {lesson.proposedTopics && lesson.proposedTopics.length > 0 && (
              <div className="p-4 bg-neutral-2 rounded-lg border border-neutral-4">
                <h3 className="font-medium text-lg mb-3">
                  Recommended Learning Topics
                </h3>
                <div className="flex flex-wrap gap-2">
                  {lesson.proposedTopics.map((topic, index) => (
                    <div
                      key={index}
                      className="bg-accent-2 text-accent-9 px-3 py-1 rounded-full text-sm"
                    >
                      {topic}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="text-center pt-4">
              <button
                onClick={handleFinishAndGoToLessons}
                disabled={loading || isCompleting}
                className="py-3 px-6 bg-accent-6 text-neutral-1 rounded-md transition-colors hover:bg-accent-7
                          focus:outline-none focus:ring-2 focus:ring-accent-8 focus:ring-offset-2 disabled:opacity-50
                          text-sm font-medium"
              >
                {loading || isCompleting ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-neutral-1"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Go to Lessons'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-center mb-6">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            onClick={() => setUsingChat(true)}
            className={`px-4 py-2 text-sm font-medium border transition-colors ${
              usingChat
                ? 'bg-accent-6 text-neutral-1 border-accent-6'
                : 'bg-neutral-1 text-neutral-9 border-neutral-5 hover:bg-neutral-2'
            } rounded-l-md focus:z-10 focus:ring-2 focus:ring-accent-6 focus:outline-none`}
          >
            Chat Mode
          </button>
          <button
            type="button"
            onClick={() => setUsingChat(false)}
            className={`px-4 py-2 text-sm font-medium border transition-colors ${
              !usingChat
                ? 'bg-accent-6 text-neutral-1 border-accent-6'
                : 'bg-neutral-1 text-neutral-9 border-neutral-5 hover:bg-neutral-2'
            } rounded-r-md focus:z-10 focus:ring-2 focus:ring-accent-6 focus:outline-none`}
          >
            Standard Mode
          </button>
        </div>
      </div>

      {usingChat ? (
        <LessonChat
          lesson={lesson}
          onComplete={handleComplete}
          onStepComplete={handleStepComplete}
          loading={loading || isCompleting}
          targetLanguage={targetLanguage}
          isAssessment={true}
          realtimeTranscriptEnabled={true}
        />
      ) : (
        // Original assessment UI code with updated styling
        <div className="space-y-6 bg-neutral-2 p-4 rounded-lg border border-neutral-4">
          <div className="text-center py-8">
            <p className="text-neutral-8">
              Standard assessment interface has been replaced with Chat Mode
            </p>
            <button
              onClick={() => setUsingChat(true)}
              className="mt-4 py-2 px-4 bg-accent-6 text-neutral-1 rounded-md transition-colors hover:bg-accent-7
                        focus:outline-none focus:ring-2 focus:ring-accent-8 focus:ring-offset-2 text-sm font-medium"
            >
              Switch to Chat Mode
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
import { useAuth } from '@/context/auth-context';
import HeaderWithProfile from '@/components/HeaderWithProfile';

export default function LessonDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const { user } = useAuth();

  const { onboarding } = useOnboarding();
  const {
    getLessonById,
    completeLesson,
    recordStepAttempt,
    loading,
    processLessonRecording,
    checkAndGenerateNewLessons
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
      if(!user) return;
      const fetchedLesson = await getLessonById(id as string);
      setLesson(fetchedLesson);
      logger.info('fetchedLesson', { fetchedLesson });
    };
    init();
  }, [id, user]);

  useEffect(() => {
    const processPronunciation = async () => {
      logger.info('processPronunciation', { sessionRecording, lesson });
      if (sessionRecording && lesson) {
        if (!sessionRecording.lastModified || !sessionRecording.size) {
          return
        }
        try {
          logger.info('Processing pronunciation recording', { sessionRecording, lesson });
          const recordingTime = sessionRecording.recordingTime || 10000;
          const recordingSize = sessionRecording.size;

          logger.info('recordingTime', { recordingTime });
        
          const lessonWithAudioMetrics = await processLessonRecording(
            sessionRecording,
            lesson,
            recordingTime,
            recordingSize
          );
          logger.info('Lesson with audio metrics', { lessonWithAudioMetrics });
          if (!lessonWithAudioMetrics.audioMetrics) {
            throw new Error('No audio metrics found');
          }
          setPronunciationResults(lessonWithAudioMetrics.audioMetrics);
           await checkAndGenerateNewLessons();

        } catch (error) {
          logger.error('Failed to process pronunciation:', error);
          toast.error('Failed to process pronunciation');
        } finally {
          setPronunciationResultsLoading(false);
        }
      }
    };
    processPronunciation();

  }, [sessionRecording, lesson]);

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

  // onComplete from children lessonChat call is here 
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
        <HeaderWithProfile />
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="p-6 bg-black text-white">
            <h2 className="text-2xl font-bold">
              Lesson Results: {results.focusArea}
            </h2>
          </div>

          <div className="p-6">
            {/* Basic Performance Summary */}
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
                  
                  {/* Grammar Score */}
                  {results.performanceMetrics.grammarScore !== undefined && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-700">
                          Grammar
                        </span>
                        <span className="text-xl font-bold">
                          {results.performanceMetrics.grammarScore}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-purple-600 h-2.5 rounded-full"
                          style={{
                            width: `${results.performanceMetrics.grammarScore}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  {/* Vocabulary Score */}
                  {results.performanceMetrics.vocabularyScore !== undefined && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-700">
                          Vocabulary
                        </span>
                        <span className="text-xl font-bold">
                          {results.performanceMetrics.vocabularyScore}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-yellow-600 h-2.5 rounded-full"
                          style={{
                            width: `${results.performanceMetrics.vocabularyScore}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  {/* Overall Score */}
                  {results.performanceMetrics.overallScore !== undefined && (
                    <div className="bg-gray-50 p-4 rounded-lg col-span-1 md:col-span-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-700">
                          Overall Performance
                        </span>
                        <span className="text-xl font-bold">
                          {results.performanceMetrics.overallScore}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-indigo-600 h-2.5 rounded-full"
                          style={{
                            width: `${results.performanceMetrics.overallScore}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">
                  No performance metrics available.
                </p>
              )}
            </div>

            {/* Lesson Summary Section */}
            {results.performanceMetrics && 
            isPerformanceMetrics(results.performanceMetrics) && 
            results.performanceMetrics.summary && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4">
                  Lesson Summary
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">
                    {results.performanceMetrics.summary}
                  </p>
                </div>
              </div>
            )}

            {/* Strengths and Weaknesses */}
            {results.performanceMetrics && 
            isPerformanceMetrics(results.performanceMetrics) && 
            (results.performanceMetrics.strengths && results.performanceMetrics.strengths.length > 0 || 
             results.performanceMetrics.weaknesses && results.performanceMetrics.weaknesses.length > 0) && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4">
                  Strengths and Areas for Improvement
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Strengths */}
                  {results.performanceMetrics.strengths && 
                  results.performanceMetrics.strengths.length > 0 && (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h4 className="font-semibold mb-3 text-green-800">Strengths</h4>
                      <ul className="list-disc pl-5 space-y-1">
                        {results.performanceMetrics.strengths.map((strength, index) => (
                          <li key={index} className="text-gray-700">
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Weaknesses */}
                  {results.performanceMetrics.weaknesses && 
                  results.performanceMetrics.weaknesses.length > 0 && (
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <h4 className="font-semibold mb-3 text-orange-800">Areas to Focus On</h4>
                      <ul className="list-disc pl-5 space-y-1">
                        {results.performanceMetrics.weaknesses.map((weakness, index) => (
                          <li key={index} className="text-gray-700">
                            {weakness}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Next Lesson Suggestions */}
            {results.performanceMetrics && 
            isPerformanceMetrics(results.performanceMetrics) && 
            results.performanceMetrics.nextLessonSuggestions && 
            results.performanceMetrics.nextLessonSuggestions.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4">
                  Recommended Next Steps
                </h3>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex flex-wrap gap-2">
                    {results.performanceMetrics.nextLessonSuggestions.map((suggestion, index) => (
                      <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        {suggestion}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Pronunciation Results Section */}
            {pronunciationResults && (
              <div className="mb-8 border-t pt-8">
                <h3 className="text-xl font-semibold mb-4">
                  Detailed Language Analysis
                </h3>
                
                {/* Proficiency Level and Trajectory */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-medium text-gray-700">CEFR Level</span>
                    <span className="text-lg font-bold bg-black text-white px-3 py-1 rounded">
                      {pronunciationResults.proficiencyLevel}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">Learning Trajectory</span>
                    <span className={`text-lg font-medium ${
                      pronunciationResults.learningTrajectory === 'accelerating' ? 'text-green-600' :
                      pronunciationResults.learningTrajectory === 'steady' ? 'text-blue-600' : 'text-yellow-600'
                    }`}>
                      {pronunciationResults.learningTrajectory.toLowerCase().replace('_', ' ')}
                    </span>
                  </div>
                </div>
                
                {/* Skill Scores */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Pronunciation Score */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-700">Pronunciation</span>
                      <span className="text-xl font-bold">{pronunciationResults.pronunciationScore}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-purple-600 h-2.5 rounded-full"
                        style={{ width: `${pronunciationResults.pronunciationScore}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Fluency Score */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-700">Fluency</span>
                      <span className="text-xl font-bold">{pronunciationResults.fluencyScore}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full"
                        style={{ width: `${pronunciationResults.fluencyScore}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Grammar Score */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-700">Grammar</span>
                      <span className="text-xl font-bold">{pronunciationResults.grammarScore}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-green-600 h-2.5 rounded-full"
                        style={{ width: `${pronunciationResults.grammarScore}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Vocabulary Score */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-700">Vocabulary</span>
                      <span className="text-xl font-bold">{pronunciationResults.vocabularyScore}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-yellow-600 h-2.5 rounded-full"
                        style={{ width: `${pronunciationResults.vocabularyScore}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                {/* Pronunciation Details */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h4 className="font-semibold mb-3 text-lg">Pronunciation Details</h4>
                  
                  {/* Problematic Sounds */}
                  {pronunciationResults.pronunciationAssessment.problematic_sounds.length > 0 && (
                    <div className="mb-4">
                      <h5 className="font-medium text-gray-700 mb-2">Problematic Sounds</h5>
                      <div className="flex flex-wrap gap-2">
                        {pronunciationResults.pronunciationAssessment.problematic_sounds.map((sound, idx) => (
                          <span key={idx} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                            {sound}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Areas for Improvement */}
                  <div className="mb-2">
                    <h5 className="font-medium text-gray-700 mb-2">Areas for Improvement</h5>
                    <ul className="list-disc pl-5 space-y-1">
                      {pronunciationResults.pronunciationAssessment.areas_for_improvement.map((area, idx) => (
                        <li key={idx} className="text-gray-700">{area}</li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Strengths */}
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Strengths</h5>
                    <ul className="list-disc pl-5 space-y-1">
                      {pronunciationResults.pronunciationAssessment.strengths.map((strength, idx) => (
                        <li key={idx} className="text-gray-700">{strength}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                {/* Grammar Focus Areas */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h4 className="font-semibold mb-3 text-lg">Suggested Focus Areas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">Grammar Focus</h5>
                      <ul className="list-disc pl-5 space-y-1">
                        {pronunciationResults.grammarFocusAreas.map((area, idx) => (
                          <li key={idx} className="text-gray-700">{area}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">Next Skill Targets</h5>
                      <ul className="list-disc pl-5 space-y-1">
                        {pronunciationResults.nextSkillTargets.map((skill, idx) => (
                          <li key={idx} className="text-gray-700">{skill}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                
                {/* Suggested Topics */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3 text-lg">Suggested Topics for Next Lessons</h4>
                  <div className="flex flex-wrap gap-2">
                    {pronunciationResults.suggestedTopics.map((topic, idx) => (
                      <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Loading State for Pronunciation Results */}
            {pronunciationResultsLoading && !pronunciationResults && (
              <div className="mb-8 text-center py-6">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-black mx-auto mb-4"></div>
                <p className="text-lg">Analyzing your pronunciation and language skills...</p>
              </div>
            )}

            {/* Error Patterns */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">
                Common Errors
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
                    {!step.correct && step.expectedAnswer && (
                      <div className="mt-2">
                        <span className="text-gray-700 text-sm">Expected:</span>
                        <p className="font-medium text-gray-700">
                          {step.expectedAnswer}
                        </p>
                      </div>
                    )}
                    {/* Show max attempts notice */}
                    {!step.correct && step.attempts >= step.maxAttempts && (
                      <div className="mt-2 text-sm text-orange-600">
                        Maximum attempts reached ({step.attempts}/{step.maxAttempts})
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
        <HeaderWithProfile />
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

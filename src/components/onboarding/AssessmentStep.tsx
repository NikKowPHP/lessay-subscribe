import React, { useEffect, useState } from 'react';
import { useOnboarding } from '@/context/onboarding-context';
import {
  AssessmentLesson,
  AssessmentStep as AssessmentStepModel,
  AudioMetrics,
  LessonStep,
  isAssessmentMetrics,
} from '@/models/AppAllModels.model';
import { toast } from 'react-hot-toast';
import LessonChat from '@/components/lessons/lessonChat';
import router from 'next/router';
import { RecordingBlob } from '@/lib/interfaces/all-interfaces';
import logger from '@/utils/logger';
import { useError } from '@/hooks/useError';

interface AssessmentStepProps {
  areMetricsGenerated: boolean;
  loading: boolean;
  targetLanguage: string;
  lesson: AssessmentLesson | null;
  onAssessmentComplete: () => Promise<void>;
  onGoToLessonsButtonClick: () => Promise<void>;
  processAssessmentLessonRecording: (
    sessionRecording: RecordingBlob,
    lesson: AssessmentLesson,
    recordingTime: number,
    recordingSize: number
  ) => Promise<AssessmentLesson | undefined>;
}

export default function AssessmentStep({
  areMetricsGenerated,
  loading,
  targetLanguage,
  lesson,
  onAssessmentComplete,
  onGoToLessonsButtonClick,
  processAssessmentLessonRecording,
}: AssessmentStepProps) {
  const { recordAssessmentStepAttempt } =
    useOnboarding();
  const [isCompleting, setIsCompleting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [sessionRecording, setSessionRecording] =
    useState<RecordingBlob | null>(null);
  // Handle step completion - align with lesson page approach
    useState<AudioMetrics | null>(null);
  const [lessonAudioMetricsLoading, setLessonAudioMetricsLoading] =
    useState<boolean>(false);

  const handleStepComplete = async (
    step: LessonStep | AssessmentStepModel,
    userResponse: string
  ): Promise<AssessmentStepModel | LessonStep> => {
    try {
      if (!lesson) {
        return step;
      }
      // Record the step attempt, similar to how lessons work
     const updatedStep = await recordAssessmentStepAttempt(
        lesson.id,
        step.id,
        userResponse
     );
      if (!updatedStep) {
        return step;
      }
      return updatedStep;

      // Update local state if needed
      // (This matches how the lesson page updates local lesson state)
    } catch (error) {
      return step;
    }
  };

  // Handle assessment completion
  const handleComplete = async (recording: RecordingBlob | null) => {
    setIsCompleting(true);
    try {
      if (!lesson) {
        setIsCompleting(false);
        return;
      }
      setSessionRecording(recording);

      // const result = await completeAssessmentLesson(lesson.id, 'Assessment completed');
      await onAssessmentComplete();
      // After completion, show results instead of immediately navigating
    } catch (error) {
    } finally {
      setIsCompleting(false);
    }
  };

  useEffect(() => {
    if (lesson && lesson.metrics && isAssessmentMetrics(lesson.metrics)) {
      setShowResults(true);
    }
  }, [lesson?.metrics]);

  useEffect(() => {
    const processPronunciation = async () => {

      logger.info('sessionRecording', sessionRecording);
      logger.info('lesson', lesson);
      if (sessionRecording && lesson) {
        if (!sessionRecording.lastModified || !sessionRecording.size) {
          return;
        }
        setLessonAudioMetricsLoading(true);
        try {
          const recordingTime = sessionRecording.recordingTime || 10000;
          const recordingSize = sessionRecording.size;

          logger.info('processing pronunciation', { recordingTime, recordingSize });

          const lessonWithAudioMetrics = await processAssessmentLessonRecording(
            sessionRecording,
            lesson,
            recordingTime,
            recordingSize
          );
          if (!lessonWithAudioMetrics) {
            return;
          }
          if (!lessonWithAudioMetrics.audioMetrics) {
            return;
          }
          logger.info('lessonWithAudioMetrics', lessonWithAudioMetrics);
          
        } catch (error) {
          logger.error('Failed to process pronunciation:', error);
        } finally {
          setLessonAudioMetricsLoading(false);
        }
      }
    };
    processPronunciation();
  }, [sessionRecording]);

  // Navigate to lessons after viewing results
  const handleFinishAndGoToLessons = () => {
    // markOnboardingAsCompleteAndGenerateLessons();
    // onComplete();
    onGoToLessonsButtonClick();
  };

  // Check if the assessment was already completed previously
  // useEffect(() => {
  //   console.log('lesson', lesson);
  //   if (lesson && lesson.completed) {
  //     setShowResults(true);
  //   }
  // }, [lesson]);

    


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
  if (!areMetricsGenerated && lesson.completed) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-neutral-1 border border-neutral-4 rounded-lg overflow-hidden shadow-sm">
          <div className="bg-accent-6 text-neutral-1 p-5">
            <h2 className="text-xl font-semibold text-center">
              Analysing your responses...
            </h2>
          </div>
        </div>
      </div>
    );
  }

  // Results view after assessment is completed
  if (showResults && areMetricsGenerated) {
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
              </div>
            )}

            {lessonAudioMetricsLoading && (
             <div className="flex justify-center items-center py-12">
             <div className="animate-spin mr-3 h-5 w-5 text-accent-6">
               {/* SVG Spinner */}
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
             </div>
             <span className="text-neutral-9">Analyzing pronunciation and fluency...</span>
           </div>
            )}

            {/* Pronunciation Results */}
            {lesson.audioMetrics && (
              <div className="p-4 bg-neutral-2 rounded-lg border border-neutral-4">
                <h3 className="font-medium text-lg mb-3">Pronunciation Analysis</h3>
                
                {/* Pronunciation Overview */}
                <div className="mb-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-neutral-1 p-3 rounded border border-neutral-3 text-center">
                      <p className="text-sm text-neutral-7">Pronunciation</p>
                      <p className="text-xl font-bold text-accent-8">
                        {lesson.audioMetrics.pronunciationScore}%
                      </p>
                    </div>
                    <div className="bg-neutral-1 p-3 rounded border border-neutral-3 text-center">
                      <p className="text-sm text-neutral-7">Fluency</p>
                      <p className="text-xl font-bold text-accent-8">
                        {lesson.audioMetrics.fluencyScore}%
                      </p>
                    </div>
                    <div className="bg-neutral-1 p-3 rounded border border-neutral-3 text-center">
                      <p className="text-sm text-neutral-7">CEFR Level</p>
                      <p className="text-xl font-bold text-accent-8">
                        {lesson.audioMetrics.proficiencyLevel}
                      </p>
                    </div>
                    <div className="bg-neutral-1 p-3 rounded border border-neutral-3 text-center">
                      <p className="text-sm text-neutral-7">Trajectory</p>
                      <p className="text-xl font-bold text-accent-8">
                        {lesson.audioMetrics.learningTrajectory}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Detailed Pronunciation */}
                {lesson.audioMetrics.pronunciationAssessment && (
                  <div className="mb-4">
                    <h4 className="text-md font-medium text-accent-8 mb-2">Pronunciation Details</h4>
                    
                    {/* Native Language Influence */}
                    <div className="mb-3">
                      <p className="text-sm font-medium">Native Language Influence: 
                        <span className="ml-1 font-normal">
                          {lesson.audioMetrics.pronunciationAssessment.native_language_influence.level}
                        </span>
                      </p>
                      {lesson.audioMetrics.pronunciationAssessment.native_language_influence.specific_features.length > 0 && (
                        <div className="mt-1">
                          <p className="text-sm text-neutral-7">Specific features:</p>
                          <ul className="list-disc pl-5 text-sm">
                            {lesson.audioMetrics.pronunciationAssessment.native_language_influence.specific_features.map((feature, idx) => (
                              <li key={idx} className="text-neutral-8">{feature}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    {/* Problematic Sounds */}
                    {lesson.audioMetrics.pronunciationAssessment.problematic_sounds.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium">Sounds to Practice:</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {lesson.audioMetrics.pronunciationAssessment.problematic_sounds.map((sound, idx) => (
                            <span key={idx} className="bg-warning-light text-warning-dark px-2 py-1 rounded text-sm">
                              {sound}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Pronunciation Strengths */}
                    {lesson.audioMetrics.pronunciationAssessment.strengths.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-success">Strengths:</p>
                        <ul className="list-disc pl-5 text-sm">
                          {lesson.audioMetrics.pronunciationAssessment.strengths.map((strength, idx) => (
                            <li key={idx} className="text-neutral-8">{strength}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Areas for Improvement */}
                    {lesson.audioMetrics.pronunciationAssessment.areas_for_improvement.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-warning">Areas to Improve:</p>
                        <ul className="list-disc pl-5 text-sm">
                          {lesson.audioMetrics.pronunciationAssessment.areas_for_improvement.map((area, idx) => (
                            <li key={idx} className="text-neutral-8">{area}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Fluency Assessment */}
                {lesson.audioMetrics.fluencyAssessment && (
                  <div className="mb-4 border-t border-neutral-3 pt-3 mt-4">
                    <h4 className="text-md font-medium text-accent-8 mb-2">Fluency Analysis</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                      <div className="bg-neutral-1 p-3 rounded border border-neutral-3">
                        <p className="text-sm text-neutral-7">Speech Rate</p>
                        <p className="text-md">
                          <span className="font-medium">{lesson.audioMetrics.fluencyAssessment.speech_rate.words_per_minute}</span> words/min
                          <span className="ml-2 text-sm">({lesson.audioMetrics.fluencyAssessment.speech_rate.evaluation})</span>
                        </p>
                      </div>
                      
                      <div className="bg-neutral-1 p-3 rounded border border-neutral-3">
                        <p className="text-sm text-neutral-7">Hesitation</p>
                        <p className="text-md">
                          <span className="font-medium">{lesson.audioMetrics.fluencyAssessment.hesitation_patterns.frequency}</span>
                          <span className="ml-2 text-sm">({lesson.audioMetrics.fluencyAssessment.hesitation_patterns.average_pause_duration.toFixed(1)}s avg pause)</span>
                        </p>
                      </div>
                      
                      <div className="bg-neutral-1 p-3 rounded border border-neutral-3">
                        <p className="text-sm text-neutral-7">Naturalness</p>
                        <p className="text-md font-medium">
                          {lesson.audioMetrics.fluencyAssessment.rhythm_and_intonation.naturalness}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}
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
                {loading || isCompleting || lessonAudioMetricsLoading ? (
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
    <div className="animate-fade-in h-screen flex flex-col">
      <LessonChat
        lesson={lesson}
        onComplete={handleComplete}
        onStepComplete={handleStepComplete}
        loading={loading || isCompleting}
        targetLanguage={targetLanguage}
        isAssessment={true}
      />
    </div>
  );
}

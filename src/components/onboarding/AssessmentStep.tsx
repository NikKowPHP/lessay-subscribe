// File: /src/components/onboarding/AssessmentStep.tsx

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
// import router from 'next/router'; // Not used
import { RecordingBlob } from '@/lib/interfaces/all-interfaces';
import logger from '@/utils/logger';

interface AssessmentStepProps {
  // REMOVED: areMetricsGenerated: boolean;
  loading: boolean; // General loading state (e.g., initial lesson load)
  targetLanguage: string;
  lesson: AssessmentLesson | null;
  onAssessmentComplete: () => void; // Renamed for clarity
  onGoToLessonsButtonClick: () => void;
  processAssessmentLessonRecording: (sessionRecording: RecordingBlob, lesson: AssessmentLesson, recordingTime: number, recordingSize: number) => Promise<AssessmentLesson>;
}

export default function AssessmentStep({
  // REMOVED: areMetricsGenerated,
  loading: initialLoading, // Rename prop to avoid conflict with internal loading state
  targetLanguage,
  lesson,
  onAssessmentComplete,
  onGoToLessonsButtonClick,
  processAssessmentLessonRecording,
}: AssessmentStepProps) {
  const { recordAssessmentStepAttempt } = useOnboarding();
  const [isCompleting, setIsCompleting] = useState(false); // Loading state for the completion process itself
  const [sessionRecording, setSessionRecording] =
    useState<RecordingBlob | null>(null);
  const [lessonAudioMetricsLoading, setLessonAudioMetricsLoading] =
    useState<boolean>(false);
  const [showResults, setShowResults] = useState(false); // State to control results view visibility

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
    } catch (error) {
      toast.error('Failed to record assessment response');
      logger.error('Error recording assessment step attempt:', error);
      throw error;
    }
  };

  // Handle assessment completion trigger from LessonChat
  const handleComplete = async (recording: RecordingBlob | null) => {
    if (!lesson) {
      toast.error('Cannot complete: Lesson not loaded.');
      return;
    }
    if (isCompleting) return; // Prevent double clicks

    setIsCompleting(true);
    try {
      // Set recording state *before* calling onAssessmentComplete
      // This ensures the useEffect watching sessionRecording triggers reliably
      if (recording) {
        setSessionRecording(recording);
      }

      // Trigger the first stage: text-based metrics generation
      await onAssessmentComplete();

      // The parent component (page.tsx) will update the 'lesson' prop.
      // The useEffect below will handle audio processing if recording exists.
      // setShowResults will be handled by the effect watching lesson.metrics

    } catch (error) {
      toast.error('Something went wrong completing your assessment');
      logger.error('Error in handleComplete:', error);
      setIsCompleting(false); // Reset loading state on error
    }
    // Let the useEffect handle resetting isCompleting after audio processing
  };

  // Effect to show results view once text-based metrics are available
  useEffect(() => {
    // Show results view if lesson is marked completed and has the initial metrics
    if (lesson?.completed && lesson.metrics && isAssessmentMetrics(lesson.metrics)) {
      setShowResults(true);
    } else {
      // Hide results view if lesson state regresses or is not yet complete/analyzed
      setShowResults(false);
    }
  }, [lesson?.completed, lesson?.metrics]); // Depend on specific fields

  // Effect to process audio recording when it becomes available *and* lesson exists
  useEffect(() => {
    const processPronunciation = async () => {
      // Only process if we have a recording, a lesson, and audio metrics aren't already loaded/being loaded
      if (sessionRecording && lesson && !lesson.audioMetrics && !lessonAudioMetricsLoading) {
        // Basic validation for the recording blob
        if (!sessionRecording.size) {
           logger.warn('Skipping audio processing: Recording size is missing or zero.');
           setSessionRecording(null); // Clear invalid recording
           setIsCompleting(false); // Ensure completion state is reset
           return;
        }

        setLessonAudioMetricsLoading(true);
        setIsCompleting(true); // Keep overall completion state active during audio processing
        try {
          // Use a default/estimated time if not available, but log a warning
          const recordingTime = sessionRecording.recordingTime || 0; // Use 0 or a sensible default
          if (recordingTime === 0) {
             logger.warn('Recording time not available from blob, using 0.');
          }
          const recordingSize = sessionRecording.size;

          logger.info('Processing pronunciation analysis...', { recordingTime, recordingSize });

          // Call the processing function passed from the parent
          await processAssessmentLessonRecording(
            sessionRecording,
            lesson,
            recordingTime,
            recordingSize
          );
          // Parent component (page.tsx) updates the 'lesson' prop, which will trigger re-render

          logger.info('Pronunciation analysis request completed.');

        } catch (error) {
          logger.error('Failed to process pronunciation:', error);
          toast.error('Failed to process pronunciation analysis.');
          // Handle error state if needed
        } finally {
          setLessonAudioMetricsLoading(false);
          setIsCompleting(false); // Mark completion process finished (success or fail)
          setSessionRecording(null); // Clear recording state after processing attempt
        }
      } else if (!sessionRecording && isCompleting && !lessonAudioMetricsLoading) {
         // If handleComplete finished but there was no recording, ensure loading state is reset
         setIsCompleting(false);
      }
    };
    processPronunciation();
  }, [sessionRecording, lesson, processAssessmentLessonRecording, lessonAudioMetricsLoading, isCompleting]); // Add dependencies

  // Navigate to lessons after viewing results
  const handleFinishAndGoToLessons = () => {
    onGoToLessonsButtonClick();
  };


  // --- Conditional Rendering Logic ---

  // 1. Initial Loading State (Lesson prop is null or initialLoading is true)
  if (initialLoading || !lesson) {
    return (
      <div className="flex justify-center items-center py-12">
        {/* Consistent Loading Spinner */}
        <div className="animate-spin mr-3 h-5 w-5 text-accent-6">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <span className="text-neutral-9">Loading assessment...</span>
      </div>
    );
  }

  // 2. Assessment Completed, Waiting for Initial (Text) Results
  // Show this if lesson is marked completed, but the results view isn't ready yet (metrics missing)
  if (lesson.completed && !showResults) {
     return (
       <div className="space-y-6 animate-fade-in p-6 text-center">
         <div className="bg-neutral-1 border border-neutral-4 rounded-lg overflow-hidden shadow-sm p-5">
           <div className="flex justify-center items-center mb-3">
             <div className="animate-spin mr-3 h-5 w-5 text-accent-6">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
             </div>
             <h2 className="text-xl font-semibold text-neutral-9">
               Analyzing your responses...
             </h2>
           </div>
           <p className="text-neutral-7">Please wait while we process your assessment results.</p>
         </div>
       </div>
     );
  }


  // 3. Results View (Shown when lesson is completed and initial metrics are available)
  if (showResults) {
    const metrics =
      lesson.metrics && isAssessmentMetrics(lesson.metrics)
        ? lesson.metrics
        : null;

    return (
      <div className="space-y-6 animate-fade-in p-4 md:p-6"> {/* Added padding */}
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

            {/* Scores (from text-based analysis) */}
            {metrics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Overall Score */}
                <div className="bg-neutral-2 p-4 rounded-lg border border-neutral-4 text-center">
                  <p className="text-sm text-neutral-7">Overall Score</p>
                  <p className="text-2xl font-bold text-accent-8">
                    {metrics.overallScore || 0}%
                  </p>
                </div>
                 {/* Accuracy */}
                 <div className="bg-neutral-2 p-4 rounded-lg border border-neutral-4 text-center">
                  <p className="text-sm text-neutral-7">Accuracy</p>
                  <p className="text-2xl font-bold text-accent-8">
                    {metrics.accuracy || 0}%
                  </p>
                </div>
                {/* Grammar */}
                <div className="bg-neutral-2 p-4 rounded-lg border border-neutral-4 text-center">
                  <p className="text-sm text-neutral-7">Grammar</p>
                  <p className="text-2xl font-bold text-accent-8">
                    {metrics.grammarScore || 0}%
                  </p>
                </div>
                {/* Vocabulary (assuming it's part of metrics) */}
                <div className="bg-neutral-2 p-4 rounded-lg border border-neutral-4 text-center">
                  <p className="text-sm text-neutral-7">Vocabulary</p>
                  <p className="text-2xl font-bold text-accent-8">
                    {metrics.vocabularyScore || 0}%
                  </p>
                </div>
                 {/* Pronunciation (Placeholder from text metrics if available) */}
                 <div className="bg-neutral-2 p-4 rounded-lg border border-neutral-4 text-center">
                  <p className="text-sm text-neutral-7">Pronunciation (Initial)</p>
                  <p className="text-2xl font-bold text-accent-8">
                    {metrics.pronunciationScore || 0}%
                  </p>
                </div>
              </div>
            )}

            {/* Loading indicator for Audio Analysis */}
            {lessonAudioMetricsLoading && (
              <div className="flex justify-center items-center py-6">
                <div className="animate-spin mr-3 h-5 w-5 text-accent-6">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <span className="text-neutral-9">Analyzing pronunciation and fluency...</span>
              </div>
            )}

            {/* Pronunciation Results (Displayed only when audioMetrics are available) */}
            {!lessonAudioMetricsLoading && lesson.audioMetrics && (
              <div className="p-4 bg-neutral-2 rounded-lg border border-neutral-4 animate-fade-in">
                <h3 className="font-medium text-lg mb-3">Detailed Pronunciation & Fluency Analysis</h3>

                {/* Pronunciation Overview */}
                <div className="mb-4">
                  {/* ... (rest of the audioMetrics display logic remains the same) ... */}
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
                    {/* ... existing detailed pronunciation display ... */}
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
                    {/* ... existing fluency display ... */}
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

            {/* Strengths & Weaknesses (from text-based analysis) */}
            {metrics && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ... (Strengths display remains the same) ... */}
                 <div className="p-4 bg-neutral-2 rounded-lg border border-neutral-4">
                  <h3 className="font-medium text-success flex items-center mb-3">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Strengths
                  </h3>
                  <ul className="space-y-2">
                    {metrics.strengths && metrics.strengths.length > 0 ? (
                      metrics.strengths.map((strength, index) => (
                        <li key={index} className="text-neutral-9 flex items-start">
                          <span className="text-success mr-2">•</span> {strength}
                        </li>
                      ))
                    ) : (
                      <li className="text-neutral-7">No specific strengths identified yet.</li>
                    )}
                  </ul>
                </div>
                {/* ... (Weaknesses display remains the same) ... */}
                 <div className="p-4 bg-neutral-2 rounded-lg border border-neutral-4">
                  <h3 className="font-medium text-warning flex items-center mb-3">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Areas for Improvement
                  </h3>
                  <ul className="space-y-2">
                    {metrics.weaknesses && metrics.weaknesses.length > 0 ? (
                      metrics.weaknesses.map((weakness, index) => (
                        <li key={index} className="text-neutral-9 flex items-start">
                          <span className="text-warning mr-2">•</span> {weakness}
                        </li>
                      ))
                    ) : (
                      <li className="text-neutral-7">No specific areas identified yet.</li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {/* Proposed Topics (from text-based analysis) */}
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
                // Disable button while *any* processing is happening (initial completion or audio)
                disabled={initialLoading || isCompleting || lessonAudioMetricsLoading}
                className="py-3 px-6 bg-accent-6 text-neutral-1 rounded-md transition-colors hover:bg-accent-7
                          focus:outline-none focus:ring-2 focus:ring-accent-8 focus:ring-offset-2 disabled:opacity-50
                          text-sm font-medium"
              >
                {(isCompleting || lessonAudioMetricsLoading) ? (
                  <span className="flex items-center justify-center"> {/* Centered spinner */}
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-neutral-1"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing Results...
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

  // 4. Default: Render the LessonChat component for the assessment interaction
  return (
    <div className="animate-fade-in h-screen flex flex-col">
      <LessonChat
        lesson={lesson}
        onComplete={handleComplete} // Use the internal handler
        onStepComplete={handleStepComplete}
        loading={initialLoading || isCompleting} // Reflect overall loading state
        targetLanguage={targetLanguage}
        isAssessment={true}
      />
    </div>
  );
}
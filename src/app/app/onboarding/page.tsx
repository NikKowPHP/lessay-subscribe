// File: /src/app/app/onboarding/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useOnboarding } from '@/context/onboarding-context';
import { toast } from 'react-hot-toast';
import logger from '@/utils/logger';
import WelcomeStep from '@/components/onboarding/WelcomeStep';
import LanguageSelectionStep from '@/components/onboarding/LanguageSelectionStep';
import LearningPurposeStep from '@/components/onboarding/LearningPurposeStep';
import ProficiencyStep from '@/components/onboarding/ProficiencyStep';
import AssessmentStep from '@/components/onboarding/AssessmentStep';
import { AssessmentLesson } from '@/models/AppAllModels.model';
import { RecordingBlob } from '@/lib/interfaces/all-interfaces';

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    isOnboardingComplete,
    markStepComplete,
    loading,
    getOnboarding,
    getAssessmentLesson,
    markOnboardingAsCompleteAndGenerateLessons,
    processAssessmentLessonRecording,
    completeAssessmentLesson,
    goToLessonsWithOnboardingComplete,
  } = useOnboarding();
  const [currentStep, setCurrentStep] = useState<string>('welcome');
  const [formData, setFormData] = useState({
    nativeLanguage: '',
    targetLanguage: '',
    learningPurpose: '',
    proficiencyLevel: '',
  });



  useEffect(() => {
    console.log('onboarding data form onbarding page', formData);
  }, [formData]);

  // State to hold the generated assessment lesson and its loading status
  const [assessmentLesson, setAssessmentLesson] =
    useState<AssessmentLesson | null>(null);
  const [assessmentLoading, setAssessmentLoading] = useState<boolean>(false);
  const [areMetricsGenerated, setAreMetricsGenerated] = useState<boolean>(false);

  // Rehydrate state from onboarding session
  useEffect(() => {
    const fetchOnboardingData = async () => {
      try {
        const onboarding = await getOnboarding();
        if (onboarding) {
          // Update form data
          setFormData({
            nativeLanguage: onboarding.nativeLanguage || '',
            targetLanguage: onboarding.targetLanguage || '',
            learningPurpose: onboarding.learningPurpose || '',
            proficiencyLevel: onboarding.proficiencyLevel || '',
          });
          logger.info('formData', formData);

          // Determine current step based on completed steps
          const stepsOrder = [
            'welcome',
            'languages',
            'purpose',
            'proficiency',
            'assessment',
          ];
          const completedSteps = Object.entries(onboarding.steps || {})
            .filter(([_, isCompleted]) => isCompleted)
            .map(([step]) => step)
            .sort((a, b) => stepsOrder.indexOf(a) - stepsOrder.indexOf(b));
          logger.info('completedSteps', completedSteps);
          const lastCompletedStep = completedSteps[completedSteps.length - 1];
          logger.info('lastCompletedStep', lastCompletedStep);
          if (lastCompletedStep) {
            const nextStep = getNextStep(lastCompletedStep);
            logger.info('nextStep', nextStep);
            setCurrentStep(nextStep);
          } else {
            setCurrentStep(stepsOrder[0]);
          }
        }
      } catch (error) {
        logger.error('Error fetching onboarding data:', error);
      }
    };

    fetchOnboardingData();
  }, []); // Removed getOnboarding from dependency array if it causes loops, ensure it's stable or called appropriately

  // Check if onboarding is complete
  useEffect(() => {
    if (isOnboardingComplete && user) {
      router.push('/app/lessons');
    }
  }, [isOnboardingComplete, user, router]);

  useEffect(() => {
    console.log('assessmentLesson on page.tsx', assessmentLesson);
    console.log('currentStep on page.tsx', currentStep);
    if (currentStep === 'assessment' && !assessmentLesson) {
      generateAssessmentLesson();
    }
    // This effect correctly waits for both metrics before triggering lesson generation
    if (
      assessmentLesson &&
      assessmentLesson.completed &&
      assessmentLesson.metrics && assessmentLesson.audioMetrics
    ) {
      logger.info('generating the initial lessons');
      markOnboardingAsCompleteAndGenerateLessons();
    }
  }, [assessmentLesson, currentStep]); // Removed markOnboardingAsCompleteAndGenerateLessons from deps if unstable

  const handleNextStep = async (step: string, data?: any) => {
    // Merge new data with existing form data immediately
    const mergedFormData = data ? { ...formData, ...data } : formData;

    try {
      // Update local state
      if (data) {
        setFormData(mergedFormData);
      }
      console.log('mergedFormData', mergedFormData);
      // Pass the merged data to the backend
      await markStepComplete(step, mergedFormData);
      setCurrentStep(getNextStep(step));
    } catch (error) {
      logger.error('Error moving to next step:', error);
    }
  };

  const getNextStep = (currentStep: string): string => {
    const steps = [
      'welcome',
      'languages',
      'purpose',
      'proficiency',
      'assessment',
    ];
    const currentIndex = steps.indexOf(currentStep);
    return steps[currentIndex + 1] || 'assessment';
  };

  // Generate assessment lesson after proficiency is submitted
  const generateAssessmentLesson = async () => {
    setAssessmentLoading(true);
    try {
      const lesson = await getAssessmentLesson();
      if (!lesson) {
        toast.error('Failed to load assessment lesson');
        return;
      }
      setAssessmentLesson(lesson);
    } catch (error) {
      logger.error('Error generating assessment lesson:', error);
      toast.error('Error generating assessment lesson');
    } finally {
      setAssessmentLoading(false);
    }
  };

  // complete assessment lesson (generates text-based metrics)
  const handleOnAssessmentComplete = async () => {
    if (!assessmentLesson) {
      toast.error('No assessment lesson to complete');
      return;
    }
    setAreMetricsGenerated(false);
    try {
      const lessonWithMetrics = await completeAssessmentLesson(
        assessmentLesson.id,
        'Assessment completed'
      );
      if (!lessonWithMetrics) {
        toast.error('Failed to complete assessment');
        return;
      }
      setAssessmentLesson(prev => ({ ...prev, ...lessonWithMetrics }));
      logger.info('LessonWithMetrics (Text-based)', lessonWithMetrics);
    } catch (error) {
      logger.error('Error completing assessment lesson:', error);
      toast.error('Error completing assessment');
    } finally {
      setAreMetricsGenerated(true);
    }
  };

  // just re-route to lessons page
  const handleGoToLessonsButtonClick = async () => {
    goToLessonsWithOnboardingComplete();
  };

  // Process audio recording (generates audioMetrics)
  const onProcessAssessmentLessonRecording = async (sessionRecording: RecordingBlob, lesson: AssessmentLesson, recordingTime: number, recordingSize: number) => {
    logger.info('processing assessment lesson recording', { sessionRecording, lesson, recordingTime, recordingSize });
    try {
      const lessonWithAudioMetrics = await processAssessmentLessonRecording(sessionRecording, lesson, recordingTime, recordingSize);
      if (!lessonWithAudioMetrics) {
        toast.error('Failed to process pronunciation');
        return;
      }
      setAssessmentLesson(prev => ({ ...prev, ...lessonWithAudioMetrics }));
      logger.info('LessonWithAudioMetrics (Audio included)', lessonWithAudioMetrics);
      return lessonWithAudioMetrics;
    } catch (error) {
      logger.error('Error processing assessment recording on page:', error);
      toast.error('Error processing assessment recording');
      return;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <WelcomeStep
            onNext={() => handleNextStep('welcome')}
            loading={loading}
          />
        );
      case 'languages':
        return (
          <LanguageSelectionStep
            onNext={(data) => handleNextStep('languages', data)}
            formData={formData}
            loading={loading}
          />
        );
      case 'purpose':
        return (
          <LearningPurposeStep
            onNext={(data) => handleNextStep('purpose', data)}
            formData={formData}
            loading={loading}
          />
        );
      case 'proficiency':
        return (
          <ProficiencyStep
            onNext={(data) => handleNextStep('proficiency', data)}
            onAssessmentGeneration={generateAssessmentLesson} // This might be redundant if assessment step auto-loads
            formData={formData}
            loading={loading}
          />
        );
      case 'assessment':
        return (
          <AssessmentStep
            areMetricsGenerated={areMetricsGenerated}
            onAssessmentComplete={handleOnAssessmentComplete} // Renamed for clarity
            loading={assessmentLoading || loading} // Combine loading states if needed
            targetLanguage={formData.targetLanguage}
            lesson={assessmentLesson}
            onGoToLessonsButtonClick={handleGoToLessonsButtonClick}
            processAssessmentLessonRecording={onProcessAssessmentLessonRecording}
          />
        );
      default:
        return (
          <WelcomeStep
            onNext={() => handleNextStep('welcome')}
            loading={loading}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-50    lg:px-8">
      <div className="max-w-md w-full h-full space-y-8">{renderStep()}</div>
    </div>
  );
}
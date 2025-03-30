'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useOnboarding } from '@/context/onboarding-context';
import logger from '@/utils/logger';
import WelcomeStep from '@/components/onboarding/WelcomeStep';
import LanguageSelectionStep from '@/components/onboarding/LanguageSelectionStep';
import LearningPurposeStep from '@/components/onboarding/LearningPurposeStep';
import ProficiencyStep from '@/components/onboarding/ProficiencyStep';
import AssessmentStep from '@/components/onboarding/AssessmentStep';
import { AssessmentLesson } from '@/models/AppAllModels.model';

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    isOnboardingComplete,
    markStepComplete,
    loading,
    getOnboarding,
    getAssessmentLesson,
    completeOnboardingWithLessons,
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

  // State to hold the generated assessment lesson and its loading status
  const [assessmentLesson, setAssessmentLesson] =
    useState<AssessmentLesson | null>(null);
  const [assessmentLoading, setAssessmentLoading] = useState<boolean>(false);
  const [areMetricsGenerated, setAreMetricsGenerated] =
    useState<boolean>(false);

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
  }, []);

  // Check if onboarding is complete
  useEffect(() => {
    if (isOnboardingComplete && user) {
      router.push('/app/lessons');
    }
  }, [isOnboardingComplete, user, router]);

  useEffect(() => {
    console.log('assessmentLesson', assessmentLesson);
    console.log('currentStep', currentStep);
    if (currentStep === 'assessment' && !assessmentLesson) {
      generateAssessmentLesson();
    }
    if (
      assessmentLesson &&
      assessmentLesson.completed &&
      assessmentLesson.metrics
    ) {
      completeOnboardingWithLessons();
    }
  }, [assessmentLesson, currentStep]);

  const handleNextStep = async (step: string, data?: any) => {
    if (data) {
      setFormData((prev) => ({ ...prev, ...data }));
    }

    try {
      await markStepComplete(step);
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
      if (lesson) {
        setAssessmentLesson(lesson);
      }
    } catch (error) {
      logger.error('Error generating assessment lesson:', error);
    } finally {
      setAssessmentLoading(false);
    }
  };

  const handleOnAssessmentComplete = async () => {
    if (!assessmentLesson) {
      throw new Error('Assessment lesson not found');
    }
    try {
      setAreMetricsGenerated(true);
      const LessonWithMetrics = await completeAssessmentLesson(
        assessmentLesson?.id,
        'Assessment completed'
      );
      setAssessmentLesson((prev) => ({ ...prev, ...LessonWithMetrics }));
      logger.info('LessonWithMetrics', LessonWithMetrics);
    } catch (error) {
      logger.error('Error completing assessment lesson:', error);
    } finally {
      setAreMetricsGenerated(false);
    }
  };

  const handleGoToLessonsButtonClick = async () => {
    goToLessonsWithOnboardingComplete();
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
            onAssessmentGeneration={generateAssessmentLesson}
            formData={formData}
            loading={loading}
          />
        );
      case 'assessment':
        return (
          <AssessmentStep
            onAssessmentComplete={() => handleOnAssessmentComplete()}
            loading={assessmentLoading}
            targetLanguage={formData.targetLanguage}
            lesson={assessmentLesson}
            onGoToLessonsButtonClick={() => handleGoToLessonsButtonClick()}
            areMetricsGenerated={areMetricsGenerated}
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
    <div className="min-h-screen flex justify-center items-center bg-gray-50  px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full h-full space-y-8">{renderStep()}</div>
    </div>
  );
}

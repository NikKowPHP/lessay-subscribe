import { AssessmentLesson, AssessmentStep, OnboardingModel } from "@/models/AppAllModels.model"
import { LessonModel, GeneratedLesson, LessonStep } from '@/models/AppAllModels.model'

export  interface IOnboardingRepository {
  getOnboarding(): Promise<OnboardingModel | null>
  createOnboarding(): Promise<OnboardingModel>
  updateOnboarding(step: string): Promise<OnboardingModel>
  completeOnboarding(): Promise<OnboardingModel>
  deleteOnboarding(): Promise<void>
  getStatus(): Promise<boolean>
  getAssessmentLesson(userId: string): Promise<AssessmentLesson | null>
  getAssessmentLessonById(lessonId: string): Promise<AssessmentLesson | null>
  completeAssessmentLesson(assessment: AssessmentLesson, data: {
    summary: string;
    metrics: any;
    proposedTopics: string[];
  }): Promise<AssessmentLesson>
  createAssessmentLesson(userId: string, assessment: Omit<AssessmentLesson, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssessmentLesson>
  recordStepAttempt(lessonId: string, stepId: string, data:{userResponse: string, correct: boolean}): Promise<AssessmentStep>
}

export interface ILessonRepository {
  getLessons: () => Promise<LessonModel[]>
  getLessonById: (lessonId: string) => Promise<LessonModel | null>
  createLesson: (lessonData: { 
    focusArea: string
    targetSkills: string[]
    steps: LessonStep[]
  }) => Promise<LessonModel>
  updateLesson: (lessonId: string, lessonData: Partial<LessonModel>) => Promise<LessonModel>
  completeLesson: (lessonId: string, performanceMetrics?: {
    accuracy?: number
    pronunciationScore?: number
    errorPatterns?: string[]
  }) => Promise<LessonModel>
  deleteLesson: (lessonId: string) => Promise<void>
  recordStepAttempt: (lessonId: string, stepId: string, data: {
    userResponse: string
    correct: boolean
  }) => Promise<LessonStep>
  getStepHistory: (lessonId: string, stepId: string) => Promise<LessonStep[]>
}


export interface ILessonGeneratorService {
  generateLesson: (topic: string, targetLanguage: string, difficultyLevel: string) => Promise<Record<string, unknown>>
  generateAudioForSteps: (steps: LessonStep[], language: string, sourceLanguage: string) => Promise<LessonStep[]>
}

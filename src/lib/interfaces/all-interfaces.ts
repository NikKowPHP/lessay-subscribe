import { AssessmentLesson, AssessmentStep, OnboardingModel } from "@/models/AppAllModels.model"
import { LessonModel, GeneratedLesson, LessonStep } from '@/models/AppAllModels.model'

export  interface IOnboardingRepository {
  getOnboarding(): Promise<OnboardingModel | null>
  createOnboarding(): Promise<OnboardingModel>
  updateOnboarding(step: string, formData: any): Promise<OnboardingModel>
  completeOnboarding(): Promise<OnboardingModel>
  deleteOnboarding(): Promise<void>
  getStatus(): Promise<boolean>
  getAssessmentLesson(): Promise<AssessmentLesson | null>
  getAssessmentLessonById(lessonId: string): Promise<AssessmentLesson | null>
  completeAssessmentLesson(assessment: AssessmentLesson, data: {
    summary: string;
    metrics: any;
    proposedTopics: string[];
  }): Promise<AssessmentLesson>
  createAssessmentLesson(userId: string, assessment: Omit<AssessmentLesson, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssessmentLesson>
  recordStepAttempt(lessonId: string, stepId: string, data:{userResponse: string, correct: boolean}): Promise<AssessmentStep>
  updateOnboardingAssessmentLesson(lessonId: string, lessonData: Partial<AssessmentLesson>): Promise<AssessmentLesson>
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



export interface RecordingBlob extends Blob {
  recordingTime?: number;
  recordingSize?: number;
  lastModified?: number;
}



// Add these interfaces (adjust types like number/string/array as needed based on AI response)
export interface AiPerformanceMetrics {
  pronunciation_score?: number;
  fluency_score?: number;
  grammar_accuracy?: number; // Note the different name
  vocabulary_score?: number;
  overall_performance?: number;
  strengths?: string[];
  weaknesses?: string[];
}

export interface AiProgressTracking {
  improvement_since_last_assessment?: any; // Type appropriately if used
  learning_trajectory?: string;
  estimated_proficiency_level?: string;
  time_to_next_level_estimate?: string;
}

export interface AiAdaptiveSuggestions {
  suggested_topics?: string[];
  grammar_focus_areas?: string[];
  vocabulary_domains?: string[];
  next_skill_targets?: string[];
  learning_style_observations?: {
    preferred_patterns?: string[];
    effective_approaches?: string[];
  };
  // Add preferred_patterns and effective_approaches directly if they are top-level in suggestions
  preferred_patterns?: string[];
  effective_approaches?: string[];
}

// You might also want a top-level interface for the whole AI response
export interface AiLessonAnalysisResponse {
  pronunciation_assessment?: any; // Use more specific type if defined
  fluency_assessment?: any;
  grammar_assessment?: any;
  vocabulary_assessment?: any;
  exercise_completion?: any;
  performance_metrics?: AiPerformanceMetrics;
  adaptive_learning_suggestions?: AiAdaptiveSuggestions;
  progress_tracking?: AiProgressTracking;
  // Add other potential top-level fields if necessary
  audioRecordingUrl?: string;
  recordingDuration?: number;
}

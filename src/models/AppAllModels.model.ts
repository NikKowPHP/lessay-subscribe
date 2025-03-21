import { ProficiencyLevel, AssessmentStepType, LessonStepType } from '@prisma/client'
import type { JsonValue } from '@prisma/client/runtime/library'

export interface OnboardingModel {
  id: string;
  userId: string;
  steps: JsonValue;
  completed: boolean;
  learningPurpose?: string | null;
  nativeLanguage?: string | null;
  targetLanguage?: string | null;
  proficiencyLevel?: ProficiencyLevel | null;
  initialAssessmentCompleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssessmentLesson {
  id: string;
  userId: string;
  description?: string | null;
  completed: boolean;
  sourceLanguage: string;
  targetLanguage: string;
  metrics?: JsonValue | null | {
    accuracy?: number;
    pronunciationScore?: number;
    grammarScore?: number;
    vocabularyScore?: number;
    overallScore?: number;
    strengths?: string[];
    weaknesses?: string[];
  };
  proposedTopics: string[]; 
  summary?: string | null;
  createdAt: Date;
  updatedAt: Date;
  steps: AssessmentStep[];
}

export interface AssessmentStep {
  id: string;
  assessmentId: string;
  stepNumber: number;
  type: AssessmentStepType;
  content: string;
  contentAudioUrl?: string | null;
  translation?: string | null;
  expectedAnswer?: string | null;
  expectedAnswerAudioUrl?: string | null;
  maxAttempts: number;
  userResponse?: string | null;
  attempts: number;
  correct: boolean;
  lastAttemptAt?: Date | null;
  feedback?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeneratedLesson {
  id: string;
  userId: string;
  lessonId: string;
  focusArea: string;
  targetSkills: string[];
  steps: LessonStep[];
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LessonModel {
  id: string;
  userId: string;
  lessonId: string;
  focusArea: string;
  targetSkills: string[];
  steps: LessonStep[];
  performanceMetrics?: JsonValue | null | {
    accuracy?: number;
    pronunciationScore?: number;
    errorPatterns?: string[];
  };
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LessonStep {
  id: string;
  lessonId: string;
  stepNumber: number;
  type: 'prompt' | 'model_answer' | 'user_answer' | 'new_word' | 'practice';
  content: string;
  contentAudioUrl?: string | null;
  translation?: string | null;
  expectedAnswer?: string | null;
  expectedAnswerAudioUrl?: string | null;
  userResponse?: string | null;
  attempts: number;
  correct: boolean;
  lastAttemptAt?: Date | null;
  errorPatterns: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Add other models as needed
export interface UserProfileModel {
  id: string;
  userId: string;
  email: string;
  nativeLanguage?: string;
  targetLanguage?: string;
  proficiencyLevel?: 'beginner' | 'intermediate' | 'advanced';
  learningPurpose?: string;
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Add a type guard for assessment metrics
export function isAssessmentMetrics(obj: JsonValue): obj is {
  accuracy?: number;
  pronunciationScore?: number;
  grammarScore?: number;
  vocabularyScore?: number;
  overallScore?: number;
  strengths?: string[];
  weaknesses?: string[];
} {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}

// Add a type guard for lesson performance metrics
export function isPerformanceMetrics(obj: JsonValue): obj is {
  accuracy?: number;
  pronunciationScore?: number;
  errorPatterns?: string[];
} {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}

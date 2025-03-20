import { ProficiencyLevel } from '@prisma/client'
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
  step: number;
  prompt: string;
  modelAnswer: string;
  userResponse?: string | null;
  completed: boolean;
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
  stepNumber: number;
  type: 'prompt' | 'model_answer' | 'user_answer' | 'new_word' | 'practice';
  content: string;
  translation?: string | null;
  userResponse?: string | null;
  audioUrl?: string;
  attempts: number;
  correct: boolean;
  lastAttemptAt?: Date | null;
  errorPatterns?: string[];
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

export function isPerformanceMetrics(obj: JsonValue): obj is {
  accuracy?: number;
  pronunciationScore?: number;
  errorPatterns?: string[];
} {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}

export interface OnboardingModel {
  id: string;
  userId: string;
  steps: {
    [key: string]: boolean;
  };
  completed: boolean;
  learningPurpose?: string;
  nativeLanguage?: string;
  targetLanguage?: string;
  proficiencyLevel?: 'beginner' | 'intermediate' | 'advanced';
  initialAssessmentCompleted?: boolean;
  lessonGenerationStatus?: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface LessonModel {
  id: string;
  userId: string;
  lessonId: string;
  focusArea: string;
  targetSkills: string[];
  sequence: LessonStep[];
  performanceMetrics?: {
    accuracy?: number;
    pronunciationScore?: number;
    errorPatterns?: string[];
  };
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LessonStep {
  step: number;
  type: 'prompt' | 'model_answer' | 'user_answer' | 'new_word' | 'practice';
  content: string;
  translation?: string;
  userResponse?: string;
  audioUrl?: string;
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

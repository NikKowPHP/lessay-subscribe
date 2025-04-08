import { ProficiencyLevel, AssessmentStepType, LessonStepType, LearningTrajectory, LanguageInfluenceLevel, SpeechRateEvaluation, HesitationFrequency, PriorityLevel, SeverityLevel, VocabularyRange, ComprehensionLevel, MasteryLevel } from '@prisma/client'
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
  audioMetrics?: AudioMetrics | null;
  sessionRecordingUrl?: string | null;
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
  type:  'question' |  'feedback' | 'instruction' | 'summary';
  content: string;
  contentAudioUrl?: string | null;
  translation?: string | null;
  expectedAnswer?: string | null;
  expectedAnswerAudioUrl?: string | null;
  maxAttempts: number;
  userResponse?: string | null;
  userResponseHistory?: JsonValue | null;
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
    grammarScore?: number;
    vocabularyScore?: number;
    overallScore?: number;
    strengths?: string[];
    weaknesses?: string[];
    summary?: string;
    nextLessonSuggestions?: string[];
    errorPatterns?: string[];
  };
  audioMetrics?: AudioMetrics | null;
  sessionRecordingUrl?: string | null;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LessonStep {
  id: string;
  lessonId: string;
  stepNumber: number;
  type: 'prompt' | 'feedback'  | 'new_word' | 'practice' | 'instruction' | 'summary';
  content: string;
  contentAudioUrl?: string | null;
  translation?: string | null;
  expectedAnswer?: string | null;
  expectedAnswerAudioUrl?: string | null;
  userResponse?: string | null;
  userResponseHistory?: JsonValue | null;
  attempts: number;
  maxAttempts: number;
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
  name?: string;
  nativeLanguage?: string;
  targetLanguage?: string;
  proficiencyLevel?: 'beginner' | 'intermediate' | 'advanced';
  learningPurpose?: string;
  onboardingCompleted: boolean;
  createdAt: Date;
  initialAssessmentCompleted: boolean;
  updatedAt: Date;
  learningProgressSummary?: {
    estimatedProficiencyLevel: ProficiencyLevel;
    overallScore?: number | null;
    learningTrajectory: LearningTrajectory;
  }
  
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
  grammarScore?: number;
  vocabularyScore?: number;
  overallScore?: number;
  strengths?: string[];
  weaknesses?: string[];
  summary?: string;
  nextLessonSuggestions?: string[];
  errorPatterns?: string[];
} {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}

// Detailed assessment types for the JSON fields
export interface PronunciationAssessment {
  overall_score: number;
  native_language_influence: {
    level: LanguageInfluenceLevel;
    specific_features: string[];
  };
  phoneme_analysis: Array<{
    phoneme: string; // IPA symbol
    target_realization: string; // IPA for standard target language
    user_realization: string; // IPA for user's pronunciation
    accuracy: number; // 0-100
    examples: string[]; // words/phrases from recording
  }>;
  problematic_sounds: string[]; // IPA symbols
  strengths: string[];
  areas_for_improvement: string[];
}

export interface FluencyAssessment {
  overall_score: number;
  speech_rate: {
    words_per_minute: number;
    evaluation: SpeechRateEvaluation;
  };
  hesitation_patterns: {
    frequency: HesitationFrequency;
    average_pause_duration: number; // seconds
    typical_contexts: string[];
  };
  rhythm_and_intonation: {
    naturalness: number; // 0-100
    sentence_stress_accuracy: number; // 0-100
    intonation_pattern_accuracy: number; // 0-100
  };
}

export interface GrammarAssessment {
  overall_score: number;
  error_patterns: Array<{
    category: string; // e.g., verb tense, word order
    description: string;
    examples: string[];
    frequency: HesitationFrequency;
    severity: SeverityLevel;
  }>;
  grammar_rules_to_review: Array<{
    rule: string;
    priority: PriorityLevel;
    examples: string[];
  }>;
  grammar_strengths: string[];
}

export interface VocabularyAssessment {
  overall_score: number;
  range: VocabularyRange;
  appropriateness: number; // 0-100
  precision: number; // 0-100
  areas_for_expansion: Array<{
    topic: string;
    suggested_vocabulary: string[];
  }>;
}

export interface ExerciseCompletion {
  overall_score: number;
  exercises_analyzed: Array<{
    prompt: string;
    expected_answer: string;
    user_response: string;
    accuracy: number; // 0-100
    error_analysis?: string;
  }>;
  comprehension_level: ComprehensionLevel;
}

// Main AudioMetrics interface
export interface AudioMetrics {
  id: string;
  // Relationships
  lessonId?: string | null;
  assessmentLessonId?: string | null;
  
  // Top-level metrics
  pronunciationScore: number; // 0-100
  fluencyScore: number; // 0-100
  grammarScore: number; // 0-100
  vocabularyScore: number; // 0-100
  overallPerformance: number; // 0-100
  
  // CEFR level and trajectory
  proficiencyLevel: string; // CEFR level: A1-C2
  learningTrajectory: LearningTrajectory;
  
  // Detailed analysis sections
  pronunciationAssessment: PronunciationAssessment;
  fluencyAssessment: FluencyAssessment;
  grammarAssessment: GrammarAssessment;
  vocabularyAssessment: VocabularyAssessment;
  exerciseCompletion: ExerciseCompletion;
  
  // Learning recommendations
  suggestedTopics: string[];
  grammarFocusAreas: string[];
  vocabularyDomains: string[];
  nextSkillTargets: string[];
  
  // Learning style observations
  preferredPatterns: string[];
  effectiveApproaches: string[];
  
  // Metadata
  audioRecordingUrl?: string | null;
  recordingDuration?: number | null; // seconds
  createdAt: Date;
  updatedAt: Date;
}

// Type guards for JSON fields with proper compatibility with JsonValue
export function isPronunciationAssessment(obj: JsonValue): obj is JsonValue {
  return typeof obj === 'object' && obj !== null && 'overall_score' in obj && 'phoneme_analysis' in obj;
}

export function isFluencyAssessment(obj: JsonValue): obj is JsonValue {
  return typeof obj === 'object' && obj !== null && 'overall_score' in obj && 'speech_rate' in obj;
}

export function isGrammarAssessment(obj: JsonValue): obj is JsonValue {
  return typeof obj === 'object' && obj !== null && 'overall_score' in obj && 'error_patterns' in obj;
}

export function isVocabularyAssessment(obj: JsonValue): obj is JsonValue {
  return typeof obj === 'object' && obj !== null && 'overall_score' in obj && 'areas_for_expansion' in obj;
}

export function isExerciseCompletion(obj: JsonValue): obj is JsonValue {
  return typeof obj === 'object' && obj !== null && 'overall_score' in obj && 'exercises_analyzed' in obj;
}

// Helper functions for safely accessing the data after type checking
export function getPronunciationAssessment(obj: JsonValue): PronunciationAssessment | null {
  if (isPronunciationAssessment(obj)) {
    return obj as unknown as PronunciationAssessment;
  }
  return null;
}

export function getFluencyAssessment(obj: JsonValue): FluencyAssessment | null {
  if (isFluencyAssessment(obj)) {
    return obj as unknown as FluencyAssessment;
  }
  return null;
}

export function getGrammarAssessment(obj: JsonValue): GrammarAssessment | null {
  if (isGrammarAssessment(obj)) {
    return obj as unknown as GrammarAssessment;
  }
  return null;
}

export function getVocabularyAssessment(obj: JsonValue): VocabularyAssessment | null {
  if (isVocabularyAssessment(obj)) {
    return obj as unknown as VocabularyAssessment;
  }
  return null;
}

export function getExerciseCompletion(obj: JsonValue): ExerciseCompletion | null {
  if (isExerciseCompletion(obj)) {
    return obj as unknown as ExerciseCompletion;
  }
  return null;
}

// Structure for sending to lesson generation
export interface AdaptiveLessonGenerationRequest {
  // User profile data
  userInfo: {
    nativeLanguage: string,
    targetLanguage: string,
    proficiencyLevel: string, // Derived from CEFR in analysis
    learningPurpose?: string
  },
  
  // Key performance metrics
  performanceMetrics: {
    pronunciationScore: number,
    fluencyScore: number,
    grammarAccuracy: number,
    vocabularyScore: number,
    overallPerformance: number
  },
  
  // Specific areas needing improvement
  improvementAreas: {
    pronunciation: string[], // Problematic sounds
    grammar: {  
      rulesToFocus: Array<{rule: string, priority: string}>,
      commonErrors: Array<{category: string, description: string}>
    },
    vocabulary: Array<{topic: string, suggestedVocabulary: string[]}>
  },
  
  // Learning suggestions from analysis
  learningRecommendations: {
    suggestedTopics: string[],
    focusAreas: string[],
    nextSkillTargets: string[]
  },
  
  // Learning style insights
  learningStyle: {
    effectiveApproaches: string[],
    preferredPatterns: string[]
  },
  
  // Previous lesson data
  previousLesson: {
    id: string,
    focusArea: string,
    targetSkills: string[],
    completionSuccessRate: number // Calculated from exercise completion
  }
}

/**
 * Builds an AdaptiveLessonGenerationRequest from existing application data
 * @param userProfile User profile information
 * @param audioMetrics Latest audio analysis metrics
 * @param previousLesson Most recent completed lesson
 * @returns Formatted request for adaptive lesson generation
 */
export function buildAdaptiveLessonRequest(
  userProfile: UserProfileModel,
  audioMetrics: AudioMetrics,
  previousLesson?: LessonModel
): AdaptiveLessonGenerationRequest {
  
  // Extract grammar rules to focus on
  const grammarRulesToFocus = audioMetrics.grammarAssessment.grammar_rules_to_review.map(rule => ({
    rule: rule.rule,
    priority: rule.priority.toString()
  }));
  
  // Extract common grammar errors
  const grammarCommonErrors = audioMetrics.grammarAssessment.error_patterns.map(pattern => ({
    category: pattern.category,
    description: pattern.description
  }));
  
  // Extract vocabulary areas for improvement
  const vocabularyAreas = audioMetrics.vocabularyAssessment.areas_for_expansion.map(area => ({
    topic: area.topic,
    suggestedVocabulary: area.suggested_vocabulary
  }));
  
  // Calculate completion success rate if we have previous lesson data
  const completionSuccessRate = previousLesson 
    ? audioMetrics.exerciseCompletion.overall_score 
    : 0;
  
  return {
    // User profile information
    userInfo: {
      nativeLanguage: userProfile.nativeLanguage || 'English',
      targetLanguage: userProfile.targetLanguage || 'English',
      proficiencyLevel: audioMetrics.proficiencyLevel,
      learningPurpose: userProfile.learningPurpose
    },
    
    // Performance metrics from audio analysis
    performanceMetrics: {
      pronunciationScore: audioMetrics.pronunciationScore,
      fluencyScore: audioMetrics.fluencyScore,
      grammarAccuracy: audioMetrics.grammarScore,
      vocabularyScore: audioMetrics.vocabularyScore,
      overallPerformance: audioMetrics.overallPerformance
    },
    
    // Areas needing improvement
    improvementAreas: {
      pronunciation: audioMetrics.pronunciationAssessment.problematic_sounds,
      grammar: {
        rulesToFocus: grammarRulesToFocus,
        commonErrors: grammarCommonErrors
      },
      vocabulary: vocabularyAreas
    },
    
    // Learning recommendations
    learningRecommendations: {
      suggestedTopics: audioMetrics.suggestedTopics,
      focusAreas: audioMetrics.grammarFocusAreas,
      nextSkillTargets: audioMetrics.nextSkillTargets
    },
    
    // Learning style insights
    learningStyle: {
      effectiveApproaches: audioMetrics.effectiveApproaches,
      preferredPatterns: audioMetrics.preferredPatterns
    },
    
    // Previous lesson data (if available)
    previousLesson: previousLesson ? {
      id: previousLesson.id,
      focusArea: previousLesson.focusArea,
      targetSkills: previousLesson.targetSkills,
      completionSuccessRate: completionSuccessRate
    } : {
      id: '',
      focusArea: '',
      targetSkills: [],
      completionSuccessRate: 0
    }
  };
}

export interface LearningProgressModel {
  id: string;
  userId: string;
  estimatedProficiencyLevel: ProficiencyLevel;
  overallScore?: number | null;
  learningTrajectory: LearningTrajectory;
  strengths: string[];
  weaknesses: string[];
  lastLessonCompletedAt?: Date | null;
  lastAssessmentCompletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Optional: Include related topics/words if fetched
  topics?: TopicProgressModel[];
  words?: WordProgressModel[];
}

export interface TopicProgressModel {
  id: string;
  learningProgressId: string;
  topicName: string;
  masteryLevel: MasteryLevel;
  lastStudiedAt?: Date | null;
  relatedLessonIds: string[];
  relatedAssessmentIds: string[];
  score?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WordProgressModel {
  id: string;
  learningProgressId: string;
  word: string;
  translation?: string | null;
  masteryLevel: MasteryLevel;
  timesCorrect: number;
  timesIncorrect: number;
  firstSeenAt: Date;
  lastReviewedAt?: Date | null;
  relatedLessonStepIds: string[];
  relatedAssessmentStepIds: string[];
  createdAt: Date;
  updatedAt: Date;
}


// TODO: DEFINE LEARNING PROGRESS MODEL
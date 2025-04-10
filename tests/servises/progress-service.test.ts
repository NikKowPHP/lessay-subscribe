// File: tests/services/learning-progress.service.test.ts

import LearningProgressService from '@/services/learning-progress.service';
import { ILearningProgressRepository } from '@/repositories/learning-progress.repository';
import { LearningProgressModel, LessonModel, AssessmentLesson, TopicProgressModel, WordProgressModel, AudioMetrics } from '@/models/AppAllModels.model';
import { MasteryLevel, ProficiencyLevel, LearningTrajectory } from '@prisma/client';
import { mockDeep, MockProxy } from 'jest-mock-extended';
import logger from '@/utils/logger';

// Mock the logger
jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('LearningProgressService', () => {
  let progressService: LearningProgressService;
  let mockProgressRepository: MockProxy<ILearningProgressRepository>;

  const userId = 'test-user-id';
  const learningProgressId = 'test-progress-id';

  // --- Mock Data ---
  const mockExistingProgress: LearningProgressModel = {
    id: learningProgressId,
    userId: userId,
    estimatedProficiencyLevel: ProficiencyLevel.beginner,
    overallScore: 50,
    learningTrajectory: LearningTrajectory.steady,
    strengths: ['greeting'],
    weaknesses: ['past tense'],
    createdAt: new Date(),
    updatedAt: new Date(),
    topics: [],
    words: [],
  };

  const mockLesson: LessonModel = {
    id: 'lesson-1',
    userId: userId,
    lessonId: 'gen-lesson-1',
    focusArea: 'Travel Basics',
    targetSkills: ['asking directions', 'ordering food'],
    steps: [
      { id: 'step-1', lessonId: 'lesson-1', stepNumber: 1, type: 'instruction', content: '...', attempts: 0, maxAttempts: 1, correct: true, errorPatterns: [], createdAt: new Date(), updatedAt: new Date() },
      { id: 'step-2', lessonId: 'lesson-1', stepNumber: 2, type: 'new_word', content: 'Bahnhof', translation: 'train station', expectedAnswer: 'Bahnhof', attempts: 1, maxAttempts: 3, correct: true, errorPatterns: [], createdAt: new Date(), updatedAt: new Date() },
      { id: 'step-3', lessonId: 'lesson-1', stepNumber: 3, type: 'practice', content: 'Say: Wo ist der Bahnhof?', expectedAnswer: 'Wo ist der Bahnhof?', userResponse: 'Wo ist der Bahnhof?', attempts: 1, maxAttempts: 3, correct: true, errorPatterns: [], createdAt: new Date(), updatedAt: new Date() },
      { id: 'step-4', lessonId: 'lesson-1', stepNumber: 4, type: 'practice', content: 'Say: Ich möchte...', expectedAnswer: 'Ich möchte...', userResponse: 'Ich mochte...', attempts: 1, maxAttempts: 3, correct: false, errorPatterns: ['verb conjugation'], createdAt: new Date(), updatedAt: new Date() },
    ],
    performanceMetrics: {
      accuracy: 75,
      pronunciationScore: 80,
      grammarScore: 70,
      vocabularyScore: 85,
      overallScore: 78,
      strengths: ['basic vocab'],
      weaknesses: ['verb conjugation'],
    },
    audioMetrics: null, // Add mock audio metrics if needed
    completed: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAssessment: AssessmentLesson = {
    id: 'assessment-1',
    userId: userId,
    description: 'Initial Assessment',
    completed: true,
    sourceLanguage: 'English',
    targetLanguage: 'German',
    metrics: {
      accuracy: 80,
      overallScore: 82,
      strengths: ['comprehension'],
      weaknesses: ['articles'],
    },
    audioMetrics: { // Example audio metrics
      id: 'audio-metrics-1',
      pronunciationScore: 85,
      fluencyScore: 75,
      grammarScore: 78,
      vocabularyScore: 88,
      overallPerformance: 81,
      proficiencyLevel: 'A2',
      learningTrajectory: LearningTrajectory.steady,
      pronunciationAssessment: { overall_score: 85, native_language_influence: { level: 'low', specific_features: [] }, phoneme_analysis: [], problematic_sounds: ['ch'], strengths: ['vowels'], areas_for_improvement: ['ch sound'] },
      fluencyAssessment: { overall_score: 75, speech_rate: { words_per_minute: 90, evaluation: 'appropriate' }, hesitation_patterns: { frequency: 'occasional', average_pause_duration: 0.5, typical_contexts: [] }, rhythm_and_intonation: { naturalness: 70, sentence_stress_accuracy: 75, intonation_pattern_accuracy: 80 } },
      grammarAssessment: { overall_score: 78, error_patterns: [{ category: 'articles', description: 'Incorrect article usage', examples: [], frequency: 'frequent', severity: 'medium' }], grammar_rules_to_review: [{ rule: 'Definite articles', priority: 'high', examples: [] }], grammar_strengths: ['basic word order'] },
      vocabularyAssessment: { overall_score: 88, range: 'adequate', appropriateness: 90, precision: 85, areas_for_expansion: [{ topic: 'Travel', suggested_vocabulary: ['Flugzeug', 'Ticket'] }] },
      exerciseCompletion: { overall_score: 80, exercises_analyzed: [], comprehension_level: 'good' },
      suggestedTopics: ['Travel', 'Food'],
      grammarFocusAreas: ['Articles'],
      vocabularyDomains: ['Common Verbs'],
      nextSkillTargets: ['Using definite articles correctly'],
      preferredPatterns: [],
      effectiveApproaches: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    proposedTopics: ['Travel Vocabulary', 'Basic Grammar'],
    summary: 'Good start, focus on articles.',
    createdAt: new Date(),
    updatedAt: new Date(),
    steps: [
      { id: 'a-step-1', assessmentId: 'assessment-1', stepNumber: 1, type: 'instruction', content: '...', attempts: 0, maxAttempts: 1, correct: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 'a-step-2', assessmentId: 'assessment-1', stepNumber: 2, type: 'question', content: 'Der, die, or das Buch?', expectedAnswer: 'Das Buch', userResponse: 'Das Buch', attempts: 1, maxAttempts: 3, correct: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 'a-step-3', assessmentId: 'assessment-1', stepNumber: 3, type: 'question', content: 'Translate: I am learning', expectedAnswer: 'Ich lerne', userResponse: 'Ich lernen', attempts: 1, maxAttempts: 3, correct: false, createdAt: new Date(), updatedAt: new Date() },
    ],
  };

  beforeEach(() => {
    // Create a deep mock of the repository
    mockProgressRepository = mockDeep<ILearningProgressRepository>();
    // Instantiate the service with the mock repository
    progressService = new LearningProgressService(mockProgressRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- Test Cases ---

  it('should be defined', () => {
    expect(progressService).toBeDefined();
  });

  describe('getLearningProgress', () => {
    it('should call repository getLearningProgress with correct userId', async () => {
      mockProgressRepository.getLearningProgress.mockResolvedValue(mockExistingProgress);
      await progressService.getLearningProgress(userId);
      expect(mockProgressRepository.getLearningProgress).toHaveBeenCalledWith(userId);
    });

    it('should return the progress model from repository', async () => {
      mockProgressRepository.getLearningProgress.mockResolvedValue(mockExistingProgress);
      const result = await progressService.getLearningProgress(userId);
      expect(result).toEqual(mockExistingProgress);
    });

    it('should return null if repository returns null', async () => {
      mockProgressRepository.getLearningProgress.mockResolvedValue(null);
      const result = await progressService.getLearningProgress(userId);
      expect(result).toBeNull();
    });
  });

  describe('getLearningProgressWithDetails', () => {
    it('should call repository getLearningProgressWithDetails with correct userId', async () => {
      mockProgressRepository.getLearningProgressWithDetails.mockResolvedValue(mockExistingProgress);
      await progressService.getLearningProgressWithDetails(userId);
      expect(mockProgressRepository.getLearningProgressWithDetails).toHaveBeenCalledWith(userId);
    });

    it('should return the detailed progress model from repository', async () => {
      mockProgressRepository.getLearningProgressWithDetails.mockResolvedValue(mockExistingProgress);
      const result = await progressService.getLearningProgressWithDetails(userId);
      expect(result).toEqual(mockExistingProgress);
    });
  });

  describe('updateProgressAfterLesson', () => {
    it('should create new progress if none exists', async () => {
      mockProgressRepository.getLearningProgress.mockResolvedValue(null);
      mockProgressRepository.upsertLearningProgress.mockResolvedValueOnce({ ...mockExistingProgress, id: learningProgressId }); // Simulate creation returning progress
      mockProgressRepository.upsertLearningProgress.mockResolvedValueOnce(mockExistingProgress); // Simulate final update

      await progressService.updateProgressAfterLesson(userId, mockLesson);

      // Expect creation call
      expect(mockProgressRepository.upsertLearningProgress).toHaveBeenCalledWith(userId, expect.objectContaining({
        userId: userId,
        estimatedProficiencyLevel: ProficiencyLevel.beginner, // Default
        learningTrajectory: LearningTrajectory.steady,
        strengths: [],
        weaknesses: [],
      }));
      // Expect final update call
      expect(mockProgressRepository.upsertLearningProgress).toHaveBeenCalledWith(userId, expect.objectContaining({
        lastLessonCompletedAt: expect.any(Date),
        // Check other calculated fields if needed
      }));
    });

    it('should update existing progress', async () => {
      mockProgressRepository.getLearningProgress.mockResolvedValue(mockExistingProgress);
      mockProgressRepository.upsertLearningProgress.mockResolvedValue(mockExistingProgress); // Simulate final update

      await progressService.updateProgressAfterLesson(userId, mockLesson);

      expect(mockProgressRepository.getLearningProgress).toHaveBeenCalledWith(userId);
      expect(mockProgressRepository.upsertLearningProgress).toHaveBeenCalledTimes(1); // Only final update
      expect(mockProgressRepository.upsertLearningProgress).toHaveBeenCalledWith(userId, expect.objectContaining({
        lastLessonCompletedAt: expect.any(Date),
        overallScore: expect.any(Number), // Check calculated fields
        strengths: expect.any(Array),
        weaknesses: expect.any(Array),
      }));
    });

    it('should call updateTopicProgress for focusArea and targetSkills', async () => {
      mockProgressRepository.getLearningProgress.mockResolvedValue(mockExistingProgress);
      mockProgressRepository.upsertLearningProgress.mockResolvedValue(mockExistingProgress);

      await progressService.updateProgressAfterLesson(userId, mockLesson);

      expect(mockProgressRepository.upsertTopicProgress).toHaveBeenCalledWith(
        learningProgressId,
        expect.objectContaining({ topicName: mockLesson.focusArea })
      );
      expect(mockProgressRepository.upsertTopicProgress).toHaveBeenCalledWith(
        learningProgressId,
        expect.objectContaining({ topicName: mockLesson.targetSkills[0] })
      );
      expect(mockProgressRepository.upsertTopicProgress).toHaveBeenCalledWith(
        learningProgressId,
        expect.objectContaining({ topicName: mockLesson.targetSkills[1] })
      );
      expect(mockProgressRepository.upsertTopicProgress).toHaveBeenCalledTimes(1 + mockLesson.targetSkills.length);
    });

    it('should call updateWordProgress for relevant steps', async () => {
      mockProgressRepository.getLearningProgress.mockResolvedValue(mockExistingProgress);
      mockProgressRepository.upsertLearningProgress.mockResolvedValue(mockExistingProgress);

      await progressService.updateProgressAfterLesson(userId, mockLesson);

      // Step 2: new_word
      expect(mockProgressRepository.upsertWordProgress).toHaveBeenCalledWith(
        learningProgressId,
        expect.objectContaining({ word: 'Bahnhof', translation: 'train station' })
      );
      // Step 3: practice (correct)
      expect(mockProgressRepository.upsertWordProgress).toHaveBeenCalledWith(
        learningProgressId,
        expect.objectContaining({ word: 'Wo ist der Bahnhof?' })
      );
      // Step 4: practice (incorrect)
      expect(mockProgressRepository.upsertWordProgress).toHaveBeenCalledWith(
        learningProgressId,
        expect.objectContaining({ word: 'Ich möchte...' })
      );
      // Should be called 3 times (step 2, 3, 4)
      expect(mockProgressRepository.upsertWordProgress).toHaveBeenCalledTimes(3);
    });

    it('should handle errors during update and log them', async () => {
      const testError = new Error('Database connection failed');
      mockProgressRepository.getLearningProgress.mockRejectedValue(testError);

      await progressService.updateProgressAfterLesson(userId, mockLesson);

      expect(logger.error).toHaveBeenCalledWith(
        'Error updating learning progress after lesson:',
        expect.objectContaining({ userId, lessonId: mockLesson.id, error: testError })
      );
      // Ensure no further repository calls were made after the initial failure
      expect(mockProgressRepository.upsertTopicProgress).not.toHaveBeenCalled();
      expect(mockProgressRepository.upsertWordProgress).not.toHaveBeenCalled();
      expect(mockProgressRepository.upsertLearningProgress).not.toHaveBeenCalled();
    });

  });

  describe('updateProgressAfterAssessment', () => {
    it('should create new progress if none exists, using assessment proficiency', async () => {
      mockProgressRepository.getLearningProgress.mockResolvedValue(null);
      mockProgressRepository.upsertLearningProgress.mockResolvedValueOnce({ ...mockExistingProgress, id: learningProgressId }); // Creation
      mockProgressRepository.upsertLearningProgress.mockResolvedValueOnce(mockExistingProgress); // Final update

      await progressService.updateProgressAfterAssessment(userId, mockAssessment);

      // Expect creation call with proficiency from audio metrics
      expect(mockProgressRepository.upsertLearningProgress).toHaveBeenCalledWith(userId, expect.objectContaining({
        userId: userId,
        estimatedProficiencyLevel: ProficiencyLevel.beginner, // A2 maps to beginner in the service logic
        learningTrajectory: LearningTrajectory.steady,
        strengths: [],
        weaknesses: [],
      }));
      // Expect final update call
      expect(mockProgressRepository.upsertLearningProgress).toHaveBeenCalledWith(userId, expect.objectContaining({
        lastAssessmentCompletedAt: expect.any(Date),
      }));
    });

    it('should update existing progress using assessment data', async () => {
      mockProgressRepository.getLearningProgress.mockResolvedValue(mockExistingProgress);
      mockProgressRepository.upsertLearningProgress.mockResolvedValue(mockExistingProgress); // Final update

      await progressService.updateProgressAfterAssessment(userId, mockAssessment);

      expect(mockProgressRepository.getLearningProgress).toHaveBeenCalledWith(userId);
      expect(mockProgressRepository.upsertLearningProgress).toHaveBeenCalledTimes(1);
      expect(mockProgressRepository.upsertLearningProgress).toHaveBeenCalledWith(userId, expect.objectContaining({
        lastAssessmentCompletedAt: expect.any(Date),
        overallScore: expect.any(Number), // Check calculated fields
        estimatedProficiencyLevel: expect.any(String), // Should potentially update based on assessment
        learningTrajectory: LearningTrajectory.steady, // From audio metrics
        strengths: expect.arrayContaining(['greeting', 'comprehension', 'basic word order']), // Merged
        weaknesses: expect.arrayContaining(['past tense', 'articles', 'ch sound']), // Merged
      }));
    });

    it('should call updateTopicProgress for proposedTopics', async () => {
      mockProgressRepository.getLearningProgress.mockResolvedValue(mockExistingProgress);
      mockProgressRepository.upsertLearningProgress.mockResolvedValue(mockExistingProgress);

      await progressService.updateProgressAfterAssessment(userId, mockAssessment);

      expect(mockProgressRepository.upsertTopicProgress).toHaveBeenCalledWith(
        learningProgressId,
        expect.objectContaining({ topicName: mockAssessment.proposedTopics[0] })
      );
      expect(mockProgressRepository.upsertTopicProgress).toHaveBeenCalledWith(
        learningProgressId,
        expect.objectContaining({ topicName: mockAssessment.proposedTopics[1] })
      );
      expect(mockProgressRepository.upsertTopicProgress).toHaveBeenCalledTimes(mockAssessment.proposedTopics.length);
    });

    it('should call updateWordProgress for question steps', async () => {
      mockProgressRepository.getLearningProgress.mockResolvedValue(mockExistingProgress);
      mockProgressRepository.upsertLearningProgress.mockResolvedValue(mockExistingProgress);

      await progressService.updateProgressAfterAssessment(userId, mockAssessment);

      // Step 2: question (correct)
      expect(mockProgressRepository.upsertWordProgress).toHaveBeenCalledWith(
        learningProgressId,
        expect.objectContaining({ word: 'Das Buch' }) // expectedAnswer from step 2
      );
      // Step 3: question (incorrect)
      expect(mockProgressRepository.upsertWordProgress).toHaveBeenCalledWith(
        learningProgressId,
        expect.objectContaining({ word: 'Ich lerne' }) // expectedAnswer from step 3
      );
      // Should be called 2 times (step 2, 3)
      expect(mockProgressRepository.upsertWordProgress).toHaveBeenCalledTimes(2);
    });

    it('should handle errors during update and log them', async () => {
      const testError = new Error('Assessment update failed');
      mockProgressRepository.getLearningProgress.mockResolvedValue(mockExistingProgress); // Assume progress exists
      mockProgressRepository.upsertTopicProgress.mockRejectedValue(testError); // Fail during topic update

      await progressService.updateProgressAfterAssessment(userId, mockAssessment);

      expect(logger.error).toHaveBeenCalledWith(
        'Error updating learning progress after assessment:',
        expect.objectContaining({ userId, assessmentId: mockAssessment.id, error: testError })
      );
      // Ensure it didn't proceed to word update or final progress update
      expect(mockProgressRepository.upsertWordProgress).not.toHaveBeenCalled();
      expect(mockProgressRepository.upsertLearningProgress).not.toHaveBeenCalled();
    });
  });

  // --- Helper Method Tests (Optional - can be tested implicitly or explicitly) ---

  describe('calculateOverallProgress (Implicit Test)', () => {
    it('should update progress fields based on lesson metrics', async () => {
      mockProgressRepository.getLearningProgress.mockResolvedValue(mockExistingProgress);
      mockProgressRepository.upsertLearningProgress.mockResolvedValue(mockExistingProgress);

      await progressService.updateProgressAfterLesson(userId, mockLesson);

      const finalUpdateCall = mockProgressRepository.upsertLearningProgress.mock.calls[0][1];

      // Example checks - refine based on actual calculation logic
      expect(finalUpdateCall.overallScore).toBeCloseTo((50 * 0.3) + (78 * 0.7), 0); // Weighted average
      expect(finalUpdateCall.strengths).toContain('greeting');
      expect(finalUpdateCall.strengths).toContain('basic vocab');
      expect(finalUpdateCall.weaknesses).toContain('past tense');
      expect(finalUpdateCall.weaknesses).toContain('verb conjugation');
      expect(finalUpdateCall.learningTrajectory).toBe(LearningTrajectory.accelerating); // Score increased significantly
    });

    it('should update progress fields based on assessment metrics including audio', async () => {
      mockProgressRepository.getLearningProgress.mockResolvedValue(mockExistingProgress);
      mockProgressRepository.upsertLearningProgress.mockResolvedValue(mockExistingProgress);

      await progressService.updateProgressAfterAssessment(userId, mockAssessment);

      const finalUpdateCall = mockProgressRepository.upsertLearningProgress.mock.calls[0][1];

      // Example checks
      expect(finalUpdateCall.overallScore).toBeCloseTo((50 * 0.3) + (81 * 0.7), 0); // Using audio overallPerformance
      expect(finalUpdateCall.estimatedProficiencyLevel).toBe(ProficiencyLevel.beginner); // A2 maps to beginner, not higher than existing
      expect(finalUpdateCall.learningTrajectory).toBe(LearningTrajectory.steady); // From audio metrics
      expect(finalUpdateCall.strengths).toEqual(expect.arrayContaining(['greeting', 'comprehension', 'basic word order']));
      expect(finalUpdateCall.weaknesses).toEqual(expect.arrayContaining(['past tense', 'articles', 'ch sound']));
    });
  });

  // Add tests for advanceMastery, regressMastery, mapCefrToProficiency if complex logic needs direct testing

});

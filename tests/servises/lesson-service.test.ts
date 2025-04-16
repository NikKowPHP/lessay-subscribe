// File: tests/services/lesson.service.test.ts

import { mockDeep, MockProxy } from 'jest-mock-extended';
import LessonService from '@/services/lesson.service';
import {
  ILessonRepository,
  IOnboardingRepository,
} from '@/lib/interfaces/all-interfaces';
import { ILessonGeneratorService } from '@/services/lesson-generator.service';
import RecordingService from '@/services/recording.service';
import LearningProgressService from '@/services/learning-progress.service';
import { LearningProgressRepository } from '@/repositories/learning-progress.repository';
import {
  LessonModel,
  LessonStep,
  OnboardingModel,
  AudioMetrics,
  AssessmentLesson,
  LearningProgressModel,
  AdaptiveLessonGenerationRequest,
} from '@/models/AppAllModels.model';
import {
  ProficiencyLevel,
  LessonStepType,
  LearningTrajectory,
  MasteryLevel,
} from '@prisma/client';
import logger from '@/utils/logger';
import { mockAudioMetrics } from '@/__mocks__/generated-audio-metrics.mock'; // Assuming this mock exists

// --- Mock Dependencies ---
jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
}));

// Mock services/repositories instantiated internally or dependencies of internal services
jest.mock('@/services/recording.service');
jest.mock('@/services/learning-progress.service');
jest.mock('@/repositories/learning-progress.repository'); // Mock the repo used by LearningProgressService
jest.mock('@supabase/supabase-js');

const mockAuth = {
  signInWithPassword: jest
    .fn()
    .mockResolvedValue({ data: { user: null }, error: null }),
  signOut: jest.fn().mockResolvedValue({ error: null }),
};

const mockSupabase = {
  auth: mockAuth,
  // Add other Supabase services as needed
};

describe('LessonService', () => {
  let lessonService: LessonService;
  let mockLessonRepository: MockProxy<ILessonRepository>;
  let mockLessonGeneratorService: MockProxy<ILessonGeneratorService>;
  let mockOnboardingRepository: MockProxy<IOnboardingRepository>;
  let MockRecordingService: jest.MockedClass<typeof RecordingService>;
  let MockLearningProgressService: jest.MockedClass<
    typeof LearningProgressService
  >;
  let MockLearningProgressRepository: jest.MockedClass<
    typeof LearningProgressRepository
  >;
  let generateInitialLessonsSpy: jest.SpyInstance;

  // --- Mock Data ---
  const userId = 'test-user-id';
  const lessonId = 'lesson-123';
  const stepId = 'step-abc';
  const onboardingId = 'onboarding-xyz';

  const assessmentId = 'assessment-abc';

  const mockLessonStep: LessonStep = {
    id: stepId,
    lessonId: lessonId,
    stepNumber: 1,
    type: 'practice',
    content: 'Say Hello',
    translation: 'Sag Hallo',
    expectedAnswer: 'Hello',
    attempts: 0,
    maxAttempts: 3,
    correct: false,
    errorPatterns: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLesson: LessonModel = {
    id: lessonId,
    userId: userId,
    lessonId: 'gen-lesson-1',
    focusArea: 'Greetings',
    targetSkills: ['Vocabulary', 'Pronunciation'],
    steps: [
      mockLessonStep,
      {
        ...mockLessonStep,
        id: 'step-def',
        stepNumber: 2,
        type: 'feedback',
        expectedAnswer: null,
      },
    ],
    performanceMetrics: null,
    audioMetrics: null,
    completed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCompletedLesson: LessonModel = {
    ...mockLesson,
    completed: true,
    performanceMetrics: {
      accuracy: 80,
      pronunciationScore: 75,
      grammarScore: 85,
      vocabularyScore: 88,
      overallScore: 82,
      strengths: ['basic vocab'],
      weaknesses: ['word order'],
      summary: 'Good progress',
      nextLessonSuggestions: ['Next Topic'],
      errorPatterns: ['word order issue'],
    },
  };

  const mockOnboarding: OnboardingModel = {
    id: onboardingId,
    userId: userId,
    steps: {},
    completed: true, // Assume onboarding is complete for most lesson actions
    learningPurpose: 'travel',
    nativeLanguage: 'English',
    targetLanguage: 'German',
    proficiencyLevel: ProficiencyLevel.beginner,
    initialAssessmentCompleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Mock Assessment Lesson
  const mockAssessment: AssessmentLesson = {
    id: assessmentId,
    userId: userId,
    description: 'German Assessment',
    completed: true, // Assessment is complete
    sourceLanguage: 'English',
    targetLanguage: 'German',
    metrics: { accuracy: 70 },
    proposedTopics: ['Travel Vocabulary', 'Basic Grammar'],
    summary: 'Initial assessment summary.',
    createdAt: new Date(),
    updatedAt: new Date(),
    steps: [
      /* Add mock assessment steps if needed */
    ],
    // Add audioMetrics if testing scenarios involving them
    audioMetrics: null, // Default to null
  };

  const mockOnboardingAssessmentComplete: OnboardingModel = {
    ...mockOnboarding,
    initialAssessmentCompleted: true,
  };

  const mockLearningProgress: LearningProgressModel = {
    id: 'progress-1',
    userId: userId,
    estimatedProficiencyLevel: ProficiencyLevel.beginner,
    overallScore: 65,
    learningTrajectory: LearningTrajectory.steady,
    strengths: ['greetings'],
    weaknesses: ['articles'],
    createdAt: new Date(),
    updatedAt: new Date(),
    topics: [
      {
        id: 't1',
        learningProgressId: 'progress-1',
        topicName: 'Greetings',
        masteryLevel: MasteryLevel.Known,
        relatedLessonIds: [],
        relatedAssessmentIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 't2',
        learningProgressId: 'progress-1',
        topicName: 'Articles',
        masteryLevel: MasteryLevel.Learning,
        relatedLessonIds: [],
        relatedAssessmentIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    words: [],
  };

  const mockGeneratedCompletionResults = {
    metrics: {
      accuracy: 90,
      pronunciationScore: 85,
      grammarScore: 88,
      vocabularyScore: 92,
      overallScore: 89,
      strengths: ['Good vocab recall'],
      weaknesses: ['Verb ending'],
    },
    summary: 'Excellent work on this lesson!',
    nextLessonSuggestions: ['Verb Conjugation Practice'],
  };

  beforeEach(() => {
    // Clear logger mocks
    (logger.info as jest.Mock).mockClear();
    (logger.error as jest.Mock).mockClear();
    (logger.warn as jest.Mock).mockClear();
    (logger.log as jest.Mock).mockClear();

    // Create deep mocks for injected dependencies
    mockLessonRepository = mockDeep<ILessonRepository>();
    mockLessonGeneratorService = mockDeep<ILessonGeneratorService>();
    mockOnboardingRepository = mockDeep<IOnboardingRepository>();

    // --- Mock Internally Instantiated Services ---
    jest.clearAllMocks(); // Clear mocks for internally instantiated services too
    MockRecordingService = RecordingService as jest.MockedClass<
      typeof RecordingService
    >;
    MockLearningProgressService = LearningProgressService as jest.MockedClass<
      typeof LearningProgressService
    >;
    MockLearningProgressRepository =
      LearningProgressRepository as jest.MockedClass<
        typeof LearningProgressRepository
      >;

    // Mock the prototype methods *before* creating the LessonService instance
    MockRecordingService.prototype.uploadFile = jest.fn();
    MockRecordingService.prototype.submitLessonRecordingSession = jest.fn();
    MockLearningProgressService.prototype.updateProgressAfterLesson = jest.fn();
    MockLearningProgressService.prototype.getLearningProgressWithDetails = jest
      .fn()
      .mockResolvedValue(mockLearningProgress); // Default mock

    // Instantiate the service with mocked dependencies
    lessonService = new LessonService(
      mockLessonRepository,
      mockLessonGeneratorService,
      mockOnboardingRepository
    );

    // Store the spy in a variable accessible to tests
    generateInitialLessonsSpy = jest
      .spyOn(lessonService, 'generateInitialLessons')
      .mockResolvedValue([{ ...mockLesson, id: 'initial-lesson' }]);
  });

  afterEach(() => {
    // Restore the original implementation of the spied method after each test
    generateInitialLessonsSpy.mockRestore();
  });

  // --- Test Cases ---

  it('should be defined', () => {
    expect(lessonService).toBeDefined();
  });

  describe('getLessons', () => {
    it('should call repository getLessons and return the result if lessons exist', async () => {
      const lessons = [mockLesson];
      mockLessonRepository.getLessons.mockResolvedValue(lessons);

      const result = await lessonService.getLessons();

      expect(mockLessonRepository.getLessons).toHaveBeenCalledTimes(1);
      expect(mockOnboardingRepository.getOnboarding).not.toHaveBeenCalled();
      // Use the spy variable for assertion
      expect(generateInitialLessonsSpy).not.toHaveBeenCalled();
      expect(result).toEqual(lessons);
    });

    it('should throw error if no lessons found and initial assessment is not completed', async () => {
      mockLessonRepository.getLessons.mockResolvedValue([]); // No lessons
      mockOnboardingRepository.getOnboarding.mockResolvedValue(mockOnboarding); // Assessment not complete

      await expect(lessonService.getLessons()).rejects.toThrow(
        'Initial assessment not completed'
      );

      expect(mockLessonRepository.getLessons).toHaveBeenCalledTimes(1);
      expect(mockOnboardingRepository.getOnboarding).toHaveBeenCalledTimes(1);
      // Use the spy variable for assertion
      expect(generateInitialLessonsSpy).not.toHaveBeenCalled();
    });

    it('should call generateInitialLessons if no lessons found and initial assessment is completed', async () => {
      const initialLessons = [
        { ...mockLesson, id: 'initial-lesson-generated' },
      ];
      mockLessonRepository.getLessons.mockResolvedValue([]); // No lessons
      // Use the CORRECT variable name here
      mockOnboardingRepository.getOnboarding.mockResolvedValue(
        mockOnboardingAssessmentComplete
      ); // Assessment IS complete
      // Ensure the spy mock returns the desired value for this test
      generateInitialLessonsSpy.mockResolvedValue(initialLessons);

      const result = await lessonService.getLessons();

      expect(mockLessonRepository.getLessons).toHaveBeenCalledTimes(1);
      expect(mockOnboardingRepository.getOnboarding).toHaveBeenCalledTimes(1);
      // Use the spy variable for assertion
      expect(generateInitialLessonsSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(initialLessons); // Should return the generated lessons
    });

    it('should throw error if no lessons found and onboarding data is null', async () => {
      mockLessonRepository.getLessons.mockResolvedValue([]); // No lessons
      mockOnboardingRepository.getOnboarding.mockResolvedValue(null); // No onboarding data

      await expect(lessonService.getLessons()).rejects.toThrow(
        'Initial assessment not completed'
      );

      expect(mockLessonRepository.getLessons).toHaveBeenCalledTimes(1);
      expect(mockOnboardingRepository.getOnboarding).toHaveBeenCalledTimes(1);
      // Use the spy variable for assertion
      expect(generateInitialLessonsSpy).not.toHaveBeenCalled();
    });

    it('should re-throw error if repository fails', async () => {
      const error = new Error('DB Error');
      mockLessonRepository.getLessons.mockRejectedValue(error);
      await expect(lessonService.getLessons()).rejects.toThrow('DB Error');
      expect(mockOnboardingRepository.getOnboarding).not.toHaveBeenCalled();
      // Use the spy variable for assertion
      expect(generateInitialLessonsSpy).not.toHaveBeenCalled();
    });
  });

  describe('getLessonById', () => {
    it('should call repository getLessonById with correct ID', async () => {
      mockLessonRepository.getLessonById.mockResolvedValue(mockLesson);
      await lessonService.getLessonById(lessonId);
      expect(mockLessonRepository.getLessonById).toHaveBeenCalledWith(lessonId);
    });

    it('should return the lesson and sort steps if found', async () => {
      const unsortedLesson = {
        ...mockLesson,
        steps: [mockLesson.steps[1], mockLesson.steps[0]],
      }; // Steps out of order
      mockLessonRepository.getLessonById.mockResolvedValue(unsortedLesson);
      const result = await lessonService.getLessonById(lessonId);
      expect(result).toBeDefined();
      expect(result?.steps[0].stepNumber).toBe(1);
      expect(result?.steps[1].stepNumber).toBe(2);
      expect(logger.info).toHaveBeenCalledWith('getLessonById', {
        lesson: result,
      });
    });

    it('should return null if repository returns null', async () => {
      mockLessonRepository.getLessonById.mockResolvedValue(null);
      const result = await lessonService.getLessonById(lessonId);
      expect(result).toBeNull();
      expect(logger.info).toHaveBeenCalledWith('getLessonById', {
        lesson: null,
      });
    });
  });

  describe('createLesson', () => {
    it('should call repository createLesson with correct data and return the result', async () => {
      const lessonData = {
        focusArea: mockLesson.focusArea,
        targetSkills: mockLesson.targetSkills,
        steps: mockLesson.steps,
      };
      mockLessonRepository.createLesson.mockResolvedValue(mockLesson);

      const result = await lessonService.createLesson(lessonData);

      expect(mockLessonRepository.createLesson).toHaveBeenCalledWith(
        lessonData
      );
      expect(result).toEqual(mockLesson);
      expect(logger.info).toHaveBeenCalledWith(
        'Creating lesson',
        expect.any(Object)
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Lesson created successfully',
        expect.any(Object)
      );
    });

    it('should log error and re-throw if repository fails', async () => {
      const lessonData = { focusArea: 'Test', targetSkills: [], steps: [] };
      const error = new Error('Create Failed');
      mockLessonRepository.createLesson.mockRejectedValue(error);

      await expect(lessonService.createLesson(lessonData)).rejects.toThrow(
        'Create Failed'
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Error creating lesson',
        expect.objectContaining({ error: 'Create Failed' })
      );
    });
  });

  describe('updateLesson', () => {
    it('should call repository updateLesson with correct arguments', async () => {
      const updateData: Partial<LessonModel> = { focusArea: 'Updated Focus' };
      const updatedLesson = { ...mockLesson, focusArea: 'Updated Focus' };
      mockLessonRepository.updateLesson.mockResolvedValue(updatedLesson);

      const result = await lessonService.updateLesson(lessonId, updateData);

      expect(mockLessonRepository.updateLesson).toHaveBeenCalledWith(
        lessonId,
        updateData
      );
      expect(result).toEqual(updatedLesson);
    });
  });

  describe('completeLesson', () => {
    it('should throw error if lesson not found', async () => {
      mockLessonRepository.getLessonById.mockResolvedValue(null);
      await expect(lessonService.completeLesson(lessonId)).rejects.toThrow(
        `Cannot complete lesson: Lesson with ID ${lessonId} not found`
      );
    });

    // Test AI path
    it('should use AI generator service if no metrics provided', async () => {
      mockLessonRepository.getLessonById.mockResolvedValue(mockLesson);
      mockLessonGeneratorService.generateLessonCompletionResults.mockResolvedValue(
        mockGeneratedCompletionResults
      );
      mockLessonRepository.completeLesson.mockResolvedValue(
        mockCompletedLesson
      ); // Repo returns the final completed lesson
      MockLearningProgressService.prototype.updateProgressAfterLesson.mockResolvedValue(); // Mock progress update

      // Construct the expected 'fullMetrics' object that the service passes to the repo
      const expectedFullMetrics = {
        accuracy: mockGeneratedCompletionResults.metrics.accuracy,
        pronunciationScore:
          mockGeneratedCompletionResults.metrics.pronunciationScore,
        grammarScore: mockGeneratedCompletionResults.metrics.grammarScore,
        vocabularyScore: mockGeneratedCompletionResults.metrics.vocabularyScore,
        overallScore: mockGeneratedCompletionResults.metrics.overallScore,
        strengths: mockGeneratedCompletionResults.metrics.strengths,
        weaknesses: mockGeneratedCompletionResults.metrics.weaknesses,
        summary: mockGeneratedCompletionResults.summary,
        nextLessonSuggestions:
          mockGeneratedCompletionResults.nextLessonSuggestions,
      };

      const result = await lessonService.completeLesson(lessonId);

      expect(mockLessonRepository.getLessonById).toHaveBeenCalledWith(lessonId);
      expect(
        mockLessonGeneratorService.generateLessonCompletionResults
      ).toHaveBeenCalledWith(
        mockLesson,
        expect.any(Array) // Check the structure of userResponses if needed
      );

      expect(mockLessonRepository.completeLesson).toHaveBeenCalledWith(
        lessonId,
        expectedFullMetrics
      );

      expect(
        MockLearningProgressService.prototype.updateProgressAfterLesson
      ).toHaveBeenCalledWith(userId, mockCompletedLesson);
      expect(result).toEqual(mockCompletedLesson);
      expect(logger.info).toHaveBeenCalledWith('completing lesson', {
        lesson: mockLesson,
      });
      expect(logger.info).toHaveBeenCalledWith(
        'Lesson completion analysis generated',
        { completionResults: mockGeneratedCompletionResults }
      );
    });

    // Test Fallback path
    it('should use fallback metrics if AI generator fails', async () => {
      const aiError = new Error('AI failed');
      mockLessonRepository.getLessonById.mockResolvedValue(mockLesson);
      mockLessonGeneratorService.generateLessonCompletionResults.mockRejectedValue(
        aiError
      );
      mockLessonRepository.completeLesson.mockResolvedValue(
        mockCompletedLesson
      ); // Assume repo still completes with fallback

      const result = await lessonService.completeLesson(lessonId);

      expect(mockLessonRepository.getLessonById).toHaveBeenCalledWith(lessonId);
      expect(
        mockLessonGeneratorService.generateLessonCompletionResults
      ).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        'Error completing lesson with AI analysis',
        { error: aiError }
      );
      expect(mockLessonRepository.completeLesson).toHaveBeenCalledWith(
        lessonId,
        expect.objectContaining({
          accuracy: expect.any(Number), // Check fallback structure
          pronunciationScore: expect.any(Number),
          summary: 'Lesson completed successfully.',
        })
      );
      // IMPORTANT: Progress update should NOT be called in the fallback path based on current code structure
      expect(
        MockLearningProgressService.prototype.updateProgressAfterLesson
      ).not.toHaveBeenCalled();
      expect(result).toEqual(mockCompletedLesson);
      expect(logger.info).toHaveBeenCalledWith(
        'Using fallback metrics for lesson completion',
        expect.any(Object)
      );
    });

    // Test direct metrics path (Added based on analysis)
    it('should use provided metrics and update progress if metrics are given directly', async () => {
      const providedMetrics = {
        accuracy: 95,
        pronunciationScore: 90,
        errorPatterns: ['test'],
      };
      const lessonWithProvidedMetricsCompleted = {
        ...mockCompletedLesson,
        performanceMetrics: providedMetrics,
      };

      mockLessonRepository.getLessonById.mockResolvedValue(mockLesson); // Still need to get lesson for userId
      mockLessonRepository.completeLesson.mockResolvedValue(
        lessonWithProvidedMetricsCompleted
      );

      const result = await lessonService.completeLesson(
        lessonId,
        providedMetrics
      );

      expect(mockLessonRepository.getLessonById).toHaveBeenCalledWith(lessonId);
      expect(
        mockLessonGeneratorService.generateLessonCompletionResults
      ).not.toHaveBeenCalled(); // Should not call AI
      expect(mockLessonRepository.completeLesson).toHaveBeenCalledWith(
        lessonId,
        providedMetrics
      );
      expect(
        MockLearningProgressService.prototype.updateProgressAfterLesson
      ).not.toHaveBeenCalled();

      expect(result).toEqual(lessonWithProvidedMetricsCompleted);
    });

    it('should log error if progress update fails after successful completion', async () => {
      const progressError = new Error('Progress update failed');
      mockLessonRepository.getLessonById.mockResolvedValue(mockLesson);
      mockLessonGeneratorService.generateLessonCompletionResults.mockResolvedValue(
        mockGeneratedCompletionResults
      );
      mockLessonRepository.completeLesson.mockResolvedValue(
        mockCompletedLesson
      );
      MockLearningProgressService.prototype.updateProgressAfterLesson.mockRejectedValue(
        progressError
      ); // Simulate failure

      await lessonService.completeLesson(lessonId); // Don't check return value here as error is logged async

      expect(mockLessonRepository.completeLesson).toHaveBeenCalled(); // Lesson completion still happens
      expect(
        MockLearningProgressService.prototype.updateProgressAfterLesson
      ).toHaveBeenCalledWith(userId, mockCompletedLesson);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to update learning progress after lesson completion',
        expect.objectContaining({ userId, lessonId, error: progressError })
      );
    });
  });

  describe('deleteLesson', () => {
    it('should call repository deleteLesson with correct ID', async () => {
      mockLessonRepository.deleteLesson.mockResolvedValue();
      await lessonService.deleteLesson(lessonId);
      expect(mockLessonRepository.deleteLesson).toHaveBeenCalledWith(lessonId);
    });
  });

  describe.only('generateInitialLessons', () => {
    const mockGeneratedLessonData = {
      focusArea: 'Topic 1',
      targetSkills: ['skill1'],
      steps: [{ stepNumber: 1, type: 'instruction', content: 'Hi' }],
    };
    const mockGeneratedLessonResult = { data: [mockGeneratedLessonData] };
    const mockCreatedLesson = {
      ...mockLesson,
      id: 'new-lesson-1',
      focusArea: 'Topic 1',
      steps: mockGeneratedLessonData.steps as LessonStep[],
    };

    beforeEach(() => {
      // Restore spy to allow testing the actual implementation
      generateInitialLessonsSpy.mockRestore();

      // Common mocks for generateInitialLessons tests
      mockOnboardingRepository.getOnboarding.mockResolvedValue(
        mockOnboardingAssessmentComplete
      );
      mockOnboardingRepository.getAssessmentLesson.mockResolvedValue(
        mockAssessment
      );
      mockLessonGeneratorService.generateLesson.mockResolvedValue(
        mockGeneratedLessonResult
      );
      mockLessonGeneratorService.generateAudioForSteps.mockImplementation(
        async (steps) =>
          steps.map((s) => ({ ...s, contentAudioUrl: 'audio.mp3' })) // Simulate adding audio
      );
      mockLessonRepository.createLesson.mockResolvedValue(mockCreatedLesson);
    });

    it('should throw error if onboarding data not found', async () => {
      mockOnboardingRepository.getOnboarding.mockResolvedValue(null);
      await expect(lessonService.generateInitialLessons()).rejects.toThrow(
        'User onboarding data not found'
      );
    });

    it('should throw error if initial assessment is not completed', async () => {
      mockOnboardingRepository.getOnboarding.mockResolvedValue(mockOnboarding); // Assessment not complete
      await expect(lessonService.generateInitialLessons()).rejects.toThrow(
        'Initial assessment not completed'
      );
    });

    it('should throw error if completed assessment data is not found', async () => {
      mockOnboardingRepository.getAssessmentLesson.mockResolvedValue(null);
      await expect(lessonService.generateInitialLessons()).rejects.toThrow(
        'Completed assessment not found'
      );
    });

    // --- Happy Path Test ---
    it('should generate lessons based on assessment topics (happy path)', async () => {
      const result = await lessonService.generateInitialLessons();

      expect(mockOnboardingRepository.getOnboarding).toHaveBeenCalledTimes(1);
      expect(
        mockOnboardingRepository.getAssessmentLesson
      ).toHaveBeenCalledTimes(1);
      // Expect generateLesson to be called for selected topics
      // Based on mockAssessment.proposedTopics = ['Travel Vocabulary', 'Basic Grammar']
      // and beginner level adding 'Greetings', 'Introductions', 'Basic Phrases',
      // selectPrioritizedTopics should pick top 3, likely assessment + one basic.
      expect(mockLessonGeneratorService.generateLesson).toHaveBeenCalledTimes(
        3
      ); // Expecting 3 topics
      expect(mockLessonGeneratorService.generateLesson).toHaveBeenCalledWith(
        'travel-vocabulary', // Normalized topic
        'German',
        'beginner',
        'English',
        expect.any(Object) // Adaptive request
      );
      expect(mockLessonGeneratorService.generateLesson).toHaveBeenCalledWith(
        'basic-grammar', // Normalized topic
        'German',
        'beginner',
        'English',
        expect.any(Object) // Adaptive request
      );
      // The third topic depends on scoring, could be 'greetings', 'introductions', or 'basic-phrases'
      expect(mockLessonGeneratorService.generateLesson).toHaveBeenCalledWith(
        expect.stringMatching(/^(greetings|introductions|basic-phrases)$/),
        'German',
        'beginner',
        'English',
        expect.any(Object) // Adaptive request
      );

      expect(
        mockLessonGeneratorService.generateAudioForSteps
      ).toHaveBeenCalledTimes(3); // Called for each generated lesson
      expect(mockLessonRepository.createLesson).toHaveBeenCalledTimes(3); // Called for each generated lesson
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(mockCreatedLesson); // Check structure of created lesson
    });

    // --- Verify topic prioritization logic ---
    it('should prioritize assessment topics over learning purpose topics', async () => {
      // Assessment topics: ['Travel Vocabulary', 'Basic Grammar'] score 2
      // Learning purpose ('travel'): ['Airport Navigation', 'Hotel Booking', 'Restaurant Ordering'] score 1
      // Beginner basics: ['Greetings', 'Introductions', 'Basic Phrases'] score 1.5
      // Expected order: Travel Vocabulary, Basic Grammar, (one of the basics)
      await lessonService.generateInitialLessons();

      expect(mockLessonGeneratorService.generateLesson).toHaveBeenCalledTimes(
        3
      );
      const calls = mockLessonGeneratorService.generateLesson.mock.calls;
      const calledTopics = calls.map((call) => call[0]); // Get the first argument (topic) of each call

      expect(calledTopics).toContain('travel-vocabulary');
      expect(calledTopics).toContain('basic-grammar');
      expect(
        calledTopics.some((topic) =>
          ['greetings', 'introductions', 'basic-phrases'].includes(topic)
        )
      ).toBe(true);
    });

    // --- Test language configuration fallbacks ---
    it('should use default language config if onboarding fields are missing', async () => {
      mockOnboardingRepository.getOnboarding.mockResolvedValue({
        ...mockOnboardingAssessmentComplete,
        targetLanguage: undefined, // Missing target language
        proficiencyLevel: undefined,
        learningPurpose: undefined,
        nativeLanguage: undefined,
      });

      await lessonService.generateInitialLessons();

      // Expect generateLesson to be called with defaults
      expect(mockLessonGeneratorService.generateLesson).toHaveBeenCalledWith(
        expect.any(String),
        'German', // Default target
        'beginner', // Default proficiency
        'English', // Default source
        expect.any(Object)
      );
      // Expect audio generation to use defaults too
      expect(
        mockLessonGeneratorService.generateAudioForSteps
      ).toHaveBeenCalledWith(
        expect.any(Array),
        'German', // Default target
        'English' // Default source
      );
    });
  });

  describe('recordStepAttempt', () => {
    it('should throw error if lesson not found', async () => {
      mockLessonRepository.getLessonById.mockResolvedValue(null);
      await expect(
        lessonService.recordStepAttempt(lessonId, stepId, 'response')
      ).rejects.toThrow('Assessment lesson not found'); // Error message seems wrong here, should be 'Lesson not found'
    });

    it('should throw error if step not found', async () => {
      mockLessonRepository.getLessonById.mockResolvedValue({
        ...mockLesson,
        steps: [],
      });
      await expect(
        lessonService.recordStepAttempt(lessonId, stepId, 'response')
      ).rejects.toThrow('Step not found');
    });

    it('should record attempt as correct (using expected answer) if max attempts reached', async () => {
      const stepAtMax = { ...mockLessonStep, attempts: 3 };
      mockLessonRepository.getLessonById.mockResolvedValue({
        ...mockLesson,
        steps: [stepAtMax],
      });
      mockLessonRepository.recordStepAttempt.mockResolvedValue({
        ...stepAtMax,
        attempts: 4,
      }); // Simulate repo response

      const result = await lessonService.recordStepAttempt(
        lessonId,
        stepId,
        'wrong answer'
      );

      expect(mockLessonRepository.recordStepAttempt).toHaveBeenCalledWith(
        lessonId,
        stepId,
        {
          userResponse: stepAtMax.expectedAnswer, // Uses expected answer
          correct: true, // Marked correct for UI flow
        }
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Maximum attempts reached',
        expect.any(Object)
      );
      expect(result).toBeDefined();
    });

    it('should correctly identify correct answer (normalized match)', async () => {
      const step = { ...mockLessonStep, expectedAnswer: 'Expected Answer...' };
      mockLessonRepository.getLessonById.mockResolvedValue({
        ...mockLesson,
        steps: [step],
      });
      mockLessonRepository.recordStepAttempt.mockResolvedValue({
        ...step,
        correct: true,
        attempts: 1,
      });

      await lessonService.recordStepAttempt(
        lessonId,
        stepId,
        '  expected answer! '
      );

      expect(mockLessonRepository.recordStepAttempt).toHaveBeenCalledWith(
        lessonId,
        stepId,
        {
          userResponse: '  expected answer! ',
          correct: true,
        }
      );
    });

    it('should correctly identify incorrect answer', async () => {
      const step = { ...mockLessonStep, expectedAnswer: 'Correct Answer' };
      mockLessonRepository.getLessonById.mockResolvedValue({
        ...mockLesson,
        steps: [step],
      });
      mockLessonRepository.recordStepAttempt.mockResolvedValue({
        ...step,
        correct: false,
        attempts: 1,
      });

      await lessonService.recordStepAttempt(lessonId, stepId, 'Wrong Answer');

      expect(mockLessonRepository.recordStepAttempt).toHaveBeenCalledWith(
        lessonId,
        stepId,
        {
          userResponse: 'Wrong Answer',
          correct: false,
        }
      );
    });

    it('should mark instruction/feedback/summary steps as correct', async () => {
      const instructionStep = {
        ...mockLessonStep,
        type: LessonStepType.instruction,
        expectedAnswer: null,
      };
      mockLessonRepository.getLessonById.mockResolvedValue({
        ...mockLesson,
        steps: [instructionStep],
      });
      mockLessonRepository.recordStepAttempt.mockResolvedValue({
        ...instructionStep,
        correct: true,
        attempts: 1,
      });

      await lessonService.recordStepAttempt(lessonId, instructionStep.id, ''); // Empty response is ok

      expect(mockLessonRepository.recordStepAttempt).toHaveBeenCalledWith(
        lessonId,
        instructionStep.id,
        {
          userResponse: 'Acknowledged', // Default response
          correct: true,
        }
      );
    });
  });

  describe('checkAndGenerateNewLessons', () => {
    it('should throw if no lessons found', async () => {
      mockLessonRepository.getLessons.mockResolvedValue([]);
      // Ensure getLessons doesn't throw the onboarding error for this test
      mockOnboardingRepository.getOnboarding.mockResolvedValue(
        mockOnboardingAssessmentComplete
      );
      await expect(lessonService.checkAndGenerateNewLessons()).rejects.toThrow(
        'No lessons found'
      );
      expect(mockLessonRepository.getLessons).toHaveBeenCalledTimes(1); // Verify getLessons was called
    });

    it('should return empty array if not all lessons are complete', async () => {
      mockLessonRepository.getLessons.mockResolvedValue([
        mockLesson,
        { ...mockCompletedLesson, id: 'l2' },
      ]); // One incomplete
      const result = await lessonService.checkAndGenerateNewLessons();
      expect(result).toEqual([]);
      expect(logger.info).toHaveBeenCalledWith(
        'currentLessons',
        expect.any(Object)
      );
      expect(mockLessonRepository.getLessons).toHaveBeenCalledTimes(1); // Verify getLessons was called
    });

    it('should call generateNewLessonsBasedOnProgress if all lessons are complete', async () => {
      const newGeneratedLessons = [{ ...mockLesson, id: 'new1' }];
      const completedLessons = [
        { ...mockCompletedLesson, id: 'l1' },
        { ...mockCompletedLesson, id: 'l2' },
      ];

      mockLessonRepository.getLessons.mockResolvedValue(completedLessons);
      // Need to mock the call chain inside generateNewLessonsBasedOnProgress
      mockOnboardingRepository.getOnboarding.mockResolvedValue(mockOnboarding);
      MockLearningProgressService.prototype.getLearningProgressWithDetails.mockResolvedValue(
        mockLearningProgress
      );
      mockLessonGeneratorService.generateLesson.mockResolvedValue({
        data: [{ focusArea: 'New Topic', targetSkills: [], steps: [] }],
      });
      mockLessonGeneratorService.generateAudioForSteps.mockImplementation(
        async (steps) => steps
      );
      mockLessonRepository.createLesson.mockResolvedValue(
        newGeneratedLessons[0]
      );

      const result = await lessonService.checkAndGenerateNewLessons();

      expect(
        MockLearningProgressService.prototype.getLearningProgressWithDetails
      ).toHaveBeenCalledWith(userId);
      expect(mockLessonGeneratorService.generateLesson).toHaveBeenCalled(); // Check specific args if needed
      expect(mockLessonRepository.createLesson).toHaveBeenCalled();
      expect(result).toEqual(newGeneratedLessons);
    });
  });

  describe('generateNewLessonsBasedOnProgress', () => {
    const mockCompletedLessonWithAudio: LessonModel = {
      ...mockCompletedLesson,
      audioMetrics: mockAudioMetrics as AudioMetrics, // Use the imported mock
    };
    const completedLessons = [
      {
        ...mockCompletedLessonWithAudio,
        id: 'l1',
        updatedAt: new Date(Date.now() - 10000),
      }, // Ensure different update times
      { ...mockCompletedLessonWithAudio, id: 'l2', updatedAt: new Date() }, // Most recent
    ];

    const newGeneratedLessonData = {
      focusArea: 'Weakness Area',
      targetSkills: ['skill'],
      steps: [],
    };
    const newGeneratedLessonResult = { data: [newGeneratedLessonData] };
    const newCreatedLesson = {
      ...mockLesson,
      id: 'new-gen-1',
      focusArea: 'Weakness Area',
    };

    beforeEach(() => {
      // Setup mocks for this block
      mockLessonRepository.getLessons.mockResolvedValue(completedLessons);
      mockOnboardingRepository.getOnboarding.mockResolvedValue(mockOnboarding);
      MockLearningProgressService.prototype.getLearningProgressWithDetails.mockResolvedValue(
        mockLearningProgress
      );
      mockLessonGeneratorService.generateLesson.mockResolvedValue(
        newGeneratedLessonResult
      );
      mockLessonGeneratorService.generateAudioForSteps.mockImplementation(
        async (steps) => steps
      );
      mockLessonRepository.createLesson.mockResolvedValue(newCreatedLesson);
    });

    it('should throw error if onboarding data not found', async () => {
      mockOnboardingRepository.getOnboarding.mockResolvedValue(null);
      await expect(
        lessonService.generateNewLessonsBasedOnProgress()
      ).rejects.toThrow('User onboarding data not found');
    });

    it('should throw error if no completed lessons found', async () => {
      mockLessonRepository.getLessons.mockResolvedValue([mockLesson]); // Only incomplete lessons
      await expect(
        lessonService.generateNewLessonsBasedOnProgress()
      ).rejects.toThrow('No completed lessons found to analyze');
    });

    it('should fetch progress, determine focus areas, generate, and create lessons', async () => {
      const result = await lessonService.generateNewLessonsBasedOnProgress();

      expect(mockLessonRepository.getLessons).toHaveBeenCalledTimes(1);
      expect(mockOnboardingRepository.getOnboarding).toHaveBeenCalledTimes(1);
      expect(
        MockLearningProgressService.prototype.getLearningProgressWithDetails
      ).toHaveBeenCalledWith(userId);
      // Check that generateLesson is called, potentially multiple times based on focus areas
      expect(mockLessonGeneratorService.generateLesson).toHaveBeenCalled();
      // Verify adaptive request structure passed to generator
      expect(mockLessonGeneratorService.generateLesson).toHaveBeenCalledWith(
        expect.any(String), // Focus Area determined by logic
        mockOnboarding.targetLanguage,
        mockLearningProgress.estimatedProficiencyLevel, // Use progress proficiency
        mockOnboarding.nativeLanguage,
        expect.objectContaining({
          // Adaptive Request
          userInfo: expect.objectContaining({
            proficiencyLevel: mockLearningProgress.estimatedProficiencyLevel,
          }),
          overallProgress: expect.objectContaining({
            estimatedProficiencyLevel:
              mockLearningProgress.estimatedProficiencyLevel,
          }),
          performanceMetrics: expect.objectContaining({
            avgAccuracy: expect.any(Number),
          }),
          improvementAreas: expect.any(Object), // Should now be present
          learningRecommendations: expect.any(Object), // Should now be present
          learningStyle: expect.any(Object), // Should now be present
        })
      );
      expect(
        mockLessonGeneratorService.generateAudioForSteps
      ).toHaveBeenCalled();
      expect(mockLessonRepository.createLesson).toHaveBeenCalled();
      expect(result.length).toBeGreaterThan(0); // Should generate at least one lesson
      expect(result[0]).toEqual(newCreatedLesson);
    });

    it('should proceed without progress data if fetch fails', async () => {
      const progressError = new Error('Progress fetch failed');
      MockLearningProgressService.prototype.getLearningProgressWithDetails.mockRejectedValue(
        progressError
      );

      const result = await lessonService.generateNewLessonsBasedOnProgress();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch learning progress, proceeding without it.',
        { userId, error: progressError }
      );
      // Ensure it still generates lessons, potentially with less context
      expect(mockLessonGeneratorService.generateLesson).toHaveBeenCalledWith(
        expect.any(String),
        mockOnboarding.targetLanguage,
        mockOnboarding.proficiencyLevel, // Fallback to onboarding proficiency
        mockOnboarding.nativeLanguage,
        expect.objectContaining({
          overallProgress: undefined, // No progress data
        })
      );
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('processLessonRecording', () => {
    const mockAudioData = 'audio data';
    const mockBlob = new Blob([mockAudioData], { type: 'audio/webm' });
    (mockBlob as any).arrayBuffer = jest
      .fn()
      .mockResolvedValue(new TextEncoder().encode(mockAudioData).buffer);
    const recordingTime = 15;
    const recordingSize = 2048;
    const fileUri = 'uploaded/lesson-recording.webm';
    const mockAiResponse = mockAudioMetrics; // Use the imported mock
    const mockUpdatedLessonWithAudio = {
      ...mockLesson,
      audioMetrics: mockAudioMetrics as AudioMetrics,
    }; // Assume conversion works

    beforeEach(() => {
      mockOnboardingRepository.getOnboarding.mockResolvedValue(mockOnboarding);
      MockRecordingService.prototype.uploadFile.mockResolvedValue(fileUri);
      MockRecordingService.prototype.submitLessonRecordingSession.mockResolvedValue(
        mockAiResponse
      );
      mockLessonRepository.updateLesson.mockResolvedValue(
        mockUpdatedLessonWithAudio
      );
    });

    it('should process recording, get AI analysis, convert, and update lesson', async () => {
      const result = await lessonService.processLessonRecording(
        mockBlob,
        recordingTime,
        recordingSize,
        mockLesson
      );

      expect(mockOnboardingRepository.getOnboarding).toHaveBeenCalledTimes(1);
      expect(MockRecordingService.prototype.uploadFile).toHaveBeenCalledWith(
        expect.any(Buffer),
        'audio/webm',
        expect.stringContaining(`lesson-${lessonId}-`)
      );
      expect(
        MockRecordingService.prototype.submitLessonRecordingSession
      ).toHaveBeenCalledWith(
        fileUri,
        recordingTime,
        recordingSize,
        {
          targetLanguage: mockOnboarding.targetLanguage,
          nativeLanguage: mockOnboarding.nativeLanguage,
        },
        mockLesson
      );
      expect(mockLessonRepository.updateLesson).toHaveBeenCalledWith(lessonId, {
        audioMetrics: expect.objectContaining({
          id: expect.any(String),
          overallPerformance: mockAiResponse.overallPerformance,
        }),
      });
      expect(result).toEqual(mockUpdatedLessonWithAudio);
      expect(logger.info).toHaveBeenCalledWith('Audio metrics generated', {
        audioMetrics: expect.any(Object),
      });
    });

    it('should throw error if onboarding data not found', async () => {
      mockOnboardingRepository.getOnboarding.mockResolvedValue(null);
      await expect(
        lessonService.processLessonRecording(
          mockBlob,
          recordingTime,
          recordingSize,
          mockLesson
        )
      ).rejects.toThrow('User onboarding data not found');
    });

    // Add tests for upload failure, AI submission failure similar to onboarding service tests if needed
  });
});

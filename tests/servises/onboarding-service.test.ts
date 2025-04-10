
import { mockDeep, MockProxy, mockReset } from 'jest-mock-extended';
import OnboardingService from '@/services/onboarding.service';
import LessonService from '@/services/lesson.service';
import { IAssessmentGeneratorService } from '@/services/assessment-generator.service';
import RecordingService from '@/services/recording.service';
import LearningProgressService from '@/services/learning-progress.service';
import { IOnboardingRepository } from '@/lib/interfaces/all-interfaces';
import { AssessmentLesson, AssessmentStep, OnboardingModel, AudioMetrics } from '@/models/AppAllModels.model';
import { ProficiencyLevel, AssessmentStepType } from '@prisma/client';
import logger from '@/utils/logger';
import { assessmentMockData2 } from '@/__mocks__/assessment-data.mock'; // Import mock data

// --- Mock Dependencies ---
jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(), // Add log if used
}));

// Mock services instantiated internally
jest.mock('@/services/recording.service');
jest.mock('@/services/learning-progress.service');
jest.mock('@supabase/supabase-js');
// Mock repository used by LearningProgressService if needed, assuming it's implicitly handled by mocking LearningProgressService itself
// jest.mock('@/repositories/learning-progress.repository');
//
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

describe('OnboardingService', () => {
  let onboardingService: OnboardingService;
  let mockOnboardingRepository: MockProxy<IOnboardingRepository>;
  let mockLessonService: MockProxy<LessonService>;
  let mockAssessmentGeneratorService: MockProxy<IAssessmentGeneratorService>;
  let MockRecordingService: jest.MockedClass<typeof RecordingService>;
  let MockLearningProgressService: jest.MockedClass<typeof LearningProgressService>;

  // --- Mock Data ---
  const userId = 'test-user-id';
  const onboardingId = 'onboarding-1';
  const assessmentLessonId = 'assessment-lesson-1';
  const stepId = 'step-123';

  const mockOnboarding: OnboardingModel = {
    id: onboardingId,
    userId: userId,
    steps: {},
    completed: false,
    learningPurpose: 'travel',
    nativeLanguage: 'English',
    targetLanguage: 'German',
    proficiencyLevel: ProficiencyLevel.beginner,
    initialAssessmentCompleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAssessmentLesson: AssessmentLesson = {
    // Use imported mock data structure, ensure it matches AssessmentLesson type
    ...(assessmentMockData2[0] as unknown as AssessmentLesson), // Cast carefully
    id: assessmentLessonId,
    userId: userId,
    completed: false,
    // Override specific fields if necessary
  };

  const mockCompleteAssessmentLesson: AssessmentLesson = {
    ...mockAssessmentLesson,
    completed: true,
    metrics: { accuracy: 85, overallScore: 80, strengths: ['vocab'], weaknesses: ['grammar'] },
    summary: 'Good job!',
    proposedTopics: ['Travel', 'Food'],
    audioMetrics: null, // Add mock audio metrics if testing processAssessmentLessonRecording
  };


  const mockAssessmentStep: AssessmentStep = {
    id: stepId,
    assessmentId: assessmentLessonId,
    stepNumber: 1,
    type: 'question',
    content: 'Question content',
    maxAttempts: 3,
    attempts: 0,
    correct: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    expectedAnswer: 'Expected Answer',
  };

  beforeEach(() => {
    (logger.info as jest.Mock).mockClear();
    (logger.error as jest.Mock).mockClear();
    (logger.warn as jest.Mock).mockClear();
    (logger.log as jest.Mock).mockClear();

    // Create deep mocks for injected dependencies
    mockOnboardingRepository = mockDeep<IOnboardingRepository>();
    mockLessonService = mockDeep<LessonService>();
    mockAssessmentGeneratorService = mockDeep<IAssessmentGeneratorService>();

    // --- Mock Internally Instantiated Services ---
    // Clear mocks and setup instances for RecordingService
    jest.clearAllMocks(); // Clear mocks for internally instantiated services too
    MockRecordingService = RecordingService as jest.MockedClass<typeof RecordingService>;
    MockLearningProgressService = LearningProgressService as jest.MockedClass<typeof LearningProgressService>;

    // Mock the methods of the instances that will be created
    MockRecordingService.prototype.uploadFile = jest.fn();
    MockRecordingService.prototype.submitLessonRecordingSession = jest.fn();
    MockLearningProgressService.prototype.updateProgressAfterAssessment = jest.fn();
    // Add mocks for other LearningProgressService methods if called by OnboardingService

    // Instantiate the service with mocked dependencies
    onboardingService = new OnboardingService(
      mockOnboardingRepository,
      mockLessonService,
      mockAssessmentGeneratorService
    );
  });

  // --- Test Cases ---

  it('should be defined', () => {
    expect(onboardingService).toBeDefined();
  });

  describe('getOnboarding', () => {
    it('should call repository getOnboarding and return the result', async () => {
      mockOnboardingRepository.getOnboarding.mockResolvedValue(mockOnboarding);
      const result = await onboardingService.getOnboarding();
      expect(mockOnboardingRepository.getOnboarding).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockOnboarding);
      expect(logger.info).toHaveBeenCalledWith('Onboarding:', mockOnboarding);
    });

    it('should return null if repository returns null', async () => {
      mockOnboardingRepository.getOnboarding.mockResolvedValue(null);
      const result = await onboardingService.getOnboarding();
      expect(result).toBeNull();
      expect(logger.info).toHaveBeenCalledWith('Onboarding:', null);
    });
  });

  describe('createOnboarding', () => {
    it('should call repository createOnboarding and return the result', async () => {
      mockOnboardingRepository.createOnboarding.mockResolvedValue(mockOnboarding);
      const result = await onboardingService.createOnboarding();
      expect(mockOnboardingRepository.createOnboarding).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockOnboarding);
    });
  });

  describe('updateOnboarding', () => {
    it('should call repository updateOnboarding with correct arguments', async () => {
      const step = 'language_select';
      const formData = { nativeLanguage: 'French' };
      const updatedOnboarding = { ...mockOnboarding, nativeLanguage: 'French' };
      mockOnboardingRepository.updateOnboarding.mockResolvedValue(updatedOnboarding);

      const result = await onboardingService.updateOnboarding(step, formData);

      expect(mockOnboardingRepository.updateOnboarding).toHaveBeenCalledWith(step, formData);
      expect(result).toEqual(updatedOnboarding);
    });
  });

  describe('markOnboardingAsCompleteAndGenerateLessons', () => {
    it('should complete onboarding and trigger initial lesson generation', async () => {
      const completedOnboarding = { ...mockOnboarding, completed: true };
      mockOnboardingRepository.completeOnboarding.mockResolvedValue(completedOnboarding);
      mockLessonService.generateInitialLessons.mockResolvedValue([]); // Assuming returns array of lessons

      const result = await onboardingService.markOnboardingAsCompleteAndGenerateLessons();

      expect(mockOnboardingRepository.completeOnboarding).toHaveBeenCalledTimes(1);
      expect(mockLessonService.generateInitialLessons).toHaveBeenCalledTimes(1);
      expect(result).toEqual(completedOnboarding);
    });
  });

  describe('deleteOnboarding', () => {
    it('should call repository deleteOnboarding', async () => {
      mockOnboardingRepository.deleteOnboarding.mockResolvedValue();
      await onboardingService.deleteOnboarding();
      expect(mockOnboardingRepository.deleteOnboarding).toHaveBeenCalledTimes(1);
    });
  });

  describe('getStatus', () => {
    it('should call repository getStatus and return the result', async () => {
      mockOnboardingRepository.getStatus.mockResolvedValue(true);
      const result = await onboardingService.getStatus();
      expect(mockOnboardingRepository.getStatus).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });
  });

  describe('getAssessmentLesson', () => {
    it('should return existing assessment lesson if found', async () => {
      mockOnboardingRepository.getAssessmentLesson.mockResolvedValue(mockAssessmentLesson);
      const result = await onboardingService.getAssessmentLesson(userId);
      expect(mockOnboardingRepository.getAssessmentLesson).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockAssessmentLesson);
      expect(mockAssessmentGeneratorService.generateAssessmentSteps).not.toHaveBeenCalled();
      expect(mockOnboardingRepository.createAssessmentLesson).not.toHaveBeenCalled();
    });

    it('should generate and create a new assessment if none exists', async () => {
      const generatedSteps = [{ stepNumber: 1, type: AssessmentStepType.instruction, content: '...', maxAttempts: 1 }];
      const stepsWithAudio = [{ ...generatedSteps[0], contentAudioUrl: 'audio.mp3' }];

      mockOnboardingRepository.getAssessmentLesson.mockResolvedValue(null);
      mockOnboardingRepository.getOnboarding.mockResolvedValue(mockOnboarding);
      mockAssessmentGeneratorService.generateAssessmentSteps.mockResolvedValue(generatedSteps as any);
      mockAssessmentGeneratorService.generateAudioForSteps.mockResolvedValue(stepsWithAudio as any);
      mockOnboardingRepository.createAssessmentLesson.mockResolvedValue(mockAssessmentLesson); // Return the created lesson

      const result = await onboardingService.getAssessmentLesson(userId);

      expect(mockOnboardingRepository.getAssessmentLesson).toHaveBeenCalledWith(userId);
      expect(mockOnboardingRepository.getOnboarding).toHaveBeenCalledTimes(1);
      expect(mockAssessmentGeneratorService.generateAssessmentSteps).toHaveBeenCalledWith(
        mockOnboarding.targetLanguage,
        mockOnboarding.nativeLanguage,
        mockOnboarding.proficiencyLevel
      );
      expect(mockAssessmentGeneratorService.generateAudioForSteps).toHaveBeenCalledWith(
        generatedSteps,
        mockOnboarding.targetLanguage,
        mockOnboarding.nativeLanguage
      );
      expect(mockOnboardingRepository.createAssessmentLesson).toHaveBeenCalledWith(userId, expect.objectContaining({
        userId: userId,
        sourceLanguage: mockOnboarding.nativeLanguage,
        targetLanguage: mockOnboarding.targetLanguage,
        steps: stepsWithAudio,
      }));
      expect(result).toEqual(mockAssessmentLesson);
    });

    it('should throw error if onboarding data is missing for generation', async () => {
      mockOnboardingRepository.getAssessmentLesson.mockResolvedValue(null);
      mockOnboardingRepository.getOnboarding.mockResolvedValue({ ...mockOnboarding, targetLanguage: null }); // Missing target language

      await expect(onboardingService.getAssessmentLesson(userId)).rejects.toThrow('Missing required parameters');
    });
  });

  describe('completeAssessmentLesson', () => {
    it('should get lesson, generate results, complete lesson, update progress, and complete onboarding', async () => {
      const assessmentResult = {
        metrics: { accuracy: 85, overallScore: 80, strengths: ['vocab'], weaknesses: ['grammar'] },
        summary: 'Good job!',
        proposedTopics: ['Travel', 'Food'],
      };
      const completedOnboarding = { ...mockOnboarding, completed: true, initialAssessmentCompleted: true };


      mockOnboardingRepository.getAssessmentLessonById.mockResolvedValue(mockAssessmentLesson);
      mockAssessmentGeneratorService.generateAssessmentResult.mockResolvedValue(assessmentResult);
      mockOnboardingRepository.completeAssessmentLesson.mockResolvedValue(mockCompleteAssessmentLesson);
      // Mock the LearningProgressService call (assuming it resolves successfully)
      MockLearningProgressService.prototype.updateProgressAfterAssessment.mockResolvedValue();
      mockOnboardingRepository.completeOnboarding.mockResolvedValue(completedOnboarding);


      const result = await onboardingService.completeAssessmentLesson(assessmentLessonId, 'some response'); // userResponse seems unused here?

      expect(mockOnboardingRepository.getAssessmentLessonById).toHaveBeenCalledWith(assessmentLessonId);
      expect(mockAssessmentGeneratorService.generateAssessmentResult).toHaveBeenCalledWith(mockAssessmentLesson);
      expect(mockOnboardingRepository.completeAssessmentLesson).toHaveBeenCalledWith(
        expect.objectContaining({ id: assessmentLessonId }), // Pass the updated lesson object
        assessmentResult
      );
      expect(MockLearningProgressService.prototype.updateProgressAfterAssessment).toHaveBeenCalledWith(userId, mockCompleteAssessmentLesson);
      expect(mockOnboardingRepository.completeOnboarding).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockCompleteAssessmentLesson);
    });

    it('should log error if updating learning progress fails', async () => {
      const assessmentResult = {
        metrics: { accuracy: 85, overallScore: 80, strengths: ['vocab'], weaknesses: ['grammar'] },
        summary: 'Good job!',
        proposedTopics: ['Travel', 'Food'],
      };
      const progressError = new Error('Failed to update progress');

      mockOnboardingRepository.getAssessmentLessonById.mockResolvedValue(mockAssessmentLesson);
      mockAssessmentGeneratorService.generateAssessmentResult.mockResolvedValue(assessmentResult);
      mockOnboardingRepository.completeAssessmentLesson.mockResolvedValue(mockCompleteAssessmentLesson);
      MockLearningProgressService.prototype.updateProgressAfterAssessment.mockRejectedValue(progressError); // Simulate failure
      mockOnboardingRepository.completeOnboarding.mockResolvedValue({ ...mockOnboarding, completed: true });

      await onboardingService.completeAssessmentLesson(assessmentLessonId, 'some response');

      expect(MockLearningProgressService.prototype.updateProgressAfterAssessment).toHaveBeenCalledWith(userId, mockCompleteAssessmentLesson);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to update learning progress after assessment completion',
        expect.objectContaining({ userId, assessmentId: assessmentLessonId, error: progressError })
      );
      // Ensure onboarding completion still happens
      expect(mockOnboardingRepository.completeOnboarding).toHaveBeenCalledTimes(1);
    });

    it('should throw error if assessment lesson not found', async () => {
      mockOnboardingRepository.getAssessmentLessonById.mockResolvedValue(null);
      await expect(onboardingService.completeAssessmentLesson(assessmentLessonId, 'response')).rejects.toThrow('Assessment lesson not found');
    });
  });

  describe('recordStepAttempt', () => {
    it('should throw error if lesson not found', async () => {
      mockOnboardingRepository.getAssessmentLessonById.mockResolvedValue(null);
      await expect(onboardingService.recordStepAttempt(assessmentLessonId, stepId, 'response')).rejects.toThrow('Assessment lesson not found');
    });

    it('should throw error if step not found in lesson', async () => {
      mockOnboardingRepository.getAssessmentLessonById.mockResolvedValue({ ...mockAssessmentLesson, steps: [] }); // Lesson without the step
      await expect(onboardingService.recordStepAttempt(assessmentLessonId, stepId, 'response')).rejects.toThrow('Step not found');
    });

    it('should record attempt as correct (but use expected answer) if max attempts reached', async () => {
      const stepAtMaxAttempts = { ...mockAssessmentStep, attempts: 3 }; // attempts >= maxAttempts
      mockOnboardingRepository.getAssessmentLessonById.mockResolvedValue({ ...mockAssessmentLesson, steps: [stepAtMaxAttempts] });
      mockOnboardingRepository.recordStepAttempt.mockResolvedValue({ ...stepAtMaxAttempts, attempts: 4 }); // Simulate repo response

      const result = await onboardingService.recordStepAttempt(assessmentLessonId, stepId, 'wrong answer');

      expect(mockOnboardingRepository.recordStepAttempt).toHaveBeenCalledWith(assessmentLessonId, stepId, {
        userResponse: mockAssessmentStep.expectedAnswer, // Should use expected answer
        correct: true, // Mark as correct to proceed UI
      });
      expect(logger.info).toHaveBeenCalledWith('Maximum attempts reached', expect.anything());
      expect(result).toBeDefined();
    });

    it('should correctly identify a correct answer for a question step (exact match)', async () => {
      const step = { ...mockAssessmentStep, expectedAnswer: 'Exact Answer' };
      mockOnboardingRepository.getAssessmentLessonById.mockResolvedValue({ ...mockAssessmentLesson, steps: [step] });
      mockOnboardingRepository.recordStepAttempt.mockResolvedValue({ ...step, correct: true, attempts: 1 });

      await onboardingService.recordStepAttempt(assessmentLessonId, stepId, 'Exact Answer');

      expect(mockOnboardingRepository.recordStepAttempt).toHaveBeenCalledWith(assessmentLessonId, stepId, {
        userResponse: 'Exact Answer',
        correct: true,
      });
    });

    it('should correctly identify a correct answer for a question step (normalized match)', async () => {
      const step = { ...mockAssessmentStep, expectedAnswer: 'Expected Answer...' };
      mockOnboardingRepository.getAssessmentLessonById.mockResolvedValue({ ...mockAssessmentLesson, steps: [step] });
      mockOnboardingRepository.recordStepAttempt.mockResolvedValue({ ...step, correct: true, attempts: 1 });

      await onboardingService.recordStepAttempt(assessmentLessonId, stepId, '  expected answer! '); // With extra space, punctuation, case difference

      expect(mockOnboardingRepository.recordStepAttempt).toHaveBeenCalledWith(assessmentLessonId, stepId, {
        userResponse: '  expected answer! ',
        correct: true, // Normalization should handle this
      });
    });

    it('should correctly identify an incorrect answer for a question step', async () => {
      const step = { ...mockAssessmentStep, expectedAnswer: 'Correct Answer' };
      mockOnboardingRepository.getAssessmentLessonById.mockResolvedValue({ ...mockAssessmentLesson, steps: [step] });
      mockOnboardingRepository.recordStepAttempt.mockResolvedValue({ ...step, correct: false, attempts: 1 });

      await onboardingService.recordStepAttempt(assessmentLessonId, stepId, 'Wrong Answer');

      expect(mockOnboardingRepository.recordStepAttempt).toHaveBeenCalledWith(assessmentLessonId, stepId, {
        userResponse: 'Wrong Answer',
        correct: false,
      });
    });

    it('should mark instruction/feedback/summary steps as correct', async () => {
      const instructionStep = { ...mockAssessmentStep, type: AssessmentStepType.instruction, expectedAnswer: null };
      mockOnboardingRepository.getAssessmentLessonById.mockResolvedValue({ ...mockAssessmentLesson, steps: [instructionStep] });
      mockOnboardingRepository.recordStepAttempt.mockResolvedValue({ ...instructionStep, correct: true, attempts: 1 });

      await onboardingService.recordStepAttempt(assessmentLessonId, stepId, 'Acknowledged'); // Or empty string

      expect(mockOnboardingRepository.recordStepAttempt).toHaveBeenCalledWith(assessmentLessonId, stepId, {
        userResponse: 'Acknowledged',
        correct: true,
      });
    });

    it('should handle errors during recording and log them', async () => {
      const dbError = new Error('DB write failed');
      const step = { ...mockAssessmentStep, expectedAnswer: 'Answer' };
      mockOnboardingRepository.getAssessmentLessonById.mockResolvedValue({ ...mockAssessmentLesson, steps: [step] });
      mockOnboardingRepository.recordStepAttempt.mockRejectedValue(dbError);

      await expect(onboardingService.recordStepAttempt(assessmentLessonId, stepId, 'Answer')).rejects.toThrow('DB write failed');
      expect(logger.error).toHaveBeenCalledWith('Error recording step attempt:', dbError);
    });

  });

  describe('updateOnboardingAssessmentLesson', () => {
    it('should call repository updateOnboardingAssessmentLesson with correct arguments', async () => {
      const updateData: Partial<AssessmentLesson> = { summary: 'Updated summary' };
      const updatedLesson = { ...mockAssessmentLesson, summary: 'Updated summary' };
      mockOnboardingRepository.updateOnboardingAssessmentLesson.mockResolvedValue(updatedLesson);

      const result = await onboardingService.updateOnboardingAssessmentLesson(assessmentLessonId, updateData);

      expect(mockOnboardingRepository.updateOnboardingAssessmentLesson).toHaveBeenCalledWith(assessmentLessonId, updateData);
      expect(result).toEqual(updatedLesson);
    });

    it('should throw error if lessonId is missing', async () => {
      await expect(onboardingService.updateOnboardingAssessmentLesson('', { summary: 'test' })).rejects.toThrow('Lesson ID is required');
      expect(mockOnboardingRepository.updateOnboardingAssessmentLesson).not.toHaveBeenCalled();
    });
  });

  describe('processAssessmentLessonRecording', () => {


    const mockAudioData = 'audio data';
    const mockBlob = new Blob([mockAudioData], { type: 'audio/webm' });

    (mockBlob as any).arrayBuffer = jest.fn().mockResolvedValue(
      new TextEncoder().encode(mockAudioData).buffer // Simulate returning an ArrayBuffer
    );
    const recordingTime = 10;
    const recordingSize = 1024;
    const fileUri = 'mock/path/to/recording.webm';
    const mockAiResponse = { /* structure based on convertAiResponseToAudioMetrics input */
      pronunciationScore: 80, fluencyScore: 70, grammarScore: 75, vocabularyScore: 85, overallPerformance: 78,
      proficiencyLevel: 'B1', learningTrajectory: 'steady',
      pronunciationAssessment: { overall_score: 80, native_language_influence: {}, phoneme_analysis: [], problematic_sounds: [], strengths: [], areas_for_improvement: [] },
      fluencyAssessment: { overall_score: 70, speech_rate: {}, hesitation_patterns: {}, rhythm_and_intonation: {} },
      grammarAssessment: { overall_score: 75, error_patterns: [], grammar_rules_to_review: [], grammar_strengths: [] },
      vocabularyAssessment: { overall_score: 85, range: 'good', appropriateness: 0, precision: 0, areas_for_expansion: [] },
      exerciseCompletion: { overall_score: 0, exercises_analyzed: [], comprehension_level: 'good' },
      suggestedTopics: [], grammarFocusAreas: [], vocabularyDomains: [], nextSkillTargets: [], preferredPatterns: [], effectiveApproaches: [],
    };
    const mockConvertedAudioMetrics: AudioMetrics = { /* structure matching AudioMetrics */
      id: expect.any(String), // crypto.randomUUID()
      pronunciationScore: 80, fluencyScore: 70, grammarScore: 75, vocabularyScore: 85, overallPerformance: 78,
      proficiencyLevel: 'B1', learningTrajectory: 'steady',
      // ... other fields populated from mockAiResponse or defaults
      pronunciationAssessment: expect.any(Object), fluencyAssessment: expect.any(Object), grammarAssessment: expect.any(Object), vocabularyAssessment: expect.any(Object), exerciseCompletion: expect.any(Object),
      suggestedTopics: [], grammarFocusAreas: [], vocabularyDomains: [], nextSkillTargets: [], preferredPatterns: [], effectiveApproaches: [],
      createdAt: expect.any(Date), updatedAt: expect.any(Date),
    };

    it('should process recording, get AI analysis, convert, and update lesson', async () => {
      mockOnboardingRepository.getOnboarding.mockResolvedValue(mockOnboarding);
      MockRecordingService.prototype.uploadFile.mockResolvedValue(fileUri);
      MockRecordingService.prototype.submitLessonRecordingSession.mockResolvedValue(mockAiResponse);
      // The conversion happens internally, assume it works for this test focus
      mockOnboardingRepository.updateOnboardingAssessmentLesson.mockResolvedValue({
        ...mockAssessmentLesson,
        audioMetrics: mockConvertedAudioMetrics // Simulate the update result
      });

      const result = await onboardingService.processAssessmentLessonRecording(
        mockBlob,
        mockAssessmentLesson,
        recordingTime,
        recordingSize
      );

      expect(mockOnboardingRepository.getOnboarding).toHaveBeenCalledTimes(1);
      expect(MockRecordingService.prototype.uploadFile).toHaveBeenCalledWith(
        expect.any(Buffer), // Buffer.from(await mockBlob.arrayBuffer())
        'audio/webm',
        expect.stringContaining(`lesson-${assessmentLessonId}-`) // Filename pattern
      );
      expect(MockRecordingService.prototype.submitLessonRecordingSession).toHaveBeenCalledWith(
        fileUri,
        recordingTime,
        recordingSize,
        { targetLanguage: mockOnboarding.targetLanguage, nativeLanguage: mockOnboarding.nativeLanguage },
        mockAssessmentLesson
      );
      expect(mockOnboardingRepository.updateOnboardingAssessmentLesson).toHaveBeenCalledWith(
        assessmentLessonId,
        { audioMetrics: expect.objectContaining({ pronunciationScore: 80 }) } // Check if conversion result is passed
      );
      expect(result.audioMetrics).toBeDefined();
      expect(result.audioMetrics?.pronunciationScore).toBe(80);
    });

    it('should throw error if onboarding data not found', async () => {
      mockOnboardingRepository.getOnboarding.mockResolvedValue(null);
      await expect(onboardingService.processAssessmentLessonRecording(mockBlob, mockAssessmentLesson, recordingTime, recordingSize))
        .rejects.toThrow('User onboarding data not found');
    });

    it('should handle error during file upload', async () => {
      const uploadError = new Error('S3 Upload Failed');
      mockOnboardingRepository.getOnboarding.mockResolvedValue(mockOnboarding);
      MockRecordingService.prototype.uploadFile.mockRejectedValue(uploadError);

      await expect(onboardingService.processAssessmentLessonRecording(mockBlob, mockAssessmentLesson, recordingTime, recordingSize))
        .rejects.toThrow('S3 Upload Failed'); // Or whatever error uploadFile throws
      expect(MockRecordingService.prototype.submitLessonRecordingSession).not.toHaveBeenCalled();
      expect(mockOnboardingRepository.updateOnboardingAssessmentLesson).not.toHaveBeenCalled();
    });

    it('should handle error during AI submission', async () => {
      const aiError = new Error('AI Service Unavailable');
      mockOnboardingRepository.getOnboarding.mockResolvedValue(mockOnboarding);
      MockRecordingService.prototype.uploadFile.mockResolvedValue(fileUri);
      MockRecordingService.prototype.submitLessonRecordingSession.mockRejectedValue(aiError);

      await expect(onboardingService.processAssessmentLessonRecording(mockBlob, mockAssessmentLesson, recordingTime, recordingSize))
        .rejects.toThrow('AI Service Unavailable');
      expect(mockOnboardingRepository.updateOnboardingAssessmentLesson).not.toHaveBeenCalled();
    });
  });

});

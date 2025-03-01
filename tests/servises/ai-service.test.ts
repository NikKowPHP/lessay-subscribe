import RecordingService from '@/services/recording.service';
import AIService from '@/services/ai.service';
import MessageGenerator from '@/services/generators/messageGenerator';
import MetricsService from '@/services/metrics.service';
import { mockDeep } from 'jest-mock-extended';

// Mock dependencies
jest.mock('@/services/ai.service');
jest.mock('@/services/generators/messageGenerator');
jest.mock('@/services/metrics.service');
// jest.mock('@/repositories/supabase/supabase');

jest.mock('@/repositories/supabase/supabase', () => {
  const queryBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn(), // we will override this in each test.
    insert: jest.fn(),
    // Make our chain thenable by defining a then function.
    then: function (resolve: (value: unknown) => void) {
      return resolve(this);
    },
  };

  return {
    supabase: {
      from: jest.fn(() => queryBuilder),
      // Expose the query builder so that tests can override its methods:
      __queryBuilder: queryBuilder,
    },
  };
});


describe('RecordingService', () => {
  let recordingService: RecordingService;
  let mockAIService: jest.Mocked<AIService>;
  let mockMessageGenerator: jest.Mocked<MessageGenerator>;
  let mockMetricsService: jest.Mocked<MetricsService>;

  beforeEach(() => {
    mockAIService = mockDeep<AIService>();
    mockMessageGenerator = mockDeep<MessageGenerator>();
    mockMetricsService = mockDeep<MetricsService>();

    (AIService as jest.Mock).mockImplementation(() => mockAIService);
    (MessageGenerator as jest.Mock).mockImplementation(() => mockMessageGenerator);
    (MetricsService as jest.Mock).mockImplementation(() => mockMetricsService);

    recordingService = new RecordingService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('should delegate to AIService uploadFile with correct parameters', async () => {
      const testBuffer = Buffer.from('test');
      const mockUri = 'gs://mock-file-uri';
      mockAIService.uploadFile.mockResolvedValue(mockUri);

      const result = await recordingService.uploadFile(testBuffer, 'audio/mpeg', 'test.mp3');

      expect(mockAIService.uploadFile).toHaveBeenCalledWith(
        testBuffer,
        'audio/mpeg',
        'test.mp3'
      );
      expect(result).toBe(mockUri);
    });
  });

  describe('submitRecording', () => {
    const mockFileUri = 'gs://mock-file-uri';
    const mockResponse = { analysis: 'test' };

    beforeEach(() => {
      mockAIService.generateContent.mockResolvedValue(mockResponse);
      mockMessageGenerator.generatePersonalizedPrompts.mockReturnValue({
        userPrompt: 'test user',
        systemPrompt: 'test system'
      });
      mockMessageGenerator.generateTargetLanguageDetectionPrompt.mockReturnValue({
        userPrompt: 'detect lang',
        systemPrompt: 'system lang'
      });
    });

    it('should complete full analysis flow successfully', async () => {
      const result = await recordingService.submitRecording(
        '192.168.0.1',
        mockFileUri,
        1000,
        1024,
        true
      );

      expect(mockAIService.generateContent).toHaveBeenCalled();
      expect(mockMetricsService.collectInteractionData).toHaveBeenCalledWith(
        '192.168.0.1',
        mockFileUri,
        mockResponse,
        1000,
        expect.any(Number),
        1024,
        expect.anything()
      );
      expect(result).toEqual(mockResponse);
    });

    it('should fallback to flash model when pro model fails', async () => {
      const error = new Error('Model overloaded');
      
      mockAIService.generateContent
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockResponse);

      const result = await recordingService.submitRecording(
        '192.168.0.1',
        mockFileUri,
        1000,
        1024,
        true
      );

      expect(mockAIService.generateContent).toHaveBeenCalledTimes(3);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('detectTargetLanguage', () => {
    it.only('should call AI service with language detection prompts', async () => {
      const mockResponse = { language: 'en' };
   
      mockMessageGenerator.generateTargetLanguageDetectionPrompt.mockReturnValue({
        userPrompt: 'detect lang',
        systemPrompt: 'system lang'
      });
      mockAIService.generateContent.mockResolvedValue(mockResponse);
      const result = await recordingService['detectTargetLanguage']('gs://test-uri');

      expect(mockMessageGenerator.generateTargetLanguageDetectionPrompt).toHaveBeenCalled();
      expect(mockAIService.generateContent).toHaveBeenCalledWith(
        'gs://test-uri',
        expect.any(String),
        expect.any(String),
        expect.any(String)
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
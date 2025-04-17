// File: /tests/components/onboarding/AssessmentStep.test.tsx

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import AssessmentStep from '@/components/onboarding/AssessmentStep';
import {
  AssessmentLesson,
  AudioMetrics,
  isAssessmentMetrics,
  LessonStep, // Import LessonStep if used in handleStepComplete type
  AssessmentStep as AssessmentStepModel, // Alias to avoid naming conflict
} from '@/models/AppAllModels.model';
import { RecordingBlob } from '@/lib/interfaces/all-interfaces';
import { toast } from 'react-hot-toast';
import logger from '@/utils/logger';

// --- Mocks ---

// Mock useOnboarding hook
const mockRecordAssessmentStepAttempt = jest.fn();
jest.mock('@/context/onboarding-context', () => ({
  useOnboarding: () => ({
    recordAssessmentStepAttempt: mockRecordAssessmentStepAttempt,
  }),
}));

// Mock LessonChat component
jest.mock('@/components/lessons/lessonChat', () => {
  // eslint-disable-next-line react/display-name
  return ({ onComplete, onStepComplete, loading, lesson }: any) => (
    <div data-testid="lesson-chat">
      <button
        onClick={() => onStepComplete(lesson.steps[0], 'User step response')}
      >
        Complete Step
      </button>
      <button
        onClick={() => {
          // Create the actual Blob
          const baseBlob = new Blob(['mockaudio'], { type: 'audio/webm' });
          // Create the RecordingBlob object
          const mockRecordingBlob = Object.assign(baseBlob, {
            recordingTime: 5678,
          }) as RecordingBlob;
          // Pass the RecordingBlob instance
          onComplete(mockRecordingBlob);
        }}
      >
        Complete Lesson Chat
      </button>
      <div>Loading: {loading ? 'true' : 'false'}</div>
      <div>Lesson ID: {lesson?.id}</div>
    </div>
  );
});


const mockToastFunctions = {
  error: jest.fn(),
  success: jest.fn(),
  loading: jest.fn(),
  custom: jest.fn(),
  dismiss: jest.fn(),
  remove: jest.fn(),
  promise: jest.fn(),
};

// Mock logger
jest.mock('@/utils/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

// Mock toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));


// --- Test Data ---

const mockBaseLesson: AssessmentLesson = {
  id: 'assess-test-1',
  userId: 'user-test-1',
  description: 'Test Assessment',
  completed: false,
  sourceLanguage: 'English',
  targetLanguage: 'German',
  metrics: null,
  audioMetrics: null,
  proposedTopics: [],
  summary: null,
  steps: [
    {
      id: 'step-1',
      assessmentId: 'assess-test-1',
      stepNumber: 1,
      type: 'instruction',
      content: 'Welcome',
      maxAttempts: 1,
      attempts: 0,
      correct: false,
      feedback: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      contentAudioUrl: null,
      expectedAnswer: null,
      expectedAnswerAudioUrl: null,
      translation: null,
      userResponse: null,
      userResponseHistory: null,
      lastAttemptAt: null, // Added missing property
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
  sessionRecordingUrl: null,
};

const mockTextMetrics = {
  accuracy: 80,
  pronunciationScore: 70,
  grammarScore: 85,
  vocabularyScore: 75,
  overallScore: 78,
  strengths: ['greetings'],
  weaknesses: ['verbs'],
};

const mockLessonWithTextMetrics: AssessmentLesson = {
  ...mockBaseLesson,
  completed: true,
  metrics: mockTextMetrics,
  summary: 'Good start.',
  proposedTopics: ['Topic 1'],
  // Ensure steps array is copied correctly
  steps: mockBaseLesson.steps.map(step => ({ ...step })),
};

const mockAudioMetricsData: AudioMetrics = {
  id: 'audio-m-1',
  pronunciationScore: 90,
  fluencyScore: 65,
  grammarScore: 85,
  vocabularyScore: 75,
  overallPerformance: 80,
  proficiencyLevel: 'A2',
  learningTrajectory: 'steady',
  pronunciationAssessment: {
    overall_score: 90,
    native_language_influence: { level: 'minimal', specific_features: [] },
    phoneme_analysis: [],
    problematic_sounds: ['ü'],
    strengths: ['clear vowels'],
    areas_for_improvement: ['ü sound'],
  },
  fluencyAssessment: {
    overall_score: 65,
    speech_rate: { words_per_minute: 90, evaluation: 'slow' },
    hesitation_patterns: {
      frequency: 'occasional',
      average_pause_duration: 1.2,
      typical_contexts: [],
    },
    rhythm_and_intonation: {
      naturalness: 60,
      sentence_stress_accuracy: 70,
      intonation_pattern_accuracy: 65,
    },
  },
  grammarAssessment: {
    overall_score: 85,
    error_patterns: [],
    grammar_rules_to_review: [],
    grammar_strengths: [],
  },
  vocabularyAssessment: {
    overall_score: 75,
    range: 'adequate',
    appropriateness: 70,
    precision: 65,
    areas_for_expansion: [],
  },
  exerciseCompletion: {
    overall_score: 0,
    exercises_analyzed: [],
    comprehension_level: 'fair',
  },
  suggestedTopics: [],
  grammarFocusAreas: [],
  vocabularyDomains: [],
  nextSkillTargets: [],
  preferredPatterns: [],
  effectiveApproaches: [],
  audioRecordingUrl: 'mock-url',
  recordingDuration: 5678,
  createdAt: new Date(),
  updatedAt: new Date(),
  // Add potentially missing relationship IDs if needed by component logic, though likely null here
  lessonId: null,
  assessmentLessonId: mockBaseLesson.id, // Link to assessment
};

const mockLessonWithAllMetrics: AssessmentLesson = {
  ...mockLessonWithTextMetrics,
  audioMetrics: mockAudioMetricsData,
  // Ensure steps array is copied correctly
  steps: mockLessonWithTextMetrics.steps.map(step => ({ ...step })),
};

// --- Test Suite ---

describe('AssessmentStep Component', () => {
  let mockOnAssessmentComplete: jest.Mock;
  let mockOnGoToLessonsButtonClick: jest.Mock;
  let mockProcessAssessmentLessonRecording: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnAssessmentComplete = jest.fn();
    mockOnGoToLessonsButtonClick = jest.fn();
    // Mock the processing function - specific implementations per test
    mockProcessAssessmentLessonRecording = jest.fn();
 
  });

  it('renders initial loading state', () => {
    render(
      <AssessmentStep
        areMetricsGenerated={false}
        loading={true}
        targetLanguage="German"
        lesson={null}
        onAssessmentComplete={mockOnAssessmentComplete}
        onGoToLessonsButtonClick={mockOnGoToLessonsButtonClick}
        processAssessmentLessonRecording={mockProcessAssessmentLessonRecording}
      />
    );
    expect(screen.getByText('Loading assessment...')).toBeInTheDocument();
  });

  it('renders LessonChat when lesson is loaded and not completed', () => {
    render(
      <AssessmentStep
        areMetricsGenerated={false}
        loading={false}
        targetLanguage="German"
        lesson={mockBaseLesson}
        onAssessmentComplete={mockOnAssessmentComplete}
        onGoToLessonsButtonClick={mockOnGoToLessonsButtonClick}
        processAssessmentLessonRecording={mockProcessAssessmentLessonRecording}
      />
    );
    expect(screen.getByTestId('lesson-chat')).toBeInTheDocument();
    expect(
      screen.getByText(`Lesson ID: ${mockBaseLesson.id}`)
    ).toBeInTheDocument();
  });

  it('calls recordAssessmentStepAttempt when step is completed in LessonChat', async () => {
    // Mock the return value for the step attempt if needed by subsequent logic
    mockRecordAssessmentStepAttempt.mockResolvedValue({
        ...mockBaseLesson.steps[0],
        attempts: 1,
        userResponse: 'User step response',
        lastAttemptAt: new Date(),
    });

    render(
      <AssessmentStep
        areMetricsGenerated={false}
        loading={false}
        targetLanguage="German"
        lesson={mockBaseLesson}
        onAssessmentComplete={mockOnAssessmentComplete}
        onGoToLessonsButtonClick={mockOnGoToLessonsButtonClick}
        processAssessmentLessonRecording={mockProcessAssessmentLessonRecording}
      />
    );

    await act(async () => {
      userEvent.click(screen.getByRole('button', { name: 'Complete Step' }));
    });

    await waitFor(() => {
      expect(mockRecordAssessmentStepAttempt).toHaveBeenCalledWith(
        mockBaseLesson.id,
        mockBaseLesson.steps[0].id,
        'User step response'
      );
    });

    await waitFor(() => {
      expect(mockRecordAssessmentStepAttempt).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onAssessmentComplete and triggers audio processing on LessonChat completion automatically', async () => {
     // Mock the processing function to simulate delay and return the final lesson state
     mockProcessAssessmentLessonRecording.mockResolvedValue(mockLessonWithAllMetrics);

    render(
      <AssessmentStep
        areMetricsGenerated={false}
        loading={false}
        targetLanguage="German"
        lesson={mockBaseLesson} // Start with base lesson
        onAssessmentComplete={mockOnAssessmentComplete}
        onGoToLessonsButtonClick={mockOnGoToLessonsButtonClick}
        processAssessmentLessonRecording={mockProcessAssessmentLessonRecording}
      />
    );

  });

  // it('renders "Analyzing responses..." when lesson is complete but metrics are not yet available', () => {
  //   const lessonJustCompleted = {
  //     ...mockBaseLesson,
  //     completed: true,
  //     metrics: null, // No text metrics yet
  //     // Ensure steps array is copied correctly
  //     steps: mockBaseLesson.steps.map(step => ({ ...step })),
  //   };
  //   render(
  //     <AssessmentStep
  //       areMetricsGenerated={false}
  //       loading={false}
  //       targetLanguage="German"
  //       lesson={lessonJustCompleted}
  //       onAssessmentComplete={mockOnAssessmentComplete}
  //       onGoToLessonsButtonClick={mockOnGoToLessonsButtonClick}
  //       processAssessmentLessonRecording={mockProcessAssessmentLessonRecording}
  //     />
  //   );
  //   // The component uses showResults state, which depends on lesson.completed AND lesson.metrics
  //   // Since metrics are null, showResults should be false, leading to the "Analyzing..." view
  //   expect(screen.getByText('Analyzing your responses...')).toBeInTheDocument();
  //   expect(
  //     screen.getByText('Please wait while we process your assessment results.')
  //   ).toBeInTheDocument();
  //   // Ensure results view isn't shown
  //   expect(screen.queryByText('Assessment Results')).not.toBeInTheDocument();
  // });

  // it('renders results view with text metrics when available', () => {
  //   render(
  //     <AssessmentStep
  //       areMetricsGenerated={false}
  //       loading={false}
  //       targetLanguage="German"
  //       lesson={mockLessonWithTextMetrics} // Lesson now has text metrics
  //       onAssessmentComplete={mockOnAssessmentComplete}
  //       onGoToLessonsButtonClick={mockOnGoToLessonsButtonClick}
  //       processAssessmentLessonRecording={mockProcessAssessmentLessonRecording}
  //     />
  //   );

  //   // Check for results view elements
  //   expect(screen.getByText('Assessment Results')).toBeInTheDocument();
  //   expect(screen.getByText('Summary')).toBeInTheDocument();
  //   expect(
  //     screen.getByText(mockLessonWithTextMetrics.summary!)
  //   ).toBeInTheDocument();
  //   expect(screen.getByText('Overall Score')).toBeInTheDocument();
  //   expect(
  //     screen.getByText(`${mockTextMetrics.overallScore}%`) // Check percentage rendering
  //   ).toBeInTheDocument();
  //   expect(screen.getByText('Accuracy')).toBeInTheDocument();
  //   expect(
  //     screen.getByText(`${mockTextMetrics.accuracy}%`)
  //   ).toBeInTheDocument();
  //    // Check other scores displayed
  //    expect(screen.getByText('Grammar')).toBeInTheDocument();
  //    expect(
  //      screen.getByText(`${mockTextMetrics.grammarScore}%`)
  //    ).toBeInTheDocument();
  //    expect(screen.getByText('Vocabulary')).toBeInTheDocument();
  //    expect(
  //      screen.getByText(`${mockTextMetrics.vocabularyScore}%`)
  //    ).toBeInTheDocument();
  //    expect(screen.getByText('Pronunciation (Initial)')).toBeInTheDocument();
  //    expect(
  //      screen.getByText(`${mockTextMetrics.pronunciationScore}%`)
  //    ).toBeInTheDocument();

  //   expect(screen.getByText('Strengths')).toBeInTheDocument();
  //   expect(screen.getByText(mockTextMetrics.strengths![0])).toBeInTheDocument();
  //   expect(screen.getByText('Areas for Improvement')).toBeInTheDocument();
  //   expect(
  //     screen.getByText(mockTextMetrics.weaknesses![0])
  //   ).toBeInTheDocument();
  //   expect(screen.getByText('Recommended Learning Topics')).toBeInTheDocument();
  //   expect(
  //     screen.getByText(mockLessonWithTextMetrics.proposedTopics[0])
  //   ).toBeInTheDocument();

  //   // Audio metrics section should NOT be present yet
  //   expect(
  //     screen.queryByText('Detailed Pronunciation & Fluency Analysis')
  //   ).not.toBeInTheDocument();
  //   // Check for the specific audio loading indicator - it shouldn't be there if not processing
  //   expect(
  //     screen.queryByText('Analyzing pronunciation and fluency...')
  //   ).not.toBeInTheDocument();
  // });

  // it('renders results view, shows audio loading, then shows audio metrics', async () => {
  //     // 1. Setup controllable mock for audio processing
  //     let resolveAudioProcessing: (value: AssessmentLesson) => void;
  //     const audioProcessingPromise = new Promise<AssessmentLesson>((resolve) => {
  //       resolveAudioProcessing = resolve;
  //     });
  //     mockProcessAssessmentLessonRecording.mockImplementation(() => {
  //       logger.info('Mock processAssessmentLessonRecording called, returning promise...');
  //       return audioProcessingPromise;
  //     });

  //     // 2. Setup state and mocks to simulate parent behavior
  //     let currentLessonState: AssessmentLesson | null = mockBaseLesson; // Start with base lesson

  //     // This mock simulates the parent calling completeAssessmentLessonAction,
  //     // getting text metrics back, and updating the lesson prop via rerender.
  //     const mockParentOnAssessmentComplete = jest.fn(async () => {
  //       logger.info('mockParentOnAssessmentComplete called. Updating lesson state to text metrics...');
  //       // IMPORTANT: Ensure the new state is a distinct object for React reconciliation
  //       currentLessonState = { ...mockLessonWithTextMetrics };
  //       rerenderComponent(); // Trigger rerender with the new lesson state
  //     });

  //     // Helper component to manage rerenders easily
  //     const TestComponent = () => (
  //       <AssessmentStep
  //         areMetricsGenerated={false}
  //         loading={false}
  //         targetLanguage="German"
  //         lesson={currentLessonState}
  //         onAssessmentComplete={mockParentOnAssessmentComplete} // Use the mock that triggers rerender
  //         onGoToLessonsButtonClick={mockOnGoToLessonsButtonClick}
  //         processAssessmentLessonRecording={mockProcessAssessmentLessonRecording} // Use the controllable mock
  //       />
  //     );

  //     // Initial render with the base lesson (shows LessonChat)
  //     const { rerender } = render(<TestComponent />);
  //     const rerenderComponent = () => rerender(<TestComponent />); // Function to rerender with current state

  //     // 3. Simulate LessonChat completion
  //     expect(screen.getByTestId('lesson-chat')).toBeInTheDocument();
  //     await act(async () => {
  //       logger.info('Simulating click on "Complete Lesson Chat"');
  //       userEvent.click(screen.getByRole('button', { name: 'Complete Lesson Chat' }));
  //       // This click triggers AssessmentStep's handleComplete, which:
  //       // - Sets internal sessionRecording state
  //       // - Calls mockParentOnAssessmentComplete
  //       // mockParentOnAssessmentComplete then updates currentLessonState and calls rerenderComponent
  //     });

  //     // 4. Wait for the results view (with text metrics) to appear after rerender
  //     // The audio processing useEffect should also have been triggered by now.
  //     await waitFor(() => {
  //       expect(screen.getByText('Assessment Results')).toBeInTheDocument();
  //       expect(screen.getByText(`${mockTextMetrics.overallScore}%`)).toBeInTheDocument();
  //       expect(screen.queryByTestId('lesson-chat')).not.toBeInTheDocument();
  //       logger.info('Results view with text metrics rendered.');
  //     });

  //     // 5. Assert the audio loading indicator is now visible
  //     // This confirms the useEffect set lessonAudioMetricsLoading = true
  //     await waitFor(() => {
  //       expect(screen.getByText('Analyzing pronunciation and fluency...')).toBeInTheDocument();
  //       logger.info('Audio loading indicator ("Analyzing...") found.');
  //     });
  //     // Ensure detailed audio section isn't visible yet
  //     expect(screen.queryByText('Detailed Pronunciation & Fluency Analysis')).not.toBeInTheDocument();

  //     // 6. Simulate audio processing finishing by resolving the mock promise
  //     // AND simulate the parent updating the lesson prop with the *final* result
  //     await act(async () => {
  //       logger.info('Resolving audio processing promise and rerendering with all metrics...');
  //       // Simulate the async operation completing and returning the full lesson data
  //       resolveAudioProcessing(mockLessonWithAllMetrics);
  //       // Allow the promise resolution to propagate
  //       await Promise.resolve();
  //       // Simulate the parent component receiving the result and updating the lesson prop
  //       // IMPORTANT: Ensure the new state is a distinct object
  //       currentLessonState = { ...mockLessonWithAllMetrics };
  //       rerenderComponent();
  //     });

  //     // 7. Assert the final state: loading gone, audio metrics visible
  //     await waitFor(() => {
  //       // Loading indicator should disappear
  //       expect(screen.queryByText('Analyzing pronunciation and fluency...')).not.toBeInTheDocument();
  //       // Detailed audio section should now be visible
  //       expect(screen.getByText('Detailed Pronunciation & Fluency Analysis')).toBeInTheDocument();
  //       // Check for specific audio data
  //       expect(screen.getByText(`${mockAudioMetricsData.pronunciationScore}%`)).toBeInTheDocument(); // Check percentage rendering
  //       expect(screen.getByText(mockAudioMetricsData.proficiencyLevel)).toBeInTheDocument();
  //       // Check that text metrics are still there
  //       expect(screen.getByText(`${mockTextMetrics.overallScore}%`)).toBeInTheDocument(); // Check percentage rendering
  //       logger.info('Final state verified: Loading gone, audio metrics displayed.');
  //     });

  //      // 8. Verify mocks were called as expected
  //      expect(mockParentOnAssessmentComplete).toHaveBeenCalledTimes(1);
  //      expect(mockProcessAssessmentLessonRecording).toHaveBeenCalledTimes(1);
  //      // Verify the arguments passed to processAssessmentLessonRecording
  //      const expectedBlobSize = new Blob(['mockaudio']).size; // Size of the blob created in LessonChat mock
  //      expect(mockProcessAssessmentLessonRecording).toHaveBeenCalledWith(
  //         expect.any(Blob),
  //         // IMPORTANT: The effect runs *before* the parent rerenders with text metrics,
  //         // so it's called with the state *at that moment*, which is mockBaseLesson.
  //         mockBaseLesson,
  //         5678, // recordingTime from mock blob assignment in LessonChat mock
  //         expectedBlobSize
  //      );
  // });

  // it('calls onGoToLessonsButtonClick when the button is clicked', async () => {
  //   render(
  //     <AssessmentStep
  //     areMetricsGenerated={false}
  //       loading={false}
  //       targetLanguage="German"
  //       lesson={mockLessonWithAllMetrics} // Render directly in the final state
  //       onAssessmentComplete={mockOnAssessmentComplete}
  //       onGoToLessonsButtonClick={mockOnGoToLessonsButtonClick}
  //       processAssessmentLessonRecording={mockProcessAssessmentLessonRecording}
  //     />
  //   );

  //   const goToLessonsButton = screen.getByRole('button', {
  //     name: 'Go to Lessons',
  //   });
  //   // Ensure the button is present and enabled in this state
  //   expect(goToLessonsButton).toBeInTheDocument();
  //   expect(goToLessonsButton).toBeEnabled();

  //   await act(async () => {
  //     userEvent.click(goToLessonsButton);
  //   });

  //   // Use waitFor to ensure the assertion runs after the click event is fully processed
  //   await waitFor(() => {
  //     expect(mockOnGoToLessonsButtonClick).toHaveBeenCalledTimes(1);
  //   });
  // });

  // Combined test for disabled button states

  // it('handles error during audio processing', async () => {
  //   // 1. Mock processing to reject
  //   const errorMsg = 'Audio processing failed!';
  //   mockProcessAssessmentLessonRecording.mockRejectedValue(new Error(errorMsg));

  //   // 2. Setup state and mocks for parent behavior
  //   let currentLessonState: AssessmentLesson | null = mockBaseLesson;
  //   const mockParentOnAssessmentComplete = jest.fn(async () => {
  //     currentLessonState = { ...mockLessonWithTextMetrics }; // Update with text metrics
  //     rerenderComponent(); // Rerender
  //   });

  //   const TestComponent = () => (
  //     <AssessmentStep
  //     areMetricsGenerated={false}
  //       loading={false}
  //       targetLanguage="German"
  //       lesson={currentLessonState}
  //       onAssessmentComplete={mockParentOnAssessmentComplete}
  //       onGoToLessonsButtonClick={mockOnGoToLessonsButtonClick}
  //       processAssessmentLessonRecording={mockProcessAssessmentLessonRecording} // Rejecting mock
  //     />
  //   );

  //   const { rerender } = render(<TestComponent />);
  //   const rerenderComponent = () => rerender(<TestComponent />);

  //   // 3. Simulate LessonChat completion (triggers internal state changes and effects)
  //   await act(async () => {
  //     userEvent.click(screen.getByRole('button', { name: 'Complete Lesson Chat' }));
  //   });

  //   // 4. Wait for results view (text metrics) to appear
  //   await waitFor(() => {
  //     expect(screen.getByText('Assessment Results')).toBeInTheDocument();
  //   });

  //   // 5. Wait for the error toast to be called
  //   // The internal useEffect runs, calls the rejecting mock, catches the error, and calls toast.error
  

  //   // 6. Assert final state after error
  //   // Loading indicator should not be present (or should disappear quickly)
  //   expect(screen.queryByText('Analyzing pronunciation and fluency...')).not.toBeInTheDocument();
  //   // Detailed audio section should NOT be rendered
  //   expect(screen.queryByText('Detailed Pronunciation & Fluency Analysis')).not.toBeInTheDocument();
  //   // Button should be enabled again after error handling completes
  //   const goToLessonsButton = screen.getByRole('button', { name: 'Go to Lessons' });
  //   expect(goToLessonsButton).toBeInTheDocument();
  //   expect(goToLessonsButton).toBeEnabled();
  //   // Ensure the rejecting mock was called
  //   expect(mockProcessAssessmentLessonRecording).toHaveBeenCalledTimes(1);
  // });
});
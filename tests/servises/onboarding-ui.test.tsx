// File: /tests/components/onboarding/AssessmentStep.test.tsx

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import AssessmentStep from '@/components/onboarding/AssessmentStep';
import { AssessmentLesson,  AudioMetrics, isAssessmentMetrics } from '@/models/AppAllModels.model';
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
        <button onClick={() => onStepComplete(lesson.steps[0], 'User step response')}>Complete Step</button>
        <button onClick={() => {
            const mockBlob = {
                ...new Blob(['mockaudio'], { type: 'audio/webm' }),
                size: 1234,
                recordingTime: 5678
            } as RecordingBlob;
            onComplete(mockBlob);
        }}>
          Complete Lesson Chat
        </button>
        <div>Loading: {loading ? 'true' : 'false'}</div>
        <div>Lesson ID: {lesson?.id}</div>
      </div>
    );
});

// Mock logger
jest.mock('@/utils/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

// Mock toast
jest.mock('react-hot-toast', () => ({
  error: jest.fn(),
  success: jest.fn(),
  loading: jest.fn(),
  custom: jest.fn(),
  dismiss: jest.fn(),
  remove: jest.fn(),
  promise: jest.fn(),
  useToaster: jest.fn(),
  useStore: jest.fn(),
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
  steps: [{ id: 'step-1', assessmentId: 'assess-test-1', stepNumber: 1, type: 'instruction', content: 'Welcome', maxAttempts: 1, attempts: 0, correct: false, feedback: null, createdAt: new Date(), updatedAt: new Date(), contentAudioUrl: null, expectedAnswer: null, expectedAnswerAudioUrl: null, translation: null, userResponse: null, userResponseHistory: null }],
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
};

const mockAudioMetricsData: AudioMetrics = { /* Fill with mock data */
    id: 'audio-m-1',
    pronunciationScore: 90, fluencyScore: 65, grammarScore: 85, vocabularyScore: 75, overallPerformance: 80,
    proficiencyLevel: 'A2', learningTrajectory: 'steady',
    pronunciationAssessment: { overall_score: 90, native_language_influence: { level: 'minimal', specific_features: [] }, phoneme_analysis: [], problematic_sounds: ['ü'], strengths: ['clear vowels'], areas_for_improvement: ['ü sound'] },
    fluencyAssessment: { overall_score: 65, speech_rate: { words_per_minute: 90, evaluation: 'slow' }, hesitation_patterns: { frequency: 'occasional', average_pause_duration: 1.2, typical_contexts: [] }, rhythm_and_intonation: { naturalness: 60, sentence_stress_accuracy: 70, intonation_pattern_accuracy: 65 } },
    grammarAssessment: { overall_score: 85, error_patterns: [], grammar_rules_to_review: [], grammar_strengths: [] },
    vocabularyAssessment: { overall_score: 75, range: 'adequate', appropriateness: 70, precision: 65, areas_for_expansion: [] },
    exerciseCompletion: { overall_score: 0, exercises_analyzed: [], comprehension_level: 'fair' },
    suggestedTopics: [], grammarFocusAreas: [], vocabularyDomains: [], nextSkillTargets: [], preferredPatterns: [], effectiveApproaches: [],
    audioRecordingUrl: 'mock-url', recordingDuration: 5678, createdAt: new Date(), updatedAt: new Date(),
};

const mockLessonWithAllMetrics: AssessmentLesson = {
  ...mockLessonWithTextMetrics,
  audioMetrics: mockAudioMetricsData,
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
    // Mock the processing function to simulate delay and return the final lesson state
    mockProcessAssessmentLessonRecording = jest.fn(async (recording, lesson, time, size) => {
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 50));
        return mockLessonWithAllMetrics; // Return the lesson with audio metrics added
    });
  });

  it('renders initial loading state', () => {
    render(
      <AssessmentStep
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
        loading={false}
        targetLanguage="German"
        lesson={mockBaseLesson}
        onAssessmentComplete={mockOnAssessmentComplete}
        onGoToLessonsButtonClick={mockOnGoToLessonsButtonClick}
        processAssessmentLessonRecording={mockProcessAssessmentLessonRecording}
      />
    );
    expect(screen.getByTestId('lesson-chat')).toBeInTheDocument();
    expect(screen.getByText(`Lesson ID: ${mockBaseLesson.id}`)).toBeInTheDocument();
  });

 
  it('calls recordAssessmentStepAttempt when step is completed in LessonChat', async () => {
    render(
     <AssessmentStep
       loading={false}
       targetLanguage="German"
       lesson={mockBaseLesson}
       onAssessmentComplete={mockOnAssessmentComplete}
       onGoToLessonsButtonClick={mockOnGoToLessonsButtonClick}
       processAssessmentLessonRecording={mockProcessAssessmentLessonRecording}
     />
   );

   // Use act for the user event dispatch
   await act(async () => {
       userEvent.click(screen.getByRole('button', { name: 'Complete Step' }));
   });

   // Use waitFor to allow the async handleStepComplete function to execute
   // and call the awaited recordAssessmentStepAttempt mock.
   await waitFor(() => {
       expect(mockRecordAssessmentStepAttempt).toHaveBeenCalledWith(
           mockBaseLesson.id,
           mockBaseLesson.steps[0].id,
           'User step response'
       );
   });

   // Optional: You might also want to check the number of calls specifically
   await waitFor(() => {
       expect(mockRecordAssessmentStepAttempt).toHaveBeenCalledTimes(1);
   });
 });


  it('calls onAssessmentComplete and triggers audio processing on LessonChat completion', async () => {
    render(
      <AssessmentStep
        loading={false}
        targetLanguage="German"
        lesson={mockBaseLesson} // Start with base lesson
        onAssessmentComplete={mockOnAssessmentComplete}
        onGoToLessonsButtonClick={mockOnGoToLessonsButtonClick}
        processAssessmentLessonRecording={mockProcessAssessmentLessonRecording}
      />
    );

    await act(async () => {
        userEvent.click(screen.getByRole('button', { name: 'Complete Lesson Chat' }));
    });

    // Check that the first stage (text metrics generation trigger) was called
    expect(mockOnAssessmentComplete).toHaveBeenCalledTimes(1);

    // Check that the audio processing function was called (triggered by useEffect watching sessionRecording)
    // It receives the recording blob and the *current* lesson state (which might still be mockBaseLesson initially)
    await waitFor(() => {
        expect(mockProcessAssessmentLessonRecording).toHaveBeenCalledTimes(1);
        expect(mockProcessAssessmentLessonRecording).toHaveBeenCalledWith(
            expect.any(Blob), // The mock blob passed from LessonChat mock
            mockBaseLesson, // The lesson state when the effect runs
            5678, // recordingTime from mock blob
            1234  // size from mock blob
        );
    });
  });

  it('renders "Analyzing responses..." when lesson is complete but metrics are not yet available', () => {
    const lessonJustCompleted = { ...mockBaseLesson, completed: true, metrics: null };
    render(
      <AssessmentStep
        loading={false}
        targetLanguage="German"
        lesson={lessonJustCompleted}
        onAssessmentComplete={mockOnAssessmentComplete}
        onGoToLessonsButtonClick={mockOnGoToLessonsButtonClick}
        processAssessmentLessonRecording={mockProcessAssessmentLessonRecording}
      />
    );
    expect(screen.getByText('Analyzing your responses...')).toBeInTheDocument();
    expect(screen.getByText('Please wait while we process your assessment results.')).toBeInTheDocument();
  });

  it('renders results view with text metrics when available', () => {
    render(
      <AssessmentStep
        loading={false}
        targetLanguage="German"
        lesson={mockLessonWithTextMetrics} // Lesson now has text metrics
        onAssessmentComplete={mockOnAssessmentComplete}
        onGoToLessonsButtonClick={mockOnGoToLessonsButtonClick}
        processAssessmentLessonRecording={mockProcessAssessmentLessonRecording}
      />
    );

    expect(screen.getByText('Assessment Results')).toBeInTheDocument();
    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText(mockLessonWithTextMetrics.summary!)).toBeInTheDocument();
    expect(screen.getByText('Overall Score')).toBeInTheDocument();
    expect(screen.getByText(`${mockTextMetrics.overallScore}%`)).toBeInTheDocument();
    expect(screen.getByText('Accuracy')).toBeInTheDocument();
    expect(screen.getByText(`${mockTextMetrics.accuracy}%`)).toBeInTheDocument();
    expect(screen.getByText('Strengths')).toBeInTheDocument();
    expect(screen.getByText(mockTextMetrics.strengths![0])).toBeInTheDocument();
    expect(screen.getByText('Areas for Improvement')).toBeInTheDocument();
    expect(screen.getByText(mockTextMetrics.weaknesses![0])).toBeInTheDocument();
    expect(screen.getByText('Recommended Learning Topics')).toBeInTheDocument();
    expect(screen.getByText(mockLessonWithTextMetrics.proposedTopics[0])).toBeInTheDocument();

    // Audio metrics section should NOT be present yet
    expect(screen.queryByText('Detailed Pronunciation & Fluency Analysis')).not.toBeInTheDocument();
    // Check for the specific audio loading indicator - it shouldn't be there if not processing
    expect(screen.queryByText('Analyzing pronunciation and fluency...')).not.toBeInTheDocument();
  });

  it('renders results view, shows audio loading, then shows audio metrics', async () => {
    // Mock the processing function to introduce a delay and update state via re-render
    mockProcessAssessmentLessonRecording.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate network delay
        return mockLessonWithAllMetrics;
    });

    // Initial render with only text metrics
    const { rerender } = render(
      <AssessmentStep
        loading={false}
        targetLanguage="German"
        lesson={mockLessonWithTextMetrics}
        onAssessmentComplete={mockOnAssessmentComplete}
        onGoToLessonsButtonClick={mockOnGoToLessonsButtonClick}
        processAssessmentLessonRecording={mockProcessAssessmentLessonRecording}
      />
    );

    // Check initial state (text metrics only)
    expect(screen.getByText(`${mockTextMetrics.overallScore}%`)).toBeInTheDocument();
    expect(screen.queryByText('Detailed Pronunciation & Fluency Analysis')).not.toBeInTheDocument();
    expect(screen.queryByText('Analyzing pronunciation and fluency...')).not.toBeInTheDocument();

    // Simulate the completion and audio processing trigger
    // We need to manually trigger the effect that calls processAssessmentLessonRecording
    // by simulating the state changes that would happen in a real scenario.
    // Let's simulate the parent component calling the prop after completion.
    // We'll need internal state in the test or a more complex setup.
    // --- Alternative: Test the states directly by controlling the lesson prop ---

    // State 1: Text metrics available, audio processing *starts*
    // We simulate this by setting lessonAudioMetricsLoading to true internally in the component,
    // which happens within the useEffect. Let's slightly adjust the test structure.

    // Create a wrapper to control the lesson prop easily
    const TestWrapper = ({ initialLesson }: { initialLesson: AssessmentLesson | null }) => {
        const [currentLesson, setCurrentLesson] = React.useState(initialLesson);
        const [isAudioProcessing, setIsAudioProcessing] = React.useState(false);

        const handleProcessRecording = async (rec: RecordingBlob, less: AssessmentLesson, time: number, size: number) => {
            setIsAudioProcessing(true);
            try {
                return await mockProcessAssessmentLessonRecording(rec, less, time, size);
            } catch (e) {
                // Error is caught, toast should be shown (mocked)
                toast.error('Failed to process pronunciation analysis.');
                return less; // Return the original lesson on error
            } finally {
                setIsAudioProcessing(false);
            }
        };

        // Simulate the effect triggering the process
        React.useEffect(() => {
            // This simulates the useEffect in AssessmentStep triggering the call
            // In a real scenario, this would be triggered by sessionRecording state change
            if (currentLesson === mockLessonWithTextMetrics) { // Only trigger if we are in the text-only state
                 const mockBlob = {
                     ...new Blob(['mockaudio'], { type: 'audio/webm' }),
                     size: 1234,
                     recordingTime: 5678
                 } as RecordingBlob;
                 handleProcessRecording(
                  mockBlob, 
                  currentLesson, 
                  mockBlob.recordingTime!, // Non-null assertion (safe here since we just set it)
                  mockBlob.size! // Non-null assertion
                );
            }
        }, [currentLesson]);


        return (
            <AssessmentStep
                loading={false}
                targetLanguage="German"
                lesson={currentLesson}
                onAssessmentComplete={mockOnAssessmentComplete}
                onGoToLessonsButtonClick={mockOnGoToLessonsButtonClick}
                processAssessmentLessonRecording={handleProcessRecording} // Pass the wrapper's handler
            />
        );
    };

    // Render the wrapper starting with text-only metrics
    render(<TestWrapper initialLesson={mockLessonWithTextMetrics} />);

    // Expect the audio loading indicator to appear while processing
    await waitFor(() => {
        expect(screen.getByText('Analyzing pronunciation and fluency...')).toBeInTheDocument();
    });
    // The initial text metrics should still be visible
    expect(screen.getByText(`${mockTextMetrics.overallScore}%`)).toBeInTheDocument();
    // Detailed audio section shouldn't be there yet
    expect(screen.queryByText('Detailed Pronunciation & Fluency Analysis')).not.toBeInTheDocument();


    // Wait for the processing to finish (mockProcessAssessmentLessonRecording resolves and updates state)
    await waitFor(() => {
        // Loading indicator should disappear
        expect(screen.queryByText('Analyzing pronunciation and fluency...')).not.toBeInTheDocument();
        // Detailed audio section should now be visible
        expect(screen.getByText('Detailed Pronunciation & Fluency Analysis')).toBeInTheDocument();
        // Check for a specific piece of audio data
        expect(screen.getByText(`${mockAudioMetricsData.pronunciationScore}%`)).toBeInTheDocument();
        expect(screen.getByText(mockAudioMetricsData.proficiencyLevel)).toBeInTheDocument();
        // Check that text metrics are still there
        expect(screen.getByText(`${mockTextMetrics.overallScore}%`)).toBeInTheDocument();
    });
  });


  it('calls onGoToLessonsButtonClick when the button is clicked', async () => {
    render(
      <AssessmentStep
        loading={false}
        targetLanguage="German"
        lesson={mockLessonWithAllMetrics} // Render directly in the final state
        onAssessmentComplete={mockOnAssessmentComplete}
        onGoToLessonsButtonClick={mockOnGoToLessonsButtonClick}
        processAssessmentLessonRecording={mockProcessAssessmentLessonRecording}
      />
    );

    const goToLessonsButton = screen.getByRole('button', { name: 'Go to Lessons' });
    expect(goToLessonsButton).toBeEnabled(); // Should be enabled in final state

    await act(async () => {
        userEvent.click(goToLessonsButton);
    });

    expect(mockOnGoToLessonsButtonClick).toHaveBeenCalledTimes(1);
  });

  it('disables "Go to Lessons" button while loading/processing', async () => {
     // 1. Test during initial loading
     const { rerender } = render(
        <AssessmentStep
            loading={true} // Initial loading prop
            targetLanguage="German"
            lesson={null}
            onAssessmentComplete={mockOnAssessmentComplete}
            onGoToLessonsButtonClick={mockOnGoToLessonsButtonClick}
            processAssessmentLessonRecording={mockProcessAssessmentLessonRecording}
        />
     );
     // Button shouldn't even be rendered in this state
     expect(screen.queryByRole('button', { name: /Lessons/i })).not.toBeInTheDocument();


     // 2. Test during audio processing (using the wrapper approach)
     const TestWrapperAudioLoading = () => {
        const [currentLesson, setCurrentLesson] = React.useState<AssessmentLesson | null>(mockLessonWithTextMetrics);
        const [isAudioProcessing, setIsAudioProcessing] = React.useState(false);

        const handleProcessRecording = async (rec: RecordingBlob, less: AssessmentLesson, time: number, size: number) => {
            setIsAudioProcessing(true); // Simulate loading start
            // Don't resolve immediately to keep loading state
            await new Promise(resolve => setTimeout(resolve, 200));
            // In a real test, you might resolve later or not at all to check the disabled state
            // setCurrentLesson(mockLessonWithAllMetrics);
            setIsAudioProcessing(false);
            return mockLessonWithAllMetrics;
        };

        React.useEffect(() => {
             const mockBlob = {
                 ...new Blob(['mockaudio'], { type: 'audio/webm' }),
                 size: 1234,
                 recordingTime: 5678
             } as RecordingBlob;
             handleProcessRecording(mockBlob, currentLesson!, mockBlob.recordingTime!, mockBlob.size!);
        }, []);

        return (
            <AssessmentStep
                loading={false} // Initial loading is false
                targetLanguage="German"
                lesson={currentLesson}
                onAssessmentComplete={mockOnAssessmentComplete}
                onGoToLessonsButtonClick={mockOnGoToLessonsButtonClick}
                processAssessmentLessonRecording={handleProcessRecording}
            />
        );
    };

    render(<TestWrapperAudioLoading />);

    // Wait for the results view to render and audio processing to start
    await waitFor(() => {
        expect(screen.getByText('Analyzing pronunciation and fluency...')).toBeInTheDocument();
    });

    // Check if the button is rendered but disabled
    const goToLessonsButton = screen.getByRole('button', { name: /Processing Results...|Go to Lessons/i }); // Match loading or final text
    expect(goToLessonsButton).toBeInTheDocument();
    expect(goToLessonsButton).toBeDisabled();

    // Optional: Wait for processing to finish and check if enabled again
    await waitFor(() => {
         expect(screen.queryByText('Analyzing pronunciation and fluency...')).not.toBeInTheDocument();
         // Need to ensure the state update happens in the wrapper for this part
    }, { timeout: 500 });
     // If state updated correctly, button should be enabled after loading
     // expect(screen.getByRole('button', { name: 'Go to Lessons' })).toBeEnabled();


  });

  it('handles error during audio processing', async () => {
    const errorMsg = 'Audio processing failed!';
    // Ensure the mock rejects for this specific test
    mockProcessAssessmentLessonRecording.mockRejectedValue(new Error(errorMsg));

    // Use a wrapper component to manage state and trigger the effect
    const TestWrapperError = () => {
        // Start with the lesson state where text metrics are available,
        // simulating the scenario where audio processing would start.
        const [currentLesson, setCurrentLesson] = React.useState<AssessmentLesson | null>(mockLessonWithTextMetrics);
        // State to simulate the recording blob being set
        const [recordingForEffect, setRecordingForEffect] = React.useState<RecordingBlob | null>(null);

        // This is the prop function passed to AssessmentStep
        const handleProcessRecordingProp = async (rec: RecordingBlob, less: AssessmentLesson, time: number, size: number): Promise<AssessmentLesson> => {
            // This prop calls the *mocked* function which will reject
            try {
                // We await the rejection here
                await mockProcessAssessmentLessonRecording(rec, less, time, size);
                // This part should not be reached if it rejects
                return less;
            } catch (e) {
                // The actual component's useEffect handles the error and calls toast.error
                // We re-throw here to simulate the promise rejection propagating
                // if the component didn't catch it, but AssessmentStep *does* catch it.
                // So, the toast call happens within AssessmentStep's effect.
                // We don't call toast.error directly in the test wrapper's prop.
                logger.error("Error caught in test wrapper prop (re-throwing)", e);
                throw e;
            }
        };

        // Simulate the recording being set, which triggers the useEffect in AssessmentStep
        React.useEffect(() => {
            const mockBlob = {
                ...new Blob(['mockaudio'], { type: 'audio/webm' }),
                size: 1234,
                recordingTime: 5678
            } as RecordingBlob;
            // Set the recording state to trigger the effect inside AssessmentStep
            setRecordingForEffect(mockBlob);
        }, []);

        // Simulate the AssessmentStep's internal state for sessionRecording
        // This isn't perfect, but helps trigger the effect within AssessmentStep
        // A better way might be to simulate the handleComplete function setting state.
        // Let's rely on the useEffect in AssessmentStep watching the 'lesson' prop
        // and the internal sessionRecording state which gets set in handleComplete.
        // We need to simulate the handleComplete call first.

        // --- Revised Approach: Simulate handleComplete setting the recording ---
        const assessmentStepRef = React.useRef<any>(); // To access internal state if needed (not ideal)

        const handleCompleteAndSetRecording = async () => {
            const mockBlob = {
                ...new Blob(['mockaudio'], { type: 'audio/webm' }),
                size: 1234,
                recordingTime: 5678
            } as RecordingBlob;
            // Simulate AssessmentStep's handleComplete setting the recording state
            // This will trigger the useEffect inside AssessmentStep
            // We pass the rejecting prop `handleProcessRecordingProp`
            setRecordingForEffect(mockBlob); // This state change triggers the effect in AssessmentStep
        };


        return (
            <>
              {/* Button to simulate the completion action that sets the recording */}
              <button onClick={handleCompleteAndSetRecording}>Trigger Audio Processing</button>
              <AssessmentStep
                ref={assessmentStepRef} // Assign ref if needed
                loading={false}
                targetLanguage="German"
                lesson={currentLesson} // Start with text metrics
                onAssessmentComplete={mockOnAssessmentComplete} // Mocked, called within handleComplete
                onGoToLessonsButtonClick={mockOnGoToLessonsButtonClick}
                processAssessmentLessonRecording={handleProcessRecordingProp} // Pass the rejecting prop
              />
            </>
        );
    };

    render(<TestWrapperError />);

    // Simulate the user completing the lesson chat, which calls handleComplete internally
    // In our test setup, we click the "Trigger Audio Processing" button which simulates setting the recording state
    await act(async () => {
        userEvent.click(screen.getByRole('button', { name: 'Trigger Audio Processing' }));
    });

    // Wait for the toast error message to appear.
    // This confirms that the useEffect in AssessmentStep ran, called the rejecting
    // processAssessmentLessonRecording prop, caught the error, and called toast.error.
    await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to process pronunciation analysis.');
    });

    // Check that the audio loading indicator is gone (it might flash briefly or not appear)
    expect(screen.queryByText('Analyzing pronunciation and fluency...')).not.toBeInTheDocument();
    // Check that the detailed audio metrics section is NOT rendered because processing failed
    expect(screen.queryByText('Detailed Pronunciation & Fluency Analysis')).not.toBeInTheDocument();
    // Button should be enabled again after the error handling completes
    expect(screen.getByRole('button', { name: 'Go to Lessons' })).toBeEnabled();
    // Ensure the original mock was called
    expect(mockProcessAssessmentLessonRecording).toHaveBeenCalledTimes(1);
  });


});
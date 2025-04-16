// File: /tests/components/lessons/lessonChat.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// import { ArrowLeftIcon } from 'lucide-react';

import LessonChat from '@/components/lessons/lessonChat';
import {
  AssessmentLesson,
  AssessmentStep,
  LessonModel,
  LessonStep,
} from '@/models/AppAllModels.model';
import { RecordingBlob } from '@/lib/interfaces/all-interfaces';
import logger from '@/utils/logger';
import { mapLanguageToCode } from '@/utils/map-language-to-code.util';

// --- Mocks ---


// Mock scrollTo and scrollHeight for jsdom environment
Object.defineProperty(window.Element.prototype, 'scrollTo', {
  writable: true,
  value: jest.fn(), // Mock the function itself
});

Object.defineProperty(window.Element.prototype, 'scrollHeight', {
  writable: true,
  value: 500, // Provide a mock value for scrollHeight
});

// Mock next/navigation
const mockRouterPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

// Mock logger
jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));





jest.mock('lucide-react', () => ({
  __esModule: true, // Helps Jest handle default/named exports from mocked modules
  ArrowLeft: jest.fn(() => <svg data-testid="mock-arrow-left" />), // Mock the correct component
  // Add any OTHER icons specifically used by LessonChat here if needed, e.g.:
  // SomeOtherIcon: jest.fn(() => <svg data-testid="mock-other-icon" />),
}));
// Mock mapLanguageToCode util
jest.mock('@/utils/map-language-to-code.util', () => ({
  mapLanguageToCode: jest.fn((lang) => {
    // Simple mock implementation
    if (lang === 'German') return 'de-DE';
    if (lang === 'English') return 'en-US';
    return 'en-US'; // Default
  }),
}));

// Mock Browser APIs

// -- Mock SpeechRecognition --
let mockRecognitionInstance: any;
const mockSpeechRecognition = jest.fn().mockImplementation(() => {
  mockRecognitionInstance = {
    lang: '',
    continuous: false,
    interimResults: false,
    start: jest.fn(() => {
      if (mockRecognitionInstance.onstart) {
        act(() => mockRecognitionInstance.onstart());
      }
    }),
    stop: jest.fn(() => {
      if (mockRecognitionInstance.onend) {
        act(() => mockRecognitionInstance.onend());
      }
    }),
    abort: jest.fn(),
    onstart: null,
    onresult: null,
    onerror: null,
    onend: null,
    // Helper to simulate a result
    _simulateResult: (transcript: string, isFinal = true) => {
      if (mockRecognitionInstance.onresult) {
        const event = {
          results: [
            [
              {
                transcript: transcript,
                confidence: 0.9,
              },
            ],
          ],
          resultIndex: 0, // or manage index if needed
        } as unknown as SpeechRecognitionEvent;
         // Simulate interim and final results if needed
        event.results[event.results.length - 1].isFinal = isFinal;
        act(() => mockRecognitionInstance.onresult(event));
      }
    },
    // Helper to simulate an error
     _simulateError: (error = 'network') => {
       if (mockRecognitionInstance.onerror) {
         const event = { error } as unknown as Event; // Adjust event structure if needed
         act(() => mockRecognitionInstance.onerror(event));
       }
     },
  };
  return mockRecognitionInstance;
});
global.window.webkitSpeechRecognition = mockSpeechRecognition as any;

// -- Mock MediaRecorder --
let mockMediaRecorderInstance: any;
let mockMediaRecorderChunks: Blob[] = [];
const mockMediaRecorder = jest.fn().mockImplementation(() => {
  mockMediaRecorderInstance = {
    start: jest.fn(),
    stop: jest.fn(() => {
       if (mockMediaRecorderInstance.onstop) {
          const blob = new Blob(mockMediaRecorderChunks, { type: 'audio/webm' });
          act(() => mockMediaRecorderInstance.onstop({ data: blob })); // Pass blob in event if needed by impl
       }
       mockMediaRecorderChunks = []; // Reset chunks
    }),
    pause: jest.fn(),
    resume: jest.fn(),
    ondataavailable: null,
    onstop: null,
    onerror: null,
    state: 'inactive',
    mimeType: 'audio/webm',
    // Helper to simulate data
    _simulateDataAvailable: (data: Blob) => {
      if (mockMediaRecorderInstance.ondataavailable) {
         mockMediaRecorderChunks.push(data);
         act(() => mockMediaRecorderInstance.ondataavailable({ data }));
      }
    },
  };
  // Mock static method
  (mockMediaRecorder as any).isTypeSupported = jest.fn((mimeType) => {
    return mimeType === 'audio/webm' || mimeType === 'audio/mp4';
  });
  return mockMediaRecorderInstance;
});
global.MediaRecorder = mockMediaRecorder as any;

// -- Mock MediaDevices --
global.navigator.mediaDevices = {
  ...global.navigator.mediaDevices, // Keep other properties if any
  getUserMedia: jest.fn().mockResolvedValue({
    getTracks: () => [{ stop: jest.fn() }], // Mock stream with tracks
  }),
};

// -- Mock Audio Element --
const mockAudioPlay = jest.fn().mockResolvedValue(undefined);
const mockAudioPause = jest.fn();
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();
let mockAudioSrc = '';

// Mock the constructor and methods
global.window.HTMLAudioElement.prototype.play = mockAudioPlay;
global.window.HTMLAudioElement.prototype.pause = mockAudioPause;
global.window.HTMLAudioElement.prototype.addEventListener = mockAddEventListener;
global.window.HTMLAudioElement.prototype.removeEventListener = mockRemoveEventListener;
Object.defineProperty(global.window.HTMLAudioElement.prototype, 'src', {
  get: () => mockSrc,
  set: (value) => {
    mockSrc = value;
  },
});
// Helper to simulate 'ended' event
const simulateAudioEnded = () => {
  const endedCallback = mockAddEventListener.mock.calls.find(
    (call) => call[0] === 'ended'
  )?.[1];
  if (endedCallback) {
    act(() => {
      endedCallback();
    });
  }
};

// -- Mock URL object methods --
global.URL.createObjectURL = jest.fn(() => 'blob:mockurl/12345');
global.URL.revokeObjectURL = jest.fn();


// --- Test Data ---

const mockStep1: LessonStep = {
  id: 'step-1',
  lessonId: 'lesson-1',
  stepNumber: 1,
  type: 'instruction',
  content: 'Welcome to the lesson!',
  contentAudioUrl: 'audio/welcome.mp3',
  translation: null,
  expectedAnswer: null,
  expectedAnswerAudioUrl: null,
  userResponse: null,
  userResponseHistory: null,
  attempts: 0,
  maxAttempts: 1,
  correct: false,
  lastAttemptAt: null,
  errorPatterns: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockStep2: LessonStep = {
  id: 'step-2',
  lessonId: 'lesson-1',
  stepNumber: 2,
  type: 'practice',
  content: 'Say "Hello"',
  contentAudioUrl: 'audio/say_hello.mp3',
  translation: 'Hallo',
  expectedAnswer: 'Hello',
  expectedAnswerAudioUrl: 'audio/hello_answer.mp3',
  userResponse: null,
  userResponseHistory: null,
  attempts: 0,
  maxAttempts: 3,
  correct: false,
  lastAttemptAt: null,
  errorPatterns: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockStep3: LessonStep = {
  id: 'step-3',
  lessonId: 'lesson-1',
  stepNumber: 3,
  type: 'summary',
  content: 'Great job!',
  contentAudioUrl: 'audio/summary.mp3',
  translation: null,
  expectedAnswer: null,
  expectedAnswerAudioUrl: null,
  userResponse: null,
  userResponseHistory: null,
  attempts: 0,
  maxAttempts: 1,
  correct: false,
  lastAttemptAt: null,
  errorPatterns: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockLesson: LessonModel = {
  id: 'lesson-1',
  userId: 'user-1',
  lessonId: 'lesson-id-1', // Added missing property
  focusArea: 'Greetings',
  targetSkills: ['speaking', 'listening'],
  performanceMetrics: null,
  completed: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  steps: [mockStep1, mockStep2, mockStep3],
  audioMetrics: null,
  sessionRecordingUrl: null,
};

const mockAssessmentLesson: AssessmentLesson = {
  id: 'assess-1',
  userId: 'user-1',
  description: 'Assessment',
  completed: false,
  sourceLanguage: 'English',
  targetLanguage: 'German',
  metrics: null,
  proposedTopics: [],
  summary: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  steps: [
      { ...mockStep1, id: 'assess-step-1', type: 'instruction', assessmentId: 'assess-1' } as AssessmentStep,
      { ...mockStep2, id: 'assess-step-2', type: 'question', assessmentId: 'assess-1', expectedAnswer: 'Hallo' } as AssessmentStep,
      { ...mockStep3, id: 'assess-step-3', type: 'summary', assessmentId: 'assess-1' } as AssessmentStep,
  ],
  audioMetrics: null,
  sessionRecordingUrl: null,
};

// --- Test Suite ---

describe('LessonChat Component', () => {
  let mockOnComplete: jest.Mock;
  let mockOnStepComplete: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnComplete = jest.fn();
    mockOnStepComplete = jest.fn().mockImplementation(async (step, response) => {
        // Default mock: assume correct response for progression
        return { ...step, userResponse: response, correct: true, attempts: (step.attempts || 0) + 1 };
    });

    // Reset mock states
    mockAudioSrc = '';
    mockMediaRecorderChunks = [];
    if (mockRecognitionInstance) {
        mockRecognitionInstance.onstart = null;
        mockRecognitionInstance.onresult = null;
        mockRecognitionInstance.onerror = null;
        mockRecognitionInstance.onend = null;
    }
     if (mockMediaRecorderInstance) {
        mockMediaRecorderInstance.ondataavailable = null;
        mockMediaRecorderInstance.onstop = null;
        mockMediaRecorderInstance.onerror = null;
        mockMediaRecorderInstance.state = 'inactive';
     }

    // Reset timers
    jest.useFakeTimers();
  });

   afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
   });

  // --- Rendering and Initialization ---

  it('renders correctly with initial lesson data', () => {
    render(
      <LessonChat
        lesson={mockLesson}
        onComplete={mockOnComplete}
        onStepComplete={mockOnStepComplete}
        loading={false}
        targetLanguage="English"
      />
    );

    // Header
    expect(screen.getByText('Back to Lessons')).toBeInTheDocument();
    expect(screen.getByText(`Lesson: ${mockLesson.focusArea}`)).toBeInTheDocument();
    // Progress Bar
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    // Initial Prompt
    expect(screen.getByText(mockStep1.content)).toBeInTheDocument(); // First step content
    // Input Area
    expect(screen.getByPlaceholderText('Type your response or use the microphone...')).toBeInTheDocument();
    expect(screen.getByLabelText('Toggle Microphone')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit Response' })).toBeInTheDocument();
  });

  it('renders correctly in assessment mode', () => {
    render(
      <LessonChat
        lesson={mockAssessmentLesson}
        onComplete={mockOnComplete}
        onStepComplete={mockOnStepComplete}
        loading={false}
        targetLanguage="German"
        isAssessment={true}
      />
    );

    expect(screen.getByText('Back to Assessment')).toBeInTheDocument();
    expect(screen.getByText('Language Assessment')).toBeInTheDocument();
    // Initial Prompt (from assessment lesson)
    expect(screen.getByText(mockAssessmentLesson.steps[0].content)).toBeInTheDocument();
  });

   it('renders loading state', () => {
      render(
        <LessonChat
          lesson={mockLesson}
          onComplete={mockOnComplete}
          onStepComplete={mockOnStepComplete}
          loading={true} // Loading is true
          targetLanguage="English"
        />
      );
      // Submit button should be disabled during loading
      expect(screen.getByRole('button', { name: 'Submit Response' })).toBeDisabled();
      // Mic button might also be disabled or show loading indicator (depending on exact UI)
      // For now, check submit button is enough
   });

   it('rehydrates chat history correctly', () => {
      const lessonWithHistory: LessonModel = {
         ...mockLesson,
         steps: [
           { ...mockStep1, userResponse: 'Acknowledged' }, // Step 1 completed
           mockStep2, // Step 2 is next
           mockStep3,
         ],
      };

      render(
        <LessonChat
          lesson={lessonWithHistory}
          onComplete={mockOnComplete}
          onStepComplete={mockOnStepComplete}
          loading={false}
          targetLanguage="English"
        />
      );

      // Check history: Step 1 prompt, Step 1 response, Step 2 prompt
      expect(screen.getByText(mockStep1.content)).toBeInTheDocument();
      expect(screen.getByText('Acknowledged')).toBeInTheDocument(); // Response for step 1
      expect(screen.getByText(mockStep2.content)).toBeInTheDocument(); // Prompt for step 2 (current)
      expect(screen.queryByText(mockStep3.content)).not.toBeInTheDocument(); // Step 3 prompt shouldn't show yet
   });


  // --- User Input and Interaction ---

  it('allows user to type in the input field', async () => {
    render(
      <LessonChat
        lesson={mockLesson}
        onComplete={mockOnComplete}
        onStepComplete={mockOnStepComplete}
        loading={false}
        targetLanguage="English"
      />
    );
    const input = screen.getByPlaceholderText('Type your response or use the microphone...');
    await userEvent.type(input, 'My test response');
    expect(input).toHaveValue('My test response');
    // Submit button should be enabled
    expect(screen.getByRole('button', { name: 'Submit Response' })).toBeEnabled();
  });

  it('toggles microphone listening state and recording state', async () => {
    render(
      <LessonChat
        lesson={mockLesson}
        onComplete={mockOnComplete}
        onStepComplete={mockOnStepComplete}
        loading={false}
        targetLanguage="English"
      />
    );
    const micButton = screen.getByLabelText('Toggle Microphone');

    // Initial state: Not listening
    expect(micButton).toHaveAttribute('aria-pressed', 'false');
    expect(mockRecognitionInstance).toBeUndefined(); // Recognition not initialized until first click usually
    expect(mockMediaRecorderInstance).toBeDefined(); // Recorder initialized on mount
    expect(mockMediaRecorderInstance.state).toBe('inactive');


    // Click to start listening
    await act(async () => {
       userEvent.click(micButton);
    });

    // Need waitFor because state updates and effects might be async
    await waitFor(() => {
       expect(micButton).toHaveAttribute('aria-pressed', 'true');
    });
    expect(mockRecognitionInstance.start).toHaveBeenCalledTimes(1);
    expect(mockMediaRecorderInstance.start).toHaveBeenCalledTimes(1);
    // Simulate recorder state change if needed by UI
    mockMediaRecorderInstance.state = 'recording';


    // Click to stop listening
    await act(async () => {
       userEvent.click(micButton);
    });

    await waitFor(() => {
       expect(micButton).toHaveAttribute('aria-pressed', 'false');
    });
    expect(mockRecognitionInstance.stop).toHaveBeenCalledTimes(1);
    expect(mockMediaRecorderInstance.pause).toHaveBeenCalledTimes(1);
     // Simulate recorder state change
     mockMediaRecorderInstance.state = 'paused';
  });

  it('updates input field on speech recognition result', async () => {
    render(
      <LessonChat
        lesson={mockLesson}
        onComplete={mockOnComplete}
        onStepComplete={mockOnStepComplete}
        loading={false}
        targetLanguage="English"
      />
    );
    const micButton = screen.getByLabelText('Toggle Microphone');
    const input = screen.getByPlaceholderText('Type your response or use the microphone...');

    // Start listening
    await act(async () => {
       userEvent.click(micButton);
    });
    await waitFor(() => expect(mockRecognitionInstance.start).toHaveBeenCalled());

    // Simulate speech result
    act(() => {
      mockRecognitionInstance._simulateResult('This is speech');
    });

    expect(input).toHaveValue('This is speech');
  });

  it('submits response via button click', async () => {
    // Advance to step 2 (practice step)
    const lessonAtStep2: LessonModel = {
        ...mockLesson,
        steps: [
            { ...mockStep1, userResponse: 'Ack' },
            mockStep2,
            mockStep3,
        ],
    };
    render(
      <LessonChat
        lesson={lessonAtStep2}
        onComplete={mockOnComplete}
        onStepComplete={mockOnStepComplete}
        loading={false}
        targetLanguage="English"
      />
    );
    const input = screen.getByPlaceholderText('Type your response or use the microphone...');
    const submitButton = screen.getByRole('button', { name: 'Submit Response' });

    // Type response and submit
    await userEvent.type(input, 'Hello');
    await act(async () => {
      userEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockOnStepComplete).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'step-2' }), // The current step (step 2)
        'Hello' // The user response
      );
    });
  });

  // --- Step Progression ---

  it('advances to the next step on successful submission', async () => {
     // Start at step 2
     const lessonAtStep2: LessonModel = {
        ...mockLesson,
        steps: [
            { ...mockStep1, userResponse: 'Ack' },
            mockStep2,
            mockStep3,
        ],
     };
     // Mock onStepComplete to return success for step 2
     mockOnStepComplete.mockResolvedValueOnce({ ...mockStep2, userResponse: 'Hello', correct: true, attempts: 1 });

     render(
       <LessonChat
         lesson={lessonAtStep2}
         onComplete={mockOnComplete}
         onStepComplete={mockOnStepComplete}
         loading={false}
         targetLanguage="English"
       />
     );
     const input = screen.getByPlaceholderText('Type your response or use the microphone...');
     const submitButton = screen.getByRole('button', { name: 'Submit Response' });

     // Submit step 2
     await userEvent.type(input, 'Hello');
     await act(async () => {
       userEvent.click(submitButton);
     });

     // Wait for state updates and effects
     await waitFor(() => {
       // Check if step 3 prompt is now visible
       expect(screen.getByText(mockStep3.content)).toBeInTheDocument();
     });
     // Check if input field is cleared
     expect(input).toHaveValue('');
     // Check chat history includes the response and the new prompt
     expect(screen.getByText('Hello')).toBeInTheDocument(); // User response for step 2
  });

  it('does not advance if onStepComplete returns incorrect', async () => {
     const lessonAtStep2: LessonModel = {
        ...mockLesson,
        steps: [
            { ...mockStep1, userResponse: 'Ack' },
            mockStep2,
            mockStep3,
        ],
     };
     // Mock onStepComplete to return incorrect for step 2
     mockOnStepComplete.mockResolvedValueOnce({ ...mockStep2, userResponse: 'Wrong', correct: false, attempts: 1 });

     render(
       <LessonChat
         lesson={lessonAtStep2}
         onComplete={mockOnComplete}
         onStepComplete={mockOnStepComplete}
         loading={false}
         targetLanguage="English"
       />
     );
     const input = screen.getByPlaceholderText('Type your response or use the microphone...');
     const submitButton = screen.getByRole('button', { name: 'Submit Response' });

     await userEvent.type(input, 'Wrong');
     await act(async () => {
       userEvent.click(submitButton);
     });

     await waitFor(() => {
       expect(mockOnStepComplete).toHaveBeenCalledWith(expect.objectContaining({ id: 'step-2' }), 'Wrong');
     });

     // Check that step 3 prompt is NOT visible
     expect(screen.queryByText(mockStep3.content)).not.toBeInTheDocument();
     // Check that step 2 prompt IS still visible (or re-rendered)
     expect(screen.getByText(mockStep2.content)).toBeInTheDocument();
     // Input should be cleared even on incorrect
     expect(input).toHaveValue('');
  });

  it('auto-advances instruction/summary/feedback steps', async () => {
     // Start at step 1 (instruction)
     render(
       <LessonChat
         lesson={mockLesson} // Starts with step 1
         onComplete={mockOnComplete}
         onStepComplete={mockOnStepComplete}
         loading={false}
         targetLanguage="English"
       />
     );

     // Simulate user interaction to allow auto-advance
     const micButton = screen.getByLabelText('Toggle Microphone');
     await act(async () => { userEvent.click(micButton); }); // Click mic once
     await act(async () => { userEvent.click(micButton); }); // Click mic again to stop

     // Simulate audio ending for step 1
     simulateAudioEnded();

     // Wait for the automatic submission and advancement
     await waitFor(() => {
       // onStepComplete should be called for the instruction step
       expect(mockOnStepComplete).toHaveBeenCalledWith(
         expect.objectContaining({ id: 'step-1' }),
         'Acknowledged' // Default response for auto-advance
       );
     });

     // Wait for the UI to update to the next step
     await waitFor(() => {
       // Check if step 2 prompt is now visible
       expect(screen.getByText(mockStep2.content)).toBeInTheDocument();
     });
  });


  it('calls onComplete when the last step is completed', async () => {
     // Start at step 3 (summary), assuming step 1 and 2 are done
     const lessonAtStep3: LessonModel = {
        ...mockLesson,
        steps: [
            { ...mockStep1, userResponse: 'Ack' },
            { ...mockStep2, userResponse: 'Hello', correct: true },
            mockStep3, // Current step is summary
        ],
     };
      // Mock step 3 completion
     mockOnStepComplete.mockResolvedValueOnce({ ...mockStep3, userResponse: 'Acknowledged', correct: true, attempts: 1 });

     render(
       <LessonChat
         lesson={lessonAtStep3}
         onComplete={mockOnComplete}
         onStepComplete={mockOnStepComplete}
         loading={false}
         targetLanguage="English"
       />
     );

     // Simulate user interaction
     const micButton = screen.getByLabelText('Toggle Microphone');
     await act(async () => { userEvent.click(micButton); });
     await act(async () => { userEvent.click(micButton); });

     // Simulate audio ending for step 3 (summary step)
     simulateAudioEnded();

     // Wait for the automatic submission of the summary step
     await waitFor(() => {
       expect(mockOnStepComplete).toHaveBeenCalledWith(
         expect.objectContaining({ id: 'step-3' }),
         'Acknowledged'
       );
     });

     // Wait for recording to stop and onComplete to be called
     // This depends on the useEffect watching fullSessionRecording
     // Simulate recorder stopping and providing data
     const mockRecordingBlob = new Blob(['audio data'], { type: 'audio/webm' }) as RecordingBlob;
     mockRecordingBlob.recordingTime = 1234;
     mockRecordingBlob.recordingSize = 10;

     act(() => {
       if (mockMediaRecorderInstance?.onstop) {
         mockMediaRecorderInstance.onstop({ data: mockRecordingBlob });
       }
     });

     await waitFor(() => {
       expect(mockMediaRecorderInstance.stop).toHaveBeenCalled();
       // onComplete should be called with the recording blob
       expect(mockOnComplete).toHaveBeenCalledWith(expect.any(Blob));
       // Check blob properties if necessary
       const receivedBlob = mockOnComplete.mock.calls[0][0] as RecordingBlob;
       expect(receivedBlob.size).toBeGreaterThan(0);
       // Note: Exact recordingTime/Size might be hard to assert precisely due to Date.now()
       expect(receivedBlob).toHaveProperty('recordingTime');
       expect(receivedBlob).toHaveProperty('recordingSize');
     });
  });


  // --- Audio Playback ---

  it('queues and plays audio for steps after user interaction', async () => {
    render(
      <LessonChat
        lesson={mockLesson} // Starts at step 1
        onComplete={mockOnComplete}
        onStepComplete={mockOnStepComplete}
        loading={false}
        targetLanguage="English"
      />
    );

    // No audio initially
    expect(mockAudioPlay).not.toHaveBeenCalled();

    // Simulate user interaction (e.g., clicking mic)
    const micButton = screen.getByLabelText('Toggle Microphone');
    await act(async () => {
      userEvent.click(micButton);
    });
     // Need to wait for state update triggered by interaction
     await waitFor(() => {
        // Now audio for step 1 should be queued and played
        expect(mockAudioPlay).toHaveBeenCalledTimes(1);
     });
     expect(mockAudioSrc).toBe(mockStep1.contentAudioUrl);

     // Simulate audio ending
     simulateAudioEnded();

     // Wait for auto-advance of step 1
     await waitFor(() => {
       expect(mockOnStepComplete).toHaveBeenCalledWith(expect.objectContaining({ id: 'step-1' }), 'Acknowledged');
     });

     // Wait for step 2 to become active and its audio to play
     await waitFor(() => {
        // Step 2 has content audio AND expected answer audio
        expect(mockAudioPlay).toHaveBeenCalledTimes(2); // Called again for step 2
        expect(mockAudioSrc).toBe(mockStep2.contentAudioUrl); // First plays content audio
     });

      // Simulate step 2 content audio ending
      simulateAudioEnded();

      // Wait for step 2 expected answer audio to play
      await waitFor(() => {
         expect(mockAudioPlay).toHaveBeenCalledTimes(3); // Called again for step 2 answer
         expect(mockAudioSrc).toBe(mockStep2.expectedAnswerAudioUrl); // Now plays expected answer audio
      });
  });

  // --- Recording ---

  it('creates a recording blob on completion', async () => {
     // Similar setup to the onComplete test
     const lessonAtStep3: LessonModel = {
        ...mockLesson,
        steps: [
            { ...mockStep1, userResponse: 'Ack' },
            { ...mockStep2, userResponse: 'Hello', correct: true },
            mockStep3,
        ],
     };
     mockOnStepComplete.mockResolvedValueOnce({ ...mockStep3, userResponse: 'Acknowledged', correct: true, attempts: 1 });

     render(
       <LessonChat
         lesson={lessonAtStep3}
         onComplete={mockOnComplete}
         onStepComplete={mockOnStepComplete}
         loading={false}
         targetLanguage="English"
       />
     );

     // Interact and complete step 3
     const micButton = screen.getByLabelText('Toggle Microphone');
     await act(async () => { userEvent.click(micButton); }); // Start recording
     mockMediaRecorderInstance.state = 'recording';
     await act(async () => { userEvent.click(micButton); }); // Pause recording
     mockMediaRecorderInstance.state = 'paused';
     simulateAudioEnded(); // Trigger auto-completion of step 3

     // Wait for step 3 to be marked complete
     await waitFor(() => {
       expect(mockOnStepComplete).toHaveBeenCalledWith(expect.objectContaining({ id: 'step-3' }), 'Acknowledged');
     });

     // Simulate recorder stop and data available
     const mockAudioChunk = new Blob(['chunk1'], { type: 'audio/webm' });
     act(() => {
       if (mockMediaRecorderInstance?.ondataavailable) {
         mockMediaRecorderInstance.ondataavailable({ data: mockAudioChunk });
       }
       if (mockMediaRecorderInstance?.onstop) {
         mockMediaRecorderInstance.onstop({}); // Trigger stop event
       }
     });

     // Wait for onComplete to be called with the blob
     await waitFor(() => {
       expect(mockOnComplete).toHaveBeenCalledTimes(1);
       const receivedBlob = mockOnComplete.mock.calls[0][0] as RecordingBlob;
       expect(receivedBlob).toBeInstanceOf(Blob);
       expect(receivedBlob.size).toBe(mockAudioChunk.size);
       expect(receivedBlob.type).toBe('audio/webm');
       expect(receivedBlob).toHaveProperty('recordingTime');
       expect(receivedBlob).toHaveProperty('recordingSize');
       expect(receivedBlob.recordingSize).toBe(mockAudioChunk.size);
     });
  });

  // --- Navigation ---

  it('calls router.push when back button is clicked (Lesson)', async () => {
    render(
      <LessonChat
        lesson={mockLesson}
        onComplete={mockOnComplete}
        onStepComplete={mockOnStepComplete}
        loading={false}
        targetLanguage="English"
        isAssessment={false} // Explicitly lesson mode
      />
    );
    const backButton = screen.getByText('Back to Lessons');
    await userEvent.click(backButton);
    expect(mockRouterPush).toHaveBeenCalledWith('/app/lessons');
  });

  it('calls router.push when back button is clicked (Assessment)', async () => {
    render(
      <LessonChat
        lesson={mockAssessmentLesson}
        onComplete={mockOnComplete}
        onStepComplete={mockOnStepComplete}
        loading={false}
        targetLanguage="German"
        isAssessment={true} // Explicitly assessment mode
      />
    );
    const backButton = screen.getByText('Back to Assessment');
    await userEvent.click(backButton);
    expect(mockRouterPush).toHaveBeenCalledWith('/app/onboarding');
  });

   // --- Silence Detection (Indirect Test) ---
   it('submits response automatically after silence', async () => {
      // Start at step 2
      const lessonAtStep2: LessonModel = {
         ...mockLesson,
         steps: [
             { ...mockStep1, userResponse: 'Ack' },
             mockStep2,
             mockStep3,
         ],
      };
      render(
        <LessonChat
          lesson={lessonAtStep2}
          onComplete={mockOnComplete}
          onStepComplete={mockOnStepComplete}
          loading={false}
          targetLanguage="English"
        />
      );
      const micButton = screen.getByLabelText('Toggle Microphone');

      // Start listening
      await act(async () => { userEvent.click(micButton); });
      await waitFor(() => expect(mockRecognitionInstance.start).toHaveBeenCalled());

      // Simulate speech result (triggers silence timer setup)
      act(() => {
        mockRecognitionInstance._simulateResult('Hello');
      });
      expect(screen.getByPlaceholderText('Type your response or use the microphone...')).toHaveValue('Hello');

      // Fast-forward timers past the silence threshold
      act(() => {
         jest.advanceTimersByTime(1100); // Advance by more than SILENCE_TIMEOUT_MS (1000)
      });

      // Check if onStepComplete was called due to silence
      await waitFor(() => {
        expect(mockOnStepComplete).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'step-2' }),
          'Hello'
        );
      });
   });


  // --- Mock Mode (Requires setting ENV var) ---
  // To run these, you might need to set NEXT_PUBLIC_MOCK_USER_RESPONSES='true'
  // either globally for the test suite or setup/teardown for these specific tests.
  describe('Mock Mode', () => {
     const originalEnv = process.env;

     beforeAll(() => {
       process.env = { ...originalEnv, NEXT_PUBLIC_MOCK_USER_RESPONSES: 'true' };
     });

     afterAll(() => {
       process.env = originalEnv;
     });

     beforeEach(() => {
        // Re-render or ensure component picks up env var change if needed
        // This might require more complex setup depending on how env vars are consumed
     });

     it('renders mock buttons in mock mode', () => {
        render(
          <LessonChat
            lesson={mockLesson}
            onComplete={mockOnComplete}
            onStepComplete={mockOnStepComplete}
            loading={false}
            targetLanguage="English"
          />
        );
        expect(screen.getByRole('button', { name: 'Mock Correct Response' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Mock Incorrect Response' })).toBeInTheDocument();
     });

     it('handles mock correct response click', async () => {
         const lessonAtStep2: LessonModel = {
             ...mockLesson,
             steps: [
                 { ...mockStep1, userResponse: 'Ack' },
                 mockStep2, // Current step
                 mockStep3,
             ],
         };
         render(
           <LessonChat
             lesson={lessonAtStep2}
             onComplete={mockOnComplete}
             onStepComplete={mockOnStepComplete}
             loading={false}
             targetLanguage="English"
           />
         );
         const mockCorrectButton = screen.getByRole('button', { name: 'Mock Correct Response' });

         await act(async () => {
           userEvent.click(mockCorrectButton);
         });

         await waitFor(() => {
           expect(mockOnStepComplete).toHaveBeenCalledWith(
             expect.objectContaining({ id: 'step-2' }),
             mockStep2.expectedAnswer // Should submit the expected answer
           );
         });
         // Check advancement
         await waitFor(() => {
           expect(screen.getByText(mockStep3.content)).toBeInTheDocument();
         });
     });

     it('handles mock incorrect response click', async () => {
        const lessonAtStep2: LessonModel = {
            ...mockLesson,
            steps: [
                { ...mockStep1, userResponse: 'Ack' },
                mockStep2, // Current step
                mockStep3,
            ],
        };
        // Mock step completion to return incorrect
        mockOnStepComplete.mockResolvedValueOnce({ ...mockStep2, correct: false, attempts: 1 });

        render(
          <LessonChat
            lesson={lessonAtStep2}
            onComplete={mockOnComplete}
            onStepComplete={mockOnStepComplete}
            loading={false}
            targetLanguage="English"
          />
        );
        const mockIncorrectButton = screen.getByRole('button', { name: 'Mock Incorrect Response' });

        await act(async () => {
          userEvent.click(mockIncorrectButton);
        });

        await waitFor(() => {
          expect(mockOnStepComplete).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'step-2' }),
            'This is a mock response different from the expected' // The hardcoded incorrect mock response
          );
        });
         // Check NO advancement
        expect(screen.queryByText(mockStep3.content)).not.toBeInTheDocument();
        expect(screen.getByText(mockStep2.content)).toBeInTheDocument();
     });

     it('shows and handles recording playback button in mock mode after completion', async () => {
        // Setup similar to completion test, but in mock mode
        const lessonAtStep3: LessonModel = {
            ...mockLesson,
            steps: [
                { ...mockStep1, userResponse: 'Ack' },
                { ...mockStep2, userResponse: 'Hello', correct: true },
                mockStep3,
            ],
        };
        mockOnStepComplete.mockResolvedValueOnce({ ...mockStep3, userResponse: 'Acknowledged', correct: true, attempts: 1 });

        render(
          <LessonChat
            lesson={lessonAtStep3}
            onComplete={mockOnComplete}
            onStepComplete={mockOnStepComplete}
            loading={false}
            targetLanguage="English"
          />
        );

        // Complete the lesson (e.g., via mock button or auto-advance)
        const mockCorrectButton = screen.getByRole('button', { name: 'Mock Correct Response' }); // Use mock button to finish step 3
        await act(async () => { userEvent.click(mockCorrectButton); });

        // Simulate recorder stop and data available
        const mockRecordingBlob = new Blob(['audio data'], { type: 'audio/webm' }) as RecordingBlob;
        act(() => {
          if (mockMediaRecorderInstance?.onstop) {
            mockMediaRecorderInstance.onstop({ data: mockRecordingBlob });
          }
        });

        // Wait for playback button to appear
        let playbackButton: HTMLElement;
        await waitFor(() => {
          playbackButton = screen.getByRole('button', { name: /Play Recording/i });
          expect(playbackButton).toBeInTheDocument();
          expect(global.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
        });

        // Simulate clicking play
        await act(async () => { userEvent.click(playbackButton); });
        expect(mockAudioPlay).toHaveBeenCalledTimes(1); // Should call play on the recording audio element
        await waitFor(() => {
           expect(screen.getByRole('button', { name: /Pause Recording/i })).toBeInTheDocument();
        });

         // Simulate clicking pause
         const pauseButton = screen.getByRole('button', { name: /Pause Recording/i });
         await act(async () => { userEvent.click(pauseButton); });
         expect(mockAudioPause).toHaveBeenCalledTimes(1);
         await waitFor(() => {
            expect(screen.getByRole('button', { name: /Play Recording/i })).toBeInTheDocument();
         });
     });

      it('shows and handles complete lesson button in mock mode', async () => {
         // Setup similar to completion test
         const lessonAtStep3: LessonModel = {
             ...mockLesson,
             steps: [
                 { ...mockStep1, userResponse: 'Ack' },
                 { ...mockStep2, userResponse: 'Hello', correct: true },
                 mockStep3,
             ],
         };
         mockOnStepComplete.mockResolvedValueOnce({ ...mockStep3, userResponse: 'Acknowledged', correct: true, attempts: 1 });

         render(
           <LessonChat
             lesson={lessonAtStep3}
             onComplete={mockOnComplete}
             onStepComplete={mockOnStepComplete}
             loading={false}
             targetLanguage="English"
           />
         );

         // Complete the lesson (e.g., via mock button)
         const mockCorrectButton = screen.getByRole('button', { name: 'Mock Correct Response' });
         await act(async () => { userEvent.click(mockCorrectButton); });

         // Wait for the "Complete Lesson" button to appear (lessonReadyToComplete state)
         let completeButton: HTMLElement;
         await waitFor(() => {
            completeButton = screen.getByRole('button', { name: 'Complete Lesson' });
            expect(completeButton).toBeInTheDocument();
            // onComplete should NOT have been called yet
            expect(mockOnComplete).not.toHaveBeenCalled();
         });

          // Simulate recorder stop and data available (needed for onComplete call)
         const mockRecordingBlob = new Blob(['audio data'], { type: 'audio/webm' }) as RecordingBlob;
         mockRecordingBlob.recordingTime = 500;
         mockRecordingBlob.recordingSize = 10;
         act(() => {
           if (mockMediaRecorderInstance?.onstop) {
             mockMediaRecorderInstance.onstop({ data: mockRecordingBlob });
           }
         });

         // Click the complete button
         await act(async () => { userEvent.click(completeButton); });

         // Now onComplete should be called
         await waitFor(() => {
           expect(mockOnComplete).toHaveBeenCalledWith(expect.any(Blob));
         });
         // Button should disappear
         expect(screen.queryByRole('button', { name: 'Complete Lesson' })).not.toBeInTheDocument();
      });
  });

});
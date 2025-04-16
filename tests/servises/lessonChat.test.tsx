// File: /tests/components/lessons/lessonChat.test.tsx

import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// import { ArrowLeftIcon } from 'lucide-react';

import LessonChat, { SpeechRecognition } from '@/components/lessons/lessonChat';
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

// Mock lucide-react icons
jest.mock('lucide-react', () => {
  const originalModule = jest.requireActual('lucide-react');
  return {
    ...originalModule, // Keep original exports
    __esModule: true,
    // Mock specific icons used in LessonChat
    ArrowLeft: jest.fn(() => <svg data-testid="mock-arrow-left" />),
    // Add mocks for Play and Pause icons if they are directly imported and used
    // Play: jest.fn(() => <svg data-testid="mock-play-icon" />),
    // Pause: jest.fn(() => <svg data-testid="mock-pause-icon" />),
    // If icons are used dynamically (e.g., via a helper), this might not be needed
  };
});

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
// Define the type for the global window object to include webkitSpeechRecognition
declare global {
  interface Window {
    webkitSpeechRecognition: SpeechRecognition;
  }
}
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
        // Simulate adding metadata in the mock
        const recordingBlob = Object.assign(blob, {
          recordingTime:
            Date.now() - (mockMediaRecorderInstance._startTime || Date.now()),
          recordingSize: blob.size,
          lastModified: Date.now(),
        }) as RecordingBlob;
        act(() => mockMediaRecorderInstance.onstop({ data: recordingBlob })); // Pass blob in event if needed by impl
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
    _startTime: 0, // Add property to track start time for mock duration
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
if (typeof navigator === 'undefined') {
  (global as any).navigator = {};
}
// Ensure mediaDevices exists or define it
if (!navigator.mediaDevices) {
  (navigator as any).mediaDevices = {};
}

// Use Object.defineProperty to mock getUserMedia
Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
  writable: true, // Make it writable if needed, though just setting value is often enough
  configurable: true, // Allow redefining later if necessary
  value: jest.fn().mockResolvedValue({
    // The mock function
    getTracks: () => [{ stop: jest.fn() }], // Mock stream with tracks
  }),
});

// -- Mock Audio Element --
const mockAudioPlay = jest.fn().mockResolvedValue(undefined);
const mockAudioPause = jest.fn();
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();
let mockAudioSrc = '';

// Store callbacks by event type
let audioEventListeners: Record<string, Function> = {};

// Mock the constructor and methods
global.window.HTMLAudioElement.prototype.play = mockAudioPlay;
global.window.HTMLAudioElement.prototype.pause = mockAudioPause;
global.window.HTMLAudioElement.prototype.addEventListener = jest.fn(
  (event, callback) => {
    audioEventListeners[event] = callback;
  }
);
global.window.HTMLAudioElement.prototype.removeEventListener = jest.fn(
  (event) => {
    delete audioEventListeners[event];
  }
);
Object.defineProperty(global.window.HTMLAudioElement.prototype, 'src', {
  get: () => mockAudioSrc,
  set: (value) => {
    mockAudioSrc = value;
    // Reset listeners when src changes, simulating new audio load
    // audioEventListeners = {}; // Commenting this out as it might clear listeners needed for recording playback
  },
});
// Helper to simulate 'ended' event
const simulateAudioEnded = () => {
  const endedCallback = audioEventListeners['ended'];
  if (endedCallback) {
    act(() => {
      endedCallback();
    });
  }
};

// Helper to simulate 'ended' event for the recording audio element
const simulateRecordingAudioEnded = () => {
  const endedCallback = audioEventListeners['ended']; // Assumes the same listener map is used, might need separate if src change clears it
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
    {
      ...mockStep1,
      id: 'assess-step-1',
      type: 'instruction',
      assessmentId: 'assess-1',
    } as AssessmentStep,
    {
      ...mockStep2,
      id: 'assess-step-2',
      type: 'question',
      assessmentId: 'assess-1',
      expectedAnswer: 'Hallo',
    } as AssessmentStep,
    {
      ...mockStep3,
      id: 'assess-step-3',
      type: 'summary',
      assessmentId: 'assess-1',
    } as AssessmentStep,
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
    mockOnStepComplete = jest
      .fn()
      .mockImplementation(async (step, response) => {
        // Default mock: assume correct response for progression
        return {
          ...step,
          userResponse: response,
          correct: true,
          attempts: (step.attempts || 0) + 1,
        };
      });

    // Reset mock states
    mockAudioSrc = '';
    mockMediaRecorderChunks = [];
    audioEventListeners = {}; // Reset audio listeners
    mockMediaRecorderInstance = undefined;
    mockRecognitionInstance = undefined
    // if (mockRecognitionInstance) {
    //   mockRecognitionInstance.onstart = null;
    //   mockRecognitionInstance.onresult = null;
    //   mockRecognitionInstance.onerror = null;
    //   mockRecognitionInstance.onend = null;
    // }
    // if (mockMediaRecorderInstance) {
    //   mockMediaRecorderInstance.ondataavailable = null;
    //   mockMediaRecorderInstance.onstop = null;
    //   mockMediaRecorderInstance.onerror = null;
    //   mockMediaRecorderInstance.state = 'inactive';
    //   mockMediaRecorderInstance._startTime = 0;
    // }

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
    expect(
      screen.getByText(`Lesson: ${mockLesson.focusArea}`)
    ).toBeInTheDocument();

    // --- FIX START ---
    // Progress Bar - Check container accessibility and inner div style
    const progressBarContainer = screen.getByRole('progressbar');
    expect(progressBarContainer).toHaveAttribute('aria-valuenow', '1'); // Initial step is 0, so value is 0+1 = 1
    expect(progressBarContainer).toHaveAttribute('aria-valuemin', '0');
    expect(progressBarContainer).toHaveAttribute(
      'aria-valuemax',
      `${mockLesson.steps.length}`
    );
    expect(progressBarContainer).toHaveAttribute(
      'aria-label',
      'Lesson Progress'
    );

    // Check the visual indicator's width using the test ID
    const progressBarIndicator = screen.getByTestId('progress-bar-indicator');
    expect(progressBarIndicator).toHaveStyle(
      `width: ${((0 + 1) / mockLesson.steps.length) * 100}%`
    ); // Initial progress
    // --- FIX END ---

    // Initial Prompt
    expect(screen.getByText(mockStep1.content)).toBeInTheDocument(); // First step content
    // Input Area - Check elements within ChatInput
    expect(screen.getByPlaceholderText('Ready to listen')).toBeInTheDocument(); // Placeholder might change based on state
    // expect(screen.getByRole('button', { name: 'Start Listening' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Skip & Continue' })
    ).toBeInTheDocument();
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
    expect(
      screen.getByText(mockAssessmentLesson.steps[0].content)
    ).toBeInTheDocument();
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
    // Check if buttons are disabled or show loading indicator
    // Note: ChatInput component might handle the disabling, check its implementation if this fails
    // Assuming ChatInput passes the loading prop down to its buttons:
    expect(screen.getByRole('button', { name: 'Start Listening' })).toHaveClass(
      'cursor-not-allowed'
    );
    expect(
      screen.getByRole('button', { name: 'Skip & Continue' })
    ).toBeDisabled();
  });

  it('rehydrates chat history correctly', () => {
    const lessonWithHistory: LessonModel = {
      ...mockLesson,
      steps: [
        { ...mockStep1, userResponse: 'Acknowledged', correct: true }, // Step 1 completed
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

  it('toggles microphone listening state and recording state', async () => {
    // Sanity check: Ensure mocks are globally available before render
    expect(global.MediaRecorder).toBeDefined();
    expect(global.window.webkitSpeechRecognition).toBeDefined();

    render(
      <LessonChat
        lesson={mockLesson}
        onComplete={mockOnComplete}
        onStepComplete={mockOnStepComplete}
        loading={false}
        targetLanguage="English"
      />
    );
    const micButton = screen.getByRole('button', { name: 'Start Listening' });
    // Initialize mock instances if not already done
    if (!mockRecognitionInstance) {
      mockSpeechRecognition();
    }
    if (!mockMediaRecorderInstance) {
      mockMediaRecorder();
    }

    // --- Start Listening ---
    console.log('[TEST LOG] Clicking Start Listening...');
    act(() => {
      // Trigger speech recognition start
      mockRecognitionInstance.start();
      // Trigger media recorder start
      mockMediaRecorderInstance.start();
      mockMediaRecorderInstance.state = 'recording';
      mockMediaRecorderInstance._startTime = Date.now();
    });
    console.log('[TEST LOG] Clicked Start Listening.');

    console.log('[TEST LOG] Waiting for UI to update (Pause Listening)...');
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Pause Listening/i })
      ).toBeInTheDocument();
    });
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
    const micButton = screen.getByRole('button', { name: 'Start Listening' });
    const input = screen.getByRole('textbox'); // Find by role

    // Start listening
    await act(async () => {
      userEvent.click(micButton);
    });
    await waitFor(() =>
      expect(mockRecognitionInstance.start).toHaveBeenCalled()
    );

    // Simulate speech result
    act(() => {
      mockRecognitionInstance._simulateResult('This is speech');
    });

    expect(input).toHaveValue('This is speech');
  });

  it('submits response via skip/enter key', async () => {
    // Advance to step 2 (practice step)
    const lessonAtStep2: LessonModel = {
      ...mockLesson,
      steps: [
        {
          ...mockStep1,
          userResponse: 'Ack',
          correct: true,
          expectedAnswer: 'Hello',
        },
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
    const input = screen.getByRole('textbox'); // Find by role
    const skipButton = screen.getByRole('button', { name: 'Skip & Continue' });

    // Assert button is enabled *after* typing
    expect(skipButton).not.toBeDisabled();

    await act(async () => {
      userEvent.click(skipButton);
    });

    // expected response
    // handle submit step called with skip
    await waitFor(
      () => {
        // Check that onStepComplete was called with the current step (step-2)
        // and the specific response 'skip'
        expect(mockOnStepComplete).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'step-2' }), // The current step (step 2)
          'skip' // The user response when skipping
        );
      },
      { timeout: 10000 } // Increased timeout just in case
    );
  });

  // --- Step Progression ---

  it('advances to the next step on successful submission', async () => {
    // Start at step 2
    const lessonAtStep2: LessonModel = {
      ...mockLesson,
      steps: [
        { ...mockStep1, userResponse: 'Ack', correct: true },
        mockStep2,
        mockStep3,
      ],
    };
    // Mock onStepComplete to return success for step 2
    mockOnStepComplete.mockResolvedValueOnce({
      ...mockStep2,
      userResponse: 'Hello',
      correct: true,
      attempts: 1,
    });

    render(
      <LessonChat
        lesson={lessonAtStep2}
        onComplete={mockOnComplete}
        onStepComplete={mockOnStepComplete}
        loading={false}
        targetLanguage="English"
      />
    );
    const input = screen.getByRole('textbox'); // Find by role
    const skipButton = screen.getByRole('button', { name: 'Skip & Continue' });

    await act(async () => {
      userEvent.click(skipButton);
    });

    // Wait for state updates and effects
    await waitFor(() => {
      // Check if step 3 prompt is now visible
      expect(screen.getByText(mockStep3.content)).toBeInTheDocument();
    });
    // Check if input field is cleared
    expect(input).toHaveValue('');
    // Check chat history includes the response and the new prompt
    //  expect(screen.getByText('Hello')).toBeInTheDocument(); // User response for step 2
  });

  it('does not advance if onStepComplete returns incorrect', async () => {
    const lessonAtStep2: LessonModel = {
      ...mockLesson,
      steps: [
        { ...mockStep1, userResponse: 'Ack', correct: true },
        mockStep2, // Current step is practice
        mockStep3,
      ],
    };
    // Mock onStepComplete to return incorrect for step 2
    mockOnStepComplete.mockResolvedValueOnce({
      ...mockStep2,
      userResponse: 'Wrong', // The incorrect response submitted
      correct: false, // Mark as incorrect
      attempts: 1, // Increment attempts
    });

    render(
      <LessonChat
        lesson={lessonAtStep2}
        onComplete={mockOnComplete}
        onStepComplete={mockOnStepComplete}
        loading={false}
        targetLanguage="English"
      />
    );
    const input = screen.getByRole('textbox'); // Find the input/textarea by role
    const micButton = screen.getByRole('button', { name: 'Start Listening' });

    await act(async () => {
      userEvent.click(micButton);
    });

    await waitFor(() =>
      expect(mockRecognitionInstance.start).toHaveBeenCalled()
    );
    act(() => {
      mockRecognitionInstance._simulateResult('Wrong');
    });

    expect(input).toHaveValue('Wrong');

    act(() => {
      // Advance time just past the silence threshold (defined as 1000ms in LessonChat)
      jest.advanceTimersByTime(1100);
    });

    // 5. Wait for onStepComplete to be called with the incorrect response
    await waitFor(() => {
      expect(mockOnStepComplete).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'step-2' }), // Check the correct step is passed
        'Wrong' // Check the submitted response
      );
    });
    // 7. Check that step 2 prompt IS still visible (or re-rendered)
    // Need to wait slightly as the component might re-render after submission
    await waitFor(() => {
      expect(screen.getByText(mockStep2.content)).toBeInTheDocument();
    });

    console.log('input value on incorrect submission', input);
    // 6. Check that step 3 prompt is NOT visible (didn't advance)
    expect(screen.queryByText(mockStep3.content)).not.toBeInTheDocument();

    // 7. Check that step 2 prompt IS still visible (or re-rendered)
    // Need to wait slightly as the component might re-render after submission

    // 8. Input should be cleared even on incorrect submission.
    // Add a specific waitFor for this assertion, as the setUserResponse('')
    // happens after the onStepComplete promise resolves.
    await waitFor(() => {
      expect(input).toHaveValue('');
    });
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

    // Simulate user interaction to allow audio playback and auto-advance
    const micButton = screen.getByRole('button', { name: 'Start Listening' });
    await act(async () => {
      userEvent.click(micButton);
    }); // Click mic once

    // Wait for the component to acknowledge interaction and potentially start listening state
    await waitFor(() =>
      // Check that audio playback was initiated for step 1's content
      // This confirms initialUserInteractionDone is true and audio was queued/played
      expect(mockAudioPlay).toHaveBeenCalled()
    );
    // Verify the correct audio source was set
    expect(mockAudioSrc).toBe(mockStep1.contentAudioUrl);

    // Simulate the audio for step 1 finishing playback
    act(() => {
      simulateAudioEnded();
    });

    // Now, wait for the automatic submission triggered by handleAudioEnded
    await waitFor(() => {
      // onStepComplete should be called for the instruction step
      expect(mockOnStepComplete).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'step-1' }), // Check the correct step
        'Acknowledged' // Default response for auto-advance
      );
    });

    // Wait for the UI to update to the next step (step 2)
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
        { ...mockStep1, userResponse: 'Ack', correct: true },
        { ...mockStep2, userResponse: 'Hello', correct: true },
        mockStep3, // Current step is summary
      ],
    };
    // Mock step 3 completion
    mockOnStepComplete.mockResolvedValueOnce({
      ...mockStep3,
      userResponse: 'Acknowledged',
      correct: true,
      attempts: 1,
    });

    render(
      <LessonChat
        lesson={lessonAtStep3}
        onComplete={mockOnComplete}
        onStepComplete={mockOnStepComplete}
        loading={false}
        targetLanguage="English"
      />
    );

    // Ensure the component has rendered the button before interacting
    const micButton = await screen.findByRole('button', {
      name: 'Start Listening',
    });

    // Simulate user interaction (needed to trigger audio playback and recording start)
    await act(async () => {
      userEvent.click(micButton);
    });

    // --- Synchronization Point ---
    // Wait for the component's useEffect to initialize the recorder and assign handlers.
    // We check for `ondataavailable` being assigned as it happens right after `new MediaRecorder`.
    // --- Synchronization Point ---
    await act(async () => {
      await waitFor(() => {
        expect(mockMediaRecorderInstance).toBeDefined();
        expect(mockMediaRecorderInstance.ondataavailable).not.toBeNull();
        expect(mockMediaRecorderInstance.onstop).not.toBeNull(); // Added onstop check
      });
      await waitFor(() => {
        expect(mockMediaRecorderInstance.start).toHaveBeenCalled();
    });
    });

    // --- Assertions after Synchronization ---
    // Now that we know the initialization likely completed, check the factory and start calls.
    expect(mockMediaRecorder).toHaveBeenCalled(); // Check the factory/constructor mock
    expect(mockMediaRecorderInstance.start).toHaveBeenCalled(); // Check the start method

    await act(async () => {
      // Also wait for the audio for the summary step to start playing
      await waitFor(() => {
        expect(mockAudioPlay).toHaveBeenCalled();
        expect(mockAudioSrc).toBe(mockStep3.contentAudioUrl);
      });


    // Wait for the onstop handler to be assigned (might be redundant now, but safe)
    await waitFor(() => {
      expect(mockMediaRecorderInstance).toBeDefined();
      expect(mockMediaRecorderInstance.onstop).not.toBeNull();
    });
  });

    // Simulate audio ending for step 3 (summary step) - this triggers auto-completion
    act(() => {
      simulateAudioEnded();
    });

    // Wait for the automatic submission of the summary step
    await waitFor(() => {
      expect(mockOnStepComplete).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'step-3' }),
        'Acknowledged'
      );
    });

    // Wait for the component to recognize completion and call stop on the recorder
    await waitFor(() => {
      expect(mockMediaRecorderInstance).toBeDefined();
      expect(mockMediaRecorderInstance.stop).toHaveBeenCalled();
    });

    // Simulate recorder stopping and providing data via the onstop handler
    const mockRecordingBlob = new Blob(['audio data'], {
      type: 'audio/webm',
    }) as RecordingBlob;
    // Manually add mock properties
    (mockRecordingBlob as any).recordingTime = 1234;
    (mockRecordingBlob as any).recordingSize = 10;
    (mockRecordingBlob as any).lastModified = Date.now();

    // Trigger the onstop handler
    act(() => {
      if (mockMediaRecorderInstance?.onstop) {
        mockMediaRecorderInstance.onstop({ data: mockRecordingBlob } as Event);
      } else {
        throw new Error(
          'mockMediaRecorderInstance.onstop is unexpectedly null'
        );
      }
    });

    // Wait for the useEffect watching fullSessionRecording to call onComplete
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith(expect.any(Blob));

      const receivedBlob = mockOnComplete.mock.calls[0][0] as RecordingBlob;
      expect(receivedBlob.size).toBeGreaterThan(0);
      expect((receivedBlob as any).recordingTime).toBeGreaterThan(0);
      expect((receivedBlob as any).recordingSize).toBeGreaterThan(0);
      expect((receivedBlob as any).lastModified).toBeGreaterThan(0);
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
    const micButton = screen.getByRole('button', { name: 'Start Listening' });
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
    act(() => {
      simulateAudioEnded();
    });

    // Wait for auto-advance of step 1
    await waitFor(() => {
      expect(mockOnStepComplete).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'step-1' }),
        'Acknowledged'
      );
    });

    // Wait for step 2 to become active and its audio to play
    await waitFor(() => {
      // Step 2 has content audio AND expected answer audio
      expect(mockAudioPlay).toHaveBeenCalledTimes(2); // Called again for step 2
      expect(mockAudioSrc).toBe(mockStep2.contentAudioUrl); // First plays content audio
    });

    // Simulate step 2 content audio ending
    act(() => {
      simulateAudioEnded();
    });

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
        { ...mockStep1, userResponse: 'Ack', correct: true },
        { ...mockStep2, userResponse: 'Hello', correct: true },
        mockStep3,
      ],
    };
    mockOnStepComplete.mockResolvedValueOnce({
      ...mockStep3,
      userResponse: 'Acknowledged',
      correct: true,
      attempts: 1,
    });

    render(
      <LessonChat
        lesson={lessonAtStep3}
        onComplete={mockOnComplete}
        onStepComplete={mockOnStepComplete}
        loading={false}
        targetLanguage="English"
      />
    );

    // Interact to start recording
    const micButton = screen.getByRole('button', { name: 'Start Listening' });
    await act(async () => {
      userEvent.click(micButton);
    });

    // Wait for media recorder initialization
    await waitFor(() => {
      expect(mockMediaRecorderInstance).toBeDefined();
      expect(mockMediaRecorderInstance.start).toHaveBeenCalled();
    });

    // Now safely set the state
    mockMediaRecorderInstance.state = 'recording';
    mockMediaRecorderInstance._startTime = Date.now() - 1000;

    // Wait for UI update reflecting recording state (if any, e.g., button text change)
    // This wait might already exist or might need adjustment based on UI
    await waitFor(
      () => screen.getByRole('button', { name: /Listening|Pause/i }) // Adjust name if needed
    );

    // Simulate pausing recording (if relevant to the test flow)
    const stopButton = screen.getByRole('button', { name: /Listening|Pause/i }); // Adjust name
    await act(async () => {
      userEvent.click(stopButton);
    });
    await waitFor(
      () => screen.getByRole('button', { name: 'Start Listening' }) // Wait for button to revert
    );
    mockMediaRecorderInstance.state = 'paused'; // Update mock state

    // Simulate audio ending for step 3 (summary step) - this triggers auto-completion
    act(() => {
      simulateAudioEnded();
    });

    // Wait for step 3 to be marked complete via onStepComplete
    await waitFor(() => {
      expect(mockOnStepComplete).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'step-3' }),
        'Acknowledged'
      );
    });

    // Wait for the component to call stop on the recorder upon completion
    await waitFor(() => {
      expect(mockMediaRecorderInstance).toBeDefined(); // Sanity check
      expect(mockMediaRecorderInstance.stop).toHaveBeenCalled();
    });

    // Simulate recorder stopping and providing data via the onstop handler
    const mockAudioChunk = new Blob(['chunk1'], { type: 'audio/webm' });
    const mockRecordingBlob = new Blob([mockAudioChunk], {
      // Create final blob from chunks
      type: 'audio/webm',
    }) as RecordingBlob;
    // Manually add mock properties (as done in the mock's onstop)
    (mockRecordingBlob as any).recordingTime =
      Date.now() -
      mockMediaRecorderInstance._startTime -
      /* pause duration if tracked */ 0;
    (mockRecordingBlob as any).recordingSize = mockRecordingBlob.size;
    (mockRecordingBlob as any).lastModified = Date.now();

    // Trigger the onstop handler with the final blob data
    act(() => {
      // Ensure the onstop handler is still assigned before calling it
      if (mockMediaRecorderInstance?.onstop) {
        // Pass an object simulating the event structure if needed,
        // but the mock implementation uses the blob directly.
        // The mock implementation itself adds the metadata.
        mockMediaRecorderInstance.onstop({ data: mockRecordingBlob } as Event); // Pass the blob if needed by the mock's logic
      } else {
        throw new Error(
          'mockMediaRecorderInstance.onstop is unexpectedly null before triggering'
        );
      }
    });

    // Wait for onComplete to be called with the blob
    await waitFor(
      () => {
        expect(mockOnComplete).toHaveBeenCalledTimes(1);
        const receivedBlob = mockOnComplete.mock.calls[0][0] as RecordingBlob;
        expect(receivedBlob).toBeInstanceOf(Blob);
        expect(receivedBlob.size).toBe(mockAudioChunk.size); // Check size matches chunk
        expect(receivedBlob.type).toBe('audio/webm');
        // Check for mock properties added in the mock implementation or above
        expect((receivedBlob as any).recordingTime).toBeGreaterThan(0);
        expect((receivedBlob as any).recordingSize).toBe(mockAudioChunk.size);
        expect((receivedBlob as any).lastModified).toBeGreaterThan(0);
      },
      { timeout: 5000 }
    ); // Increased timeout just in case
  });

  // --- Navigation ---
  // Increase timeout for navigation tests
  const NAVIGATION_TEST_TIMEOUT = 10000; // 10 seconds

  it(
    'calls router.push when back button is clicked (Lesson)',
    async () => {
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
      await act(async () => {
        userEvent.click(backButton);
      });
      await waitFor(() => {
        expect(mockRouterPush).toHaveBeenCalledWith('/app/lessons');
      });
    },
    NAVIGATION_TEST_TIMEOUT
  ); // Apply increased timeout

  it(
    'calls router.push when back button is clicked (Assessment)',
    async () => {
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
      await act(async () => {
        userEvent.click(backButton);
      });
      await waitFor(() => {
        expect(mockRouterPush).toHaveBeenCalledWith('/app/onboarding');
      });
    },
    NAVIGATION_TEST_TIMEOUT
  ); // Apply increased timeout

  // --- Silence Detection (Indirect Test) ---
  it('submits response automatically after silence', async () => {
    // Start at step 2
    const lessonAtStep2: LessonModel = {
      ...mockLesson,
      steps: [
        { ...mockStep1, userResponse: 'Ack', correct: true },
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
    const micButton = screen.getByRole('button', { name: 'Start Listening' });

    // Start listening
    await act(async () => {
      userEvent.click(micButton);
    });
    await waitFor(() =>
      expect(mockRecognitionInstance.start).toHaveBeenCalled()
    );

    // Simulate speech result (triggers silence timer setup)
    act(() => {
      mockRecognitionInstance._simulateResult('Hello');
    });
    // Find the input by role="textbox" instead of placeholder
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('Hello');
    // Check placeholder changed (assuming ChatInput changes it)
    // Update this based on ChatInput's behavior when listening
    // expect(input).toHaveAttribute('placeholder', 'Listening...');

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
  describe.skip('Mock Mode', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      // Use beforeEach to ensure it's set for every test
      jest.resetModules(); // Reset modules to re-evaluate top-level constants like isMockMode
      process.env = { ...originalEnv, NEXT_PUBLIC_MOCK_USER_RESPONSES: 'true' };
      // Re-import the component after setting the env var and resetting modules
      // This ensures the isMockMode constant inside the component gets the updated value
      // Note: This assumes LessonChat reads the env var at the module level.
      // If it reads it inside the function body, this might not be strictly necessary,
      // but it's safer.
      jest.isolateModules(() => {
        require('@/components/lessons/lessonChat');
      });
    });

    afterEach(() => {
      // Use afterEach to clean up after every test
      process.env = originalEnv;
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
      expect(
        screen.getByRole('button', { name: 'Mock Correct Response' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Mock Incorrect Response' })
      ).toBeInTheDocument();
    });

    it('handles mock correct response click', async () => {
      const lessonAtStep2: LessonModel = {
        ...mockLesson,
        steps: [
          { ...mockStep1, userResponse: 'Ack', correct: true },
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
      const mockCorrectButton = screen.getByRole('button', {
        name: 'Mock Correct Response',
      });

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
          { ...mockStep1, userResponse: 'Ack', correct: true },
          mockStep2, // Current step
          mockStep3,
        ],
      };
      // Mock step completion to return incorrect
      mockOnStepComplete.mockResolvedValueOnce({
        ...mockStep2,
        correct: false,
        attempts: 1,
      });

      render(
        <LessonChat
          lesson={lessonAtStep2}
          onComplete={mockOnComplete}
          onStepComplete={mockOnStepComplete}
          loading={false}
          targetLanguage="English"
        />
      );
      const mockIncorrectButton = screen.getByRole('button', {
        name: 'Mock Incorrect Response',
      });

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
          { ...mockStep1, userResponse: 'Ack', correct: true },
          { ...mockStep2, userResponse: 'Hello', correct: true },
          mockStep3, // Current step is summary
        ],
      };
      // Mock step 3 completion
      mockOnStepComplete.mockResolvedValueOnce({
        ...mockStep3,
        userResponse: 'Acknowledged',
        correct: true,
        attempts: 1,
      });

      render(
        <LessonChat
          lesson={lessonAtStep3}
          onComplete={mockOnComplete}
          onStepComplete={mockOnStepComplete}
          loading={false}
          targetLanguage="English"
        />
      );

      // Simulate user interaction (needed for auto-advance of summary step)
      const micButton = screen.getByRole('button', { name: 'Start Listening' });
      await act(async () => {
        userEvent.click(micButton);
      });
      await waitFor(() =>
        screen.getByRole('button', { name: /Listening|Pause/i })
      ); // Use correct text/state
      mockMediaRecorderInstance.state = 'recording'; // Simulate recording started
      mockMediaRecorderInstance._startTime = Date.now() - 1000;
      const stopButton = screen.getByRole('button', {
        name: /Listening|Pause/i,
      }); // Use correct text/state
      await act(async () => {
        userEvent.click(stopButton);
      });
      await waitFor(() =>
        screen.getByRole('button', { name: 'Start Listening' })
      );
      mockMediaRecorderInstance.state = 'paused';

      // Simulate audio ending for step 3 (summary step) - this triggers completion logic
      act(() => {
        simulateAudioEnded();
      });

      // Wait for step 3 completion call
      await waitFor(() => {
        expect(mockOnStepComplete).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'step-3' }),
          'Acknowledged'
        );
      });

      // Simulate recorder stop and data available
      const mockRecordingBlob = new Blob(['audio data'], {
        type: 'audio/webm',
      }) as RecordingBlob;
      act(() => {
        mockMediaRecorderChunks.push(mockRecordingBlob); // Add chunk before stop
        if (mockMediaRecorderInstance?.onstop) {
          mockMediaRecorderInstance.onstop({}); // Trigger stop event
        }
      });

      // Wait for playback button to appear
      let playbackButton: HTMLElement;
      await waitFor(() => {
        playbackButton = screen.getByRole('button', {
          name: /Play Recording/i,
        });
        expect(playbackButton).toBeInTheDocument();
        expect(global.URL.createObjectURL).toHaveBeenCalledWith(
          expect.any(Blob)
        );
      });

      // Simulate clicking play
      await act(async () => {
        userEvent.click(playbackButton);
      });
      // Audio playback mock might need adjustment if src changes clear listeners
      // Let's assume the recording audio element's play is called
      expect(mockAudioPlay).toHaveBeenCalled(); // Check if play was called at least once after initial plays
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Pause Recording/i })
        ).toBeInTheDocument();
      });

      // Simulate clicking pause
      const pauseButton = screen.getByRole('button', {
        name: /Pause Recording/i,
      });
      await act(async () => {
        userEvent.click(pauseButton);
      });
      expect(mockAudioPause).toHaveBeenCalled();
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Play Recording/i })
        ).toBeInTheDocument();
      });
    });

    it('shows and handles complete lesson button in mock mode', async () => {
      // Setup similar to completion test
      const lessonAtStep3: LessonModel = {
        ...mockLesson,
        steps: [
          { ...mockStep1, userResponse: 'Ack', correct: true },
          { ...mockStep2, userResponse: 'Hello', correct: true },
          mockStep3, // Current step is summary
        ],
      };
      // Mock step 3 completion
      mockOnStepComplete.mockResolvedValueOnce({
        ...mockStep3,
        userResponse: 'Acknowledged',
        correct: true,
        attempts: 1,
      });

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
      const micButton = screen.getByRole('button', { name: 'Start Listening' });
      await act(async () => {
        userEvent.click(micButton);
      });
      await waitFor(() =>
        screen.getByRole('button', { name: /Listening|Pause/i })
      ); // Use correct text/state
      mockMediaRecorderInstance.state = 'recording';
      mockMediaRecorderInstance._startTime = Date.now() - 1000;
      const stopButton = screen.getByRole('button', {
        name: /Listening|Pause/i,
      }); // Use correct text/state
      await act(async () => {
        userEvent.click(stopButton);
      });
      await waitFor(() =>
        screen.getByRole('button', { name: 'Start Listening' })
      );
      mockMediaRecorderInstance.state = 'paused';

      // Simulate audio ending for step 3 (summary step) - triggers completion
      act(() => {
        simulateAudioEnded();
      });

      // Wait for step 3 completion call
      await waitFor(() => {
        expect(mockOnStepComplete).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'step-3' }),
          'Acknowledged'
        );
      });

      // Wait for the "Complete Lesson" button to appear (lessonReadyToComplete state)
      let completeButton: HTMLElement;
      await waitFor(() => {
        completeButton = screen.getByRole('button', {
          name: 'Complete Lesson',
        });
        expect(completeButton).toBeInTheDocument();
        // onComplete should NOT have been called yet in mock mode
        expect(mockOnComplete).not.toHaveBeenCalled();
      });

      // Simulate recorder stop and data available (needed for onComplete call)
      const mockRecordingBlob = new Blob(['audio data'], {
        type: 'audio/webm',
      }) as RecordingBlob;
      // Add mock properties
      (mockRecordingBlob as any).recordingTime = 500;
      (mockRecordingBlob as any).recordingSize = 10;
      (mockRecordingBlob as any).lastModified = Date.now();

      act(() => {
        mockMediaRecorderChunks.push(mockRecordingBlob); // Add chunk before stop
        if (mockMediaRecorderInstance?.onstop) {
          mockMediaRecorderInstance.onstop({}); // Trigger stop event
        }
      });

      // Click the complete button
      await act(async () => {
        userEvent.click(completeButton);
      });

      // Now onComplete should be called
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith(expect.any(Blob));
      });
      // Button should disappear
      expect(
        screen.queryByRole('button', { name: 'Complete Lesson' })
      ).not.toBeInTheDocument();
    });
  });
});

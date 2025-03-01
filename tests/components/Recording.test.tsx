import React, { act } from 'react';
import { renderHook } from '@testing-library/react';
import {
  useRecordingContext,
  RecordingProvider,
} from '@/context/recording-context';
import {
  SubscriptionProvider,
  useSubscription,
} from '@/context/subscription-context';
import { ErrorProvider, useError } from '@/hooks/useError';
import { ReactNode } from 'react';
import { mockDetailedResponse, mockResponse } from '@/models/AiResponse.model';

// Mock dependencies
jest.mock('@/context/subscription-context', () => ({
  useSubscription: jest.fn(),
  SubscriptionProvider: ({ children }: { children: ReactNode }) => children,
}));

// At the top of the file, define a global mock function for showError
const mockShowError = jest.fn();

jest.mock('@/hooks/useError', () => ({
  useError: () => ({
    showError: mockShowError,
  }),
  // A simple pass-through ErrorProvider:
  ErrorProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('posthog-js');
jest.mock('@supabase/supabase-js');

// Add this mock implementation above your beforeEach blocks
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

require('@supabase/supabase-js').createClient = jest.fn(() => mockSupabase);

beforeAll(() => {
  // jest.clearAllMocks();
  global.URL.createObjectURL = jest.fn().mockReturnValue('mocked-url');
  global.URL.revokeObjectURL = jest.fn();
});

// ★ Stub out MediaRecorder if not already defined in the test environment
if (!global.MediaRecorder) {
  global.MediaRecorder = class {
    state = 'inactive';
    ondataavailable: ((event: any) => void) | null = null;
    onstop: (() => void) | null = null;
    constructor(public stream: any, public options: any) {}
    start() {
      this.state = 'recording';
      // Optionally: you could add a timeout to simulate data coming in.
    }
    stop() {
      // Simulate returning nonempty audio data (thus blob size will be nonzero)
      if (this.ondataavailable) {
        this.ondataavailable({
          data: new Blob(['dummyData'], { type: 'audio/webm' }),
        });
      }
      this.state = 'inactive';
      if (this.onstop) {
        this.onstop();
      }
    }
  } as any;
}
if (typeof MediaRecorder.isTypeSupported !== 'function') {
  MediaRecorder.isTypeSupported = (mimeType: string) =>
    mimeType === 'audio/webm';
}

// ★ Stub out navigator.mediaDevices
const fakeStream = {
  getTracks: () => [{ stop: jest.fn() }],
};
Object.defineProperty(navigator, 'mediaDevices', {
  configurable: true,
  writable: true,
  value: {
    getUserMedia: jest.fn().mockResolvedValue(fakeStream),
    enumerateDevices: jest.fn().mockResolvedValue([{ kind: 'audioinput' }]),
  },
});

const originalGetUserMedia = navigator.mediaDevices.getUserMedia;

// Set up the subscription hook mock
const mockUseSubscription = useSubscription as jest.MockedFunction<
  typeof useSubscription
>;
const mockUseError = useError as jest.MockedFunction<typeof useError>;

// Wrap your hook with all providers
const wrapper = ({ children }: { children: ReactNode }) => (
  <ErrorProvider>
    <RecordingProvider>
      <SubscriptionProvider>{children}</SubscriptionProvider>
    </RecordingProvider>
  </ErrorProvider>
);

beforeEach(() => {
  mockUseSubscription.mockReturnValue({
    isSubscribed: false,
    isSubscribedBannerShowed: false,
    setIsSubscribedBannerShowed: jest.fn(),
    setIsSubscribed: jest.fn(),
    checkSubscription: jest.fn(),
    handleSubmit: jest.fn(),
    status: 'idle',
    email: '',
    setEmail: jest.fn(),
    errorMessage: '',
    setErrorMessage: jest.fn(),
  });
  localStorage.clear();
  jest.clearAllMocks();

  process.env.NEXT_PUBLIC_ENVIRONMENT = 'test';
});

describe('RecordingContext', () => {
  afterEach(() => {
    // restore the original getUserMedia to avoid affecting other tests
    navigator.mediaDevices.getUserMedia = originalGetUserMedia;
  });


  test('provides a valid recording context', () => {
    const { result } = renderHook(() => useRecordingContext(), { wrapper });
    expect(result.current).not.toBeNull();
  });
  test('should start recording and update isRecording', async () => {
    const { result } = renderHook(() => useRecordingContext(), { wrapper });

    await act(async () => {
      result.current.startRecording();
    });
    expect(result.current).not.toBeNull();
    expect(result.current.isRecording).toBe(true);
  });
  test('should stop recording and update isRecording', async () => {
    const { result } = renderHook(() => useRecordingContext(), { wrapper });

    await act(async () => {
      await result.current.startRecording();
    });
    expect(result.current.isRecording).toBe(true);
    await act(async () => {
      await result.current.stopRecording();
    });
    expect(result.current.isRecording).toBe(false);
  });
  test('resets recording state correctly', async () => {
    const { result } = renderHook(() => useRecordingContext(), { wrapper });

    await act(async () => {
      await result.current.startRecording();
      await result.current.stopRecording();
      result.current.resetRecording();
    });

    expect(result.current.audioURL).toBeNull();
    expect(result.current.aiResponse).toBeNull();
    expect(result.current.detailedAiResponse).toBeNull();
    expect(result.current.isProcessed).toBe(false);
  });
  test('prevents recording when exceeding max attempts', async () => {
    const originalEnv = process.env.NEXT_PUBLIC_ENVIRONMENT;
    process.env.NEXT_PUBLIC_ENVIRONMENT = 'production';

    const { result } = renderHook(() => useRecordingContext(), { wrapper });
    // Set attempts to max allowed + 1
    await act(async () => {
      result.current.setRecordingAttempts(
        result.current.maxRecordingAttempts + 1
      );
    });

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(mockShowError).toHaveBeenCalledWith(
      expect.stringContaining('maximum number of recording attempts'),
      'warning'
    );
    process.env.NEXT_PUBLIC_ENVIRONMENT = originalEnv;
  });

  test('allows unlimited attempts for subscribed users', async () => {
    // Mock subscription to return true
    mockUseSubscription.mockReturnValue({
      ...mockUseSubscription(),
      isSubscribed: true,
    });

    const { result } = renderHook(() => useRecordingContext(), { wrapper });

    // Set attempts to high number
    act(() => {
      result.current.setRecordingAttempts(999);
    });

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);
  });

  test('auto-stops recording after max time', async () => {
    // Use modern fake timers and set the initial system time to 0.
    jest.useFakeTimers('modern' as any);
    jest.setSystemTime(0);

    const { result } = renderHook(() => useRecordingContext(), { wrapper });

    // Start the recording.
    await act(async () => {
      await result.current.startRecording();
    });

    // (Optional) Verify that recording has started.
    expect(result.current.isRecording).toBe(true);

    // Advance timers by 10 minutes plus 10 seconds.
    await act(async () => {
      jest.advanceTimersByTime(600000 + 10000);
      // Run any pending timer callbacks.
      jest.runOnlyPendingTimers();
      // Flush pending microtasks.
      await Promise.resolve();
    });

    // The auto-stop logic should have been triggered, setting isRecording to false.
    expect(result.current.isRecording).toBe(false);

    // Restore real timers.
    jest.useRealTimers();
  });

  test('handles microphone permission denied error', async () => {
    // Mock getUserMedia to throw permission error

    const { result } = renderHook(() => useRecordingContext(), { wrapper });

    const permissionError = new Error('Permission denied');
    permissionError.name = 'NotAllowedError';
    navigator.mediaDevices.getUserMedia = jest
      .fn()
      .mockRejectedValue(permissionError);

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(mockShowError).toHaveBeenCalledWith(
      expect.stringContaining('Microphone access denied.'),
      'error'
    );
  });
});

describe('fetching the ai response', () => {
  let hookResult: any;

  beforeEach(() => {
    // Clear all mocks and storage
    jest.clearAllMocks();
    localStorage.clear();

    // Single hook render
    const renderedHook = renderHook(() => useRecordingContext(), { wrapper });
    hookResult = renderedHook.result as any;

    // Reset to known state
    act(() => {
      hookResult.current.resetRecording();
      hookResult.current.setRecordingAttempts(0);
    });
  });

  afterEach(() => {
    // Clean up any intervals
    if (hookResult.current) {
      act(() => {
        hookResult.current.stopRecording();
      });
    }
    jest.clearAllTimers();
  });

  test('sets audioURL after stopping recording', async () => {
    // const { result } = renderHook(() => useRecordingContext(), { wrapper });

    await act(async () => {
      await (hookResult.current as any).startRecording();
      await (hookResult.current as any).stopRecording();
    });

    expect((hookResult.current as any).audioURL).toBe('mocked-url');
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  test('handles API response for deep analysis', async () => {
    const mockResponse = { aiResponse: mockDetailedResponse };

    // Mock fetch response
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    // const { result } = renderHook(() => useRecordingContext(), { wrapper });

    // First, update deep analysis flag and allow state update to flush
    await act(async () => {
      (hookResult.current as any).setIsDeepAnalysis(true);
    });

    // Then start/stop the recording
    await act(async () => {
      await hookResult.current.startRecording();
      await hookResult.current.stopRecording();
    });

    expect(hookResult.current.isDeepAnalysis).toBe(true);
    expect(hookResult.current.detailedAiResponse).not.toBeNull();
    expect(hookResult.current.detailedAiResponse).toEqual(
      mockResponse.aiResponse
    );
  });

  test('handles API response for standard analysis', async () => {
    process.env.NEXT_PUBLIC_ENVIRONMENT = 'testing';

    const mockBaseResponse = { aiResponse: mockResponse };

    // Mock fetch response
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBaseResponse),
    });

    // Then start/stop the recording and flush pending updates
    await act(async () => {
      await hookResult.current.startRecording();
      await hookResult.current.stopRecording();
      // Let any async state updates finish
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Now assert that aiResponse is populated
    expect(hookResult.current.aiResponse).not.toBeNull();
    expect(hookResult.current.aiResponse).toEqual(mockBaseResponse.aiResponse);
  });
});

import { renderHook, act } from '@testing-library/react';
import { useRecordingContext, RecordingProvider } from '@/context/recording-context';
import { SubscriptionProvider, useSubscription } from '@/context/subscription-context';
import { ReactNode } from 'react';
import { ErrorProvider } from '@/hooks/useError';

// Mock dependencies
jest.mock('@/context/subscription-context');
jest.mock('@/context/recording-context');
jest.mock('@/hooks/useError');
jest.mock('posthog-js');

const mockUseSubscription = useSubscription as jest.MockedFunction<typeof useSubscription>;

const wrapper = ({ children }: { children: ReactNode }) => (
  <ErrorProvider>
    <RecordingProvider>
      <SubscriptionProvider>
        {children}
      </SubscriptionProvider>
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

  // Mock media devices
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: jest.fn(),
      enumerateDevices: jest.fn().mockResolvedValue([{ kind: 'audioinput' }])
    }
  });
});

afterEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

describe('RecordingContext', () => {
  test('provides initial context values', () => {
    const { result } = renderHook(() => useRecordingContext(), { wrapper });
    
    expect(result.current.isRecording).toBe(false);
    expect(result.current.audioURL).toBeNull();
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.recordingAttempts).toBe(0);
  });

  test('starts and stops recording', async () => {
    const { result } = renderHook(() => useRecordingContext(), { wrapper });

    await act(async () => {
      await result.current.startRecording();
    });
    expect(result.current.isRecording).toBe(true);

    await act(async () => {
      result.current.stopRecording();
    });
    expect(result.current.isRecording).toBe(false);
  });

  test('tracks recording attempts', async () => {
    const { result } = renderHook(() => useRecordingContext(), { wrapper });

    await act(async () => {
      await result.current.startRecording();
      await result.current.stopRecording();
    });
    
    expect(result.current.recordingAttempts).toBe(1);
    expect(localStorage.getItem('recordingAttempts')).toBe('1');
  });

  test.only('resets recording state', async () => {
    const { result } = renderHook(() => useRecordingContext(), { wrapper });

    await act(async () => {
      await result.current.startRecording();
      await result.current.stopRecording();
      result.current.resetRecording();
    });

    expect(result.current.audioURL).toBeNull();
    expect(result.current.aiResponse).toBeNull();
    expect(result.current.isProcessed).toBe(false);
  });

  test('handles subscription upgrades', () => {
    mockUseSubscription.mockReturnValue({
      isSubscribed: true,
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

    const { result } = renderHook(() => useRecordingContext(), { wrapper });
    expect(result.current.maxRecordingAttempts).toBe(1000);
  });
});
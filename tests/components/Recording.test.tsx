import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Recording from '@/components/Recording';
import { useSubscription } from '@/context/subscription-context';

// Mock dependencies
jest.mock('@/context/subscription-context');
jest.mock('posthog-js');
jest.mock('@/utils/logger');

const mockUseSubscription = useSubscription as jest.MockedFunction<typeof useSubscription>;

beforeEach(() => {
  // Mock subscription context
  mockUseSubscription.mockReturnValue({
    isSubscribed: false,
    isSubscribedBannerShowed: false,
    setIsSubscribedBannerShowed: jest.fn()
  });

  // Mock media devices
  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: {
      getUserMedia: jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }]
      }),
      enumerateDevices: jest.fn().mockResolvedValue([
        { kind: 'audioinput', deviceId: '1', label: 'Microphone', groupId: '1' }
      ])
    },
    writable: true
  });
});

afterEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

describe('Recording Component', () => {
  test('renders initial recording state', () => {
    render(<Recording />);
    expect(screen.getByText('Start Recording')).toBeInTheDocument();
    expect(screen.getByText('Deep Analysis')).toBeInTheDocument();
  });

  test('starts and stops recording', async () => {
    render(<Recording />);
    
    const startButton = screen.getByText('Start Recording');
    await userEvent.click(startButton);

    // Wait for recording state update
    await waitFor(() => {
      expect(screen.getByText(/Stop Recording/)).toBeInTheDocument();
    });

    const stopButton = screen.getByText(/Stop Recording/);
    await userEvent.click(stopButton);

    await waitFor(() => {
      expect(screen.queryByText(/Stop Recording/)).not.toBeInTheDocument();
    });
  });

  test('handles microphone permission denied', async () => {
    // Mock permission denied error
    const error = new Error('Permission denied');
    error.name = 'NotAllowedError';
    navigator.mediaDevices.getUserMedia = jest.fn().mockRejectedValue(error);

    render(<Recording />);
    await userEvent.click(screen.getByText('Start Recording'));

    await waitFor(() => {
      expect(screen.getByText(/Microphone access denied/)).toBeInTheDocument();
    });
  });

  test('limits recording attempts', async () => {
    localStorage.setItem('recordingAttempts', '2');
    localStorage.setItem('attemptsTimestamp', Date.now().toString());

    render(<Recording />);
    await userEvent.click(screen.getByText('Start Recording'));

    await waitFor(() => {
      expect(screen.getByText(/maximum number of recording attempts/)).toBeInTheDocument();
    });
  });

  test('resets recording state', async () => {
    render(<Recording />);
    
    // Start and stop recording
    await userEvent.click(screen.getByText('Start Recording'));
    await waitFor(() => screen.getByText(/Stop Recording/));
    await userEvent.click(screen.getByText(/Stop Recording/));

    // Click record again
    await waitFor(() => screen.getByText('Record Again'));
    await userEvent.click(screen.getByText('Record Again'));

    expect(screen.getByText('Start Recording')).toBeInTheDocument();
  });
});
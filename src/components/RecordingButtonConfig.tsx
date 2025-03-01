import { useRecordingContext } from '@/context/recording-context';

export const ButtonConfig = () => {
  const { isProcessing, isRecording, isProcessed, startRecording, stopRecording, resetRecording } = useRecordingContext();

  if (isProcessing) {
    return {
      text: 'Processing...',
      action: () => {},
      disabled: true,
      className: 'opacity-50 cursor-not-allowed',
    };
  }
  if (isRecording) {
    return {
      text: (
        <span className="flex items-center">
          <span className="animate-pulse mr-2 text-red-500">●</span> Stop
          Recording
        </span>
      ),
      action: stopRecording,
      disabled: false,
      className:
        'bg-black text-white dark:bg-white dark:text-black hover:opacity-90',
    };
  }
  if (isProcessed) {
    return {
      text: 'Record Again',
      action: resetRecording,
      disabled: false,
      className:
        'hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black',
    };
  }
  return {
    text: 'Start Recording',
    action: startRecording,
    disabled: false,
    className:
      'hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black',
  };
};
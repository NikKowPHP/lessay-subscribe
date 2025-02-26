export const RecordingCallToAction = ({onWaitlistClick, onResetRecordingClick}: {onWaitlistClick: () => void, onResetRecordingClick: () => void}) => {
  return (
    <div className="p-6 bg-gradient-to-r from-black/5 to-black/10 dark:from-white/5 dark:to-white/10 rounded-lg w-full">
    <div className="max-w-2xl mx-auto text-center space-y-4">
      <h3 className="text-xl font-semibold">
        Ready to Improve Your Pronunciation And Accent?
      </h3>
      <p className="text-gray-700 dark:text-gray-300">
        Join our waitlist to start speaking like a native.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <button
          onClick={onWaitlistClick}
          className="px-6 py-2 rounded-lg font-medium transition-all duration-200 
                   bg-black text-white dark:bg-white dark:text-black 
                   hover:opacity-90 hover:scale-105"
        >
          Join Waitlist
        </button>
        <button
          onClick={onResetRecordingClick}
          className="px-6 py-2 rounded-lg font-medium transition-all duration-200 
                   border border-black/10 dark:border-white/10
                   hover:bg-black/5 dark:hover:bg-white/5"
        >
          Try Another Recording
        </button>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
        ✨ Get early access and special perks when we launch!
      </p>
    </div>
  </div>
  )
}
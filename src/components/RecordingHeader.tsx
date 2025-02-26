export const RecordingHeader = () => {
  return (
      <header className="text-center mb-8">
        <h1 itemProp="name" className="text-2xl font-semibold mb-3">
      Speak & Uncover Your Accent
    </h1>
    <div itemProp="description" className="space-y-2">
      <p className="text-lg text-gray-700 dark:text-gray-300">
        Record your voice in any language and reveal the subtle impact of
        your native tongue.
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        We will provide detailed insights into how your background shapes
        your pronunciation, rhythm, and overall speaking style.
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        We do not store your audio recordings. By submitting, you consent to sending your voice recording to our AI system for processing. We only store metric information to improve our service. The audio is deleted immediately from the server and is not used for training purposes.
      </p>
    </div>
  </header>
)
}
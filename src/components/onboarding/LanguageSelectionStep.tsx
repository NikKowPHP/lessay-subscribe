import React from 'react'

interface LanguageSelectionStepProps {
  onNext: (data: { nativeLanguage: string; targetLanguage: string }) => void
  formData: {
    nativeLanguage: string
    targetLanguage: string
    learningPurpose: string
    proficiencyLevel: string
  }
  loading: boolean
}

export default function LanguageSelectionStep({ 
  onNext, 
  formData, 
  loading 
}: LanguageSelectionStepProps) {
  const [nativeLanguage, setNativeLanguage] = React.useState(formData.nativeLanguage || '')
  const [targetLanguage, setTargetLanguage] = React.useState(formData.targetLanguage || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext({ nativeLanguage, targetLanguage })
  }

  const languages = [
    'English', 'Spanish', 'French', 'German', 'Italian', 
    'Portuguese', 'Russian', 'Chinese', 'Japanese', 'Korean'
  ]

  return (
    <div>
      <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Select Your Languages
      </h2>
      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="nativeLanguage" className="block text-sm font-medium text-gray-700">
            Your Native Language
          </label>
          <select
            id="nativeLanguage"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            value={nativeLanguage}
            onChange={(e) => setNativeLanguage(e.target.value)}
            disabled={loading}
          >
            <option value="">Select your native language</option>
            {languages.map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="targetLanguage" className="block text-sm font-medium text-gray-700">
            Language You Want to Learn
          </label>
          <select
            id="targetLanguage"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            disabled={loading}
          >
            <option value="">Select a language to learn</option>
            {languages.map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>
        <div>
          <button
            type="submit"
            disabled={loading || !nativeLanguage || !targetLanguage}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </form>
    </div>
  )
}
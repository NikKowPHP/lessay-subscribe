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
    'Portuguese', 'Russian', 'Chinese', 'Japanese', 'Korean', 'Polish'
  ]

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-semibold text-foreground">
        Select Your Languages
      </h2>
      <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label htmlFor="nativeLanguage" className="block text-sm font-medium text-neutral-9">
            Your Native Language
          </label>
          <div className="relative">
            <select
              id="nativeLanguage"
              required
              className="block w-full rounded-md border border-neutral-5 bg-neutral-1 px-3 py-2.5 text-foreground shadow-sm
                        focus:border-accent-6 focus:ring-2 focus:ring-accent-6 focus:outline-none
                        disabled:bg-neutral-3 disabled:text-neutral-6 disabled:cursor-not-allowed"
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
        </div>
        
        <div className="space-y-2">
          <label htmlFor="targetLanguage" className="block text-sm font-medium text-neutral-9">
            Language You Want to Learn
          </label>
          <div className="relative">
            <select
              id="targetLanguage"
              required
              className="block w-full rounded-md border border-neutral-5 bg-neutral-1 px-3 py-2.5 text-foreground shadow-sm
                        focus:border-accent-6 focus:ring-2 focus:ring-accent-6 focus:outline-none
                        disabled:bg-neutral-3 disabled:text-neutral-6 disabled:cursor-not-allowed"
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
        </div>
        
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || !nativeLanguage || !targetLanguage}
            className="w-full py-2.5 px-4 bg-primary hover:bg-accent-7 text-neutral-1 rounded-md transition-colors 
                     focus:outline-none focus:ring-2 focus:ring-accent-8 focus:ring-offset-2 disabled:opacity-50
                     font-medium text-sm flex items-center justify-center"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-neutral-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : 'Continue'}
          </button>
        </div>
      </form>
    </div>
  )
}
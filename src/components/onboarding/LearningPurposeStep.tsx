import React from 'react'

interface LearningPurposeStepProps {
  onNext: (data: { learningPurpose: string }) => void
  formData: {
    nativeLanguage: string
    targetLanguage: string
    learningPurpose: string
    proficiencyLevel: string
  }
  loading: boolean
}

export default function LearningPurposeStep({ 
  onNext, 
  formData, 
  loading 
}: LearningPurposeStepProps) {
  const [learningPurpose, setLearningPurpose] = React.useState(formData.learningPurpose || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext({ learningPurpose })
  }

  const purposes = [
    'Travel', 'Business', 'Academic', 'Cultural Exchange', 
    'Relocation', 'Personal Interest', 'Other'
  ]

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-semibold text-foreground">
        Why Are You Learning {formData.targetLanguage}?
      </h2>
      <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-neutral-9 mb-3">
            Select Your Learning Purpose
          </label>
          <div className="space-y-2">
            {purposes.map(purpose => (
              <div 
                key={purpose} 
                className={`flex items-center px-4 py-3 rounded-md border transition-colors cursor-pointer
                          ${learningPurpose === purpose 
                            ? 'border-accent-6 bg-accent-1' 
                            : 'border-neutral-5 hover:bg-neutral-2'}`}
                onClick={() => setLearningPurpose(purpose)}
              >
                <div className="flex items-center h-5">
                  <input
                    id={purpose}
                    name="learningPurpose"
                    type="radio"
                    className="h-4 w-4 text-accent-6 focus:ring-accent-6 border-neutral-5"
                    value={purpose}
                    checked={learningPurpose === purpose}
                    onChange={() => setLearningPurpose(purpose)}
                    disabled={loading}
                  />
                </div>
                <label htmlFor={purpose} className="ml-3 block text-sm font-medium text-foreground">
                  {purpose}
                </label>
              </div>
            ))}
          </div>
        </div>
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || !learningPurpose}
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
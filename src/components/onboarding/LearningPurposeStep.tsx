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
    <div>
      <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Why Are You Learning {formData.targetLanguage}?
      </h2>
      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Select Your Learning Purpose
          </label>
          <div className="mt-4 space-y-4">
            {purposes.map(purpose => (
              <div key={purpose} className="flex items-center">
                <input
                  id={purpose}
                  name="learningPurpose"
                  type="radio"
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                  value={purpose}
                  checked={learningPurpose === purpose}
                  onChange={() => setLearningPurpose(purpose)}
                  disabled={loading}
                />
                <label htmlFor={purpose} className="ml-3 block text-sm font-medium text-gray-700">
                  {purpose}
                </label>
              </div>
            ))}
          </div>
        </div>
        <div>
          <button
            type="submit"
            disabled={loading || !learningPurpose}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </form>
    </div>
  )
}
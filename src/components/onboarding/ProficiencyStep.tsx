import React from 'react'

interface ProficiencyStepProps {
  onNext: (data: { proficiencyLevel: string }) => Promise<void>
  onAssessmentGeneration: () => void
  formData: {
    nativeLanguage: string
    targetLanguage: string
    learningPurpose: string
    proficiencyLevel: string
  }
  loading: boolean
}

export default function ProficiencyStep({ 
  onNext, 
  onAssessmentGeneration,
  formData, 
  loading 
}: ProficiencyStepProps) {
  const [proficiencyLevel, setProficiencyLevel] = React.useState(formData.proficiencyLevel || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onNext({ proficiencyLevel })
    onAssessmentGeneration()
  }

  const levels = [
    { id: 'beginner', name: 'Beginner', description: 'Little to no prior knowledge' },
    { id: 'intermediate', name: 'Intermediate', description: 'Basic conversations and reading' },
    { id: 'advanced', name: 'Advanced', description: 'Comfortable in most situations' }
  ]

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-semibold text-foreground">
        Your {formData.targetLanguage} Proficiency Level
      </h2>
      <p className="mt-2 text-neutral-8">
        How would you rate your current level?
      </p>
      <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-3">
          {levels.map(level => (
            <div 
              key={level.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                proficiencyLevel === level.id 
                  ? 'border-accent-6 bg-accent-1 shadow-sm' 
                  : 'border-neutral-5 hover:bg-neutral-2'
              }`}
              onClick={() => setProficiencyLevel(level.id)}
            >
              <div className="flex items-center">
                <input
                  id={level.id}
                  name="proficiencyLevel"
                  type="radio"
                  className="h-4 w-4 text-accent-6 focus:ring-accent-6 border-neutral-5"
                  value={level.id}
                  checked={proficiencyLevel === level.id}
                  onChange={() => setProficiencyLevel(level.id)}
                  disabled={loading}
                />
                <label htmlFor={level.id} className="ml-3 block text-sm font-medium text-foreground">
                  {level.name}
                </label>
              </div>
              <p className="mt-1 ml-7 text-sm text-neutral-8">{level.description}</p>
            </div>
          ))}
        </div>
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || !proficiencyLevel}
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
            ) : 'Continue to Assessment'}
          </button>
        </div>
      </form>
    </div>
  )
}
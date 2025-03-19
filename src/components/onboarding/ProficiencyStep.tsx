import React from 'react'

interface ProficiencyStepProps {
  onNext: (data: { proficiencyLevel: string }) => void
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
  formData, 
  loading 
}: ProficiencyStepProps) {
  const [proficiencyLevel, setProficiencyLevel] = React.useState(formData.proficiencyLevel || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext({ proficiencyLevel })
  }

  const levels = [
    { id: 'beginner', name: 'Beginner', description: 'Little to no prior knowledge' },
    { id: 'intermediate', name: 'Intermediate', description: 'Basic conversations and reading' },
    { id: 'advanced', name: 'Advanced', description: 'Comfortable in most situations' }
  ]

  return (
    <div>
      <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Your {formData.targetLanguage} Proficiency Level
      </h2>
      <p className="mt-2 text-center text-sm text-gray-600">
        How would you rate your current level?
      </p>
      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-4">
          {levels.map(level => (
            <div 
              key={level.id}
              className={`border rounded-lg p-4 cursor-pointer ${
                proficiencyLevel === level.id 
                  ? 'border-black bg-gray-50' 
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setProficiencyLevel(level.id)}
            >
              <div className="flex items-center">
                <input
                  id={level.id}
                  name="proficiencyLevel"
                  type="radio"
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                  value={level.id}
                  checked={proficiencyLevel === level.id}
                  onChange={() => setProficiencyLevel(level.id)}
                  disabled={loading}
                />
                <label htmlFor={level.id} className="ml-3 block font-medium">
                  {level.name}
                </label>
              </div>
              <p className="mt-1 ml-7 text-sm text-gray-500">{level.description}</p>
            </div>
          ))}
        </div>
        <div>
          <button
            type="submit"
            disabled={loading || !proficiencyLevel}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Continue to Assessment'}
          </button>
        </div>
      </form>
    </div>
  )
}
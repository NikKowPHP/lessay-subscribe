import React from 'react'

interface WelcomeStepProps {
  onNext: () => void
  loading: boolean
}

export default function WelcomeStep({ onNext, loading }: WelcomeStepProps) {
  return (
    <div className="text-center animate-fade-in">
      <h2 className="text-3xl font-semibold text-foreground">
        Welcome to Language Learning
      </h2>
      <p className="mt-2 text-neutral-8">
        Let's get started with your personalized language learning journey
      </p>
      <div className="mt-8">
        <button
          onClick={onNext}
          disabled={loading}
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
              Loading...
            </span>
          ) : 'Get Started'}
        </button>
      </div>
    </div>
  )
}
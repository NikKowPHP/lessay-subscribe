import React from 'react'

interface WelcomeStepProps {
  onNext: () => void
  loading: boolean
}

export default function WelcomeStep({ onNext, loading }: WelcomeStepProps) {
  return (
    <div className="text-center">
      <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
        Welcome to Language Learning
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        Let's get started with your personalized language learning journey
      </p>
      <div className="mt-8">
        <button
          onClick={onNext}
          disabled={loading}
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Get Started'}
        </button>
      </div>
    </div>
  )
}
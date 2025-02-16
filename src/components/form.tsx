'use client';

import { useState } from 'react';
import { FormService } from '../services/formService';

export default function SubscriptionForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      await FormService.submitEmail(email);
      setStatus('success');
      setEmail('');
    } catch (error) {
      setStatus('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Subscription failed'
      );
    }
  };

  return (
    <div className="w-full ">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-full px-4 py-3 sm:px-6 sm:py-4 rounded-full border border-black/[.08] dark:border-white/[.145] 
                   bg-transparent  outline-none focus:border-black/20 dark:focus:border-white/30
                   transition-colors font-[family-name:var(--font-geist-sans)]"
            disabled={status === 'loading' || status === 'success'}
          />
          <button
            type="submit"
            disabled={status === 'loading' || status === 'success'}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5   sm:px-6 sm:py-3
                   bg-foreground text-background rounded-full text-sm
                   hover:bg-[#383838] dark:hover:bg-[#ccc] transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'loading'
              ? '...'
              : status === 'success'
              ? '✓'
              : 'Subscribe'}
          </button>
        </div>
        {status === 'error' && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {errorMessage}
          </p>
        )}
      </form>

      {status === 'success' && (
        <p className="mt-2 text-sm text-green-600 dark:text-green-400">
          Thanks for subscribing!
        </p>
      )}
    </div>
  );
}

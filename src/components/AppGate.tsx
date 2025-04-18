'use client';
import React from 'react';
import { useOnboarding } from '@/context/onboarding-context';

export function AppGate({ children }: { children: React.ReactNode }) {
  const { initializing } = useOnboarding();

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-1">
        <div className="animate-spin h-12 w-12 border-4 border-t-accent-6 rounded-full" />
      </div>
    );
  }

  return <>{children}</>;
}
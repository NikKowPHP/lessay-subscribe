"use client";

import { createContext, useState, useEffect, useContext } from 'react';
import { useError } from '@/hooks/useError';
import logger from '@/utils/logger';
import { FormService } from '@/services/formService';

interface SubscriptionContextType {
  isSubscribed: boolean;
  setIsSubscribed: (isSubscribed: boolean) => void;
  isSubscribedBannerShowed: boolean;
  setIsSubscribedBannerShowed: (isSubscribedBannerShowed: boolean) => void;
  checkSubscription: () => Promise<void>;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  status: 'idle' | 'loading' | 'success' | 'error';
  email: string;
  setEmail: (email: string) => void;
  errorMessage: string;
  setErrorMessage: (errorMessage: string) => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribedBannerShowed, setIsSubscribedBannerShowed] = useState(false);
  const { showError } = useError();

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const response = await fetch('/api/subscribe', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      setIsSubscribed(data.isSubscribed);
    } catch (error: any) {
      logger.error("Error checking subscription:", error);
      showError(
        'Failed to check your subscription status. Please try again later.',
        'error'
      );
    }
  };

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

  const value: SubscriptionContextType = {
    isSubscribed,
    setIsSubscribed,
    isSubscribedBannerShowed,
    setIsSubscribedBannerShowed,
    checkSubscription,
    handleSubmit,
    status,
    email,
    setEmail,
    errorMessage,
    setErrorMessage
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
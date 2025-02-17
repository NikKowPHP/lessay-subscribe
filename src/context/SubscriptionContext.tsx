"use client";

import { createContext, useState, useEffect, useContext } from 'react';
import { useError } from '@/hooks/useError';
import logger from '@/utils/logger';

interface SubscriptionContextType {
  isSubscribed: boolean;
  setIsSubscribed: (isSubscribed: boolean) => void;
  isSubscribedBannerShowed: boolean;
  setIsSubscribedBannerShowed: (isSubscribedBannerShowed: boolean) => void;
  checkSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
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

  const value: SubscriptionContextType = {
    isSubscribed,
    setIsSubscribed,
    isSubscribedBannerShowed,
    setIsSubscribedBannerShowed,
    checkSubscription,
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
// File: /src/app/app/settings/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserProfile } from '@/context/user-profile-context';
import { createBillingPortalSessionAction } from '@/lib/server-actions/payment-actions';
import logger from '@/utils/logger';
import { Button } from '@/components/ui/button'; // Assuming you have a Button component
import { toast } from 'react-hot-toast';
import { SubscriptionStatus } from '@prisma/client'; // Import enum for comparison

// Helper function to format dates nicely
const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';
  try {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (e) {
    return 'Invalid Date';
  }
};

// Helper function to map status enum to display string
const getStatusDisplay = (status: SubscriptionStatus): string => {
  switch (status) {
    case SubscriptionStatus.ACTIVE: return 'Active';
    case SubscriptionStatus.TRIAL: return 'Trial';
    case SubscriptionStatus.CANCELED: return 'Canceled';
    case SubscriptionStatus.PAST_DUE: return 'Past Due';
    case SubscriptionStatus.EXPIRED: return 'Expired';
    case SubscriptionStatus.NONE: return 'None';
    default: return 'Unknown';
  }
};

// Component to handle search params logic - needs to be inside Suspense
function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  // Handle redirect messages from Stripe Checkout/Portal
  useEffect(() => {
    const subscriptionStatus = searchParams.get('subscription');
    const sessionId = searchParams.get('session_id'); // Optional

    if (subscriptionStatus === 'success') {
      toast.success('Subscription action successful!');
      logger.info('Stripe redirect success detected.', { sessionId });
      // Clear query params
      router.replace('/app/settings', { scroll: false });
    } else if (subscriptionStatus === 'canceled') {
      toast.error('Subscription process canceled.');
      logger.info('Stripe redirect cancel detected.');
      // Clear query params
      router.replace('/app/settings', { scroll: false });
    }
  }, [searchParams, router]);

  const handleManageSubscription = async () => {
    setIsPortalLoading(true);
    setPortalError(null);
    logger.info('Attempting to create Stripe Billing Portal session...');

    try {
      const result = await createBillingPortalSessionAction();

      if (result.error) {
        logger.error('Error creating billing portal session:', result.error);
        toast.error(result.error);
        setPortalError(result.error);
      } else if (result.portalUrl) {
        logger.info('Billing portal session created. Redirecting...');
        toast.loading('Redirecting to manage subscription...');
        // Redirect to the Stripe Billing Portal
        window.location.href = result.portalUrl;
      } else {
         logger.error('Billing portal session creation returned no error and no URL.');
         toast.error('Could not open subscription management. Please try again.');
         setPortalError('An unexpected error occurred.');
      }
    } catch (err: any) {
      logger.error('Unhandled exception during billing portal creation:', err);
      toast.error('An unexpected error occurred. Please try again.');
      setPortalError('An unexpected error occurred.');
    } finally {
      // Only set loading to false if we didn't redirect
      // If redirection happens, the page unloads anyway.
      // Check if portalUrl exists in the result (if successful redirect)
      // This check might be tricky if the action doesn't return the URL on success in some cases
      // A simple approach is to just set it false, toast.loading handles the message until redirect.
       setIsPortalLoading(false);
    }
  };

  // --- Display Logic ---

  if (profileLoading) {
    return <div className="text-center p-6">Loading account details...</div>;
  }

  if (profileError) {
    return <div className="p-6 bg-error/10 text-error border border-error/30 rounded-md text-center">Error loading profile: {profileError}</div>;
  }

  if (!profile) {
    return <div className="text-center p-6">Could not load user profile.</div>;
  }

  // Determine which date to show based on status
  let relevantDateLabel = '';
  let relevantDateValue: Date | string | null | undefined = null;

  if (profile.subscriptionStatus === SubscriptionStatus.TRIAL && profile.trialEndDate) {
    relevantDateLabel = 'Trial Ends On';
    relevantDateValue = profile.trialEndDate;
  } else if (profile.subscriptionStatus === SubscriptionStatus.ACTIVE && profile.subscriptionEndDate) {
    relevantDateLabel = profile.cancelAtPeriodEnd ? 'Subscription Ends On' : 'Next Billing Date';
    relevantDateValue = profile.subscriptionEndDate;
  } else if (profile.subscriptionStatus === SubscriptionStatus.CANCELED && profile.subscriptionEndDate) {
    relevantDateLabel = 'Subscription Ends On';
    relevantDateValue = profile.subscriptionEndDate;
  } else if (profile.subscriptionStatus === SubscriptionStatus.PAST_DUE && profile.subscriptionEndDate) {
    relevantDateLabel = 'Payment Due / Renews On';
    relevantDateValue = profile.subscriptionEndDate;
  }

  // Decide whether to show the "Manage Subscription" button
  // Show if user has a Stripe Customer ID OR if status is Active/Trial/PastDue/Canceled (with future end date)
  // The action itself checks for stripeCustomerId, so relying on status is reasonable.
  const canManageSubscription = profile.subscriptionStatus !== SubscriptionStatus.NONE && profile.subscriptionStatus !== SubscriptionStatus.EXPIRED;


  return (
    <div className="bg-neutral-1 border border-neutral-4 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-neutral-9 mb-4">Subscription Details</h2>
      <div className="space-y-3">
        <div>
          <span className="font-medium text-neutral-8">Status:</span>
          <span className={`ml-2 px-2 py-0.5 rounded text-sm font-medium ${
            profile.subscriptionStatus === SubscriptionStatus.ACTIVE || profile.subscriptionStatus === SubscriptionStatus.TRIAL ? 'bg-success/10 text-success' :
            profile.subscriptionStatus === SubscriptionStatus.CANCELED ? 'bg-warning/10 text-warning' :
            profile.subscriptionStatus === SubscriptionStatus.PAST_DUE ? 'bg-error/10 text-error' :
            'bg-neutral-3 text-neutral-8'
          }`}>
            {getStatusDisplay(profile.subscriptionStatus)}
          </span>
          {profile.cancelAtPeriodEnd && profile.subscriptionStatus === SubscriptionStatus.ACTIVE && (
             <span className="ml-2 text-sm text-warning">(Set to cancel at period end)</span>
          )}
        </div>
        <div>
          <span className="font-medium text-neutral-8">Current Plan:</span>
          <span className="ml-2 text-neutral-9">{profile.subscriptionPlan || 'N/A'}</span>
        </div>
        {relevantDateLabel && (
          <div>
            <span className="font-medium text-neutral-8">{relevantDateLabel}:</span>
            <span className="ml-2 text-neutral-9">{formatDate(relevantDateValue)}</span>
          </div>
        )}
      </div>

      {portalError && (
        <div className="mt-4 p-3 bg-error/10 text-error border border-error/30 rounded-md text-sm">
          {portalError}
        </div>
      )}

      {canManageSubscription && (
        <div className="mt-6 pt-4 border-t border-neutral-3">
          <Button
            onClick={handleManageSubscription}
            disabled={isPortalLoading}
            className="w-full md:w-auto bg-accent-6 hover:bg-accent-7 text-neutral-1 py-2 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-50"
          >
            {isPortalLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Opening Portal...
              </span>
            ) : (
              'Manage Subscription'
            )}
          </Button>
          <p className="text-xs text-neutral-7 mt-2">
            You will be redirected to our payment partner (Stripe) to manage your billing details, view invoices, change plans, or cancel your subscription.
          </p>
        </div>
      )}

       {!canManageSubscription && profile.subscriptionStatus === SubscriptionStatus.NONE && (
         <div className="mt-6 pt-4 border-t border-neutral-3 text-center">
            <p className="text-neutral-8 mb-3">You do not have an active subscription.</p>
            <Button onClick={() => router.push('/app/settings/pricing')} variant="outline">
                View Pricing Plans
            </Button>
         </div>
       )}
    </div>
  );
}


// Main Page Component using Suspense for searchParams
export default function SettingsPage() {
    return (
      <div className="container mx-auto p-4 md:p-8 max-w-2xl">
        <h1 className="text-3xl font-bold text-center mb-8 text-neutral-9">Account Settings</h1>
        {/* Wrap the content in Suspense to allow useSearchParams */}
        <Suspense fallback={<div className="text-center p-6">Loading settings...</div>}>
          <SettingsContent />
        </Suspense>
      </div>
    );
}
// File: /src/app/app/settings/pricing/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button'; // Assuming a Button component exists
import { createCheckoutSessionAction, SubscriptionProductDetails } from '@/lib/server-actions/payment-actions';
import toast from 'react-hot-toast';
import logger from '@/utils/logger';

// Ensure your Stripe publishable key is set in environment variables
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

// --- Define a type for Display Plans ---
// This includes fields needed for the UI *and* the fields needed for the action
interface DisplayPlanDetails extends SubscriptionProductDetails {
  priceDisplay: string; // Renamed from 'price' to avoid conflict if needed, or keep if SubscriptionProductDetails doesn't have price
  features: string[];
  trialInfo?: string; // Optional trial info string
}
// --- --- --- --- --- --- ---

// --- Define Your Plans using the Display Type ---
// IMPORTANT: Replace placeholder stripePriceId values with your ACTUAL Stripe Price IDs
// Ensure the 7-day trial is configured ON THE PRICE object in your Stripe Dashboard.
const plans: DisplayPlanDetails[] = [
  {
    id: 'premium_monthly', // Your internal ID
    stripePriceId: 'price_replace_with_your_monthly_price_id', // ACTUAL STRIPE PRICE ID
    type: 'subscription',
    name: 'Premium Monthly',
    price: '$10/month', // Price for the action (if needed by SubscriptionProductDetails)
    priceDisplay: '$10/month', // Price for display
    features: ['Feature A', 'Feature B', 'Monthly Updates'],
    trialInfo: '7-day free trial',
  },
  {
    id: 'premium_yearly', // Your internal ID
    stripePriceId: 'price_replace_with_your_yearly_price_id', // ACTUAL STRIPE PRICE ID
    type: 'subscription',
    name: 'Premium Yearly',
    price: '$100/year', // Price for the action (if needed by SubscriptionProductDetails)
    priceDisplay: '$100/year', // Price for display (e.g., Save $20)
    features: ['Feature A', 'Feature B', 'Yearly Updates', 'Priority Support'],
    trialInfo: '7-day free trial',
  },
];
// --- --- --- --- --- --- ---

export default function PricingPage() {
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stripe, setStripe] = useState<Stripe | null>(null);

  useEffect(() => {
    stripePromise.then(stripeInstance => {
      if (stripeInstance) {
        setStripe(stripeInstance);
      } else {
        logger.error("Failed to initialize Stripe.");
        setError("Payment system could not be loaded. Please refresh the page.");
      }
    }).catch(err => {
        logger.error("Error loading Stripe:", err);
        setError("Payment system failed to load. Please refresh the page.");
    });
  }, []);

  const handleSubscribe = async (plan: DisplayPlanDetails) => { // Use DisplayPlanDetails here
    setError(null);
    if (!stripe) {
        toast.error("Payment system is not ready. Please wait or refresh.");
        logger.error("handleSubscribe called before Stripe loaded.");
        return;
    }
     if (!plan.stripePriceId || plan.stripePriceId.startsWith('price_replace')) {
        toast.error("Pricing configuration error. Please contact support.");
        logger.error("Attempted to subscribe with placeholder Price ID:", plan);
        setError("This plan is not available right now. Please contact support.");
        return;
    }

    setLoadingPlanId(plan.id);
    logger.info(`Attempting to create checkout session for plan: ${plan.id} (${plan.stripePriceId})`);

    // --- Create the object strictly matching SubscriptionProductDetails for the action ---
    const subscriptionProductDetails: SubscriptionProductDetails = {
        id: plan.id,
        stripePriceId: plan.stripePriceId,
        type: plan.type,
        name: plan.name,
        price: plan.price, // Include price if it's part of the interface
    };
    // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---

    try {
      // Pass the correctly typed object to the action
      const result = await createCheckoutSessionAction(subscriptionProductDetails);

      if (result.error) {
        logger.error(`Error creating checkout session for plan ${plan.id}:`, result.error);
        toast.error(result.error);
        setError(result.error);
      } else if (result.sessionId) {
        logger.info(`Checkout session created: ${result.sessionId}. Redirecting to Stripe...`);
        toast.loading('Redirecting to secure checkout...');

        const { error: stripeError } = await stripe.redirectToCheckout({
          sessionId: result.sessionId,
        });

        if (stripeError) {
          logger.error('Stripe redirectToCheckout error:', stripeError);
          toast.dismiss();
          toast.error(stripeError.message || 'Failed to redirect to checkout. Please try again.');
          setError(stripeError.message || 'Failed to redirect to checkout. Please try again.');
        }
      } else {
         logger.error(`Checkout session creation returned no error and no session ID for plan ${plan.id}`);
         toast.error('Could not initiate subscription. Please try again.');
         setError('An unexpected error occurred. Please try again.');
      }
    } catch (err: any) {
      logger.error(`Unhandled exception during subscription for plan ${plan.id}:`, err);
      toast.error('An unexpected error occurred. Please try again.');
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoadingPlanId(null);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-center mb-8 text-neutral-9">Choose Your Plan</h1>

      {error && (
        <div className="mb-6 p-4 bg-error/10 text-error border border-error/30 rounded-md text-center">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Use DisplayPlanDetails properties for rendering */}
        {plans.map((plan) => (
          <div key={plan.id} className="bg-neutral-1 border border-neutral-4 rounded-lg shadow-md p-6 flex flex-col">
            <h2 className="text-xl font-semibold text-neutral-9 mb-2">{plan.name}</h2>
            <p className="text-2xl font-bold text-accent-8 mb-4">{plan.priceDisplay}</p> {/* Use priceDisplay */}

            {plan.trialInfo && (
              <p className="text-sm text-success mb-4 font-medium">{plan.trialInfo}</p>
            )}

            <ul className="space-y-2 text-neutral-8 mb-6 flex-grow">
              {plan.features.map((feature, index) => ( // Use features
                <li key={index} className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-success flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                  {feature}
                </li>
              ))}
            </ul>

            <Button
              onClick={() => handleSubscribe(plan)} // Pass the full display plan object
              disabled={loadingPlanId === plan.id || !stripe}
              className="w-full mt-auto bg-accent-6 hover:bg-accent-7 text-neutral-1 py-2 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-50"
            >
              {loadingPlanId === plan.id ? (
                 <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                plan.trialInfo ? 'Start Free Trial' : 'Subscribe'
              )}
            </Button>
          </div>
        ))}
      </div>
       <p className="text-center text-neutral-7 text-sm mt-8">
         Manage your existing subscription in your <a href="/app/settings" className="text-accent-6 hover:underline">Account Settings</a>.
       </p>
    </div>
  );
}
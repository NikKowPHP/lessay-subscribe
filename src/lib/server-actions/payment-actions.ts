// // src/actions/payment.actions.ts

'use server'; // Mark this file as containing Server Actions

import logger from '@/utils/logger';
import { createSupabaseServerClient } from '@/utils/supabase/server';

import { PaymentRepository } from '@/repositories/payment.repository';
import { PaymentService } from '@/services/payment.service';


export interface SubscriptionProductDetails {
  id: string; // Your internal product ID (e.g., 'premium_monthly', 'premium_yearly')
  stripePriceId: string; // The ID of the Price object in Stripe (e.g., price_123...)
  type: 'subscription';
  name: string; // e.g., "Premium Monthly Plan"
}


// Helper to get current user ID securely within the action
async function getCurrentUserId(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    logger.error('Get session error:', error);
    throw new Error('Failed to get session.');
  }
  if (!session?.user?.id) {
    throw new Error('Authentication required.');
  }
  return session.user.id;
}


function createPaymentService(): PaymentService {
  const paymentRepository = new PaymentRepository(); // Instantiate repository
  return new PaymentService(paymentRepository); // Pass repository to service
}





/**
 * Server Action to create a Stripe Checkout Session for subscriptions.
 * @param product - Details of the subscription product including Stripe Price ID.
 * @returns An object containing the sessionId or an error message.
 */
export async function createCheckoutSessionAction(
  product: SubscriptionProductDetails
): Promise<{ sessionId: string | null; error: string | null }> {
  try {
    // 1. Authenticate the user
    const userId = await getCurrentUserId();
    logger.info(`createCheckoutSessionAction: Initiated by user ${userId} for price ${product.stripePriceId}`);

    // 2. Validate input
    if (!product || !product.id || !product.stripePriceId || product.type !== 'subscription') {
      throw new Error('Invalid or missing subscription product details.');
    }

    // 3. Instantiate the Payment Service
    const paymentService = createPaymentService();

    // 4. Call the service method to create the checkout session
    const sessionId = await paymentService.createCheckoutSession(userId, product);

    logger.info(`createCheckoutSessionAction: Successfully created session ${sessionId} for user ${userId}`);
    return { sessionId: sessionId, error: null };

  } catch (error: any) {
    logger.error('Error in createCheckoutSessionAction:', {
      errorMessage: error.message,
      product: product,
      userId: 'hidden', // Avoid logging userId directly in error if possible
    });

    let userErrorMessage = 'Failed to start subscription process. Please try again.';
    if (error.message.includes('Authentication required')) {
      userErrorMessage = 'Authentication required. Please log in.';
    } else if (error.message.includes('User not found')) {
      userErrorMessage = 'User account not found.';
    } else if (error.message.includes('Invalid product type')) {
      userErrorMessage = 'Invalid product selected for subscription.';
    }

    return { sessionId: null, error: userErrorMessage };
  }
}


/**
 * Server Action to create a Stripe Billing Portal Session.
 * @returns An object containing the portalUrl or an error message.
 */
export async function createBillingPortalSessionAction(): Promise<{ portalUrl: string | null; error: string | null }> {
  try {
    // 1. Authenticate the user
    const userId = await getCurrentUserId();
    logger.info(`createBillingPortalSessionAction: Initiated by user ${userId}`);

    // 2. Instantiate the Payment Service
    const paymentService = createPaymentService();

    // 3. Call the service method to create the billing portal session
    const portalUrl = await paymentService.createBillingPortalSession(userId);

    logger.info(`createBillingPortalSessionAction: Successfully created portal session for user ${userId}`);
    return { portalUrl: portalUrl, error: null };

  } catch (error: any) {
    logger.error('Error in createBillingPortalSessionAction:', {
      errorMessage: error.message,
      userId: 'hidden', // Avoid logging userId directly in error
    });

    let userErrorMessage = 'Failed to open subscription management. Please try again.';
    if (error.message.includes('Authentication required')) {
      userErrorMessage = 'Authentication required. Please log in.';
    } else if (error.message.includes('User not found')) {
      userErrorMessage = 'User account not found.';
    } else if (error.message.includes('Subscription management is not available')) {
        userErrorMessage = error.message; // Pass specific message from service
    } else if (error.message.includes('does not have a Stripe Customer ID')) {
        userErrorMessage = 'Subscription management is not available for this account yet.'; // User-friendly version
    }


    return { portalUrl: null, error: userErrorMessage };
  }
}
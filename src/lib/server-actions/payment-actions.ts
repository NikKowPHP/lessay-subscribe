// src/actions/payment.actions.ts

'use server'; // Mark this file as containing Server Actions

import { PaymentService } from '@/services/payment.service';
import logger from '@/utils/logger';
import { getAuthServiceBasedOnEnvironment } from '@/services/supabase-auth.service'; // Assuming this handles auth context server-side
import { PaymentRepository } from '@/repositories/payment.repository';


export interface SubscriptionProductDetails {
  id: string; // Your internal product ID (e.g., 'premium_monthly', 'premium_yearly')
  stripePriceId: string; // The ID of the Price object in Stripe (e.g., price_123...)
  type: 'subscription';
  name: string; // e.g., "Premium Monthly Plan"
}


// Helper to get current user ID securely within the action
async function getCurrentUserId(): Promise<string> {
  const authService = getAuthServiceBasedOnEnvironment();
  const session = await authService.getSession(); // Ensure getSession works server-side
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


// src/actions/payment.actions.ts

'use server'; // Mark this file as containing Server Actions

import { PaymentService } from '@/services/payment.service';
import logger from '@/utils/logger';
import { getAuthServiceBasedOnEnvironment } from '@/services/supabase-auth.service'; // Assuming this handles auth context server-side

// Define product details structure (reuse or define here)
interface ProductDetails {
  id: string;
  type: string; // e.g., "subscription", "course"
  name: string;
  amount: number; // Amount in MAJOR currency unit (e.g., dollars)
  currency: string; // e.g., "usd"
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

/**
 * Server Action to create a Stripe Payment Intent.
 * Called from the client-side checkout form.
 * @param product - Details of the product/service being purchased.
 * @returns An object containing the clientSecret or an error message.
 */
export async function createPaymentIntentAction(
  product: ProductDetails
): Promise<{ clientSecret: string | null; error: string | null }> {
  try {
    // 1. Authenticate the user
    const userId = await getCurrentUserId();
    logger.info(`createPaymentIntentAction: Initiated by user ${userId} for product ${product.id}`);

    // 2. Validate input (basic)
    if (!product || !product.id || !product.name || !product.amount || !product.currency) {
      throw new Error('Missing required product details.');
    }
    if (product.amount <= 0) {
      throw new Error('Payment amount must be positive.');
    }
    // Add more specific validation as needed

    // 3. Instantiate the Payment Service
    const paymentService = new PaymentService();

    // 4. Call the service method to create the intent
    const clientSecret = await paymentService.createPaymentIntent(userId, product);

    logger.info(`createPaymentIntentAction: Successfully created intent for user ${userId}, product ${product.id}`);
    return { clientSecret: clientSecret, error: null };

  } catch (error: any) {
    logger.error('Error in createPaymentIntentAction:', {
      errorMessage: error.message,
      product: product, // Log product details for context
      // Avoid logging sensitive user data unless necessary and secured
    });

    // Return a user-friendly error message
    let userErrorMessage = 'Failed to initialize payment. Please try again.';
    if (error.message.includes('Authentication required')) {
      userErrorMessage = 'Authentication required. Please log in.';
    } else if (error.message.includes('User not found')) {
      userErrorMessage = 'User account not found.'; // Or a more generic error
    }
    // Add more specific error mapping if needed

    return { clientSecret: null, error: userErrorMessage };
  }
}

// NOTE: The webhook handler CANNOT be a server action.
// It must remain an API Route or App Router Route Handler
// because it needs to receive POST requests from Stripe's servers.
// Keep the '/api/payments/webhook.ts' file as created previously.

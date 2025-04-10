// File: src/services/payment.service.ts
import Stripe from 'stripe';
import logger from '@/utils/logger';
import { PaymentStatus, SubscriptionStatus, User } from '@prisma/client'; // Import necessary enums/types
import { PaymentModel } from '@/models/AppAllModels.model'; // Keep if you still log payments for record-keeping
import { IPaymentRepository } from '@/lib/interfaces/all-interfaces';
import prisma from '@/lib/prisma'; // Needed for updating User subscription status

// Initialize Stripe (ensure keys are loaded from environment variables)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  logger.error('FATAL: Stripe secret key is not defined in environment variables.');
  // Throw error to prevent service instantiation without a key
  throw new Error('Stripe secret key is not defined.');
}
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-04-10', // Use your desired API version
  typescript: true,
});

// Define product details structure focused on subscriptions
interface SubscriptionProductDetails {
  id: string; // Your internal product ID (e.g., 'premium_monthly')
  stripePriceId: string; // The ID of the Price object in Stripe (e.g., price_123...)
  type: 'subscription'; // Explicitly subscription
  name: string; // e.g., "Premium Monthly Plan"
}

export class PaymentService {
  private paymentRepository: IPaymentRepository;

  constructor(paymentRepository: IPaymentRepository) {
    this.paymentRepository = paymentRepository;
    // Stripe initialization check is handled above
  }

  /**
   * Creates a Stripe Checkout Session for initiating a subscription.
   * @param userId - The ID of the user subscribing.
   * @param product - Details including the Stripe Price ID.
   * @returns The session ID for redirecting the user to Stripe Checkout.
   */
  async createCheckoutSession(userId: string, product: SubscriptionProductDetails): Promise<string> {
    logger.info(`Creating checkout session for user ${userId}, price ${product.stripePriceId}`);

    // 1. Validate Input
    if (!userId || !product || !product.stripePriceId) {
      throw new Error('Missing required parameters (userId, product, stripePriceId).');
    }
    if (product.type !== 'subscription') {
      throw new Error('Invalid product type for checkout session.');
    }

    // 2. Get User (for email prefill and potential customer lookup/creation)
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // 3. Define Success/Cancel URLs
    const successUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/app/settings?subscription=success&session_id={CHECKOUT_SESSION_ID}`; // Redirect back to settings or a dedicated success page
    const cancelUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/app/settings?subscription=canceled`; // Redirect back if canceled

    // 4. Create Stripe Checkout Session
    try {
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price: product.stripePriceId,
            quantity: 1,
          },
        ],
        customer_email: user.email, // Pre-fill email
        client_reference_id: userId, // Link session to your internal user ID
        success_url: successUrl,
        cancel_url: cancelUrl,
        // --- Trial Period Handling ---
        // Uncomment and configure if your Stripe Price has a trial period defined
        // subscription_data: {
        //   trial_from_plan: true, // Use trial defined on the Price object
        // },
        // OR define trial explicitly here (overrides Price trial)
        // subscription_data: {
        //    trial_period_days: 7
        // },
        // --- End Trial Period Handling ---
        metadata: { // Store useful info for webhooks
          userId: userId,
          productId: product.id,
          stripePriceId: product.stripePriceId,
        }
      };

      const session = await stripe.checkout.sessions.create(sessionParams);
      logger.info(`Stripe Checkout Session created: ${session.id} for user ${userId}`);

      if (!session.id) {
        // This should ideally not happen if the API call succeeds
        throw new Error('Failed to create Stripe Checkout Session: No session ID returned.');
      }
      return session.id; // Return the session ID to the frontend for redirection

    } catch (error: any) {
      logger.error('Error creating Stripe Checkout Session:', { error: error.message, userId, product });
      // Rethrow a user-friendly or specific error
      throw new Error(`Failed to create Stripe Checkout Session: ${error.message}`);
    }
  }

  /**
   * Handles incoming Stripe webhooks related to subscriptions.
   * @param payload - The raw request body from Stripe.
   * @param signature - The value of the 'stripe-signature' header.
   * @returns True if handled successfully, throws error otherwise.
   */
  async handleWebhook(payload: Buffer | string, signature: string | string[] | undefined): Promise<boolean> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error('Stripe webhook secret is not configured.');
      throw new Error('Webhook secret not configured.');
    }
    if (!signature) {
      logger.error('Stripe webhook signature missing.');
      throw new Error('Webhook signature missing.');
    }

    let event: Stripe.Event;

    // 1. Verify webhook signature
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      logger.info(`Received Stripe webhook event: ${event.type} (ID: ${event.id})`);
    } catch (err: any) {
      logger.error('Error verifying Stripe webhook signature:', { error: err.message });
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    // 2. Handle relevant subscription event types

    // --- Checkout Session Completed (Subscription Initiated) ---
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id; // Get userId from client_reference_id
      const subscriptionId = session.subscription; // ID of the created Stripe Subscription

      if (session.mode !== 'subscription') {
        logger.info(`Ignoring checkout.session.completed for non-subscription mode: ${session.mode}`);
        return true; // Acknowledge but don't process
      }
      if (!userId) {
        logger.error('Webhook checkout.session.completed missing client_reference_id (userId)', { sessionId: session.id });
        return true; // Acknowledge to prevent retries for this specific issue
      }
      if (!subscriptionId || typeof subscriptionId !== 'string') {
        logger.error('Webhook checkout.session.completed missing subscription ID', { sessionId: session.id, userId });
        return true; // Acknowledge
      }

      logger.info(`Checkout session completed for user ${userId}, subscription ${subscriptionId}, payment status ${session.payment_status}`);

      try {
        // Retrieve the full subscription object to get details like current_period_end and status
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        // Update user's subscription status in your database
        await this.updateUserSubscriptionStatus(
          userId,
          subscriptionId,
          subscription.status, // Stripe subscription status (e.g., 'active', 'trialing')
          new Date(subscription.current_period_end * 1000) // Convert Unix timestamp to Date
        );

        // Optionally: Create a Payment record for the initial setup fee/payment if needed for history
        if (session.payment_status === 'paid' && session.payment_intent && typeof session.payment_intent === 'string') {
          const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
          await this.paymentRepository.createPayment({
            userId: userId,
            stripePaymentIntentId: paymentIntent.id,
            status: PaymentStatus.SUCCEEDED,
            amount: paymentIntent.amount_received,
            currency: paymentIntent.currency,
            productId: session.metadata?.productId || null,
            productType: 'subscription', // Mark as subscription setup/initial payment
          });
          logger.info(`Created initial payment record for subscription ${subscriptionId}`);
        }
      } catch (error) {
        logger.error(`Error processing checkout.session.completed for sub ${subscriptionId}:`, error);
        // Decide if you should return true (ack) or false/throw (retry)
        return true; // Acknowledge to avoid infinite retries for potentially persistent issues
      }
      return true;
    }

    // --- Invoice Paid (Subscription Renewal) ---
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription;
      const userId = await this.getUserIdFromInvoice(invoice); // Helper to find userId

      if (!subscriptionId || typeof subscriptionId !== 'string') {
        logger.warn('Webhook invoice.payment_succeeded missing subscription ID', { invoiceId: invoice.id });
        return true;
      }
      if (!userId) {
        logger.warn('Webhook invoice.payment_succeeded could not determine userId', { invoiceId: invoice.id, customerId: invoice.customer });
        return true;
      }

      logger.info(`Invoice payment succeeded for subscription ${subscriptionId}, user ${userId}`);

      try {
        // Retrieve the subscription to update period end
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        // Update user's subscription status (especially the end date)
        await this.updateUserSubscriptionStatus(
          userId,
          subscriptionId,
          subscription.status, // Should be 'active' after successful payment
          new Date(subscription.current_period_end * 1000)
        );

        // Optionally: Create a Payment record for this recurring payment for history
        if (invoice.payment_intent && typeof invoice.payment_intent === 'string') {
          const paymentIntent = await stripe.paymentIntents.retrieve(invoice.payment_intent);
          await this.paymentRepository.createPayment({
            userId: userId,
            stripePaymentIntentId: paymentIntent.id,
            status: PaymentStatus.SUCCEEDED,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            productId: subscription.metadata?.productId || null, // Get product from subscription metadata if set
            productType: 'subscription_renewal', // Mark as renewal
          });
          logger.info(`Created renewal payment record for subscription ${subscriptionId}`);
        }
      } catch (error) {
        logger.error(`Error processing invoice.payment_succeeded for sub ${subscriptionId}:`, error);
        return true; // Acknowledge
      }
      return true;
    }

    // --- Invoice Payment Failed (Renewal Failed) ---
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription;
      const userId = await this.getUserIdFromInvoice(invoice); // Helper to find userId

      if (!subscriptionId || typeof subscriptionId !== 'string' || !userId) {
        logger.warn('Webhook invoice.payment_failed missing subscription ID or userId', { invoiceId: invoice.id });
        return true;
      }

      logger.warn(`Invoice payment failed for subscription ${subscriptionId}, user ${userId}`);
      try {
        // Update user status to PAST_DUE (or potentially CANCELED depending on Stripe settings)
        // Fetch the subscription to get the latest status from Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await this.updateUserSubscriptionStatus(userId, subscriptionId, subscription.status); // Use Stripe's status
        // Optionally create a FAILED payment record
      } catch (error) {
        logger.error(`Error processing invoice.payment_failed for sub ${subscriptionId}:`, error);
        return true; // Acknowledge
      }
      return true;
    }

    // --- Subscription Status Changes (e.g., canceled, trial ended) ---
    // Handle updates and deletions together
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = await this.getUserIdFromSubscription(subscription); // Helper to find userId

      if (!userId) {
        logger.warn(`Webhook ${event.type} could not determine userId`, { subscriptionId: subscription.id });
        return true;
      }

      logger.info(`Subscription ${event.type} for user ${userId}, subscription ${subscription.id}`);
      try {
        const newStatus = event.type === 'customer.subscription.deleted' ? 'deleted' : subscription.status;
        // Use canceled_at for end date if subscription is canceled and has a specific cancelation time
        const endDate = subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : (subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : undefined);

        await this.updateUserSubscriptionStatus(userId, subscription.id, newStatus, endDate);
      } catch (error) {
        logger.error(`Error processing ${event.type} for sub ${subscription.id}:`, error);
        return true; // Acknowledge
      }
      return true;
    }

    // --- Default: Log unhandled events ---
    logger.warn(`Unhandled Stripe event type received: ${event.type} (ID: ${event.id})`);
    return true; // Acknowledge receipt of unhandled events
  }

  /**
   * Helper to get userId from Invoice, checking metadata and customer object.
   */
  private async getUserIdFromInvoice(invoice: Stripe.Invoice): Promise<string | null> {
    if (invoice.metadata?.userId) return invoice.metadata.userId;
    if (invoice.subscription && typeof invoice.subscription === 'string') {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      return await this.getUserIdFromSubscription(subscription);
    }
    if (invoice.customer && typeof invoice.customer === 'string') {
      try {
        const customer = await stripe.customers.retrieve(invoice.customer);
        // Check if customer object itself isn't deleted
        if (!customer.deleted && customer.metadata?.userId) {
          return customer.metadata.userId;
        }
      } catch (error) {
        logger.warn(`Could not retrieve customer ${invoice.customer} during userId lookup for invoice ${invoice.id}`, error);
      }
    }
    return null;
  }

  /**
   * Helper to get userId from Subscription, checking metadata and customer object.
   */
  private async getUserIdFromSubscription(subscription: Stripe.Subscription): Promise<string | null> {
    if (subscription.metadata?.userId) return subscription.metadata.userId;
    if (subscription.customer && typeof subscription.customer === 'string') {
      try {
        const customer = await stripe.customers.retrieve(subscription.customer);
        // Check if customer object itself isn't deleted
        if (!customer.deleted && customer.metadata?.userId) {
          return customer.metadata.userId;
        }
      } catch (error) {
        logger.warn(`Could not retrieve customer ${subscription.customer} during userId lookup for subscription ${subscription.id}`, error);
      }
    }
    return null;
  }


  /**
   * Updates the user's subscription details in the database based on Stripe status.
   * @param userId - Your internal user ID.
   * @param stripeSubscriptionId - The Stripe Subscription ID.
   * @param stripeStatus - Stripe's subscription status (e.g., 'active', 'trialing', 'canceled', 'past_due', 'deleted').
   * @param periodEndDate - Optional: The date the current subscription period ends. Nullified if status indicates termination.
   */
  private async updateUserSubscriptionStatus(
    userId: string,
    stripeSubscriptionId: string,
    stripeStatus: Stripe.Subscription.Status | 'deleted', // Allow 'deleted' status from webhook
    periodEndDate?: Date | null // Make optional and nullable
  ): Promise<void> {
    logger.info(`Updating subscription status for user ${userId}, sub ${stripeSubscriptionId} to Stripe status ${stripeStatus}`);

    let appStatus: SubscriptionStatus;
    let finalEndDate: Date | null = periodEndDate || null; // Default to provided end date or null

    // Map Stripe status to your internal SubscriptionStatus enum
    switch (stripeStatus) {
      case 'active':
        appStatus = SubscriptionStatus.ACTIVE;
        break;
      case 'trialing':
        appStatus = SubscriptionStatus.TRIAL;
        break;
      case 'past_due':
        appStatus = SubscriptionStatus.PAST_DUE;
        break;
      case 'canceled':
      case 'unpaid': // Treat unpaid similar to canceled or past_due depending on logic
      case 'incomplete':
      case 'incomplete_expired':
      case 'deleted': // Handle deletion explicitly
        appStatus = SubscriptionStatus.CANCELED; // Mark as canceled in your system
        finalEndDate = null; // Clear end date on definitive cancellation/deletion
        stripeSubscriptionId = ''; // Optionally clear the stripe subscription ID if deleted
        break;
      default:
        logger.warn(`Unknown Stripe subscription status encountered: ${stripeStatus}. Setting status to NONE.`);
        appStatus = SubscriptionStatus.NONE; // Fallback for unknown states
        finalEndDate = null;
        stripeSubscriptionId = ''; // Optionally clear the stripe subscription ID
    }

    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: appStatus,
          // Only update subscriptionId if it's not being cleared due to deletion/cancellation
          ...(stripeSubscriptionId && { subscriptionId: stripeSubscriptionId }),
          // Clear subscriptionId if status implies termination
          ...((appStatus === SubscriptionStatus.CANCELED || appStatus === SubscriptionStatus.NONE) && !stripeSubscriptionId && { subscriptionId: null }),
          subscriptionEndDate: finalEndDate,
        },
      });
      logger.info(`Successfully updated user ${userId} subscription status in DB to ${appStatus}`);
    } catch (error) {
      logger.error(`Failed to update user subscription status in DB for user ${userId}`, { error });
      // Consider retry logic or administrative alerting
    }
  }
}

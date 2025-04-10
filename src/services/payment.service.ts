// src/services/payment.service.ts
import Stripe from 'stripe';
import logger from '@/utils/logger';
import { PaymentStatus, User } from '@prisma/client';
import { PaymentModel } from '@/models/AppAllModels.model'; // Import PaymentModel
import { IPaymentRepository } from '@/lib/interfaces/all-interfaces'; // Import Repository Interface
import prisma from '@/lib/prisma'; // Keep for User lookup for now

// Initialize Stripe (ensure keys are loaded from environment variables)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  // Log error during startup if key is missing
  logger.error('FATAL: Stripe secret key is not defined in environment variables.');
  // Optionally throw an error to prevent the service from being used incorrectly
  // throw new Error('Stripe secret key is not defined in environment variables.');
}
// Initialize Stripe only if the key exists
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2024-04-10', // Use the latest API version
  typescript: true,
}) : null; // Handle the case where stripe might be null if key is missing

// Define product details structure (adapt as needed)
interface ProductDetails {
  id: string;
  type: string; // e.g., "subscription", "course"
  name: string;
  amount: number; // Amount in MAJOR currency unit (e.g., dollars)
  currency: string; // e.g., "usd"
}

export class PaymentService {
  private paymentRepository: IPaymentRepository;

  // Add constructor to accept the repository
  constructor(paymentRepository: IPaymentRepository) {
    this.paymentRepository = paymentRepository;
    // Check if Stripe was initialized correctly
    if (!stripe) {
      logger.error('Stripe SDK could not be initialized. Payment functionality will be disabled.');
      // You might want to throw here or handle this state appropriately elsewhere
    }
  }

  /**
   * Creates a Stripe Payment Intent and saves a corresponding Payment record in the DB.
   * @param userId - The ID of the user making the payment.
   * @param product - Details of the product/service being purchased.
   * @returns The client secret for the Stripe Payment Intent.
   */
  async createPaymentIntent(userId: string, product: ProductDetails): Promise<string> {
    // Ensure Stripe is available
    if (!stripe) {
      throw new Error('Payment system is currently unavailable. Stripe key missing.');
    }

    logger.info(`Creating payment intent for user ${userId}, product ${product.id}`);

    // 1. Validate input (basic)
    if (!userId || !product || !product.id || !product.amount || !product.currency) {
      throw new Error('Missing required parameters for payment intent creation.');
    }
    if (product.amount <= 0) {
      throw new Error('Payment amount must be positive.');
    }

    // 2. Get User email (optional but recommended for Stripe customer matching)
    // Keep direct prisma call here for now, or inject UserService/UserRepository
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // 3. Convert amount to smallest currency unit (e.g., cents)
    const amountInCents = Math.round(product.amount * 100);
    const currencyCode = product.currency.toLowerCase();

    // 4. Create internal Payment record (status PENDING) using the repository
    const internalPayment = await this.paymentRepository.createPayment({
      userId: userId,
      status: PaymentStatus.PENDING,
      amount: amountInCents,
      currency: currencyCode,
      productId: product.id,
      productType: product.type,
    });
    logger.info(`Internal payment record created: ${internalPayment.id}`);

    // 5. Create Stripe Payment Intent
    try {
      const params: Stripe.PaymentIntentCreateParams = {
        amount: amountInCents,
        currency: currencyCode,
        automatic_payment_methods: { enabled: true }, // Let Stripe manage payment methods UI
        metadata: {
          internalPaymentId: internalPayment.id, // Link Stripe intent to our DB record
          userId: userId,
          productId: product.id,
          productType: product.type,
        },
        receipt_email: user.email, // Send Stripe receipt
        description: `Payment for ${product.name}`, // Description shown in Stripe dashboard
      };

      const paymentIntent = await stripe.paymentIntents.create(params);
      logger.info(`Stripe Payment Intent created: ${paymentIntent.id}`);

      // 6. Update internal Payment record with Stripe Intent ID using the repository
      await this.paymentRepository.updatePayment(internalPayment.id, {
        stripePaymentIntentId: paymentIntent.id,
      });

      // 7. Return client secret to the frontend
      if (!paymentIntent.client_secret) {
        // This case should ideally not happen if Stripe creation succeeded
        logger.error(`Stripe Payment Intent ${paymentIntent.id} missing client_secret after creation.`);
        await this.paymentRepository.updatePayment(internalPayment.id, {
          status: PaymentStatus.FAILED,
          errorMessage: 'Stripe client_secret missing post-creation',
        });
        throw new Error('Stripe Payment Intent client secret is missing.');
      }
      return paymentIntent.client_secret;

    } catch (error: any) {
      logger.error('Error creating Stripe Payment Intent:', {
        error: error.message,
        internalPaymentId: internalPayment.id,
      });
      // Update internal record to FAILED using the repository
      await this.paymentRepository.updatePayment(internalPayment.id, {
        status: PaymentStatus.FAILED,
        errorMessage: `Stripe intent creation failed: ${error.message}`,
      });
      // Rethrow a more specific error or the original Stripe error
      throw new Error(`Failed to create Stripe Payment Intent: ${error.message}`);
    }
  }

  /**
   * Handles incoming Stripe webhooks.
   * @param payload - The raw request body from Stripe.
   * @param signature - The value of the 'stripe-signature' header.
   * @returns True if handled successfully, throws error otherwise.
   */
  async handleWebhook(payload: Buffer | string, signature: string | string[] | undefined): Promise<boolean> {
    // Ensure Stripe is available
    if (!stripe) {
      logger.error('Cannot handle webhook: Payment system is unavailable (Stripe key missing).');
      throw new Error('Payment system unavailable.');
    }

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

    // 2. Handle the event type
    // Ensure the event data object is a PaymentIntent before casting
    if (!event.data.object || !('object' in event.data.object) || event.data.object.object !== 'payment_intent') {
      logger.warn(`Webhook received for non-PaymentIntent object or missing object type. Event type: ${event.type}`);
      return true; // Acknowledge receipt but don't process if it's not what we expect
    }
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const internalPaymentId = paymentIntent.metadata?.internalPaymentId;

    if (!internalPaymentId) {
      logger.warn('Webhook received for payment intent without internalPaymentId metadata', { stripeIntentId: paymentIntent.id, eventId: event.id });
      return true; // Acknowledge receipt but don't process further
    }

    // Retrieve internal payment record using the repository
    const internalPayment = await this.paymentRepository.findPaymentById(internalPaymentId);

    if (!internalPayment) {
      logger.error(`Internal payment record not found for ID from webhook metadata: ${internalPaymentId}`, { stripeIntentId: paymentIntent.id, eventId: event.id });
      // Acknowledge to prevent Stripe retries for this specific issue.
      // Consider adding to a dead-letter queue for investigation if this happens frequently.
      return true;
    }

    // Idempotency check: Don't process final states multiple times
    const isAlreadySucceeded = event.type === 'payment_intent.succeeded' && internalPayment.status === PaymentStatus.SUCCEEDED;
    const isAlreadyFailed = event.type === 'payment_intent.payment_failed' && internalPayment.status === PaymentStatus.FAILED;
    const isAlreadyCanceled = event.type === 'payment_intent.canceled' && internalPayment.status === PaymentStatus.CANCELED;

    if (isAlreadySucceeded || isAlreadyFailed || isAlreadyCanceled) {
      logger.info(`Webhook event ${event.type} (ID: ${event.id}) already processed for internal payment ${internalPaymentId}`);
      return true;
    }

    let newStatus: PaymentStatus | undefined = undefined;
    let errorMessage: string | null = null;

    switch (event.type) {
      case 'payment_intent.succeeded':
        logger.info(`PaymentIntent succeeded: ${paymentIntent.id}, Internal ID: ${internalPaymentId}, Event ID: ${event.id}`);
        // Validate amount (optional but recommended)
        if (paymentIntent.amount_received !== internalPayment.amount || paymentIntent.currency !== internalPayment.currency) {
          errorMessage = 'Webhook amount/currency mismatch';
          newStatus = PaymentStatus.FAILED;
          logger.error(errorMessage, {
            stripeIntentId: paymentIntent.id, internalPaymentId, eventId: event.id,
            expectedAmount: internalPayment.amount, receivedAmount: paymentIntent.amount_received,
            expectedCurrency: internalPayment.currency, receivedCurrency: paymentIntent.currency,
          });
        } else {
          newStatus = PaymentStatus.SUCCEEDED;
          // --- TRIGGER FULFILLMENT LOGIC HERE ---
          await this.fulfillOrder(internalPaymentId, internalPayment.productId, internalPayment.productType, internalPayment.userId);
          // -----------------------------------------
        }
        break;

      case 'payment_intent.payment_failed':
        errorMessage = paymentIntent.last_payment_error?.message || 'Unknown payment failure reason';
        newStatus = PaymentStatus.FAILED;
        logger.warn(`PaymentIntent failed: ${paymentIntent.id}, Internal ID: ${internalPaymentId}, Reason: ${errorMessage}, Event ID: ${event.id}`);
        // Optionally notify user or support team
        break;

      case 'payment_intent.processing':
        newStatus = PaymentStatus.PROCESSING;
        logger.info(`PaymentIntent processing: ${paymentIntent.id}, Internal ID: ${internalPaymentId}, Event ID: ${event.id}`);
        break;

      case 'payment_intent.requires_action':
        newStatus = PaymentStatus.REQUIRES_ACTION;
        logger.info(`PaymentIntent requires action: ${paymentIntent.id}, Internal ID: ${internalPaymentId}, Event ID: ${event.id}`);
        break;

      case 'payment_intent.canceled':
        newStatus = PaymentStatus.CANCELED;
        logger.info(`PaymentIntent canceled: ${paymentIntent.id}, Internal ID: ${internalPaymentId}, Event ID: ${event.id}`);
        break;

      default:
        logger.warn(`Unhandled Stripe event type: ${event.type} (ID: ${event.id})`);
        return true; // Acknowledge unhandled events
    }

    // Update internal payment status using the repository if status changed
    if (newStatus !== undefined && newStatus !== internalPayment.status) {
      await this.paymentRepository.updatePayment(internalPaymentId, {
        status: newStatus,
        errorMessage: errorMessage, // Will be null for success/processing etc.
      });
      logger.info(`Updated internal payment ${internalPaymentId} status to ${newStatus} based on event ${event.id}`);
    }

    return true;
  }

  /**
   * Placeholder for order fulfillment logic.
   * This should be implemented based on your application's needs.
   * @param internalPaymentId - The ID of the successful internal payment record.
   * @param productId - The ID of the product purchased.
   * @param productType - The type of product purchased.
   * @param userId - The ID of the user.
   */
  private async fulfillOrder(internalPaymentId: string, productId: string | null, productType: string | null, userId: string): Promise<void> {
    logger.info(`Fulfilling order for payment ${internalPaymentId}, product ${productId} (${productType}), user ${userId}`);

    // Example fulfillment logic:
    // Ensure this operation is idempotent - check if fulfillment already happened for this paymentId
    // e.g., const fulfillmentRecord = await findFulfillment(internalPaymentId); if (fulfillmentRecord) return;

    try {
      if (productType === 'subscription') {
        // Activate the user's subscription in your system
        // e.g., await activateSubscription(userId, productId);
        logger.info(`Subscription ${productId} activated for user ${userId}`);
      } else if (productType === 'course') {
        // Grant access to the course
        // e.g., await grantCourseAccess(userId, productId);
        logger.info(`Access granted to course ${productId} for user ${userId}`);
      } else if (productType === 'credits') {
        // Add credits to user's account
        // e.g., await addCreditsToUser(userId, amount);
        logger.info(`Credits added for user ${userId}`);
      } else {
        logger.warn(`Unhandled product type for fulfillment: ${productType}`);
      }
      // Mark fulfillment as complete in DB if necessary
      // e.g., await markFulfillmentComplete(internalPaymentId);
    } catch (error) {
      logger.error(`Fulfillment failed for payment ${internalPaymentId}:`, error);
      // Handle fulfillment errors - e.g., notify admin, schedule retry?
      // Consider updating payment status to indicate fulfillment failure?
    }
  }
}

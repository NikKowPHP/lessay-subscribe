// // File: src/services/payment.service.ts
// import Stripe from 'stripe';
// import logger from '@/utils/logger';
// import { PaymentStatus, SubscriptionStatus, User } from '@prisma/client'; // Import necessary enums/types
// import { PaymentModel } from '@/models/AppAllModels.model'; // Keep if you still log payments for record-keeping
// import prisma from '@/lib/prisma'; // Needed for updating User subscription status
// import { IPaymentRepository } from '@/repositories/payment.repository';
// import { SubscriptionProductDetails } from '@/lib/server-actions/payment-actions';

// // Initialize Stripe (ensure keys are loaded from environment variables)
// const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
// if (!stripeSecretKey) {
//   logger.error('FATAL: Stripe secret key is not defined in environment variables.');
//   // Throw error to prevent service instantiation without a key
//   throw new Error('Stripe secret key is not defined.');
// }
// const stripe = new Stripe(stripeSecretKey, {
//   apiVersion: '2024-04-10', // Use your desired API version
//   typescript: true,
// });


// export class PaymentService {
//   private paymentRepository: IPaymentRepository;

//   constructor(paymentRepository: IPaymentRepository) {
//     this.paymentRepository = paymentRepository;
//     // Stripe initialization check is handled above
//   }
//   /**
//     * Creates a Stripe Checkout Session for initiating a subscription.
//     * Assumes the trial period (e.g., 7 days) is configured on the Stripe Price object.
//     * @param userId - The ID of the user subscribing.
//     * @param product - Details including the Stripe Price ID.
//     * @returns The session ID for redirecting the user to Stripe Checkout.
//     */
//   async createCheckoutSession(userId: string, product: SubscriptionProductDetails): Promise<string> {
//     logger.info(`Creating checkout session for user ${userId}, price ${product.stripePriceId}`);

//     if (!userId || !product || !product.stripePriceId || product.type !== 'subscription') {
//       throw new Error('Invalid or missing subscription product details.');
//     }

//     const user = await prisma.user.findUnique({ where: { id: userId } });
//     if (!user) {
//       throw new Error(`User not found: ${userId}`);
//     }

//     // Check if user already hasn active subscription or trial
//     if (user.subscriptionStatus === SubscriptionStatus.ACTIVE || user.subscriptionStatus === SubscriptionStatus.TRIAL) {
//       // Check if the subscription end date is in the future
//       const now = new Date();
//       if (!user.subscriptionEndDate || user.subscriptionEndDate > now) {
//         logger.warn(`User ${userId} already has an active or trial subscription.`);
//         // Option 1: Prevent creating a new session
//         throw new Error('You already have an active subscription or trial.');
//         // Option 2: Redirect to a billing portal (more complex setup)
//         // Option 3: Allow session creation (might lead to multiple subscriptions if not handled carefully)
//       }
//     }


//     const successUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/app/settings?subscription=success&session_id={CHECKOUT_SESSION_ID}`;
//     const cancelUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/app/settings?subscription=canceled`;

//     try {
//       const sessionParams: Stripe.Checkout.SessionCreateParams = {
//         payment_method_types: ['card'],
//         mode: 'subscription',
//         line_items: [
//           {
//             price: product.stripePriceId,
//             quantity: 1,
//           },
//         ],
//         customer_email: user.email,
//         client_reference_id: userId,
//         success_url: successUrl,
//         cancel_url: cancelUrl,
//         // --- Trial Period Handling ---
//         // Use the trial period configured on the Stripe Price object itself.
//         // This is generally the recommended approach.
//         subscription_data: {
//           trial_from_plan: true,
//           // Optionally add metadata to the subscription itself
//           metadata: {
//             userId: userId,
//             internalProductId: product.id,
//           }
//         },
//         // --- End Trial Period Handling ---
//         metadata: { // Metadata for the Checkout Session (useful in checkout.session.completed)
//           userId: userId,
//           productId: product.id, // Your internal ID
//           stripePriceId: product.stripePriceId,
//         }
//       };

//       const session = await stripe.checkout.sessions.create(sessionParams);
//       logger.info(`Stripe Checkout Session created: ${session.id} for user ${userId}`);

//       if (!session.id) {
//         throw new Error('Failed to create Stripe Checkout Session: No session ID returned.');
//       }
//       return session.id;

//     } catch (error: any) {
//       logger.error('Error creating Stripe Checkout Session:', { error: error.message, userId, product });
//       throw new Error(`Failed to create Stripe Checkout Session: ${error.message}`);
//     }
//   }

//   /**
//    * Handles incoming Stripe webhooks related to subscriptions.
//    * @param payload - The raw request body from Stripe.
//    * @param signature - The value of the 'stripe-signature' header.
//    * @returns True if handled successfully, throws error otherwise.
//    */
//   async handleWebhook(payload: Buffer | string, signature: string | string[] | undefined): Promise<boolean> {
//     const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
//     if (!webhookSecret) {
//       logger.error('Stripe webhook secret is not configured.');
//       throw new Error('Webhook secret not configured.');
//     }
//     if (!signature) {
//       logger.error('Stripe webhook signature missing.');
//       throw new Error('Webhook signature missing.');
//     }

//     let event: Stripe.Event;

//     try {
//       event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
//       logger.info(`Received Stripe webhook event: ${event.type} (ID: ${event.id})`);
//     } catch (err: any) {
//       logger.error('Error verifying Stripe webhook signature:', { error: err.message });
//       throw new Error(`Webhook signature verification failed: ${err.message}`);
//     }

//     // --- Checkout Session Completed (Subscription Initiated/Trial Started) ---
//     if (event.type === 'checkout.session.completed') {
//       const session = event.data.object as Stripe.Checkout.Session;
//       const userId = session.client_reference_id;
//       const subscriptionId = session.subscription;

//       if (session.mode !== 'subscription' || !userId || !subscriptionId || typeof subscriptionId !== 'string') {
//         logger.warn(`Ignoring checkout.session.completed: Invalid mode, missing userId, or subscriptionId.`, { sessionId: session.id });
//         return true; // Acknowledge but don't process invalid data
//       }

//       logger.info(`Checkout session completed for user ${userId}, subscription ${subscriptionId}, payment status ${session.payment_status}`);

//       try {
//         const subscription = await stripe.subscriptions.retrieve(subscriptionId);
//         await this.updateUserSubscriptionStatus(
//           userId,
//           subscriptionId,
//           subscription.status, // Will be 'trialing' or 'active'
//           subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null
//         );

//         // Optional: Create Payment record for initial setup/payment if applicable
//         if (session.payment_status === 'paid' && session.payment_intent && typeof session.payment_intent === 'string') {
//           const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
//           await this.paymentRepository.createPayment({
//             userId: userId,
//             stripePaymentIntentId: paymentIntent.id,
//             status: PaymentStatus.SUCCEEDED,
//             amount: paymentIntent.amount_received,
//             currency: paymentIntent.currency,
//             productId: session.metadata?.productId || null,
//             productType: 'subscription_initial', // Mark as initial payment/setup
//           });
//           logger.info(`Created initial payment record for subscription ${subscriptionId}`);
//         }


//       } catch (error) {
//         logger.error(`Error processing checkout.session.completed for sub ${subscriptionId}:`, error);
//         return true; // Acknowledge to avoid retries for potentially persistent issues
//       }
//       return true;
//     }

//     // --- Invoice Paid (Subscription Renewal or Trial Conversion) ---
//     if (event.type === 'invoice.payment_succeeded') {
//       const invoice = event.data.object as Stripe.Invoice;
//       const subscriptionId = invoice.subscription;
//       const userId = await this.getUserIdFromInvoice(invoice);

//       if (!subscriptionId || typeof subscriptionId !== 'string' || !userId) {
//         logger.warn('Webhook invoice.payment_succeeded missing subscription ID or userId', { invoiceId: invoice.id });
//         return true;
//       }

//       // Check billing reason: 'subscription_cycle' (renewal) or 'subscription_create' (initial payment)
//       // or 'subscription_update' or 'subscription_threshold'
//       // If it's the first invoice after a trial, billing_reason might be 'subscription_cycle' or 'subscription_update'
//       const billingReason = invoice.billing_reason;
//       logger.info(`Invoice payment succeeded for subscription ${subscriptionId}, user ${userId}, reason: ${billingReason}`);

//       try {
//         const subscription = await stripe.subscriptions.retrieve(subscriptionId);
//         await this.updateUserSubscriptionStatus(
//           userId,
//           subscriptionId,
//           subscription.status, // Should be 'active'
//           subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null
//         );

//         // Optional: Create Payment record for this recurring payment
//         if (invoice.payment_intent && typeof invoice.payment_intent === 'string') {
//           const paymentIntent = await stripe.paymentIntents.retrieve(invoice.payment_intent);
//           await this.paymentRepository.createPayment({
//             userId: userId,
//             stripePaymentIntentId: paymentIntent.id,
//             status: PaymentStatus.SUCCEEDED,
//             amount: invoice.amount_paid, // Use amount_paid from invoice
//             currency: invoice.currency,
//             productId: subscription.metadata?.internalProductId || invoice.metadata?.productId || null,
//             productType: 'subscription_renewal', // Mark as renewal
//           });
//           logger.info(`Created renewal payment record for subscription ${subscriptionId}`);
//         }


//       } catch (error) {
//         logger.error(`Error processing invoice.payment_succeeded for sub ${subscriptionId}:`, error);
//         return true; // Acknowledge
//       }
//       return true;
//     }

//     // --- Invoice Payment Failed (Renewal Failed) ---
//     if (event.type === 'invoice.payment_failed') {
//       const invoice = event.data.object as Stripe.Invoice;
//       const subscriptionId = invoice.subscription;
//       const userId = await this.getUserIdFromInvoice(invoice);

//       if (!subscriptionId || typeof subscriptionId !== 'string' || !userId) {
//         logger.warn('Webhook invoice.payment_failed missing subscription ID or userId', { invoiceId: invoice.id });
//         return true;
//       }

//       logger.warn(`Invoice payment failed for subscription ${subscriptionId}, user ${userId}`);
//       try {
//         const subscription = await stripe.subscriptions.retrieve(subscriptionId);
//         // Update status based on Stripe's status (could be 'past_due', 'canceled', 'unpaid')
//         await this.updateUserSubscriptionStatus(
//           userId,
//           subscriptionId,
//           subscription.status,
//           subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null // Keep end date for potential reactivation
//         );
//         // Optionally create a FAILED payment record
//         if (invoice.payment_intent && typeof invoice.payment_intent === 'string') {
//           await this.paymentRepository.createPayment({
//             userId: userId,
//             stripePaymentIntentId: invoice.payment_intent,
//             status: PaymentStatus.FAILED,
//             amount: invoice.amount_due,
//             currency: invoice.currency,
//             productId: subscription.metadata?.internalProductId || invoice.metadata?.productId || null,
//             productType: 'subscription_renewal_failed',
//             errorMessage: invoice.last_payment_error?.message || 'Payment failed.',
//           });
//         }
//       } catch (error) {
//         logger.error(`Error processing invoice.payment_failed for sub ${subscriptionId}:`, error);
//         return true; // Acknowledge
//       }
//       return true;
//     }

//     // --- Subscription Status Changes (canceled, trial ended without payment, etc.) ---
//     if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
//       const subscription = event.data.object as Stripe.Subscription;
//       const userId = await this.getUserIdFromSubscription(subscription);

//       if (!userId) {
//         logger.warn(`Webhook ${event.type} could not determine userId`, { subscriptionId: subscription.id });
//         return true;
//       }

//       logger.info(`Subscription ${event.type} event for user ${userId}, subscription ${subscription.id}, status: ${subscription.status}`);
//       try {
//         const stripeStatus = event.type === 'customer.subscription.deleted' ? 'deleted' : subscription.status;
//         // Use canceled_at if available and it's a cancellation event
//         const endDate = (stripeStatus === 'canceled' || stripeStatus === 'deleted') && subscription.canceled_at
//           ? new Date(subscription.canceled_at * 1000)
//           : (subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null); // Otherwise use period end

//         await this.updateUserSubscriptionStatus(userId, subscription.id, stripeStatus, endDate);
//       } catch (error) {
//         logger.error(`Error processing ${event.type} for sub ${subscription.id}:`, error);
//         return true; // Acknowledge
//       }
//       return true;
//     }

//     // --- Trial Will End (Optional: Send Reminder Email) ---
//     if (event.type === 'customer.subscription.trial_will_end') {
//       const subscription = event.data.object as Stripe.Subscription;
//       const userId = await this.getUserIdFromSubscription(subscription);
//       // Send reminder email to user userId
//       logger.info(`Trial ending soon for user ${userId}, subscription ${subscription.id}`);
//       // Add your email sending logic here
//       return true; // Acknowledge
//     }


//     logger.warn(`Unhandled Stripe event type received: ${event.type} (ID: ${event.id})`);
//     return true; // Acknowledge receipt of unhandled events
//   }

//   // --- Helper Functions (getUserIdFromInvoice, getUserIdFromSubscription) remain the same ---
//   private async getUserIdFromInvoice(invoice: Stripe.Invoice): Promise<string | null> {
//     // 1. Check Invoice metadata first (most reliable if you set it)
//     if (invoice.metadata?.userId) return invoice.metadata.userId;

//     // 2. Check Subscription metadata (if invoice is linked to a subscription)
//     if (invoice.subscription && typeof invoice.subscription === 'string') {
//       try {
//         const subscription = await stripe.subscriptions.retrieve(invoice.subscription, { expand: ['metadata'] });
//         if (subscription.metadata?.userId) {
//           return subscription.metadata.userId;
//         }
//       } catch (error) {
//         logger.warn(`Could not retrieve subscription ${invoice.subscription} during userId lookup for invoice ${invoice.id}`, error);
//       }
//     }

//     // 3. Check Customer metadata (fallback)
//     if (invoice.customer && typeof invoice.customer === 'string') {
//       try {
//         const customer = await stripe.customers.retrieve(invoice.customer, { expand: ['metadata'] });
//         if (!customer.deleted && customer.metadata?.userId) {
//           return customer.metadata.userId;
//         }
//       } catch (error) {
//         logger.warn(`Could not retrieve customer ${invoice.customer} during userId lookup for invoice ${invoice.id}`, error);
//       }
//     }

//     logger.warn(`Could not determine userId for invoice ${invoice.id}`);
//     return null;
//   }

//   private async getUserIdFromSubscription(subscription: Stripe.Subscription): Promise<string | null> {
//     // 1. Check Subscription metadata first
//     if (subscription.metadata?.userId) return subscription.metadata.userId;

//     // 2. Check Customer metadata (fallback)
//     if (subscription.customer && typeof subscription.customer === 'string') {
//       try {
//         const customer = await stripe.customers.retrieve(subscription.customer, { expand: ['metadata'] });
//         if (!customer.deleted && customer.metadata?.userId) {
//           return customer.metadata.userId;
//         }
//       } catch (error) {
//         logger.warn(`Could not retrieve customer ${subscription.customer} during userId lookup for subscription ${subscription.id}`, error);
//       }
//     }
//     logger.warn(`Could not determine userId for subscription ${subscription.id}`);
//     return null;
//   }


//   /**
//    * Updates the user's subscription details in the database based on Stripe status.
//    */
//   private async updateUserSubscriptionStatus(
//     userId: string,
//     stripeSubscriptionId: string,
//     stripeStatus: Stripe.Subscription.Status | 'deleted',
//     periodEndDate?: Date | null
//   ): Promise<void> {
//     logger.info(`Updating subscription status for user ${userId}, sub ${stripeSubscriptionId} to Stripe status ${stripeStatus}`);

//     let appStatus: SubscriptionStatus;
//     let finalEndDate: Date | null = periodEndDate || null;
//     let finalSubscriptionId: string | null = stripeSubscriptionId;

//     switch (stripeStatus) {
//       case 'active':
//         appStatus = SubscriptionStatus.ACTIVE;
//         break;
//       case 'trialing':
//         appStatus = SubscriptionStatus.TRIAL;
//         break;
//       case 'past_due':
//         appStatus = SubscriptionStatus.PAST_DUE;
//         break;
//       case 'canceled': // User explicitly canceled, but might still be active until periodEndDate
//         appStatus = SubscriptionStatus.CANCELED;
//         // Keep finalEndDate as periodEndDate unless canceled_at is present and earlier
//         break;
//       case 'unpaid': // Often leads to cancellation, treat as PAST_DUE or CANCELED
//         appStatus = SubscriptionStatus.PAST_DUE; // Or CANCELED depending on Stripe settings/grace period
//         break;
//       case 'incomplete': // Payment setup not finished
//       case 'incomplete_expired': // Setup expired
//         appStatus = SubscriptionStatus.NONE; // Treat as if no subscription exists
//         finalEndDate = null;
//         finalSubscriptionId = null;
//         break;
//       case 'deleted': // Subscription removed entirely in Stripe
//         appStatus = SubscriptionStatus.NONE; // Or CANCELED if you prefer
//         finalEndDate = null;
//         finalSubscriptionId = null;
//         break;
//       default:
//         logger.warn(`Unknown Stripe subscription status encountered: ${stripeStatus}. Setting status to NONE.`);
//         appStatus = SubscriptionStatus.NONE;
//         finalEndDate = null;
//         finalSubscriptionId = null;
//     }

//     // If status indicates termination, ensure end date is cleared
//     if (appStatus === SubscriptionStatus.NONE || appStatus === SubscriptionStatus.CANCELED && !finalEndDate) {
//       finalEndDate = null;
//     }
//     // If status indicates termination, ensure subscription ID is cleared
//     if (appStatus === SubscriptionStatus.NONE) {
//       finalSubscriptionId = null;
//     }


//     try {
//       await prisma.user.update({
//         where: { id: userId },
//         data: {
//           subscriptionStatus: appStatus,
//           subscriptionId: finalSubscriptionId, // Use potentially nulled ID
//           subscriptionEndDate: finalEndDate,
//         },
//       });
//       logger.info(`Successfully updated user ${userId} subscription status in DB to ${appStatus}, EndDate: ${finalEndDate}, SubId: ${finalSubscriptionId}`);
//     } catch (error) {
//       logger.error(`Failed to update user subscription status in DB for user ${userId}`, { error });
//     }
//   }
// }

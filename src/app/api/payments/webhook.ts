
// src/app/api/payments/webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PaymentService } from '@/services/payment.service';
import { PaymentRepository } from '@/repositories/payment.repository'; // Import concrete repository
import logger from '@/utils/logger';
import { buffer } from 'micro'; // Helper to read raw body

// Important: Disable Next.js body parsing for this route
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to instantiate the service with its dependencies
function createPaymentService(): PaymentService {
  const paymentRepository = new PaymentRepository();
  return new PaymentService(paymentRepository);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const sig = req.headers['stripe-signature'];
  let rawBody: Buffer;

  try {
    rawBody = await buffer(req); // Read the raw body
  } catch (error: any) {
    logger.error('Error reading webhook request body:', error);
    return res.status(400).json({ error: 'Could not read request body.' });
  }

  try {
    // Instantiate the service using the helper
    const paymentService = createPaymentService();
    await paymentService.handleWebhook(rawBody, sig);
    logger.info('Stripe webhook processed successfully.');
    return res.status(200).json({ received: true });

  } catch (error: any) {
    logger.error('Error processing Stripe webhook:', { error: error.message });
    // Return specific status codes if needed (e.g., 400 for signature error)
    let statusCode = 400; // Default bad request
    if (error.message.includes('Webhook secret not configured') || error.message.includes('Payment system unavailable')) {
      statusCode = 500; // Internal server error if config is missing
    }
    // Add more specific status codes based on error types if necessary
    return res.status(statusCode).json({ error: `Webhook Error: ${error.message}` });
  }
}

// // src/app/api/payments/webhook.ts
// import type { NextApiRequest, NextApiResponse } from 'next';
// import { PaymentService } from '@/services/payment.service';
// import { PaymentRepository } from '@/repositories/payment.repository'; // Import concrete repository
// import logger from '@/utils/logger';
// import { buffer } from 'micro';

// export const config = {
//   api: {
//     bodyParser: false,
//   },
// };

// // Helper function to instantiate the service with its dependencies
// function createPaymentService(): PaymentService {
//   const paymentRepository = new PaymentRepository(); // Create instance of repository
//   return new PaymentService(paymentRepository); // Inject repository into service
// }

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method !== 'POST') {
//     res.setHeader('Allow', 'POST');
//     return res.status(405).end('Method Not Allowed');
//   }

//   const sig = req.headers['stripe-signature'];
//   let rawBody: Buffer;

//   try {
//     rawBody = await buffer(req);
//   } catch (error: any) {
//     logger.error('Error reading webhook request body:', error);
//     return res.status(400).json({ error: 'Could not read request body.' });
//   }

//   if (!sig) {
//     logger.error('Webhook error: Missing stripe-signature header');
//     return res.status(400).send('Webhook Error: Missing signature');
//   }


//   try {
//     const paymentService = createPaymentService(); // Use helper
//     await paymentService.handleWebhook(rawBody, sig);
//     logger.info('Stripe webhook processed successfully.');
//     return res.status(200).json({ received: true });

//   } catch (error: any) {
//     logger.error('Error processing Stripe webhook:', { error: error.message });
//     let statusCode = 400;
//     if (error.message.includes('Webhook secret not configured')) {
//       statusCode = 500;
//     } else if (error.message.includes('signature verification failed')) {
//       statusCode = 400; // Bad request due to signature
//     }
//     // Log the specific error message from Stripe if available
//     const errorMessage = error.message || 'Unknown webhook error';
//     return res.status(statusCode).json({ error: `Webhook Error: ${errorMessage}` });
//   }
// }

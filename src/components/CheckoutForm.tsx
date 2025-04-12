// import React, { useState, useEffect } from 'react';
// import {
//   PaymentElement,
//   Elements,
//   useStripe,
//   useElements
// } from '@stripe/react-stripe-js';
// import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
// import { createPaymentIntentAction } from '@/lib/server-actions/payment-actions';

// const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// interface CheckoutFormProps {
//   product: {
//     id: string;
//     type: string;
//     name: string;
//     amount: number;
//     currency: string;
//   };
// }

// // Inner form component remains largely the same
// const InnerForm: React.FC<CheckoutFormProps> = ({ product }) => {
//   const stripe = useStripe();
//   const elements = useElements();
//   const [errorMessage, setErrorMessage] = useState<string | null>(null);
//   const [isLoading, setIsLoading] = useState(false);

//   const handleSubmit = async (event: React.FormEvent) => {
//     event.preventDefault();
//     setErrorMessage(null);

//     if (!stripe || !elements) {
//       setErrorMessage("Payment system not ready.");
//       return;
//     }

//     setIsLoading(true);

//     // Confirm the payment (this part stays the same)
//     const { error } = await stripe.confirmPayment({
//       elements,
//       confirmParams: {
//         return_url: `${process.env.NEXT_PUBLIC_APP_BASE_URL}/payment-status`,
//         // receipt_email: 'customer@example.com', // Get from user profile if needed
//       },
//     });

//     if (error.type === "card_error" || error.type === "validation_error") {
//       setErrorMessage(error.message || 'An unexpected error occurred.');
//     } else if (error) {
//       setErrorMessage("An unexpected error occurred during payment confirmation.");
//     }
//     // If successful, the user is redirected to return_url, so setLoading(false)
//     // might not be reached unless there's an immediate error.
//     setIsLoading(false);
//   };

//   return (
//     <form onSubmit={handleSubmit}>
//       <PaymentElement />
//       <button disabled={isLoading || !stripe || !elements} style={{ marginTop: '20px' }}>
//         {isLoading ? 'Processing...' : `Pay $${product.amount.toFixed(2)}`}
//       </button>
//       {errorMessage && <div style={{ color: 'red', marginTop: '10px' }}>{errorMessage}</div>}
//     </form>
//   );
// };


// // Main component wrapper - Updated to call the Server Action
// const CheckoutForm: React.FC<CheckoutFormProps> = (props) => {
//   const [clientSecret, setClientSecret] = useState<string | null>(null);
//   const [loadingSecret, setLoadingSecret] = useState(true);
//   const [fetchError, setFetchError] = useState<string | null>(null);

//   useEffect(() => {
//     const fetchIntent = async () => {
//       setLoadingSecret(true);
//       setFetchError(null);
//       try {
//         // --- CALL SERVER ACTION ---
//         const result = await createPaymentIntentAction(props.product);
//         // --------------------------

//         if (result.error) {
//           throw new Error(result.error);
//         }
//         if (!result.clientSecret) {
//           throw new Error('Failed to retrieve payment details.'); // Should not happen if error is null
//         }
//         setClientSecret(result.clientSecret);
//       } catch (error: any) {
//         console.error("Error fetching client secret:", error);
//         setFetchError(error.message || 'Could not initialize payment.');
//       } finally {
//         setLoadingSecret(false);
//       }
//     };
//     fetchIntent();
//   }, [props.product]); // Re-fetch if product changes

//   const options: StripeElementsOptions | undefined = clientSecret
//     ? { clientSecret, appearance: { theme: 'stripe' } }
//     : undefined;

//   if (loadingSecret) return <div>Loading Payment Details...</div>;
//   if (fetchError) return <div style={{ color: 'red' }}>Error: {fetchError}</div>;
//   if (!clientSecret || !options) return <div>Could not initialize payment form. Please refresh.</div>;

//   return (
//     <Elements stripe={stripePromise} options={options}>
//       <InnerForm {...props} /> {/* Pass product props down */}
//     </Elements>
//   );
// };

// export default CheckoutForm;

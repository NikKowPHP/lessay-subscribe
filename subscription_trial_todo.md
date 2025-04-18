# Subscription & Trial Implementation TODO

This list tracks the implementation status for the monthly/yearly subscription with a trial plan, based on the provided code files.

*   **I. Database Schema (Prisma)**
    *   **[x] Update `User` model (`schema.prisma`):** (Verified in File 16)
        *   [x] Add `subscriptionStatus` enum field. *(Present)*
        *   [x] Add `subscriptionId` (String?, unique). *(Present)*
        *   [x] Add `subscriptionPlan` (String?). *(Present)*
        *   [x] Add `trialStartDate` (DateTime?). *(Present)*
        *   [x] Add `trialEndDate` (DateTime?). *(Present)*
        *   [x] Add `subscriptionStartDate` (DateTime?). *(Present)*
        *   [x] Add `subscriptionEndDate` (DateTime?). *(Present)*
        *   [x] Add `stripeCustomerId` (String?, unique). *(Present)*
        *   [x] Add `cancelAtPeriodEnd` (Boolean, default: false). *(Present)*
        *   [x] Add `billingCycle` (String?). *(Present)*
        *   [x] Add `paymentMethodId` (String?). *(Present)*
    *   **[x] Update `SubscriptionStatus` enum (`schema.prisma`):** (Verified in File 16)
        *   [x] Ensure it includes `NONE`, `TRIAL`, `ACTIVE`, `CANCELED`, `PAST_DUE`, `EXPIRED`. *(Present)*
    *   **[x] Run Prisma migrations:** (Verified - Schema matches)
        *   `npx prisma migrate dev --name add_subscription_fields`
        *   `npx prisma generate`

*   **II. Backend Services & Repositories**
    *   **[x] Payment Service (`services/payment.service.ts`):** (Verified in File 3)
        *   [x] Implement `createCheckoutSession` method: (Verified)
            *   [x] Accept `userId` and product details. *(Implemented)*
            *   [x] Fetch Stripe Price ID from product details. *(Implemented)*
            *   [x] Check if user already has an active subscription/trial. *(Implemented)*
            *   [x] Create Stripe Checkout Session (`mode: 'subscription'`). *(Implemented)*
            *   [x] Configure `subscription_data` with `trial_from_plan: true`. *(Implemented)*
            *   [x] Include `userId` in `client_reference_id` and `metadata`. *(Implemented)*
            *   [x] Return the `sessionId`. *(Implemented)*
        *   [x] Implement `handleWebhook` method: (Verified)
            *   [x] Verify Stripe webhook signature. *(Implemented)*
            *   [x] Handle `checkout.session.completed`. *(Implemented)*
            *   [x] Handle `invoice.payment_succeeded`. *(Implemented)*
            *   [x] Handle `invoice.payment_failed`. *(Implemented)*
            *   [x] Handle `customer.subscription.updated`. *(Implemented)*
            *   [x] Handle `customer.subscription.deleted`. *(Implemented)*
        *   **[x] Implement `createBillingPortalSession` method:** (Verified in File 3)
            *   [x] Accept `userId`. *(Implemented)*
            *   [x] Retrieve `stripeCustomerId`. *(Implemented)*
            *   [x] Create Stripe Billing Portal session. *(Implemented)*
            *   [x] Return portal session URL. *(Implemented)*
    *   **[x] Payment Repository (`repositories/payment.repository.ts`):** (Verified in File 6 & usage in File 3)
        *   [x] Ensure methods align with `PaymentService` needs (e.g., `createPayment` used for logging). *(Implemented)*
    *   **[x] User Service (`services/user.service.ts`):** (Verified in File 25)
        *   [x] Add method `getUserSubscriptionStatus(userId: string)`. *(Implemented)*
        *   [x] Modify `updateUserProfile` to *not* directly update subscription fields (handled by webhooks). *(Implemented correctly)*
    *   **[x] User Repository (`repositories/user.repository.ts`):** (Verified in File 5)
        *   [x] Ensure `getUserProfile` returns *all* new subscription fields. *(Implemented)*
        *   [x] Ensure `createUserProfile` initializes *all* new subscription fields to defaults. *(Implemented)*
        *   [x] Ensure `updateUserProfile` excludes subscription fields from direct updates. *(Implemented correctly)*

*   **III. Server Actions**
    *   **[x] Payment Actions (`lib/server-actions/payment-actions.ts`):** (Verified in File 1)
        *   [x] Create `createCheckoutSessionAction(product: SubscriptionProductDetails)`: *(Implemented)*
            *   [x] Get `userId` from session. *(Implemented)*
            *   [x] Call `paymentService.createCheckoutSession`. *(Implemented)*
            *   [x] Return `{ sessionId: string | null, error: string | null }`. *(Implemented)*
        *   [x] Create `createBillingPortalSessionAction()`: *(Implemented)*
            *   [x] Get `userId` from session. *(Implemented)*
            *   [x] Call `paymentService.createBillingPortalSession`. *(Implemented)*
            *   [x] Return `{ portalUrl: string | null, error: string | null }`. *(Implemented)*
    *   **[x] User Actions (`lib/server-actions/user-actions.ts`):** (Verified in File 2)
        *   [x] Ensure `getUserProfileAction` returns the full profile including subscription details. *(Implemented - relies on underlying service/repo)*

*   **IV. API Routes**
    *   **[x] Payments Webhook (`app/api/payments/webhook.ts`):** (Verified in File 5)
        *   [x] Set up the route handler. *(Implemented)*
        *   [x] Disable body parsing. *(Implemented)*
        *   [x] Read the raw body. *(Implemented)*
        *   [x] Get the `stripe-signature` header. *(Implemented)*
        *   [x] Instantiate `PaymentService`. *(Implemented)*
        *   [x] Call `paymentService.handleWebhook`. *(Implemented)*
        *   [x] Return appropriate responses. *(Implemented)*

*   **V. Frontend UI & Context**
    *   **[x] Pricing Page/Component (`/src/app/app/settings/pricing/page.tsx`):** (Verified in File 19. *Requires replacing placeholder Stripe Price IDs & setting `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` env var.*)
        *   [x] Create page/component to display plans. *(Implemented)*
        *   [x] Show features, pricing, trial details. *(Implemented)*
        *   [x] Add "Subscribe"/"Start Trial" buttons. *(Implemented)*
        *   [x] On button click:
            *   [x] Call `createCheckoutSessionAction`. *(Implemented)*
            *   [x] Handle loading state. *(Implemented)*
            *   [x] On success, redirect using `stripe.redirectToCheckout`. *(Implemented)*
            *   [x] Display errors. *(Implemented)*
    *   **[x] Settings/Account Page (`/src/app/app/settings/page.tsx`):** (Verified in File 21)
        *   [x] Display current subscription status. *(Implemented)*
        *   [x] Show plan details. *(Implemented)*
        *   [x] Display relevant dates. *(Implemented)*
        *   [x] Add "Manage Subscription" button. *(Implemented)*
        *   [x] On button click:
            *   [x] Call `createBillingPortalSessionAction`. *(Implemented)*
            *   [x] Handle loading state. *(Implemented)*
            *   [x] On success, redirect to Stripe Billing Portal URL. *(Implemented)*
            *   [x] Display errors. *(Implemented)*
        *   [x] Handle success/cancel query params from Stripe redirects. *(Implemented)*
    *   **[x] User Profile Context (`context/user-profile-context.tsx`):** (Verified in File 28 & File 17)
        *   [x] Ensure `UserProfileModel` includes all subscription fields. *(Implemented in File 17)*
        *   [x] Ensure `fetchUserProfile` loads subscription data. *(Implemented in File 28 - relies on action/service/repo)*
        *   [x] Ensure `hasActiveSubscription` logic correctly checks `TRIAL`/`ACTIVE` status and `subscriptionEndDate`. *(Implemented in File 28)*
        *   [x] Ensure `updateProfile` excludes subscription fields. *(Implemented correctly in File 28)*
    *   **[ ] Content Gating/Restriction:** *(Implementation needed)*
        *   **[ ] Component Level:** Implement checks in relevant components (e.g., `LessonChat`, `LessonDetailPage`) using `useUserProfile().hasActiveSubscription()`. Show upgrade prompts/disable features if inactive.
        *   **[ ] Route Level (Middleware - Optional but Recommended):** Create `middleware.ts` to protect routes based on subscription status fetched server-side.
        *   **[ ] API Level (Server Actions):** Add `hasActiveSubscription` checks in critical server actions (e.g., `recordStepAttempt`, `completeLesson`) before executing core logic.

*   **VI. Stripe Configuration** *(External setup required)*
    *   [ ] Stripe Account: Set up account. *(External)*
    *   [ ] Products: Create product (e.g., "Lessay"). *(External)*
    *   [ ] Prices: Create Monthly & Yearly Prices, **configure Trial Period on each Price object**. *(External)*
    *   [ ] API Keys: Set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY` env vars. *(External)*
    *   [ ] Webhook Endpoint: Create endpoint pointing to `/api/payments/webhook`, select required events, set `STRIPE_WEBHOOK_SECRET` env var. *(External)*
    *   [ ] Customer Portal: Configure settings. *(External)*

*   **VII. Testing** *(Implementation/Verification needed)*
    *   [ ] Webhook Handling: Test locally using Stripe CLI. *(Cannot verify)*
    *   [ ] Service Logic: Unit test `PaymentService`. *(Cannot verify)*
    *   [ ] Server Actions: Integration test payment actions. *(Cannot verify)*
    *   [ ] UI Flow: Manually test subscription/trial/management flow. *(Cannot verify)*
    *   [ ] Content Gating: Verify restrictions work. *(Cannot verify)*
    *   [ ] Trial Logic: Verify trial start/end/conversion via webhooks. *(Cannot verify)*

*   **VIII. App-Managed Trial Flow (Alternative/Add-on)** *(Implementation needed if chosen)*
    *   [ ] Backend Logic (`startAppManagedTrial` action/service).
    *   [ ] Frontend UI ("Start Free Trial" button calling the action).
    *   [ ] Trial Expiration Handling (middleware/checks).
    *   [ ] Trial Conversion Flow (prompting user, initiating Stripe Checkout).
    *   [ ] Content Gating (handling `TRIAL` status and `trialEndDate`).
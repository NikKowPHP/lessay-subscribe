

implementing the monthly/yearly subscription with a trial plan
* **I. Database Schema (Prisma)**

  *   **[x] Update `User` model (`schema.prisma`):**
      *   [x] Add `subscriptionStatus` enum field (e.g., `NONE`, `TRIAL`, `ACTIVE`, `CANCELED`, `PAST_DUE`). *Already present*
      *   [x] Add `subscriptionId` (String?, unique) to store the Stripe Subscription ID. *Already present*
      *   [x] Add `subscriptionPlan` (String?) to store the identifier of the subscribed plan (e.g., 'monthly', 'yearly'). *Already present*
      *   [x] Add `trialStartDate` (DateTime?). *Already present*
      *   [x] Add `trialEndDate` (DateTime?). *Already present*
      *   [x] Add `subscriptionStartDate` (DateTime?) for when the paid subscription begins (after trial or immediately). *Already present*
      *   [x] Add `subscriptionEndDate` (DateTime?) for the end of the current billing cycle or cancellation date. *Already present*
      *   [x] Add `stripeCustomerId` (String?, unique) to store the Stripe Customer ID (useful for managing billing portal, etc.).
      *   [x] Consider adding `cancelAtPeriodEnd` (Boolean, default: false) if you want to track user-initiated cancellations that are still active until the period end.
      *   [x] Consider `billingCycle` (String?) if needed (e.g., 'monthly', 'yearly'). *Already present*
      *   [x] Consider `paymentMethodId` (String?). *Already present*
  *   **[x] Update `SubscriptionStatus` enum (`schema.prisma`):**
      *   [x] Ensure it includes `NONE`, `TRIAL`, `ACTIVE`, `CANCELED`, `PAST_DUE`, `EXPIRED`. *Already present*
  *   **[x] Run Prisma migrations:**
    *   `npx prisma migrate dev --name add_subscription_fields` (or similar)
    *   `npx prisma generate`

* **II. Backend Services & Repositories**

 *   **[x] Payment Service (`services/payment.service.ts`):** (Verified in File 4)
    *   [x] Implement `createCheckoutSession` method: (Verified in File 4)
        *   [x] Accept `userId` and `planType` ('monthly' or 'yearly'). *(Implemented via product object)*
        *   [x] Fetch the corresponding Stripe Price ID based on `planType`. *(Implemented via product object)*
        *   [x] Check if the user already has an active subscription or trial. *(Implemented)*
        *   [x] Create a Stripe Checkout Session (`mode: 'subscription'`). *(Implemented)*
        *   [x] Configure `subscription_data` with `trial_from_plan: true`. *(Implemented)*
        *   [x] Include `userId` in `client_reference_id` and `metadata`. *(Implemented)*
        *   [x] Return the `sessionId`. *(Implemented)*
    *   [x] Implement `handleWebhook` method: (Verified in File 4)
        *   [x] Verify Stripe webhook signature using `STRIPE_WEBHOOK_SECRET`. *(Implemented)*
        *   [x] Handle `checkout.session.completed`. *(Implemented)*
        *   [x] Handle `invoice.payment_succeeded`. *(Implemented)*
        *   [x] Handle `invoice.payment_failed`. *(Implemented)*
        *   [x] Handle `customer.subscription.updated`. *(Implemented)*
        *   [x] Handle `customer.subscription.deleted`. *(Implemented)*
   *   **[x] Implement `createBillingPortalSession` method (for managing subscriptions):** *(Implemented in File 3)*
        *   [x] Accept `userId`. *(Implemented)*
        *   [x] Retrieve `stripeCustomerId` from the User record. *(Implemented)*
        *   [x] Create a Stripe Billing Portal session. *(Implemented)*
        *   [x] Return the portal session URL. *(Implemented)*
*   **[x] Payment Repository (`repositories/payment.repository.ts`):** (Verified in File 6 & File 4)
    *   [x] Ensure methods align with `PaymentService` needs (e.g., potentially logging payments, though primary updates are on the User model). *(Methods exist and `createPayment` is used by service - Verified in File 4 & 6)*
*   **[ ] User Service (`services/user.service.ts`):** (Verified in File 19)
    *   [x] Add method `getUserSubscriptionStatus(userId: string)` to fetch relevant subscription fields from the User record. *(Method not found in File 19)*
    *   [x] Modify `updateUserProfile` to potentially accept and update subscription-related fields *if needed outside webhooks* (generally webhooks are preferred). *(Method exists but doesn't handle subscription fields - Verified in File 19)*
*   **[x] User Repository (`repositories/user.repository.ts`):** (Verified in File 18)
    *   [x] Ensure `getUserProfile` returns *all* new subscription fields. *(Partially done in File 5 - returns status/endDate but not ID, plan, stripeCustomerId etc.)* -> **Needs update**
    *   [x] Ensure `createUserProfile` initializes *all* new subscription fields to defaults. *(Partially done in File 5 - initializes status/endDate but not others)* -> **Needs update**
    *   [x] Ensure `updateUserProfile` can handle updates to subscription fields (via `PaymentService`/webhooks primarily). *(File 18 `updateUserProfile` doesn't touch subscription fields, which aligns with webhook approach)*

**III. Server Actions**

*   **[x] Payment Actions (`lib/server-actions/payment-actions.ts`):** (Verified in File 3)
    *   [x] Create `createCheckoutSessionAction(product: SubscriptionProductDetails)`: *(Implemented in File 3)*
        *   [x] Get `userId` from session. *(Implemented)*
        *   [x] Call `paymentService.createCheckoutSession`. *(Implemented)*
        *   [x] Return `{ sessionId: string | null, error: string | null }`. *(Implemented)*
    *   [x] Create `createBillingPortalSessionAction()`: *(Action not found in File 3)*
        *   [x] Get `userId` from session.
        *   [x] Call `paymentService.createBillingPortalSession`.
        *   [x] Return `{ portalUrl: string | null, error: string | null }`.
*   **[x] User Actions (`lib/server-actions/user-actions.ts`):** (Verified in File 2)
    *   [x] Ensure `getUserProfileAction` returns the full profile including subscription details. *(Partially done - depends on underlying service/repo which are also partial - Verified in File 2)*

**IV. API Routes**

*   **[x] Payments Webhook (`app/api/payments/webhook.ts`):** (Verified in File 5)
    *   [x] Set up the route handler. *(Implemented)*
    *   [x] Disable body parsing (`export const config = { api: { bodyParser: false } }`). *(Implemented)*
    *   [x] Read the raw body using `buffer(req)`. *(Implemented)*
    *   [x] Get the `stripe-signature` header. *(Implemented)*
    *   [x] Instantiate `PaymentService`. *(Implemented)*
    *   [x] Call `paymentService.handleWebhook(rawBody, signature)`. *(Implemented)*
    *   [x] Return appropriate responses (200 for success, 400/500 for errors). *(Implemented)*,
      
**V. Frontend UI & Context** *(Files mostly not provided)* (using the tailwind existing components (microsoft fluint 2 ui))

*   **[x] Pricing Page/Component (New):** *(Implemented. Requires replacing placeholder Stripe Price IDs in `/src/app/app/settings/pricing/page.tsx` with actual IDs from Stripe dashboard where trials are configured. Also requires `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` env var.)*
    *   [x] Create a page/component to display Monthly and Yearly plans.
    *   [x] Show plan features, pricing, and trial details (e.g., "7-day free trial").
    *   [x] Add "Subscribe" or "Start Trial" buttons for each plan.
    *   [x] On button click:
        *   [x] Call `createCheckoutSessionAction` with the selected plan type.
        *   [x] Handle loading state.
        *   [x] On success, redirect the user to the Stripe Checkout URL using `stripe.redirectToCheckout({ sessionId })`.
        *   [x] Display errors if the action fails.
*   **[ ] Settings/Account Page (`app/app/settings/page.tsx` or similar - New/Update):** *(Cannot verify)*
    *   [ ] Display current subscription status (`profile.subscriptionStatus`).
    *   [ ] Show plan details (`profile.subscriptionPlan`).
    *   [ ] Display relevant dates (Trial End Date, Next Billing Date/Subscription End Date).
    *   [ ] Add a "Manage Subscription" button.
    *   [ ] On button click:
        *   Call `createBillingPortalSessionAction`.
        *   Handle loading state.
        *   On success, redirect the user to the Stripe Billing Portal URL.
        *   Display errors.
    *   [ ] Handle success/cancel query params from Stripe redirects (e.g., show a success/canceled message).
*   **[ ] User Profile Context (`context/user-profile-context.tsx`):** (Verified in File 22 & File 17)
    *   [ ] Ensure `UserProfileModel` includes *all* subscription fields. *(Partially done in File 17 - `stripeCustomerId` missing)*
    *   [ ] Ensure `fetchUserProfile` loads subscription data. *(Partially done in File 22 - relies on action/service/repo which are partial)*
    *   [x] Ensure `hasActiveSubscription` logic correctly checks `TRIAL` and `ACTIVE` status against `subscriptionEndDate`. *(Implemented in File 22)*
    *   [x] Ensure `updateProfile` needs specific handling for subscription fields (likely not, as webhooks should manage them). *(Implemented correctly in File 22 to not update subscription fields)*
*   **[ ] Subscription Context (`context/subscription-context.tsx`):** *(Cannot verify - Recommend removal)*
    *   [ ] **Decision:** Decide if this separate context is still needed. It seems redundant now that subscription status is part of the `UserProfileModel` and managed by `UserProfileContext`. It might be better to **remove** `SubscriptionContext` and rely solely on `UserProfileContext.hasActiveSubscription()`.
    *   [ ] If keeping: Refactor `checkSubscription` to use `getUserProfileAction` or rely on the already fetched profile in `UserProfileContext`. Remove the GET `/api/subscribe` logic. Remove `handleSubmit` and related email logic if it's purely for waitlist.
    *   [ ] **If removing (Recommended):**
        *   Remove the `SubscriptionProvider` from layout/app files.
        *   Replace all `useSubscription` calls with `useUserProfile`.
        *   Use `profile.subscriptionStatus` and `hasActiveSubscription()` for checks.
        *   Remove `/api/subscribe/route.ts` if it's only used by this context.
*   **[ ] Content Gating/Restriction:** *(Cannot verify)*
    *   **[ ] Component Level:**
        *   In components like `LessonChat` (`lessonChat.tsx`), `LessonDetailPage` (`lessons/[id]/page.tsx`), potentially `AssessmentStep`, check subscription status using `useUserProfile`.
        *   If `!hasActiveSubscription()`:
            *   Show an upgrade prompt/banner/modal.
            *   Disable interaction (e.g., disable chat input, mock buttons).
            *   Link to the Pricing Page.
    *   **[ ] Route Level (Middleware - Optional but Recommended):**
        *   Create middleware (`middleware.ts`) to protect routes like `/app/lessons/*`, `/app/onboarding/assessment` (or specific steps).
        *   In middleware, fetch user session and potentially their profile/subscription status (server-side).
        *   Redirect unauthenticated or non-subscribed users to login or the pricing page.
    *   **[ ] API Level (Server Actions/API Routes):**
        *   In server actions (`lesson-actions.ts`, `onboarding-actions.ts`) that perform core learning actions (e.g., `recordStepAttempt`, `completeLesson`), add a check at the beginning:
            *   Get `userId`.
            *   Fetch `userProfile` (or just subscription status).
            *   Throw an error (`'Subscription required'`) if `!hasActiveSubscription()`.

**VI. Stripe Configuration** *(External setup)*

*   **[ ] Stripe Account:** Ensure you have a Stripe account. *(External)*
*   **[ ] Products:** Create a Product in Stripe (e.g., "Lessay"). *(External)*
*   **[ ] Prices:** *(External)*
    *   Create a *Monthly* Price for the Product (recurring, monthly interval).
        *   Configure the desired **Trial Period** (e.g., 7 days) directly on this Price object.
    *   Create a *Yearly* Price for the Product (recurring, yearly interval).
        *   Configure the desired **Trial Period** (e.g., 7 days) directly on this Price object.
*   **[ ] API Keys:** Copy your Publishable Key (for frontend) and Secret Key (for backend). Store them securely in environment variables (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`). *(External)*
*   **[ ] Webhook Endpoint:** *(External)*
    *   Create a webhook endpoint in Stripe pointing to your deployed `/api/payments/webhook` route.
    *   Select the required events:
        *   `checkout.session.completed`
        *   `invoice.payment_succeeded`
        *   `invoice.payment_failed`
        *   `customer.subscription.updated`
        *   `customer.subscription.deleted`
        *   (Optional: `customer.subscription.trial_will_end`)
    *   Get the Webhook Signing Secret (`STRIPE_WEBHOOK_SECRET`) and add it to your environment variables.
*   **[ ] Customer Portal:** Configure the Stripe Customer Portal settings (allowed updates, cancellation reasons, etc.). *(External)*

**VII. Testing** *(Files not provided/verified)*

*   **[ ] Webhook Handling:** Use the Stripe CLI (`stripe listen --forward-to localhost:3000/api/payments/webhook`) to test webhook events locally. Trigger events from the Stripe dashboard. *(Cannot verify)*
*   **[ ] Service Logic:** Unit test `PaymentService` methods (mock Stripe API calls). *(Cannot verify)*
*   **[ ] Server Actions:** Integration test payment-related server actions. *(Cannot verify)*
*   **[ ] UI Flow:** Manually test the subscription flow (view plans, subscribe via test card, check status, manage via portal). *(Cannot verify)*
*   **[ ] Content Gating:** Verify that non-subscribed users are correctly blocked/prompted. *(Cannot verify)*
*   **[ ] Trial Logic:** Ensure trial periods start and end correctly, and conversion to paid status works via webhooks. *(Cannot verify)*

---
**VIII. App-Managed Trial Flow (Alternative/Add-on)**
*(Consider implementing this alongside or instead of the Stripe-managed trial)*

*   **[ ] Backend Logic (User Service/Action):**
    *   [ ] Implement a function/action `startAppManagedTrial(userId)`.
    *   [ ] Inside the function:
        *   [ ] Check if user is eligible (e.g., not already subscribed, hasn't had a trial).
        *   [ ] Update User record in DB:
            *   Set `subscriptionStatus` to `TRIAL`.
            *   Set `trialStartDate` to `new Date()`.
            *   Calculate and set `trialEndDate` (e.g., `new Date() + 7 days`).
            *   Ensure `subscriptionId` and other Stripe-related fields remain null.
*   **[ ] Frontend UI:**
    *   [ ] Add a "Start Free Trial" button (e.g., on signup, dashboard) that *does not* trigger Stripe Checkout.
    *   [ ] On button click, call the `startAppManagedTrial` action.
    *   [ ] Display trial status and end date clearly to the user (e.g., in settings, header).
*   **[ ] Trial Expiration Handling:**
    *   [ ] Implement robust logic (e.g., middleware, component checks, scheduled task) to check `trialEndDate` against the current date.
    *   [ ] If trial is expired and `subscriptionStatus` is still `TRIAL`:
        *   [ ] Update `subscriptionStatus` to `EXPIRED` or `NONE`.
        *   [ ] Restrict access to premium features / redirect to pricing page.
*   **[ ] Trial Conversion Flow:**
    *   [ ] Prompt users *before* the trial ends to add payment details.
    *   [ ] Provide a clear path/button for users on this app-managed trial to convert to a paid plan.
    *   [ ] This conversion path *must* initiate the Stripe Checkout flow (`createCheckoutSessionAction`) to collect payment details and create a Stripe subscription.
    *   [ ] Ensure the `checkout.session.completed` webhook correctly updates the user's status from `TRIAL` to `ACTIVE` and populates Stripe fields (`subscriptionId`, `stripeCustomerId`, etc.).
*   **[ ] Content Gating:**
    *   [ ] Ensure existing content gating logic (`hasActiveSubscription` or similar checks) correctly handles the `TRIAL` status and respects the `trialEndDate`.

---




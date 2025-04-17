
- [x] Add Payments & Subscriptions
  - [x] Refactor Repositories and Services for Subscription Status (User Model)
  - [x] Add specific product handling (Subscriptions with Trial via Stripe Checkout)
    - [*Requires Stripe Price configuration with trial*]
    - [*Requires Client-side UI integration*]
  - [x] Implement fulfillment logic (Update User Subscription Status via Webhooks)
  - [ ] Add UI for Subscription Status / Management (e.g., in Settings)
  - [ ] Add UI for Payment History (Optional - Requires querying Payment records)


- [X] getLessons if empty generates new one 



### Testing Lesson Generation
- [X] Unit tests for generateInitialLessons()
  - [X] Happy path with valid assessment data
  - [X] Error when assessment not completed
  - [X] Handling empty proposedTopics from assessment
  - [X] Verify topic prioritization logic
  - [X] Test language configuration fallbacks
  - [X] Handle empty lesson generation from AI **service**


### fix the double assessment results calls
- [X] fix the double assessment results calls


## TODO: Handle Max Attempts in Assessment Steps

  **Goal:** When a user exceeds the `maxAttempts` allowed for an `AssessmentStep`, display the `expectedAnswer` as their response in the UI and play the corresponding `expectedAnswerAudioUrl`. Mark the step as correct internally to allow progression.

  **Tasks:**

  1.  **Backend Logic (`OnboardingService.recordStepAttempt`):**
      *   [x] Fetch the specific `AssessmentStep` using `lessonId` and `stepId`.
      *   [x] Check if the current `attempts` count is greater than or equal to `maxAttempts`.
      *   [x] **If max attempts reached:**
          *   [x] Log that max attempts have been reached for the step.
          *   [x] Override the incoming `userResponse` with the `step.expectedAnswer`.
          *   [x] Set the `correct` status to `true`.
          *   [x] Call the repository method (`onboardingRepository.recordStepAttempt`) with the overridden response and `correct: true`.
          *   [x] Ensure the repository method correctly increments the final attempt count and saves the forced response/correct status.
      *   [x] **If max attempts NOT reached:**
          *   [x] Proceed with the existing validation logic for the actual `userResponse`.
          *   [x] Call the repository method with the actual response and calculated `correct` status.
      *   [x] Return the updated `AssessmentStep` object from the service method.

  2.  **Frontend Logic (`LessonChat.handleSubmitStep`):**
      *   [x] Check if step was forced correct
      *   [x] Verify chat history updates (already handled)
      *   [x] Play expected answer audio if available
      *   [x] Ensure step progression works (handled by existing logic)

  3.  **Testing:**
      *   [X] Write unit tests for `OnboardingService.recordStepAttempt` covering:
          *   Scenario: Max attempts reached, incorrect user input -> forces expected answer, returns correct=true.
          *   Scenario: Max attempts reached, correct user input -> forces expected answer, returns correct=true.
          *   Scenario: Max attempts NOT reached, incorrect user input -> normal incorrect flow.
          *   Scenario: Max attempts NOT reached, correct user input -> normal correct flow.
          *   Scenario: Max attempts reached, no `expectedAnswer` available (edge case, handle gracefully).
      *   [x] Write/Update integration/component tests for `LessonChat` (or potentially `AssessmentStep.test.tsx` if easier to mock dependencies there) covering:
          *   Scenario: Max attempts reached -> `expectedAnswer` displayed in chat history.
          *   Scenario: Max attempts reached -> `expectedAnswerAudioUrl` is played if available.
          *   Scenario: Max attempts reached -> `expectedAnswerAudioUrl` is NOT played if null/empty.
          *   Scenario: Normal correct/incorrect flows before max attempts are unaffected.




implementing the monthly/yearly subscription with a trial plan
**I. Database Schema (Prisma)**

*   **[ ] Update `User` model (`schema.prisma`):**
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

**II. Backend Services & Repositories**
TODO: TO CHECK !
*   **[ ] Payment Service (`services/payment.service.ts` - requires uncommenting/creating):**
    *   [ ] Implement `createCheckoutSession` method:
        *   Accept `userId` and `planType` ('monthly' or 'yearly').
        *   Fetch the corresponding Stripe Price ID based on `planType` (store these IDs securely, e.g., in env vars or config).
        *   Check if the user already has an active subscription or trial.
        *   Create a Stripe Checkout Session (`mode: 'subscription'`).
        *   Configure `subscription_data` with `trial_from_plan: true` (assuming trial is set on the Stripe Price).
        *   Include `userId` in `client_reference_id` and `metadata`.
        *   Return the `sessionId`.
    *   [ ] Implement `handleWebhook` method:
        *   Verify Stripe webhook signature using `STRIPE_WEBHOOK_SECRET`.
        *   Handle `checkout.session.completed`:
            *   Extract `userId`, `subscriptionId`, and `stripeCustomerId` from the session/event.
            *   Retrieve the Stripe Subscription object.
            *   Update the `User` record in the DB: set `subscriptionStatus` (will be 'trialing' or 'active'), `subscriptionId`, `stripeCustomerId`, `trialStartDate`/`trialEndDate` (if trialing), `subscriptionStartDate`, `subscriptionEndDate` (period end).
        *   Handle `invoice.payment_succeeded`:
            *   Extract `userId` (from metadata or customer lookup), `subscriptionId`.
            *   Retrieve Stripe Subscription.
            *   Update the `User` record: set `subscriptionStatus` to `ACTIVE`, update `subscriptionEndDate` (period end).
            *   Potentially update `subscriptionStartDate` if it's the first payment after a trial.
        *   Handle `invoice.payment_failed`:
            *   Extract `userId`, `subscriptionId`.
            *   Update the `User` record: set `subscriptionStatus` to `PAST_DUE`.
        *   Handle `customer.subscription.updated`:
            *   Extract `userId`, `subscriptionId`.
            *   Retrieve Stripe Subscription.
            *   Update the `User` record based on the new `status` (e.g., `ACTIVE`, `CANCELED`, `PAST_DUE`) and `cancel_at_period_end`, update `subscriptionEndDate`.
        *   Handle `customer.subscription.deleted`:
            *   Extract `userId`, `subscriptionId`.
            *   Update the `User` record: set `subscriptionStatus` to `CANCELED` (or `NONE`), clear `subscriptionId`, `subscriptionEndDate`.
    *   [ ] Implement `createBillingPortalSession` method (for managing subscriptions):
        *   Accept `userId`.
        *   Retrieve `stripeCustomerId` from the User record.
        *   Create a Stripe Billing Portal session.
        *   Return the portal session URL.
*   **[ ] Payment Repository (`repositories/payment.repository.ts` - requires uncommenting/creating):**
    *   [ ] Ensure methods align with `PaymentService` needs (e.g., potentially logging payments, though primary updates are on the User model).
*   **[ ] User Service (`services/user.service.ts`):**
    *   [ ] Add method `getUserSubscriptionStatus(userId: string)` to fetch relevant subscription fields from the User record.
    *   [ ] Modify `updateUserProfile` to potentially accept and update subscription-related fields *if needed outside webhooks* (generally webhooks are preferred).
*   **[ ] User Repository (`repositories/user.repository.ts`):**
    *   [x] Ensure `getUserProfile` returns the new subscription fields. *Partially done, needs Stripe Customer ID*.
    *   [x] Ensure `createUserProfile` initializes new subscription fields to defaults (`NONE`, null). *Partially done*.
    *   [x] Ensure `updateUserProfile` can handle updates to subscription fields (via `PaymentService`/webhooks primarily). *Needs careful handling to avoid conflicts with webhooks*.

**III. Server Actions**

*   **[ ] Payment Actions (`lib/server-actions/payment-actions.ts` - requires uncommenting/creating):**
    *   [ ] Create `createCheckoutSessionAction(planType: 'monthly' | 'yearly')`:
        *   Get `userId` from session.
        *   Call `paymentService.createCheckoutSession`.
        *   Return `{ sessionId: string | null, error: string | null }`.
    *   [ ] Create `createBillingPortalSessionAction()`:
        *   Get `userId` from session.
        *   Call `paymentService.createBillingPortalSession`.
        *   Return `{ portalUrl: string | null, error: string | null }`.
*   **[ ] User Actions (`lib/server-actions/user-actions.ts`):**
    *   [x] Ensure `getUserProfileAction` returns the full profile including subscription details. *Partially done*.

**IV. API Routes**

*   **[ ] Payments Webhook (`app/api/payments/webhook/route.ts` - requires uncommenting/creating):**
    *   Set up the route handler.
    *   Disable body parsing (`export const config = { api: { bodyParser: false } }`).
    *   Read the raw body using `req.text()` or similar.
    *   Get the `stripe-signature` header.
    *   Instantiate `PaymentService`.
    *   Call `paymentService.handleWebhook(rawBody, signature)`.
    *   Return appropriate responses (200 for success, 400/500 for errors).

**V. Frontend UI & Context**

*   **[ ] Pricing Page/Component (New):**
    *   [ ] Create a page/component to display Monthly and Yearly plans.
    *   [ ] Show plan features, pricing, and trial details (e.g., "7-day free trial").
    *   [ ] Add "Subscribe" or "Start Trial" buttons for each plan.
    *   [ ] On button click:
        *   Call `createCheckoutSessionAction` with the selected plan type.
        *   Handle loading state.
        *   On success, redirect the user to the Stripe Checkout URL using `stripe.redirectToCheckout({ sessionId })`.
        *   Display errors if the action fails.
*   **[ ] Settings/Account Page (`app/app/settings/page.tsx` or similar - New/Update):**
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
*   **[ ] User Profile Context (`context/user-profile-context.tsx`):**
    *   [x] Ensure `UserProfileModel` includes all subscription fields. *Partially done, needs Stripe Customer ID etc.*
    *   [x] Ensure `fetchUserProfile` loads subscription data. *Done via action call.*
    *   [x] Ensure `hasActiveSubscription` logic correctly checks `TRIAL` and `ACTIVE` status against `subscriptionEndDate`. *Logic seems correct*.
    *   [ ] Consider if `updateProfile` needs specific handling for subscription fields (likely not, as webhooks should manage them).
*   **[ ] Subscription Context (`context/subscription-context.tsx`):**
    *   **Decision:** Decide if this separate context is still needed. It seems redundant now that subscription status is part of the `UserProfileModel` and managed by `UserProfileContext`. It might be better to **remove** `SubscriptionContext` and rely solely on `UserProfileContext.hasActiveSubscription()`.
    *   [ ] If keeping: Refactor `checkSubscription` to use `getUserProfileAction` or rely on the already fetched profile in `UserProfileContext`. Remove the GET `/api/subscribe` logic. Remove `handleSubmit` and related email logic if it's purely for waitlist.
    *   [ ] **If removing (Recommended):**
        *   Remove the `SubscriptionProvider` from layout/app files.
        *   Replace all `useSubscription` calls with `useUserProfile`.
        *   Use `profile.subscriptionStatus` and `hasActiveSubscription()` for checks.
        *   Remove `/api/subscribe/route.ts` if it's only used by this context.
*   **[ ] Content Gating/Restriction:**
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

**VI. Stripe Configuration**

*   **[ ] Stripe Account:** Ensure you have a Stripe account.
*   **[ ] Products:** Create a Product in Stripe (e.g., "Lessa App Premium").
*   **[ ] Prices:**
    *   Create a *Monthly* Price for the Product (recurring, monthly interval).
        *   Configure the desired **Trial Period** (e.g., 7 days) directly on this Price object.
    *   Create a *Yearly* Price for the Product (recurring, yearly interval).
        *   Configure the desired **Trial Period** (e.g., 7 days) directly on this Price object.
*   **[ ] API Keys:** Copy your Publishable Key (for frontend) and Secret Key (for backend). Store them securely in environment variables (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`).
*   **[ ] Webhook Endpoint:**
    *   Create a webhook endpoint in Stripe pointing to your deployed `/api/payments/webhook` route.
    *   Select the required events:
        *   `checkout.session.completed`
        *   `invoice.payment_succeeded`
        *   `invoice.payment_failed`
        *   `customer.subscription.updated`
        *   `customer.subscription.deleted`
        *   (Optional: `customer.subscription.trial_will_end`)
    *   Get the Webhook Signing Secret (`STRIPE_WEBHOOK_SECRET`) and add it to your environment variables.
*   **[ ] Customer Portal:** Configure the Stripe Customer Portal settings (allowed updates, cancellation reasons, etc.).

**VII. Testing**

*   **[ ] Webhook Handling:** Use the Stripe CLI (`stripe listen --forward-to localhost:3000/api/payments/webhook`) to test webhook events locally. Trigger events from the Stripe dashboard.
*   **[ ] Service Logic:** Unit test `PaymentService` methods (mock Stripe API calls).
*   **[ ] Server Actions:** Integration test payment-related server actions.
*   **[ ] UI Flow:** Manually test the subscription flow (view plans, subscribe via test card, check status, manage via portal).
*   **[ ] Content Gating:** Verify that non-subscribed users are correctly blocked/prompted.
*   **[ ] Trial Logic:** Ensure trial periods start and end correctly, and conversion to paid status works via webhooks.

This list provides a detailed plan. Remember to handle loading states and errors gracefully throughout the UI and backend.




# FIX
- [ ] sign up is not working
- [x] lesson chat refreeshes 
- [x] speech recognition should never stop once initiated
- [ ] button start listening is never disabled 
- [x] delay webspeech after audio queue is empty
- [x] speech recognition should not restart if the user manually stops it FINISH
- [x] media recorder fires only on start listening event and should be paused along with speech recognition
- [x] on page rehydrating do not populate the user answer if the step is not interactive 
- [x] only correct user answers gets added to the chat history 
- [x] fix issue with leson generation : issue 1 
- [ ] the lesson generation prompt is not properly constructed
- [ ] user delete all data is not working properly

## test fixes
- [ ] speech recognition should never stop once initiated
- [ ] speech recognition should not restart if the user manually stops it FINISH
- [ ] media recorder fires only on start listening event 
- [ ] on page rehydrating do not populate the user answer if the step is not interactive 
- [ ] only correct user answers gets added to the chat history 
- [ ] user info request is being populated

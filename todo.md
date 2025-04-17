



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
- [x] user delete all data is not working properly
- [ ] migrate prisma to deployment

## test fixes
- [ ] speech recognition should never stop once initiated
- [ ] speech recognition should not restart if the user manually stops it FINISH
- [ ] media recorder fires only on start listening event 
- [ ] on page rehydrating do not populate the user answer if the step is not interactive 
- [ ] only correct user answers gets added to the chat history 
- [ ] user info request is being populated





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
    *   [ ] Implement `createBillingPortalSession` method (for managing subscriptions): *(Method not found in File 4)*
        *   Accept `userId`.
        *   Retrieve `stripeCustomerId` from the User record.
        *   Create a Stripe Billing Portal session.
        *   Return the portal session URL.
*   **[x] Payment Repository (`repositories/payment.repository.ts`):** (Verified in File 6 & File 4)
    *   [x] Ensure methods align with `PaymentService` needs (e.g., potentially logging payments, though primary updates are on the User model). *(Methods exist and `createPayment` is used by service - Verified in File 4 & 6)*
*   **[ ] User Service (`services/user.service.ts`):** (Verified in File 19)
    *   [ ] Add method `getUserSubscriptionStatus(userId: string)` to fetch relevant subscription fields from the User record. *(Method not found in File 19)*
    *   [ ] Modify `updateUserProfile` to potentially accept and update subscription-related fields *if needed outside webhooks* (generally webhooks are preferred). *(Method exists but doesn't handle subscription fields - Verified in File 19)*
*   **[ ] User Repository (`repositories/user.repository.ts`):** (Verified in File 18)
    *   [ ] Ensure `getUserProfile` returns *all* new subscription fields. *(Partially done in File 18 - returns status/endDate but not ID, plan, stripeCustomerId etc.)*
    *   [ ] Ensure `createUserProfile` initializes *all* new subscription fields to defaults. *(Partially done in File 18 - initializes status/endDate but not others)*
    *   [x] Ensure `updateUserProfile` can handle updates to subscription fields (via `PaymentService`/webhooks primarily). *(File 18 `updateUserProfile` doesn't touch subscription fields, which aligns with webhook approach)*

**III. Server Actions**

*   **[x] Payment Actions (`lib/server-actions/payment-actions.ts`):** (Verified in File 3)
    *   [x] Create `createCheckoutSessionAction(product: SubscriptionProductDetails)`: *(Implemented in File 3)*
        *   [x] Get `userId` from session. *(Implemented)*
        *   [x] Call `paymentService.createCheckoutSession`. *(Implemented)*
        *   [x] Return `{ sessionId: string | null, error: string | null }`. *(Implemented)*
    *   [ ] Create `createBillingPortalSessionAction()`: *(Action not found in File 3)*
        *   Get `userId` from session.
        *   Call `paymentService.createBillingPortalSession`.
        *   Return `{ portalUrl: string | null, error: string | null }`.
*   **[ ] User Actions (`lib/server-actions/user-actions.ts`):** (Verified in File 2)
    *   [ ] Ensure `getUserProfileAction` returns the full profile including subscription details. *(Partially done - depends on underlying service/repo which are also partial - Verified in File 2)*

**IV. API Routes**

*   **[x] Payments Webhook (`app/api/payments/webhook.ts`):** (Verified in File 5)
    *   [x] Set up the route handler. *(Implemented)*
    *   [x] Disable body parsing (`export const config = { api: { bodyParser: false } }`). *(Implemented)*
    *   [x] Read the raw body using `buffer(req)`. *(Implemented)*
    *   [x] Get the `stripe-signature` header. *(Implemented)*
    *   [x] Instantiate `PaymentService`. *(Implemented)*
    *   [x] Call `paymentService.handleWebhook(rawBody, signature)`. *(Implemented)*
    *   [x] Return appropriate responses (200 for success, 400/500 for errors). *(Implemented)*,
      
**V. Frontend UI & Context** *(Files mostly not provided)*

*   **[ ] Pricing Page/Component (New):** *(Cannot verify)*
    *   [ ] Create a page/component to display Monthly and Yearly plans.
    *   [ ] Show plan features, pricing, and trial details (e.g., "7-day free trial").
    *   [ ] Add "Subscribe" or "Start Trial" buttons for each plan.
    *   [ ] On button click:
        *   Call `createCheckoutSessionAction` with the selected plan type.
        *   Handle loading state.
        *   On success, redirect the user to the Stripe Checkout URL using `stripe.redirectToCheckout({ sessionId })`.
        *   Display errors if the action fails.
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





## Multi-Language Onboarding Implementation TODO
*(Based on review of provided files, this refactor has not been implemented yet. Schema, Repositories, Services, Contexts, and UI do not reflect the proposed changes.)*


**I. Database Schema (Prisma - `schema.prisma`)**

*   **[ ] Define `LanguageProfile` Model:**
    *   Create a new model `LanguageProfile`.
    *   Fields:
        *   `id` (String, cuid, primary key)
        *   `userId` (String, relation to `User`)
        *   `nativeLanguage` (String)
        *   `targetLanguage` (String)
        *   `isActive` (Boolean, default: false - *Consider if needed, or manage active state in User*)
        *   `createdAt` (DateTime, default: now())
        *   `updatedAt` (DateTime, updatedAt)
        *   `onboarding` (Relation: One-to-One with `Onboarding`)
        *   `assessmentLesson` (Relation: One-to-One or One-to-Many with `AssessmentLesson` - *Decide if re-assessment per pair is allowed*)
        *   `lessons` (Relation: One-to-Many with `Lesson`)
        *   `learningProgress` (Relation: One-to-One with `LearningProgress`)
    *   Add unique constraint: `@@unique([userId, nativeLanguage, targetLanguage])`
    *   Add index on `userId`.
*   **[ ] Modify `User` Model:**
    *   Remove language/proficiency fields if they are only relevant *within* a language pair context (e.g., `proficiencyLevel` might move to `LanguageProfile` or `LearningProgress`). *Keep user-level defaults if needed.*
    *   Add relation: `languageProfiles LanguageProfile[]` (One-to-Many)
    *   Add field: `activeLanguageProfileId String?` (To store the ID of the currently selected profile)
    *   Add relation: `activeLanguageProfile LanguageProfile? @relation("ActiveProfile", fields: [activeLanguageProfileId], references: [id], onDelete: SetNull)`
*   **[ ] Modify `Onboarding` Model:**
    *   Remove `userId` field and relation.
    *   Add `languageProfileId String @unique` field.
    *   Add relation: `languageProfile LanguageProfile @relation(fields: [languageProfileId], references: [id], onDelete: Cascade)`
    *   Remove `nativeLanguage`, `targetLanguage`, `proficiencyLevel`, `initialAssessmentCompleted` fields (these belong to `LanguageProfile` or its related models).
*   **[ ] Modify `AssessmentLesson` Model:**
    *   Remove `userId` field and relation.
    *   Add `languageProfileId String` field (Make `@unique` if only one assessment per pair is allowed).
    *   Add relation: `languageProfile LanguageProfile @relation(fields: [languageProfileId], references: [id], onDelete: Cascade)`
    *   Remove `sourceLanguage`, `targetLanguage` fields (get from `LanguageProfile`).
*   **[ ] Modify `Lesson` Model:**
    *   Remove `userId` field and relation.
    *   Add `languageProfileId String` field.
    *   Add relation: `languageProfile LanguageProfile @relation(fields: [languageProfileId], references: [id], onDelete: Cascade)`
*   **[ ] Modify `LearningProgress` Model:**
    *   Remove `userId` field and relation.
    *   Add `languageProfileId String @unique` field.
    *   Add relation: `languageProfile LanguageProfile @relation(fields: [languageProfileId], references: [id], onDelete: Cascade)`
    *   Remove language fields if they are derived from `LanguageProfile`.
*   **[ ] Run Prisma Migrations:**
    *   `npx prisma migrate dev --name add_multi_language_profiles` (or similar)
    *   Review migration script carefully.
    *   `npx prisma generate`

**II. Backend Services & Repositories**

*   **[ ] `LanguageProfileRepository` (New):**
    *   Implement methods:
        *   `createLanguageProfile(userId, native, target)`
        *   `getLanguageProfileById(profileId)`
        *   `getLanguageProfilesByUserId(userId)`
        *   `findLanguageProfile(userId, native, target)`
        *   `setActiveLanguageProfile(userId, profileId)` (Updates `User.activeLanguageProfileId`)
        *   `getActiveLanguageProfile(userId)` (Fetches User, gets active ID, fetches Profile)
*   **[ ] `LanguageProfileService` (New):**
    *   Implement business logic using `LanguageProfileRepository`.
    *   Handle creation, retrieval, and switching logic.
*   **[ ] `UserRepository` (`repositories/user.repository.ts`):**
    *   Update `getUserProfile`: Fetch active `LanguageProfile` and include its languages. Return list of available profiles.
    *   Update `createUserProfile`: Initialize `activeLanguageProfileId` to null.
    *   Update `updateUserProfile`: Handle setting `activeLanguageProfileId`. Remove direct updates to language fields if they moved.
    *   Update `deleteUserProfile`: Ensure associated `LanguageProfile` records (and their cascades) are deleted.
*   **[ ] `UserService` (`services/user.service.ts`):**
    *   Refactor methods to align with repository changes.
    *   Add methods related to managing language profiles (e.g., `switchActiveLanguageProfile`).
*   **[ ] `OnboardingRepository` (`repositories/onboarding.repository.ts`):**
    *   Refactor all methods (`getOnboarding`, `createOnboarding`, `updateOnboarding`, `completeOnboarding`, `getAssessmentLesson`, `createAssessmentLesson`, etc.) to query/operate based on `languageProfileId` instead of `userId`.
    *   Update `getOnboarding` to `getOnboardingByLanguageProfileId(profileId)`.
    *   Update `createOnboarding` to accept `languageProfileId`.
    *   Update `getAssessmentLesson` to `getAssessmentLessonByLanguageProfileId(profileId)`.
    *   Update `createAssessmentLesson` to accept `languageProfileId` and derive languages from the profile.
*   **[ ] `OnboardingService` (`services/onboarding.service.ts`):**
    *   Refactor methods to accept `languageProfileId` or retrieve the active one via `UserService`/`LanguageProfileService`.
    *   Update `getOnboarding`, `getAssessmentLesson`, `markOnboardingAsCompleteAndGenerateLessons`, etc., to work within the context of a specific language profile.
    *   Ensure language parameters passed to `assessmentGeneratorService` come from the correct `LanguageProfile`.
*   **[ ] `LessonRepository` (`repositories/lesson.repository.ts`):**
    *   Refactor all methods (`getLessons`, `getLessonById`, `createLesson`, `updateLesson`, `completeLesson`, `deleteLesson`, `recordStepAttempt`) to query/operate based on `languageProfileId` instead of `userId`.
*   **[ ] `LessonService` (`services/lesson.service.ts`):**
    *   Refactor methods to accept `languageProfileId` or retrieve the active one.
    *   Update `getLessons`, `createLesson`, `generateInitialLessons`, `generateNewLessonsBasedOnProgress`, etc., to work within the context of a specific language profile.
    *   Ensure language parameters passed to `lessonGeneratorService` come from the correct `LanguageProfile`.
    *   Update `generateInitialLessons` logic: It should generate lessons for the *specific* `LanguageProfile` associated with the completed assessment.
    *   Update `generateNewLessonsBasedOnProgress` logic: It should analyze progress and generate lessons for the *active* `LanguageProfile`.
*   **[ ] `LearningProgressRepository` (`repositories/learning-progress.repository.ts`):**
    *   Refactor methods to query/operate based on `languageProfileId`.
*   **[ ] `LearningProgressService` (`services/learning-progress.service.ts`):**
    *   Refactor methods to accept `languageProfileId` or retrieve the active one. Ensure progress updates apply to the correct language profile.
*   **[ ] `AssessmentGeneratorService` / `LessonGeneratorService`:**
    *   No internal changes needed, but verify that the calling services (`OnboardingService`, `LessonService`) provide the correct `nativeLanguage` and `targetLanguage` based on the relevant `LanguageProfile`.

**III. Server Actions**

*   **[ ] `user-actions.ts`:**
    *   Add `setActiveLanguageProfileAction(profileId)`.
    *   Add `listLanguageProfilesAction()`.
    *   Update `getUserProfileAction` to return the active language profile details and list of available profiles.
    *   Add `createLanguageProfileAction(nativeLanguage, targetLanguage)`.
*   **[ ] `onboarding-actions.ts`:**
    *   Review all actions. They should implicitly operate on the *active* language profile. The context/page calling these actions needs to ensure the correct profile is active.
    *   `getOnboardingAction` should fetch the onboarding for the *active* profile.
    *   `createOnboardingAction` might need adjustment - when is it called? Likely after creating a *new* `LanguageProfile`. It needs the `languageProfileId`.
    *   `getAssessmentLessonAction` should fetch the assessment for the *active* profile.
    *   `markOnboardingCompleteAndGenerateInitialLessonsAction` needs to associate generated lessons with the correct (now completed) `LanguageProfile`.
*   **[ ] `lesson-actions.ts`:**
    *   Review all actions. They should operate on the *active* language profile.
    *   `getLessonsAction` fetches lessons for the active profile.
    *   `generateInitialLessonsAction` - Review if this is still needed or handled by onboarding completion. If kept, ensure it uses the correct profile.
    *   `generateNewLessonsAction` fetches progress and generates lessons for the active profile.

**IV. Frontend UI & Context**

*   **[ ] `UserProfileContext` (`context/user-profile-context.tsx`):**
    *   Modify `UserProfileModel` to include `activeLanguageProfile: LanguageProfile | null` and `availableLanguageProfiles: LanguageProfile[]`.
    *   Update `fetchUserProfile` to fetch the active profile and list of profiles via updated actions.
    *   Add state and functions to manage the active profile: `activeProfile`, `setActiveProfile(profileId)`. The `setActiveProfile` function should call the server action and then refetch the user profile to update the context.
*   **[ ] `OnboardingContext` (`context/onboarding-context.tsx`):**
    *   Refactor to rely entirely on the *active* `LanguageProfile` from `UserProfileContext`.
    *   Remove any direct fetching/management of language settings within this context.
    *   Ensure actions like `getOnboarding`, `getAssessmentLesson` implicitly use the active profile context when calling server actions.
    *   The `initializeOnboarding` effect needs adjustment. It should check if an *active* profile exists and if *that profile's* onboarding is complete. If no active profile, maybe prompt the user to select/create one?
*   **[ ] Language Profile Management UI (New Component/Page - e.g., `app/app/settings/languages/page.tsx`):**
    *   Display the list of `availableLanguageProfiles` from `UserProfileContext`.
    *   Show which profile is currently `active`.
    *   Allow users to switch the active profile (calling `setActiveProfile` from context).
    *   Provide a way to add a new language pair (e.g., a form calling `createLanguageProfileAction`). This might trigger navigation to the onboarding flow for the *newly created* profile.
*   **[ ] Header/Sidebar UI:**
    *   Consider adding a dropdown or indicator showing the currently active language pair (e.g., "EN -> DE"). Clicking it could lead to the language management page/modal.
*   **[ ] Onboarding Flow UI (`app/app/onboarding/page.tsx` and step components):**
    *   The initial state depends on the *active* `LanguageProfile`.
    *   The `LanguageSelectionStep` might be repurposed to *create* the *first* `LanguageProfile` or be part of the "Add New Language" flow.
    *   Subsequent steps (`Purpose`, `Proficiency`, `Assessment`) operate within the context of the active profile. Data saved (`markStepComplete`) should be associated with the active profile's onboarding record.
    *   `AssessmentStep` needs to load the assessment associated with the active profile.
*   **[ ] Lessons UI (`app/app/lessons/page.tsx`, `LessonChat.tsx`, etc.):**
    *   Fetch and display lessons associated only with the *active* `LanguageProfile`.
    *   Lesson completion and step attempts should be recorded against the active profile's lesson data.
*   **[ ] Learning Progress UI (If exists):**
    *   Display progress metrics specific to the *active* `LanguageProfile`.

**V. Testing**

*   **[ ] Unit Tests:**
    *   Update tests for all modified Repositories and Services (User, Onboarding, Lesson, LearningProgress) to reflect querying/updating by `languageProfileId`.
    *   Add tests for the new `LanguageProfileRepository` and `LanguageProfileService`.
    *   Update tests for Contexts (`UserProfileContext`, `OnboardingContext`) to mock and verify active profile handling.
*   **[ ] Integration Tests:**
    *   Test the flow of creating a new language profile and starting its onboarding.
    *   Test switching between two different language profiles and verifying that the correct onboarding status, assessment, and lessons are displayed.
    *   Test completing an assessment for one profile and ensuring lessons are generated only for that profile.
    *   Test completing lessons and verifying progress updates for the correct profile.
*   **[ ] Component Tests:**
    *   Test the new Language Profile Management UI.
    *   Update tests for Onboarding steps, Lesson list, LessonChat to ensure they render data based on the (mocked) active profile context.

**VI. Data Migration (If applicable)**

*   **[ ] Plan Data Migration:** If there's existing user data, devise a strategy to migrate it.
    *   For each existing user with onboarding data, create a default `LanguageProfile` using their existing `nativeLanguage` and `targetLanguage`.
    *   Associate their existing `Onboarding`, `AssessmentLesson`, `Lesson`, and `LearningProgress` records with this new `LanguageProfile`.
    *   Set this profile as the `activeLanguageProfileId` for the user.
*   **[ ] Implement Migration Script:** Write and test a script to perform the data migration *after* schema changes are applied but *before* deploying the new code.

---



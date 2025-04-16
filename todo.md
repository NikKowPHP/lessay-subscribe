
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


# TODO: Handle Max Attempts in Assessment Steps

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
    *   [ ] Write unit tests for `OnboardingService.recordStepAttempt` covering:
        *   Scenario: Max attempts reached, incorrect user input -> forces expected answer, returns correct=true.
        *   Scenario: Max attempts reached, correct user input -> forces expected answer, returns correct=true.
        *   Scenario: Max attempts NOT reached, incorrect user input -> normal incorrect flow.
        *   Scenario: Max attempts NOT reached, correct user input -> normal correct flow.
        *   Scenario: Max attempts reached, no `expectedAnswer` available (edge case, handle gracefully).
    *   [ ] Write/Update integration/component tests for `LessonChat` (or potentially `AssessmentStep.test.tsx` if easier to mock dependencies there) covering:
        *   Scenario: Max attempts reached -> `expectedAnswer` displayed in chat history.
        *   Scenario: Max attempts reached -> `expectedAnswerAudioUrl` is played if available.
        *   Scenario: Max attempts reached -> `expectedAnswerAudioUrl` is NOT played if null/empty.
        *   Scenario: Normal correct/incorrect flows before max attempts are unaffected.

4.  **Manual Verification:**
    *   [ ] Manually test the assessment flow in the browser.
    *   [ ] Intentionally fail a step multiple times until `maxAttempts` is reached.
    *   [ ] Verify the expected answer appears in the chat.
    *   [ ] Verify the expected answer audio plays (if configured).
    *   [ ] Verify the assessment proceeds to the next step.
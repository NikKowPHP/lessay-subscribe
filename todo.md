
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




# FIX

- [x] creating the initial lessons in onboarding   should also disable the 'go to lessons'

- [] on initial loading we are loading the state of current onboarding and lessons and only then user can proceed . if onboarding is not exists then create it 



# Project TODO List: App Initialization and Refactoring

## Phase 1: App Initializer Implementation

-   [ ] **Design App Initializer:**
    -   [ ] Decide on implementation strategy (HOC, Context/Hook, Layout Logic).
    -   [ ] Define sequence: Auth Check -> Profile Fetch/Create -> Onboarding Check/Create -> Lesson Fetch (conditional).
    -   [ ] Plan global loading state management.
-   [ ] **Implement Global Loading State:**
    -   [ ] Create state for app initialization status (`initializing`, `idle`, `error`).
    -   [ ] Display full-page loading indicator during initialization.
-   [ ] **Integrate Profile Fetch/Create Logic:**
    -   [ ] Check for authenticated user (`useAuth`).
    -   [ ] Call `getUserProfileAction` if authenticated.
    -   [ ] Call `createUserProfileAction` if profile not found (handle null/error from `getUserProfileAction`).
    -   [ ] Implement error handling for profile fetch/create.
-   [ ] **Integrate Onboarding Check/Create Logic:**
    -   [ ] Call `getOnboardingAction` / `getStatusAction` after profile is confirmed.
    -   [ ] Call `createOnboardingAction` if onboarding doesn't exist.
    -   [ ] Store onboarding status/data.
    -   [ ] Implement error handling for onboarding fetch/create.
-   [ ] **Implement Conditional Redirection:**
    -   [ ] Redirect to `/app/login` if no user.
    -   [ ] Redirect to `/app/onboarding` if user exists but onboarding is needed/incomplete.
    -   [ ] Allow access/redirect to `/app/lessons` if user and completed onboarding exist.
    -   [ ] Use `router.replace` for redirects.
-   [ ] **Integrate Lesson Fetch (Conditional):**
    -   [ ] Ensure `LessonProvider` fetches initial lessons only *after* initializer confirms onboarding is complete and user is likely heading to `/app/lessons`.
    -   [ ] Adjust `LessonProvider` `useEffect` dependencies if necessary.
-   [ ] **Handle Loading State During Login/Register:**
    -   [ ] Show loading indicator on Login/Register buttons if app initializer is still running (`initializing` state).

## Phase 2: Refactoring and Best Practices

-   [ ] **State Management (Redux Migration - Optional):**
    -   [ ] Analyze current Context complexity.
    -   [ ] Design Redux store structure (slices, reducers, actions).
    -   [ ] Implement Redux slices for auth, user, onboarding, lessons.
    -   [ ] Convert context API calls to async thunks.
    -   [ ] Refactor components to use `useSelector`/`useDispatch`.
    -   [ ] Set up Redux Provider at the application root.
-   [ ] **Custom Hooks:**
    -   [ ] Identify complex logic in `LessonChat`, `Recording`, `OnboardingPage`, etc.
    -   [ ] Extract logic into reusable custom hooks (e.g., `useSpeechRecognition`, `useLessonStepper`, `useRecordingFlow`).
-   [ ] **Component Decluttering:**
    -   [ ] Review large components (`LessonChat`, `AssessmentStep`, `Recording`, `ProfilePage`).
    -   [ ] Create smaller, focused sub-components (`ChatMessageBubble`, `StepProgressBar`, etc.).
    -   [ ] Ensure components focus on UI, moving logic out.
-   [ ] **TypeScript Enhancement:**
    -   [ ] Review and replace `any` types with specific types/generics.
    -   [ ] Validate and improve type guards (`isPerformanceMetrics`).
    -   [ ] Define clear interfaces for server action arguments and return types.
    -   [ ] Ensure frontend models align with Prisma schema.
-   [ ] **Error Handling:**
    -   [ ] Review `callAction` helper for consistent error handling/surfacing.
    -   [ ] Ensure clear user-facing error messages (toasts, inline).
    -   [ ] Consider implementing React Error Boundaries.
-   [ ] **Testing:**
    -   [ ] Write integration tests for the app initializer flow.
    -   [ ] Test Redux state management (reducers, actions, selectors) if implemented.
    -   [ ] Write unit tests for custom hooks.
    -   [ ] Increase component test coverage.
    -   [ ] Consider integration tests for server actions.
-   [ ] **Code Style & Consistency:**
    -   [ ] Run `eslint` and `prettier`.
    -   [ ] Review naming conventions and file structure.
-   [ ] **Accessibility (a11y):**
    -   [ ] Perform accessibility audit (browser tools, checkers).
    -   [ ] Ensure proper ARIA attributes, semantic HTML, keyboard navigation, color contrast.
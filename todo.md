



# FIX



# Project TODO List: App Initialization and Refactoring

## Phase 1: App Initializer Implementation

-   [x] **Design App Initializer:**
    -   [x] Decide on implementation strategy (HOC, Context/Hook, Layout Logic).
    -   [x] Define sequence: Auth Check -> Profile Fetch/Create -> Onboarding Check/Create -> Lesson Fetch (conditional).
    -   [x] Plan global loading state management.
-   [x] **Implement Global Loading State:**
    -   [x] Create state for app initialization status (`initializing`, `idle`, `error`).
    -   [x] Display full-page loading indicator during initialization.
-   [x] **Integrate Profile Fetch/Create Logic:**
    -   [x] Check for authenticated user (`useAuth`).
    -   [x] Call `getUserProfileAction` if authenticated.
    -   [x] Call `createUserProfileAction` if profile not found (handle null/error from `getUserProfileAction`).
    -   [x] Implement error handling for profile fetch/create.
-   [x] **Integrate Onboarding Check/Create Logic:**
    -   [x] Call `getOnboardingAction` / `getStatusAction` after profile is confirmed.
    -   [x] Call `createOnboardingAction` if onboarding doesn't exist.
    -   [x] Store onboarding status/data.
    -   [x] Implement error handling for onboarding fetch/create.
-   [x] **Implement Conditional Redirection:**
    -   [x] Redirect to `/app/login` if no user.
    -   [x] Redirect to `/app/onboarding` if user exists but onboarding is needed/incomplete.
    -   [x] Allow access/redirect to `/app/lessons` if user and completed onboarding exist.
    -   [x] Use `router.replace` for redirects.
-   [x] **Integrate Lesson Fetch (Conditional):**
    -   [x] Ensure `LessonProvider` fetches initial lessons only *after* initializer confirms onboarding is complete and user is likely heading to `/app/lessons`.
    -   [x] Adjust `LessonProvider` `useEffect` dependencies if necessary.
-   [x] **Handle Loading State During Login/Register:**
    -   [x] Show loading indicator on Login/Register buttons if app initializer is still running (`initializing` state).


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




---

**1. Project Title:** Refactor Initial Lesson Generation Logic

*   [x] **Analyze `LessonService.getLessons` (`src/services/lesson.service.ts`):**
    *   [x] Verify if `getLessons` currently attempts to trigger `generateInitialLessons` as a side effect.
    *   [x] **If yes:** Modify `getLessons` to *only* fetch existing lessons from the repository. Remove the generation-triggering logic.
*   [x] **Ensure Explicit Generation Logic:**
    *   [x] Confirm `lessonService.generateInitialLessons` exists and contains the logic to generate the first set of lessons based on onboarding/assessment data.
    *   [x] Create/Verify `generateInitialLessonsAction` (`src/lib/server-actions/lesson-actions.ts`) exists, calls `lessonService.generateInitialLessons`, and returns the `Result<LessonModel[]>` containing the *newly generated* lessons.
*   [x] **Refactor `LessonContext` (`src/context/lesson-context.tsx`):**
    *   [x] Add new state variable(s), e.g., `isGeneratingInitial: boolean`, `initialGenerationAttempted: boolean`.
    *   [x] Modify the main `useEffect` or the `refreshLessons` function:
        *   [x] After calling `getLessonsAction`, check if the result is successful (`!error`), the data is an empty array (`data && data.length === 0`), `initialized` is `true`, `onboardingComplete` (from `useOnboarding`) is `true`, and `initialGenerationAttempted` is `false`.
        *   [x] **If all conditions are met:**
            *   [x] Set `isGeneratingInitial = true`.
            *   [x] Set `initialGenerationAttempted = true`.
            *   [x] Call the explicit `generateInitialLessonsAction()`.
            *   [x] On success: Update `lessons` state with the result, set `isGeneratingInitial = false`.
            *   [x] On error: Set `error` state, set `isGeneratingInitial = false`. Log the error.
        *   [x] Ensure the regular `loading` state is handled correctly during both initial fetch and generation.
*   [ ] **Testing:**
    *   [ ] Add/Update tests for `LessonContext` to verify the new state transitions and action calls for initial generation.
    *   [ ] Add/Update tests for `LessonsPage` to verify the correct loading/generating messages are displayed.

---



---

**1. Project Title:** Refactor Data Handling with DTOs and Mappers

**2. Project Overview/Executive Summary:**
This project aims to refactor the application's data flow by introducing Data Transfer Objects (DTOs) and mappers. The goal is to decouple the frontend UI from the backend Prisma models, optimize data transfer by sending only necessary fields to the client, and improve code maintainability. This involves analyzing UI data requirements, defining DTOs, implementing mapping logic (primarily in server actions), and updating client-side contexts, hooks, and components to use these DTOs.

**3. Goals and Objectives:**
*   Decouple frontend components and contexts from Prisma database models.
*   Optimize data fetching by ensuring only required data fields are transferred to the client.
*   Improve type safety and clarity in the data flow between server actions and client-side state management.
*   Enhance maintainability by centralizing the transformation logic (mapping).
*   Establish a clear pattern for data handling between the backend (server actions/services) and the frontend (contexts/UI).

**4. Scope:**
*   **In Scope:**
    *   Analysis of UI components (e.g., LessonChat, AssessmentStep, ProfilePage, Lesson List, Onboarding Steps) to identify required data fields.
    *   Definition and implementation of TypeScript DTO interfaces for major data models (User, Lesson, LessonStep, Assessment, AssessmentStep, Onboarding, LearningProgress, etc.) based on UI needs.
    *   Implementation of mapper functions to convert Prisma models (from repositories/services) to DTOs.
    *   Refactoring server actions (`*-actions.ts`) to utilize mappers and return DTOs instead of full Prisma models.
    *   Updating client-side context providers (`*-context.tsx`) to store and expose DTOs instead of full models.
    *   Refactoring UI components and hooks to consume DTOs from contexts.
    *   Updating relevant tests (unit tests for mappers, potentially integration/component tests).
*   **Out of Scope:** (Based on provided information)
    *   Major changes to the underlying database schema (`schema.prisma`).
    *   Refactoring of the repository layer's interaction with Prisma (repositories will still work with Prisma models).
    *   Significant changes to business logic within services, unless required to facilitate DTO mapping.
    *   Introducing new state management libraries (unless the existing Redux migration task overlaps significantly).

**5. Key Deliverables:**
*   Defined TypeScript DTO interfaces (e.g., `UserDto`, `LessonDto`, `LessonStepDto`).
*   Implemented mapper functions (e.g., `mapPrismaLessonToDto`).
*   Updated server actions returning DTOs.
*   Updated context providers using DTOs.
*   Refactored UI components consuming DTOs.
*   Unit tests for mapper functions.
*   Updated integration/component tests reflecting DTO usage.

**6. Timeline/Schedule:**
*   Timeline details not provided in the input. This refactoring should likely be broken down into phases:
    *   Phase 1: Analysis and DTO/Mapper Design
    *   Phase 2: DTO/Mapper Implementation & Unit Tests
    *   Phase 3: Server Action Refactoring
    *   Phase 4: Context/Hook Refactoring
    *   Phase 5: UI Component Refactoring
    *   Phase 6: Integration Testing & Bug Fixing

**7. Stakeholders:**
*   Stakeholders not specified in the provided information. Likely development team members involved in frontend and backend.

**8. Resources:**
*   Resource details not provided in the input. Requires developer time familiar with TypeScript, Next.js, Prisma, and the application's architecture.

**9. Risks and Assumptions:**
*   **Risks:**
    *   Refactoring might introduce subtle bugs if data mapping is incorrect or incomplete.
    *   Time-consuming process, especially updating UI components across the application.
    *   Potential for merge conflicts if multiple developers work on related areas.
*   **Assumptions:**
    *   The current architecture involves server actions fetching data (likely via services/repositories) and passing it to client-side contexts.
    *   The team has sufficient TypeScript expertise.
    *   Existing tests provide some coverage, but more specific tests for mappers and data flow will be needed.

**10. Success Metrics:**
*   Success metrics not specified in the provided information. Potential metrics could include:
    *   Successful replacement of Prisma model usage with DTOs in client-side contexts and components.
    *   Reduction in payload size for data fetched by the client (measurable via network tools).
    *   Improved developer experience due to clearer data contracts (qualitative).
    *   Successful passing of all related unit and integration tests.

**11. Additional Notes:**
*   This refactoring aligns well with the existing TODO items related to TypeScript enhancement and component decluttering mentioned in `todo.md`.
*   Consider creating DTOs incrementally, focusing on one feature area (e.g., Lessons) at a time to manage complexity.
*   Ensure mappers handle potential null/undefined values gracefully.

**12. Action Items (TODO):**

*   **Phase 1: Analysis & Design**
    *   [ ] **Analyze UI Data Needs:**
        *   [ ] Review `src/app/app/lessons/page.tsx` and `src/app/app/lessons/[id]/page.tsx` (including `LessonChat`) to list required fields from `LessonModel` and `LessonStep`.
        *   [ ] Review `src/app/app/onboarding/page.tsx` (including `AssessmentStep`, `LanguageSelectionStep`, etc.) to list required fields from `OnboardingModel`, `AssessmentLesson`, `AssessmentStep`.
        *   [ ] Review `src/app/app/profile/page.tsx` to list required fields from `UserProfileModel` (derived from User/Onboarding/LearningProgress).
        *   [ ] Document required fields for each view/component.
    *   [ ] **Define DTO Interfaces:**
        *   [ ] Create `src/dtos/lesson.dto.ts` defining `LessonDto`, `LessonStepDto`, etc. based on analysis.
        *   [ ] Create `src/dtos/onboarding.dto.ts` defining `OnboardingDto`, `AssessmentLessonDto`, `AssessmentStepDto`, etc.
        *   [ ] Create `src/dtos/user.dto.ts` defining `UserProfileDto`.
        *   [ ] Create `src/dtos/progress.dto.ts` defining `LearningProgressDto`, `TopicProgressDto`, `WordProgressDto`.
    *   [ ] **Define Mapping Strategy:**
        *   [ ] Confirm mapping logic will reside primarily within Server Actions (`src/lib/server-actions/*.ts`).
        *   [ ] Decide on mapper function organization (e.g., `src/mappers/lesson.mapper.ts`).

*   **Phase 2: DTO & Mapper Implementation**
    *   [ ] Implement DTO interfaces based on definitions from Phase 1.
    *   [ ] Implement mapper functions (e.g., `mapPrismaLessonToLessonDto`) in the chosen location.
    *   [ ] Write unit tests for each mapper function, covering various scenarios (e.g., null values, complete data).

*   **Phase 3: Server-Side Refactoring**
    *   [ ] **Refactor Lesson Actions (`lesson-actions.ts`):**
        *   [ ] Update `getLessonsAction` to map results to `LessonDto[]`.
        *   [ ] Update `getLessonByIdAction` to map result to `LessonDto | null`.
        *   [ ] Update `createLessonAction`, `updateLessonAction`, `completeLessonAction` to map the returned `LessonModel` to `LessonDto`.
        *   [ ] Update `recordStepAttemptAction` to map the returned `LessonStep` to `LessonStepDto`.
        *   [ ] Update `generateNewLessonsAction`, `checkAndGenerateNewLessonsAction`, `processLessonRecordingAction` to map results to `LessonDto[]` or `LessonDto`.
    *   [ ] **Refactor Onboarding Actions (`onboarding-actions.ts`):**
        *   [ ] Update `createOnboardingAction`, `getOnboardingAction`, `updateOnboardingAction`, `markOnboardingCompleteAndGenerateInitialLessonsAction` to map `OnboardingModel` to `OnboardingDto`.
        *   [ ] Update `getAssessmentLessonAction`, `completeAssessmentLessonAction`, `updateOnboardingLessonAction`, `processAssessmentLessonRecordingAction` to map `AssessmentLesson` to `AssessmentLessonDto`.
        *   [ ] Update `recordAssessmentStepAttemptAction` to map `AssessmentStep` to `AssessmentStepDto`.
    *   [ ] **Refactor User Actions (`user-actions.ts`):**
        *   [ ] Update `getUserProfileAction`, `createUserProfileAction`, `updateUserProfileAction` to map `UserProfileModel` (derived from Prisma) to `UserProfileDto`.
    *   [ ] **Refactor Learning Progress Actions (`learning_progress-actions.ts`):**
        *   [ ] Update `getLearningProgressAction` to map `LearningProgressModel` to `LearningProgressDto`.
        *   [ ] Update `getPracticeWordsAction` to map results to `WordProgressDto[]`.
    *   [ ] Review Service layer (`src/services/*.ts`) - Ensure methods return full Prisma models needed by actions for mapping. Minimal changes expected.

*   **Phase 4: Client-Side Context Refactoring**
    *   [ ] **Refactor `AuthContext`:** (Likely minimal changes needed as it deals with Supabase types, but verify `User`/`Session` usage if custom logic exists).
    *   [ ] **Refactor `UserProfileContext`:**
        *   [ ] Update state `profile` to use `UserProfileDto | null`.
        *   [ ] Update `updateProfile` function parameter type.
        *   [ ] Adjust context type `UserProfileContextType` to use `UserProfileDto`.
    *   [ ] **Refactor `OnboardingContext`:**
        *   [ ] Update state `onboarding` to use `OnboardingDto | null`.
        *   [ ] Update functions returning/expecting `OnboardingModel`, `AssessmentLesson`, `AssessmentStep` to use their respective DTOs.
        *   [ ] Adjust context type `OnboardingContextType`.
    *   [ ] **Refactor `LessonContext`:**
        *   [ ] Update state `lessons` to use `LessonDto[]`.
        *   [ ] Update state `currentLesson` to use `LessonDto | null`.
        *   [ ] Update functions returning/expecting `LessonModel`, `LessonStep` to use their DTOs.
        *   [ ] Adjust context type `LessonContextType`.
    *   [ ] **Refactor `AppInitializerContext`:** (Verify if it directly uses profile/onboarding models; if so, update).

*   **Phase 5: UI Component Refactoring**
    *   [ ] **Update Lesson Components:**
        *   [ ] Refactor `src/app/app/lessons/page.tsx` to use `LessonDto[]`.
        *   [ ] Refactor `src/app/app/lessons/[id]/page.tsx` to use `LessonDto` and `LessonStepDto`.
        *   [ ] Refactor `src/components/lessons/lessonChat.tsx` props and internal logic for `LessonDto`/`LessonStepDto`.
        *   [ ] Refactor `src/components/lessons/ChatMessages.tsx`, `ChatInput.tsx` if they directly reference model fields changed/removed in DTOs.
    *   [ ] **Update Onboarding Components:**
        *   [ ] Refactor `src/app/app/onboarding/page.tsx` state and props passed to steps.
        *   [ ] Refactor `src/components/onboarding/AssessmentStep.tsx` props and logic for `AssessmentLessonDto`/`AssessmentStepDto`.
        *   [ ] Refactor other step components (`WelcomeStep`, `LanguageSelectionStep`, etc.) if they rely on full `OnboardingModel` fields not present in `OnboardingDto`.
    *   [ ] **Update Profile Component:**
        *   [ ] Refactor `src/app/app/profile/page.tsx` to use `UserProfileDto`.
    *   [ ] **Update Other Components:** Review any other components identified in Phase 1 that consume data from refactored contexts.

*   **Phase 6: Testing**
    *   [ ] Run existing unit tests for mappers.
    *   [ ] Review and update existing component/integration tests to reflect DTO usage.
    *   [ ] Add integration tests for the data flow (action -> context -> component) for key features (e.g., loading lessons).
    *   [ ] Perform manual end-to-end testing of affected features (lessons, onboarding, profile).

*   **Phase 7: Review & Cleanup**
    *   [ ] Remove unused imports of Prisma models (e.g., `LessonModel`) from client-side code.
    *   [ ] Remove unused fields from components that are no longer available in DTOs.
    *   [ ] Conduct code review focusing on the new data flow and DTO usage.

---

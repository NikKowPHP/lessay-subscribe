# Project TODO List

## Phase 1: Backend API Development for Flutter Client

### I. Documentation Enhancements (for @roo)

*   **[x] TODO #7 (from previous interaction, now listed as #1 here for md): Enhance "Backend API Development Plan for Flutter Support" in `document.md` with detailed API specifications.**
    *   **Objective:** Expand Section 7 of `document.md` to include detailed Data Transfer Objects (DTOs) for key API endpoints, a standardized API error response structure, and a more detailed JWT authentication flow.
    *   **Files:** `document.md`
    *   **Status:** Pending
    *   **Details:** Refer to the detailed breakdown provided previously. This involves defining error structures, JWT auth flow, and DTOs for API endpoints.

### II. API Implementation - User Profile Management (for @roo)
*(Base Path: `/api/v1/profile`)*

*   **[x] TODO #1 (from previous interaction, now listed as #2 here for md): Implement `GET /api/v1/profile/`**
    *   **Objective:** Retrieve the current authenticated user's profile.
    *   **Files:** `src/app/api/v1/profile/route.ts` (new)
    *   **Status:** Pending
    *   **Details:** Authenticate via JWT, fetch profile using `UserService`, return `UserProfileModel` or standardized error.

*   **[x] TODO #X: Implement `PUT /api/v1/profile/`**
    *   **Objective:** Update the current authenticated user's profile.
    *   **Files:** `src/app/api/v1/profile/route.ts`
    *   **Status:** Pending
    *   **Details:** Authenticate via JWT, validate request body, use `UserService` to update, return updated `UserProfileModel`.

*   **[x] TODO #X: Implement `POST /api/v1/profile/`** (for initial creation if not handled by Supabase auth flow directly for profile table)
    *   **Objective:** Create the current authenticated user's profile (idempotent).
    *   **Files:** `src/app/api/v1/profile/route.ts`
    *   **Status:** Pending
    *   **Details:** Authenticate via JWT, ensure profile doesn't exist or matches user, use `UserService` to create, return created `UserProfileModel`. *(Note: Current server actions (`createUserProfileAction`) handle this. Ensure API aligns with this logic, especially if profile creation is tied to the first login after Supabase user creation).*

*   **[x] TODO #X: Implement `DELETE /api/v1/profile/`**
    *   **Objective:** Delete the current authenticated user's profile and their Supabase authentication account.
    *   **Files:** `src/app/api/v1/profile/route.ts`
    *   **Status:** Pending
    *   **Details:** Authenticate via JWT, use `UserService` to delete profile (which should also trigger Supabase auth user deletion), return success or error.

### III. API Implementation - Onboarding & Initial Assessment (for @roo)
*(Base Path: `/api/v1/onboarding`)*

*   **[x] TODO #X: Implement `GET /api/v1/onboarding/status`**
    *   **Objective:** Get the current user's onboarding status and preferences.
    *   **Status:** Pending

*   **[x] TODO #X: Implement `POST /api/v1/onboarding/steps/{stepName}`**
    *   **Objective:** Update user's progress for a specific onboarding step.
    *   **Status:** Pending

*   **[x] TODO #X: Implement `POST /api/v1/onboarding/complete`**
    *   **Objective:** Mark main onboarding (pre-assessment) as complete and trigger initial lesson generation.
    *   **Status:** Pending

*   **[x] TODO #X: Implement `GET /api/v1/onboarding/assessment`**
    *   **Objective:** Get/generate the user's initial assessment lesson.
    *   **Status:** Pending

*   **[x] TODO #X: Implement `POST /api/v1/onboarding/assessment/steps/{stepId}/attempt`**
    *   **Objective:** Submit user's response for an assessment step.
    *   **Status:** Pending

*   **[x] TODO #X: Implement `POST /api/v1/onboarding/assessment/complete`**
    *   **Objective:** Finalize assessment, calculate results.
    *   **Status:** Pending

*   **[x] TODO #X: Implement `POST /api/v1/onboarding/assessment/audio`**
    *   **Objective:** Submit full assessment audio for detailed analysis.
    *   **Status:** Pending

### IV. API Implementation - Lessons (for @roo)
*(Base Path: `/api/v1/lessons`)*

*   [x] TODO #X: Implement `GET /api/v1/lessons/`
    *   **Objective:** Retrieve a list of lessons for the current user.
    *   **Status:** Completed

*   [x] TODO #X: Implement `GET /api/v1/lessons/{lessonId}`
    *   **Objective:** Fetch details for a specific lesson.
    *   **Status:** Completed

*   [x] TODO #X: Implement `POST /api/v1/lessons/{lessonId}/complete`
    *   **Objective:** Mark a lesson as completed.
    *   **Status:** Completed

*   [x] TODO #X: Implement `POST /api/v1/lessons/{lessonId}/steps/{stepId}/attempt`
    *   **Objective:** Submit user's response for a lesson step.
    *   **Status:** Completed

*   [x] TODO #X: Implement `POST /api/v1/lessons/{lessonId}/audio`
    *   **Objective:** Submit lesson audio for detailed analysis.
    *   **Status:** Completed

*   [x] TODO #X: Implement `POST /api/v1/lessons/check-generate`
    *   **Objective:** Check and trigger new lesson generation.
    *   **Status:** Completed



WE BROKE THE GET LESSONS 
### V. API Implementation - Learning Progress (for @roo)
*(Base Path: `/api/v1/progress`)*

*   **[ ] TODO #X: Implement `GET /api/v1/progress/summary`**
    *   **Objective:** Get user's overall learning progress summary.
    *   **Status:** Pending

*   **[ ] TODO #X: Implement `GET /api/v1/progress/practice-words`**
    *   **Objective:** Retrieve words/phrases for user practice.
    *   **Status:** Pending

### VI. API Implementation - Existing Endpoints Review (for @roo)

*   **[ ] TODO #X: Review and adapt `/api/recording` for Flutter**
    *   **Objective:** Ensure it can securely handle audio uploads from Flutter with JWT authentication, or determine if new context-specific audio upload endpoints (e.g., for lessons/assessments) are better.
    *   **Status:** Pending

*   **[ ] TODO #X: Review and adapt `/api/tts` for Flutter**
    *   **Objective:** Ensure it can be securely called by Flutter with JWT authentication.
    *   **Status:** Pending

---

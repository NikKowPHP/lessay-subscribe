# Lessay: Project and Application Documentation

## 1. Introduction

This document provides a detailed description of the 'lessay' project, covering its purpose, architecture, key features, and technical details. It will also address how the backend can serve external clients (like a Flutter app) and considerations for building a Flutter frontend.

## 2. Project Overview

### Project Name

The project name is 'lessay'.

### Purpose

lessay is an AI-powered language learning platform focused on accent and pronunciation analysis. It aims to help users improve their spoken language skills by providing personalized lessons, detailed feedback on pronunciation, accent characteristics, and overall speech patterns.

### Target Audience

The platform targets language learners of various levels who wish to refine their pronunciation, understand their accent, and improve their overall spoken fluency and clarity in a new language.

### Core Technologies

*   **Framework & Frontend:** Next.js (App Router), React, TypeScript
*   **Styling:** Tailwind CSS
*   **Backend Logic:** Next.js (API Routes, Server Actions), Node.js
*   **Database:** PostgreSQL
*   **ORM:** Prisma
*   **Authentication:** Supabase
*   **AI Services:**
    *   Language Model (LLM): Google Gemini (e.g., `gemini-2.5-pro-exp`, `gemini-2.0-flash`)
    *   Text-to-Speech (TTS): Google Cloud TTS, AWS Polly
    *   Speech-to-Text (STT): Google Cloud Speech-to-Text
*   **File Storage:** Vercel Blob
*   **Payments (Integrated/Planned):** Stripe
*   **Deployment & Hosting:** Vercel
*   **Analytics & Monitoring:** PostHog, Vercel Speed Insights, Vercel Analytics



## 3. System Architecture

### 3.1. Overall Architecture

The "lessay" project is structured as a **Monolithic Repository (Monorepo)** housing a **Next.js Full-Stack Application**. This architecture allows for a unified codebase for both frontend and backend development, streamlining the development process.

It follows a **Client-Server model**:
*   The **Next.js application** serves as the core, delivering both the frontend user interface (built with React components) and the backend logic (through API routes and Server Actions).
*   The primary **client** is a web browser, which interacts with the frontend served by Next.js.

The project's directory structure reflects this full-stack approach:
*   `src/app/`: Contains the Next.js App Router implementation, including frontend pages (e.g., `page.tsx` files) and backend API routes (e.g., under `src/app/api/`).
*   `src/components/`: Houses reusable React UI components used across the frontend.
*   `src/services/`: Encapsulates backend business logic and integrations with external services.
*   `src/lib/server-actions/`: Contains server-side functions callable directly from client components (RPC-style).
*   `src/repositories/`: Implements the data access layer, abstracting database interactions.
*   `prisma/`: Manages the database schema (`schema.prisma`) and migrations for PostgreSQL.

### 3.2. Frontend Architecture

*   **Framework:** React with Next.js (App Router).
    *   Pages are defined by `page.tsx` files within the `src/app/` directory structure (e.g., `src/app/app/lessons/page.tsx`, `src/app/app/onboarding/page.tsx`).
    *   The root layout is defined in `src/app/layout.tsx`, with nested layouts like `src/app/app/layout.tsx`.
*   **Language:** TypeScript (evident from `.ts` and `.tsx` file extensions, and the `tsconfig.json` file).
*   **UI Components:**
    *   Custom reusable components are located in `src/components/` (e.g., `Recording.tsx`, `Footer.tsx`, `lessons/lessonChat.tsx`).
    *   Standardized UI primitives (buttons, dialogs) are found in `src/components/ui/` (e.g., `alert-dialog.tsx`, `button.tsx`), suggesting the use or inspiration of a UI library like Radix UI, wrapped for consistent styling.
*   **Styling:** Tailwind CSS is used for styling, configured in `tailwind.config.ts` and with global styles in `src/app/globals.css`. The `cn` utility (`src/utils/cn.ts`) is used for conditional class merging.
*   **State Management:** Primarily utilizes React Context API. This is inferred from the `src/context/` directory, which contains various context providers like `auth-context.tsx`, `lesson-context.tsx`, `onboarding-context.tsx`, `recording-context.tsx`, `user-profile-context.tsx`, and `app-initializer-context.tsx`.
*   **Client-Side Routing:** Handled by the Next.js App Router.
*   **Key Frontend Responsibilities:**
    *   Rendering the user interface and managing user interactions.
    *   Collecting user input, including text (forms) and voice (microphone access for recordings).
    *   Making asynchronous requests to the Next.js backend (API Routes or Server Actions) to fetch data, submit information, and trigger business logic.
    *   Displaying data, feedback, lessons, and assessment results received from the backend.
    *   Managing client-side user authentication state and redirecting users based on auth status or onboarding progress.
    *   Providing interactive learning experiences like the lesson chat interface.

### 3.3. Backend Architecture

*   **Framework/Environment:** Node.js, as leveraged by the Next.js full-stack capabilities.
*   **API Layer:**
    *   **Next.js API Routes:** RESTful or GraphQL endpoints are defined under `src/app/api/` (e.g., `src/app/api/recording/route.ts` for audio uploads, `src/app/api/tts/route.ts` for text-to-speech, `src/app/api/subscribe/route.ts` for waitlist).
    *   **Next.js Server Actions:** Functions defined in `src/lib/server-actions/` (e.g., `auth-actions.ts`, `lesson-actions.ts`, `onboarding-actions.ts`) allow client components to directly call server-side logic with type safety.
*   **Service Layer:**
    *   Business logic is modularized into services located in `src/services/` (e.g., `AiService.ts`, `LessonService.ts`, `OnboardingService.ts`, `RecordingService.ts`, `TtsService.ts`, `UserService.ts`). These services handle core operations and orchestrate interactions between the API layer, data access layer, and external services.
    *   Generator services like `AssessmentGeneratorService.ts` and `LessonGeneratorService.ts` are responsible for dynamically creating learning content.
*   **Data Access Layer (DAL)/Repository Layer:**
    *   Database interactions are abstracted through repositories defined in `src/repositories/` (e.g., `LessonRepository.ts`, `UserRepository.ts`, `OnboardingRepository.ts`, `LearningProgressRepository.ts`).
    *   These repositories use Prisma as the ORM to communicate with the PostgreSQL database.
*   **Authentication & Authorization:**
    *   User authentication is managed via Supabase Auth, as indicated by `src/utils/supabase/` utilities and server actions in `src/lib/server-actions/auth-actions.ts`.
    *   Route protection and session validation are handled by Next.js middleware (`src/middleware.ts`), which integrates with Supabase for checking user sessions. Server Actions and API Routes also perform session validation.
*   **Key Backend Responsibilities:**
    *   Handling HTTP requests from the frontend via API Routes and Server Actions.
    *   Managing user authentication, registration, and session lifecycle with Supabase.
    *   Performing CRUD operations on the PostgreSQL database through Prisma and the repository layer.
    *   Integrating with various external AI services for:
        *   Language model interactions (Google Gemini).
        *   Text-to-Speech (Google TTS, AWS Polly).
        *   Speech-to-Text (Google Cloud STT).
    *   Processing and storing audio recordings, potentially using Vercel Blob for file storage.
    *   Executing core business logic related to generating lessons and assessments, tracking user progress, and providing feedback.
    *   Potentially handling payment processing and subscription management via Stripe webhooks (inferred from schema and commented-out code).

### 3.4. Database

*   **Type:** PostgreSQL. This is confirmed by the `provider = "postgresql"` line in `prisma/schema.prisma` and the `provider = "postgresql"` in `prisma/migrations/migration_lock.toml`.
*   **ORM:** Prisma. Indicated by the presence of `prisma/schema.prisma`, Prisma Client usage in `src/lib/prisma.ts`, and its inclusion in `package.json`.
*   **Key Data Models** (defined in `prisma/schema.prisma`):
    *   `User`: Stores user identity, email, authentication details, and subscription-related fields.
    *   `Onboarding`: Manages user onboarding flow, selected languages, learning purpose, and proficiency level.
    *   `Lesson`, `LessonStep`: Define the structure and content of regular learning lessons, including types like prompt, feedback, new_word, practice, instruction, and summary.
    *   `AssessmentLesson`, `AssessmentStep`: Structure initial and ongoing assessments, including question types, expected answers, and user responses.
    *   `AudioMetrics`: Stores detailed analysis of user audio recordings, including scores for pronunciation, fluency, grammar, vocabulary, and overall performance, along with detailed JSON-based assessments.
    *   `LearningProgress`, `TopicProgress`, `WordProgress`: Track the user's journey, mastery of topics and words, strengths, and weaknesses.
    *   `Payment`: Stores records of payment transactions, likely related to subscriptions (integrated with Stripe).

### 3.5. External Services & Integrations

*   **Supabase:** Used for user authentication (email/password, potentially OAuth like Google) and potentially for database hosting (the `DATABASE_URL` in `docker-compose.mac.prod.yml` points to a Supabase pooler URL: `aws-0-us-west-1.pooler.supabase.com`).
*   **Google Cloud AI:**
    *   **Gemini:** Leveraged as the primary Large Language Model for tasks like content generation, analysis, and personalized feedback (e.g., `src/services/ai.service.ts`).
    *   **Text-to-Speech (TTS):** Used for generating audio from text content for lessons and assessments (e.g., `src/services/google-tts.service.ts`).
    *   **Speech-to-Text (STT):** Utilized for transcribing user's spoken audio responses (e.g., `src/services/stt.service.ts`).
*   **AWS Polly:** An alternative Text-to-Speech service available in the system (e.g., `src/services/polly.service.ts`).
*   **Vercel:**
    *   **Deployment & Hosting:** The application is deployed on Vercel (inferred from `lessay-app.vercel.app` URLs and Vercel-specific components).
    *   **Vercel Blob:** Used for storing uploaded files, particularly audio recordings (e.g., `src/utils/vercel_blob-upload.ts`, `src/app/api/upload-token/route.ts`).
    *   **Vercel Speed Insights & Analytics:** Integrated for performance monitoring and usage analytics (`@vercel/speed-insights` and `@vercel/analytics` in `src/app/layout.tsx`).
*   **Stripe (Integrated/Planned):** Intended for handling payments and subscriptions. This is suggested by the `Payment` model in `prisma/schema.prisma`, Stripe-related fields on the `User` model, and commented-out code for Stripe webhooks (`src/app/api/payments/webhook.ts`) and checkout forms (`src/components/CheckoutForm.tsx`).
*   **PostHog:** Used for product analytics and tracking user behavior (`src/context/posthog-context.tsx`, `src/components/PostHogPageView.tsx`).



## 4. Key Features and Functionalities

### 4.1. User Onboarding

The application features a comprehensive, multi-step onboarding process designed to gather essential information about the user and prepare them for personalized learning. This process is managed by components within `src/components/onboarding/`:

*   **Welcome (`WelcomeStep.tsx`):** Greets the user and initiates the onboarding flow.
*   **Language Selection (`LanguageSelectionStep.tsx`):** Collects the user's native language and the target language they wish to learn.
*   **Learning Purpose (`LearningPurposeStep.tsx`):** Asks the user for their primary motivation for learning the language (e.g., travel, business, academic).
*   **Proficiency Assessment (`ProficiencyStep.tsx`):** Allows users to self-assess their current proficiency level in the target language (e.g., beginner, intermediate, advanced).
*   **Initial Language Assessment (`AssessmentStep.tsx` & `AssessmentChat.tsx`):** The onboarding process culminates in an interactive, voice-based initial language assessment. This assessment evaluates the user's current skills in the target language.

All data collected during onboarding (preferences, assessment status) is stored in the `Onboarding` table, while the assessment itself and its results are stored in the `AssessmentLesson` and related tables (see `prisma/schema.prisma`).

### 4.2. AI-Powered Language Assessment

The platform utilizes AI to conduct detailed language assessments, providing users with valuable insights into their abilities.

*   **Process:** Assessments are interactive and voice-based, presenting users with various question types. The `AssessmentChat.tsx` component facilitates this interaction.
*   **Dynamic Generation:** Assessment steps can be dynamically generated by the `src/services/assessment-generator.service.ts`, tailoring the assessment to the user's target language and proficiency.
*   **Audio Analysis:** User's spoken responses are captured and processed. This involves:
    *   Uploading audio recordings (managed by `src/services/recording.service.ts`).
    *   Transcribing audio to text using Speech-to-Text services (handled by `src/services/stt.service.ts`).
    *   Analyzing the transcribed text and audio features for linguistic accuracy and characteristics.
*   **Detailed Feedback:** The system provides comprehensive feedback, with metrics stored in the `AudioMetrics` and `AssessmentLesson` tables. This includes:
    *   Pronunciation scores
    *   Fluency scores
    *   Grammar accuracy
    *   Vocabulary range
    *   Overall proficiency estimation, often mapped to CEFR levels (e.g., A1, B2).
    *   Identification of specific strengths and weaknesses in their spoken language.
    *   Proposed topics and focus areas for subsequent personalized learning.
*   **Data Structure:** The structure for assessment results and audio analysis is exemplified in mock files like `src/__mocks__/assessment-data.mock.ts` (for assessment structure) and `src/__mocks__/generated-audio-metrics.mock.ts` (for detailed audio analysis feedback).

### 4.3. Personalized Lesson Generation & Delivery

Lessons are tailored to individual user needs based on a variety of inputs, ensuring a relevant and effective learning experience.

*   **Personalization Inputs:**
    *   Results from the initial language assessment (specifically `AssessmentLesson.proposedTopics`).
    *   User's ongoing performance and tracked learning progress (from `LearningProgress`, `TopicProgress`, `WordProgress` tables).
    *   Identified areas for improvement from `AudioMetrics` (e.g., specific pronunciation challenges, grammatical errors).
*   **Core Services:**
    *   `LessonService.ts`: Orchestrates lesson management, including retrieval, creation, and completion.
    *   `LessonGeneratorService.ts`: Responsible for dynamically generating the content and structure of lessons based on the personalization inputs and AI capabilities.
*   **Lesson Structure & Delivery:**
    *   **Interactive Chat Interface:** Lessons are delivered through an interactive, voice-based chat interface, primarily managed by `src/components/lessons/lessonChat.tsx`, with supporting components `ChatInput.tsx` (for user input handling) and `ChatMessages.tsx` (for displaying the conversation flow).
    *   **Multi-Step Format:** Each lesson consists of multiple `LessonStep` (defined in `prisma/schema.prisma`), which can include:
        *   `instruction`: Explanations or guidance.
        *   `new_word`: Introduction of new vocabulary in context.
        *   `practice`/`prompt`: Exercises requiring user response.
        *   `feedback`: AI-generated feedback on user responses.
        *   `summary`: Recap of the lesson content.
    *   **Audio Prompts:** Text-to-Speech (TTS) technology (`src/services/tts.service.ts`, integrating `GoogleTTS` and `PollyService`) is used to generate audio for lesson prompts and model answers, enhancing the auditory learning experience.
*   **Data Storage:** Lesson structures and user progress within lessons are stored in the `Lesson` and `LessonStep` tables.

### 4.4. Accent and Pronunciation Analysis

A core strength of "lessay" is its detailed analysis of user accent and pronunciation.

*   **Recording Interface:** Users record their voice primarily through the interface provided by `src/components/Recording.tsx`.
*   **Comprehensive Analysis:** The system analyzes various aspects of speech:
    *   **Phonetic Analysis:** Evaluation of individual phoneme production.
    *   **Suprasegmental Features:** Assessment of intonation, rhythm, and stress patterns.
    *   The components `src/components/BasicAnalysis.tsx` and `src/components/DetailedAnalysis.tsx` are used to display these results.
*   **AI Response Structure:** The detailed structure of the AI's analysis feedback is defined in `src/models/AiResponse.model.ts`, specifically through the `AIResponse` and `DetailedAIResponse` interfaces.
*   **Interactive Feedback:** The `src/components/PhonemePlayer.tsx` allows users to listen to and compare the target pronunciation of specific phonemes with their own observed pronunciation, facilitating self-correction.

### 4.5. Learning Progress Tracking

The platform meticulously tracks user progress to adapt the learning path and provide insights into their development.

*   **Data Models:** Progress is stored across several related tables defined in `prisma/schema.prisma`:
    *   `LearningProgress`: Captures the user's overall learning status.
    *   `TopicProgress`: Tracks mastery for specific learning topics.
    *   `WordProgress`: Monitors user's familiarity with individual vocabulary items.
*   **Tracked Metrics:**
    *   Overall proficiency level (e.g., beginner, intermediate, advanced) and a calculated overall score.
    *   Mastery levels for topics and words (e.g., NotStarted, Seen, Learning, Practiced, Known, Mastered).
    *   Dynamically updated lists of strengths and weaknesses.
    *   A learning trajectory indicator (e.g., steady, accelerating, plateauing).
*   **Service:** The `LearningProgressService.ts` is responsible for updating these progress metrics based on user performance in lessons and assessments.

### 4.6. User Authentication and Profile Management

Secure user authentication and personalized profile management are key to the platform.

*   **Authentication Provider:** Supabase is used for user authentication, supporting email/password sign-up and login. Google OAuth is also likely supported, as inferred from the `googleLogin` case in `src/app/api/mock-auth/route.ts`.
*   **User Profiles:** Authenticated users have profiles accessible via `src/app/app/profile/page.tsx`. These profiles store user preferences (like native and target languages from onboarding) and serve as a central point to link to their learning data.
*   **Data Storage:** Core user information is stored in the `User` table (`prisma/schema.prisma`).
*   **Server-Side Logic:** Authentication flows (login, registration, session management) and profile updates are handled by Server Actions found in `src/lib/server-actions/auth-actions.ts` and `src/lib/server-actions/user-actions.ts`.

### 4.7. Subscription and Payments (Planned/Integrated)

The application is designed to support a subscription-based model, likely leveraging Stripe for payment processing.

*   **Subscription Management:** The `User` table in `prisma/schema.prisma` includes fields like `subscriptionStatus`, `subscriptionId`, `subscriptionEndDate`, `subscriptionPlan`, and `stripeCustomerId`, indicating a robust system for managing user subscriptions. The `SubscriptionStatus` enum (`NONE`, `TRIAL`, `ACTIVE`, `CANCELED`, `PAST_DUE`, `EXPIRED`) details the possible states of a subscription.
*   **Payment Processing:** Stripe is the inferred payment gateway. This is suggested by:
    *   The `Payment` table in `prisma/schema.prisma` for recording payment transactions, including `stripePaymentIntentId`.
    *   Commented-out code related to Stripe webhooks (`src/app/api/payments/webhook.ts`) for handling events like successful payments or subscription updates.
    *   A commented-out Stripe `CheckoutForm.tsx` component.
*   **Lifecycle Management:** The system appears designed to manage the full subscription lifecycle, including trial periods (`trialStartDate`, `trialEndDate`), active subscriptions, cancellations (`cancelAtPeriodEnd`), and payment tracking.

## 5. Backend for External Clients (e.g., Flutter)

The existing Next.js backend can be effectively leveraged to support external clients like a Flutter mobile application. This would involve consuming existing API routes and potentially exposing functionality currently within Server Actions through new, dedicated API routes.

### 5.1. API Endpoints (Next.js API Routes)

The Next.js API Routes defined under `src/app/api/` can be directly called by a Flutter application using standard HTTP request methods (GET, POST, etc.). Key relevant endpoints include:

*   **`/api/recording` (`src/app/api/recording/route.ts`):**
    *   **Purpose:** Submitting audio recordings for accent and pronunciation analysis.
    *   **Input (Flutter):** `POST` request with `FormData` containing the audio file, `recordingTime` (milliseconds), `recordingSize` (bytes), and `isDeepAnalysis` (boolean).
    *   **Output:** JSON response containing the AI's analysis (conforming to `AIResponse` or `DetailedAIResponse` from `src/models/AiResponse.model.ts`).
*   **`/api/tts` (`src/app/api/tts/route.ts`):**
    *   **Purpose:** Generating Text-to-Speech audio for prompts, model answers, etc.
    *   **Input (Flutter):** `POST` request with JSON body containing `text` (string to synthesize) and `language` (target language code).
    *   **Output:** Audio stream/buffer (e.g., `audio/mpeg`). Flutter would need to handle this binary response.
*   **`/api/subscribe` (`src/app/api/subscribe/route.ts`):**
    *   **Purpose:** Allows users to subscribe to a waitlist.
    *   **Input (Flutter):** `POST` request with JSON body containing `email` and optional `source`.
    *   **Output:** JSON confirmation or error message.
    *   *Note:* This might be more relevant for a pre-launch phase. For an authenticated app, direct feature access is typical.
*   **`/api/upload-token` (`src/app/api/upload-token/route.ts`):**
    *   **Purpose:** Generates a token for direct client-side uploads to Vercel Blob storage.
    *   **Flutter Integration:** The Flutter app could potentially use this endpoint to get a token and then upload directly to Vercel Blob. Alternatively, if a different upload strategy is preferred for mobile (e.g., Flutter sends audio to the Next.js backend, which then uploads to Vercel Blob), this endpoint might be less relevant, or a new backend-mediated upload API route might be created.
*   **`/api/mock-auth` (`src/app/api/mock-auth/route.ts`):**
    *   **Purpose:** Provides mock authentication endpoints for development and testing of the web application.
    *   **Flutter Integration:** This endpoint **should not** be used by a production Flutter application. The Flutter app will authenticate directly with Supabase.

### 5.2. Server Actions as Potential Endpoints

Much of the core business logic is currently encapsulated within Next.js Server Actions (`src/lib/server-actions/`). While Server Actions are primarily designed for tight integration with Next.js client components, their underlying logic can be exposed to a Flutter app by creating new API Routes that call these service methods.

Key functionalities from Server Actions that would require API Route wrappers:

*   **Authentication (`auth-actions.ts`):**
    *   `loginAction`, `registerAction`, `getSessionAction`, `logoutAction`: The Flutter application should handle these operations by **interacting directly with the Supabase authentication service** using the Supabase Flutter SDK. These server actions would not be directly called.
*   **User Profile Management (`user-actions.ts`):**
    *   Logic within `getUserProfileAction`, `createUserProfileAction`, `updateUserProfileAction`, and `deleteUserProfileAction` would need to be exposed via new, secured API Routes (e.g., `GET /api/users/profile`, `POST /api/users/profile`, `PUT /api/users/profile`, `DELETE /api/users/profile`).
*   **Onboarding (`onboarding-actions.ts`):**
    *   All actions (`createOnboardingAction`, `getOnboardingAction`, `updateOnboardingAction`, `markOnboardingCompleteAndGenerateInitialLessonsAction`, `getAssessmentLessonAction`, `completeAssessmentLessonAction`, `recordAssessmentStepAttemptAction`, `updateOnboardingLessonAction`, `processAssessmentLessonRecordingAction`) represent critical business logic. Each of these would require corresponding API Routes for the Flutter app to manage the onboarding flow and initial assessment.
*   **Lessons (`lesson-actions.ts`):**
    *   Functions like `getLessonsAction`, `getLessonByIdAction`, `completeLessonAction`, `recordStepAttemptAction`, `checkAndGenerateNewLessonsAction`, and `processLessonRecordingAction` would need API Route equivalents (e.g., `GET /api/lessons`, `GET /api/lessons/{id}`, `POST /api/lessons/{id}/complete`, etc.).
    *   `createLessonAction` might be relevant if users can create custom content; otherwise, lesson generation is typically backend-driven.
*   **Learning Progress (`learning_progress-actions.ts`):**
    *   Actions like `getLearningProgressAction` and `getPracticeWordsAction` would need API Route wrappers to provide progress data to the Flutter app.
*   **Payments (`payment-actions.ts` - currently commented out):**
    *   If payment functionalities (e.g., `createCheckoutSessionAction`) are implemented, they would need API Route versions to initiate payment flows from the Flutter app.

### 5.3. Authentication and Authorization

*   **Client-Side Authentication:** The Flutter application should integrate the **Supabase Flutter SDK** to handle user sign-up, sign-in (email/password, Google OAuth), and session management directly with the Supabase authentication service.
*   **Token-Based API Authorization:**
    *   Upon successful authentication with Supabase, the Flutter app will receive a Supabase session token (JWT).
    *   This JWT **must be sent with every API request** from the Flutter app to the Next.js backend, typically in the `Authorization` header as a Bearer token (e.g., `Authorization: Bearer <SUPABASE_JWT>`).
*   **Backend Token Validation:**
    *   The Next.js API routes designed for Flutter consumption will need to be adapted to validate this incoming Supabase JWT.
    *   The current server-side Supabase client setup (`src/utils/supabase/server.ts`) and middleware (`src/middleware.ts`) are primarily configured for cookie-based sessions from web clients.
    *   A mechanism will be required in the backend (either in middleware or directly in API routes) to:
        1.  Extract the JWT from the `Authorization` header.
        2.  Verify the JWT using Supabase's libraries (e.g., `@supabase/supabase-js` can validate a JWT if configured correctly, or a dedicated Supabase Admin client might be used for server-to-server validation if necessary).
        3.  Establish user context for the request based on the validated token.

### 5.4. Data Exchange Format

**JSON (JavaScript Object Notation)** will be the primary data exchange format for both request payloads and response bodies between the Flutter application and the Next.js backend APIs.

### 5.5. Considerations for Flutter Integration

*   **API Versioning:** If significant divergence between web and mobile client needs is anticipated, implementing API versioning (e.g., prefixing routes with `/api/v1/...` or `/api/mobile/v1/...`) is advisable from the start to manage changes gracefully.
*   **Error Handling:** API routes should return clear, consistent, and machine-parsable error responses. This includes using standard HTTP status codes (e.g., 400 for bad requests, 401 for unauthorized, 403 for forbidden, 404 for not found, 500 for server errors) and providing JSON error objects with descriptive messages or error codes.
*   **Security:**
    *   **JWT Validation:** Rigorous validation of the Supabase JWT on all protected API routes is paramount.
    *   **Input Validation:** The backend must perform thorough validation on all data received from the Flutter app to prevent injection attacks and ensure data integrity.
    *   **HTTPS:** Communication between the Flutter app and the backend must be over HTTPS.
*   **Scalability:** The backend infrastructure (Next.js server, database, external AI services) must be designed and monitored to handle concurrent requests from both web and potentially a large number of mobile clients.
*   **Offline Support:** The current backend architecture is inherently online-dependent. Any offline capabilities (e.g., caching lessons, progress synchronization) would need to be implemented within the Flutter application itself, along with logic for data synchronization when connectivity is restored.

## 6. Flutter Frontend Integration

This section outlines how the provided Flutter application can be integrated with the "lessay" Next.js backend. The Flutter application has an existing structure with its own services, UI, and state management (Riverpod). Integration will primarily involve redirecting its backend calls to the Next.js API endpoints.

### 6.1. Core Principles for Integration

*   **API-Driven Communication:** The Flutter app will communicate with the Next.js backend by making HTTP requests to the API endpoints detailed in Section 5.
*   **Separate Codebases:** The Flutter frontend (Dart, Flutter widgets) and the Next.js web frontend (TypeScript, React components) are distinct. UI components are not directly portable. The Flutter app will maintain its own native UI.
*   **Shared Supabase Project:** To ensure a unified user base and authentication system, the Flutter app must be configured to use the same Supabase project as the Next.js web application.

### 6.2. Key Flutter Project Components for Backend Interaction

The existing Flutter project (`repomix-output.xml` for Flutter) contains several components that will be key to, or require modification for, backend integration:

*   **Configuration (`lib/config/`):**
    *   `config.dart`: The `Config().serverUrl` must be updated to point to the deployed URL of the Lessay Next.js backend API.
*   **API Client (`lib/core/http/api_client.dart`):**
    *   The existing `ApiClient` in Flutter can be used to make HTTP requests to the Next.js backend.
    *   It **must be modified** to include the Supabase JWT (obtained by the Flutter app after user authentication) in the `Authorization: Bearer <token>` header for all authenticated requests to the Next.js backend.
*   **Authentication (`lib/core/user/user_service.dart`, `lib/core/user/user_provider.dart`):**
    *   The Flutter `UserService` should utilize the **Supabase Flutter SDK** for all direct authentication operations (sign-up, sign-in with email/password, Google Sign-In, sign-out, session management).
    *   It should authenticate against the shared Supabase project.
    *   It should *not* attempt to call Next.js server actions or custom Next.js API routes for these primary authentication functions.
*   **Feature Services (Requiring significant refactoring):**
    *   Many services within the Flutter app (e.g., in `lib/features/learning/domain/services/`, `lib/voicer/services/`) currently appear to interact with other backend services (like `llaserver-jwxfjkmitq-uc.a.run.app` via `lib/core/api/services/voice_api_service.dart`) or might be set up for direct AI SDK calls (e.g., the commented-out `google_ai_api.dart`).
    *   These services need to be **rewired** to call the appropriate API routes on the Lessay Next.js backend. For instance:
        *   **Speech Analysis:** Flutter's `SpeechAnalysisService` (in `lib/voicer/services/`) and potentially `lib/features/learning/domain/services/speech_analysis_service.dart` must use the Flutter `ApiClient` to send audio data to the Next.js `/api/recording` endpoint (or new specific analysis endpoints like `/api/lessons/{id}/analyze-audio`) and receive structured analysis results.
        *   **Initial Assessment & Learning Path:** Flutter's `InitialAssessmentService` (`lib/features/learning/domain/services/initial_assesment_service.dart`) and `LearningPathService` (`lib/features/learning/domain/services/learning_path_service.dart`) should interact with new API routes on the Next.js backend that expose the logic from `OnboardingService.ts` and `LessonService.ts`.
        *   **Exercise Management:** Flutter's `ExerciseService` (`lib/features/learning/domain/services/exercise_service.dart`) would fetch exercise content and submit answers via new Next.js API routes.
        *   **Translation:** The `ApiTranslationService` in Flutter (`lib/features/translator/services/api_translation_service.dart`) currently uses `Config().serverUrl + /generateTranslation`. If this points to the old `llaserver`, it needs to be re-routed to a new translation endpoint on the Next.js backend (if this functionality is to be centralized).
*   **Repositories (`lib/features/learning/data/repositories/`, etc.):**
    *   Flutter repositories (like `HiveLearningPathRepository`, `HiveExerciseRepository`) currently manage local data persistence using Hive. While local caching is valuable, the primary source of truth for learning paths, generated exercises, and assessments should become the Next.js backend. These repositories might transition to primarily caching data fetched from the backend or managing offline queueing.
*   **Providers (Riverpod):**
    *   Riverpod providers (`learning_path_provider.dart`, `initial_assessment_provider.dart`, `translator_provider.dart`, `adaptive_exercises_provider.dart`, etc.) will manage the state within the Flutter app. They will trigger data fetching and updates by calling the refactored Flutter services, which in turn communicate with the Next.js backend.
*   **Models (`lib/features/**/models/`, `lib/voicer/models/`):**
    *   The Dart data models within the Flutter application (e.g., `SpeechAnalysisResponse`, `InitialAssessmentResponse`, `ExerciseModels`, `LearningPathModel`) must be aligned with the JSON request and response structures of the Next.js backend APIs. This might involve updating existing Dart models or creating new ones to accurately represent the data exchanged. The existing `SpeechAnalysisRequest` and `SpeechAnalysisResponse` in Flutter, for example, will need to match the API contract of the Next.js backend.

### 6.3. Authentication Flow in Flutter

1.  **Supabase Flutter SDK:** The Flutter app will use the official Supabase Flutter SDK for all authentication processes (sign-up, sign-in, OAuth, password recovery, sign-out).
2.  **Token Storage & Management:** The Supabase Flutter SDK will securely manage the user's session, including storing and refreshing JWTs on the device.
3.  **API Requests to Next.js Backend:** For authenticated requests to the Next.js backend API routes, the Flutter app must retrieve the current valid Supabase JWT from the SDK and include it in the `Authorization` header as a Bearer token: `Authorization: Bearer <SUPABASE_JWT>`.
4.  **Token Refresh:** The Supabase Flutter SDK handles automatic token refreshing. The Flutter `ApiClient` should be robust to potential 401 errors and perhaps trigger a token refresh and retry mechanism if appropriate, or rely on the SDK to manage this transparently before subsequent calls.

### 6.4. Data Flow Example: Performing an Assessment Step

1.  **User Interaction (Flutter UI):** The user interacts with an assessment screen in the Flutter app (e.g., a screen built from `InitialAssessmentScreen.dart` logic). They record their voice for a pronunciation task.
2.  **Audio Capture (Flutter):** The Flutter app captures the audio using device microphone capabilities (e.g., via `record` package as seen in `lib/voicer/services/recording_service.dart`).
3.  **Service Call (Flutter):** The relevant Flutter service (e.g., a refactored `InitialAssessmentService` or a dedicated `OnboardingService` client) is called with the captured audio data and context (assessment ID, step ID, language).
4.  **API Request (Flutter `ApiClient`):** The Flutter `ApiClient` constructs an HTTP `POST` request (likely `multipart/form-data` for audio) to a specific Next.js backend API endpoint (e.g., a new `/api/v1/onboarding/assessment/step/{step_id}/record` or similar, which would wrap the logic from `recordAssessmentStepAttemptAction` and `processAssessmentLessonRecordingAction`). The Supabase JWT is included in the `Authorization` header.
5.  **Backend Processing (Next.js):**
    *   The Next.js API route receives the request.
    *   It validates the Supabase JWT to authenticate the user.
    *   It calls the appropriate backend service (e.g., `OnboardingService.ts`).
    *   The service processes the audio (e.g., using `RecordingService.ts`, `STTService.ts`, `AIService.ts`), updates the database via its repository (`OnboardingRepository.ts`), and generates feedback.
    *   The backend returns a JSON response containing the analysis and feedback.
6.  **API Response (Flutter `ApiClient`):** The Flutter `ApiClient` receives the JSON response from the Next.js backend.
7.  **Data Parsing & State Update (Flutter):**
    *   The Flutter service parses the JSON response into the corresponding Dart data models.
    *   The relevant Riverpod provider (e.g., `initialAssessmentProvider`) updates its state with the new data.
8.  **UI Update (Flutter):** The Flutter UI widgets listening to the provider rebuild to display the feedback and assessment results to the user.

### 6.5. UI/UX Considerations for Flutter

*   **Native Experience:** The Flutter app will provide a user interface and experience tailored to mobile platforms (iOS and Android), which will be distinct from the web application's React-based UI.
*   **Platform-Specific Features:** Flutter allows leveraging native device features like advanced microphone controls, local notifications, haptic feedback, and platform-specific UI conventions (e.g., Cupertino widgets as seen in the codebase).
*   **State Management:** The Flutter app uses Riverpod (`flutter_riverpod` in `pubspec.yaml`) for state management, which is well-suited for managing the application's complex state, including asynchronous data from the backend.
*   **Local Data Persistence:** Hive (`hive`, `hive_flutter` in `pubspec.yaml`) is used for local data storage (e.g., user preferences, cached learning data, favorites, history). This can enhance offline capabilities and reduce redundant API calls.
*   **Asset Management:** Flutter uses its own asset management system (`assets/` folder in `pubspec.yaml`). Any visual assets (images, custom fonts) would be managed within the Flutter project.
*   **Navigation:** GoRouter (`go_router` in `pubspec.yaml`) is used for declarative routing within the Flutter app.


## 7. Backend API Development Plan for Flutter Support

To enable the Flutter application to fully interact with the Lessay platform, the following new API routes need to be developed in the Next.js backend. These routes will expose the necessary business logic currently handled by Server Actions or provide mobile-specific data views.

### 7.1. General API Design Principles

The new APIs developed for Flutter (and potentially other external clients) should adhere to the following principles:

*   **RESTful or Resource-Oriented:** Design endpoints around resources (e.g., `/profile`, `/lessons`, `/onboarding`). While not strictly REST in all cases (some actions are operations), aim for clear resource identification.
*   **Stateless & JWT Authenticated:** All protected endpoints must validate a Supabase JWT passed in the `Authorization: Bearer <token>` header. The server should not rely on session cookies for these APIs.
*   **JSON for Data Exchange:** Use JSON exclusively for request and response bodies.
*   **Standard HTTP Methods:** Utilize GET for retrieval, POST for creation, PUT for updates (or PATCH for partial updates), and DELETE for removal.
*   **Clear Error Responses:** Implement consistent error handling. Return appropriate HTTP status codes (e.g., 400, 401, 403, 404, 500) and include a JSON error object in the response body detailing the error.
*   **Idempotency:** Ensure PUT and DELETE operations are idempotent where applicable. POST operations for creation should typically return a 201 Created status with a Location header or the created resource.
*   **Data Validation:** Implement robust input validation on the backend for all data received from client applications to ensure data integrity and security.

### 7.2. Required API Endpoint Groups

The following groups of API endpoints are proposed, largely by exposing the functionalities of existing Server Actions:

*   **User Profile Management (Base: `/api/v1/profile`)**
    *   `GET /`: Get the current authenticated user's profile. (Wraps logic from `getUserProfileAction` in `user-actions.ts`)
    *   `POST /`: Create the current authenticated user's profile. This is typically used for initial setup after Supabase authentication if a profile doesn't exist. Should be idempotent. (Wraps logic from `createUserProfileAction`)
    *   `PUT /`: Update the current authenticated user's profile. (Wraps logic from `updateUserProfileAction`)
    *   `DELETE /`: Delete the current authenticated user's profile and their Supabase authentication account. (Wraps logic from `deleteUserProfileAction`)

*   **Onboarding & Initial Assessment (Base: `/api/v1/onboarding`)**
    *   `GET /status`: Get the current user's onboarding status, including native/target languages, proficiency, and initial assessment completion. (Combines logic from `getOnboardingAction` and `getStatusAction` in `onboarding-actions.ts`)
    *   `POST /steps/{stepName}`: Update the user's progress for a specific onboarding step (e.g., language selection, purpose). Request body would contain step-specific data. (Wraps logic from `updateOnboardingAction`)
    *   `POST /complete`: Mark the main onboarding flow (pre-assessment) as complete and trigger the generation of initial lessons. (Wraps logic from `markOnboardingCompleteAndGenerateInitialLessonsAction`)
    *   `GET /assessment`: Get the structure and current state of the user's initial assessment lesson. If one doesn't exist, it might trigger its generation. (Wraps logic from `getAssessmentLessonAction`)
    *   `POST /assessment/steps/{stepId}/attempt`: Submit a user's response for a specific assessment step and get immediate feedback/next step. (Wraps logic from `recordAssessmentStepAttemptAction`)
    *   `POST /assessment/complete`: Signal that the user has completed all interactive parts of the assessment, triggering final result calculation and summary generation. (Wraps logic from `completeAssessmentLessonAction`)
    *   `POST /assessment/audio`: Submit the full audio recording of an assessment session for detailed backend analysis (e.g., `AudioMetrics`). (Wraps logic from `processAssessmentLessonRecordingAction`)

*   **Lessons (Base: `/api/v1/lessons`)**
    *   `GET /`: Retrieve a list of all lessons available to the current user. (Wraps logic from `getLessonsAction` in `lesson-actions.ts`)
    *   `GET /{lessonId}`: Fetch details for a specific lesson by its ID. (Wraps logic from `getLessonByIdAction`)
    *   `POST /{lessonId}/complete`: Mark a lesson as completed. The backend would calculate performance metrics based on attempts. (Wraps logic from `completeLessonAction`)
    *   `POST /{lessonId}/steps/{stepId}/attempt`: Submit a user's response for a specific lesson step. (Wraps logic from `recordStepAttemptAction`)
    *   `POST /{lessonId}/audio`: Submit the full audio recording of a lesson session for detailed `AudioMetrics` analysis. (Wraps logic from `processLessonRecordingAction`)
    *   `POST /check-generate`: Endpoint to check if new lessons should be generated based on progress, and trigger generation if conditions are met. (Wraps logic from `checkAndGenerateNewLessonsAction`)

*   **Learning Progress (Base: `/api/v1/progress`)**
    *   `GET /summary`: Get the user's overall learning progress summary, including proficiency, scores, strengths, and weaknesses. (Wraps logic from `getLearningProgressAction` in `learning_progress-actions.ts`)
    *   `GET /practice-words`: Retrieve a list of words/phrases the user needs to practice, based on their mastery levels. (Wraps logic from `getPracticeWordsAction`)

*   **Audio Processing (Existing Endpoints - Review for Flutter)**
    *   `POST /api/recording`: This existing endpoint is used by the web app for general audio analysis. The Flutter app might use this directly, or more context-specific endpoints (like `/api/v1/onboarding/assessment/audio` or `/api/v1/lessons/{lessonId}/audio`) might be preferred for better separation of concerns and contextual processing.
    *   `POST /api/tts`: This existing endpoint can be used by Flutter for Text-to-Speech generation.

### 7.3. Next Steps for Backend Development

The following high-level tasks would be required for @roo to implement the backend API support for the Flutter application:

1.  **Define DTOs (Data Transfer Objects):** For each API endpoint, clearly define the expected JSON request and response structures (schemas). These will form the contract between the Flutter app and the Next.js backend.
2.  **Implement API Routes:**
    *   Create new API route handlers under `src/app/api/v1/` (or a similar versioned path) for each of the endpoints listed above.
    *   These handlers will parse incoming requests, validate data, and call the appropriate existing service methods from `src/services/`.
3.  **Implement JWT Authentication:**
    *   Develop or integrate a robust mechanism within each new API route (or via a shared middleware for these routes) to:
        *   Extract the Supabase JWT from the `Authorization: Bearer <token>` header.
        *   Validate the token against Supabase to authenticate the user and retrieve their ID.
        *   Deny access if the token is missing, invalid, or expired.
4.  **Service Layer Interaction:** Ensure API routes correctly call the existing service methods, passing necessary parameters and handling their return values or errors.
5.  **Error Handling:** Implement consistent error handling within API routes. Catch errors from service calls and transform them into standardized JSON error responses with appropriate HTTP status codes.
6.  **Logging:** Add comprehensive logging within the API routes for request/response cycles, errors, and key operations.
7.  **Testing:**
    *   Write unit tests for any new logic within the API routes.
    *   Write integration tests to verify that the API routes correctly interact with services and that authentication/authorization works as expected.


    ### 6.6. Flutter Client Modification Plan Outline

Integrating the existing Flutter application with the new Next.js backend requires modifications to several key areas of the Flutter codebase. The following outlines the primary steps involved:

1.  **Configure API Client & Authentication:**
    *   Update Flutter's `.env` file to set `SERVER_URL` to the deployed URL of the Lessay Next.js backend API.
    *   Modify `lib/config/config.dart` to ensure it correctly loads this `SERVER_URL`.
    *   Enhance `lib/core/http/api_client.dart`:
        *   Integrate with the Supabase Flutter SDK to retrieve the current user's JWT.
        *   Automatically include the JWT in the `Authorization: Bearer <token>` header for all authenticated requests made to the Next.js backend.
        *   Improve error handling to parse JSON error responses from the Next.js API and throw appropriate `AppException`s (using `lib/core/exceptions/app_exception.dart` and `lib/core/services/error_handler_service.dart`).
    *   Verify or implement Supabase Flutter SDK initialization in `lib/main.dart` using the shared Supabase project credentials (same URL and Anon Key as the Next.js backend).
    *   (Recommended) Create or adapt an auth helper service (e.g., `lib/core/auth/supabase_auth_helper.dart` or adapt `lib/core/user/user_service.dart`) for centralized Supabase interactions, especially for JWT retrieval and direct Supabase authentication flows.

2.  **Refactor Feature Services:**
    *   Identify Flutter services in directories like `lib/features/**/services/` and `lib/voicer/services/` that currently interact with other backends (e.g., `llaserver-jwxfjkmitq-uc.a.run.app` via `lib/core/api/services/voice_api_service.dart`) or use mock data.
    *   Modify these services to use the updated Flutter `ApiClient` (from step 1) to call the newly created Next.js backend API routes (as defined in Section 7.2 of this document).
    *   Example: Flutter's `SpeechAnalysisService` in `lib/voicer/services/speech_analysis_service.dart` should be refactored to call the Next.js `/api/recording` endpoint (or a new dedicated analysis endpoint like `/api/v1/audio/analyze`) instead of `ApiVoiceService` pointing to `llaserver`. Similarly, services like `InitialAssessmentService` or `ExerciseService` will need to be updated.

3.  **Align Data Models:**
    *   Review and update Dart data models within the Flutter application (e.g., in `lib/features/**/models/`, `lib/voicer/models/`) to ensure they precisely match the JSON request and response structures (DTOs) of the Next.js backend APIs. This may involve modifying existing models or creating new ones.

4.  **Update State Management (Riverpod Providers):**
    *   Ensure Riverpod providers (e.g., in `lib/features/**/providers/`, `lib/voicer/providers/`) correctly trigger data fetching and state updates through the refactored Flutter services.
    *   Providers should manage loading, data, and error states based on responses received from the Next.js backend via the services and `ApiClient`.

5.  **Adapt UI Screens:**
    *   Modify Flutter UI screens (primarily within `lib/features/**/presentation/`) to consume data from Riverpod providers that are now powered by the Next.js backend.
    *   Ensure UI elements (buttons, forms) correctly trigger actions that call the refactored Flutter services, which in turn make authenticated API calls to the Next.js backend.

6.  **Review Local Data Persistence (Hive):**
    *   Evaluate how Hive is currently used for local data storage (e.g., via services like `lib/features/learn/services/deck/deck_localstorage_service.dart`, `lib/features/favorites/services/favorite_service.dart`, `lib/features/history/services/history_service.dart`, and repositories in `lib/features/learning/data/repositories/`).
    *   While local caching and offline support are valuable, the Next.js backend should become the primary source of truth for most dynamic and user-specific data (e.g., learning paths, assessment results, detailed progress).
    *   Adapt Hive usage primarily for caching fetched data to improve performance, managing user preferences that don't need to be server-synced constantly, or for basic offline support functionalities, rather than as a primary data store for server-authoritative data.


## 7. Backend API Development Plan for Flutter Support

To enable the Flutter application to fully interact with the Lessay platform, the following new API routes need to be developed in the Next.js backend. These routes will expose the necessary business logic currently handled by Server Actions or provide mobile-specific data views.

### 7.1. General API Design Principles

The new APIs developed for Flutter (and potentially other external clients) should adhere to the following principles:

*   **RESTful or Resource-Oriented:** Design endpoints around resources (e.g., `/profile`, `/lessons`, `/onboarding`). While not strictly REST in all cases (some actions are operations), aim for clear resource identification.
*   **Stateless & JWT Authenticated:** All protected endpoints must validate a Supabase JWT passed in the `Authorization: Bearer <token>` header. The server should not rely on session cookies for these APIs.
*   **JSON for Data Exchange:** Use JSON exclusively for request and response bodies.
*   **Standard HTTP Methods:** Utilize GET for retrieval, POST for creation, PUT for updates (or PATCH for partial updates), and DELETE for removal.
*   **Clear Error Responses:** Implement consistent error handling with appropriate HTTP status codes and JSON error messages (see Section 7.1.1).
*   **Idempotency where applicable:** For PUT/DELETE operations.
*   **Data Validation:** Implement robust input validation on the backend for all incoming data to ensure data integrity and security.

#### 7.1.1. Standardized API Error Response Structure

All `/api/v1/...` endpoints should use a consistent JSON structure for error responses:

```json
{
  "error": {
    "code": "string", // Application-specific error code
    "message": "string", // A descriptive error message
    "details": "object | array | null" // Optional: Additional details, e.g., field validation errors
  }
}
```

**Common Application-Specific Error Codes (`error.code`):**

*   `UNAUTHENTICATED`: Missing or invalid JWT. HTTP Status: 401.
*   `FORBIDDEN`: User is authenticated but not authorized to perform the action. HTTP Status: 403.
*   `VALIDATION_ERROR`: Input data failed validation. `details` object might contain field-specific errors. HTTP Status: 400.
*   `RESOURCE_NOT_FOUND`: The requested resource does not exist. HTTP Status: 404.
*   `CONFLICT_ERROR`: A conflict occurred, e.g., trying to create a resource that already exists. HTTP Status: 409.
*   `INTERNAL_SERVER_ERROR`: An unexpected error occurred on the server. HTTP Status: 500.
*   `EXTERNAL_SERVICE_ERROR`: An error occurred while communicating with an external service (e.g., AI provider). HTTP Status: 502 or 503.
*   `OPERATION_FAILED`: A general error code for when a specific operation could not be completed. HTTP Status: 400 or 500.

#### 7.1.2. JWT Authentication for `/api/v1/...` Routes

Authentication for the new `/api/v1/...` routes intended for the Flutter client will be handled via Supabase JSON Web Tokens (JWTs).

**Flow:**

1.  **Client-Side (Flutter):**
    *   The Flutter app authenticates the user directly with the Supabase project using the Supabase Flutter SDK.
    *   Upon successful authentication, the Flutter app obtains a JWT (access token) from Supabase.
2.  **API Request (Flutter to Next.js):**
    *   For every request to a protected `/api/v1/...` endpoint on the Next.js backend, the Flutter app must include the JWT in the `Authorization` HTTP header with the `Bearer` scheme:
        ```
        Authorization: Bearer <SUPABASE_JWT_ACCESS_TOKEN>
        ```
3.  **Backend-Side (Next.js API Route):**
    *   **Token Extraction:** The Next.js API route handler (or a dedicated middleware) will extract the JWT from the `Authorization` header.
    *   **Token Validation:** The extracted JWT will be validated using the Supabase server-side library. This typically involves:
        *   Initializing the Supabase client with the service role key (or anon key if appropriate for `auth.getUser(jwt)` context on server-side).
        *   Calling a Supabase function like `supabase.auth.getUser(jwt)` (passing the token). This function verifies the token's signature, checks its expiration, and, if valid, returns the associated user object.
    *   **User Context:** If the token is valid, the user's identity (e.g., `userId` from `await supabase.auth.getUser(jwt).data.user.id`) is established for the request. This `userId` is then used to authorize access to resources and perform operations on behalf of that user.
    *   **Error Handling:**
        *   If the `Authorization` header is missing or malformed, or if the token is invalid (e.g., expired, tampered, incorrect signature), the API route must return a `401 Unauthorized` HTTP status with the standardized error JSON (code: `UNAUTHENTICATED`).
        *   If the token is valid but the user does not have permission for the specific action/resource, a `403 Forbidden` HTTP status should be returned (code: `FORBIDDEN`).

This JWT validation logic can be implemented as a reusable helper function or a middleware pattern applied to all relevant `/api/v1/...` API routes to ensure consistent security.

### 7.2. Required API Endpoint Groups

The following subsections provide detailed specifications for example endpoints. Similar detail should be defined for all new API routes before implementation. Fields in DTOs are derived from Prisma schema models (e.g., `User`, `Onboarding`, `Lesson`, `AssessmentLesson`, `AudioMetrics`, `LearningProgress`) and existing Server Action parameters/return types.

**User Profile Management (Base: `/api/v1/profile`)**

*   **`GET /`**
    *   **Objective:** Get the current authenticated user's profile.
    *   **HTTP Method:** `GET`
    *   **Path Parameters:** None.
    *   **Query Parameters:** None.
    *   **Request Body:** None.
    *   **Success Response (200 OK - application/json):**
        ```json
        {
          "id": "string", // User ID (from Supabase Auth)
          "userId": "string", // Same as id, internal DB user ID
          "email": "string",
          "name": "string | null",
          "nativeLanguage": "string | null",
          "targetLanguage": "string | null",
          "proficiencyLevel": "string | null (enum: beginner, intermediate, advanced)",
          "learningPurpose": "string | null",
          "onboardingCompleted": "boolean",
          "initialAssessmentCompleted": "boolean",
          "subscriptionStatus": "string (enum: NONE, TRIAL, ACTIVE, ...)",
          "subscriptionEndDate": "string (ISO 8601 date-time) | null",
          "createdAt": "string (ISO 8601 date-time)",
          "updatedAt": "string (ISO 8601 date-time)"
          // Other fields from UserProfileModel
        }
        ```
    *   **Potential Error Responses:** `401 UNAUTHENTICATED`, `404 RESOURCE_NOT_FOUND`, `500 INTERNAL_SERVER_ERROR`.
    *   **Permissions/Notes:** Requires authenticated user. Wraps logic from `getUserProfileAction`.

*   **`PUT /`**
    *   **Objective:** Update the current authenticated user's profile.
    *   **HTTP Method:** `PUT`
    *   **Path Parameters:** None.
    *   **Query Parameters:** None.
    *   **Request Body (application/json):**
        ```json
        {
          "name": "string | null",
          "nativeLanguage": "string | null",
          "targetLanguage": "string | null",
          "proficiencyLevel": "string | null (enum: beginner, intermediate, advanced)",
          "learningPurpose": "string | null"
          // Only include fields to be updated.
          // onboardingCompleted and initialAssessmentCompleted are typically managed by other flows.
        }
        ```
    *   **Success Response (200 OK - application/json):** Returns the updated UserProfileModel (same structure as `GET /`).
    *   **Potential Error Responses:** `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `500 INTERNAL_SERVER_ERROR`.
    *   **Permissions/Notes:** Requires authenticated user. Wraps logic from `updateUserProfileAction`.

**Onboarding & Initial Assessment (Base: `/api/v1/onboarding`)**

*   **`GET /status`**
    *   **Objective:** Get the current user's onboarding record, including completion status and preferences.
    *   **HTTP Method:** `GET`
    *   **Success Response (200 OK - application/json):**
        ```json
        // OnboardingModel structure
        {
          "id": "string",
          "userId": "string",
          "steps": "object", // JSON object showing completed steps, e.g., {"welcome": true, "languages": true}
          "completed": "boolean", // Overall onboarding completion (before assessment)
          "learningPurpose": "string | null",
          "nativeLanguage": "string | null",
          "targetLanguage": "string | null",
          "proficiencyLevel": "string (enum) | null",
          "initialAssessmentCompleted": "boolean",
          "createdAt": "string (ISO 8601 date-time)",
          "updatedAt": "string (ISO 8601 date-time)"
        }
        ```
        *If no onboarding record exists, the backend might create a default one first and return it, or return a 404 if creation is not desired here.*
    *   **Potential Error Responses:** `401 UNAUTHENTICATED`, `404 RESOURCE_NOT_FOUND` (if no auto-creation), `500 INTERNAL_SERVER_ERROR`.
    *   **Permissions/Notes:** Requires authenticated user. Wraps logic from `getOnboardingAction`.

*   **`POST /steps/{stepName}`**
    *   **Objective:** Update the user's progress for a specific onboarding step.
    *   **HTTP Method:** `POST`
    *   **Path Parameters:**
        *   `stepName` (string, required): Name of the onboarding step (e.g., "languages", "purpose").
    *   **Request Body (application/json):**
        ```json
        // Body structure depends on the step
        // Example for "languages" step:
        {
          "nativeLanguage": "string, required",
          "targetLanguage": "string, required"
        }
        // Example for "purpose" step:
        {
          "learningPurpose": "string, required"
        }
        ```
    *   **Success Response (200 OK - application/json):** Returns the updated `OnboardingModel`.
    *   **Potential Error Responses:** `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `500 INTERNAL_SERVER_ERROR`.
    *   **Permissions/Notes:** Requires authenticated user. Wraps logic from `updateOnboardingAction`.

*   **`GET /assessment`**
    *   **Objective:** Get the initial assessment lesson for the user. If it doesn't exist, it may trigger generation.
    *   **HTTP Method:** `GET`
    *   **Success Response (200 OK - application/json):**
        ```json
        // AssessmentLesson structure (see prisma/schema.prisma)
        {
          "id": "string",
          "userId": "string",
          "description": "string | null",
          "completed": "boolean",
          "sourceLanguage": "string",
          "targetLanguage": "string",
          "metrics": "object | null", // Simplified view here, detailed in AudioMetrics
          "proposedTopics": ["string"],
          "summary": "string | null",
          "sessionRecordingUrl": "string | null",
          "steps": [ // Array of AssessmentStep objects
            {
              "id": "string",
              "stepNumber": "integer",
              "type": "string (enum: question, feedback, instruction, summary)",
              "content": "string",
              "contentAudioUrl": "string | null",
              "expectedAnswer": "string | null",
              "expectedAnswerAudioUrl": "string | null",
              // ... other AssessmentStep fields
            }
          ]
          // AudioMetrics might be a separate fetch or included if light enough
        }
        ```
    *   **Potential Error Responses:** `401 UNAUTHENTICATED`, `500 INTERNAL_SERVER_ERROR` (if generation fails).
    *   **Permissions/Notes:** Requires authenticated user. Wraps `getAssessmentLessonAction`.

*   **`POST /assessment/steps/{stepId}/attempt`**
    *   **Objective:** Records a user's attempt for an assessment step.
    *   **HTTP Method:** `POST`
    *   **Path Parameters:**
        *   `stepId` (string, required): The ID of the assessment step.
    *   **Request Body (application/json):**
        ```json
        {
          "userResponse": "string, required" // The user's spoken answer, transcribed
        }
        ```
    *   **Success Response (200 OK - application/json):**
        ```json
        // Updated AssessmentStep object
        {
          "id": "string",
          "assessmentId": "string",
          "stepNumber": "integer",
          "type": "string",
          "content": "string",
          "userResponse": "string",
          "correct": "boolean",
          "attempts": "integer",
          // ... other AssessmentStep fields
        }
        ```
    *   **Potential Error Responses:** `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `404 RESOURCE_NOT_FOUND`, `500 INTERNAL_SERVER_ERROR`.
    *   **Permissions/Notes:** Requires authenticated user. Wraps `recordAssessmentStepAttemptAction`.

**Lessons (Base: `/api/v1/lessons`)**

*   **`GET /{lessonId}`**
    *   **Objective:** Get a specific lesson by ID.
    *   **HTTP Method:** `GET`
    *   **Path Parameters:**
        *   `lessonId` (string, required): The ID of the lesson.
    *   **Success Response (200 OK - application/json):**
        ```json
        // LessonModel structure (see prisma/schema.prisma)
        {
          "id": "string",
          "userId": "string",
          "lessonId": "string", // Internal lesson identifier, e.g., "greetings-intro"
          "focusArea": "string",
          "targetSkills": ["string"],
          "performanceMetrics": "object | null",
          "completed": "boolean",
          "sessionRecordingUrl": "string | null",
          "steps": [ // Array of LessonStep objects
            {
              "id": "string",
              "stepNumber": "integer",
              "type": "string (enum: prompt, feedback, new_word, ...)",
              "content": "string",
              "contentAudioUrl": "string | null",
              // ... other LessonStep fields
            }
          ]
          // AudioMetrics might be a separate fetch or included
        }
        ```
    *   **Potential Error Responses:** `401 UNAUTHENTICATED`, `404 RESOURCE_NOT_FOUND`, `500 INTERNAL_SERVER_ERROR`.
    *   **Permissions/Notes:** Requires authenticated user. Wraps `getLessonByIdAction`.

*   **`POST /{lessonId}/audio`**
    *   **Objective:** Submit full audio recording of a lesson for detailed `AudioMetrics` analysis.
    *   **HTTP Method:** `POST`
    *   **Path Parameters:**
        *   `lessonId` (string, required): The ID of the lesson session.
    *   **Request Body (multipart/form-data):**
        *   `sessionRecording` (file, required): The audio blob.
        *   `recordingTime` (number, required): Duration in milliseconds.
        *   `recordingSize` (number, required): Size in bytes.
    *   **Success Response (200 OK - application/json):**
        ```json
        // Updated LessonModel with AudioMetrics populated
        {
          // ... LessonModel fields ...
          "audioMetrics": {
            // AudioMetrics structure (see prisma/schema.prisma)
            "id": "string",
            "pronunciationScore": "number",
            "fluencyScore": "number",
            // ... other AudioMetrics fields ...
          }
        }
        ```
    *   **Potential Error Responses:** `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `404 RESOURCE_NOT_FOUND`, `500 INTERNAL_SERVER_ERROR`, `502 EXTERNAL_SERVICE_ERROR` (if AI analysis fails).
    *   **Permissions/Notes:** Requires authenticated user. Wraps `processLessonRecordingAction`.

### 7.3. Next Steps for Backend Development

The following high-level tasks would be required for @roo to implement the backend API support for the Flutter application:

1.  **Define DTOs (Data Transfer Objects):** For each required API endpoint, precisely define the JSON request and response structures (schemas), including field names, dataTypes, and required/optional status. These will form the contract between the Flutter app and the Next.js backend. *(This document section provides examples for key endpoints).*
2.  **Implement API Routes:**
    *   Create new API route handlers under a versioned path (e.g., `src/app/api/v1/...`) for each of the endpoints outlined.
    *   These handlers will parse incoming requests, validate data based on the defined DTOs, and call the appropriate existing service methods from `src/services/`.
3.  **Implement JWT Authentication & Authorization:**
    *   Develop or integrate a robust mechanism within each new API route (or via a shared middleware pattern specifically for `/api/v1/` routes) to:
        *   Extract the Supabase JWT from the `Authorization: Bearer <token>` header.
        *   Validate the token using Supabase server-side utilities (e.g., `await supabase.auth.getUser(jwt)`).
        *   Retrieve the authenticated user's ID and use it for authorization checks (e.g., ensuring a user can only access/modify their own data).
        *   Return `401 UNAUTHENTICATED` or `403 FORBIDDEN` responses (using the standardized error structure) as appropriate.
4.  **Service Layer Interaction:** Ensure API routes correctly call the existing service methods, passing necessary parameters and handling their return values or errors.
5.  **Error Handling:** Implement consistent error handling within A\PI routes. Catch errors from service calls (including Prisma errors or custom exceptions) and transform them into standardized JSON error responses with appropriate HTTP status codes and application-specific error codes.
6.  **Logging:** Add comprehensive logging within the API routes for request/response cycles, errors, and key operations to aid in debugging and monitoring.
7.  **Testing:**
    *   Write unit tests for any new logic within the API routes (e.g., data transformation, specific validation).
    *   Write integration tests to verify that the API routes correctly interact with services and that authentication/authorization works as expected. Tools like Postman or automated API testing frameworks can be used.
```
Okay, @roo, here's the detailed breakdown for enhancing Section 7 of `document.md`. This content should be integrated into that section to provide the necessary API specifications.


### 7.1. General API Design Principles

The new APIs developed for Flutter (and potentially other external clients) should adhere to the following principles:

*   **RESTful or Resource-Oriented:** Design endpoints around resources (e.g., `/profile`, `/lessons`, `/onboarding`). While not strictly REST in all cases (some actions are operations), aim for clear resource identification.
*   **Stateless & JWT Authenticated:** All protected endpoints must validate a Supabase JWT passed in the `Authorization: Bearer <token>` header. The server should not rely on session cookies for these APIs.
*   **JSON for Data Exchange:** Use JSON exclusively for request and response bodies.
*   **Standard HTTP Methods:** Utilize GET for retrieval, POST for creation, PUT for updates (or PATCH for partial updates), and DELETE for removal.
*   **Clear Error Responses:** Implement consistent error handling with appropriate HTTP status codes and JSON error messages (see Section 7.1.1).
*   **Idempotency where applicable:** For PUT/DELETE operations.
*   **Data Validation:** Implement robust input validation on the backend for all incoming data to ensure data integrity and security.

#### 7.1.1. Standardized API Error Response Structure

All `/api/v1/...` endpoints should use a consistent JSON structure for error responses. When an error occurs, the API will respond with an appropriate HTTP status code and a JSON body formatted as follows:

```json
{
  "error": {
    "code": "string", // Application-specific error code
    "message": "string", // A descriptive error message
    "details": "object | array | null" // Optional: Additional details, e.g., field validation errors
  }
}
```

**Common Application-Specific Error Codes (`error.code`):**

*   `UNAUTHENTICATED`: Missing or invalid JWT. HTTP Status: 401.
*   `FORBIDDEN`: User is authenticated but not authorized to perform the action. HTTP Status: 403.
*   `VALIDATION_ERROR`: Input data failed validation. `details` object might contain field-specific errors (e.g., `{"details": {"fieldName": "Error message for fieldName"}}`). HTTP Status: 400.
*   `RESOURCE_NOT_FOUND`: The requested resource does not exist. HTTP Status: 404.
*   `CONFLICT_ERROR`: A conflict occurred, e.g., trying to create a resource that already exists and shouldn't. HTTP Status: 409.
*   `INTERNAL_SERVER_ERROR`: An unexpected error occurred on the server. HTTP Status: 500.
*   `EXTERNAL_SERVICE_ERROR`: An error occurred while communicating with an external service (e.g., AI provider, payment gateway). HTTP Status: 502 (Bad Gateway) or 503 (Service Unavailable).
*   `OPERATION_FAILED`: A general error code for when a specific operation could not be completed due to reasons not covered by other codes. HTTP Status: 400 or 500.

#### 7.1.2. JWT Authentication for `/api/v1/...` Routes

Authentication for the new `/api/v1/...` routes intended for the Flutter client will be handled via Supabase JSON Web Tokens (JWTs).

**Flow:**

1.  **Client-Side (Flutter):**
    *   The Flutter app authenticates the user directly with the shared Supabase project using the Supabase Flutter SDK (e.g., `supabase-flutter`).
    *   Upon successful authentication (login or registration), the Flutter app obtains a JWT (access token) from the Supabase session.
2.  **API Request (Flutter to Next.js):**
    *   For every request to a protected `/api/v1/...` endpoint on the Next.js backend, the Flutter app must include the JWT in the `Authorization` HTTP header using the `Bearer` scheme:
        ```
        Authorization: Bearer <SUPABASE_JWT_ACCESS_TOKEN>
        ```
3.  **Backend-Side (Next.js API Route):**
    *   **Token Extraction:** In the Next.js API route handler (or a dedicated middleware for `/api/v1/` routes), the JWT must be extracted from the `Authorization` header. The token is the part after "Bearer ".
    *   **Token Validation:**
        *   Initialize a Supabase client instance using `createSupabaseServerClient()` from `src/utils/supabase/server.ts`.
        *   Pass the extracted JWT to `supabase.auth.getUser(jwt)`. This Supabase method will:
            *   Verify the token's signature against the Supabase project's JWT secret.
            *   Check for token expiration.
            *   If the token is valid, it returns an object containing the user data: `{ data: { user }, error: null }`. The `user` object will contain the `id` of the authenticated user.
            *   If the token is invalid or expired, it returns `{ data: { user: null }, error: AuthError }`.
    *   **User Context & Authorization:**
        *   If `supabase.auth.getUser(jwt)` returns a valid user (`data.user` is not null), the `userId` from `data.user.id` is used to establish the user context for the request. This `userId` is then used to authorize access to resources (e.g., ensuring a user can only access/modify their own data) and perform operations.
        *   Subsequent service calls (e.g., to `UserService`, `LessonService`) will use this `userId`.
    *   **Error Handling:**
        *   If the `Authorization` header is missing, malformed, or the token is invalid/expired (i.e., `supabase.auth.getUser(jwt)` returns an error or null user), the API route **must** return a `401 Unauthorized` HTTP status with the standardized error JSON: `{"error": {"code": "UNAUTHENTICATED", "message": "Authentication required. Please log in again."}}`.
        *   If the token is valid but the authenticated user does not have permission for the specific action/resource (this would be checked by business logic, e.g., ensuring `userId` from token matches `userId` of the resource being accessed), a `403 Forbidden` HTTP status should be returned: `{"error": {"code": "FORBIDDEN", "message": "You do not have permission to perform this action."}}`.

This JWT validation logic should be implemented as a reusable helper function or a middleware pattern applied to all relevant `/api/v1/...` API routes to ensure consistent and secure authentication.

### 7.2. Required API Endpoint Groups

The following subsections provide detailed DTO (Data Transfer Object) specifications for representative API endpoints. These are examples; similar detail should be defined for all new API routes before implementation.
DTO fields are derived from Prisma schema models (e.g., `User`, `Onboarding`, `Lesson`, etc., found in `prisma/schema.prisma` and `src/models/AppAllModels.model.ts`) and existing Server Action parameters/return types. Timestamps should be in ISO 8601 format (e.g., `"2023-10-26T07:49:13.511Z"`). JSONB fields in Prisma are represented as JSON objects or arrays in DTOs.

---
#### **User Profile Management** (Base Path: `/api/v1/profile`)
---

*   **`GET /`**
    *   **Objective:** Retrieve the current authenticated user's profile.
    *   **HTTP Method & Path:** `GET /api/v1/profile/`
    *   **Path Parameters:** None.
    *   **Query Parameters:** None.
    *   **Request Body:** None.
    *   **Success Response (200 OK - `application/json`):**
        ```json
        {
          "id": "string", // User ID (from Supabase Auth, also Prisma User ID)
          "userId": "string", // Redundant, same as id. Consider removing from DTO if always same as 'id'.
          "email": "string",
          "name": "string | null",
          "nativeLanguage": "string | null",
          "targetLanguage": "string | null",
          "proficiencyLevel": "string | null", // Enum: 'beginner', 'intermediate', 'advanced'
          "learningPurpose": "string | null",
          "onboardingCompleted": "boolean",
          "initialAssessmentCompleted": "boolean",
          "subscriptionStatus": "string", // Enum: 'NONE', 'TRIAL', 'ACTIVE', 'CANCELED', 'PAST_DUE', 'EXPIRED'
          "subscriptionEndDate": "string (ISO 8601 date-time) | null",
          "createdAt": "string (ISO 8601 date-time)",
          "updatedAt": "string (ISO 8601 date-time)"
          // Other relevant fields from UserProfileModel based on Prisma User & Onboarding
        }
        ```
    *   **Potential Error Responses:**
        *   `401 UNAUTHENTICATED`: If JWT is missing or invalid.
        *   `404 RESOURCE_NOT_FOUND`: If the user profile does not exist in the database for the authenticated user.
        *   `500 INTERNAL_SERVER_ERROR`: For unexpected server issues.
    *   **Permissions/Notes:** Requires an authenticated user. This endpoint wraps the logic from `getUserProfileAction`.

*   **`PUT /`**
    *   **Objective:** Update the current authenticated user's profile.
    *   **HTTP Method & Path:** `PUT /api/v1/profile/`
    *   **Path Parameters:** None.
    *   **Query Parameters:** None.
    *   **Request Body (`application/json`):**
        *Allowed fields for update. All fields are optional; only provided fields will be updated.*
        ```json
        {
          "name": "string | null",
          "nativeLanguage": "string | null",
          "targetLanguage": "string | null",
          "proficiencyLevel": "string | null", // Enum: 'beginner', 'intermediate', 'advanced'
          "learningPurpose": "string | null"
        }
        ```
    *   **Success Response (200 OK - `application/json`):** Returns the updated `UserProfileModel` (same structure as `GET /`).
    *   **Potential Error Responses:**
        *   `400 VALIDATION_ERROR`: If request body validation fails (e.g., invalid enum value for `proficiencyLevel`).
        *   `401 UNAUTHENTICATED`: If JWT is missing or invalid.
        *   `404 RESOURCE_NOT_FOUND`: If the user profile to update does not exist.
        *   `500 INTERNAL_SERVER_ERROR`: For unexpected server issues.
    *   **Permissions/Notes:** Requires an authenticated user. Wraps the logic from `updateUserProfileAction`.

---
#### **Onboarding & Initial Assessment** (Base Path: `/api/v1/onboarding`)
---

*   **`GET /status`**
    *   **Objective:** Get the current user's onboarding record, including completion status and preferences. If no record exists, one should be created with default values.
    *   **HTTP Method & Path:** `GET /api/v1/onboarding/status`
    *   **Success Response (200 OK - `application/json`):**
        ```json
        // OnboardingModel structure (from src/models/AppAllModels.model.ts and prisma/schema.prisma)
        {
          "id": "string", // Onboarding record ID
          "userId": "string", // Authenticated User ID
          "steps": {}, // JSON object, e.g., {"welcome": true, "languages": true, "purpose": false, ...}
          "completed": "boolean", // True if main onboarding steps (pre-assessment) are done
          "learningPurpose": "string | null",
          "nativeLanguage": "string | null",
          "targetLanguage": "string | null",
          "proficiencyLevel": "string | null", // Enum: 'beginner', 'intermediate', 'advanced'
          "initialAssessmentCompleted": "boolean", // True if the initial language assessment flow is done
          "createdAt": "string (ISO 8601 date-time)",
          "updatedAt": "string (ISO 8601 date-time)"
        }
        ```
    *   **Potential Error Responses:**
        *   `401 UNAUTHENTICATED`.
        *   `500 INTERNAL_SERVER_ERROR` (e.g., if fetching or default creation fails).
    *   **Permissions/Notes:** Requires an authenticated user. Wraps logic from `getOnboardingAction` and potentially `createOnboardingAction` if no record exists.

*   **`POST /steps/{stepName}`**
    *   **Objective:** Update the user's progress for a specific onboarding step (e.g., after they select languages or define their learning purpose).
    *   **HTTP Method & Path:** `POST /api/v1/onboarding/steps/{stepName}`
    *   **Path Parameters:**
        *   `stepName` (string, required): The name of the onboarding step being completed (e.g., "welcome", "languages", "purpose", "proficiency").
    *   **Request Body (`application/json`):**
        *Body structure depends on `stepName`. All fields are typically optional in the request, as `stepName` implies completion, but data specific to the step should be sent.*
        ```json
        // Example for "languages" step:
        {
          "nativeLanguage": "string",
          "targetLanguage": "string"
        }
        // Example for "purpose" step:
        {
          "learningPurpose": "string"
        }
        // Example for "proficiency" step:
        {
          "proficiencyLevel": "string" // Enum: 'beginner', 'intermediate', 'advanced'
        }
        // For "welcome", body might be empty: {}
        ```
    *   **Success Response (200 OK - `application/json`):** Returns the updated `OnboardingModel` (same structure as `GET /status`).
    *   **Potential Error Responses:** `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `500 INTERNAL_SERVER_ERROR`.
    *   **Permissions/Notes:** Requires authenticated user. Wraps logic from `updateOnboardingAction`.

*   **`POST /assessment/steps/{stepId}/attempt`**
    *   **Objective:** Submit the user's response for a specific interactive step within the initial language assessment.
    *   **HTTP Method & Path:** `POST /api/v1/onboarding/assessment/steps/{stepId}/attempt`
    *   **Path Parameters:**
        *   `stepId` (string, required): The ID of the `AssessmentStep` being attempted.
    *   **Request Body (`application/json`):**
        ```json
        {
          "userResponse": "string, required" // The user's transcribed spoken response, or "Acknowledged" for non-interactive steps.
        }
        ```
    *   **Success Response (200 OK - `application/json`):**
        ```json
        // Updated AssessmentStep object (from src/models/AppAllModels.model.ts & prisma/schema.prisma)
        {
          "id": "string",
          "assessmentId": "string",
          "stepNumber": "integer",
          "type": "string", // Enum: 'question', 'feedback', 'instruction', 'summary'
          "content": "string",
          "contentAudioUrl": "string | null",
          "translation": "string | null",
          "expectedAnswer": "string | null",
          "expectedAnswerAudioUrl": "string | null",
          "maxAttempts": "integer",
          "userResponse": "string | null",
          "userResponseHistory": "object | null", // JSONB, could be array of strings
          "attempts": "integer",
          "correct": "boolean",
          "lastAttemptAt": "string (ISO 8601 date-time) | null",
          "feedback": "string | null", // Feedback provided for this attempt
          "createdAt": "string (ISO 8601 date-time)",
          "updatedAt": "string (ISO 8601 date-time)"
        }
        ```
    *   **Potential Error Responses:**
        *   `400 VALIDATION_ERROR`: If `userResponse` is missing or invalid.
        *   `401 UNAUTHENTICATED`.
        *   `404 RESOURCE_NOT_FOUND`: If the `assessmentId` (derived from `stepId`) or `stepId` itself is not found.
        *   `500 INTERNAL_SERVER_ERROR`.
    *   **Permissions/Notes:** Requires authenticated user. Wraps `recordAssessmentStepAttemptAction` logic from `onboarding-actions.ts`. The `assessmentId` is inferred from the `stepId` on the backend.

---
#### **Lessons** (Base Path: `/api/v1/lessons`)
---

*   **`GET /{lessonId}`**
    *   **Objective:** Fetch details for a specific lesson by its ID.
    *   **HTTP Method & Path:** `GET /api/v1/lessons/{lessonId}`
    *   **Path Parameters:**
        *   `lessonId` (string, required): The ID of the `Lesson`.
    *   **Query Parameters:** None.
    *   **Request Body:** None.
    *   **Success Response (200 OK - `application/json`):**
        ```json
        // LessonModel structure (from src/models/AppAllModels.model.ts & prisma/schema.prisma)
        {
          "id": "string",
          "userId": "string",
          "lessonId": "string", // Internal "slug" or generated ID for the lesson type/content
          "focusArea": "string",
          "targetSkills": ["string"], // Array of strings
          "performanceMetrics": "object | null", // JSONB in Prisma
          "completed": "boolean",
          "createdAt": "string (ISO 8601 date-time)",
          "updatedAt": "string (ISO 8601 date-time)",
          "sessionRecordingUrl": "string | null",
          "audioMetrics": "object | null", // AudioMetrics object (see below if included directly, or fetch separately)
          "steps": [ // Array of LessonStep objects
            {
              "id": "string",
              "lessonId": "string", // Parent lesson ID
              "stepNumber": "integer",
              "type": "string", // Enum: 'prompt', 'feedback', 'new_word', 'practice', 'instruction', 'summary'
              "content": "string",
              "contentAudioUrl": "string | null",
              "translation": "string | null",
              "expectedAnswer": "string | null",
              "expectedAnswerAudioUrl": "string | null",
              "userResponse": "string | null",
              "userResponseHistory": "object | null", // JSONB, e.g., array of past responses
              "attempts": "integer",
              "maxAttempts": "integer",
              "correct": "boolean",
              "lastAttemptAt": "string (ISO 8601 date-time) | null",
              "errorPatterns": ["string"] // Array of strings
            }
          ]
        }
        ```
        *Optional: `audioMetrics` DTO (if returned nested):*
        ```json
        // (If audioMetrics is returned as part of the lesson DTO)
        "audioMetrics": {
          "id": "string",
          "pronunciationScore": "number", // Float
          "fluencyScore": "number", // Float
          "grammarScore": "number", // Float
          "vocabularyScore": "number", // Float
          "overallPerformance": "number", // Float
          "proficiencyLevel": "string", // CEFR
          "learningTrajectory": "string", // Enum: 'steady', 'accelerating', 'plateauing'
          "pronunciationAssessment": {}, // JSON object
          "fluencyAssessment": {}, // JSON object
          "grammarAssessment": {}, // JSON object
          "vocabularyAssessment": {}, // JSON object
          "exerciseCompletion": {}, // JSON object
          "suggestedTopics": ["string"],
          "grammarFocusAreas": ["string"],
          "vocabularyDomains": ["string"],
          "nextSkillTargets": ["string"],
          "preferredPatterns": ["string"],
          "effectiveApproaches": ["string"],
          "audioRecordingUrl": "string | null",
          "recordingDuration": "number | null" // Float, seconds
        }
        ```
    *   **Potential Error Responses:** `401 UNAUTHENTICATED`, `403 FORBIDDEN` (if lesson doesn't belong to user), `404 RESOURCE_NOT_FOUND`, `500 INTERNAL_SERVER_ERROR`.
    *   **Permissions/Notes:** Requires authenticated user. Wraps `getLessonByIdAction`.

*   **`POST /{lessonId}/audio`**
    *   **Objective:** Submit the full audio recording of a lesson session for detailed `AudioMetrics` analysis.
    *   **HTTP Method & Path:** `POST /api/v1/lessons/{lessonId}/audio`
    *   **Path Parameters:**
        *   `lessonId` (string, required): The ID of the `Lesson` this audio belongs to.
    *   **Request Body (`multipart/form-data`):**
        *   `sessionRecording` (file, required): The audio blob/file (e.g., webm, mp3, m4a). The backend will handle storage (e.g., Vercel Blob) and processing.
        *   `recordingTime` (number, required): Duration of the recording in milliseconds.
        *   `recordingSize` (number, required): Size of the recording in bytes.
    *   **Success Response (200 OK - `application/json`):** Returns the updated `LessonModel` with the `audioMetrics` field populated (same structure as `GET /{lessonId}` but `audioMetrics` will be present).
    *   **Potential Error Responses:**
        *   `400 VALIDATION_ERROR`: If required form data is missing or invalid.
        *   `401 UNAUTHENTICATED`.
        *   `403 FORBIDDEN` (if lesson doesn't belong to user).
        *   `404 RESOURCE_NOT_FOUND`: If the `lessonId` is not found.
        *   `500 INTERNAL_SERVER_ERROR` (e.g., file upload fails, AI analysis fails).
        *   `502 EXTERNAL_SERVICE_ERROR` (if AI analysis service returns an error).
    *   **Permissions/Notes:** Requires authenticated user. Wraps logic from `processLessonRecordingAction`.

---
*(Additional endpoint specifications for other groups like Learning Progress would follow a similar detailed format, referencing their respective Prisma models and Server Action logic).*

### 7.3. Next Steps for Backend Development

The following high-level tasks would be required for @roo to implement the backend API support for the Flutter application:

1.  **Define DTOs (Data Transfer Objects):** For each required API endpoint, precisely define the JSON request and response structures (schemas), including field names, dataTypes, and required/optional status. These will form the contract between the Flutter app and the Next.js backend. *(This document section provides examples for key endpoints).*
2.  **Implement API Routes:**
    *   Create new API route handlers under a versioned path (e.g., `src/app/api/v1/...`) for each of the endpoints outlined.
    *   These handlers will parse incoming requests, validate data based on the defined DTOs, and call the appropriate existing service methods from `src/services/`.
3.  **Implement JWT Authentication & Authorization:**
    *   Develop or integrate a robust mechanism within each new API route (or via a shared middleware pattern specifically for `/api/v1/` routes) to:
        *   Extract the Supabase JWT from the `Authorization: Bearer <token>` header.
        *   Validate the token using Supabase server-side utilities (e.g., `await supabase.auth.getUser(jwt)`).
        *   Retrieve the authenticated user's ID and use it for authorization checks (e.g., ensuring a user can only access/modify their own data).
        *   Return `401 UNAUTHENTICATED` or `403 FORBIDDEN` responses (using the standardized error structure) as appropriate.
4.  **Service Layer Interaction:** Ensure API routes correctly call the existing service methods, passing necessary parameters and handling their return values or errors.
5.  **Error Handling:** Implement consistent error handling within API routes. Catch errors from service calls (including Prisma errors or custom exceptions) and transform them into standardized JSON error responses with appropriate HTTP status codes and application-specific error codes.
6.  **Logging:** Add comprehensive logging within the API routes for request/response cycles, errors, and key operations to aid in debugging and monitoring.
7.  **Testing:**
    *   Write unit tests for any new logic within the API routes (e.g., data transformation, specific validation).
    *   Write integration tests to verify that the API routes correctly interact with services and that authentication/authorization works as expected. Tools like Postman or automated API testing frameworks can be used.

```

---

This content should provide @roo with the detailed specifications needed.

**TODO #7 (now marked as #1 in your list) is effectively completed by providing this information.**

We can now proceed to **TODO #2 (Implement `GET /api/v1/profile/`)** from your list.

Please confirm when @roo is ready for that task's detailed instructions.
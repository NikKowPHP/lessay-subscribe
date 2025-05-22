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




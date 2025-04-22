// src/app/app/layout.tsx
import { AuthProvider } from '@/context/auth-context';
import '@/app/globals.css';
import { Toaster } from '@/components/Toaster';
import { OnboardingProvider } from '@/context/onboarding-context';
import { LessonProvider } from '@/context/lesson-context';
import { UserProfileProvider } from '@/context/user-profile-context';
import { AppInitializerProvider } from '@/context/app-initializer-context';
import { ErrorProvider } from '@/hooks/useError'; // Assuming you have this
// import { PostHogProvider } from '@/context/posthog-context'; // Assuming you have this

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Optional Utility Providers first
    <ErrorProvider>
      {/* <PostHogProvider> */}
      {/* Core Application Logic Providers */}
      <AuthProvider>
        <UserProfileProvider>
          <OnboardingProvider> {/* Provides isOnboardingComplete */}
            <AppInitializerProvider> {/* Needs Auth, Profile; Consumes Onboarding for redirection */}
              <LessonProvider> {/* Needs Auth, Onboarding, AppInitializer */}
                {/* The main content area */}
                <div className="min-h-screen bg-neutral-1">
                  <main>{children}</main>
                </div>
                <Toaster />
              </LessonProvider>
            </AppInitializerProvider>
          </OnboardingProvider>
        </UserProfileProvider>
      </AuthProvider>
      {/* </PostHogProvider> */}
    </ErrorProvider>
  );
}

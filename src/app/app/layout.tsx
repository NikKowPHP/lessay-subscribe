// File: src/app/app/layout.tsx
import { AuthProvider } from '@/context/auth-context';
import '@/app/globals.css';
import { Toaster } from '@/components/Toaster';
import { OnboardingProvider } from '@/context/onboarding-context';
import { LessonProvider } from '@/context/lesson-context';
import { UserProfileProvider } from '@/context/user-profile-context';
// import { User } from 'lucide-react'; // Removed unused import
// import Link from 'next/link'; // Removed unused import
// import { AppGate } from '@/components/AppGate'; // Removed AppGate as Initializer handles loading
import { AppInitializerProvider } from '@/context/app-initializer-context'; // Import the new provider

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {


  return (
    <AuthProvider>
      <UserProfileProvider>
        <OnboardingProvider>
          <LessonProvider>
            {/* Wrap everything inside AppInitializerProvider */}
            <AppInitializerProvider>
              <div className="min-h-screen bg-gray-50">
                {/* Main Content - Children are now rendered conditionally by AppInitializerProvider */}
                <main>{children}</main>
              </div>
              <Toaster />
            </AppInitializerProvider>
          </LessonProvider>
        </OnboardingProvider>
      </UserProfileProvider>
    </AuthProvider>
  );
}
// --- NEW CODE END ---

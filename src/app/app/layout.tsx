import { AuthProvider } from '@/context/auth-context';
import '@/app/globals.css';
import { Toaster } from '@/components/Toaster';
import { OnboardingProvider } from '@/context/onboarding-context';
import { LessonProvider } from '@/context/lesson-context';
import { UserProfileProvider } from '@/context/user-profile-context';
import { User } from 'lucide-react';
import Link from 'next/link';
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
            <div className="min-h-screen bg-gray-50">
              {/* Main Content */}
              <main>{children}</main>
            </div>
            <Toaster />
          </LessonProvider>
        </OnboardingProvider>
      </UserProfileProvider>
    </AuthProvider>
  );
}

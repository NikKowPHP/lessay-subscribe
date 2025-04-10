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

  const RenderHeaderWithUserProfile = () => (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 h-14 flex justify-end items-center">
        <Link href="/app/profile" title="User Profile">
          <User className="h-6 w-6 text-gray-600 hover:text-gray-900" />
        </Link>
      </div>
    </header>
  );
  return (
    <AuthProvider>
      <UserProfileProvider>
        <OnboardingProvider>
          <LessonProvider>
            <div className="min-h-screen bg-gray-50">
              <RenderHeaderWithUserProfile />
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

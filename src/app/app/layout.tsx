import { AuthProvider } from '@/context/auth-context';
import '@/app/globals.css';
import { Toaster } from '@/components/Toaster';
import { OnboardingProvider } from '@/context/onboarding-context';
import { LessonProvider } from '@/context/lesson-context';
import { UserProfileProvider } from '@/context/user-profile-context';
import { User } from 'lucide-react';
import Link from 'next/link';
import { AppGate } from '@/components/AppGate';
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {


  return (
    <AuthProvider>
        <OnboardingProvider>
          <LessonProvider>
            <div className="min-h-screen bg-gray-50">
              {/* Main Content */}
              <AppGate> 
                <main>{children}</main>
              </AppGate>
            </div>
            <Toaster />
          </LessonProvider>
        </OnboardingProvider>
    </AuthProvider>
  );
}

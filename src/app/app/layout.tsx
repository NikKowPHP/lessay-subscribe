import { AuthProvider } from '@/context/auth-context'
import '@/styles/globals.css'
import { Toaster } from '@/components/Toaster'
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
      <Toaster />
    </AuthProvider>
  )
}
import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = await createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Allow access to login page for unauthenticated users
  if (path === '/app/login') {
    if (user) {
      return NextResponse.redirect(new URL('/app/lessons', request.url))
    }
    return response
  }

  // Protect all other app routes
  if (!user && path.startsWith('/app')) {
    return NextResponse.redirect(new URL('/app/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/app/:path*',
    '/api/auth/:path*'
  ]
}
import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = await createSupabaseServerClient(request)

  // Validate session before page loads
  const { data: { user } } = await supabase.auth.getUser()

  // Protect authenticated routes
  if (!user && request.nextUrl.pathname.startsWith('/app')) {
    return NextResponse.redirect(new URL('/app/login', request.url))
  }

  // Protect auth routes for logged-in users
  if (user && request.nextUrl.pathname.startsWith('/app/login')) {
    return NextResponse.redirect(new URL('/app/lessons', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/app/:path*', // Protect all app routes
    '/api/auth/:path*' // Protect auth API routes
  ]
}
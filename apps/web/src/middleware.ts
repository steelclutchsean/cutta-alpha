import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication (handled client-side, but redirect if no token cookie hint)
const protectedRoutes = [
  '/dashboard',
  '/pools',
  '/market',
  '/wallet',
  '/settings',
  '/my-teams',
];

// Routes that should redirect to dashboard if already signed in
const authRoutes = ['/login', '/signup', '/sign-in', '/sign-up'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow auth callback route
  if (pathname.startsWith('/auth/callback')) {
    return NextResponse.next();
  }

  // Note: Full auth checking happens client-side since JWT is stored in localStorage
  // This middleware provides basic route structure but actual auth state is managed by AuthProvider
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};


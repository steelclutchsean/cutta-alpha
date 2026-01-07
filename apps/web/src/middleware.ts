import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/pools(.*)',
  '/market(.*)',
  '/wallet(.*)',
  '/settings(.*)',
  '/my-teams(.*)',
]);

// Routes that should redirect to dashboard if already signed in
const isAuthRoute = createRouteMatcher([
  '/login(.*)',
  '/signup(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  
  // Redirect authenticated users away from auth pages
  if (userId && isAuthRoute(req)) {
    return Response.redirect(new URL('/dashboard', req.url));
  }
  
  // Protect authenticated routes
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};


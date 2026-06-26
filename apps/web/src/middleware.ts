import { NextResponse } from 'next/server';
import { clerkMiddleware } from '@clerk/nextjs/server';

/**
 * Clerk attaches auth to requests when configured. When keys are absent (e.g.
 * the marketing site running in preview without secrets), we fall back to a
 * passthrough so public pages and the waitlist keep working. Auth-gated API
 * routes still return 401 via getAuthContext(), so nothing is exposed.
 */
const configured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

export default configured ? clerkMiddleware() : () => NextResponse.next();

export const config = {
  matcher: [
    // Skip Next internals and static files; always run for API routes.
    '/((?!_next|.*\\.(?:ico|png|jpg|jpeg|svg|css|js|woff2?|map)$).*)',
    '/(api|trpc)(.*)',
  ],
};

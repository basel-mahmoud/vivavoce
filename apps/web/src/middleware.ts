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

/**
 * Only where auth is read: the dashboard (its layout is the one place Clerk's provider loads, and
 * its page calls getAuthContext) and the API routes. The marketing pages never ask who is signed
 * in, so they are served straight from the CDN cache without running the middleware first.
 */
export const config = {
  matcher: ['/dashboard(.*)', '/(api|trpc)(.*)'],
};

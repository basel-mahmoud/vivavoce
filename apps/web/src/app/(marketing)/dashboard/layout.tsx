import type { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/nextjs';

// Sign-in exists only when Clerk has both keys (the same test as middleware.ts
// and the page): a bare preview renders the dashboard's example without it.
const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);

/**
 * The only place anyone signs in, so the only place Clerk's provider and
 * scripts load. The marketing pages around it stay free of them.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return clerkConfigured ? <ClerkProvider>{children}</ClerkProvider> : children;
}

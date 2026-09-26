import type { Metadata } from 'next';
import Link from 'next/link';
import { SignInButton } from '@clerk/nextjs';
import { Smartphone } from 'lucide-react';
import { HeroMark } from '@/components/site/HeroMark';
import { PageHero } from '@/components/site/PageHero';
import { ProgressBoard } from '@/components/site/Progress';
import { exampleStats } from '@/components/site/progress-data';
import { getAuthContext } from '@/lib/auth/context';
import { getUserStats } from '@/lib/db/practice.repo';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your practice, marked: streak, five-axis averages, and session history.',
};

export const dynamic = 'force-dynamic';

// Same rule as the root layout: sign-in only exists when Clerk has both keys.
const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);

const title = (
  <>
    Your practice,{' '}
    <HeroMark>
      marked
    </HeroMark>
    .
  </>
);

export default async function DashboardPage() {
  const ctx = await getAuthContext();

  if (!ctx) {
    return (
      <>
        <PageHero
          title={title}
          intro="Sign in with the same account you use in the app: your streak, five-axis averages and session history live here too."
        />
        <section aria-label="Example progress" className="mx-auto w-full max-w-[1360px] px-3 pb-24 sm:px-5 sm:pb-32">
          <div className="vv-dash-example">
            <p className="vv-dash-example-text">
              <span className="vv-dash-example-tag">Example</span>
              This is what a few weeks of practice look like. Your own marks appear here once you sign in.
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {clerkConfigured ? (
                <SignInButton mode="modal">
                  <button type="button" className="btn btn-primary">
                    Sign in to see your marks
                  </button>
                </SignInButton>
              ) : (
                <Link href="/waitlist" className="btn btn-primary">
                  Get early access
                </Link>
              )}
              <a href="/download/apk" className="group inline-flex min-h-11 items-center gap-1.5 font-bold">
                <Smartphone size={16} aria-hidden className="text-ink-blue" />
                <span className="link-quiet">Download the Android beta</span>
              </a>
            </div>
          </div>
          <ProgressBoard stats={exampleStats()} example />
        </section>
      </>
    );
  }

  const stats = await getUserStats(ctx.userId);

  return (
    <>
      <PageHero
        title={title}
        intro="The same account as the app: everything below is your real history, live from the database."
      />
      <section aria-label="Your progress" className="mx-auto w-full max-w-[1360px] px-3 pb-24 sm:px-5 sm:pb-32">
        <ProgressBoard stats={stats} />
      </section>
    </>
  );
}

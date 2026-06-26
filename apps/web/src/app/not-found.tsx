import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';
import { Logo } from '@/components/site/Logo';

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="text-center">
        <Link href="/" className="inline-block">
          <Logo />
        </Link>
        <p className="kicker mt-10">Error 404</p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-ink sm:text-5xl">
          We couldn’t find that page
        </h1>
        <p className="mx-auto mt-4 max-w-md text-muted">
          The link may be old or mistyped. Let’s get you back to somewhere useful.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <ButtonLink href="/">Back home</ButtonLink>
          <ButtonLink href="/waitlist" variant="secondary">
            Get early access
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}

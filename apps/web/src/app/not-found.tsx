import Link from 'next/link';
import { Logo } from '@/components/site/Logo';

export default function NotFound() {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-canvas px-6 text-ink">
      <div className="tile w-full max-w-xl p-8 sm:p-12">
        <Link href="/" className="inline-block">
          <Logo />
        </Link>
        <p className="display mt-8 text-[clamp(4rem,12vw,7rem)] leading-none text-verm">404</p>
        <h1 className="mt-3 text-2xl font-black">
          That page did not show up for the exam.
        </h1>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="pressable inline-flex h-12 items-center rounded-full bg-ink px-6 font-bold text-paper"
          >
            Back home
          </Link>
          <Link
            href="/waitlist"
            className="pressable inline-flex h-12 items-center rounded-full border-2 border-ink px-6 font-bold transition-colors duration-150 hover:bg-ink hover:text-paper"
          >
            Get early access
          </Link>
        </div>
      </div>
    </main>
  );
}

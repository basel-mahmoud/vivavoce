import Link from 'next/link';
import { Logo } from '@/components/site/Logo';

export default function NotFound() {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-canvas px-5 text-ink">
      <div className="w-full max-w-2xl">
        <Link href="/" aria-label="VivaVoce home" className="inline-block">
          <Logo />
        </Link>
        <p className="marks mt-12 flex items-end gap-3" aria-hidden>
          {[4, 0, 4].map((n, i) => (
            <span
              key={i}
              className={`grid h-24 w-24 place-items-center rounded-full text-5xl font-bold sm:h-32 sm:w-32 sm:text-6xl ${
                i === 1 ? '-translate-y-3 bg-verm text-coal' : 'bg-ink text-canvas'
              }`}
            >
              {n}
            </span>
          ))}
        </p>
        <h1 className="display mt-10 text-[clamp(2.2rem,5vw,3.6rem)]">
          That page did not show up for the exam.
        </h1>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="btn btn-ink">
            Back home
          </Link>
          <Link href="/waitlist" className="btn btn-line">
            Get early access
          </Link>
        </div>
      </div>
    </main>
  );
}

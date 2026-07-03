import Link from 'next/link';
import { site } from '@/lib/site';
import { Logo } from './Logo';

const links = [
  { label: 'Features', href: '/features' },
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Use cases', href: '/use-cases' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact', href: '/contact' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Accessibility', href: '/legal/accessibility' },
];

export function Footer() {
  return (
    <footer className="mx-auto w-full max-w-[1360px] px-4 pb-8 sm:px-6">
      <div className="tile tile-ink p-7 sm:p-10">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-paper-mut">
              A voice-first study partner. Rehearse out loud, get marked, walk
              in ready.
            </p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-12 gap-y-3 sm:grid-cols-4">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm font-semibold text-paper-mut transition-colors duration-150 hover:text-paper"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-line-dark pt-6 text-xs text-paper-mut sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} VivaVoce. A coaching tool, not an
            official examiner. Scores are guidance, not grades.
          </p>
          <a href={`mailto:${site.email}`} className="font-semibold hover:text-paper">
            {site.email}
          </a>
        </div>
      </div>
    </footer>
  );
}

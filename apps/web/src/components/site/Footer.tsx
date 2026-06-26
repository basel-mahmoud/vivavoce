import Link from 'next/link';
import { site } from '@/lib/site';
import { Logo } from './Logo';
import { Container } from '@/components/ui/Container';

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface/40">
      <Container className="py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-muted">
              A voice-first study partner. Rehearse out loud, get structured
              coaching, and walk in ready.
            </p>
            <p className="mt-4 text-xs text-faint">
              A coaching tool — not an official examiner. Scores are guidance, not
              grades.
            </p>
          </div>

          {Object.entries(site.footer).map(([group, links]) => (
            <div key={group}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-faint">
                {group}
              </h2>
              <ul className="mt-4 space-y-3">
                {links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted transition-colors hover:text-ink"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-xs text-faint sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} VivaVoce. All rights reserved.</p>
          <p>
            <a href={`mailto:${site.email}`} className="hover:text-ink">
              {site.email}
            </a>
          </p>
        </div>
      </Container>
    </footer>
  );
}

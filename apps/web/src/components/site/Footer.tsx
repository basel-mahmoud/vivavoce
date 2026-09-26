import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { site } from '@/lib/site';
import { Logo } from './Logo';
import { KineticWordmark } from './KineticWordmark';

const groups = [
  ['Product', [...site.footer.Product, { label: 'Android beta', href: '/download/apk' }]],
  ['Help', [{ label: 'FAQ', href: '/faq' }, ...site.footer.Company]],
  ['Legal', site.footer.Legal],
] as const;

export function Footer() {
  return (
    <footer className="mx-auto w-full max-w-[1360px] px-3 pb-3 sm:px-5 sm:pb-5">
      <div className="tile tile-ink overflow-hidden rounded-field">
        <div className="grid gap-12 p-7 sm:p-10 lg:grid-cols-[1.1fr_1.6fr] lg:p-12">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-5 text-[1.05rem] font-medium leading-relaxed text-paper-mut">
              A voice-first study partner. Rehearse out loud, get marked, walk in
              ready.
            </p>
            <a
              href={`mailto:${site.email}`}
              className="group mt-6 inline-flex items-center gap-1.5 font-bold text-paper"
            >
              {site.email}
              <ArrowUpRight
                size={16}
                aria-hidden
                className="text-verm transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </a>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3">
            {groups.map(([title, links]) => (
              <div key={title}>
                <p className="text-sm font-bold text-paper-mut">{title}</p>
                <ul className="mt-4 space-y-2.5">
                  {links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="link-quiet font-semibold text-paper"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="relative overflow-hidden px-2 pb-1 text-verm">
          <KineticWordmark className="font-sans text-[clamp(2.6rem,13.4vw,13rem)]" />
        </div>

        <div className="flex flex-col gap-2 border-t border-line-dark px-7 py-5 text-xs text-paper-mut sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-12">
          <p>
            © {new Date().getFullYear()} VivaVoce. A coaching tool, not an official
            examiner. Scores are guidance, not grades.
          </p>
          <p>Made for people who have to say it out loud.</p>
        </div>
      </div>
    </footer>
  );
}

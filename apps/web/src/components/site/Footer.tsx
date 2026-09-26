import Link from 'next/link';
import { ArrowUpRight, Smartphone } from 'lucide-react';
import { Portrait, type ExaminerAxis } from '@/components/ui/Portrait';
import { site } from '@/lib/site';
import { KineticWordmark } from './KineticWordmark';
import { PanelLedge } from './PanelLedge';

const groups = [
  ['Product', [...site.footer.Product, { label: 'Android beta', href: '/download/apk' }]],
  ['Help', [{ label: 'FAQ', href: '/faq' }, ...site.footer.Company]],
  ['Legal', site.footer.Legal],
] as const;

/** Each examiner signs the note in their own voice. */
const SIGNED: readonly { axis: ExaminerAxis; name: string; line: string }[] = [
  { axis: 'correctness', name: 'Correctness', line: 'Answer what was asked.' },
  { axis: 'clarity', name: 'Clarity', line: 'Plain words, please.' },
  { axis: 'structure', name: 'Structure', line: 'Claim first. Then the why.' },
  { axis: 'conciseness', name: 'Conciseness', line: 'Enough said.' },
  { axis: 'confidence', name: 'Confidence', line: 'Mean it.' },
];

/**
 * The footer is the bench. The panel peeks over its edge; on it lies a note
 * they have all signed, beside the links. It ends on a small wordmark and
 * the plain print: marks are guidance, and the app is still in beta.
 */
export function Footer() {
  return (
    <footer className="vv-foot">
      <div className="vv-foot-bench tile-ink">
        <div className="vv-foot-inner">
          <div className="vv-foot-notecol">
            <PanelLedge />
            <article className="vv-note" aria-labelledby="vv-note-title">
              <h2 id="vv-note-title" className="vv-note-title">
                A note from the panel
              </h2>
              <p className="vv-note-body">
                You read all the way down, so you know how we mark. Now say it out loud, before it counts. We will be
                listening.
              </p>
              <ul className="vv-note-sigs" aria-label="Signed by the panel">
                {SIGNED.map((s) => (
                  <li key={s.axis} className="vv-note-sig">
                    <Portrait axis={s.axis} size={30} decorative className="vv-note-face" />
                    <span className="vv-note-line">{s.line}</span>
                    <span className="vv-note-name">{s.name}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <nav aria-label="Footer" className="vv-foot-links">
            {groups.map(([title, links]) => (
              <div key={title}>
                <h2 className="vv-foot-head">{title}</h2>
                <ul className="mt-4 space-y-1">
                  {links.map((l) => (
                    <li key={l.href}>
                      {l.href === '/download/apk' ? (
                        // A redirect to the build, not a page: a plain link, never prefetched.
                        <a href={l.href} className="vv-foot-link group">
                          <Smartphone size={15} aria-hidden className="shrink-0" />
                          <span className="link-quiet">{l.label}</span>
                        </a>
                      ) : (
                        <Link href={l.href} className="vv-foot-link group">
                          <span className="link-quiet">{l.label}</span>
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="vv-foot-base">
          <div className="vv-foot-mark">
            <KineticWordmark />
          </div>
          <div className="vv-foot-print">
            <p>
              <strong>Scores are guidance, not grades.</strong> VivaVoce is a coaching tool, not an official examiner.
            </p>
            <p>Pre-launch: the app is in private beta, and spots open in small groups.</p>
            <p className="vv-foot-legal">
              <span>© {new Date().getFullYear()} VivaVoce</span>
              <a href={`mailto:${site.email}`} className="vv-foot-mail group">
                <span className="link-quiet">{site.email}</span>
                <ArrowUpRight size={14} aria-hidden className="shrink-0" />
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

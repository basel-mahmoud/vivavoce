import type { Metadata } from 'next';
import { ArrowUpRight } from 'lucide-react';
import { PageHero } from '@/components/site/PageHero';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Reach the VivaVoce team: support, security, and privacy.',
};

const channels = [
  ['Support', 'Questions, feedback, or trouble with the app.', site.email],
  ['Security', 'Report a vulnerability. We support coordinated disclosure.', 'security@vivavoce.app'],
  ['Privacy', 'Data export, deletion, or any privacy request.', 'privacy@vivavoce.app'],
] as const;

export default function ContactPage() {
  return (
    <>
      <PageHero
        title="We read *everything.*"
        intro="A small team that cares about getting this right. Pick the right inbox and you will hear back quickly."
      />
      <section aria-label="Inboxes" className="mx-auto w-full max-w-[1360px] px-4 pb-24 sm:px-5 sm:pb-32">
        <ul>
          {channels.map(([title, body, email]) => (
            <li key={title} className="border-t border-line">
              <a
                href={`mailto:${email}`}
                className="group grid gap-3 py-9 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_auto] md:items-center md:gap-10"
              >
                <span className="display text-[clamp(2rem,4vw,3.4rem)] transition-colors duration-200 group-hover:text-verm-text">
                  {title}
                </span>
                <span className="max-w-md text-lg leading-relaxed text-ink-mut">{body}</span>
                <span className="inline-flex items-center gap-2 text-lg font-bold">
                  {email}
                  <ArrowUpRight
                    size={20}
                    aria-hidden
                    className="text-verm transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

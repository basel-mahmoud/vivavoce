import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { HeroMark } from '@/components/site/HeroMark';
import { PageHero } from '@/components/site/PageHero';
import { pageMeta, site } from '@/lib/site';

export const metadata = pageMeta({
  title: 'Contact',
  description:
    'Reach the VivaVoce team: support, security, and privacy.',
  path: '/contact',
});

const channels = [
  { title: 'Support', body: 'Questions, feedback, or trouble with the app.', email: site.email, main: true },
  { title: 'Security', body: 'Report a vulnerability. We support coordinated disclosure.', email: 'security@vivavoce.app' },
  { title: 'Privacy', body: 'Data export, deletion, or any privacy request.', email: 'privacy@vivavoce.app' },
] as const;

export default function ContactPage() {
  return (
    <>
      <PageHero
        title={
          <>
            We read{' '}
            <HeroMark mark="underline">
              everything
            </HeroMark>
            .
          </>
        }
        intro="A small team that cares about getting this right. Pick the right inbox and you will hear back quickly."
      />
      <section aria-label="Inboxes" className="mx-auto w-full max-w-[1360px] px-4 pb-24 sm:px-5 sm:pb-32">
        <ul className="vv-inboxes">
          {channels.map((c) => (
            <li key={c.title} data-main={'main' in c ? '' : undefined}>
              <a href={`mailto:${c.email}`} className="vv-inbox group">
                <span className="vv-inbox-title">{c.title}</span>
                <span className="vv-inbox-body">{c.body}</span>
                <span className="vv-inbox-mail">
                  <span className="link-quiet">{c.email}</span>
                  <ArrowUpRight size={18} aria-hidden className="shrink-0" />
                </span>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-[0.95rem] font-bold">
          <Link href="/faq" className="group inline-flex min-h-11 items-center gap-1.5">
            <span className="link-quiet">Questions first? Read the FAQ</span>
            <ArrowRight size={15} aria-hidden className="text-ink-blue" />
          </Link>
        </p>
      </section>
    </>
  );
}

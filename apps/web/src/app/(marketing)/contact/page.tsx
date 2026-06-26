import type { Metadata } from 'next';
import { Mail, ShieldAlert, LifeBuoy } from 'lucide-react';
import { PageHero } from '@/components/site/PageHero';
import { Container } from '@/components/ui/Container';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with the VivaVoce team — support, privacy, and security.',
};

const channels = [
  {
    icon: LifeBuoy,
    title: 'Support',
    body: 'Questions, feedback, or trouble with the app.',
    email: site.email,
  },
  {
    icon: ShieldAlert,
    title: 'Security',
    body: 'Report a vulnerability. We support coordinated disclosure.',
    email: 'security@vivavoce.app',
  },
  {
    icon: Mail,
    title: 'Privacy',
    body: 'Data export, deletion, or any privacy request.',
    email: 'privacy@vivavoce.app',
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        kicker="Contact"
        title="We read everything"
        intro="VivaVoce is built by a small team that cares about getting this right. Reach the right inbox below."
      />
      <section className="py-16">
        <Container className="grid max-w-4xl gap-6 sm:grid-cols-3">
          {channels.map((c) => (
            <div key={c.title} className="rounded-2xl border border-line bg-surface p-7">
              <span className="grid h-11 w-11 place-items-center rounded-xl border border-line text-ember">
                <c.icon size={20} />
              </span>
              <h2 className="mt-5 text-lg font-semibold text-ink">{c.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{c.body}</p>
              <a
                href={`mailto:${c.email}`}
                className="mt-4 inline-block text-sm font-medium text-ember-deep underline-offset-2 hover:underline dark:text-ember"
              >
                {c.email}
              </a>
            </div>
          ))}
        </Container>
      </section>
    </>
  );
}

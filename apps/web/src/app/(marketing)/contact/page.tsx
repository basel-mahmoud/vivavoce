import type { Metadata } from 'next';
import { PageHero } from '@/components/site/PageHero';
import { Reveal } from '@/components/ui/Reveal';
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
        title="We read everything."
        intro="A small team that cares about getting this right. Pick the right inbox and you will hear back quickly."
      />
      <section className="bg-canvas text-ink">
        <div className="mx-auto w-full max-w-[1400px] px-5 pb-24 sm:px-8">
          <div className="flex max-w-2xl flex-col">
            {channels.map(([title, body, email], i) => (
              <Reveal key={title} delay={Math.min(i * 0.05, 0.15)}>
                <div className="border-t border-line py-8 last:border-b">
                  <h2 className="text-2xl font-black">{title}</h2>
                  <p className="mt-2 leading-relaxed text-ink-mut">{body}</p>
                  <a
                    href={`mailto:${email}`}
                    className="mt-3 inline-block font-bold text-verm underline decoration-2 underline-offset-4 hover:text-ink"
                  >
                    {email}
                  </a>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

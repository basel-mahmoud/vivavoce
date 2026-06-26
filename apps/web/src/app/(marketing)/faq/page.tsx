import type { Metadata } from 'next';
import { Plus } from 'lucide-react';
import { PageHero } from '@/components/site/PageHero';
import { Container } from '@/components/ui/Container';
import { FinalCTA } from '@/components/marketing/FinalCTA';
import { faqs } from '@/lib/content';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Common questions about VivaVoce — what happens to your voice data, how scoring works, offline behaviour, and beta access.',
};

export default function FaqPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero
        kicker="FAQ"
        title="Questions, answered"
        intro="The things people ask before they trust an app with their voice. If yours isn’t here, write to us."
      />
      <section className="py-16">
        <Container className="max-w-3xl">
          <ul className="divide-y divide-line border-y border-line">
            {faqs.map((f) => (
              <li key={f.q}>
                <details className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium text-ink [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line text-muted transition-transform duration-300 group-open:rotate-45">
                      <Plus size={16} />
                    </span>
                  </summary>
                  <p className="mt-3 max-w-2xl leading-relaxed text-muted">{f.a}</p>
                </details>
              </li>
            ))}
          </ul>
        </Container>
      </section>
      <FinalCTA />
    </>
  );
}

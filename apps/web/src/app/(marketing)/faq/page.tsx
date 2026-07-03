import type { Metadata } from 'next';
import { Plus } from 'lucide-react';
import { PageHero } from '@/components/site/PageHero';
import { WaitlistSection } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Common questions about VivaVoce: what happens to your voice data, how marking works, offline behaviour, and beta access.',
};

const faqs = [
  [
    'Is this an official exam grader?',
    'No, and we are deliberate about that. VivaVoce is a coaching tool. Its marks are structured feedback to help you improve, never official grades or a prediction of your real result.',
  ],
  [
    'What happens to my voice recordings?',
    'Your audio is processed to produce a transcript and feedback, then handled under a strict retention policy. You can review, export, or delete your data at any time, and you choose at sign-up whether recordings are retained at all.',
  ],
  [
    'Does it work if my internet is flaky?',
    'Yes. Answers record locally and queue for upload, so a dropped connection on the train does not lose your practice. If the AI coach is briefly unavailable you still get an instant review, and full marking lands as soon as it is back.',
  ],
  [
    'Which subjects are supported?',
    'Any subject you can speak about. Use the starter decks, import your own question sets, or let VivaVoce generate questions for your topic and difficulty.',
  ],
  [
    'How is this different from recording myself?',
    'Recording shows you what you said. VivaVoce tells you what to change: a five-axis breakdown, a stronger answer to steal from, and a follow-up aimed at your weakest point, every time.',
  ],
  [
    'When can I use it?',
    'The app is in private beta. Join the early-access list and we will bring you in as spots open, students with upcoming exams first.',
  ],
] as const;

export default function FaqPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero
        title="Questions, answered."
        intro="The things people ask before they trust an app with their voice. If yours is missing, write to us."
      />
      <section className="bg-canvas text-ink">
        <div className="mx-auto w-full max-w-[1360px] px-4 pt-4 pb-20 sm:px-6">
          <ul className="max-w-3xl">
            {faqs.map(([q, a]) => (
              <li key={q} className="border-t border-line last:border-b">
                <details className="group py-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-xl font-black [&::-webkit-details-marker]:hidden">
                    {q}
                    <span className="grid h-9 w-9 shrink-0 place-items-center bg-card-2 text-verm transition-transform duration-200 group-open:rotate-45">
                      <Plus size={18} strokeWidth={3} />
                    </span>
                  </summary>
                  <p className="mt-4 max-w-2xl leading-relaxed text-ink-mut">{a}</p>
                </details>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <WaitlistSection />
    </>
  );
}

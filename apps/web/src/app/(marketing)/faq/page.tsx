import type { Metadata } from 'next';
import { Plus } from 'lucide-react';
import { PageHero } from '@/components/site/PageHero';
import Link from 'next/link';
import { Close } from '@/components/home/Closing';

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
        title="Questions, *answered.*"
        intro="The things people ask before they trust an app with their voice. If yours is missing, write to us."
      />
      <section aria-label="Frequently asked questions" className="mx-auto w-full max-w-[1360px] px-4 pb-24 sm:px-5 sm:pb-32">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-xl font-black leading-snug">Still unsure?</p>
            <p className="mt-2 max-w-xs leading-relaxed text-ink-mut">
              Try the engine on the home page, no account needed, or ask us
              directly.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/#live" className="btn btn-ink h-11 px-5 text-sm">
                Try the engine
              </Link>
              <Link href="/contact" className="btn btn-line h-11 px-5 text-sm">
                Contact us
              </Link>
            </div>
          </div>
          <ul className="faq">
            {faqs.map(([q, a]) => (
              <li key={q} className="border-t border-line">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-7 text-[clamp(1.25rem,2vw,1.6rem)] font-black leading-snug transition-colors duration-150 hover:text-verm-text [&::-webkit-details-marker]:hidden">
                    {q}
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-card-2 text-ink transition-[transform,background-color,color] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-open:rotate-45 group-open:bg-verm group-open:text-coal">
                      <Plus size={20} strokeWidth={2.75} aria-hidden />
                    </span>
                  </summary>
                  <p className="max-w-2xl pb-8 pr-16 text-[1.05rem] leading-relaxed text-ink-mut">{a}</p>
                </details>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <Close />
    </>
  );
}

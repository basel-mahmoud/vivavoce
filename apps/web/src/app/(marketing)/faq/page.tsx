import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/site/PageHero';
import { Faq, type FaqEntry } from '@/components/site/Faq';
import { PenTick } from '@/components/site/PenTick';
import { Close } from '@/components/home/Closing';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Common questions about VivaVoce: what happens to your voice data, how marking works, offline behaviour, and beta access.',
};

const faqs: readonly FaqEntry[] = [
  {
    q: 'Is this an official exam grader?',
    a: 'No, and we are deliberate about that. VivaVoce is a coaching tool. Its marks are structured feedback to help you improve, never official grades or a prediction of your real result.',
    key: 'never official grades',
  },
  {
    q: 'What happens to my voice recordings?',
    a: 'Your audio is processed to produce a transcript and feedback, then handled under a strict retention policy. You can review, export, or delete your data at any time, and you choose at sign-up whether recordings are retained at all.',
    key: 'you choose at sign-up whether recordings are retained at all',
  },
  {
    q: 'Does it work if my internet is flaky?',
    a: 'Yes. Answers record locally and queue for upload, so a dropped connection on the train does not lose your practice. If the AI coach is briefly unavailable you still get an instant review, and full marking lands as soon as it is back.',
    key: 'does not lose your practice',
  },
  {
    q: 'Which subjects are supported?',
    a: 'Any subject you can speak about. Use the starter decks, import your own question sets, or let VivaVoce generate questions for your topic and difficulty.',
    key: 'Any subject you can speak about.',
  },
  {
    q: 'How is this different from recording myself?',
    a: 'Recording shows you what you said. VivaVoce tells you what to change: a five-axis breakdown, a stronger answer to steal from, and a follow-up aimed at your weakest point, every time.',
    key: 'VivaVoce tells you what to change',
  },
  {
    q: 'When can I use it?',
    a: 'The app is in private beta. Join the early-access list and we will bring you in as spots open, students with upcoming exams first.',
    key: 'students with upcoming exams first',
  },
];

export default function FaqPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero
        title={
          <>
            Questions, answered.
            <PenTick delay={520} className="vv-hero-tick" />
          </>
        }
        intro="The things people ask before they trust an app with their voice. If yours is missing, write to us."
      />
      <section aria-label="Frequently asked questions" className="mx-auto w-full max-w-[1360px] px-4 pb-24 sm:px-5 sm:pb-32">
        <div className="vv-faq-grid">
          <aside className="vv-faq-aside" aria-labelledby="faq-unsure">
            <h2 id="faq-unsure" className="text-xl font-black leading-snug">
              Still unsure?
            </h2>
            <p className="mt-2 max-w-xs leading-relaxed text-ink-mut">
              Answer a question on the home page, no account needed, or ask us directly.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/#live" className="btn btn-primary btn-sm">
                Answer a question
              </Link>
              <Link href="/contact" className="btn btn-secondary btn-sm">
                Contact us
              </Link>
            </div>
          </aside>
          <Faq items={faqs} />
        </div>
      </section>
      <Close />
    </>
  );
}

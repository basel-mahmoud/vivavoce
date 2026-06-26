import type { Metadata } from 'next';
import { Check } from 'lucide-react';
import { PageHero } from '@/components/site/PageHero';
import { Container } from '@/components/ui/Container';
import { WaitlistForm } from '@/components/site/WaitlistForm';

export const metadata: Metadata = {
  title: 'Early access',
  description:
    'Join the VivaVoce early-access list. Students with upcoming exams first.',
};

const perks = [
  'First access as we open spots — exam dates jump the queue',
  'Founding-user pricing, locked in for good',
  'A direct line to shape what we build next',
];

export default function WaitlistPage() {
  return (
    <>
      <PageHero
        kicker="Early access"
        title="Get in before the exam does"
        intro="VivaVoce is in private beta. Leave your email and we’ll bring you in as we open spots — students with exams on the calendar first."
      />
      <section className="py-16">
        <Container className="max-w-2xl">
          <div className="rounded-3xl border border-line bg-surface p-8 sm:p-10">
            <WaitlistForm />
            <ul className="mt-8 space-y-3 border-t border-line pt-6">
              {perks.map((perk) => (
                <li key={perk} className="flex items-start gap-3 text-sm text-muted">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sage/15 text-sage">
                    <Check size={13} />
                  </span>
                  {perk}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>
    </>
  );
}

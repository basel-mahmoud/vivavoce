import type { Metadata } from 'next';
import { PageHero } from '@/components/site/PageHero';
import { WaitlistForm } from '@/components/site/WaitlistForm';
import { Reveal } from '@/components/ui/Reveal';

export const metadata: Metadata = {
  title: 'Early access',
  description:
    'Join the VivaVoce early-access list. Students with upcoming exams first.',
};

const perks = [
  'First access as spots open. Exam dates jump the queue.',
  'Founding-user pricing, locked in for good.',
  'A direct line to shape what gets built next.',
] as const;

export default function WaitlistPage() {
  return (
    <>
      <PageHero
        title="Get in before the exam does."
        intro="VivaVoce is in private beta. Leave your email and we will bring you in as spots open."
      />
      <section className="bg-canvas text-ink">
        <div className="mx-auto grid w-full max-w-[1360px] gap-10 px-4 pt-4 pb-20 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <Reveal>
            <ul className="flex flex-col gap-6">
              {perks.map((perk) => (
                <li key={perk} className="flex items-start gap-4">
                  <span className="mt-2 h-1.5 w-8 shrink-0 bg-verm" />
                  <p className="text-lg font-bold leading-snug">{perk}</p>
                </li>
              ))}
            </ul>
            <a
              href="/download/apk"
              className="pressable mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 font-bold text-paper transition-colors duration-150 hover:bg-[#2E2B27]"
            >
              Download the Android beta
            </a>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="tile p-7 sm:p-10">
              <WaitlistForm />
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

import { ShieldCheck, WifiOff, Trash2 } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from './SectionHeading';

const points = [
  {
    icon: ShieldCheck,
    title: 'Your voice is yours',
    body: 'You decide at sign-up whether recordings are kept. Audio and transcripts are the most protected data we hold, isolated per account and never used to train anyone’s model.',
  },
  {
    icon: WifiOff,
    title: 'Calm when the network isn’t',
    body: 'Answers record locally and queue for upload. If the AI coach is briefly down, you still get an instant review — full coaching lands the moment it’s back. Nothing is lost.',
  },
  {
    icon: Trash2,
    title: 'Leave whenever',
    body: 'Export everything or delete your account in a couple of taps. Deletion is honoured on a clear schedule, end to end — no support ticket required.',
  },
];

export function Trust() {
  return (
    <section className="border-t border-line py-24">
      <Container>
        <SectionHeading
          kicker="Built to be trusted"
          title="Serious about the thing you’re trusting us with"
          intro="Practising out loud means handing over your voice. We treat that with the gravity it deserves."
        />

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {points.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.06}>
              <div className="flex h-full flex-col">
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface text-ember">
                  <p.icon size={20} />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-ink">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

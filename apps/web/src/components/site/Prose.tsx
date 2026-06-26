import { Container } from '@/components/ui/Container';

/** Long-form legal/editorial content with a readable measure and warm rhythm. */
export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <Container className="py-16">
      <div className="prose-vv mx-auto max-w-2xl">{children}</div>
    </Container>
  );
}

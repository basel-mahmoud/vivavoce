import type { Metadata } from 'next';
import { Nav } from '@/components/site/Nav';
import { MotionProvider } from '@/components/site/MotionProvider';
import { NotOnThePaper } from '@/components/site/NotOnThePaper';

export const metadata: Metadata = {
  title: 'Not on the paper',
  robots: { index: false },
};

export default function NotFound() {
  return (
    <MotionProvider>
      <Nav />
      <main id="main" tabIndex={-1} className="outline-none">
        <NotOnThePaper />
      </main>
    </MotionProvider>
  );
}

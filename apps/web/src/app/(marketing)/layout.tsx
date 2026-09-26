import { Nav } from '@/components/site/Nav';
import { Footer } from '@/components/site/Footer';
import { MotionProvider } from '@/components/site/MotionProvider';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <MotionProvider>
      <Nav />
      <main id="main">{children}</main>
      <Footer />
    </MotionProvider>
  );
}

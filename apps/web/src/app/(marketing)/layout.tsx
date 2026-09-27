import { Nav } from '@/components/site/Nav';
import { Footer } from '@/components/site/Footer';
import { MotionProvider } from '@/components/site/MotionProvider';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <MotionProvider>
      <Nav />
      {/* Focusable, so "Skip to content" really moves focus past the nav. */}
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <Footer />
    </MotionProvider>
  );
}

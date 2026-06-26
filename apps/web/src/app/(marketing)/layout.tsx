import { Nav } from '@/components/site/Nav';
import { Footer } from '@/components/site/Footer';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}

import { Hero } from '@/components/marketing/Hero';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { RubricSection } from '@/components/marketing/RubricSection';
import { Modes } from '@/components/marketing/Modes';
import { Personas } from '@/components/marketing/Personas';
import { Trust } from '@/components/marketing/Trust';
import { FinalCTA } from '@/components/marketing/FinalCTA';
import { site } from '@/lib/site';

export default function HomePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: site.name,
    applicationCategory: 'EducationApplication',
    operatingSystem: 'Android, iOS',
    description: site.description,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <HowItWorks />
      <RubricSection />
      <Modes />
      <Personas />
      <Trust />
      <FinalCTA />
    </>
  );
}

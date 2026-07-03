import { Board } from '@/components/board/Board';
import { StepsStrip } from '@/components/marketing/sections';
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
      <div className="pt-2">
        <Board />
      </div>
      <StepsStrip />
    </>
  );
}

import { RoomStory } from '@/components/room/RoomStory';
import { LiveEngine } from '@/components/engine/LiveEngine';
import { Modes } from '@/components/home/Modes';
import { Loop } from '@/components/home/Loop';
import { Subjects } from '@/components/home/Subjects';
import { Rooms } from '@/components/home/Rooms';
import { Close, Privacy } from '@/components/home/Closing';
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
      <RoomStory />
      <LiveEngine />
      <Loop />
      <Modes />
      <Subjects />
      <Rooms />
      <Privacy />
      <Close />
    </>
  );
}

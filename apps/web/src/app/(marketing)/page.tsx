import { RoomStory } from '@/components/room/RoomStory';
import { LiveEngine } from '@/components/engine/LiveEngine';
import { Modes } from '@/components/home/Modes';
import { Loop } from '@/components/home/Loop';
import { Subjects } from '@/components/home/Subjects';
import { Rooms } from '@/components/home/Rooms';
import { Close, Privacy } from '@/components/home/Closing';
import { Deferred } from '@/components/home/Deferred';
import { EnginePlaceholder } from '@/components/home/EnginePlaceholder';
import { SectionBoundary } from '@/components/home/SectionBoundary';
import { StaticHero } from '@/components/home/StaticHero';
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
      {/* If the live room fails (model, code or WebGL), its still takes its place. */}
      <SectionBoundary name="room" fallback={<StaticHero />}>
        <RoomStory />
      </SectionBoundary>
      <Deferred height="820px">
        <SectionBoundary name="live engine" fallback={<EnginePlaceholder />}>
          <LiveEngine />
        </SectionBoundary>
      </Deferred>
      <Deferred height="700px">
        <Loop />
      </Deferred>
      <Deferred height="1000px">
        <Modes />
      </Deferred>
      <Deferred height="1000px">
        <Subjects />
      </Deferred>
      <Deferred height="1000px">
        <Rooms />
      </Deferred>
      <Deferred height="900px">
        <Privacy />
      </Deferred>
      <Deferred height="1000px">
        <Close />
      </Deferred>
    </>
  );
}

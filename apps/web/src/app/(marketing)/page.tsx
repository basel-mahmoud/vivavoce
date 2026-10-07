import { RoomStory } from '@/components/room/RoomStory';
import { LiveEngine, Modes, Rooms, Subjects, WarmSections } from '@/components/home/lazy';
import { Close, Privacy } from '@/components/home/Closing';
import { Deferred } from '@/components/home/Deferred';
import { EnginePlaceholder } from '@/components/home/EnginePlaceholder';
import { SectionBoundary } from '@/components/home/SectionBoundary';
import { StaticHero } from '@/components/home/StaticHero';
import { pageMeta, site } from '@/lib/site';
// The live engine's code loads after the first screen; its styles must not wait for it.
import '@/components/engine/engine.module.css';

export const metadata = pageMeta({ description: site.description, path: '/' });

export default function HomePage() {
  // Only what is true today: an Android beta, no published price.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: site.name,
    applicationCategory: 'EducationApplication',
    operatingSystem: 'Android',
    description: site.description,
    url: site.url,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* If the live room fails (model, code or WebGL), its still takes its place. */}
      <SectionBoundary name="room" fallback={<StaticHero />}>
        <RoomStory />
      </SectionBoundary>
      <Deferred height="820px">
        <SectionBoundary name="live engine" fallback={<EnginePlaceholder />}>
          <LiveEngine />
        </SectionBoundary>
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
      <WarmSections names={['engine', 'modes', 'subjects', 'rooms']} routes={[...site.nav.map((n) => n.href), '/waitlist']} />
    </>
  );
}

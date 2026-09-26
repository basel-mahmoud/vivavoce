import Link from 'next/link';
import { Mic } from 'lucide-react';
import { RoomPoster } from '@/components/room/RoomPoster';
import { HeroMark } from '@/components/site/HeroMark';

/**
 * The home page's first screen without the live room: the room's own still
 * (the rendered poster), the promise, and the two keys. Shown only if the
 * room itself fails (a model or a code chunk that does not arrive, a WebGL
 * context the device refuses), so the page never goes blank.
 */
export function StaticHero() {
  return (
    <section aria-labelledby="hero-title" className="vv-still-hero">
      <RoomPoster hidden={false} />
      <div aria-hidden className="vv-still-hero-scrim" />
      <div className="vv-still-hero-copy">
        <h1 id="hero-title" className="display vv-still-hero-title">
          <span className="block">Say it out loud</span>
          <span className="block">
            <HeroMark delay={300}>before</HeroMark> it counts.
          </span>
        </h1>
        <p className="vv-still-hero-line">Real exam questions, answered out loud and marked on five axes in seconds.</p>
        <div className="vv-still-hero-keys">
          <a href="#live" className="btn btn-primary btn-lg">
            <Mic size={18} aria-hidden />
            Answer a question
          </a>
          <Link href="/waitlist" className="btn btn-secondary btn-lg">
            Get early access
          </Link>
        </div>
      </div>
      <p className="vv-still-hero-note">Example round. Scores are guidance, not grades.</p>
    </section>
  );
}

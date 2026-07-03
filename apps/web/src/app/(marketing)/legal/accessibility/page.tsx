import type { Metadata } from 'next';
import { PageHero } from '@/components/site/PageHero';
import { Prose } from '@/components/site/Prose';

export const metadata: Metadata = {
  title: 'Accessibility',
  description: 'VivaVoce’s commitment to accessible design across web and mobile.',
};

export default function AccessibilityPage() {
  return (
    <>
      <PageHero

        title="Built to be used by everyone"
        intro="Accessibility is a first-draft requirement here, not a retrofit. This is where we are and where we’re going."
      />
      <Prose>
        <h2>Our target</h2>
        <p>
          We aim to meet <strong>WCAG 2.2 AA</strong> across the marketing site and
          the app. That means sufficient colour contrast, full keyboard operability
          on the web, clear focus indicators, meaningful labels for screen readers,
          and respect for reduced-motion preferences.
        </p>

        <h2>What we’ve done</h2>
        <ul>
          <li>A single, consistent focus ring on every interactive element.</li>
          <li>
            Text and UI colours tuned for AA contrast in both light and dark
            themes; the recording state uses a dedicated colour so it’s never
            confused with the primary action.
          </li>
          <li>
            All motion honours <strong>prefers-reduced-motion</strong>: including
            the looping voice waveform, which stops animating.
          </li>
          <li>A skip-to-content link and a logical heading hierarchy on every page.</li>
          <li>
            Tap targets of at least 44px on mobile, with haptic and visual feedback
            for recording controls.
          </li>
        </ul>

        <h2>Voice-first, with alternatives</h2>
        <p>
          Because the product centres on speaking, we’re committed to alternatives:
          you can type an answer when speaking isn’t possible, transcripts are
          always shown as text, and feedback is available in writing as well as
          spoken aloud.
        </p>

        <h2>Tell us where we fall short</h2>
        <p>
          If you hit a barrier, we want to fix it. Email{' '}
          <a href="mailto:hello@vivavoce.app">hello@vivavoce.app</a> with the page
          and what happened, and we’ll respond quickly.
        </p>
      </Prose>
    </>
  );
}

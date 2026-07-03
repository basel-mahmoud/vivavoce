import type { Metadata } from 'next';
import { PageHero } from '@/components/site/PageHero';
import { Prose } from '@/components/site/Prose';

export const metadata: Metadata = {
  title: 'Privacy',
  description:
    'How VivaVoce handles your data: especially your voice recordings and transcripts.',
};

export default function PrivacyPage() {
  return (
    <>
      <PageHero

        title="Your voice, handled with care"
        intro="Plain-language summary first; the detail follows. Last updated 26 June 2026."
      />
      <Prose>
        <p>
          VivaVoce is a voice-first study tool, so we think hard about voice data.
          This page explains what we collect, why, how long we keep it, and the
          controls you have. It is written to be read: not to be survived.
        </p>

        <h2>The short version</h2>
        <ul>
          <li>
            <strong>You choose</strong> at sign-up whether your audio recordings
            are retained after they’re transcribed.
          </li>
          <li>
            <strong>We don’t sell your data</strong>, and we don’t use your voice
            or answers to train models for anyone else.
          </li>
          <li>
            <strong>You’re in control</strong>: export everything or delete your
            account at any time, and deletion is honoured end to end.
          </li>
        </ul>

        <h2>What we collect</h2>
        <p>
          <strong>Account data</strong>: your email and basic profile, handled
          by our authentication provider (Clerk). <strong>Practice data</strong>:
          the questions you answer, transcripts of your spoken answers, the
          feedback and scores generated for them, and your progress over time.
          <strong> Voice recordings</strong>: captured to produce a transcript
          and delivery analysis; retained only if you opt in.{' '}
          <strong>Diagnostic data</strong>: coarse, privacy-preserving telemetry
          (e.g. whether a session completed) to keep the product reliable. We
          store a salted hash of your IP for abuse prevention, never the raw IP.
        </p>

        <h2>Why we process it</h2>
        <p>
          To provide the core service (ask questions, evaluate answers, track
          progress), to keep the service secure and reliable, and to improve the
          product in aggregate. Voice and transcript data is processed by our AI
          provider (Google Gemini) solely to generate your feedback; we send the
          minimum necessary and never attach unnecessary identifiers.
        </p>

        <h2>Retention</h2>
        <p>
          Transcripts and feedback are kept while your account is active so you
          can review progress. Audio recordings are deleted shortly after
          transcription unless you’ve opted into retention. When you delete your
          account, your practice data and any retained audio are removed on a
          defined schedule; append-only security audit records may be retained in
          minimised form to meet legal and integrity obligations.
        </p>

        <h2>Your rights</h2>
        <p>
          You can access and export your data, correct your profile, withdraw
          consent for audio retention, and request deletion: all from within the
          app, or by emailing{' '}
          <a href="mailto:privacy@vivavoce.app">privacy@vivavoce.app</a>. Depending
          on where you live, you may have additional rights under laws such as the
          GDPR or CCPA; we honour them regardless of location.
        </p>

        <h2>A note on sensitivity</h2>
        <p>
          Your voice is personal. We treat recordings and transcripts as our most
          sensitive data class: isolated per account, encrypted in transit and at
          rest, accessible to the smallest possible set of systems, and never
          shared across accounts or organisations.
        </p>

        <h2>Changes & contact</h2>
        <p>
          We’ll post material changes here and, where appropriate, notify you in
          the app. Questions? Email{' '}
          <a href="mailto:privacy@vivavoce.app">privacy@vivavoce.app</a>.
        </p>
        <p>
          This document is provided for transparency and does not constitute legal
          advice.
        </p>
      </Prose>
    </>
  );
}

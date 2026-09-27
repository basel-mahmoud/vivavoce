import type { NextQuestion } from './board';

/** Example next questions for the departures board, one per subject. */
export const SUBJECTS: readonly NextQuestion[] = [
  { subject: 'Cardiology', question: 'Why is the left ventricle wall thicker?' },
  { subject: 'Contract law', question: 'Offer, or invitation to treat?' },
  { subject: 'Thermodynamics', question: 'Explain entropy without saying disorder.' },
  { subject: 'Interview', question: 'A time you disagreed with your manager.' },
  { subject: 'Pharmacology', question: 'Why avoid NSAIDs in renal impairment?' },
  { subject: 'Economics', question: 'What does a rate rise do to prices?' },
  { subject: 'Anatomy', question: 'Trace the blood supply of the stomach.' },
  { subject: 'History', question: 'Was Versailles doomed from the start?' },
  { subject: 'Engineering', question: 'Why do bridges need expansion joints?' },
  { subject: 'Spanish oral', question: 'Describe your weekend, in Spanish.' },
  { subject: 'Criminal law', question: 'When does self-defence stop working?' },
  { subject: 'Psychology', question: 'Explain the replication crisis.' },
  { subject: 'Presentation', question: 'Pitch your project in one minute.' },
  { subject: 'Computing', question: 'What happens when you type a URL?' },
];

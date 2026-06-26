/** Practice content for the app — modes, starter decks, rubric. Mirrors the
 *  backend domain so screens read consistently with the marketing site. */

export type ModeKey =
  | 'quick'
  | 'mock_viva'
  | 'interview'
  | 'flash_recall'
  | 'explain'
  | 'rapid_fire';

export interface Mode {
  key: ModeKey;
  name: string;
  line: string;
}

export const modes: Mode[] = [
  { key: 'mock_viva', name: 'Mock Viva', line: 'A chained examiner that targets your weakest axis.' },
  { key: 'interview', name: 'Interview', line: 'Behavioural & role questions, STAR-scored.' },
  { key: 'quick', name: 'Quick Question', line: 'One question, instant feedback. The warm-up.' },
  { key: 'flash_recall', name: 'Flash Recall', line: 'Rapid recall, spaced by your weak spots.' },
  { key: 'explain', name: 'Explain Like a Teacher', line: 'Scored on clarity and pedagogy.' },
  { key: 'rapid_fire', name: 'Timed Rapid Fire', line: 'A countdown per question. Stay composed.' },
];

export const rubricAxes = [
  { key: 'correctness', label: 'Correctness' },
  { key: 'clarity', label: 'Clarity' },
  { key: 'structure', label: 'Structure' },
  { key: 'conciseness', label: 'Conciseness' },
  { key: 'confidence', label: 'Confidence' },
] as const;

export interface Deck {
  id: string;
  title: string;
  subject: string;
  difficulty: string;
  questions: string[];
}

export const starterDecks: Deck[] = [
  {
    id: 'deck-cardio',
    title: 'Cardiology Viva Core',
    subject: 'Medicine',
    difficulty: 'advanced',
    questions: [
      'Walk me through your approach to a patient presenting with acute chest pain.',
      'Explain the pathophysiology of heart failure with reduced ejection fraction.',
      'How would you interpret an ECG showing ST elevation in leads II, III, and aVF?',
    ],
  },
  {
    id: 'deck-interview',
    title: 'Behavioural & System Design',
    subject: 'Software Interviews',
    difficulty: 'intermediate',
    questions: [
      'Tell me about a time you disagreed with a teammate. How did you resolve it?',
      'Design a URL shortener. Walk me through your data model and scaling plan.',
      'How do you decide when to pay down technical debt versus shipping features?',
    ],
  },
  {
    id: 'deck-speaking',
    title: 'Explain It Simply',
    subject: 'Public Speaking',
    difficulty: 'intro',
    questions: [
      'Explain how a recommendation algorithm works to a non-technical audience.',
      'In one minute, make the case for why your project deserves funding.',
      'Summarise a complex topic you know well as if teaching a curious teenager.',
    ],
  },
];

export function modeName(key: string): string {
  return modes.find((m) => m.key === key)?.name ?? 'Practice';
}

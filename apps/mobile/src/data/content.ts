/**
 * VivaVoce content library. The app's practice material, modes, coaching tips,
 * and achievements live here so screens read consistently and the catalogue can
 * grow without touching UI. Deck shape stays backward-compatible (id/title/
 * subject/difficulty/questions) with the session engine.
 */

/* ── Modes ────────────────────────────────────────────────────────────────── */

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
  detail: string;
  icon: 'mic' | 'layers' | 'zap' | 'repeat' | 'graduation' | 'timer';
  minutesPerQ: number;
}

export const modes: Mode[] = [
  {
    key: 'mock_viva',
    name: 'Mock Viva',
    line: 'A chained examiner that targets your weakest axis.',
    detail:
      'The closest thing to the real room. Each follow-up digs into the exact place your last answer wobbled, so you rehearse the pressure, not just the facts.',
    icon: 'layers',
    minutesPerQ: 2,
  },
  {
    key: 'interview',
    name: 'Interview',
    line: 'Behavioural and role questions, STAR-scored.',
    detail:
      'Rehearse "tell me about a time…" and role questions until your stories land in thirty seconds with a clear situation, action, and result.',
    icon: 'mic',
    minutesPerQ: 2,
  },
  {
    key: 'quick',
    name: 'Quick Question',
    line: 'One question, instant marks. The warm-up.',
    detail:
      'Two minutes between lectures. Pull a card, answer out loud, see where you stand before the day starts.',
    icon: 'zap',
    minutesPerQ: 1,
  },
  {
    key: 'flash_recall',
    name: 'Flash Recall',
    line: 'Rapid recall, spaced by your weak spots.',
    detail:
      'Definitions, mechanisms, dates — surfaced on a spaced schedule that leans into what you keep getting wrong.',
    icon: 'repeat',
    minutesPerQ: 1,
  },
  {
    key: 'explain',
    name: 'Explain Like a Teacher',
    line: 'Scored on clarity and pedagogy, not just being right.',
    detail:
      'If you can teach it simply, you own it. Practice turning what you know into something a beginner could follow.',
    icon: 'graduation',
    minutesPerQ: 2,
  },
  {
    key: 'rapid_fire',
    name: 'Timed Rapid Fire',
    line: 'A countdown per question. Stay composed.',
    detail:
      'The clock is the point. Learn to start cleanly, stay concise, and finish before the buzzer without rushing.',
    icon: 'timer',
    minutesPerQ: 1,
  },
];

export function modeByKey(key: string): Mode {
  return modes.find((m) => m.key === key) ?? modes[0]!;
}
export function modeName(key: string): string {
  return modeByKey(key).name;
}

/* ── Rubric ───────────────────────────────────────────────────────────────── */

export const rubricAxes = [
  { key: 'correctness', label: 'Correctness', blurb: 'Did you answer the question, accurately?' },
  { key: 'clarity', label: 'Clarity', blurb: 'Could a peer follow your reasoning?' },
  { key: 'structure', label: 'Structure', blurb: 'Signposting, order, a clean landing.' },
  { key: 'conciseness', label: 'Conciseness', blurb: 'Signal over filler.' },
  { key: 'confidence', label: 'Confidence', blurb: 'Decisive, steady delivery.' },
] as const;

/* ── Subjects ─────────────────────────────────────────────────────────────── */

export type Tint = 'verm' | 'cobalt' | 'ink' | 'green' | 'gold';

export interface Subject {
  key: string;
  name: string;
  blurb: string;
  tint: Tint;
}

export const subjects: Subject[] = [
  { key: 'medicine', name: 'Medicine', blurb: 'Vivas, OSCEs, and clinical reasoning.', tint: 'verm' },
  { key: 'cs-interview', name: 'Software Interviews', blurb: 'Behavioural and system design.', tint: 'cobalt' },
  { key: 'law', name: 'Law', blurb: 'Moots, orals, and case analysis.', tint: 'ink' },
  { key: 'engineering', name: 'Engineering', blurb: 'Design defence and fundamentals.', tint: 'green' },
  { key: 'business', name: 'Business & MBA', blurb: 'Cases, fit, and pitching.', tint: 'gold' },
  { key: 'science', name: 'Science', blurb: 'Thesis defence and concepts.', tint: 'cobalt' },
  { key: 'speaking', name: 'Public Speaking', blurb: 'Explain it simply, land the point.', tint: 'verm' },
  { key: 'language', name: 'Language', blurb: 'Spoken fluency and clarity.', tint: 'green' },
];

export function subjectByKey(key: string): Subject | undefined {
  return subjects.find((s) => s.key === key);
}

/* ── Decks ────────────────────────────────────────────────────────────────── */

export type Difficulty = 'intro' | 'intermediate' | 'advanced' | 'expert';

export interface Deck {
  id: string;
  title: string;
  subject: string; // display name (session engine reads this)
  subjectKey: string;
  difficulty: Difficulty;
  description: string;
  tags: string[];
  questions: string[];
  featured?: boolean;
}

export const starterDecks: Deck[] = [
  {
    id: 'deck-cardio',
    title: 'Cardiology Viva Core',
    subject: 'Medicine',
    subjectKey: 'medicine',
    difficulty: 'advanced',
    description: 'The chest-pain, heart-failure, and ECG questions examiners open with.',
    tags: ['Cardiology', 'Acute care', 'ECG'],
    featured: true,
    questions: [
      'Walk me through your approach to a patient presenting with acute chest pain.',
      'Explain the pathophysiology of heart failure with reduced ejection fraction.',
      'How would you interpret an ECG showing ST elevation in leads II, III, and aVF?',
      'A patient is in fast atrial fibrillation and hypotensive. What is your immediate management?',
      'Contrast the mechanisms and indications of beta-blockers and ACE inhibitors in heart failure.',
    ],
  },
  {
    id: 'deck-respiratory',
    title: 'Respiratory Emergencies',
    subject: 'Medicine',
    subjectKey: 'medicine',
    difficulty: 'advanced',
    description: 'Breathlessness, asthma, and the acutely hypoxic patient.',
    tags: ['Respiratory', 'Acute care'],
    questions: [
      'Give me your structured approach to the acutely breathless patient.',
      'How do you assess the severity of an acute asthma attack, and what changes your management?',
      'Explain the difference between type 1 and type 2 respiratory failure.',
      'When would you consider non-invasive ventilation, and what are its contraindications?',
    ],
  },
  {
    id: 'deck-ethics',
    title: 'Medical Ethics & Communication',
    subject: 'Medicine',
    subjectKey: 'medicine',
    difficulty: 'intermediate',
    description: 'Consent, capacity, and breaking bad news, scored on clarity.',
    tags: ['Ethics', 'OSCE', 'Communication'],
    questions: [
      'How would you assess whether a patient has capacity to refuse treatment?',
      'A family asks you not to tell a competent patient their diagnosis. How do you respond?',
      'Walk me through how you would break bad news to a patient.',
      'Explain the four principles of medical ethics with an example of when two conflict.',
    ],
  },
  {
    id: 'deck-behavioural',
    title: 'Behavioural Interview',
    subject: 'Software Interviews',
    subjectKey: 'cs-interview',
    difficulty: 'intermediate',
    description: 'The STAR stories every engineering interview will ask for.',
    tags: ['Behavioural', 'STAR', 'FAANG'],
    featured: true,
    questions: [
      'Tell me about a time you disagreed with a teammate. How did you resolve it?',
      'Describe a project that failed. What did you learn and what would you change?',
      'Tell me about the most technically challenging problem you have solved.',
      'How do you decide when to pay down technical debt versus shipping features?',
      'Describe a time you had to give difficult feedback to a peer.',
    ],
  },
  {
    id: 'deck-system-design',
    title: 'System Design Fundamentals',
    subject: 'Software Interviews',
    subjectKey: 'cs-interview',
    difficulty: 'advanced',
    description: 'Talk through architecture, trade-offs, and scale out loud.',
    tags: ['System design', 'Architecture', 'Scale'],
    questions: [
      'Design a URL shortener. Walk me through your data model and how it scales.',
      'How would you design a rate limiter for a public API?',
      'Explain the trade-offs between SQL and NoSQL for a social feed.',
      'How would you design a notification system that delivers to millions of users?',
      'Talk me through caching strategies and when each one bites you.',
    ],
  },
  {
    id: 'deck-cs-fundamentals',
    title: 'CS Fundamentals Recall',
    subject: 'Software Interviews',
    subjectKey: 'cs-interview',
    difficulty: 'intermediate',
    description: 'Rapid recall of the concepts that come up mid-interview.',
    tags: ['Algorithms', 'Concepts'],
    questions: [
      'Explain the difference between a process and a thread.',
      'What is a deadlock and how do you prevent one?',
      'Describe how a hash map works and its average and worst-case complexity.',
      'What happens, end to end, when you type a URL and press enter?',
    ],
  },
  {
    id: 'deck-law-moot',
    title: 'Moot Court & Oral Advocacy',
    subject: 'Law',
    subjectKey: 'law',
    difficulty: 'advanced',
    description: 'Hold your submission under questioning from the bench.',
    tags: ['Advocacy', 'Moot'],
    featured: true,
    questions: [
      'State your first submission and the authority you rely on.',
      'If I reject your leading authority, where does that leave your argument?',
      'How do you distinguish the facts of this case from the precedent against you?',
      'What is the strongest point against your client, and how do you meet it?',
    ],
  },
  {
    id: 'deck-law-contract',
    title: 'Contract Law Orals',
    subject: 'Law',
    subjectKey: 'law',
    difficulty: 'intermediate',
    description: 'Formation, breach, and remedies, defended aloud.',
    tags: ['Contract', 'Fundamentals'],
    questions: [
      'What are the essential elements for a binding contract to form?',
      'Explain the difference between a condition and a warranty, and why it matters.',
      'When is a term implied into a contract?',
      'Walk me through how damages are assessed for breach of contract.',
    ],
  },
  {
    id: 'deck-eng-design',
    title: 'Engineering Design Defence',
    subject: 'Engineering',
    subjectKey: 'engineering',
    difficulty: 'advanced',
    description: 'Justify your design decisions and trade-offs on the spot.',
    tags: ['Design', 'Trade-offs'],
    questions: [
      'Justify the key material choice in your design and the alternative you rejected.',
      'What is the single biggest failure mode of your design and how did you mitigate it?',
      'How did you validate your design against the requirements?',
      'If your budget were halved, what would you cut and why?',
    ],
  },
  {
    id: 'deck-eng-thermo',
    title: 'Thermodynamics Recall',
    subject: 'Engineering',
    subjectKey: 'engineering',
    difficulty: 'intermediate',
    description: 'Core laws and cycles, explained clearly and fast.',
    tags: ['Thermodynamics', 'Fundamentals'],
    questions: [
      'State the first and second laws of thermodynamics in your own words.',
      'Explain entropy to someone who has never studied physics.',
      'Walk me through the Carnot cycle and why it sets an efficiency limit.',
      'What is the difference between heat and temperature?',
    ],
  },
  {
    id: 'deck-mba-case',
    title: 'MBA Case Cracking',
    subject: 'Business & MBA',
    subjectKey: 'business',
    difficulty: 'advanced',
    description: 'Structure a case answer out loud under time pressure.',
    tags: ['Case', 'Consulting'],
    featured: true,
    questions: [
      'A retailer’s profits are falling despite rising sales. How do you diagnose it?',
      'Our client is considering entering a new market. How would you structure your analysis?',
      'How would you estimate the number of electric vehicles sold in a country last year?',
      'A client wants to cut costs by 20%. Where do you start and why?',
    ],
  },
  {
    id: 'deck-mba-fit',
    title: 'MBA & Job Fit Questions',
    subject: 'Business & MBA',
    subjectKey: 'business',
    difficulty: 'intermediate',
    description: 'Why this school, why you, and the leadership stories.',
    tags: ['Fit', 'Leadership'],
    questions: [
      'Why an MBA, and why now?',
      'Tell me about a time you led a team through a setback.',
      'Where do you see yourself in five years, and how does this get you there?',
      'What is a weakness you are actively working on?',
    ],
  },
  {
    id: 'deck-thesis',
    title: 'Thesis / PhD Defence',
    subject: 'Science',
    subjectKey: 'science',
    difficulty: 'expert',
    description: 'Defend your contribution, methods, and limitations.',
    tags: ['Defence', 'Research'],
    questions: [
      'In two sentences, what is the original contribution of your work?',
      'Why did you choose this methodology over the obvious alternative?',
      'What is the biggest limitation of your study, and how does it affect your conclusions?',
      'If you started again tomorrow, what would you do differently?',
      'How does your finding change what the field should do next?',
    ],
  },
  {
    id: 'deck-science-concepts',
    title: 'Explain the Concept',
    subject: 'Science',
    subjectKey: 'science',
    difficulty: 'intermediate',
    description: 'Turn hard ideas into plain, correct explanations.',
    tags: ['Concepts', 'Teaching'],
    questions: [
      'Explain natural selection to a curious ten-year-old.',
      'What is CRISPR and why did it change biology?',
      'Explain what a p-value actually means, and what it does not.',
      'Describe how mRNA vaccines work in under a minute.',
    ],
  },
  {
    id: 'deck-speaking',
    title: 'Explain It Simply',
    subject: 'Public Speaking',
    subjectKey: 'speaking',
    difficulty: 'intro',
    description: 'The warm-up deck for clear, confident delivery.',
    tags: ['Clarity', 'Warm-up'],
    featured: true,
    questions: [
      'Explain how a recommendation algorithm works to a non-technical audience.',
      'In one minute, make the case for why your project deserves funding.',
      'Summarise a complex topic you know well as if teaching a curious teenager.',
      'Describe what you do for a living without using any jargon.',
    ],
  },
  {
    id: 'deck-pitch',
    title: 'Pitch & Persuade',
    subject: 'Public Speaking',
    subjectKey: 'speaking',
    difficulty: 'intermediate',
    description: 'Open strong, handle the hard question, and land it.',
    tags: ['Pitch', 'Persuasion'],
    questions: [
      'Give me your thirty-second pitch, then I will interrupt.',
      'A skeptic says your idea will never scale. Respond.',
      'What is the one number that proves your idea works?',
      'Close the pitch: what exactly are you asking me to do?',
    ],
  },
  {
    id: 'deck-language',
    title: 'Everyday Fluency',
    subject: 'Language',
    subjectKey: 'language',
    difficulty: 'intro',
    description: 'Speak on familiar topics; get marked on clarity and pace.',
    tags: ['Speaking', 'Fluency'],
    questions: [
      'Describe your daily routine from morning to night.',
      'Tell me about a place you love and why.',
      'What did you do last weekend, and what are your plans for the next?',
      'Describe a person who has influenced you.',
    ],
  },
  {
    id: 'deck-language-debate',
    title: 'Opinion & Debate',
    subject: 'Language',
    subjectKey: 'language',
    difficulty: 'intermediate',
    description: 'Argue a position aloud and defend it under a follow-up.',
    tags: ['Debate', 'Speaking'],
    questions: [
      'Is remote work better than working in an office? Argue one side.',
      'Should public transport be free? Make your case.',
      'What is one thing your city should change, and why?',
      'Defend a popular opinion you actually disagree with.',
    ],
  },
];

export const allDecks = starterDecks;

export function deckById(id: string): Deck | undefined {
  return starterDecks.find((d) => d.id === id);
}
export function decksBySubject(subjectKey: string): Deck[] {
  return starterDecks.filter((d) => d.subjectKey === subjectKey);
}
export const featuredDecks = starterDecks.filter((d) => d.featured);

export function estMinutes(deck: Deck, mode: ModeKey = 'mock_viva'): number {
  return Math.max(2, Math.round(deck.questions.length * modeByKey(mode).minutesPerQ));
}

export const difficultyLabel: Record<Difficulty, string> = {
  intro: 'Intro',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
};

/* ── Coaching tips (rotated daily) ────────────────────────────────────────── */

export const tips: { title: string; body: string }[] = [
  {
    title: 'Lead with the claim',
    body: 'State your answer in the first sentence, then defend it. Examiners follow structure, not suspense.',
  },
  {
    title: 'Signpost your structure',
    body: '“Three causes, then management” tells the examiner exactly where you are going. It buys you patience.',
  },
  {
    title: 'Kill the filler',
    body: 'Cut “um”, “like”, and “basically”. A half-second pause reads as confidence; a filler reads as doubt.',
  },
  {
    title: 'Land the answer',
    body: 'Finish with a clear conclusion, not a trailing “…so, yeah”. The last sentence is what they remember.',
  },
  {
    title: 'Answer the question asked',
    body: 'Before you speak, name what the question is really testing. Relevance beats volume every time.',
  },
  {
    title: 'Slow the opening',
    body: 'Rushing the first sentence is the top confidence tell. Start at 80% speed and let it build.',
  },
];

export function tipOfTheDay(): { title: string; body: string } {
  const day = Math.floor(Date.now() / 86_400_000);
  return tips[day % tips.length]!;
}

/* ── Achievements ─────────────────────────────────────────────────────────── */

export interface Achievement {
  key: string;
  name: string;
  detail: string;
  earned: boolean;
}

export const achievements: Achievement[] = [
  { key: 'first', name: 'First answer', detail: 'Complete your first spoken answer.', earned: true },
  { key: 'streak3', name: 'Three-day streak', detail: 'Practise three days in a row.', earned: true },
  { key: 'streak7', name: 'Week strong', detail: 'Practise seven days in a row.', earned: false },
  { key: 'ninety', name: 'Nailed it', detail: 'Score 90+ overall on any answer.', earned: true },
  { key: 'viva10', name: 'Viva veteran', detail: 'Finish ten Mock Viva sessions.', earned: false },
  { key: 'allmodes', name: 'All-rounder', detail: 'Try every practice mode.', earned: false },
];

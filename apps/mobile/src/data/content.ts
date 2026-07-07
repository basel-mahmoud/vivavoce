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

/* ── Study levels ─────────────────────────────────────────────────────────── */

export type StudyLevelKey = 'school' | 'undergrad' | 'postgrad' | 'professional';

export const studyLevels: { key: StudyLevelKey; label: string; description: string }[] = [
  { key: 'school', label: 'School / High school', description: 'GCSEs, A-levels, IB, or equivalent.' },
  { key: 'undergrad', label: 'Undergraduate', description: 'Bachelor’s degree or diploma.' },
  { key: 'postgrad', label: 'Postgraduate', description: 'Master’s, PhD, or professional doctorate.' },
  { key: 'professional', label: 'Professional / Career', description: 'Job interviews, board exams, or work.' },
];

/* ── Exam formats ─────────────────────────────────────────────────────────── */

export type ExamFormatKey =
  | 'oral_exam'
  | 'written_exam'
  | 'viva'
  | 'interview'
  | 'presentation'
  | 'language';

export interface ExamFormat {
  key: ExamFormatKey;
  name: string;
  line: string;
  icon: 'mic' | 'layers' | 'graduation' | 'zap' | 'timer' | 'repeat';
  /** Practice mode this format maps onto for a session. */
  mode: ModeKey;
  /** Backend goal enum this format contributes to. */
  goal: 'viva' | 'interview' | 'language' | 'presentation' | 'oral_exam';
}

export const examFormats: ExamFormat[] = [
  {
    key: 'oral_exam',
    name: 'Oral exam',
    line: 'Answer examiner questions out loud, on the spot.',
    icon: 'mic',
    mode: 'quick',
    goal: 'oral_exam',
  },
  {
    key: 'viva',
    name: 'Viva / thesis defence',
    line: 'Defend your work under chained follow-up questions.',
    icon: 'layers',
    mode: 'mock_viva',
    goal: 'viva',
  },
  {
    key: 'written_exam',
    name: 'Written exam prep',
    line: 'Rehearse recall and structure by explaining aloud.',
    icon: 'repeat',
    mode: 'flash_recall',
    goal: 'oral_exam',
  },
  {
    key: 'interview',
    name: 'Interview',
    line: 'Behavioural, technical, or admissions questions.',
    icon: 'zap',
    mode: 'interview',
    goal: 'interview',
  },
  {
    key: 'presentation',
    name: 'Presentation / defence',
    line: 'Open strong, handle Q&A, and land the point.',
    icon: 'graduation',
    mode: 'explain',
    goal: 'presentation',
  },
  {
    key: 'language',
    name: 'Language / fluency',
    line: 'Speak on topics and get marked on clarity and pace.',
    icon: 'timer',
    mode: 'rapid_fire',
    goal: 'language',
  },
];

export function formatByKey(key: string): ExamFormat | undefined {
  return examFormats.find((f) => f.key === key);
}

/** The backend goal derived from the user's chosen formats (first wins). */
export function goalFromFormats(keys: string[]): ExamFormat['goal'] {
  for (const k of keys) {
    const f = formatByKey(k);
    if (f) return f.goal;
  }
  return 'oral_exam';
}

/* ── Fields of study (the "major" catalogue) ──────────────────────────────── */

export interface FieldArea {
  key: string;
  name: string;
}

export interface Field {
  key: string;
  name: string;
  area: string; // FieldArea.key
  /** Practice subjects most relevant to this field (drives calibration). */
  subjectKeys: string[];
}

export const fieldAreas: FieldArea[] = [
  { key: 'health', name: 'Health & Medicine' },
  { key: 'eng-tech', name: 'Engineering & Technology' },
  { key: 'natural', name: 'Natural Sciences' },
  { key: 'social', name: 'Social Sciences' },
  { key: 'business', name: 'Business & Economics' },
  { key: 'law-policy', name: 'Law & Policy' },
  { key: 'humanities', name: 'Humanities & Arts' },
  { key: 'language', name: 'Languages & Communication' },
];

export const fields: Field[] = [
  // Health & Medicine
  { key: 'medicine', name: 'Medicine (MBBS / MD)', area: 'health', subjectKeys: ['medicine', 'science'] },
  { key: 'nursing', name: 'Nursing', area: 'health', subjectKeys: ['medicine', 'speaking'] },
  { key: 'dentistry', name: 'Dentistry', area: 'health', subjectKeys: ['medicine', 'science'] },
  { key: 'pharmacy', name: 'Pharmacy', area: 'health', subjectKeys: ['medicine', 'science'] },
  { key: 'pharmacology', name: 'Pharmacology', area: 'health', subjectKeys: ['medicine', 'science'] },
  { key: 'veterinary', name: 'Veterinary Science', area: 'health', subjectKeys: ['medicine', 'science'] },
  { key: 'public-health', name: 'Public Health', area: 'health', subjectKeys: ['science', 'speaking'] },
  { key: 'physiotherapy', name: 'Physiotherapy', area: 'health', subjectKeys: ['medicine', 'speaking'] },
  { key: 'occupational-therapy', name: 'Occupational Therapy', area: 'health', subjectKeys: ['medicine', 'speaking'] },
  { key: 'midwifery', name: 'Midwifery', area: 'health', subjectKeys: ['medicine', 'speaking'] },
  { key: 'paramedicine', name: 'Paramedicine / EMS', area: 'health', subjectKeys: ['medicine', 'speaking'] },
  { key: 'radiography', name: 'Radiography & Imaging', area: 'health', subjectKeys: ['medicine', 'science'] },
  { key: 'nutrition', name: 'Nutrition & Dietetics', area: 'health', subjectKeys: ['medicine', 'science'] },
  { key: 'optometry', name: 'Optometry', area: 'health', subjectKeys: ['medicine', 'science'] },
  { key: 'audiology', name: 'Audiology & Speech Therapy', area: 'health', subjectKeys: ['medicine', 'speaking'] },
  { key: 'psychiatry', name: 'Psychiatry', area: 'health', subjectKeys: ['medicine', 'science'] },
  { key: 'surgery', name: 'Surgery', area: 'health', subjectKeys: ['medicine', 'science'] },
  { key: 'anatomy', name: 'Anatomy & Physiology', area: 'health', subjectKeys: ['medicine', 'science'] },
  { key: 'epidemiology', name: 'Epidemiology', area: 'health', subjectKeys: ['science', 'medicine'] },
  { key: 'health-informatics', name: 'Health Informatics', area: 'health', subjectKeys: ['medicine', 'cs-interview'] },
  { key: 'sports-science', name: 'Sports & Exercise Science', area: 'health', subjectKeys: ['science', 'speaking'] },
  { key: 'osteopathy', name: 'Osteopathy / Chiropractic', area: 'health', subjectKeys: ['medicine', 'speaking'] },
  // Engineering & Technology
  { key: 'cs', name: 'Computer Science', area: 'eng-tech', subjectKeys: ['cs-interview', 'science'] },
  { key: 'software-eng', name: 'Software Engineering', area: 'eng-tech', subjectKeys: ['cs-interview'] },
  { key: 'data-science', name: 'Data Science & AI', area: 'eng-tech', subjectKeys: ['cs-interview', 'science'] },
  { key: 'machine-learning', name: 'Machine Learning', area: 'eng-tech', subjectKeys: ['cs-interview', 'science'] },
  { key: 'cybersecurity', name: 'Cybersecurity', area: 'eng-tech', subjectKeys: ['cs-interview', 'engineering'] },
  { key: 'info-systems', name: 'Information Systems', area: 'eng-tech', subjectKeys: ['cs-interview', 'business'] },
  { key: 'game-dev', name: 'Game Development', area: 'eng-tech', subjectKeys: ['cs-interview', 'speaking'] },
  { key: 'networks', name: 'Computer Networks', area: 'eng-tech', subjectKeys: ['cs-interview', 'engineering'] },
  { key: 'mech-eng', name: 'Mechanical Engineering', area: 'eng-tech', subjectKeys: ['engineering'] },
  { key: 'elec-eng', name: 'Electrical Engineering', area: 'eng-tech', subjectKeys: ['engineering', 'science'] },
  { key: 'electronics-eng', name: 'Electronics & Embedded Systems', area: 'eng-tech', subjectKeys: ['engineering', 'cs-interview'] },
  { key: 'civil-eng', name: 'Civil Engineering', area: 'eng-tech', subjectKeys: ['engineering'] },
  { key: 'structural-eng', name: 'Structural Engineering', area: 'eng-tech', subjectKeys: ['engineering'] },
  { key: 'chem-eng', name: 'Chemical Engineering', area: 'eng-tech', subjectKeys: ['engineering', 'science'] },
  { key: 'aero-eng', name: 'Aerospace Engineering', area: 'eng-tech', subjectKeys: ['engineering', 'science'] },
  { key: 'biomedical-eng', name: 'Biomedical Engineering', area: 'eng-tech', subjectKeys: ['engineering', 'medicine'] },
  { key: 'mechatronics', name: 'Mechatronics & Robotics', area: 'eng-tech', subjectKeys: ['engineering', 'cs-interview'] },
  { key: 'industrial-eng', name: 'Industrial Engineering', area: 'eng-tech', subjectKeys: ['engineering', 'business'] },
  { key: 'materials-eng', name: 'Materials Science & Engineering', area: 'eng-tech', subjectKeys: ['engineering', 'science'] },
  { key: 'environmental-eng', name: 'Environmental Engineering', area: 'eng-tech', subjectKeys: ['engineering', 'science'] },
  { key: 'petroleum-eng', name: 'Petroleum & Energy Engineering', area: 'eng-tech', subjectKeys: ['engineering', 'science'] },
  { key: 'mining-eng', name: 'Mining Engineering', area: 'eng-tech', subjectKeys: ['engineering'] },
  { key: 'marine-eng', name: 'Marine & Naval Engineering', area: 'eng-tech', subjectKeys: ['engineering'] },
  { key: 'agricultural-eng', name: 'Agricultural Engineering', area: 'eng-tech', subjectKeys: ['engineering', 'science'] },
  { key: 'nuclear-eng', name: 'Nuclear Engineering', area: 'eng-tech', subjectKeys: ['engineering', 'science'] },
  { key: 'telecom-eng', name: 'Telecommunications Engineering', area: 'eng-tech', subjectKeys: ['engineering', 'cs-interview'] },
  { key: 'architecture', name: 'Architecture', area: 'eng-tech', subjectKeys: ['engineering', 'speaking'] },
  { key: 'urban-planning', name: 'Urban Planning', area: 'eng-tech', subjectKeys: ['engineering', 'law'] },
  { key: 'aviation', name: 'Aviation & Pilot Studies', area: 'eng-tech', subjectKeys: ['engineering', 'speaking'] },
  // Natural Sciences
  { key: 'biology', name: 'Biology', area: 'natural', subjectKeys: ['science', 'medicine'] },
  { key: 'chemistry', name: 'Chemistry', area: 'natural', subjectKeys: ['science'] },
  { key: 'biochemistry', name: 'Biochemistry', area: 'natural', subjectKeys: ['science', 'medicine'] },
  { key: 'physics', name: 'Physics', area: 'natural', subjectKeys: ['science', 'engineering'] },
  { key: 'astronomy', name: 'Astronomy & Astrophysics', area: 'natural', subjectKeys: ['science'] },
  { key: 'mathematics', name: 'Mathematics', area: 'natural', subjectKeys: ['science', 'cs-interview'] },
  { key: 'statistics', name: 'Statistics', area: 'natural', subjectKeys: ['science', 'cs-interview'] },
  { key: 'environmental', name: 'Environmental Science', area: 'natural', subjectKeys: ['science', 'speaking'] },
  { key: 'neuroscience', name: 'Neuroscience', area: 'natural', subjectKeys: ['science', 'medicine'] },
  { key: 'genetics', name: 'Genetics & Genomics', area: 'natural', subjectKeys: ['science', 'medicine'] },
  { key: 'microbiology', name: 'Microbiology', area: 'natural', subjectKeys: ['science', 'medicine'] },
  { key: 'immunology', name: 'Immunology', area: 'natural', subjectKeys: ['science', 'medicine'] },
  { key: 'biotechnology', name: 'Biotechnology', area: 'natural', subjectKeys: ['science', 'engineering'] },
  { key: 'zoology', name: 'Zoology', area: 'natural', subjectKeys: ['science'] },
  { key: 'botany', name: 'Botany & Plant Science', area: 'natural', subjectKeys: ['science'] },
  { key: 'marine-biology', name: 'Marine Biology', area: 'natural', subjectKeys: ['science'] },
  { key: 'ecology', name: 'Ecology & Conservation', area: 'natural', subjectKeys: ['science', 'speaking'] },
  { key: 'geology', name: 'Geology & Earth Science', area: 'natural', subjectKeys: ['science', 'engineering'] },
  { key: 'geography', name: 'Geography', area: 'natural', subjectKeys: ['science', 'speaking'] },
  { key: 'meteorology', name: 'Meteorology & Climate', area: 'natural', subjectKeys: ['science'] },
  { key: 'oceanography', name: 'Oceanography', area: 'natural', subjectKeys: ['science'] },
  { key: 'forensics', name: 'Forensic Science', area: 'natural', subjectKeys: ['science', 'law'] },
  { key: 'food-science', name: 'Food Science', area: 'natural', subjectKeys: ['science', 'engineering'] },
  { key: 'agriculture', name: 'Agriculture & Agronomy', area: 'natural', subjectKeys: ['science', 'business'] },
  // Social Sciences
  { key: 'psychology', name: 'Psychology', area: 'social', subjectKeys: ['science', 'speaking'] },
  { key: 'clinical-psychology', name: 'Clinical Psychology', area: 'social', subjectKeys: ['science', 'medicine'] },
  { key: 'sociology', name: 'Sociology', area: 'social', subjectKeys: ['speaking', 'science'] },
  { key: 'political-science', name: 'Political Science', area: 'social', subjectKeys: ['law', 'speaking'] },
  { key: 'intl-relations', name: 'International Relations', area: 'social', subjectKeys: ['law', 'speaking'] },
  { key: 'education', name: 'Education', area: 'social', subjectKeys: ['speaking', 'science'] },
  { key: 'early-education', name: 'Early Childhood Education', area: 'social', subjectKeys: ['speaking'] },
  { key: 'special-education', name: 'Special Education', area: 'social', subjectKeys: ['speaking', 'science'] },
  { key: 'anthropology', name: 'Anthropology', area: 'social', subjectKeys: ['science', 'speaking'] },
  { key: 'archaeology', name: 'Archaeology', area: 'social', subjectKeys: ['science', 'speaking'] },
  { key: 'social-work', name: 'Social Work', area: 'social', subjectKeys: ['speaking', 'law'] },
  { key: 'counselling', name: 'Counselling & Therapy', area: 'social', subjectKeys: ['speaking', 'science'] },
  { key: 'demography', name: 'Demography & Population Studies', area: 'social', subjectKeys: ['science', 'speaking'] },
  { key: 'gender-studies', name: 'Gender Studies', area: 'social', subjectKeys: ['speaking', 'law'] },
  { key: 'development-studies', name: 'Development Studies', area: 'social', subjectKeys: ['business', 'speaking'] },
  { key: 'urban-studies', name: 'Urban Studies', area: 'social', subjectKeys: ['speaking', 'engineering'] },
  { key: 'library-science', name: 'Library & Information Science', area: 'social', subjectKeys: ['speaking', 'cs-interview'] },
  // Business & Economics
  { key: 'business', name: 'Business Administration', area: 'business', subjectKeys: ['business', 'speaking'] },
  { key: 'mba', name: 'MBA', area: 'business', subjectKeys: ['business', 'speaking'] },
  { key: 'finance', name: 'Finance', area: 'business', subjectKeys: ['business', 'science'] },
  { key: 'investment-banking', name: 'Investment Banking', area: 'business', subjectKeys: ['business', 'science'] },
  { key: 'accounting', name: 'Accounting', area: 'business', subjectKeys: ['business'] },
  { key: 'auditing', name: 'Auditing & Assurance', area: 'business', subjectKeys: ['business', 'law'] },
  { key: 'economics', name: 'Economics', area: 'business', subjectKeys: ['business', 'science'] },
  { key: 'econometrics', name: 'Econometrics', area: 'business', subjectKeys: ['business', 'science'] },
  { key: 'marketing', name: 'Marketing', area: 'business', subjectKeys: ['business', 'speaking'] },
  { key: 'digital-marketing', name: 'Digital Marketing', area: 'business', subjectKeys: ['business', 'speaking'] },
  { key: 'management', name: 'Management', area: 'business', subjectKeys: ['business', 'speaking'] },
  { key: 'project-management', name: 'Project Management', area: 'business', subjectKeys: ['business', 'engineering'] },
  { key: 'hr', name: 'Human Resources', area: 'business', subjectKeys: ['business', 'speaking'] },
  { key: 'operations', name: 'Operations & Supply Chain', area: 'business', subjectKeys: ['business', 'engineering'] },
  { key: 'entrepreneurship', name: 'Entrepreneurship', area: 'business', subjectKeys: ['business', 'speaking'] },
  { key: 'real-estate', name: 'Real Estate', area: 'business', subjectKeys: ['business', 'law'] },
  { key: 'insurance', name: 'Insurance & Actuarial Science', area: 'business', subjectKeys: ['business', 'science'] },
  { key: 'banking', name: 'Banking & Financial Services', area: 'business', subjectKeys: ['business', 'law'] },
  { key: 'intl-business', name: 'International Business', area: 'business', subjectKeys: ['business', 'language'] },
  { key: 'hospitality', name: 'Hospitality & Tourism', area: 'business', subjectKeys: ['business', 'speaking'] },
  { key: 'consulting', name: 'Consulting', area: 'business', subjectKeys: ['business', 'speaking'] },
  // Law & Policy
  { key: 'law', name: 'Law (LLB / JD)', area: 'law-policy', subjectKeys: ['law', 'speaking'] },
  { key: 'criminal-law', name: 'Criminal Law', area: 'law-policy', subjectKeys: ['law', 'speaking'] },
  { key: 'corporate-law', name: 'Corporate & Commercial Law', area: 'law-policy', subjectKeys: ['law', 'business'] },
  { key: 'intl-law', name: 'International Law', area: 'law-policy', subjectKeys: ['law', 'language'] },
  { key: 'human-rights-law', name: 'Human Rights Law', area: 'law-policy', subjectKeys: ['law', 'speaking'] },
  { key: 'tax-law', name: 'Tax Law', area: 'law-policy', subjectKeys: ['law', 'business'] },
  { key: 'ip-law', name: 'Intellectual Property Law', area: 'law-policy', subjectKeys: ['law', 'engineering'] },
  { key: 'criminology', name: 'Criminology', area: 'law-policy', subjectKeys: ['law', 'science'] },
  { key: 'public-policy', name: 'Public Policy', area: 'law-policy', subjectKeys: ['law', 'business'] },
  { key: 'public-admin', name: 'Public Administration', area: 'law-policy', subjectKeys: ['law', 'business'] },
  { key: 'military-security', name: 'Military & Security Studies', area: 'law-policy', subjectKeys: ['law', 'speaking'] },
  // Humanities & Arts
  { key: 'history', name: 'History', area: 'humanities', subjectKeys: ['speaking', 'science'] },
  { key: 'art-history', name: 'Art History', area: 'humanities', subjectKeys: ['speaking'] },
  { key: 'philosophy', name: 'Philosophy', area: 'humanities', subjectKeys: ['speaking', 'law'] },
  { key: 'ethics', name: 'Ethics & Moral Philosophy', area: 'humanities', subjectKeys: ['speaking', 'law'] },
  { key: 'literature', name: 'English / Literature', area: 'humanities', subjectKeys: ['speaking', 'language'] },
  { key: 'creative-writing', name: 'Creative Writing', area: 'humanities', subjectKeys: ['speaking', 'language'] },
  { key: 'classics', name: 'Classics', area: 'humanities', subjectKeys: ['speaking', 'language'] },
  { key: 'fine-arts', name: 'Fine Arts & Design', area: 'humanities', subjectKeys: ['speaking'] },
  { key: 'graphic-design', name: 'Graphic & UX Design', area: 'humanities', subjectKeys: ['speaking', 'cs-interview'] },
  { key: 'fashion', name: 'Fashion & Textiles', area: 'humanities', subjectKeys: ['speaking', 'business'] },
  { key: 'music', name: 'Music', area: 'humanities', subjectKeys: ['speaking'] },
  { key: 'music-performance', name: 'Music Performance', area: 'humanities', subjectKeys: ['speaking'] },
  { key: 'theatre', name: 'Theatre & Drama', area: 'humanities', subjectKeys: ['speaking'] },
  { key: 'film', name: 'Film & Media Production', area: 'humanities', subjectKeys: ['speaking'] },
  { key: 'photography', name: 'Photography', area: 'humanities', subjectKeys: ['speaking'] },
  { key: 'theology', name: 'Theology & Religion', area: 'humanities', subjectKeys: ['speaking', 'law'] },
  { key: 'cultural-studies', name: 'Cultural Studies', area: 'humanities', subjectKeys: ['speaking', 'language'] },
  { key: 'museum-studies', name: 'Museum & Heritage Studies', area: 'humanities', subjectKeys: ['speaking'] },
  // Languages & Communication
  { key: 'linguistics', name: 'Linguistics', area: 'language', subjectKeys: ['language', 'speaking'] },
  { key: 'modern-languages', name: 'Modern Languages', area: 'language', subjectKeys: ['language', 'speaking'] },
  { key: 'english-esl', name: 'English as a Second Language', area: 'language', subjectKeys: ['language', 'speaking'] },
  { key: 'ielts-toefl', name: 'IELTS / TOEFL Prep', area: 'language', subjectKeys: ['language', 'speaking'] },
  { key: 'journalism', name: 'Journalism & Media', area: 'language', subjectKeys: ['speaking', 'language'] },
  { key: 'communications', name: 'Communications', area: 'language', subjectKeys: ['speaking', 'language'] },
  { key: 'public-relations', name: 'Public Relations', area: 'language', subjectKeys: ['speaking', 'business'] },
  { key: 'broadcasting', name: 'Broadcasting & Presenting', area: 'language', subjectKeys: ['speaking', 'language'] },
  { key: 'translation', name: 'Translation & Interpreting', area: 'language', subjectKeys: ['language', 'speaking'] },
  { key: 'sign-language', name: 'Sign Language Studies', area: 'language', subjectKeys: ['language', 'speaking'] },
  { key: 'other', name: 'Something else', area: 'language', subjectKeys: ['speaking', 'language'] },
];

export function fieldByKey(key: string): Field | undefined {
  return fields.find((f) => f.key === key);
}

/** Fields grouped by area, for a sectioned picker. */
export function fieldsGrouped(): { area: FieldArea; fields: Field[] }[] {
  return fieldAreas
    .map((area) => ({ area, fields: fields.filter((f) => f.area === area.key) }))
    .filter((g) => g.fields.length > 0);
}

/** Subjects to suggest for a chosen field, most relevant first, then the rest. */
export function subjectsForField(fieldKey: string | null): Subject[] {
  const field = fieldKey ? fieldByKey(fieldKey) : undefined;
  if (!field) return subjects;
  const priority = new Set(field.subjectKeys);
  return [...subjects].sort((a, b) => {
    const pa = priority.has(a.key) ? 0 : 1;
    const pb = priority.has(b.key) ? 0 : 1;
    return pa - pb;
  });
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

/**
 * Decks calibrated to a user's chosen subjects: their subjects' decks first
 * (featured within), then the rest, so recommendations reflect onboarding.
 */
export function decksForSubjects(subjectKeys: string[]): Deck[] {
  if (!subjectKeys.length) return featuredDecks;
  const want = new Set(subjectKeys);
  const matched = starterDecks.filter((d) => want.has(d.subjectKey));
  const pool = matched.length ? matched : starterDecks;
  return [...pool].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
}

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

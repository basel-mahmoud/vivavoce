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
  /** Set for AI-generated decks that live server-side (sessions link to it). */
  serverId?: string;
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
  /* ── Expansion wave: medicine ── */
  {
    id: 'deck-neuro',
    title: 'Neurology Essentials',
    subject: 'Medicine',
    subjectKey: 'medicine',
    difficulty: 'advanced',
    description: 'Stroke, seizures, and the neuro exam under viva pressure.',
    tags: ['Neurology', 'Acute care'],
    questions: [
      'A patient presents with sudden right-sided weakness. Talk me through your first hour.',
      'Differentiate an upper from a lower motor neuron lesion on examination.',
      'How do you assess and manage a first unprovoked seizure?',
      'Explain the Glasgow Coma Scale and its limitations.',
      'When is a lumbar puncture contraindicated, and why?',
    ],
  },
  {
    id: 'deck-pharma',
    title: 'Pharmacology Rapid Recall',
    subject: 'Medicine',
    subjectKey: 'medicine',
    difficulty: 'intermediate',
    description: 'Mechanisms, interactions, and the drugs examiners love.',
    tags: ['Pharmacology', 'Recall'],
    questions: [
      'Explain the mechanism of action of warfarin and how you monitor it.',
      'Why do ACE inhibitors cause a dry cough, and what do you switch to?',
      'Contrast type A and type B adverse drug reactions with examples.',
      'How does antibiotic resistance develop, and what slows it down?',
    ],
  },
  {
    id: 'deck-osce-history',
    title: 'OSCE History Taking',
    subject: 'Medicine',
    subjectKey: 'medicine',
    difficulty: 'intermediate',
    description: 'Structured histories that score every checklist point.',
    tags: ['OSCE', 'Communication'],
    questions: [
      'Take me through a focused chest-pain history in under two minutes.',
      'A patient presents with weight loss. Which red flags do you screen for?',
      'How do you take a sensitive alcohol history without losing rapport?',
      'Summarise a complex history back to a consultant in three sentences.',
    ],
  },
  {
    id: 'deck-paeds',
    title: 'Paediatrics Core',
    subject: 'Medicine',
    subjectKey: 'medicine',
    difficulty: 'advanced',
    description: 'The febrile child, milestones, and safeguarding.',
    tags: ['Paediatrics'],
    questions: [
      'Assess a febrile 18-month-old: what separates watchful waiting from urgent action?',
      'Walk through the key developmental milestones at 6, 12, and 24 months.',
      'How do you approach a consultation when you suspect non-accidental injury?',
      'Explain fluid resuscitation calculations in a dehydrated child.',
    ],
  },
  /* ── Expansion wave: software interviews ── */
  {
    id: 'deck-ml-interview',
    title: 'ML & AI Interview',
    subject: 'Software Interviews',
    subjectKey: 'cs-interview',
    difficulty: 'advanced',
    description: 'Models, trade-offs, and deployment questions out loud.',
    tags: ['Machine learning', 'AI'],
    questions: [
      'Explain the bias-variance trade-off to a product manager.',
      'When would you choose a simple logistic regression over a deep network?',
      'How do you detect and handle overfitting in practice?',
      'Describe how you would monitor a model after deployment.',
      'What is a transformer, in one minute, without equations?',
    ],
  },
  {
    id: 'deck-security',
    title: 'Security Interview',
    subject: 'Software Interviews',
    subjectKey: 'cs-interview',
    difficulty: 'advanced',
    description: 'Threats, defences, and secure design thinking.',
    tags: ['Security', 'Systems'],
    questions: [
      'Walk me through what happens in a SQL injection attack and how you prevent it.',
      'Explain the difference between authentication and authorization with an example.',
      'How would you store user passwords, and why exactly that way?',
      'Describe a threat model for a mobile banking app.',
    ],
  },
  {
    id: 'deck-frontend',
    title: 'Frontend Interview',
    subject: 'Software Interviews',
    subjectKey: 'cs-interview',
    difficulty: 'intermediate',
    description: 'Rendering, state, and performance questions.',
    tags: ['Frontend', 'Web'],
    questions: [
      'What happens between typing a URL and seeing pixels? Focus on the rendering path.',
      'Explain reconciliation in React and what keys actually do.',
      'How do you diagnose and fix a slow page load?',
      'Contrast optimistic and pessimistic UI updates with an example.',
    ],
  },
  {
    id: 'deck-databases',
    title: 'Databases & Storage',
    subject: 'Software Interviews',
    subjectKey: 'cs-interview',
    difficulty: 'intermediate',
    description: 'Indexes, transactions, and choosing the right store.',
    tags: ['Databases', 'Backend'],
    questions: [
      'Explain what a B-tree index does and when it stops helping.',
      'What are ACID properties? Give a real failure each one prevents.',
      'How would you shard a users table, and what breaks when you do?',
      'When is denormalization the right call?',
    ],
  },
  /* ── Expansion wave: law ── */
  {
    id: 'deck-criminal-law',
    title: 'Criminal Law Orals',
    subject: 'Law',
    subjectKey: 'law',
    difficulty: 'intermediate',
    description: 'Elements, defences, and hypotheticals aloud.',
    tags: ['Criminal', 'Fundamentals'],
    questions: [
      'Break down the elements of theft and apply them to a borrowed-car scenario.',
      'Distinguish murder from manslaughter, and where intent sits in each.',
      'When does self-defence succeed, and where does it fail?',
      'Explain the presumption of innocence and its practical consequences.',
    ],
  },
  {
    id: 'deck-evidence',
    title: 'Evidence & Procedure',
    subject: 'Law',
    subjectKey: 'law',
    difficulty: 'advanced',
    description: 'Admissibility, hearsay, and courtroom judgment calls.',
    tags: ['Evidence', 'Procedure'],
    questions: [
      'What makes evidence admissible? Walk through the core tests.',
      'Explain hearsay and its main exceptions with one example each.',
      'How do you challenge identification evidence?',
      'The judge asks why your late evidence should be admitted. Persuade them.',
    ],
  },
  {
    id: 'deck-human-rights',
    title: 'Human Rights Law',
    subject: 'Law',
    subjectKey: 'law',
    difficulty: 'advanced',
    description: 'Rights, limits, and proportionality under questioning.',
    tags: ['Human rights', 'Public law'],
    questions: [
      'Explain proportionality analysis with a freedom-of-expression example.',
      'When can a state lawfully limit the right to protest?',
      'Argue both sides: should privacy yield to national security here?',
      'What remedies exist when a right is violated, and which bite hardest?',
    ],
  },
  /* ── Expansion wave: engineering ── */
  {
    id: 'deck-biomed-devices',
    title: 'Biomedical Devices Defence',
    subject: 'Engineering',
    subjectKey: 'engineering',
    difficulty: 'advanced',
    description: 'Sensors, safety, and regulatory thinking for biomed vivas.',
    tags: ['Biomedical', 'Devices', 'Safety'],
    questions: [
      'Explain how a pulse oximeter works and its main failure modes.',
      'Design constraints for an implantable device: what dominates and why?',
      'How do you approach biocompatibility for a new sensor material?',
      'Walk through the regulatory classes of medical devices with examples.',
      'Defend your choice of signal filtering for a noisy ECG.',
    ],
  },
  {
    id: 'deck-circuits',
    title: 'Circuits & Electronics',
    subject: 'Engineering',
    subjectKey: 'engineering',
    difficulty: 'intermediate',
    description: 'Explain circuit behaviour clearly, without a whiteboard.',
    tags: ['Electronics', 'Fundamentals'],
    questions: [
      'Explain what an op-amp does and one canonical circuit that uses it.',
      'Why does impedance matching matter? Give a concrete case.',
      'Talk through what happens to an RC circuit when the switch closes.',
      'Digital vs analog signal processing: when does each win?',
    ],
  },
  {
    id: 'deck-control',
    title: 'Control Systems Viva',
    subject: 'Engineering',
    subjectKey: 'engineering',
    difficulty: 'advanced',
    description: 'Feedback, stability, and tuning — spoken like an engineer.',
    tags: ['Control', 'Systems'],
    questions: [
      'Explain PID control and what each term does to the response.',
      'What does it mean for a system to be stable? How do you check?',
      'Open-loop vs closed-loop: costs and benefits of each.',
      'Your controller oscillates in the field. Diagnose it out loud.',
    ],
  },
  {
    id: 'deck-project-defence',
    title: 'Capstone Project Defence',
    subject: 'Engineering',
    subjectKey: 'engineering',
    difficulty: 'intermediate',
    description: 'Own your project decisions under panel questioning.',
    tags: ['Capstone', 'Defence'],
    questions: [
      'Summarise your project in ninety seconds for a non-specialist panel.',
      'Which requirement was hardest to meet, and what did you trade away?',
      'If a component failed in the field tomorrow, which one and why?',
      'What would version two look like with double the budget?',
    ],
  },
  /* ── Expansion wave: business ── */
  {
    id: 'deck-finance-interview',
    title: 'Finance Interview',
    subject: 'Business & MBA',
    subjectKey: 'business',
    difficulty: 'advanced',
    description: 'Valuation, markets, and judgment questions aloud.',
    tags: ['Finance', 'Valuation'],
    questions: [
      'Walk me through a DCF valuation from memory.',
      'How do the three financial statements connect?',
      'Interest rates just rose 2%. Talk through the ripple effects.',
      'Pitch me a stock in two minutes.',
    ],
  },
  {
    id: 'deck-marketing-case',
    title: 'Marketing Case Practice',
    subject: 'Business & MBA',
    subjectKey: 'business',
    difficulty: 'intermediate',
    description: 'Positioning, channels, and growth cases on the spot.',
    tags: ['Marketing', 'Case'],
    questions: [
      'A good product is not selling. Diagnose the funnel out loud.',
      'How would you launch a new fitness app with a tiny budget?',
      'Choose a brand you admire: what exactly is its positioning?',
      'Defend a price increase to a sceptical CEO.',
    ],
  },
  {
    id: 'deck-econ-orals',
    title: 'Economics Orals',
    subject: 'Business & MBA',
    subjectKey: 'business',
    difficulty: 'advanced',
    description: 'Micro, macro, and policy reasoning under questioning.',
    tags: ['Economics', 'Theory'],
    questions: [
      'Explain elasticity of demand with a real product example.',
      'What actually happens when a central bank raises rates?',
      'Argue for and against a minimum wage increase.',
      'Explain comparative advantage to a high-schooler.',
    ],
  },
  {
    id: 'deck-hr-behavioural',
    title: 'Leadership & Teamwork Stories',
    subject: 'Business & MBA',
    subjectKey: 'business',
    difficulty: 'intro',
    description: 'The people questions every panel eventually asks.',
    tags: ['Behavioural', 'Leadership'],
    questions: [
      'Tell me about a time you resolved a conflict inside your team.',
      'Describe a moment you had to deliver bad news upward.',
      'When did you change your mind under pressure, and why?',
      'How do you motivate someone more senior than you?',
    ],
  },
  /* ── Expansion wave: science ── */
  {
    id: 'deck-chem-orals',
    title: 'Chemistry Orals',
    subject: 'Science',
    subjectKey: 'science',
    difficulty: 'intermediate',
    description: 'Bonding, kinetics, and mechanisms explained aloud.',
    tags: ['Chemistry', 'Fundamentals'],
    questions: [
      'Explain why water is a bent molecule and why that matters.',
      'What drives a reaction to be spontaneous? Untangle enthalpy and entropy.',
      'Describe how a catalyst changes a reaction, and what it cannot change.',
      'Explain Le Chatelier’s principle with an industrial example.',
    ],
  },
  {
    id: 'deck-physics-concepts',
    title: 'Physics Concepts Aloud',
    subject: 'Science',
    subjectKey: 'science',
    difficulty: 'intermediate',
    description: 'Core physics explained clearly enough to teach.',
    tags: ['Physics', 'Concepts'],
    questions: [
      'Explain why astronauts float, without saying "no gravity".',
      'What is the difference between heat and temperature, physically?',
      'Explain interference using everyday examples.',
      'Why can nothing exceed the speed of light? Give the honest version.',
    ],
  },
  {
    id: 'deck-genetics',
    title: 'Genetics & Molecular Bio',
    subject: 'Science',
    subjectKey: 'science',
    difficulty: 'advanced',
    description: 'From replication to CRISPR under viva questioning.',
    tags: ['Genetics', 'Molecular'],
    questions: [
      'Walk through DNA replication and where it can go wrong.',
      'Explain how PCR works and one real-world use.',
      'Dominant vs recessive: what is actually happening molecularly?',
      'Describe CRISPR editing and one ethical line you would draw.',
    ],
  },
  {
    id: 'deck-stats-defence',
    title: 'Statistics for Research',
    subject: 'Science',
    subjectKey: 'science',
    difficulty: 'advanced',
    description: 'Defend your methods and inference choices.',
    tags: ['Statistics', 'Methods'],
    questions: [
      'Your p-value is 0.049. What are you entitled to claim?',
      'Explain confidence intervals to a clinician.',
      'When is a t-test wrong for your data, and what do you use instead?',
      'How do you justify your sample size to a reviewer?',
    ],
  },
  /* ── Expansion wave: public speaking ── */
  {
    id: 'deck-impromptu',
    title: 'Impromptu Speaking',
    subject: 'Public Speaking',
    subjectKey: 'speaking',
    difficulty: 'intermediate',
    description: 'Zero prep. Structure your thinking as you speak.',
    tags: ['Impromptu', 'Structure'],
    questions: [
      'You have thirty seconds: convince me breakfast matters, or does not.',
      'Speak for one minute on a lesson a failure taught you.',
      'Sell me the most boring object in the room.',
      'Argue that your hometown deserves more tourists.',
    ],
  },
  {
    id: 'deck-academic-presenting',
    title: 'Academic Presenting',
    subject: 'Public Speaking',
    subjectKey: 'speaking',
    difficulty: 'advanced',
    description: 'Conference-grade delivery and Q&A composure.',
    tags: ['Academic', 'Q&A'],
    questions: [
      'Open your conference talk: hook a tired audience in twenty seconds.',
      'A senior academic challenges your methodology mid-talk. Respond.',
      'Explain your research poster to a visitor from another field.',
      'Close your talk with a takeaway they will quote tomorrow.',
    ],
  },
  {
    id: 'deck-storytelling',
    title: 'Interview Storytelling',
    subject: 'Public Speaking',
    subjectKey: 'speaking',
    difficulty: 'intro',
    description: 'Turn experiences into tight, memorable stories.',
    tags: ['Storytelling', 'STAR'],
    questions: [
      'Tell the story of your proudest achievement in under ninety seconds.',
      'Describe a setback so the lesson lands harder than the failure.',
      'Introduce yourself so the panel remembers one specific thing.',
      'Tell a work story where the villain is a process, not a person.',
    ],
  },
  /* ── Expansion wave: language ── */
  {
    id: 'deck-ielts-speaking',
    title: 'IELTS-style Speaking',
    subject: 'Language',
    subjectKey: 'language',
    difficulty: 'intermediate',
    description: 'Part 2 and 3 style prompts, marked on fluency and clarity.',
    tags: ['IELTS', 'Exam'],
    questions: [
      'Describe a place you visited that changed how you think. Two minutes.',
      'Some say technology makes people lonelier. Discuss both sides.',
      'Describe a skill you want to learn and why it matters to you.',
      'How has education in your country changed in your lifetime?',
    ],
  },
  {
    id: 'deck-business-english',
    title: 'Business English',
    subject: 'Language',
    subjectKey: 'language',
    difficulty: 'intermediate',
    description: 'Meetings, negotiation, and small talk that flows.',
    tags: ['Business', 'Fluency'],
    questions: [
      'Open a meeting: welcome the team and set the agenda.',
      'Politely push back on an unrealistic deadline.',
      'Explain a delay to a client without burning trust.',
      'Make small talk with a new colleague before the call starts.',
    ],
  },
  {
    id: 'deck-travel-fluency',
    title: 'Travel & Everyday Talk',
    subject: 'Language',
    subjectKey: 'language',
    difficulty: 'intro',
    description: 'Real situations, spoken smoothly at your own pace.',
    tags: ['Everyday', 'Fluency'],
    questions: [
      'Check into a hotel and report a problem with your room.',
      'Ask a local for a food recommendation and follow up on it.',
      'Describe your favourite meal so I can almost taste it.',
      'Tell me about a small daily ritual you would never give up.',
    ],
  },
];

export const allDecks = starterDecks;

/* ── AI-generated decks (server-owned, hydrated per session) ─────────────── */

import type { ServerDeck } from '@/lib/api';

const generatedRegistry = new Map<string, Deck>();

/** Convert + register server decks so deckById / deck detail / sessions all
 *  work on them exactly like bundled decks. Idempotent. */
export function registerServerDecks(serverDecks: ServerDeck[]): Deck[] {
  const registered = serverDecks.map((s) => {
    const deck: Deck = {
      id: s.id,
      serverId: s.id,
      title: s.title,
      subject: 'AI deck',
      subjectKey: 'ai',
      difficulty: (['intro', 'intermediate', 'advanced', 'expert'] as const).includes(
        s.difficulty as Difficulty,
      )
        ? (s.difficulty as Difficulty)
        : 'intermediate',
      description: s.description,
      tags: s.tags,
      questions: s.questions.map((q) => q.prompt),
    };
    generatedRegistry.set(deck.id, deck);
    return deck;
  });
  return registered;
}

/** The caller's AI decks, newest-first as delivered by the API. */
export function generatedDecks(): Deck[] {
  return [...generatedRegistry.values()];
}

export function deckById(id: string): Deck | undefined {
  return starterDecks.find((d) => d.id === id) ?? generatedRegistry.get(id);
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

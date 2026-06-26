/** Marketing content model — single source for site copy so pages stay consistent. */

export const rubricAxes = [
  {
    key: 'correctness',
    label: 'Correctness',
    blurb: 'Did you answer the actual question — accurately?',
  },
  {
    key: 'clarity',
    label: 'Clarity',
    blurb: 'Could a peer follow your reasoning without effort?',
  },
  {
    key: 'structure',
    label: 'Structure',
    blurb: 'Signposting, a logical order, and a clean landing.',
  },
  {
    key: 'conciseness',
    label: 'Conciseness',
    blurb: 'Signal over filler. Say it once, say it well.',
  },
  {
    key: 'confidence',
    label: 'Confidence',
    blurb: 'Decisive delivery — fewer hedges, steadier pace.',
  },
] as const;

export const modes = [
  {
    key: 'mock_viva',
    name: 'Mock Viva',
    line: 'A chained examiner. Each follow-up targets your weakest axis.',
    detail:
      'The closest thing to the real room. VivaVoce probes, redirects, and digs into the exact place your last answer wobbled.',
  },
  {
    key: 'interview',
    name: 'Interview',
    line: 'Behavioural and role questions, scored on STAR structure.',
    detail:
      'Rehearse "tell me about a time…" until your stories land in thirty seconds with a clear beginning, middle, and result.',
  },
  {
    key: 'quick',
    name: 'Quick Question',
    line: 'One question, one answer, instant feedback. The warm-up.',
    detail:
      'Two minutes between lectures. Pull a card, answer out loud, see where you stand before the day starts.',
  },
  {
    key: 'flash_recall',
    name: 'Flash Recall',
    line: 'Rapid recall, spaced by the things you keep getting wrong.',
    detail:
      'Definitions, mechanisms, dates — surfaced on a spaced schedule that leans into your weak spots, not your strong ones.',
  },
  {
    key: 'explain',
    name: 'Explain Like a Teacher',
    line: 'Scored on clarity and pedagogy, not just being right.',
    detail:
      'If you can teach it simply, you own it. Practice turning what you know into something a beginner could follow.',
  },
  {
    key: 'rapid_fire',
    name: 'Timed Rapid Fire',
    line: 'A countdown per question. Train composure under pressure.',
    detail:
      'The clock is the point. Learn to start cleanly, stay concise, and finish before the buzzer without rushing.',
  },
] as const;

export const steps = [
  {
    n: '01',
    title: 'Pick a mode and a deck',
    body: 'Choose how you want to spar — a mock viva, an interview, a quick warm-up — and the subject you’re sweating.',
  },
  {
    n: '02',
    title: 'Answer out loud',
    body: 'VivaVoce asks. You speak. A live waveform shows it’s listening; tap to stop, retry, or keep going.',
  },
  {
    n: '03',
    title: 'Get coached, not graded',
    body: 'Within seconds: a five-axis breakdown, what worked, what to fix, and a model answer you could have given.',
  },
  {
    n: '04',
    title: 'Come back sharper',
    body: 'Weak areas resurface on a schedule. Your confidence trend climbs. The real thing starts to feel inevitable.',
  },
] as const;

export const personas = [
  {
    key: 'students',
    title: 'Students facing a viva',
    line: 'Medicine, law, engineering — anywhere the exam is spoken.',
    body: 'Rehearse the examiner’s follow-ups, not just the facts. Walk in having already answered the hard question three times.',
  },
  {
    key: 'interviews',
    title: 'Job seekers',
    line: 'Turn rambling stories into thirty-second answers.',
    body: 'Practice the behavioural and system-design questions you’ll actually get, and hear yourself improve before it counts.',
  },
  {
    key: 'presentations',
    title: 'Presenters & speakers',
    line: 'Rehearse the explanation until it’s effortless.',
    body: 'Cut the filler, find the structure, and land the point — so the room hears confidence, not preparation.',
  },
  {
    key: 'language',
    title: 'Language learners',
    line: 'Build spoken fluency with a partner who never tires.',
    body: 'Speak, get gentle correction on clarity and pace, and repeat as many times as you need — judgement-free.',
  },
] as const;

export const faqs = [
  {
    q: 'Is this an official exam grader?',
    a: 'No — and we’re deliberate about that. VivaVoce is a coaching tool. Its scores are structured feedback to help you improve, never official grades or a prediction of your real result.',
  },
  {
    q: 'What happens to my voice recordings?',
    a: 'Your audio is processed to produce a transcript and feedback, then handled under a strict retention policy. You can review, export, or delete your data at any time, and you choose at sign-up whether recordings are retained at all.',
  },
  {
    q: 'Does it work if my internet is flaky?',
    a: 'Yes. Answers record locally and queue for upload, so a dropped connection on the train doesn’t lose your practice. If the AI coach is briefly unavailable, you still get an immediate heuristic review and full coaching lands as soon as it’s back.',
  },
  {
    q: 'Which subjects are supported?',
    a: 'Any subject you can speak about. Use the starter decks, import your own question sets, or let VivaVoce generate questions for your topic and difficulty.',
  },
  {
    q: 'How is this different from recording myself?',
    a: 'Recording shows you what you said. VivaVoce tells you what to change — a five-axis breakdown, a model answer, and a follow-up question aimed at your weakest point, every time.',
  },
  {
    q: 'When can I use it?',
    a: 'The app is in private beta. Join the early-access list and we’ll bring you in as we open spots — students with upcoming exams first.',
  },
] as const;

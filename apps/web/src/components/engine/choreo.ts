/**
 * The marking sequence, authored once and read by everything that takes part in it: the 3D panel
 * (every frame), the portrait bench, the red pen, the verdict board and the stamp (on timers).
 * Times are seconds after the panel's answer arrives. The whole thing lands in under four
 * seconds, never blocks input (pressing again starts a fresh answer at any beat), and under
 * reduced motion every beat is simply already there.
 */
export const BEAT = {
  /** Paddles start to rise, one examiner after another. */
  raise: 0,
  stagger: 0.09,
  /** Each examiner's face turns to its verdict once its paddle is up (plus its stagger). */
  faces: 0.78,
  /** The weakest coin goes red and its examiner leans in; the others turn to look. */
  hot: 1.02,
  /** The verdict board flips to FIX FIRST. */
  board: 1.12,
  /** The red pen starts on the transcript, one stroke after another. */
  pen: 1.36,
  penStep: 0.11,
  penCap: 0.88,
  /** The weakest examiner asks the follow-up. */
  speak: 1.72,
  /** The overall mark is stamped. */
  stamp: 2.5,
  /** Everything has settled. */
  done: 3.4,
} as const;

/** An examiner asks the question when the section arrives (and for each new question); the note
 * stays up this long after the last word. */
export const ASK_HOLD = 2.6;
/** Who asks which question (AXES index): each is the axis the question leans on hardest. */
export const ASKER = [0, 1, 4] as const;

/** The panel confers for at least this long, so the collapse and the conferring read even when the answer is instant. */
export const CONFER_MIN = 1.05;
/** How fast the follow-up is spoken (characters per second), the same pace as the room's examiners. */
export const SPEAK_CPS = 44;

export const speakDuration = (line: string) => line.length / SPEAK_CPS;

/** When the red pen's i-th stroke starts. */
export const penAt = (i: number) => BEAT.pen + Math.min(i * BEAT.penStep, BEAT.penCap);

/** Marking progress on the conferring faces: fills toward 0.9 while the request runs, never claiming done. */
export function conferProgress(seconds: number): number {
  return 0.9 * (1 - Math.exp(-Math.max(0, seconds) / 2.4));
}

/**
 * A syllable envelope for a line being spoken at SPEAK_CPS: vowels open, spaces and punctuation
 * close. The same rule the room's example round uses.
 */
export function speechEnvelope(line: string, seconds: number, cps = SPEAK_CPS): number {
  const i = Math.floor(seconds * cps);
  if (i < 0 || i >= line.length) return 0;
  const c = line[i]!.toLowerCase();
  if ('aeiouy'.includes(c)) return 1;
  if (c === ' ' || ',.?!'.includes(c)) return 0.06;
  return 0.55;
}

/** Which beats have landed, `seconds` after the marks arrived (Infinity: all of them). */
export function beatsAt(seconds: number) {
  return {
    raised: (i: number) => seconds >= BEAT.raise + i * BEAT.stagger,
    verdict: (i: number) => seconds >= BEAT.faces + i * BEAT.stagger,
    hot: seconds >= BEAT.hot,
    board: seconds >= BEAT.board,
    pen: seconds >= BEAT.pen,
    speaking: (line: string) => seconds >= BEAT.speak && seconds < BEAT.speak + speakDuration(line) + 0.35,
    spoken: seconds >= BEAT.speak,
    stamp: seconds >= BEAT.stamp,
    done: seconds >= BEAT.done,
  };
}

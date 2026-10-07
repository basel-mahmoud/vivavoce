'use client';

import { cn } from '@/lib/cn';
import { VOICE_VIEW, voiceBand } from './heroVoice';
import s from './heroTitle.module.css';

/**
 * The home page's promise, "Say it out loud before it counts.", set as a crescendo: the phrase gets
 * louder word by word along Archivo's size, weight and width, from a light, condensed "Say" to
 * "loud" in black at full width, over the candidate's voice in blue ink rising off the paper's own
 * ruled line, one syllable under each word and silence under each space (heroVoice.ts). It is the
 * band the live engine draws while you answer. "before it counts." is set firm and black to the
 * same measure. There is no red here: no examiner has marked anything yet.
 *
 * The first frame is the whole line whispered over a silent rule, so every word is painted at once
 * (it is the page's largest paint). The voice then plays left to right and each word swells to its
 * level as it reaches it; everything is still by 1.5s. Motion is CSS only and composited (the words
 * scale and slide, the band is uncovered by two opposed slides), so it plays before hydration and
 * holds its frame rate while the room boots. The entrance waits for the display face (the layout's
 * font gate), or on a first visit for the loader's portal to open onto it (components/boot, through
 * data-crescendo), and shows the settled frame if the face is slow; reduced motion and `still` (the
 * room's fallback, which mounts late) show the settled frame too. The heading reads as one sentence.
 */

export const HERO_SENTENCE = 'Say it out loud before it counts.';

/** Line one's words, each with its setting in the stylesheet and the run that carries it. */
const LINE = [
  { word: 'Say', cls: s.w1, run: '' },
  { word: 'it', cls: s.w2, run: s.r2 },
  { word: 'out', cls: s.w3, run: s.r3 },
  { word: 'loud', cls: s.w4, run: s.r4 },
] as const;

const VOICE = voiceBand();

/**
 * Line one's words from `i` on. Each word after the first rides in a run that the word before it
 * pushes along as it swells, so the words never overlap on the way up.
 */
function Words({ i = 0 }: { i?: number }) {
  const w = LINE[i];
  if (!w) return null;
  const word = (
    <span className={cn(s.word, w.cls)}>{i < LINE.length - 1 ? `${w.word} ` : w.word}</span>
  );
  const rest = <Words i={i + 1} />;
  return i === 0 ? (
    <>
      {word}
      {rest}
    </>
  ) : (
    <span className={cn(s.run, w.run)}>
      {word}
      {rest}
    </span>
  );
}

export function HeroTitle({ id, still = false, className }: { id?: string; still?: boolean; className?: string }) {
  return (
    // data-crescendo: the first-visit loader holds this heading's entrance until its portal opens
    <h1 id={id} aria-label={HERO_SENTENCE} data-crescendo="" className={cn(s.title, still && s.still, className)}>
      <span className={s.top}>
        <span className={s.loud}>
          <Words />
        </span>
        <span aria-hidden className={s.voice}>
          <span className={s.window}>
            <svg className={s.trace} viewBox={VOICE_VIEW} preserveAspectRatio="none" focusable="false">
              <path d={VOICE} />
            </svg>
          </span>
        </span>
      </span>{' '}
      <span className={s.firm}>before it counts.</span>
    </h1>
  );
}

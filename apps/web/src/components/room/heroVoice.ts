/**
 * The geometry of the home page's promise (HeroTitle): line one's words as set in
 * heroTitle.module.css (.w1 to .w4), in ems of "loud", and the candidate's voice drawn under them.
 * Measured in Archivo at the stylesheet's settings; re-measure both together if either changes.
 */

/** Where each word's ink runs along line one, and how loud its syllable is. */
export const VOICE_WORDS = [
  { word: 'Say', ink: [0.026, 0.899], level: 0.3 },
  { word: 'it', ink: [1.037, 1.35], level: 0.46 },
  { word: 'out', ink: [1.512, 2.921], level: 0.72 },
  { word: 'loud', ink: [3.176, 5.734], level: 1 },
] as const;
/** Line one's advance (the stylesheet's --w1). */
export const LINE_WIDTH = 5.774;
/** The band's half-height at full voice, and the level meter's sample step. */
export const SWING = 0.13;
const STEP = 0.022;

/** The band's box, in thousandths of an em, centred on the rule. */
export const VOICE_VIEW = `0 ${-SWING * 1000} ${LINE_WIDTH * 1000} ${SWING * 2000}`;

/** A seeded generator, so the server and the browser draw the same voice. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The voice as the live engine draws it (VoiceDisc): a closed band whose top edge follows the level
 * and whose bottom mirrors it, centred on the rule, in thousandths of an em (relative steps, so the
 * markup stays small). Under each word one syllable, a quick attack and a longer fall with the
 * meter's grain in it; nothing between words.
 */
export function voiceBand() {
  const rand = seeded(20260927);
  const u = (v: number) => Math.round(v * 1000);
  let d = '';
  for (const { ink, level } of VOICE_WORDS) {
    const [a, b] = ink;
    const n = Math.max(4, Math.round((b - a) / STEP));
    // x in whole thousandths, so the relative steps add up exactly; the ends sit on the rule
    const xs = Array.from({ length: n + 1 }, (_, i) => u(a + ((b - a) * i) / n));
    const hs = xs.map((_, i) => {
      if (i === 0 || i === n) return 0;
      const envelope = Math.sin(Math.PI * Math.pow(i / n, 0.7));
      return Math.max(6, u(SWING * level * envelope * (0.25 + 0.75 * rand())));
    });
    // along the top edge (up is negative), then back along its mirror under the rule
    let top = '';
    let bottom = '';
    for (let i = 1; i <= n; i++) {
      top += `l${xs[i]! - xs[i - 1]!} ${hs[i - 1]! - hs[i]!}`;
      bottom += `l${xs[n - i]! - xs[n - i + 1]!} ${hs[n - i]! - hs[n - i + 1]!}`;
    }
    d += `M${xs[0]} 0${top}${bottom}Z`;
  }
  return d;
}

'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { spring, useReducedMotion } from 'motion/react';
import { Portrait, portraitSrc, type ExaminerAxis } from '@/components/ui/Portrait';
import { PANEL_EVENT, type PanelMood } from './useAdmission';

/**
 * How much of each 360px head-and-shoulders frame shows above the ledge:
 * down to just under the visor. The five are built differently (a lamp, a
 * tower, a pebble in a headset), so each sinks by its own amount.
 */
const PEEK: Record<ExaminerAxis, number> = {
  correctness: 0.62,
  clarity: 0.53,
  structure: 0.585,
  conciseness: 0.53,
  confidence: 0.815,
};

/**
 * Empty frame beside each figure (left, right), as a fraction of the frame
 * width, so the five stand shoulder to shoulder instead of frame to frame.
 */
const TRIM: Record<ExaminerAxis, readonly [number, number]> = {
  correctness: [0.08, 0.08],
  clarity: [0.23, 0.23],
  structure: [0.1, 0.01],
  conciseness: [0.2, 0.2],
  confidence: [0.02, 0.02],
};

export const PANEL_ORDER: readonly ExaminerAxis[] = ['correctness', 'clarity', 'structure', 'conciseness', 'confidence'];

// The heads come up on a physical spring; the rise is rare, so it may bounce.
const RISE = spring(0.62, 0.32).toString();
const PERK = spring(0.34, 0.3).toString();
const FINE = '(hover: hover) and (pointer: fine)';

/**
 * The panel, peeking over the top edge of the footer like examiners behind
 * a bench. They come up from behind the ledge when the footer arrives, and
 * look pleased while you point at (or tab to) any link in the footer: mouse
 * and keyboard only, so a tap that navigates never flashes a face. They
 * watch the admission slip too: when you are let in, all five hop up
 * pleased (and stay pleased); when the slip is torn at without an email,
 * Structure rises and frowns. Under reduced motion they are simply there,
 * and only their faces change.
 */
export function PanelLedge() {
  const ledge = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion() ?? false;
  const [sunk, setSunk] = useState(false);
  const [pointed, setPointed] = useState(false);
  const [admitted, setAdmitted] = useState(false);
  const [hops, setHops] = useState(0);
  const [frown, setFrown] = useState(false);
  const pleased = pointed || admitted;

  // The admission slip (useAdmission) tells the panel how it went.
  useEffect(() => {
    let timer = 0;
    const onMood = (e: Event) => {
      const mood = (e as CustomEvent<{ mood?: PanelMood }>).detail?.mood;
      if (mood === 'pleased') {
        window.clearTimeout(timer);
        setFrown(false);
        setAdmitted(true);
        setHops((n) => n + 1);
      } else if (mood === 'sceptical') {
        setFrown(true);
        window.clearTimeout(timer);
        timer = window.setTimeout(() => setFrown(false), 2600);
      }
    };
    window.addEventListener(PANEL_EVENT, onMood);
    return () => {
      window.removeEventListener(PANEL_EVENT, onMood);
      window.clearTimeout(timer);
    };
  }, []);

  // Sink them while the footer is out of sight, raise them when it arrives.
  useEffect(() => {
    const el = ledge.current;
    if (!el || reduce) return;
    let raised = false;
    const io = new IntersectionObserver(
      (entries) => {
        // Walk every entry in order (off, then on can arrive together), so they still rise.
        for (const entry of entries) {
          if (entry.isIntersecting) {
            raised = true;
            setSunk(false);
            io.disconnect();
            return;
          }
          if (!raised) setSunk(true);
        }
      },
      { rootMargin: '0px 0px -6% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduce]);

  // Fetch the pleased faces before anyone points, so the swap is instant (mice only:
  // on touch they are fetched when the slip first asks for them).
  useEffect(() => {
    const el = ledge.current;
    if (!el || !window.matchMedia(FINE).matches) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        io.disconnect();
        for (const axis of PANEL_ORDER) new Image().src = portraitSrc(axis, 'pleased');
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Any link in the footer, pointed at with a mouse or reached by keyboard.
  useEffect(() => {
    const foot = ledge.current?.closest('footer');
    if (!foot) return;
    const fine = window.matchMedia(FINE);
    let over = false;
    let focused = false;
    const sync = () => setPointed(over || focused);
    const linkOf = (t: EventTarget | null) => (t instanceof Element ? t.closest('a[href]') : null);
    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !fine.matches) return;
      over = Boolean(linkOf(e.target));
      sync();
    };
    const onLeave = () => {
      over = false;
      sync();
    };
    const onFocusIn = (e: FocusEvent) => {
      const link = linkOf(e.target);
      focused = Boolean(link && link.matches(':focus-visible'));
      sync();
    };
    const onFocusOut = (e: FocusEvent) => {
      if (!linkOf(e.relatedTarget) || !foot.contains(e.relatedTarget as Node)) {
        focused = false;
        sync();
      }
    };
    foot.addEventListener('pointerover', onOver);
    foot.addEventListener('pointerleave', onLeave);
    foot.addEventListener('focusin', onFocusIn);
    foot.addEventListener('focusout', onFocusOut);
    return () => {
      foot.removeEventListener('pointerover', onOver);
      foot.removeEventListener('pointerleave', onLeave);
      foot.removeEventListener('focusin', onFocusIn);
      foot.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  return (
    <div
      ref={ledge}
      className="vv-ledge"
      aria-hidden="true"
      data-sunk={sunk ? '' : undefined}
      data-pleased={pleased ? '' : undefined}
      data-hop={hops ? (hops % 2 ? 'a' : 'b') : undefined}
      data-frown={frown ? '' : undefined}
      style={{ '--rise': RISE, '--perk': PERK } as CSSProperties}
    >
      {PANEL_ORDER.map((axis, i) => {
        const face = axis === 'structure' && frown ? 'sceptical' : pleased ? 'pleased' : 'neutral';
        return (
          <span
            key={axis}
            className="vv-peek"
            data-axis={axis}
            style={{ '--peek': PEEK[axis], '--trim-l': TRIM[axis][0], '--trim-r': TRIM[axis][1], '--i': i } as CSSProperties}
          >
            <span className="vv-peek-head">
              <Portrait axis={axis} state={face} size={360} decorative />
            </span>
          </span>
        );
      })}
    </div>
  );
}

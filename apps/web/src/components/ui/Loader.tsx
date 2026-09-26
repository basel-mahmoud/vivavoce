'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { Leapfrog, Squircle, Waveform } from 'ldrs/react';
import 'ldrs/react/Leapfrog.css';
import 'ldrs/react/Squircle.css';
import 'ldrs/react/Waveform.css';
import { cn } from '@/lib/cn';

/**
 * The three real waits in a round:
 *   listening   four bars, your voice (while the mic is open, before a meter exists)
 *   conferring  three dots hopping over each other: the panel talking it over
 *   marking     a pen line running round a box: the marks being written
 */
export type LoaderKind = 'listening' | 'conferring' | 'marking';

const PX = { sm: 18, md: 28, lg: 44 } as const;

const DEFAULT_LABEL: Record<LoaderKind, string> = {
  listening: 'Listening',
  conferring: 'The panel is conferring',
  marking: 'Marking',
};

export interface LoaderProps {
  kind: LoaderKind;
  /** Visible text beside the glyph, and what screen readers hear. */
  label?: string;
  /** Show the label, or keep it for screen readers only. */
  showLabel?: boolean;
  size?: keyof typeof PX;
  /** Wait this long (ms) before appearing, so quick answers never flash a loader. */
  showAfter?: number;
  /**
   * Just the glyph, hidden from assistive tech: for a control whose own text
   * already says what is happening ("Marking" on a busy button).
   */
  glyphOnly?: boolean;
  className?: string;
}

/**
 * LDRS loaders restyled to the exam script, for waits that really happen.
 * They take the current text colour (paper on coal, ink on paper). Reduced
 * motion swaps in a still glyph of the same shape whose parts fade in turn:
 * the wait still reads as alive, nothing travels. Announced politely.
 */
export function Loader({
  kind,
  label,
  showLabel = true,
  size = 'md',
  showAfter = 0,
  glyphOnly = false,
  className,
}: LoaderProps) {
  const [visible, setVisible] = useState(showAfter <= 0);
  useEffect(() => {
    if (showAfter <= 0) return;
    const t = window.setTimeout(() => setVisible(true), showAfter);
    return () => window.clearTimeout(t);
  }, [showAfter]);

  const text = label ?? DEFAULT_LABEL[kind];
  const px = PX[size];

  return (
    <span
      role={glyphOnly ? undefined : 'status'}
      aria-live={glyphOnly ? undefined : 'polite'}
      aria-hidden={glyphOnly ? true : undefined}
      className={cn('vv-loader', !visible && 'vv-loader-waiting', className)}
      data-kind={kind}
      data-size={size}
    >
      <span className="vv-loader-glyph" aria-hidden="true" style={{ width: px, height: px }}>
        <span className="vv-loader-live">
          {kind === 'listening' ? (
            <Waveform size={px} stroke={Math.max(2, Math.round(px / 9))} speed={1.1} color="currentColor" />
          ) : kind === 'conferring' ? (
            <Leapfrog size={px} speed={2.2} color="currentColor" />
          ) : (
            <Squircle
              size={px}
              stroke={Math.max(2, Math.round(px / 10))}
              strokeLength={0.18}
              bgOpacity={0.16}
              speed={1.1}
              color="currentColor"
            />
          )}
        </span>
        <StillGlyph kind={kind} />
      </span>
      {glyphOnly ? null : (
        <span className={showLabel ? 'vv-loader-label' : 'sr-only'}>{visible ? text : ''}</span>
      )}
    </span>
  );
}

/** The reduced-motion glyph: the same shape, still, parts fading in turn. */
function StillGlyph({ kind }: { kind: LoaderKind }) {
  if (kind === 'listening') {
    return (
      <svg className="vv-loader-still" viewBox="0 0 24 24" fill="currentColor">
        {[
          [2.5, 8],
          [8, 4],
          [13.5, 6],
          [19, 10],
        ].map(([xx, top], i) => (
          <rect key={i} x={xx} y={top} width="2.5" height={24 - top! * 2} rx="1.25" style={{ '--i': i } as CSSProperties} />
        ))}
      </svg>
    );
  }
  if (kind === 'conferring') {
    return (
      <svg className="vv-loader-still" viewBox="0 0 24 24" fill="currentColor">
        {[4, 12, 20].map((cx, i) => (
          <circle key={cx} cx={cx} cy="14" r="2.6" style={{ '--i': i } as CSSProperties} />
        ))}
      </svg>
    );
  }
  return (
    <svg className="vv-loader-still" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <rect x="2.5" y="2.5" width="19" height="19" rx="7" opacity="0.16" />
      <path d="M2.5 12 C2.5 5 5 2.5 12 2.5" style={{ '--i': 0 } as CSSProperties} />
    </svg>
  );
}

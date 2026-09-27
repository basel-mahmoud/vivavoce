/**
 * The examiner's correction in a heading: a word struck through in red pen,
 * and the right word after it. Drawn with CSS (a wobbly SVG stroke), so it
 * lands before any script runs and never leaves "written spoken" behind if
 * one fails. Screen readers hear only the corrected word.
 */
export function Rewrite({ from, to }: { from: string; to: string }) {
  return (
    <span className="vv-rewrite">
      <span className="vv-rewrite-was" aria-hidden="true">
        {from}
        <svg className="vv-rewrite-strike" viewBox="0 0 100 12" preserveAspectRatio="none" focusable="false">
          <path d="M1.5 8.2C18 6.6 34 7.9 51 6.1S82 4.6 98.5 3.4" pathLength={1} />
        </svg>
      </span>{' '}
      <span className="vv-rewrite-now">{to}</span>
    </span>
  );
}

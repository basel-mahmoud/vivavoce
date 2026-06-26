import { rubricAxes } from '@/lib/content';

const demo: Record<string, number> = {
  correctness: 88,
  clarity: 76,
  structure: 64,
  conciseness: 81,
  confidence: 72,
};

function band(score: number) {
  if (score >= 80) return 'var(--sage)';
  if (score >= 65) return 'var(--ember)';
  return 'var(--claret)';
}

/** The five-axis breakdown card — the heart of the feedback experience. */
export function Scorecard({ compact = false }: { compact?: boolean }) {
  const overall = Math.round(
    Object.values(demo).reduce((a, b) => a + b, 0) / Object.values(demo).length,
  );
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-[0_2px_4px_rgba(26,23,20,0.04),0_24px_48px_-24px_rgba(26,23,20,0.25)]">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="kicker">Session score</p>
          <p className="mt-1 text-sm text-muted">Mock Viva · Cardiology</p>
        </div>
        <div className="text-right">
          <span className="tnum font-display text-4xl font-semibold text-ink">
            {overall}
          </span>
          <span className="text-lg text-faint">/100</span>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {rubricAxes.map((axis) => {
          const v = demo[axis.key]!;
          return (
            <div key={axis.key}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-ink">{axis.label}</span>
                <span className="tnum text-muted">{v}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${v}%`, backgroundColor: band(v) }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {!compact && (
        <div className="mt-5 rounded-lg border border-line bg-surface-2/60 p-4">
          <p className="kicker mb-2 text-claret">Focus next</p>
          <p className="text-sm leading-relaxed text-ink">
            Strong recall, but the answer wandered before landing. State your
            structure first — &ldquo;three causes, then management&rdquo; — and the
            examiner can follow you anywhere.
          </p>
        </div>
      )}
    </div>
  );
}

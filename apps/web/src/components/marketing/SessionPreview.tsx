import { Waveform } from '@/components/ui/Waveform';
import { rubricAxes } from '@/lib/content';

const demo: Record<string, number> = {
  correctness: 88,
  clarity: 76,
  structure: 64,
  conciseness: 81,
  confidence: 72,
};

/**
 * A phone-framed glimpse of a live session: the examiner's question, the live
 * waveform while you answer, and the score landing underneath. The hero's
 * centrepiece — it shows, rather than tells, what the product feels like.
 */
export function SessionPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      {/* phone frame */}
      <div className="relative rounded-[2.5rem] border border-line bg-surface p-3 shadow-[0_8px_16px_rgba(26,23,20,0.08),0_48px_80px_-32px_rgba(26,23,20,0.45)]">
        <div className="overflow-hidden rounded-[2rem] bg-bg">
          {/* status bar */}
          <div className="flex items-center justify-between px-5 pb-2 pt-3 text-[11px] text-faint">
            <span className="tnum">9:41</span>
            <span className="h-1.5 w-1.5 rounded-full bg-live" />
          </div>

          <div className="px-5 pb-6">
            <p className="kicker text-claret">Mock Viva · Q3</p>
            <p className="mt-2 font-display text-lg leading-snug text-ink">
              Walk me through your approach to a patient with acute chest pain.
            </p>

            {/* live answering */}
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-live/15">
                <span className="h-3 w-3 rounded-sm bg-live" />
              </span>
              <div className="h-7 flex-1">
                <Waveform bars={28} live color="var(--ember)" />
              </div>
              <span className="tnum text-xs text-muted">0:18</span>
            </div>

            {/* mini score */}
            <div className="mt-5 rounded-xl border border-line bg-surface p-4">
              <div className="flex items-baseline justify-between">
                <span className="kicker">Last answer</span>
                <span className="tnum font-display text-2xl font-semibold text-ink">
                  76<span className="text-sm text-faint">/100</span>
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {rubricAxes.slice(0, 3).map((a) => (
                  <div key={a.key} className="flex items-center gap-2">
                    <span className="w-20 text-[11px] text-muted">{a.label}</span>
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-ember"
                        style={{ width: `${demo[a.key]}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* floating focus chip */}
      <div className="absolute -right-4 bottom-16 hidden rotate-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg sm:block">
        <span className="text-claret">↑ Confidence</span>{' '}
        <span className="text-muted">+14 this week</span>
      </div>
    </div>
  );
}

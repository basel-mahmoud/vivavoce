import type { Metadata } from 'next';
import { SignInButton } from '@clerk/nextjs';
import { PageHero } from '@/components/site/PageHero';
import { getAuthContext } from '@/lib/auth/context';
import { getUserStats, type UserStats } from '@/lib/db/practice.repo';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your practice, marked: streak, five-axis averages, and session history.',
};

export const dynamic = 'force-dynamic';

/* Same ratio bucketing as the mobile heat grid, on the vermilion ramp. */
const RAMP = ['#E9E7E1', '#FFD2C2', '#FF4D26', '#D63A17'] as const;
function level(count: number, max: number): 0 | 1 | 2 | 3 {
  if (count === 0 || max === 0) return 0;
  const r = count / max;
  if (r <= 0.34) return 1;
  if (r <= 0.67) return 2;
  return 3;
}

function HeatGrid({ heatmap }: { heatmap: UserStats['heatmap'] }) {
  const byDay = new Map(heatmap.map((d) => [d.day, d.count]));
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const weekday = today.getDay();
  const max = Math.max(1, ...heatmap.map((d) => d.count));
  const cols: { key: string; count: number; future: boolean }[][] = [];
  for (let w = 11; w >= 0; w--) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(today.getTime() - (w * 7 + (weekday - d)) * 86_400_000);
      const key = date.toISOString().slice(0, 10);
      col.push({ key, count: byDay.get(key) ?? 0, future: date.getTime() > today.getTime() });
    }
    cols.push(col);
  }
  return (
    <div className="flex justify-center gap-[3px]">
      {cols.map((col, i) => (
        <div key={i} className="flex flex-col gap-[3px]">
          {col.map((cell) => (
            <div
              key={cell.key}
              title={cell.future ? undefined : `${cell.key}: ${cell.count}`}
              className="h-3.5 w-3.5 rounded-[3px]"
              style={{
                backgroundColor: cell.future ? 'transparent' : RAMP[level(cell.count, max)],
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

const AXES = [
  ['correctness', 'Correctness'],
  ['clarity', 'Clarity'],
  ['structure', 'Structure'],
  ['conciseness', 'Conciseness'],
  ['confidence', 'Confidence'],
] as const;

export default async function DashboardPage() {
  const ctx = await getAuthContext();

  if (!ctx) {
    return (
      <>
        <PageHero
          title="Your practice, marked."
          intro="Sign in with the same account you use in the app: your streak, five-axis averages, and session history live here too."
        />
        <section className="bg-canvas text-ink">
          <div className="mx-auto w-full max-w-[1360px] px-4 pb-24 sm:px-6">
            <SignInButton mode="modal">
              <button
                type="button"
                className="pressable inline-flex h-12 cursor-pointer items-center rounded-full bg-verm px-7 font-bold text-ink"
              >
                Sign in to see your marks
              </button>
            </SignInButton>
          </div>
        </section>
      </>
    );
  }

  const stats = await getUserStats(ctx.userId);
  const bars = AXES.map(([key, label]) => ({ label, value: stats.axisAverages[key] ?? 0 }));

  return (
    <>
      <PageHero
        title="Your practice, marked."
        intro="The same account as the app: everything below is your real history, live from the database."
      />
      <section className="bg-canvas text-ink">
        <div className="mx-auto w-full max-w-[1360px] px-4 pb-24 sm:px-6">
          {/* marks row */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[24px] bg-inktile p-6 text-paper">
              <p className="marks text-xs text-paper-mut">OVERALL AVERAGE</p>
              <p className="display mt-2 text-6xl">{stats.hasData ? stats.overall : '–'}</p>
            </div>
            <div className="rounded-[24px] border border-line bg-card p-6">
              <p className="marks text-xs text-ink-faint">STREAK</p>
              <p className="display mt-2 text-6xl">{stats.streak.current}d</p>
              <p className="marks mt-1 text-xs text-ink-mut">best {stats.streak.longest}d</p>
            </div>
            <div className="rounded-[24px] border border-line bg-card p-6">
              <p className="marks text-xs text-ink-faint">THIS WEEK</p>
              <p className="display mt-2 text-6xl">{stats.minutesThisWeek}m</p>
              <p className="marks mt-1 text-xs text-ink-mut">goal 60m</p>
            </div>
            <div className="rounded-[24px] bg-cobalt p-6 text-paper">
              <p className="marks text-xs text-paper-mut">LIFETIME</p>
              <p className="display mt-2 text-6xl">{stats.answersTotal}</p>
              <p className="marks mt-1 text-xs text-paper-mut">
                answers · {stats.sessionsTotal} sessions
              </p>
            </div>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {/* heat */}
            <div className="rounded-[24px] border border-line bg-card p-6">
              <p className="marks text-xs text-ink-faint">PRACTICE HEAT · 12 WEEKS</p>
              <div className="mt-5">
                <HeatGrid heatmap={stats.heatmap} />
              </div>
            </div>

            {/* axes */}
            <div className="rounded-[24px] border border-line bg-card p-6">
              <p className="marks text-xs text-ink-faint">AVERAGE BY AXIS</p>
              <div className="mt-5 flex flex-col gap-4">
                {bars.map((b) => (
                  <div key={b.label}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-bold">{b.label}</span>
                      <span className="marks text-xs text-ink-mut">{b.value}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-card-2">
                      <div
                        className="h-full rounded-full bg-verm"
                        style={{ width: `${Math.max(0, Math.min(100, b.value))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* recent sessions */}
          <div className="mt-3 rounded-[24px] border border-line bg-card p-6">
            <p className="marks text-xs text-ink-faint">RECENT SESSIONS</p>
            {stats.recent.length === 0 ? (
              <div className="mt-5">
                <p className="text-lg font-bold">No sessions yet.</p>
                <p className="mt-1 text-ink-mut">
                  Answer a few questions out loud in the app and this fills in.
                </p>
                <a
                  href="/download/apk"
                  className="pressable mt-5 inline-flex h-11 items-center rounded-full bg-ink px-6 text-sm font-bold text-paper"
                >
                  Download the Android beta
                </a>
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {stats.recent.map((s) => (
                  <li key={s.id} className="flex items-center gap-4 py-3">
                    <span className="marks grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-card-2 text-sm">
                      {s.overall}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{s.deckTitle}</p>
                      <p className="marks text-xs text-ink-mut">
                        {s.mode} · fix {s.weakest} · {s.when}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="marks mt-6 text-center text-xs text-ink-faint">
            SCORES ARE GUIDANCE, NOT GRADES.
          </p>
        </div>
      </section>
    </>
  );
}

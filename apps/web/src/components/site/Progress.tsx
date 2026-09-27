import type { CSSProperties, ReactNode } from 'react';
import type { UserStats } from '@/lib/db/practice.repo';
import { Marks } from '@/components/ui/Marks';
import { RedPen } from '@/components/ui/RedPen';
import { PanelOfMarks } from './PanelOfMarks';
import { AXIS_LABEL, AXIS_ORDER, axisLabel, extremes, heatColumns, heatLevel, modeName } from './progress-data';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEK_GOAL = 60;

/** Tally marks in blue ink, grouped in fives, the way you would count days on a desk. */
function Tally({ n }: { n: number }) {
  const shown = Math.max(0, Math.min(n, 30));
  const groups = Math.ceil(shown / 5);
  if (!groups) return <span className="vv-tally-none">No streak yet</span>;
  // A little hand wobble, fixed per stroke so the server and the page agree.
  const wob = (k: number) => ((k * 37) % 7) / 7 - 0.5;
  return (
    <svg className="vv-tally" viewBox={`0 0 ${groups * 32} 30`} style={{ '--groups': groups } as CSSProperties} aria-hidden="true">
      {Array.from({ length: groups }, (_, g) => {
        const count = Math.min(5, shown - g * 5);
        const x0 = g * 32 + 4;
        return (
          <g key={g}>
            {Array.from({ length: Math.min(4, count) }, (_, i) => {
              const k = g * 5 + i;
              return <path key={i} d={`M${x0 + i * 5.5 + wob(k)} ${4 + wob(k + 3)} L${x0 + i * 5.5 - wob(k + 1)} ${26 + wob(k + 2)}`} />;
            })}
            {count === 5 ? <path d={`M${x0 - 3} ${22 + wob(g)} L${x0 + 20} ${7 - wob(g + 1)}`} /> : null}
          </g>
        );
      })}
    </svg>
  );
}

/** Minutes this week against the goal, measured on a ruler in blue ink. */
function WeekRuler({ minutes }: { minutes: number }) {
  const to = Math.min(1, Math.max(0, minutes / WEEK_GOAL));
  return (
    <div className="vv-ruler" aria-hidden="true" style={{ '--to': to } as CSSProperties}>
      <div className="vv-ruler-scale" />
      <div className="vv-ruler-ink" />
      <div className="vv-ruler-labels">
        <span>0</span>
        <span>30</span>
        <span>{WEEK_GOAL} min</span>
      </div>
    </div>
  );
}

function HeatGrid({ heatmap, today }: { heatmap: UserStats['heatmap']; today: Date }) {
  const cols = heatColumns(heatmap, today);
  const max = Math.max(1, ...heatmap.map((d) => d.count));
  const days = heatmap.filter((d) => d.count > 0).length;
  const total = heatmap.reduce((sum, d) => sum + d.count, 0);
  // A month's name over the first week that starts in it (not over the last column).
  const labels = cols.map((col, c) => {
    const month = col[0]!.month;
    const prev = c > 0 ? cols[c - 1]![0]!.month : -1;
    return month !== prev && c < 11 ? MONTHS[month] : '';
  });
  return (
    <figure className="vv-heat">
      <div className="vv-heat-grid" role="img" aria-label={`${total} answers on ${days} of the last 84 days`}>
        <span className="vv-heat-days" aria-hidden="true">
          <span />
          <span>Mon</span>
          <span />
          <span>Wed</span>
          <span />
          <span>Fri</span>
          <span />
        </span>
        {cols.map((col, c) => {
          const first = col[0]!;
          return (
            <span key={first.key} className="vv-heat-col" aria-hidden="true">
              <span className="vv-heat-month">{labels[c]}</span>
              {col.map((cell) => (
                <span
                  key={cell.key}
                  className="vv-heat-cell"
                  data-level={cell.future ? undefined : heatLevel(cell.count, max)}
                  data-future={cell.future ? '' : undefined}
                  data-today={cell.today ? '' : undefined}
                  title={cell.future ? undefined : `${cell.key}: ${cell.count} ${cell.count === 1 ? 'answer' : 'answers'}`}
                />
              ))}
            </span>
          );
        })}
      </div>
      <figcaption className="vv-heat-key">
        <span>Less</span>
        {[0, 1, 2, 3].map((l) => (
          <span key={l} className="vv-heat-cell" data-level={l} aria-hidden="true" />
        ))}
        <span>More</span>
      </figcaption>
    </figure>
  );
}

function Cell({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={className ? `vv-dash-cell ${className}` : 'vv-dash-cell'}>
      <h3 className="vv-dash-label">{title}</h3>
      {children}
    </div>
  );
}

/**
 * The progress board: the panel with your averages and the overall mark
 * circled at the top of the script, then your streak, your week, the heat
 * of the last twelve weeks and the sessions register. Marks are guidance.
 */
export function ProgressBoard({ stats, example = false }: { stats: UserStats; example?: boolean }) {
  const today = new Date();
  const values = AXIS_ORDER.map((k) => stats.axisAverages[k] ?? 0);
  const { lo } = extremes(values);
  const weakest = AXIS_LABEL[AXIS_ORDER[lo]!];
  const has = stats.hasData;

  return (
    <div className="vv-dash">
      <section aria-labelledby="dash-panel-title" className="vv-dash-sheet">
        <div className="vv-dash-sheet-head">
          <div>
            <h2 id="dash-panel-title" className="vv-dash-title">
              Average by axis
            </h2>
            <p className="vv-dash-sub">
              {has ? (
                <>
                  Across <span className="tnum">{stats.answersTotal}</span> marked answers.{' '}
                  <span className="text-verm-text font-bold">{weakest}</span> is the one to fix first.
                </>
              ) : (
                'Answer a few questions in the app and the panel fills in.'
              )}
            </p>
          </div>
          <p className="vv-dash-overall">
            <span className="vv-dash-overall-label">Overall</span>
            {/* The total, circled at the top of the script, the way examiners write it. */}
            <RedPen mark="circle" play="inview" delay={1100} className="vv-dash-overall-mark">
              <Marks value={has ? stats.overall : 0} label={`Overall ${has ? stats.overall : 0} out of 100`} />
            </RedPen>
          </p>
        </div>

        <ul className="sr-only">
          {AXIS_ORDER.map((k, i) => (
            <li key={k}>
              {AXIS_LABEL[k]}: {values[i]} out of 100{i === lo ? ', the one to fix first' : ''}
            </li>
          ))}
        </ul>
        <PanelOfMarks averages={stats.axisAverages} />
        <p className="vv-dash-note">
          {example ? 'Example marks, not yours. ' : ''}Scores are guidance, not grades.
        </p>
      </section>

      <div className="vv-dash-cells">
        <Cell title="Streak">
          <p className="vv-dash-figure">
            <Marks value={stats.streak.current} />
            <span className="vv-dash-unit">{stats.streak.current === 1 ? 'day' : 'days'}</span>
          </p>
          <Tally n={stats.streak.current} />
          <p className="vv-dash-aside">
            Best run <span className="marks">{stats.streak.longest}</span> days
          </p>
        </Cell>
        <Cell title="This week">
          <p className="vv-dash-figure">
            <Marks value={stats.minutesThisWeek} />
            <span className="vv-dash-unit">minutes</span>
          </p>
          <WeekRuler minutes={stats.minutesThisWeek} />
          <p className="vv-dash-aside">
            Goal <span className="marks">{WEEK_GOAL}</span> minutes of speaking
          </p>
        </Cell>
        <Cell title="Lifetime">
          <p className="vv-dash-figure">
            <Marks value={stats.answersTotal} />
            <span className="vv-dash-unit">answers</span>
          </p>
          <p className="vv-dash-aside">
            In <span className="marks">{stats.sessionsTotal}</span> sessions
          </p>
        </Cell>
      </div>

      <div className="vv-dash-split">
        <section aria-labelledby="dash-heat-title" className="vv-dash-card">
          <h2 id="dash-heat-title" className="vv-dash-label">
            Practice heat, last 12 weeks
          </h2>
          <HeatGrid heatmap={stats.heatmap} today={today} />
        </section>

        <section aria-labelledby="dash-recent-title" className="vv-dash-card">
          <h2 id="dash-recent-title" className="vv-dash-label">
            Recent sessions
          </h2>
          {stats.recent.length === 0 ? (
            <div className="mt-5">
              <p className="text-lg font-bold">No sessions yet.</p>
              <p className="mt-1 text-ink-mut">Answer a few questions out loud in the app and this fills in.</p>
              <a href="/download/apk" className="btn btn-primary mt-5">
                Download the Android beta
              </a>
            </div>
          ) : (
            <ol className="vv-register">
              {stats.recent.map((s) => (
                <li key={s.id} className="vv-register-row">
                  <span className="vv-coin" aria-hidden="true">
                    <span className="marks">{s.overall}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{s.deckTitle}</span>
                    <span className="block text-sm text-ink-mut">
                      {modeName(s.mode)}. <span className="font-bold text-verm-text">Fix {axisLabel(s.weakest).toLowerCase()}</span>
                    </span>
                  </span>
                  <span className="vv-register-when">{s.when}</span>
                  <span className="sr-only">Overall {s.overall} out of 100.</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

/**
 * Per-user practice bookkeeping: streaks + daily analytics, plus the aggregated
 * stats the mobile dashboard reads. Everything is scoped by the trusted
 * (tenantId, userId) from the auth context — no cross-user reads.
 */
import { and, eq } from 'drizzle-orm';
import { db, schema, sqlClient } from './client';

/** Today's date in the user's timezone, as YYYY-MM-DD. */
function todayInTz(tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

/**
 * Record one completed answer: advance the streak (calendar-day based) and roll
 * up today's analytics row. Best-effort — never throws into the request path.
 */
export async function recordPractice(
  userId: string,
  tenantId: string,
  timezone: string,
  input: { durationMs: number | null; overall: number; confidence: number },
): Promise<void> {
  const today = todayInTz(timezone);
  const minutes = Math.max(0, Math.round((input.durationMs ?? 0) / 60_000));

  try {
    // ── streak ──
    const [streak] = await db
      .select()
      .from(schema.streaks)
      .where(eq(schema.streaks.userId, userId))
      .limit(1);

    if (!streak) {
      await db.insert(schema.streaks).values({
        userId,
        current: 1,
        longest: 1,
        lastPracticedOn: today,
      });
    } else if (streak.lastPracticedOn !== today) {
      const gap = streak.lastPracticedOn ? daysBetween(streak.lastPracticedOn, today) : 999;
      const current = gap === 1 ? streak.current + 1 : 1;
      await db
        .update(schema.streaks)
        .set({
          current,
          longest: Math.max(streak.longest, current),
          lastPracticedOn: today,
          updatedAt: new Date(),
        })
        .where(eq(schema.streaks.userId, userId));
    }

    // ── daily rollup (upsert by user+day, running averages) ──
    const [existing] = await db
      .select()
      .from(schema.analyticsDaily)
      .where(
        and(eq(schema.analyticsDaily.userId, userId), eq(schema.analyticsDaily.day, today)),
      )
      .limit(1);

    if (!existing) {
      await db.insert(schema.analyticsDaily).values({
        tenantId,
        userId,
        day: today,
        answersCount: 1,
        practiceMinutes: minutes,
        avgOverall: input.overall,
        avgConfidence: input.confidence,
      });
    } else {
      const n = existing.answersCount;
      const avg = (prev: number | null, val: number) => ((prev ?? val) * n + val) / (n + 1);
      await db
        .update(schema.analyticsDaily)
        .set({
          answersCount: n + 1,
          practiceMinutes: existing.practiceMinutes + minutes,
          avgOverall: avg(existing.avgOverall, input.overall),
          avgConfidence: avg(existing.avgConfidence, input.confidence),
        })
        .where(eq(schema.analyticsDaily.id, existing.id));
    }
  } catch (err) {
    console.error('record_practice_failed', { error: String(err) });
  }
}

export interface UserStats {
  streak: { current: number; longest: number };
  overall: number;
  overallDelta: number;
  sessionsTotal: number;
  answersTotal: number;
  minutesThisWeek: number;
  axisAverages: Record<string, number>;
  confidenceTrend: number[];
  /** Per-day answer counts for the last 12 weeks (practice heat grid). */
  heatmap: { day: string; count: number }[];
  recent: {
    id: string;
    deckTitle: string;
    mode: string;
    overall: number;
    weakest: string;
    when: string;
  }[];
  hasData: boolean;
}

const num = (v: unknown): number => (v == null ? 0 : Math.round(Number(v)));

/** Aggregate the signed-in user's real progress. All queries are user-scoped
 *  via parameterized `${userId}` (safe from injection). */
export async function getUserStats(userId: string): Promise<UserStats> {
  const aggRows = (await sqlClient`
    select
      count(*)::int as answers,
      coalesce(round(avg(f.overall_score)), 0)::int as overall,
      coalesce(round(avg(f.score_correctness)), 0)::int as correctness,
      coalesce(round(avg(f.score_clarity)), 0)::int as clarity,
      coalesce(round(avg(f.score_structure)), 0)::int as structure,
      coalesce(round(avg(f.score_conciseness)), 0)::int as conciseness,
      coalesce(round(avg(f.score_confidence)), 0)::int as confidence
    from ai_feedback f join answers a on a.id = f.answer_id
    where a.user_id = ${userId}
  `) as Record<string, unknown>[];
  const a = aggRows[0] ?? {};

  const [streak] = await db
    .select()
    .from(schema.streaks)
    .where(eq(schema.streaks.userId, userId))
    .limit(1);

  const sessRows = (await sqlClient`
    select count(*)::int as n from practice_sessions where user_id = ${userId}
  `) as Record<string, unknown>[];

  const weekRows = (await sqlClient`
    select coalesce(sum(practice_minutes), 0)::int as mins
    from analytics_daily where user_id = ${userId} and day >= (current_date - interval '7 day')
  `) as Record<string, unknown>[];

  const trendRows = (await sqlClient`
    select coalesce(round(avg(f.score_confidence)), 0)::int as c
    from ai_feedback f join answers a on a.id = f.answer_id
    where a.user_id = ${userId}
    group by date_trunc('day', a.created_at)
    order by date_trunc('day', a.created_at) desc
    limit 7
  `) as Record<string, unknown>[];
  const confidenceTrend = trendRows.map((r) => num(r.c)).reverse();

  const recentRows = (await sqlClient`
    select s.id, s.mode, s.overall_score as overall, s.started_at, d.title as deck_title
    from practice_sessions s left join decks d on d.id = s.deck_id
    where s.user_id = ${userId}
    order by s.started_at desc
    limit 6
  `) as Record<string, unknown>[];

  const heatRows = (await sqlClient`
    select day::text as day, answers_count::int as count
    from analytics_daily
    where user_id = ${userId} and day >= (current_date - interval '83 day')
    order by day asc
  `) as Record<string, unknown>[];

  const axisAverages = {
    correctness: num(a.correctness),
    clarity: num(a.clarity),
    structure: num(a.structure),
    conciseness: num(a.conciseness),
    confidence: num(a.confidence),
  };
  const weakest =
    Object.entries(axisAverages).sort((x, y) => x[1] - y[1])[0]?.[0] ?? 'structure';

  return {
    streak: { current: streak?.current ?? 0, longest: streak?.longest ?? 0 },
    overall: num(a.overall),
    overallDelta:
      confidenceTrend.length >= 2
        ? (confidenceTrend[confidenceTrend.length - 1] ?? 0) - (confidenceTrend[0] ?? 0)
        : 0,
    sessionsTotal: num(sessRows[0]?.n),
    answersTotal: num(a.answers),
    minutesThisWeek: num(weekRows[0]?.mins),
    axisAverages,
    confidenceTrend,
    heatmap: heatRows.map((r) => ({ day: String(r.day), count: num(r.count) })),
    recent: recentRows.map((r) => ({
      id: String(r.id),
      deckTitle: (r.deck_title as string) ?? 'Practice session',
      mode: String(r.mode),
      overall: num(r.overall),
      weakest,
      when: relTime(new Date(r.started_at as string)),
    })),
    hasData: num(a.answers) > 0,
  };
}

function relTime(d: Date): string {
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toISOString().slice(0, 10);
}

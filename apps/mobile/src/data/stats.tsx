import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Api, UserStats } from '@/lib/api';

/**
 * Live per-user progress from GET /api/v1/me/stats. Everything a new account sees
 * is honest zeros (hasData=false) until they actually practise — no illustrative
 * numbers. Screens read `useStats()` and refresh on focus after a session.
 */
export const EMPTY_STATS: UserStats = {
  streak: { current: 0, longest: 0 },
  overall: 0,
  overallDelta: 0,
  sessionsTotal: 0,
  answersTotal: 0,
  minutesThisWeek: 0,
  axisAverages: { correctness: 0, clarity: 0, structure: 0, conciseness: 0, confidence: 0 },
  confidenceTrend: [],
  recent: [],
  hasData: false,
};

export const WEEKLY_GOAL_MINUTES = 60;

export function weeklyProgress(minutes: number): number {
  return Math.max(0, Math.min(1, minutes / WEEKLY_GOAL_MINUTES));
}

interface Ctx {
  stats: UserStats;
  loading: boolean;
  refresh: () => Promise<void>;
}

const StatsContext = createContext<Ctx | null>(null);

export function StatsProvider({
  api,
  enabled,
  children,
}: {
  api: Api | null;
  enabled: boolean;
  children: React.ReactNode;
}) {
  const [stats, setStats] = useState<UserStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!api || !enabled) return;
    setLoading(true);
    try {
      const res = await api.getStats();
      if (res.ok) setStats(res.data.stats);
    } catch {
      // Keep the last-known stats; a transient failure shouldn't blank the screen.
    } finally {
      setLoading(false);
    }
  }, [api, enabled]);

  useEffect(() => {
    if (enabled) void refresh();
    else setStats(EMPTY_STATS);
  }, [enabled, refresh]);

  const value = useMemo(() => ({ stats, loading, refresh }), [stats, loading, refresh]);
  return <StatsContext.Provider value={value}>{children}</StatsContext.Provider>;
}

export function useStats(): Ctx {
  return (
    useContext(StatsContext) ?? { stats: EMPTY_STATS, loading: false, refresh: async () => {} }
  );
}

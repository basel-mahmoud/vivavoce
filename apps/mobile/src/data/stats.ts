/**
 * Illustrative practice stats for the dashboard and progress screens. These are
 * sample values so the app reads as a real, used product; they are replaced by
 * the analytics API (GET /api/v1/sessions + rollups) once a signed-in user
 * accrues sessions. Kept in one place so every screen agrees.
 */

export interface SessionRecord {
  id: string;
  deckId: string;
  deckTitle: string;
  mode: string;
  overall: number;
  weakest: string;
  when: string; // human label
}

export const stats = {
  streakDays: 4,
  longestStreak: 9,
  minutesThisWeek: 38,
  weeklyGoalMinutes: 60,
  sessionsTotal: 27,
  answersTotal: 118,
  overall: 76,
  overallDelta: 8,
  confidenceTrend: [52, 58, 55, 63, 67, 72, 79],
  axisAverages: {
    correctness: 84,
    clarity: 74,
    structure: 61,
    conciseness: 79,
    confidence: 72,
  } as Record<string, number>,
  topicMastery: [
    { name: 'Cardiology', pct: 72 },
    { name: 'Behavioural', pct: 64 },
    { name: 'System design', pct: 48 },
    { name: 'Moot advocacy', pct: 55 },
  ],
  weakestAxis: 'structure',
  examName: 'Cardiology viva',
  examInDays: 6,
  recent: [
    { id: 's1', deckId: 'deck-cardio', deckTitle: 'Cardiology Viva Core', mode: 'mock_viva', overall: 74, weakest: 'structure', when: 'Today' },
    { id: 's2', deckId: 'deck-behavioural', deckTitle: 'Behavioural Interview', mode: 'interview', overall: 81, weakest: 'conciseness', when: 'Yesterday' },
    { id: 's3', deckId: 'deck-speaking', deckTitle: 'Explain It Simply', mode: 'explain', overall: 88, weakest: 'confidence', when: '2 days ago' },
    { id: 's4', deckId: 'deck-system-design', deckTitle: 'System Design Fundamentals', mode: 'mock_viva', overall: 63, weakest: 'structure', when: '3 days ago' },
  ] as SessionRecord[],
};

export function weeklyProgress(): number {
  return Math.min(1, stats.minutesThisWeek / stats.weeklyGoalMinutes);
}

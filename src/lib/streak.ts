// A daily streak: how many days in a row someone has played. Days are text keys
// like "2026-11-04", the same way the rest of the app stores them.
export type Streak = { count: number; lastDay: string | null }

function dayBefore(dayKey: string): string {
  const date = new Date(`${dayKey}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

export function playedToday(streak: Streak, today: string): Streak {
  if (streak.lastDay === today) return streak
  return { count: streak.lastDay === dayBefore(today) ? streak.count + 1 : 1, lastDay: today }
}

// What to show today. A streak that was missed reads as 0 without shaming anyone.
export function currentCount(streak: Streak, today: string): number {
  return streak.lastDay === today || streak.lastDay === dayBefore(today) ? streak.count : 0
}

// Three stars for all right on the first try, two for at least half, one for finishing.
export function starsFor(rightFirstTry: number, total: number): number {
  if (total > 0 && rightFirstTry === total) return 3
  return total > 0 && rightFirstTry / total >= 0.5 ? 2 : 1
}

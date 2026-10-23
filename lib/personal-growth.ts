export const GROWTH_CATEGORIES = [
  { value: "reading", label: "Reading" },
  { value: "podcast", label: "Podcast" },
  { value: "course", label: "Course" },
  { value: "practice", label: "Practice" },
  { value: "other", label: "Other" },
] as const

export type GrowthCategory = typeof GROWTH_CATEGORIES[number]["value"]

export interface GrowthLog {
  id: string
  user_id: string
  activity_date: string
  category: GrowthCategory
  title: string
  duration_minutes: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export const GROWTH_STAGES = [
  { minDays: 0, label: "Getting Started" },
  { minDays: 7, label: "Building Habits" },
  { minDays: 30, label: "Consistent Learner" },
  { minDays: 90, label: "Lifelong Habit" },
  { minDays: 180, label: "Long-term Growth" },
] as const

export function getGrowthToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now)
}

export function isGrowthDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

// Date-only arithmetic stays independent of the browser/server timezone.
export function shiftGrowthDate(date: string, days: number): string {
  const shifted = new Date(`${date}T00:00:00Z`)
  shifted.setUTCDate(shifted.getUTCDate() + days)
  return shifted.toISOString().slice(0, 10)
}

export function getGrowthStage(activeDays: number): number {
  let stage = 0
  for (let index = 1; index < GROWTH_STAGES.length; index++) {
    if (activeDays >= GROWTH_STAGES[index].minDays) stage = index
  }
  return stage
}

export function calculateGrowthStats(logs: Pick<GrowthLog, "activity_date">[], today: string) {
  const completed = logs.filter(({ activity_date }) => isGrowthDate(activity_date) && activity_date <= today)
  const dates = new Set(completed.map(({ activity_date }) => activity_date))
  const weekStart = shiftGrowthDate(today, -6)
  return {
    activeDays: dates.size,
    monthDays: [...dates].filter(date => date.startsWith(today.slice(0, 7))).length,
    last7Days: [...dates].filter(date => date >= weekStart).length,
    totalActivities: completed.length,
  }
}

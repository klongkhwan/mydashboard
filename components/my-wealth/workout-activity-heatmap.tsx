"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { Flame, Clock, Award } from "lucide-react"
import { cn } from "@/lib/utils"
import { isWorkoutCompleted } from "@/lib/workout-presets"
import { formatDateDDMMYYYY } from "@/components/dashboard/format"

export interface HeatmapWorkout {
  id: string
  workout_date: string
  title: string
  duration_minutes: number
  total_volume_kg: number | string
  exercises: any[]
  notes?: string | null
  created_at: string
}

interface HeatmapDay {
  dateStr: string // YYYY-MM-DD
  dateObj: Date
  dayOfWeek: number // 0-6 (Sun-Sat)
  workouts: HeatmapWorkout[]
  completedWorkouts: HeatmapWorkout[]
  totalMinutes: number
  level: 0 | 1 | 2 | 3 | 4
  isToday: boolean
}

interface WorkoutActivityHeatmapProps {
  workouts: HeatmapWorkout[]
  weeksCount?: number // default auto-fits card width
  onSelectWorkout: (workout: HeatmapWorkout) => void
  onSelectEmptyDate: (dateStr: string) => void
  className?: string
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

// Color levels matching the user reference image (Spotify / GitHub Dark aesthetic)
const LEVEL_COLORS: Record<number, string> = {
  0: "bg-[#232323] hover:bg-[#2e2e2e]",
  1: "bg-[#0e4429] hover:bg-[#15603a]", // 1-20 min
  2: "bg-[#006d32] hover:bg-[#00873e]", // 21-40 min
  3: "bg-[#26a641] hover:bg-[#2fc44d]", // 41-60 min
  4: "bg-[#39d353] hover:bg-[#4df26b]", // >60 min
}

const formatYmd = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function WorkoutActivityHeatmap({
  workouts,
  weeksCount: initialWeeksCount = 28,
  onSelectWorkout,
  onSelectEmptyDate,
  className = "",
}: WorkoutActivityHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [fitWeeks, setFitWeeks] = useState<number>(initialWeeksCount)

  // Dynamically calculate exact number of weeks that fit the container with ZERO scroll
  useEffect(() => {
    if (!containerRef.current) return
    const updateWeeks = () => {
      if (!containerRef.current) return
      const width = containerRef.current.clientWidth
      const dayLabelWidth = 24 // 20px day labels + margin
      const cellPitch = 18 // 14px cell (w-3.5) + 4px gap (gap-1)
      const availableForWeeks = width - dayLabelWidth
      if (availableForWeeks > 100) {
        const computed = Math.max(12, Math.min(52, Math.floor(availableForWeeks / cellPitch)))
        setFitWeeks(computed)
      }
    }

    updateWeeks()
    const observer = new ResizeObserver(updateWeeks)
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // Map workouts by date string
  const workoutsByDate = useMemo(() => {
    const map = new Map<string, HeatmapWorkout[]>()
    for (const w of workouts) {
      if (!w.workout_date) continue
      const existing = map.get(w.workout_date) || []
      existing.push(w)
      map.set(w.workout_date, existing)
    }
    return map
  }, [workouts])

  // Build grid: columns = weeks, rows = 7 days (Sun-Sat)
  const { weeks, monthLabels, totalTrainedMinutes, totalSessionsYear } = useMemo(() => {
    const activeWeeks = fitWeeks
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = formatYmd(today)

    // Find the ending Saturday of current week to align columns
    const endOffset = 6 - today.getDay()
    const endDate = new Date(today)
    endDate.setDate(today.getDate() + endOffset)

    // Start date = endDate - (activeWeeks * 7 - 1) days
    const totalDays = activeWeeks * 7
    const startDate = new Date(endDate)
    startDate.setDate(endDate.getDate() - totalDays + 1)

    const generatedWeeks: HeatmapDay[][] = []
    const monthsMap: Array<{ weekIndex: number; monthName: string }> = []
    let currentWeek: HeatmapDay[] = []
    let lastMonth = -1
    let trainedMinSum = 0
    let sessionCountYear = 0

    const oneYearAgo = new Date(today)
    oneYearAgo.setFullYear(today.getFullYear() - 1)

    const iter = new Date(startDate)
    let currentWeekIdx = 0

    while (iter <= endDate) {
      const dateStr = formatYmd(iter)
      const dayWorkouts = workoutsByDate.get(dateStr) || []
      const completedDayWorkouts = dayWorkouts.filter(isWorkoutCompleted)
      const dayMinutes = completedDayWorkouts.reduce((sum, w) => sum + (Number(w.duration_minutes) || 0), 0)

      if (iter >= oneYearAgo) {
        trainedMinSum += dayMinutes
        sessionCountYear += completedDayWorkouts.length
      }

      // Determine activity level (0-4) strictly from completed workouts
      let level: 0 | 1 | 2 | 3 | 4 = 0
      if (completedDayWorkouts.length > 0) {
        if (dayMinutes >= 60) level = 4
        else if (dayMinutes >= 40) level = 3
        else if (dayMinutes >= 20) level = 2
        else level = 1
      }

      const day: HeatmapDay = {
        dateStr,
        dateObj: new Date(iter),
        dayOfWeek: iter.getDay(),
        workouts: dayWorkouts,
        completedWorkouts: completedDayWorkouts,
        totalMinutes: dayMinutes,
        level,
        isToday: dateStr === todayStr,
      }

      // Check month boundary on first day of week
      if (day.dayOfWeek === 0) {
        const m = iter.getMonth()
        if (m !== lastMonth) {
          monthsMap.push({ weekIndex: currentWeekIdx, monthName: MONTH_NAMES[m] })
          lastMonth = m
        }
      }

      currentWeek.push(day)

      if (day.dayOfWeek === 6) {
        generatedWeeks.push(currentWeek)
        currentWeek = []
        currentWeekIdx++
      }

      iter.setDate(iter.getDate() + 1)
    }

    if (currentWeek.length > 0) {
      generatedWeeks.push(currentWeek)
    }

    return {
      weeks: generatedWeeks,
      monthLabels: monthsMap,
      totalTrainedMinutes: trainedMinSum,
      totalSessionsYear: sessionCountYear,
    }
  }, [workoutsByDate, fitWeeks])

  const trainedHours = (totalTrainedMinutes / 60).toFixed(1)

  return (
    <div
      className={cn(
        "rounded-xl border border-white/5 bg-[#141414] p-5 flex flex-col justify-between transition-all hover:border-white/10",
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-white tracking-wide">
            Activity — last {fitWeeks} weeks · by time trained
          </h2>
          <span className="text-xs text-spotify-muted">
            ({totalSessionsYear} เซสชัน · {trainedHours} ชม.)
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-spotify-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary inline-block" /> คลิกช่องเพื่อดู/แก้ไข
          </span>
        </div>
      </div>

      {/* Grid Container auto-fitted to width with zero horizontal scroll */}
      <div ref={containerRef} className="py-2.5 flex items-center justify-center overflow-hidden">
        <div className="w-fit mx-auto">
          {/* Month labels */}
          <div className="flex text-xs text-spotify-muted font-medium mb-1.5 pl-5">
            {weeks.map((_, colIdx) => {
              const label = monthLabels.find((m) => m.weekIndex === colIdx)
              return (
                <div key={colIdx} className="w-3.5 mr-1 shrink-0 text-left">
                  {label ? <span className="text-white/90 font-bold">{label.monthName}</span> : null}
                </div>
              )
            })}
          </div>

          {/* 7 Rows of days */}
          <div className="flex items-start">
            {/* Day of week labels */}
            <div className="flex flex-col gap-1 w-4 mr-1 text-[10px] text-spotify-muted font-mono select-none pt-0.5">
              <span className="h-3.5 leading-[14px] text-center">S</span>
              <span className="h-3.5 leading-[14px] text-center">M</span>
              <span className="h-3.5 leading-[14px] text-center">T</span>
              <span className="h-3.5 leading-[14px] text-center">W</span>
              <span className="h-3.5 leading-[14px] text-center">T</span>
              <span className="h-3.5 leading-[14px] text-center">F</span>
              <span className="h-3.5 leading-[14px] text-center">S</span>
            </div>

            {/* Weeks Columns */}
            <div className="flex gap-1">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1 shrink-0">
                  {week.map((day) => {
                    const hasCompleted = day.completedWorkouts.length > 0
                    const hasWorkout = day.workouts.length > 0
                    const firstWorkout = day.workouts[0]
                    const formattedDate = formatDateDDMMYYYY(day.dateStr)
                    const tooltipText = hasCompleted
                      ? `${formattedDate}: ${day.completedWorkouts.map((w) => w.title).join(", ")} (${day.totalMinutes}m)`
                      : hasWorkout
                      ? `${formattedDate}: ${day.workouts.map((w) => w.title).join(", ")} (ยังไม่ได้ติ๊กสำเร็จ - คลิกเพื่อบันทึก)`
                      : `${formattedDate}: ไม่มีประวัติการเล่น (คลิกเพื่อบันทึก)`

                    return (
                      <button
                        key={day.dateStr}
                        type="button"
                        onClick={() => {
                          if (hasWorkout && firstWorkout) {
                            onSelectWorkout(firstWorkout)
                          } else {
                            onSelectEmptyDate(day.dateStr)
                          }
                        }}
                        title={tooltipText}
                        className={`h-3.5 w-3.5 rounded-[3px] transition-all relative ${
                          LEVEL_COLORS[day.level]
                        } ${
                          day.isToday
                            ? "ring-1.5 ring-primary ring-offset-1 ring-offset-[#141414]"
                            : ""
                        }`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs text-spotify-muted pt-2 border-t border-white/5">
        <span className="text-xs">
          กดที่ช่องเพื่อ <strong className="text-white">ดูรายละเอียด / แก้ไข</strong> หรือบันทึกย้อนหลัง
        </span>

        <div className="flex items-center gap-1.5">
          <span>Less time</span>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-[#232323] inline-block" />
            <span className="h-2.5 w-2.5 rounded-[2px] bg-[#0e4429] inline-block" />
            <span className="h-2.5 w-2.5 rounded-[2px] bg-[#006d32] inline-block" />
            <span className="h-2.5 w-2.5 rounded-[2px] bg-[#26a641] inline-block" />
            <span className="h-2.5 w-2.5 rounded-[2px] bg-[#39d353] inline-block" />
          </div>
          <span>More time</span>
        </div>
      </div>
    </div>
  )
}

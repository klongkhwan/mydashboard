"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { formatDateDDMMYYYY } from "@/components/dashboard/format"
import { Card } from "@/components/ui/card"
import { shiftGrowthDate, type GrowthLog } from "@/lib/personal-growth"
import { cn } from "@/lib/utils"

interface GrowthActivityHeatmapProps {
  logs: GrowthLog[]
  today: string
  onSelectDate: (date: string) => void
  className?: string
}

const LEVEL_COLORS = ["bg-muted", "bg-primary/25", "bg-primary/45", "bg-primary/70", "bg-primary"]
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function GrowthActivityHeatmap({ logs, today, onSelectDate, className }: GrowthActivityHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [fitWeeks, setFitWeeks] = useState(12)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const updateWeeks = () => setFitWeeks(Math.max(12, Math.min(52, Math.floor((container.clientWidth - 32) / 18))))
    updateWeeks()
    const observer = new ResizeObserver(updateWeeks)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const counts = useMemo(() => {
    const result = new Map<string, number>()
    for (const log of logs) result.set(log.activity_date, (result.get(log.activity_date) ?? 0) + 1)
    return result
  }, [logs])

  const { weeks, startDate } = useMemo(() => {
    const endDate = shiftGrowthDate(today, 6 - new Date(`${today}T00:00:00.000Z`).getUTCDay())
    const firstDate = shiftGrowthDate(endDate, 1 - fitWeeks * 7)
    return {
      startDate: firstDate,
      weeks: Array.from({ length: fitWeeks }, (_, week) =>
        Array.from({ length: 7 }, (_, day) => shiftGrowthDate(firstDate, week * 7 + day))),
    }
  }, [today, fitWeeks])
  const showFirstMonth = weeks[0][0].slice(0, 7) === weeks[2][0].slice(0, 7)

  return (
    <Card className={cn("min-w-0 gap-0 p-4 sm:p-6", className)}>
      <div className="border-b border-border pb-4">
        <h2 className="text-sm font-semibold text-foreground">Activity</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatDateDDMMYYYY(startDate)} – {formatDateDDMMYYYY(today)}
          <span className="ml-2">({fitWeeks} weeks)</span>
        </p>
      </div>

      <div ref={containerRef} className="min-w-0 py-4">
        <div className="mx-auto w-full" style={{ maxWidth: fitWeeks * 18 + 32 }}>
          <div className="mb-2 grid grid-cols-[32px_minmax(0,1fr)]" aria-hidden="true">
            <span />
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${fitWeeks}, minmax(0, 1fr))` }}>
              {weeks.map((week, index) => (
                <span key={week[0]} className="h-4 whitespace-nowrap text-xs text-muted-foreground">
                  {index <= fitWeeks - 3 && (index === 0 ? showFirstMonth : week[0].slice(0, 7) !== weeks[index - 1][0].slice(0, 7))
                    ? MONTH_LABELS[Number(week[0].slice(5, 7)) - 1]
                    : null}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[32px_minmax(0,1fr)]">
            <div className="grid grid-rows-7 gap-1 pr-1 text-xs text-muted-foreground" aria-hidden="true">
              {DAY_LABELS.map((label, index) => <span key={index} className="flex items-center justify-center">{label}</span>)}
            </div>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${fitWeeks}, minmax(0, 1fr))` }}>
              {weeks.map((week) => (
                <div key={week[0]} className="grid min-w-0 gap-1">
                  {week.map((date) => {
                    const count = counts.get(date) ?? 0
                    const isFuture = date > today
                    const description = `${formatDateDDMMYYYY(date)}: ${isFuture ? "ยังมาไม่ถึง" : `${count} activities${count ? " · View Activities" : " · Log Activity"}`}`
                    return (
                      <button
                        key={date}
                        type="button"
                        disabled={isFuture}
                        onClick={() => onSelectDate(date)}
                        aria-label={description}
                        aria-current={date === today ? "date" : undefined}
                        title={description}
                        className={cn(
                          "aspect-square w-full min-w-0 rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                          isFuture ? "bg-muted/40 disabled:cursor-default" : `${LEVEL_COLORS[Math.min(count, 4)]} hover:ring-1 hover:ring-ring`,
                          date === today && "ring-1 ring-ring ring-offset-1 ring-offset-card",
                        )}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
        <p>เลือกวันเพื่อดูหรือบันทึกกิจกรรม</p>
        <div className="flex items-center gap-1.5" aria-label="Activity levels: 0, 1, 2, 3 and 4 or more activities">
          <span>0</span>
          {LEVEL_COLORS.map((color, index) => <span key={color} title={`${index === 4 ? "4+" : index} activities`} className={cn("inline-block h-3 w-3 rounded-sm", color)} />)}
          <span>4+ activities</span>
        </div>
      </div>
    </Card>
  )
}

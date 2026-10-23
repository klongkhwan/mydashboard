"use client"

import { useEffect, useState } from "react"
import { Calendar, AlertCircle } from "lucide-react"
import { SectionPanel } from "@/components/ui/page-header"

interface CalendarEvent {
  id: string
  title: string
  country: string
  indicator: string | null
  actual: number | string | null
  forecast: number | string | null
  previous: number | string | null
  actualRaw: number | null
  forecastRaw: number | null
  previousRaw: number | null
  currency: string | null
  unit: string | null
  importance: number
  date: string
}

function getThaiTodayUtcRange() {
  const now = new Date()
  const thaiYmd = now.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" })
  const [year, month, day] = thaiYmd.split("-").map(Number)
  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - 7 * 60 * 60 * 1000)
  const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59) - 7 * 60 * 60 * 1000)
  return {
    from: start.toISOString(),
    to: end.toISOString(),
    todayYmd: thaiYmd,
  }
}

function formatEventTime(isoDate: string): string {
  try {
    const d = new Date(isoDate)
    return d.toLocaleTimeString("th-TH", {
      timeZone: "Asia/Bangkok",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  } catch {
    return "--:--"
  }
}

function formatValue(
  val: number | string | null,
  raw: number | null,
  unit?: string | null
): string {
  const v = val ?? raw
  if (v == null || v === "") return "—"
  return `${v}${unit ? ` ${unit}` : ""}`
}

export function EconomicCalendarToday({ className }: { className?: string }) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadTodayEvents() {
      try {
        setLoading(true)
        setError(null)
        const { from, to } = getThaiTodayUtcRange()
        const url = `/api/economic-calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&countries=US`
        const res = await fetch(url, { cache: "no-store" })

        if (!res.ok) {
          throw new Error(`โหลดข้อมูลไม่สำเร็จ (${res.status})`)
        }

        const data = await res.json()
        const rawList: CalendarEvent[] = data?.result ?? []

        // Filter US High importance only
        const highUsEvents = rawList
          .filter((ev) => ev.importance === 1)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        if (isMounted) {
          setEvents(highUsEvents)
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || "ไม่สามารถเชื่อมต่อปฏิทินเศรษฐกิจได้")
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadTodayEvents()

    return () => {
      isMounted = false
    }
  }, [])

  const nowMs = Date.now()

  return (
    <SectionPanel
      title="ปฏิทินเศรษฐกิจวันนี้ (US High)"
      description="เหตุการณ์สำคัญระดับ High ของสหรัฐฯ ประจำวัน"
      icon={Calendar}
      className={className}
      bodyClassName="p-4"
    >
      {loading ? (
        <div className="space-y-3 py-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex animate-pulse items-center gap-3 rounded-lg bg-white/5 p-3">
              <div className="h-6 w-12 rounded bg-white/10" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/4 rounded bg-white/10" />
                <div className="h-2.5 w-1/2 rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex h-56 flex-col items-center justify-center gap-2 text-center text-xs text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      ) : events.length === 0 ? (
        <div className="flex h-56 items-center justify-center text-center text-sm text-spotify-muted">
          วันนี้ไม่มีเหตุการณ์สำคัญระดับ High ของสหรัฐฯ
        </div>
      ) : (
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {events.map((ev) => {
            const isPassed = new Date(ev.date).getTime() < nowMs
            const timeStr = formatEventTime(ev.date)
            const actualVal = formatValue(ev.actual, ev.actualRaw, ev.unit)
            const forecastVal = formatValue(ev.forecast, ev.forecastRaw, ev.unit)
            const prevVal = formatValue(ev.previous, ev.previousRaw, ev.unit)

            return (
              <div
                key={ev.id}
                className={`flex flex-col gap-1.5 rounded-lg border border-white/5 bg-card p-3 transition-opacity ${
                  isPassed ? "opacity-60" : "opacity-100"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0 text-sm">🇺🇸</span>
                    <span className="font-mono text-xs font-bold text-primary">{timeStr}</span>
                    <span className="truncate text-xs font-semibold text-white" title={ev.title}>
                      {ev.title}
                    </span>
                  </div>
                  {isPassed && (
                    <span className="shrink-0 text-[10px] text-muted-foreground">ผ่านไปแล้ว</span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[11px] text-muted-foreground pl-6">
                  <span>
                    Actual: <strong className="text-white">{actualVal}</strong>
                  </span>
                  <span>
                    Forecast: <span className="text-[#cbcbcb]">{forecastVal}</span>
                  </span>
                  <span>
                    Previous: <span className="text-muted-foreground">{prevVal}</span>
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </SectionPanel>
  )
}

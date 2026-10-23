"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Newspaper, Calendar as CalendarIcon, RefreshCw } from "lucide-react"
import { ModernPageLoading } from "@/components/ui/modern-loader"

// Country flag component using TradingView URLs
const FlagIcon = ({ country, size = 24 }: { country: string; size?: number }) => {
  const baseUrl = "https://s3-symbol-logo.tradingview.com/country"

  // Emoji fallbacks
  const emojiFlags: Record<string, string> = {
    "US": "🇺🇸",
    "EU": "🇪🇺",
    "UK": "🇬🇧",
    "JP": "🇯🇵",
    "CN": "🇨🇳",
    "TH": "🇹🇭"
  }

  return (
    <div style={{ width: size, height: size, position: 'relative', display: 'inline-block' }}>
      <img
        src={`${baseUrl}/${country}.svg`}
        alt={`${country} flag`}
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          display: 'block',
          borderRadius: '50%'
        }}
        onError={(e) => {
          // Show emoji fallback if image fails to load
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
          if (target.nextElementSibling) {
            (target.nextElementSibling as HTMLElement).style.display = 'flex'
          }
        }}
        onLoad={(e) => {
          // Hide fallback if image loads successfully
          const target = e.target as HTMLImageElement
          if (target.nextElementSibling) {
            (target.nextElementSibling as HTMLElement).style.display = 'none'
          }
        }}
      />
      <span
        style={{
          display: 'none',
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.7,
          position: 'absolute',
          top: 0,
          left: 0
        }}
      >
        {emojiFlags[country] || "🏳️"}
      </span>
    </div>
  )
}

// ===== Types =====
type TVEvent = {
  id: string
  title: string
  country: string
  indicator: string | null
  category: string | null
  period: string | null
  referenceDate: string | null
  source: string | null
  source_url: string | null

  actual: number | string | null
  forecast: number | string | null
  previous: number | string | null
  actualRaw: number | null
  forecastRaw: number | null
  previousRaw: number | null

  currency: string | null
  unit: string | null
  importance: number
  date: string // ISO
}

const COUNTRY_OPTIONS = ["US", "EU", "UK", "JP", "CN", "TH"] as const
type CountryCode = typeof COUNTRY_OPTIONS[number]

// ===== Helpers (timezone: Asia/Bangkok -> ส่งเป็น UTC Z) =====
const toThaiDateYMD = (d: Date) =>
  d.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }) // YYYY-MM-DD

// วันเดียว (offset จากวันนี้ตามเวลาไทย) -> from/to (UTC Z ครบวัน)
const rangeUtcZForThaiDay = (offsetDaysFromToday = 0) => {
  const thaiNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
  thaiNow.setDate(thaiNow.getDate() + offsetDaysFromToday)
  const ymd = toThaiDateYMD(thaiNow)
  return { from: `${ymd}T00:00:00Z`, to: `${ymd}T23:59:59Z` }
}

// ช่วงหลายวันตามเวลาไทย (รวมวันนี้เป็นวันแรก)
const rangeUtcZForThaiSpan = (days: number) => {
  const startThai = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
  const endThai = new Date(startThai)
  endThai.setDate(endThai.getDate() + (days - 1))
  const fromYmd = toThaiDateYMD(startThai)
  const toYmd = toThaiDateYMD(endThai)
  return { from: `${fromYmd}T00:00:00Z`, to: `${toYmd}T23:59:59Z` }
}

// ช่วงสัปดาห์นี้ (เริ่มจากวันนี้ถึงสิ้นสัปดาห์)
const rangeUtcZForThaiThisWeek = () => {
  const nowThai = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
  const dayOfWeek = nowThai.getDay() // 0 = Sunday, 6 = Saturday
  const daysUntilSunday = 6 - dayOfWeek
  const endThai = new Date(nowThai)
  endThai.setDate(endThai.getDate() + daysUntilSunday)

  const fromYmd = toThaiDateYMD(nowThai)
  const toYmd = toThaiDateYMD(endThai)
  return { from: `${fromYmd}T00:00:00Z`, to: `${toYmd}T23:59:59Z` }
}

// ช่วงสัปดาห์หน้า (เริ่มจากวันจันทร์หน้าถึงวันอาทิตย์หน้า)
const rangeUtcZForThaiNextWeek = () => {
  const nowThai = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
  const dayOfWeek = nowThai.getDay() // 0 = Sunday, 6 = Saturday
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek)

  const startThai = new Date(nowThai)
  startThai.setDate(startThai.getDate() + daysUntilMonday)

  const endThai = new Date(startThai)
  endThai.setDate(endThai.getDate() + 6) // Sunday

  const fromYmd = toThaiDateYMD(startThai)
  const toYmd = toThaiDateYMD(endThai)
  return { from: `${fromYmd}T00:00:00Z`, to: `${toYmd}T23:59:59Z` }
}

// แสดงค่า + fallback *_Raw + unit
const displayValue = (
  primary: number | string | null,
  raw: number | null,
  unit?: string | null
) => {
  const v = primary ?? raw
  if (v == null || v === "") return "—"
  return `${v}${unit ? ` ${unit}` : ""}`
}

const importanceLabel = (n: number) => (n === 1 ? "High" : n === 0 ? "Medium" : n === -1 ? "Low" : "Unknown")

// ===== UI Presets =====
type DayPreset = { key: string; label: string; kind: "single" | "span"; value: number }
const DAY_PRESETS: DayPreset[] = [
  { key: "yesterday", label: "Yesterday", kind: "single", value: -1 }, // offset -1
  { key: "today", label: "Today", kind: "single", value: 0 },  // offset +0
  { key: "tomorrow", label: "Tomorrow", kind: "single", value: 1 },  // offset +1
  { key: "thisWeek", label: "This Week", kind: "span", value: 7 },  // 7 days including today
  { key: "nextWeek", label: "Next Week", kind: "span", value: 7 },  // next 7 days
]

// ===== Component =====
export function Calendar() {
  // ตั้งต้นเป็น "สัปดาห์นี้"
  const [dayPreset, setDayPreset] = useState<string>("thisWeek")
  // ตั้งต้นประเทศเป็นเฉพาะ US
  const [countries, setCountries] = useState<CountryCode[]>(["US"])
  // ตั้งต้น importance เป็น High
  const [importanceFilter, setImportanceFilter] = useState<"high" | "medium" | "low" | "all">("high")
  const [events, setEvents] = useState<TVEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // คำนวณช่วงเวลา (UTC Z ครบวัน) จาก preset
  const { from, to } = useMemo(() => {
    const preset = DAY_PRESETS.find(p => p.key === dayPreset)!

    if (preset.key === "thisWeek") {
      return rangeUtcZForThaiThisWeek()
    } else if (preset.key === "nextWeek") {
      return rangeUtcZForThaiNextWeek()
    } else if (preset.kind === "single") {
      return rangeUtcZForThaiDay(preset.value)
    } else {
      return rangeUtcZForThaiSpan(preset.value)
    }
  }, [dayPreset])

  // countries param: ไม่มีช่องว่าง
  const countriesParam = useMemo(() => countries.join(","), [countries])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const url = `/api/economic-calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&countries=${encodeURIComponent(countriesParam)}`
      const res = await fetch(url, { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      let list: TVEvent[] = data?.result ?? []

      // Filter by importance based on the selected filter
      if (importanceFilter === "high") {
        list = list.filter(event => event.importance === 1)
      } else if (importanceFilter === "medium") {
        list = list.filter(event => event.importance === 0)
      } else if (importanceFilter === "low") {
        list = list.filter(event => event.importance === -1)
      }
      // "all" shows all events, no filtering needed

      list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      setEvents(list)
      setLastUpdated(new Date())
    } catch (e: any) {
      setError(e?.message || "Fetch failed")
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  // โหลดอัตโนมัติเมื่อเปลี่ยนช่วง/ประเทศ/importance
  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, countriesParam, importanceFilter])

  // กลุ่มตาม “วัน (เวลาไทย)” เรียงจากใกล้ → ไกล
  const grouped = useMemo(() => {
    const map = new Map<string, TVEvent[]>()
    for (const ev of events) {
      const d = new Date(ev.date)
      const label = d.toLocaleDateString("th-TH", {
        timeZone: "Asia/Bangkok",
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
      if (!map.has(label)) map.set(label, [])
      map.get(label)!.push(ev)
    }
    const entries = [...map.entries()].sort(
      (a, b) => new Date(a[1][0].date).getTime() - new Date(b[1][0].date).getTime()
    )
    return entries
  }, [events])

  const toggleCountry = (code: CountryCode) => {
    setCountries(prev =>
      prev.includes(code)
        ? (prev.filter(c => c !== code) as CountryCode[])
        : ([...prev, code] as CountryCode[])
    )
  }

  return (
    <Card className="card-spotify border border-white/5 shadow-heavy bg-card">
      <CardHeader className="px-5 py-3 border-b border-white/5 bg-white/[0.02]">
        <CardTitle className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <span className="text-spotify-label text-white text-[10px]">ปฏิทินเศรษฐกิจ</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="px-5 py-4 space-y-6">
        {/* Filters */}
        <div className="flex flex-col gap-4">
          {/* Day presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-spotify-label text-[9px] mr-1">ช่วงวัน:</span>
            {DAY_PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => setDayPreset(p.key)}
                className={`btn-pill h-7 px-3 text-[10px] border-none transition-all ${dayPreset === p.key
                  ? "bg-white text-black scale-105"
                  : "bg-surface-hover text-muted-foreground hover:text-white"
                  }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Countries chips + Quick actions */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-spotify-label text-[9px] mr-1">ประเทศ:</span>
            {COUNTRY_OPTIONS.map(c => {
              const active = countries.includes(c)
              return (
                <button
                  key={c}
                  onClick={() => toggleCountry(c)}
                  className={`w-7 h-7 rounded-full transition-all flex items-center justify-center p-1 border-none ${active
                    ? "bg-white scale-110 shadow-play"
                    : "bg-surface-hover hover:bg-[#333333]"
                    }`}
                  title={c}
                >
                  <FlagIcon country={c} size={18} />
                </button>
              )
            })}
            <div className="ml-2 flex gap-1.5">
              <button
                onClick={() => setCountries(["US"])}
                className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-white px-2 py-1 rounded hover:bg-white/5"
              >
                US ONLY
              </button>
              <button
                onClick={() => setCountries([...COUNTRY_OPTIONS])}
                className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-white px-2 py-1 rounded hover:bg-white/5"
              >
                ALL
              </button>
            </div>
          </div>

          {/* Importance filter */}
          <div className="flex items-center justify-between gap-4 pt-2 border-t border-white/5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-spotify-label text-[9px] mr-1">ระดับ:</span>
              <button
                onClick={() => setImportanceFilter("high")}
                className={`btn-pill h-7 px-3 text-[10px] border-none transition-all ${importanceFilter === "high"
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-surface-hover text-muted-foreground hover:text-destructive"
                  }`}
              >
                High
              </button>
              <button
                onClick={() => setImportanceFilter("medium")}
                className={`btn-pill h-7 px-3 text-[10px] border-none transition-all ${importanceFilter === "medium"
                  ? "bg-warning text-white"
                  : "bg-surface-hover text-muted-foreground hover:text-warning"
                  }`}
              >
                Med
              </button>
              <button
                onClick={() => setImportanceFilter("low")}
                className={`btn-pill h-7 px-3 text-[10px] border-none transition-all ${importanceFilter === "low"
                  ? "bg-primary text-black"
                  : "bg-surface-hover text-muted-foreground hover:text-primary"
                  }`}
              >
                Low
              </button>
              <button
                onClick={() => setImportanceFilter("all")}
                className={`btn-pill h-7 px-3 text-[10px] border-none transition-all ${importanceFilter === "all"
                  ? "bg-white text-black"
                  : "bg-surface-hover text-muted-foreground hover:text-white"
                  }`}
              >
                ALL
              </button>
            </div>
            
            <button
              onClick={fetchData}
              disabled={loading}
              className="btn-pill h-7 px-4 bg-primary text-black hover:bg-primary/90 flex items-center gap-1.5 active:scale-95 text-[10px]"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-6 pt-2">
          {loading ? (
            <div className="p-10 flex flex-col items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Loading data...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center bg-destructive/10 rounded-lg">
              <p className="text-destructive text-xs font-bold">{error}</p>
            </div>
          ) : events.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-xs font-bold">
              No events found.
            </div>
          ) : (
            grouped.map(([label, items]) => (
              <div key={label} className="space-y-3">
                <h3 className="text-sm font-black text-white tracking-tighter border-b border-white/5 pb-1">{label}</h3>
                <div className="space-y-0.5">
                  {items.map(ev => {
                    const timeLocal = new Date(ev.date).toLocaleTimeString("th-TH", {
                      timeZone: "Asia/Bangkok",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })
                    return (
                      <div key={ev.id} className="group px-3 py-2 hover:bg-white/5 rounded-md transition-all flex flex-col md:flex-row md:items-center gap-4">
                        {/* Time & Flag Column - Fixed Width */}
                        <div className="flex items-center gap-3 md:w-28 shrink-0">
                          <span className="text-[13px] font-bold text-white tabular-nums w-10">{timeLocal}</span>
                          <div className="w-6 h-6 rounded-full bg-surface-hover flex items-center justify-center group-hover:scale-110 transition-transform">
                            <FlagIcon country={ev.country} size={16} />
                          </div>
                          <span className="text-[11px] font-black text-spotify-muted w-8">{ev.currency}</span>
                        </div>

                        {/* Title & Info Column - Flexible but structured */}
                        <div className="flex-1 min-w-0 flex items-center gap-3">
                          <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", 
                            ev.importance === 1 ? "bg-destructive" :
                            ev.importance === 0 ? "bg-warning" :
                            "bg-primary")}>
                          </div>
                          <span className="text-[13px] font-bold text-white group-hover:text-primary transition-colors truncate flex-1">
                            {ev.title}
                          </span>
                          {ev.category && (
                            <span className="hidden md:inline text-[9px] font-bold text-spotify-muted uppercase tracking-wider bg-white/5 px-1.5 py-0.5 rounded truncate max-w-[100px]">
                              {ev.category}
                            </span>
                          )}
                        </div>

                        {/* Values Grid - Perfectly Aligned Columns with Increased Width */}
                        <div className="flex gap-0 items-center shrink-0 ml-auto md:ml-0 bg-black/20 rounded-md p-1.5">
                          <div className="flex flex-col items-center w-24 border-r border-white/5 px-2">
                            <span className="text-[8px] font-black text-spotify-muted uppercase tracking-widest mb-0.5">Actual</span>
                            <span className="text-[12px] font-bold text-white tabular-nums">{displayValue(ev.actual, ev.actualRaw, ev.unit)}</span>
                          </div>
                          <div className="flex flex-col items-center w-24 border-r border-white/5 px-2">
                            <span className="text-[8px] font-black text-spotify-muted uppercase tracking-widest mb-0.5">Forecast</span>
                            <span className="text-[12px] font-bold text-white tabular-nums">{displayValue(ev.forecast, ev.forecastRaw, ev.unit)}</span>
                          </div>
                          <div className="flex flex-col items-center w-24 px-2">
                            <span className="text-[8px] font-black text-spotify-muted uppercase tracking-widest mb-0.5">Previous</span>
                            <span className="text-[12px] font-bold text-muted-foreground tabular-nums">{displayValue(ev.previous, ev.previousRaw, ev.unit)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

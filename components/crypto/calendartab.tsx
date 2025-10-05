"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Newspaper, Calendar as CalendarIcon, RefreshCw } from "lucide-react"

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
  { key: "today",     label: "Today",     kind: "single", value: 0 },  // offset +0
  { key: "tomorrow",  label: "Tomorrow",  kind: "single", value: 1 },  // offset +1
  { key: "thisWeek",  label: "This Week", kind: "span",   value: 7 },  // 7 days including today
  { key: "nextWeek",  label: "Next Week", kind: "span",   value: 7 },  // next 7 days
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Newspaper className="w-5 h-5" />
          ปฏิทินเศรษฐกิจ
        </CardTitle>
        {/* <CardDescription>
          กรองตามวันและประเทศ • ส่งเวลาแบบ UTC Z ครบวัน
        </CardDescription> */}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-3">
          {/* Day presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarIcon className="w-4 h-4" /> ช่วงวัน:
            </span>
            {DAY_PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => setDayPreset(p.key)}
                className={`px-3 py-1 rounded-full border text-sm transition ${
                  dayPreset === p.key
                    ? "bg-primary border-primary text-primary-foreground shadow"
                    : "bg-transparent border-border text-muted-foreground hover:border-primary hover:text-primary-foreground"
                }`}
                title={
                  p.key === "yesterday" ? "Yesterday (Thai time)" :
                  p.key === "today" ? "Today (Thai time)" :
                  p.key === "tomorrow" ? "Tomorrow (Thai time)" :
                  p.key === "thisWeek" ? "Today through Sunday (Thai time)" :
                  p.key === "nextWeek" ? "Next Monday through Sunday (Thai time)" :
                  ""
                }
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Countries chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">ประเทศ:</span>
            {COUNTRY_OPTIONS.map(c => {
              const active = countries.includes(c)
              return (
                <button
                  key={c}
                  onClick={() => toggleCountry(c)}
                  className={`w-8 h-8 rounded-full border transition flex items-center justify-center p-0.5 ${
                    active
                      ? "bg-primary border-primary shadow"
                      : "bg-transparent border-border hover:border-primary"
                  }`}
                  title={c}
                >
                  <FlagIcon country={c} size={20} />
                </button>
              )
            })}
            {/* Quick actions */}
            <div className="ml-1 flex gap-2">
              <button
                onClick={() => setCountries(["US"])}
                className="text-xs px-2 py-1 rounded border border-border hover:border-primary text-muted-foreground hover:text-primary-foreground"
                title="เลือกเฉพาะ US"
              >
                เฉพาะ US
              </button>
              <button
                onClick={() => setCountries([...COUNTRY_OPTIONS])}
                className="text-xs px-2 py-1 rounded border border-border hover:border-primary text-muted-foreground hover:text-primary-foreground"
                title="เลือกทุกประเทศ"
              >
                เลือกทั้งหมด
              </button>
            </div>
          </div>

          {/* Importance filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">ความสำคัญ:</span>
            <button
              onClick={() => setImportanceFilter("high")}
              className={`px-3 py-1 rounded-full border text-sm transition ${
                importanceFilter === "high"
                  ? "bg-red-600 border-red-600 text-white shadow"
                  : "bg-transparent border-border text-muted-foreground hover:border-red-600 hover:text-red-600"
              }`}
              title="High importance (importance = 1)"
            >
              High
            </button>
            <button
              onClick={() => setImportanceFilter("medium")}
              className={`px-3 py-1 rounded-full border text-sm transition ${
                importanceFilter === "medium"
                  ? "bg-orange-500 border-orange-500 text-white shadow"
                  : "bg-transparent border-border text-muted-foreground hover:border-orange-500 hover:text-orange-500"
              }`}
              title="Medium importance (importance = 0)"
            >
              Medium
            </button>
            <button
              onClick={() => setImportanceFilter("low")}
              className={`px-3 py-1 rounded-full border text-sm transition ${
                importanceFilter === "low"
                  ? "bg-green-400 border-green-400 text-gray-900 shadow"
                  : "bg-transparent border-border text-muted-foreground hover:border-green-400 hover:text-green-400"
              }`}
              title="Low importance (importance = -1)"
            >
              Low
            </button>
            <button
              onClick={() => setImportanceFilter("all")}
              className={`px-3 py-1 rounded-full border text-sm transition ${
                importanceFilter === "all"
                  ? "bg-primary border-primary text-primary-foreground shadow"
                  : "bg-transparent border-border text-muted-foreground hover:border-primary hover:text-primary-foreground"
              }`}
              title="ทุกระดับความสำคัญ"
            >
              ทั้งหมด
            </button>
          </div>

          {/* Params + Refresh */}
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            {/* <div className="text-xs text-muted-foreground">
              ส่งพารามิเตอร์:
              <span className="ml-1 font-mono">from={from}</span>{" "}
              <span className="font-mono">to={to}</span>{" "}
              <span className="font-mono">countries={countriesParam}</span>
            </div> */}
            <div className="flex items-center gap-2">
              <button
                onClick={fetchData}
                disabled={loading}
                className={`px-3 py-1 rounded-md border text-sm flex items-center gap-2 ${
                  loading
                    ? "border-border text-muted-foreground"
                    : "border-border text-muted-foreground hover:border-primary hover:text-primary-foreground"
                }`}
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              {lastUpdated && (
                <span className="text-xs text-muted-foreground">
                  อัปเดตล่าสุด:{" "}
                  {lastUpdated.toLocaleTimeString("th-TH", {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    timeZone: "Asia/Bangkok",
                  })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* States */}
        {loading && <div className="text-foreground">กำลังโหลดข้อมูล…</div>}
        {error && <div className="text-destructive">เกิดข้อผิดพลาด: {error}</div>}
        {!loading && !error && events.length === 0 && (
          <div className="text-muted-foreground">ไม่พบรายการในช่วงที่เลือก</div>
        )}

        {/* Results (group by day) */}
        {!loading && !error && events.length > 0 && (
          <div className="space-y-4">
            {grouped.map(([label, items]) => (
              <div key={label} className="space-y-2">
                <h3 className="text-lg font-semibold text-card-foreground mt-4">{label}</h3>
                <div className="space-y-2">
                  {items.map(ev => {
                    const timeLocal = new Date(ev.date).toLocaleTimeString("th-TH", {
                      timeZone: "Asia/Bangkok",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })
                    return (
                      <div key={ev.id} className="rounded-lg border border-border bg-card p-3">
                        {/* Header row: badges + time */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 border border-primary/30 p-0.5">
                              <FlagIcon country={ev.country} size={20} />
                            </div>
                            <Badge variant="outline">{ev.currency ?? "-"}</Badge>
                            {ev.category && (
                              <span className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                                {ev.category}
                              </span>
                            )}
                            {ev.period && (
                              <span className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                                {ev.period}
                              </span>
                            )}
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                ev.importance === 1
                                  ? "bg-red-600 text-white"
                                  : ev.importance === 0
                                  ? "bg-orange-500 text-white"
                                  : ev.importance === -1
                                  ? "bg-green-400 text-gray-900"
                                  : "bg-muted text-muted-foreground"
                              }`}
                              title={`importance=${ev.importance}`}
                            >
                              {importanceLabel(ev.importance)}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">{timeLocal} น.</div>
                        </div>

                        {/* Title + Indicator */}
                        <div className="mt-2 text-base text-card-foreground font-medium">{ev.title}</div>
                        {ev.indicator && (
                          <div className="text-sm text-muted-foreground">{ev.indicator}</div>
                        )}

                        {/* Values + Reference + Source (ครบฟิลด์) */}
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
                          <div className="rounded bg-muted/60 p-2">
                            <div className="text-muted-foreground">Actual</div>
                            <div className="text-card-foreground">
                              {displayValue(ev.actual, ev.actualRaw, ev.unit)}
                            </div>
                          </div>
                          <div className="rounded bg-muted/60 p-2">
                            <div className="text-muted-foreground">Forecast</div>
                            <div className="text-card-foreground">
                              {displayValue(ev.forecast, ev.forecastRaw, ev.unit)}
                            </div>
                          </div>
                          <div className="rounded bg-muted/60 p-2">
                            <div className="text-muted-foreground">Previous</div>
                            <div className="text-card-foreground">
                              {displayValue(ev.previous, ev.previousRaw, ev.unit)}
                            </div>
                          </div>
                          <div className="rounded bg-muted/60 p-2">
                            <div className="text-muted-foreground">Unit</div>
                            <div className="text-card-foreground">{ev.unit ?? "—"}</div>
                          </div>
                          <div className="rounded bg-muted/60 p-2">
                            <div className="text-muted-foreground">Reference</div>
                            <div className="text-card-foreground">
                              {ev.referenceDate
                                ? new Date(ev.referenceDate).toLocaleDateString("th-TH", {
                                    timeZone: "Asia/Bangkok",
                                  })
                                : "—"}
                            </div>
                          </div>
                          <div className="rounded bg-muted/60 p-2">
                            <div className="text-muted-foreground">Source</div>
                            <div className="text-card-foreground truncate">
                              {ev.source_url ? (
                                <a
                                  href={ev.source_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="underline hover:opacity-80 text-primary hover:text-primary/80"
                                  title={ev.source_url}
                                >
                                  {ev.source || ev.source_url}
                                </a>
                              ) : (
                                ev.source ?? "—"
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

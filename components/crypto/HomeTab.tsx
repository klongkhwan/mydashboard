"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Clock, BookOpen, ExternalLink, TrendingUp, BarChart3, Activity } from "lucide-react"
import TradingViewTechnicalWidget from "./TradingViewTechnicalWidget"

type Campaign = {
  id: number
  campaignCode: string
  startTime: number // epoch ms
  endTime: number   // epoch ms
  title: string
  description?: string
  desktopImg?: string
  joinDisplay?: boolean
  joinType?: number
  countdownDisplay?: number
}

/** ==== ขนาดคงที่สำหรับการ์ดกิจกรรม ==== */
const HEADER_H = 16          // ความสูงหัวการ์ด (px)
const CONTENT_H = 320        // ความสูงเนื้อหากิจกรรม (px) → เลื่อนในตัวมันเอง
const MAX_ITEMS = 10         // แสดง 10 รายการแรก

const fmtDate = (ms: number) =>
  new Date(ms).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  })

const getStatus = (start: number, end: number) => {
  const n = Date.now()
  if (n < start) return "upcoming" as const
  if (n > end) return "ended" as const
  return "ongoing" as const
}

const statusBadge = (status: ReturnType<typeof getStatus>) => {
  switch (status) {
    case "upcoming": return <Badge className="bg-[#1f1f1f] text-[#539df5] border-white/5 h-5 px-2 text-[10px] font-bold uppercase tracking-wider">Soon</Badge>
    case "ongoing": return <Badge className="bg-primary text-black h-5 px-2 text-[10px] font-bold uppercase tracking-wider">Live</Badge>
    case "ended": return <Badge className="bg-[#1f1f1f] text-[#b3b3b3] border-white/5 h-5 px-2 text-[10px] font-bold uppercase tracking-wider">Ended</Badge>
  }
}

// Menu items configuration
const menuItems = [
  {
    title: "บทความ / ข่าว",
    url: "https://www.binance.com/en/square/trending",
    icon: BookOpen,
    tooltip: "บทความยอดนิยม (Binance Square Trending)"
  },
  {
    title: "coinglass",
    url: "https://www.coinglass.com/BitcoinOpenInterest",
    icon: Activity,
    tooltip: "ข้อมูลตลาด"
  },
  {
    title: "hyperdash dex",
    url: "https://hyperdash.info",
    icon: BarChart3,
    tooltip: "ข้อมูลการเทรด"
  },
  {
    title: "Heatmap",
    url: "https://www.coinglass.com/pro/futures/LiquidationHeatMap",
    icon: TrendingUp,
    tooltip: "Heatmap"
  }
  ,
  {
    title: "Binance Alpha",
    url: "https://alpha123.uk/stability/",
    icon: TrendingUp,
    tooltip: "Binance Alpha"
  }
]

export default function BinanceThCampaigns() {
  const [rows, setRows] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refetchTick, setRefetchTick] = useState(0)

  const topRows = useMemo(() => rows.slice(0, MAX_ITEMS), [rows])

  const fetchData = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/binance-campaigns?pageNo=1`, { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const arr: Campaign[] = data?.data?.rows ?? []
      setRows(arr)
    } catch (e: any) {
      setError(e?.message || "Fetch failed")
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [refetchTick])

  return (
    <div className="space-y-6">
      {/* ── แถวเมนูลัด ─────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        {menuItems.map((item, index) => {
          const Icon = item.icon
          return (
            <Button
              key={index}
              asChild
              variant="ghost"
              className="btn-pill bg-[#181818] border border-white/5 hover:bg-[#282828] hover:border-primary/20 text-white h-10 px-6 transition-all"
            >
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                title={item.tooltip}
                className="flex items-center gap-3"
              >
                <Icon className="w-4 h-4 text-primary" />
                <span className="font-bold tracking-tight text-xs uppercase">{item.title}</span>
                <ExternalLink className="w-3 h-3 text-[#b3b3b3] group-hover:text-white transition-colors" />
              </a>
            </Button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left side - Binance campaigns */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="card-spotify border border-white/5 shadow-heavy bg-[#181818] h-full flex flex-col">
            <CardHeader className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-spotify-label flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  กิจกรรม Binance TH
                </CardTitle>
                <button
                  onClick={() => setRefetchTick(x => x + 1)}
                  disabled={loading}
                  className="text-[#b3b3b3] hover:text-white transition-all p-2 hover:bg-white/10 rounded-full"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-0 bg-[#121212]/40 flex-1">
              <div className="divide-y divide-white/5 overflow-y-auto spotify-scrollbar" style={{ height: "400px" }}>
                {loading && (
                  <div className="p-12 flex flex-col items-center justify-center gap-4 h-full">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-spotify-label animate-pulse">Fetching latest campaigns...</p>
                  </div>
                )}
                {error && (
                  <div className="p-8 text-center">
                    <p className="text-[#f3727f] text-sm font-bold">Something went wrong</p>
                    <p className="text-spotify-muted mt-1">{error}</p>
                  </div>
                )}
                {!loading && !error && topRows.length === 0 && (
                  <div className="p-12 text-center text-spotify-muted">
                    No active campaigns at the moment.
                  </div>
                )}

                {!loading && !error && topRows.map((c, idx) => {
                  const status = getStatus(c.startTime, c.endTime)
                  return (
                    <div key={c.id} className="px-6 py-4 hover:bg-white/5 transition-all group cursor-pointer flex items-center gap-4">
                      <div className="text-spotify-muted font-mono text-sm w-4 group-hover:text-white transition-colors">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="text-[15px] font-bold text-white truncate group-hover:text-primary transition-colors">
                            {c.title}
                          </span>
                          {statusBadge(status)}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3.5 h-3.5 text-spotify-muted" />
                          <span className="text-spotify-muted text-[11px] font-bold uppercase tracking-wider group-hover:text-white transition-colors truncate">
                            {fmtDate(c.startTime)} — {fmtDate(c.endTime)}
                          </span>
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary shadow-play bg-[#282828] rounded-full">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right side - TradingView Technical Analysis */}
        <div className="lg:col-span-5">
          <Card className="card-spotify border border-white/5 shadow-heavy h-full bg-[#181818] overflow-hidden flex flex-col">
            <CardHeader className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
              <CardTitle className="text-spotify-label flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Technical Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 bg-black/20 flex items-center justify-center">
              <div className="w-full h-full min-h-[400px] flex items-center justify-center group transition-all">
                <TradingViewTechnicalWidget />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Clock, BookOpen, ExternalLink } from "lucide-react"

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
    case "upcoming": return <Badge className="bg-blue-600 h-5 px-2 text-[10px]">เร็ว ๆ นี้</Badge>
    case "ongoing":  return <Badge className="bg-emerald-600 h-5 px-2 text-[10px]">กำลังจัด</Badge>
    case "ended":    return <Badge variant="secondary" className="h-5 px-2 text-[10px]">จบแล้ว</Badge>
  }
}

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
    <div className="space-y-4">
      {/* ── การ์ดเมนูลัดด้านบน ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="py-2">
          <CardTitle className="text-sm text-muted-foreground">เมนูลัด</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 grid grid-cols-6 gap-2">
            {/* ปุ่ม: บทความ (Binance Square Trending) */}
            <Button asChild variant="default" className="justify-between bg-yellow-500 hover:bg-yellow-600 text-black h-8 text-xs">
              <a
                href="https://www.binance.com/en/square/trending"
                target="_blank"
                rel="noreferrer"
                title="บทความยอดนิยม (Binance Square Trending)"
                className="w-full"
              >
                <span className="inline-flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  บทความ / ข่าว
                </span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            </Button>
            <Button asChild variant="default" className="justify-between bg-yellow-500 hover:bg-yellow-600 text-black h-8 text-xs">
              <a
                href="https://www.binance.com/en/square/trending"
                target="_blank"
                rel="noreferrer"
                title="บทความยอดนิยม (Binance Square Trending)"
                className="w-full"
              >
                <span className="inline-flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  บทความ / ข่าว
                </span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── การ์ดรายการกิจกรรม (fixed height + scroll ภายใน) ─────── */}
      <Card>
        <CardHeader
          className="px-3 py-1"
          style={{ height: HEADER_H }}
        >
          <div className="h-full flex items-center justify-between">
            <CardTitle className="text-xs text-muted-foreground">
              กิจกรรม Binance TH
            </CardTitle>
            <button
              onClick={() => setRefetchTick(x => x + 1)}
              disabled={loading}
              className={`px-2 py-1 rounded border text-[11px] flex items-center gap-1.5 ${
                loading ? "border-border text-muted-foreground" : "border-border hover:border-primary"
              }`}
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </CardHeader>

        {/* 🔒 ล็อกความสูง และเลื่อนเฉพาะด้านใน */}
        <CardContent
          className="p-0 overscroll-contain"
          style={{ height: CONTENT_H }}
        >
          <div className="divide-y divide-border overflow-y-auto h-full">
            {loading && <div className="p-3 text-foreground text-sm">กำลังโหลด…</div>}
            {error && <div className="p-3 text-destructive text-sm">เกิดข้อผิดพลาด: {error}</div>}
            {!loading && !error && topRows.length === 0 && (
              <div className="p-3 text-muted-foreground text-sm">ไม่มีข้อมูลกิจกรรม</div>
            )}

            {!loading && !error && topRows.map((c) => {
              const status = getStatus(c.startTime, c.endTime)
              return (
                <div key={c.id} className="p-2">
                  <div className="flex items-start gap-2">
                    {/* ไม่มีรูป -> เบา/ลื่น */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[13px] font-medium text-card-foreground leading-tight">
                          {c.title}
                        </span>
                        {statusBadge(status)}
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {fmtDate(c.startTime)} — {fmtDate(c.endTime)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

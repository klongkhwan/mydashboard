"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Clock, Gift, ExternalLink } from "lucide-react"

type Campaign = {
  id: number
  campaignCode: string
  startTime: number
  endTime: number
  title: string
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

export default function ScannerTab() {
  const [rows, setRows] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refetchTick, setRefetchTick] = useState(0)

  const topRows = rows.slice(0, MAX_ITEMS)

  const fetchData = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('https://www.binance.th/bapi/composite/v1/friendly/marketing/campaign/queryCampaignLangInfos', {
        method: 'POST',
        headers: {
          'lang': 'th',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pageNo: 1 })
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const arr: Campaign[] = data?.data?.rows ?? []
      // เอาแค่ 10 อันแรก
      setRows(arr.slice(0, MAX_ITEMS))
    } catch (e: any) {
      setError(e?.message || "Fetch failed")
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [refetchTick])

  return (
    <Card>
      <CardHeader className="py-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <Gift className="w-4 h-4" />
            กิจกรรม Binance TH
          </CardTitle>
          <Button
            variant="default"
            size="sm"
            onClick={() => setRefetchTick(x => x + 1)}
            disabled={loading}
            className="flex items-center gap-2 bg-primary"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-2">
          {loading && <div className="p-4 text-foreground text-sm text-center">กำลังโหลด…</div>}
          {error && <div className="p-4 text-destructive text-sm text-center">เกิดข้อผิดพลาด: {error}</div>}
          {!loading && !error && rows.length === 0 && (
            <div className="p-4 text-muted-foreground text-sm text-center">ไม่มีข้อมูลกิจกรรม</div>
          )}

          {!loading && !error && rows.map((c) => {
            const status = getStatus(c.startTime, c.endTime)
            return (
              <div key={c.id} className="border rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-card-foreground">{c.title}</span>
                      {statusBadge(status)}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {fmtDate(c.startTime)} — {fmtDate(c.endTime)}
                    </div>
                  </div>
                  {status === "ongoing" && (
                    <Button asChild variant="default" size="sm" className="bg-primary">
                      <a
                        href="https://www.binance.th/th/activity"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        เข้าร่วม
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
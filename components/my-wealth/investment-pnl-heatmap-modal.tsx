"use client"

import React, { useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
} from "lucide-react"
import { WealthInvestment } from "./wealth-context"
import { calculateClosedInvestmentPnl } from "@/lib/my-wealth-calculations"
import { formatDateDDMMYYYY } from "@/components/dashboard/format"

interface InvestmentPnlHeatmapModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  investments: WealthInvestment[]
  displayCurrency: "THB" | "USD"
  usdThbRate: number
  formatMoney: (amountThb: number) => string
}

const MONTH_NAMES = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
  "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
  "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
]

const DAY_NAMES = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]

export function InvestmentPnlHeatmapModal({
  open,
  onOpenChange,
  investments,
  displayCurrency,
  usdThbRate,
  formatMoney,
}: InvestmentPnlHeatmapModalProps) {
  const now = new Date()
  const [currentYear, setCurrentYear] = useState<number>(now.getFullYear())
  const [currentMonth, setCurrentMonth] = useState<number>(now.getMonth() + 1) // 1-12
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const monthKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}`

  // Group closed investments by date
  const { dailyData, monthStats } = useMemo(() => {
    const dailyMap = new Map<string, { totalThb: number; items: { inv: WealthInvestment; pnlThb: number; pnlNative: number | null; pnlPct: number }[] }>()
    let monthTotalThb = 0
    let winDays = 0
    let lossDays = 0
    let totalClosedTrades = 0

    investments.forEach((inv) => {
      if (inv.status !== "closed" || !inv.closed_at) return
      const dateStr = inv.closed_at.slice(0, 10)
      const pnl = calculateClosedInvestmentPnl(inv)

      const existing = dailyMap.get(dateStr) || { totalThb: 0, items: [] }
      existing.totalThb += pnl.pnlThb
      existing.items.push({
        inv,
        pnlThb: pnl.pnlThb,
        pnlNative: pnl.pnlNative,
        pnlPct: pnl.pnlPct,
      })
      dailyMap.set(dateStr, existing)

      if (dateStr.startsWith(monthKey)) {
        monthTotalThb += pnl.pnlThb
        totalClosedTrades += 1
      }
    })

    // Count win/loss days for current month
    dailyMap.forEach((val, dateStr) => {
      if (dateStr.startsWith(monthKey)) {
        if (val.totalThb > 0) winDays += 1
        else if (val.totalThb < 0) lossDays += 1
      }
    })

    return {
      dailyData: dailyMap,
      monthStats: {
        monthTotalThb,
        winDays,
        lossDays,
        totalClosedTrades,
        winRate: winDays + lossDays > 0 ? (winDays / (winDays + lossDays)) * 100 : 0,
      },
    }
  }, [investments, monthKey])

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay() // 0 = Sun
    const totalDays = new Date(currentYear, currentMonth, 0).getDate()

    const days: { dateStr: string | null; dayNumber: number | null }[] = []
    // Leading empty cells
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ dateStr: null, dayNumber: null })
    }
    // Month days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      days.push({ dateStr, dayNumber: d })
    }
    return days
  }, [currentYear, currentMonth])

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
    setSelectedDate(null)
  }

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
    setSelectedDate(null)
  }

  const handleCurrentMonth = () => {
    setCurrentYear(now.getFullYear())
    setCurrentMonth(now.getMonth() + 1)
    setSelectedDate(null)
  }

  const selectedDayData = selectedDate ? dailyData.get(selectedDate) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto p-5 sm:p-6 bg-background border border-white/10 text-white">
        <DialogHeader className="border-b border-white/10 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                  Daily PnL Heatmap
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary uppercase">
                    {displayCurrency}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-spotify-muted text-xs">
                  สรุปกำไร / ขาดทุนที่ปิดดีลไปแล้วในแต่ละวันของเดือน
                </DialogDescription>
              </div>
            </div>

            {/* Month Navigator Controls */}
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-spotify-muted hover:text-white"
                onClick={handlePrevMonth}
                title="เดือนก่อนหน้า"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <button
                type="button"
                onClick={handleCurrentMonth}
                className="px-2 text-xs font-bold text-white hover:text-primary transition-colors"
                title="กลับเดือนปัจจุบัน"
              >
                {MONTH_NAMES[currentMonth - 1]} {currentYear}
              </button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-spotify-muted hover:text-white"
                onClick={handleNextMonth}
                title="เดือนถัดไป"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Monthly Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          <div className="p-3 rounded-lg border border-white/5 bg-white/[0.02]">
            <span className="text-[10px] text-spotify-muted uppercase font-bold tracking-wider">กำไรสุทธิเดือนนี้</span>
            <p className={`text-base font-black tabular-nums mt-0.5 ${monthStats.monthTotalThb >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {monthStats.monthTotalThb >= 0 ? "+" : ""}{formatMoney(monthStats.monthTotalThb)}
            </p>
          </div>
          <div className="p-3 rounded-lg border border-white/5 bg-white/[0.02]">
            <span className="text-[10px] text-spotify-muted uppercase font-bold tracking-wider">วันที่มีกำไร</span>
            <p className="text-base font-black text-emerald-400 tabular-nums mt-0.5">
              {monthStats.winDays} วัน
            </p>
          </div>
          <div className="p-3 rounded-lg border border-white/5 bg-white/[0.02]">
            <span className="text-[10px] text-spotify-muted uppercase font-bold tracking-wider">วันที่ขาดทุน</span>
            <p className="text-base font-black text-rose-400 tabular-nums mt-0.5">
              {monthStats.lossDays} วัน
            </p>
          </div>
          <div className="p-3 rounded-lg border border-white/5 bg-white/[0.02]">
            <span className="text-[10px] text-spotify-muted uppercase font-bold tracking-wider">ดีลที่ปิดทั้งหมด</span>
            <p className="text-base font-black text-white tabular-nums mt-0.5">
              {monthStats.totalClosedTrades} ดีล
            </p>
          </div>
        </div>

        {/* Calendar Grid Header */}
        <div className="mt-3">
          <div className="grid grid-cols-7 gap-1.5 mb-1.5 text-center">
            {DAY_NAMES.map((day, idx) => (
              <span
                key={day}
                className={`text-[11px] font-bold py-1 ${
                  idx === 0 ? "text-rose-400/80" : idx === 6 ? "text-sky-400/80" : "text-spotify-muted"
                }`}
              >
                {day}
              </span>
            ))}
          </div>

          {/* Calendar Grid Cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((cell, idx) => {
              if (!cell.dateStr) {
                return <div key={`empty-${idx}`} className="h-16 rounded-lg bg-transparent" />
              }

              const data = dailyData.get(cell.dateStr)
              const hasData = Boolean(data && data.items.length > 0)
              const pnl = data ? data.totalThb : 0
              const isProfit = pnl > 0
              const isLoss = pnl < 0
              const isSelected = selectedDate === cell.dateStr

              // Heatmap styling based on daily performance
              let cellBg = "bg-white/[0.02] border-white/5 hover:border-white/20 text-muted-foreground"
              if (hasData) {
                if (isProfit) {
                  cellBg = "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-300"
                } else if (isLoss) {
                  cellBg = "bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20 text-rose-300"
                } else {
                  cellBg = "bg-zinc-800/80 border-zinc-700 text-zinc-300"
                }
              }

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => setSelectedDate(cell.dateStr)}
                  className={`relative flex flex-col justify-between p-1.5 h-16 rounded-lg border transition-all text-left ${cellBg} ${
                    isSelected ? "ring-2 ring-primary scale-[1.02] z-10" : ""
                  }`}
                >
                  <span className="text-[11px] font-semibold opacity-75">{cell.dayNumber}</span>
                  {hasData ? (
                    <div className="w-full text-right overflow-hidden">
                      <span className={`block text-[11px] font-black leading-tight tabular-nums truncate ${isProfit ? "text-emerald-400" : isLoss ? "text-rose-400" : "text-zinc-400"}`}>
                        {isProfit ? "+" : ""}{formatMoney(pnl)}
                      </span>
                      <span className="block text-[9px] text-spotify-muted">
                        {data?.items.length} ดีล
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-transparent select-none">-</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected Day Details Panel */}
        {selectedDate && (
          <div className="mt-4 border-t border-white/10 pt-4 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-white">
                  รายละเอียดวันที่ {formatDateDDMMYYYY(selectedDate)}
                </span>
              </div>
              {selectedDayData && (
                <span className={`text-xs font-bold tabular-nums ${selectedDayData.totalThb >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  รวม {selectedDayData.totalThb >= 0 ? "+" : ""}{formatMoney(selectedDayData.totalThb)}
                </span>
              )}
            </div>

            {selectedDayData && selectedDayData.items.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {selectedDayData.items.map(({ inv, pnlThb, pnlNative, pnlPct }, idx) => {
                  const isUsd = inv.quote_asset === "USD" || inv.quote_asset === "USDT"
                  const isProfit = pnlThb >= 0
                  const displayPnl = isUsd && pnlNative !== null
                    ? `$${Math.abs(pnlNative).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : `฿${Math.abs(pnlThb).toLocaleString("th-TH")}`

                  return (
                    <div
                      key={inv.id || idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{inv.asset_symbol}</span>
                        <Badge variant="outline" className="text-[10px] uppercase border-white/10 text-spotify-muted">
                          {inv.platform}
                        </Badge>
                        {inv.exit_price && (
                          <span className="text-[11px] text-spotify-muted">
                            ออก: {inv.quote_asset === "USD" ? "$" : "฿"}{Number(inv.exit_price).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="text-right tabular-nums">
                        <span className={`font-bold ${isProfit ? "text-emerald-400" : "text-rose-400"}`}>
                          {isProfit ? "+" : "-"}{displayPnl}
                        </span>
                        <span className={`ml-1.5 text-[10px] ${isProfit ? "text-emerald-400" : "text-rose-400"}`}>
                          ({isProfit ? "+" : ""}{pnlPct.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-spotify-muted py-2 text-center">
                ไม่มีรายการลงทุนที่ปิดดีลในวันนี้
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

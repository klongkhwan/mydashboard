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
  X,
} from "lucide-react"
import { WealthInvestment } from "./wealth-context"
import { calculateClosedInvestmentPnl } from "@/lib/my-wealth-calculations"
import { compactMoney, formatDateDDMMYYYY } from "@/components/dashboard/format"
import { cn } from "@/lib/utils"

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

const PROFIT_LEVEL_CLASSES = [
  "bg-emerald-500/10 border-emerald-500/25 hover:bg-emerald-500/20 text-emerald-300",
  "bg-emerald-500/20 border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-200",
  "bg-emerald-500/35 border-emerald-500/60 hover:bg-emerald-500/45 text-emerald-100",
  "bg-emerald-500/60 border-emerald-400/80 hover:bg-emerald-500/70 text-white",
]

const LOSS_LEVEL_CLASSES = [
  "bg-rose-500/10 border-rose-500/25 hover:bg-rose-500/20 text-rose-300",
  "bg-rose-500/20 border-rose-500/40 hover:bg-rose-500/30 text-rose-200",
  "bg-rose-500/35 border-rose-500/60 hover:bg-rose-500/45 text-rose-100",
  "bg-rose-500/60 border-rose-400/80 hover:bg-rose-500/70 text-white",
]

function formatCompactPnl(pnlThb: number, currency: "THB" | "USD", rate: number): string {
  if (pnlThb === 0) return `${currency === "USD" ? "$" : "฿"}0`
  const sign = pnlThb > 0 ? "+" : "-"
  const symbol = currency === "USD" ? "$" : "฿"
  const compact = compactMoney(Math.abs(pnlThb), currency, rate)
  return `${sign}${symbol}${compact}`
}

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

  const todayStr = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  }, [])

  const monthKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}`
  const isViewingCurrentMonth = currentYear === now.getFullYear() && currentMonth === (now.getMonth() + 1)
  const totalDaysInMonth = new Date(currentYear, currentMonth, 0).getDate()

  // Group closed investments by date
  const { dailyData, monthStats, maxDailyAbsPnl } = useMemo(() => {
    const dailyMap = new Map<string, { totalThb: number; items: { inv: WealthInvestment; pnlThb: number; pnlNative: number | null; pnlPct: number }[] }>()
    let monthTotalThb = 0
    let winDays = 0
    let lossDays = 0
    let totalClosedTrades = 0
    let maxAbs = 0

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

    // Count win/loss days for current month and find max absolute daily PnL
    dailyMap.forEach((val, dateStr) => {
      if (dateStr.startsWith(monthKey)) {
        const absVal = Math.abs(val.totalThb)
        if (absVal > maxAbs) maxAbs = absVal
        if (val.totalThb > 0) winDays += 1
        else if (val.totalThb < 0) lossDays += 1
      }
    })

    return {
      dailyData: dailyMap,
      maxDailyAbsPnl: maxAbs,
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
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-4xl overflow-y-auto p-4 sm:p-6 bg-background border border-white/10 text-white gap-4">
        {/* Header with right-padding for the dialog close button */}
        <DialogHeader className="border-b border-white/10 pb-4 pr-8 sm:pr-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                  Daily PnL Heatmap
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary uppercase">
                    {displayCurrency}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-xs mt-0.5">
                  สรุปกำไร / ขาดทุนที่ปิดดีลไปแล้วในแต่ละวันของเดือน
                </DialogDescription>
              </div>
            </div>

            {/* Month Navigator Controls */}
            <div className="flex items-center gap-1.5 bg-secondary/40 border border-white/10 rounded-lg p-1 self-start sm:self-auto shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-white hover:bg-white/10"
                onClick={handlePrevMonth}
                title="เดือนก่อนหน้า"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <button
                type="button"
                onClick={handleCurrentMonth}
                className="px-2.5 py-1 text-xs font-bold text-white hover:text-primary transition-colors flex items-center gap-1.5"
                title="คลิกเพื่อกลับสู่เดือนปัจจุบัน"
              >
                <span>{MONTH_NAMES[currentMonth - 1]} {currentYear}</span>
                {isViewingCurrentMonth && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" title="กำลังดูเดือนปัจจุบัน" />
                )}
              </button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-white hover:bg-white/10"
                onClick={handleNextMonth}
                title="เดือนถัดไป"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Monthly Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-3 rounded-xl border border-white/10 bg-white/[0.03] min-w-0">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-medium">กำไรสุทธิเดือนนี้</span>
              {monthStats.monthTotalThb >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              )}
            </div>
            <p className={cn(
              "text-base sm:text-lg font-black tabular-nums truncate",
              monthStats.monthTotalThb >= 0 ? "text-emerald-400" : "text-rose-400"
            )}>
              {monthStats.monthTotalThb >= 0 ? "+" : ""}{formatMoney(monthStats.monthTotalThb)}
            </p>
          </div>

          <div className="p-3 rounded-xl border border-white/10 bg-white/[0.03] min-w-0">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-medium">อัตราการชนะ</span>
              <span className="text-[10px] font-bold text-white/70">
                {monthStats.winDays}W / {monthStats.lossDays}L
              </span>
            </div>
            <p className="text-base sm:text-lg font-black text-white tabular-nums truncate">
              {monthStats.winDays + monthStats.lossDays > 0
                ? `${monthStats.winRate.toFixed(1)}%`
                : "—"}
            </p>
          </div>

          <div className="p-3 rounded-xl border border-white/10 bg-white/[0.03] min-w-0">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-medium">วันที่มีการเทรด</span>
              <span className="text-[10px] text-muted-foreground">
                / {totalDaysInMonth} วัน
              </span>
            </div>
            <p className="text-base sm:text-lg font-black text-white tabular-nums truncate">
              {monthStats.winDays + monthStats.lossDays} <span className="text-xs font-normal text-muted-foreground">วัน</span>
            </p>
          </div>

          <div className="p-3 rounded-xl border border-white/10 bg-white/[0.03] min-w-0">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-medium">ดีลที่ปิดทั้งหมด</span>
              <span className="text-[10px] text-muted-foreground">
                เฉลี่ย {(monthStats.totalClosedTrades / Math.max(monthStats.winDays + monthStats.lossDays, 1)).toFixed(1)}/วัน
              </span>
            </div>
            <p className="text-base sm:text-lg font-black text-white tabular-nums truncate">
              {monthStats.totalClosedTrades} <span className="text-xs font-normal text-muted-foreground">ดีล</span>
            </p>
          </div>
        </div>

        {/* Calendar Grid Header */}
        <div className="space-y-1.5">
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center">
            {DAY_NAMES.map((day, idx) => (
              <span
                key={day}
                className={cn(
                  "text-[11px] font-bold py-1",
                  idx === 0 ? "text-rose-400/80" : idx === 6 ? "text-sky-400/80" : "text-muted-foreground"
                )}
              >
                {day}
              </span>
            ))}
          </div>

          {/* Calendar Grid Cells */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {calendarDays.map((cell, idx) => {
              if (!cell.dateStr) {
                return <div key={`empty-${idx}`} className="min-h-[64px] sm:min-h-[74px] rounded-lg bg-transparent pointer-events-none" />
              }

              const data = dailyData.get(cell.dateStr)
              const hasData = Boolean(data && data.items.length > 0)
              const pnl = data ? data.totalThb : 0
              const isProfit = pnl > 0
              const isLoss = pnl < 0
              const isSelected = selectedDate === cell.dateStr
              const isToday = cell.dateStr === todayStr

              // Heatmap styling based on daily performance
              let cellBg = isToday
                ? "bg-primary/[0.03] border-primary/30 text-muted-foreground hover:bg-primary/[0.06]"
                : "bg-white/[0.02] border-white/5 hover:border-white/20 text-muted-foreground"

              if (hasData) {
                const scaleMax = Math.max(maxDailyAbsPnl, 15000)
                const ratio = Math.abs(pnl) / scaleMax
                const level = ratio >= 0.8 ? 3 : ratio >= 0.45 ? 2 : ratio >= 0.15 ? 1 : 0
                if (isProfit) {
                  cellBg = PROFIT_LEVEL_CLASSES[level]
                } else if (isLoss) {
                  cellBg = LOSS_LEVEL_CLASSES[level]
                } else {
                  cellBg = "bg-zinc-800/80 border-zinc-700 text-zinc-300"
                }
              }

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => setSelectedDate(isSelected ? null : cell.dateStr)}
                  title={
                    hasData
                      ? `${cell.dateStr}: ${isProfit ? "+" : ""}${formatMoney(pnl)} (${data?.items.length} ดีล)`
                      : cell.dateStr || undefined
                  }
                  className={cn(
                    "relative flex flex-col justify-between p-1.5 sm:p-2 min-h-[64px] sm:min-h-[74px] rounded-lg border text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    cellBg,
                    isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background z-10 border-primary"
                  )}
                >
                  <div className="flex items-center justify-between w-full leading-none">
                    <div className="flex items-center gap-1">
                      <span className={cn(
                        "text-[11px] sm:text-xs font-semibold tabular-nums",
                        isToday ? "text-primary font-bold" : "text-white/80"
                      )}>
                        {cell.dayNumber}
                      </span>
                      {isToday && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" title="วันนี้" />
                      )}
                    </div>
                    {hasData && (
                      <span className="text-[9px] sm:text-[10px] px-1 py-0.5 rounded bg-black/40 border border-white/5 font-semibold tabular-nums text-white/90">
                        {data?.items.length} <span className="hidden sm:inline">ดีล</span>
                      </span>
                    )}
                  </div>

                  {hasData ? (
                    <div className="w-full text-right overflow-hidden mt-auto pt-1">
                      <span className={cn(
                        "block text-[10px] sm:text-xs font-black leading-tight tabular-nums truncate",
                        isProfit ? "text-emerald-400" : isLoss ? "text-rose-400" : "text-zinc-300"
                      )}>
                        <span className="hidden sm:inline">{isProfit ? "+" : ""}{formatMoney(pnl)}</span>
                        <span className="sm:hidden">{formatCompactPnl(pnl, displayCurrency, usdThbRate)}</span>
                      </span>
                    </div>
                  ) : (
                    <div className="mt-auto h-2" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Color Legend & Interaction hint */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-muted-foreground border-t border-white/5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80">ผลตอบแทน:</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-rose-400 font-medium">ขาดทุน</span>
                <div className="flex items-center gap-0.5" title="ระดับขาดทุน (มาก -> น้อย)">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/60" />
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/35" />
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/20" />
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/10" />
                </div>
                <span className="w-2.5 h-2.5 rounded-sm bg-white/5 border border-white/10" title="ไม่มีรายการ" />
                <div className="flex items-center gap-0.5" title="ระดับกำไร (น้อย -> มาก)">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/10" />
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/20" />
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/35" />
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/60" />
                </div>
                <span className="text-[10px] text-emerald-400 font-medium">กำไร</span>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              คลิกเลือกวันที่ในปฏิทินเพื่อดูรายการดีล
            </span>
          </div>
        </div>

        {/* Selected Day Details Panel */}
        {selectedDate && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 sm:p-4 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white block truncate">
                    รายละเอียดวันที่ {formatDateDDMMYYYY(selectedDate)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {selectedDayData?.items.length || 0} ดีลที่ปิดในวันนี้
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {selectedDayData && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-mono font-bold text-xs px-2.5 py-1",
                      selectedDayData.totalThb >= 0
                        ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                        : "border-rose-500/30 text-rose-400 bg-rose-500/10"
                    )}
                  >
                    รวม {selectedDayData.totalThb >= 0 ? "+" : ""}{formatMoney(selectedDayData.totalThb)}
                  </Badge>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10"
                  onClick={() => setSelectedDate(null)}
                  title="ปิดรายละเอียด"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {selectedDayData && selectedDayData.items.length > 0 ? (
              <div className="space-y-2 mt-3 max-h-56 overflow-y-auto pr-1">
                {selectedDayData.items.map(({ inv, pnlThb, pnlNative, pnlPct }, idx) => {
                  const isUsd = inv.quote_asset === "USD" || inv.quote_asset === "USDT"
                  const isProfit = pnlThb >= 0
                  const displayPnl = isUsd && pnlNative !== null
                    ? `$${Math.abs(pnlNative).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : `฿${Math.abs(pnlThb).toLocaleString("th-TH")}`

                  return (
                    <div
                      key={inv.id || idx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-white text-sm shrink-0">{inv.asset_symbol}</span>
                        <Badge variant="outline" className="text-[10px] uppercase border-white/10 text-muted-foreground shrink-0">
                          {inv.platform}
                        </Badge>
                        {inv.exit_price && (
                          <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">
                            ออก: {inv.quote_asset === "USD" ? "$" : "฿"}{Number(inv.exit_price).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="text-right tabular-nums shrink-0 ml-2">
                        <span className={`font-bold text-sm ${isProfit ? "text-emerald-400" : "text-rose-400"}`}>
                          {isProfit ? "+" : "-"}{displayPnl}
                        </span>
                        <span className={`ml-2 text-xs font-semibold ${isProfit ? "text-emerald-400" : "text-rose-400"}`}>
                          ({isProfit ? "+" : ""}{pnlPct.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">
                ไม่มีรายการลงทุนที่ปิดดีลในวันนี้
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState, useEffect } from "react"
import { KpiCards } from "@/components/dashboard/kpi-cards"
import { CashFlowTrendChart } from "@/components/dashboard/cash-flow-trend-chart"
import { EconomicCalendarToday } from "@/components/dashboard/economic-calendar-today"
import { UpcomingSubscriptions } from "@/components/dashboard/upcoming-subscriptions"
import { PendingExpenses } from "@/components/dashboard/pending-expenses"
import { RecentTransactions } from "@/components/dashboard/recent-transactions"
import { AlertTriangle } from "lucide-react"
import { DashboardSummary } from "@/lib/dashboard-summary"
import { cn } from "@/lib/utils"

interface DashboardViewProps {
  userName: string
  generatedAt: string
  summary: DashboardSummary
  errors: {
    wealth?: string
    subscriptions?: string
  }
  usdThbRate: number
}

export function DashboardView({
  userName,
  generatedAt,
  summary,
  errors,
  usdThbRate,
}: DashboardViewProps) {
  const [displayCurrency, setDisplayCurrency] = useState<"THB" | "USD">("THB")

  useEffect(() => {
    try {
      const saved = localStorage.getItem("superlboard_currency")
      if (saved === "USD" || saved === "THB") {
        setDisplayCurrency(saved)
      }
    } catch {}
  }, [])

  const handleCurrencyChange = (curr: "THB" | "USD") => {
    setDisplayCurrency(curr)
    try {
      localStorage.setItem("superlboard_currency", curr)
    } catch {}
  }

  const hasAnyError = Boolean(errors.wealth || errors.subscriptions)

  return (
    <div className="mx-auto w-full max-w-[1600px] p-6 lg:p-8 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Dashboard</span>
          <h1 className="text-2xl font-black text-white sm:text-3xl mt-1">สวัสดี, {userName}</h1>
          <p className="text-xs text-spotify-muted mt-1">ภาพรวมกระแสเงินสด ค่าบริการ และเหตุการณ์สำคัญของวันนี้</p>
        </div>

        {/* Global Currency Switcher & Info */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-spotify-muted hidden md:inline tabular-nums">
            1 USD ≈ ฿{usdThbRate.toFixed(2)}
          </span>
          <div className="flex items-center rounded-xl border border-white/10 bg-background/90 p-1 shadow-sm">
            <button
              type="button"
              onClick={() => handleCurrencyChange("THB")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-black transition-all",
                displayCurrency === "THB"
                  ? "bg-primary text-black shadow-play"
                  : "text-spotify-muted hover:text-white"
              )}
            >
              THB
            </button>
            <button
              type="button"
              onClick={() => handleCurrencyChange("USD")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-black transition-all",
                displayCurrency === "USD"
                  ? "bg-primary text-black shadow-play"
                  : "text-spotify-muted hover:text-white"
              )}
            >
              USD
            </button>
          </div>
          <span className="text-xs text-muted-foreground hidden lg:inline tabular-nums">
            อัปเดตล่าสุด {generatedAt} น.
          </span>
        </div>
      </div>

      {hasAnyError && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p>
            {errors.wealth && `ระบบการเงิน: ${errors.wealth} `}
            {errors.subscriptions && `ระบบค่าบริการ: ${errors.subscriptions}`}
          </p>
        </div>
      )}

      {/* KPI Cards Row */}
      <KpiCards summary={summary} currency={displayCurrency} rate={usdThbRate} />

      {/* Middle Row: Cash Flow Trend & Economic Calendar */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <CashFlowTrendChart
          months={summary.months}
          currency={displayCurrency}
          rate={usdThbRate}
          className="xl:col-span-2"
        />
        <EconomicCalendarToday className="xl:col-span-1" />
      </div>

      {/* Bottom Row: Upcoming Subscriptions, Pending Expenses, Recent Transactions */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <UpcomingSubscriptions
          data={summary.subscriptions}
          currency={displayCurrency}
          rate={usdThbRate}
        />
        <PendingExpenses
          data={summary.pending}
          currency={displayCurrency}
          rate={usdThbRate}
        />
        <RecentTransactions
          items={summary.recent}
          currency={displayCurrency}
          rate={usdThbRate}
          className="md:col-span-2 xl:col-span-1"
        />
      </div>
    </div>
  )
}

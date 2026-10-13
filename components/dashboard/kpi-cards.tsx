import { ArrowDownRight, ArrowUpRight, TrendingUp, TrendingDown, DollarSign, Wallet } from "lucide-react"
import { money, formatPercent, formatThaiMonth } from "./format"
import { DashboardSummary } from "@/lib/dashboard-summary"

interface KpiCardsProps {
  summary: DashboardSummary
}

export function KpiCards({ summary }: KpiCardsProps) {
  const { current, deltas, previousMonthKey } = summary
  const prevMonthLabel = formatThaiMonth(previousMonthKey)

  const cards = [
    {
      title: "รายรับ (Income)",
      value: money(current.income),
      icon: DollarSign,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
      deltaPercent: deltas.incomePercent,
      deltaDiff: deltas.incomeDiff,
      // For income: up is good (green), down is bad (red)
      isPositiveGood: true,
      valueColor: "text-white",
    },
    {
      title: "รายจ่าย (จ่ายแล้ว)",
      value: money(current.paidExpenses),
      icon: Wallet,
      iconColor: "text-[#539df5]",
      iconBg: "bg-[#539df5]/10",
      deltaPercent: deltas.paidExpensesPercent,
      deltaDiff: deltas.paidExpensesDiff,
      // For expense: down is good (green), up is bad (red)
      isPositiveGood: false,
      valueColor: "text-white",
    },
    {
      title: "Net Cash (สุทธิ)",
      value: money(current.net),
      icon: current.net >= 0 ? TrendingUp : TrendingDown,
      iconColor: current.net >= 0 ? "text-primary" : "text-destructive",
      iconBg: current.net >= 0 ? "bg-primary/10" : "bg-destructive/10",
      deltaPercent: deltas.netPercent,
      deltaDiff: deltas.netDiff,
      isPositiveGood: true,
      valueColor: current.net >= 0 ? "text-white" : "text-destructive",
    },
    {
      title: "Realized PnL (กำไร/ขาดทุน)",
      value: money(current.realizedPnl),
      icon: TrendingUp,
      iconColor: current.realizedPnl >= 0 ? "text-primary" : "text-destructive",
      iconBg: current.realizedPnl >= 0 ? "bg-primary/10" : "bg-destructive/10",
      deltaPercent: null, // PnL is better compared by amount diff
      deltaDiff: deltas.realizedPnlDiff,
      isPositiveGood: true,
      isAmountDeltaOnly: true,
      valueColor: current.realizedPnl >= 0 ? "text-primary" : "text-destructive",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, idx) => {
        const Icon = card.icon
        const diff = card.deltaDiff

        let trendText = ""
        let trendColor = "text-[#b3b3b3]"
        let TrendIcon = null

        if (card.isAmountDeltaOnly) {
          if (diff > 0) {
            trendText = `+${money(diff)} vs ${prevMonthLabel}`
            trendColor = "text-primary"
            TrendIcon = ArrowUpRight
          } else if (diff < 0) {
            trendText = `${money(diff)} vs ${prevMonthLabel}`
            trendColor = "text-destructive"
            TrendIcon = ArrowDownRight
          } else {
            trendText = `คงที่ vs ${prevMonthLabel}`
            trendColor = "text-[#b3b3b3]"
          }
        } else if (card.deltaPercent != null) {
          const isUp = card.deltaPercent > 0
          const isGood = card.isPositiveGood ? isUp : !isUp
          trendColor = isGood ? "text-primary" : "text-destructive"
          TrendIcon = isUp ? ArrowUpRight : ArrowDownRight
          trendText = `${formatPercent(card.deltaPercent)} vs ${prevMonthLabel}`
        } else {
          trendText = `— ไม่มีข้อมูลเดือนก่อน`
          trendColor = "text-[#7c7c7c]"
        }

        return (
          <div
            key={idx}
            className="card-spotify flex flex-col justify-between border border-white/5 p-5 shadow-sm transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-spotify-label">{card.title}</span>
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full ${card.iconBg} ${card.iconColor}`}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-4">
              <p className={`text-2xl font-bold tracking-tight ${card.valueColor}`}>
                {card.value}
              </p>

              <div className="mt-2 flex items-center gap-1 text-xs">
                {TrendIcon && <TrendIcon className={`h-3.5 w-3.5 ${trendColor}`} />}
                <span className={trendColor}>{trendText}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

import { PageHeader } from "@/components/ui/page-header"
import { getDashboardData } from "./actions"
import { KpiCards } from "@/components/dashboard/kpi-cards"
import { CashFlowTrendChart } from "@/components/dashboard/cash-flow-trend-chart"
import { EconomicCalendarToday } from "@/components/dashboard/economic-calendar-today"
import { UpcomingSubscriptions } from "@/components/dashboard/upcoming-subscriptions"
import { PendingExpenses } from "@/components/dashboard/pending-expenses"
import { RecentTransactions } from "@/components/dashboard/recent-transactions"
import { AlertTriangle } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const { userName, generatedAt, summary, errors } = await getDashboardData()

  const hasAnyError = Boolean(errors.wealth || errors.subscriptions)

  return (
    <div className="mx-auto w-full max-w-[1600px] p-6 lg:p-8 space-y-8">
      <PageHeader
        eyebrow="Dashboard"
        title={`สวัสดี, ${userName}`}
        description="ภาพรวมกระแสเงินสด ค่าบริการ และเหตุการณ์สำคัญของวันนี้"
        action={
          <span className="text-xs text-[#7c7c7c]">
            ข้อมูล ณ {generatedAt}
          </span>
        }
      />

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
      <KpiCards summary={summary} />

      {/* Middle Row: Cash Flow Trend & Economic Calendar */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <CashFlowTrendChart months={summary.months} className="xl:col-span-2" />
        <EconomicCalendarToday className="xl:col-span-1" />
      </div>

      {/* Bottom Row: Upcoming Subscriptions, Pending Expenses, Recent Transactions */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <UpcomingSubscriptions data={summary.subscriptions} />
        <PendingExpenses data={summary.pending} />
        <RecentTransactions
          items={summary.recent}
          className="md:col-span-2 xl:col-span-1"
        />
      </div>
    </div>
  )
}

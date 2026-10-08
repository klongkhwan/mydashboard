import { MyWealthCashFlowChart } from "@/components/my-wealth/cash-flow-chart"
import { MyWealthQuickActions } from "@/components/my-wealth/quick-actions"
import { PageHeader } from "@/components/ui/page-header"
import { getMyWealthData } from "./actions"

export const dynamic = "force-dynamic"

export default async function MyWealthPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const params = await searchParams
  const selectedMonth = /^\d{4}-\d{2}$/.test(params.month || "") ? params.month! : new Date().toISOString().slice(0, 7)
  const data = await getMyWealthData()

  const isSelectedMonth = (date: string | null | undefined) => Boolean(date && date.startsWith(selectedMonth))
  const monthTransactions = data.transactions.filter((item: any) => isSelectedMonth(item.transaction_date))
  const income = monthTransactions.filter((item: any) => item.type === "income").reduce((sum: number, item: any) => sum + Number(item.amount_thb), 0)
  const paidExpenses = monthTransactions.filter((item: any) => item.type === "expense" && item.payment_status === "paid").reduce((sum: number, item: any) => sum + Number(item.amount_thb), 0)
  const pendingExpenses = monthTransactions.filter((item: any) => item.type === "expense" && item.payment_status === "pending").reduce((sum: number, item: any) => sum + Number(item.amount_thb), 0)
  const investmentOutflow = data.investments.filter((item: any) => isSelectedMonth(item.opened_at)).reduce((sum: number, item: any) => sum + Number(item.opened_amount_thb) + Number(item.entry_fee_thb || 0), 0)
  const investmentInflow = data.investments.filter((item: any) => item.status === "closed" && isSelectedMonth(item.closed_at)).reduce((sum: number, item: any) => sum + Number(item.closed_amount_thb || 0) - Number(item.exit_fee_thb || 0), 0)
  const closedInvestmentPnl = data.investments.filter((item: any) => item.status === "closed" && isSelectedMonth(item.closed_at)).reduce((sum: number, item: any) => sum + Number(item.closed_amount_thb || 0) - Number(item.exit_fee_thb || 0) - Number(item.opened_amount_thb || 0) - Number(item.entry_fee_thb || 0), 0)
  const dailySummary = new Map<string, { income: number; expenses: number; investmentOut: number; investmentIn: number }>()
  const dayFor = (date: string) => {
    const current = dailySummary.get(date) || { income: 0, expenses: 0, investmentOut: 0, investmentIn: 0 }
    dailySummary.set(date, current)
    return current
  }
  monthTransactions.forEach((item: any) => {
    const day = dayFor(item.transaction_date)
    if (item.type === "income") day.income += Number(item.amount_thb)
    if (item.type === "expense" && item.payment_status === "paid") day.expenses += Number(item.amount_thb)
  })
  data.investments.filter((item: any) => isSelectedMonth(item.opened_at)).forEach((item: any) => {
    dayFor(item.opened_at).investmentOut += Number(item.opened_amount_thb) + Number(item.entry_fee_thb || 0)
  })
  data.investments.filter((item: any) => item.status === "closed" && isSelectedMonth(item.closed_at)).forEach((item: any) => {
    dayFor(item.closed_at).investmentIn += Number(item.closed_amount_thb || 0) - Number(item.exit_fee_thb || 0)
  })
  const dailyRows = [...dailySummary.entries()].sort(([left], [right]) => right.localeCompare(left))
  const expenseByCategory = new Map<string, number>()
  const expenseByMerchant = new Map<string, number>()
  monthTransactions.filter((item: any) => item.type === "expense" && item.payment_status === "paid").forEach((item: any) => {
    const category = item.wealth_categories?.name || "ไม่ระบุหมวด"
    const merchant = item.merchant_or_payer || "ไม่ระบุร้านค้า"
    expenseByCategory.set(category, (expenseByCategory.get(category) || 0) + Number(item.amount_thb))
    expenseByMerchant.set(merchant, (expenseByMerchant.get(merchant) || 0) + Number(item.amount_thb))
  })
  const categoryBreakdown = [...expenseByCategory.entries()].sort(([, left], [, right]) => right - left)
  const merchantBreakdown = [...expenseByMerchant.entries()].sort(([, left], [, right]) => right - left)
  const net = income - paidExpenses - investmentOutflow + investmentInflow
  const money = (amount: number) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(amount)

  return (
    <div className="mx-auto w-full max-w-[1600px] p-6 lg:p-8 space-y-8">
      <PageHeader
        eyebrow="Personal Finance"
        title="My Wealth"
        description="ภาพรวมกระแสเงินสด รายรับ รายจ่าย และพอร์ตการลงทุนของคุณ"
        action={
          <div className="flex flex-wrap items-center justify-end gap-4">
            <form action="/dashboard/my-wealth" className="flex items-center gap-2">
              <label className="text-xs text-spotify-muted font-medium" htmlFor="month">Month</label>
              <input
                id="month"
                name="month"
                type="month"
                defaultValue={selectedMonth}
                className="spotify-input py-1.5 px-3 text-xs"
              />
              <button type="submit" className="btn-pill bg-[#1f1f1f] hover:bg-[#2a2a2a] text-white px-3 py-1.5 text-xs">Filter</button>
            </form>
            <MyWealthQuickActions categories={data.categories} />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[["Income", income], ["Paid", -paidExpenses], ["Pending", pendingExpenses], ["Net Cash", net]].map(([label, value]) => (
          <div key={String(label)} className="card-spotify p-5 border border-white/5 shadow-sm">
            <p className="text-spotify-label">{label}</p>
            <p className="text-2xl font-bold mt-2 text-white">{money(Number(value))}</p>
          </div>
        ))}
        <div className="card-spotify p-5 border border-white/5 shadow-sm">
          <p className="text-spotify-label">Realized PnL</p>
          <p className={"text-2xl font-bold mt-2 " + (closedInvestmentPnl >= 0 ? "text-primary" : "text-destructive")}>
            {money(closedInvestmentPnl)}
          </p>
        </div>
      </div>

      <MyWealthCashFlowChart rows={dailyRows.map(([date, row]) => ({ date, ...row }))} />

      <section className="card-spotify p-6 space-y-4 border border-white/5">
        <h2 className="text-lg font-bold text-white">Daily Summary</h2>
        <div className="max-h-80 space-y-2 overflow-y-auto pr-2">
          {dailyRows.map(([date, row]) => {
            const dayNet = row.income - row.expenses - row.investmentOut + row.investmentIn
            return (
              <div key={date} className="grid gap-2 border-b border-white/5 pb-3 text-sm md:grid-cols-[120px_1fr_auto]">
                <span className="font-medium text-white">{date}</span>
                <span className="text-spotify-muted">Income +{money(row.income)} · Expense -{money(row.expenses)} · Invest -{money(row.investmentOut)} · Return +{money(row.investmentIn)}</span>
                <span className={dayNet >= 0 ? "text-primary font-bold" : "text-destructive font-bold"}>Net {money(dayNet)}</span>
              </div>
            )
          })}
          {dailyRows.length === 0 && <p className="text-spotify-muted">No records for the selected month</p>}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card-spotify p-6 space-y-4 border border-white/5">
          <h2 className="text-lg font-bold text-white">Expenses by Category</h2>
          <div className="space-y-2">
            {categoryBreakdown.map(([name, amount]) => (
              <div key={name} className="flex justify-between border-b border-white/5 pb-2 text-sm">
                <span className="text-white">{name}</span>
                <span className="text-destructive font-bold">{money(amount)}</span>
              </div>
            ))}
            {categoryBreakdown.length === 0 && <p className="text-spotify-muted">No paid expenses recorded</p>}
          </div>
        </section>
        <section className="card-spotify p-6 space-y-4 border border-white/5">
          <h2 className="text-lg font-bold text-white">Expenses by Payee</h2>
          <div className="space-y-2">
            {merchantBreakdown.map(([name, amount]) => (
              <div key={name} className="flex justify-between border-b border-white/5 pb-2 text-sm">
                <span className="text-white">{name}</span>
                <span className="text-destructive font-bold">{money(amount)}</span>
              </div>
            ))}

            {merchantBreakdown.length === 0 && <p className="text-spotify-muted">No merchant records</p>}
          </div>
        </section>
      </div>
    </div>
  )
}

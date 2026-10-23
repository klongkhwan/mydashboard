"use client"

import { useMemo, useTransition, useState } from "react"
import { PageHeader } from "@/components/ui/page-header"
import { MyWealthCashFlowChart } from "@/components/my-wealth/cash-flow-chart"
import { WealthApiStatus } from "@/components/my-wealth/wealth-status"
import { useWealth } from "@/components/my-wealth/wealth-context"
import { markWealthExpensePaid } from "@/app/dashboard/my-wealth/actions"
import { formatDateDDMMYYYY, money as lockedMoney } from "@/components/dashboard/format"
import { calculateClosedInvestmentPnl } from "@/lib/my-wealth-calculations"
import { Button } from "@/components/ui/button"
import { Check, Clock, TrendingUp, ArrowUpRight, ArrowDownRight, Wallet, ReceiptText, PiggyBank, FolderCog } from "lucide-react"
import { CategoryManagerDialog } from "@/components/my-wealth/category-manager-dialog"

export default function MyWealthOverviewPage() {
  const {
    categories,
    transactions,
    investments,
    quotes,
    usdThbRate,
    displayCurrency,
    setDisplayCurrency,
    formatMoney,
    selectedMonth,
    setSelectedMonth,
    refreshData,
  } = useWealth()
  const [pending, startTransition] = useTransition()
  const [showCategoryManager, setShowCategoryManager] = useState(false)

  const money = formatMoney

  const isAllTime = selectedMonth === "all"
  const isSelectedMonth = (date: string | null | undefined) => {
    if (!date) return false
    if (isAllTime) return true
    return date.startsWith(selectedMonth)
  }

  // Filter transactions and investments
  const monthTransactions = useMemo(
    () => transactions.filter((item) => isSelectedMonth(item.transaction_date)),
    [transactions, selectedMonth, isAllTime]
  )

  const income = useMemo(
    () => monthTransactions.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount_thb), 0),
    [monthTransactions]
  )

  const paidExpenses = useMemo(
    () =>
      monthTransactions
        .filter((item) => item.type === "expense" && item.payment_status === "paid")
        .reduce((sum, item) => sum + Number(item.amount_thb), 0),
    [monthTransactions]
  )

  const pendingExpenses = useMemo(
    () =>
      monthTransactions
        .filter((item) => item.type === "expense" && item.payment_status === "pending")
        .reduce((sum, item) => sum + Number(item.amount_thb), 0),
    [monthTransactions]
  )

  const closedInvestmentPnl = useMemo(
    () =>
      investments
        .filter((item) => item.status === "closed" && isSelectedMonth(item.closed_at))
        .reduce(
          (sum, item) => sum + calculateClosedInvestmentPnl(item).pnlThb,
          0
        ),
    [investments, selectedMonth, isAllTime]
  )

  // Open investments value
  const openInvestments = useMemo(() => investments.filter((i) => i.status === "open"), [investments])
  const openCapitalThb = useMemo(
    () =>
      openInvestments.reduce((sum, item) => {
        const isUsd = item.quote_asset === "USD" || item.quote_asset === "USDT"
        const rate = usdThbRate > 0 ? usdThbRate : 34.0
        const qty = Number(item.quantity || 0)
        const price = Number(item.entry_price || 0)
        const calcUsd = qty > 0 && price > 0 ? qty * price : 0
        const raw = Number(item.opened_amount_thb || 0)
        const deposit = Number(item.deposit_amount || 0)
        if (isUsd) {
          if (deposit > 0) return sum + (deposit * rate)
          if (calcUsd > 0) return sum + (calcUsd * rate)
          return sum + raw
        }
        return sum + (calcUsd > 0 ? calcUsd : raw)
      }, 0),
    [openInvestments, usdThbRate]
  )

  // Estimated unrealized PnL from live quotes
  const estimatedUnrealizedPnlThb = useMemo(() => {
    let est = 0
    const rate = usdThbRate > 0 ? usdThbRate : 34.0
    for (const item of openInvestments) {
      const cleanBase = item.asset_symbol?.replace(/(USDT|BUSD|USDC|THB)$/i, "")?.toUpperCase() || ""
      const quote = quotes[item.asset_symbol?.toUpperCase()] || (cleanBase ? quotes[cleanBase] : undefined)
      if (quote && Number(item.entry_price) > 0) {
        const isUsdQuote = item.quote_asset === "USD" || item.quote_asset === "USDT"
        let currentPrice = quote.price
        // Only convert crypto quotes in USD if position is held in THB; Thai stocks are already in THB
        if (!isUsdQuote && item.investment_type !== "thai_stock") {
          currentPrice = currentPrice * rate
        }
        const qty = Number(item.quantity || 0)
        const price = Number(item.entry_price || 0)
        if (qty > 0 && price > 0) {
          const diffNative = (currentPrice - price) * qty
          est += isUsdQuote ? diffNative * rate : diffNative
        } else {
          const pnlPct = (currentPrice - price) / price
          const calcUsd = qty > 0 && price > 0 ? qty * price : 0
          const raw = Number(item.opened_amount_thb || 0)
          const itemThb = isUsdQuote
            ? (calcUsd > 0 ? calcUsd * rate : raw)
            : raw
          est += itemThb * pnlPct
        }
      }
    }
    return est
  }, [openInvestments, quotes, usdThbRate])

  const netCashFlow = income - paidExpenses
  const savingsRate = income > 0 ? Math.round(((income - paidExpenses) / income) * 100) : 0

  // Daily Chart rows: Only days with actual cash movement (income or paid expenses)
  const dailySummary = useMemo(() => {
    const map = new Map<string, { income: number; expenses: number }>()
    const dayFor = (date: string) => {
      const current = map.get(date) || { income: 0, expenses: 0 }
      map.set(date, current)
      return current
    }

    monthTransactions.forEach((item) => {
      if (item.type === "income" || (item.type === "expense" && item.payment_status === "paid")) {
        const day = dayFor(item.transaction_date)
        if (item.type === "income") day.income += Number(item.amount_thb)
        if (item.type === "expense" && item.payment_status === "paid") day.expenses += Number(item.amount_thb)
      }
    })

    return [...map.entries()].sort(([left], [right]) => right.localeCompare(left))
  }, [monthTransactions])

  // Category breakdown with progress bars
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; color: string; amount: number }>()
    monthTransactions
      .filter((item) => item.type === "expense" && item.payment_status === "paid")
      .forEach((item) => {
        const cat = categories.find((c) => c.id === item.category_id)
        const name = cat?.name || item.wealth_categories?.name || "ไม่ระบุหมวด"
        const color = cat?.color || item.wealth_categories?.color || "#1ed760"
        const prev = map.get(name) || { name, color, amount: 0 }
        prev.amount += Number(item.amount_thb)
        map.set(name, prev)
      })

    return [...map.values()].sort((a, b) => b.amount - a.amount)
  }, [monthTransactions, categories])

  // Pending expenses that need action
  const actionablePending = useMemo(
    () => monthTransactions.filter((item) => item.type === "expense" && item.payment_status === "pending"),
    [monthTransactions]
  )

  const handleMarkPaid = (id: string) => {
    startTransition(async () => {
      const today = new Date().toISOString().slice(0, 10)
      await markWealthExpensePaid(id, today)
      refreshData()
    })
  }

  const currentMonthStr = new Date().toISOString().slice(0, 7)
  const prevMonthStr = (() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().slice(0, 7)
  })()

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Personal Finance"
        title="My Wealth Overview"
        description="ภาพรวมกระแสเงินสด รายรับ รายจ่าย และพอร์ตการลงทุนของคุณ"
        action={
          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <WealthApiStatus showRate />

            {/* Currency Switcher */}
            <div className="flex items-center rounded-xl border border-white/10 bg-background/90 p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setDisplayCurrency("THB")}
                className={`rounded-lg px-2.5 py-1 text-xs font-black transition-all ${
                  displayCurrency === "THB" ? "bg-primary text-black shadow-play" : "text-spotify-muted hover:text-white"
                }`}
              >
                THB
              </button>
              <button
                type="button"
                onClick={() => setDisplayCurrency("USD")}
                className={`rounded-lg px-2.5 py-1 text-xs font-black transition-all ${
                  displayCurrency === "USD" ? "bg-primary text-black shadow-play" : "text-spotify-muted hover:text-white"
                }`}
              >
                USD
              </button>
            </div>

            {/* Quick Month Filter Pills */}
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-card p-1">
              <button
                type="button"
                onClick={() => setSelectedMonth(currentMonthStr)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  selectedMonth === currentMonthStr ? "bg-white text-black shadow-sm" : "text-spotify-muted hover:text-white"
                }`}
              >
                เดือนนี้
              </button>
              <button
                type="button"
                onClick={() => setSelectedMonth(prevMonthStr)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  selectedMonth === prevMonthStr ? "bg-white text-black shadow-sm" : "text-spotify-muted hover:text-white"
                }`}
              >
                เดือนก่อน
              </button>
              <button
                type="button"
                onClick={() => setSelectedMonth("all")}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  selectedMonth === "all" ? "bg-white text-black shadow-sm" : "text-spotify-muted hover:text-white"
                }`}
              >
                ทั้งหมด
              </button>
              <input
                type="month"
                value={selectedMonth === "all" ? "" : selectedMonth}
                onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
                className="spotify-input py-1 px-2 text-xs h-7 w-32 bg-transparent border-none text-white focus:ring-0"
              />
            </div>
          </div>
        }
      />

      {/* 6 Executive KPI Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Net Cash Flow */}
        <div className="card-spotify p-5 border border-white/5 bg-card/70 hover:bg-card transition-all">
          <div className="flex items-center justify-between">
            <span className="text-spotify-label">Net Cash Flow</span>
            <Wallet className="h-4 w-4 text-spotify-muted" />
          </div>
          <p className={`text-2xl font-black mt-2 tabular-nums ${netCashFlow >= 0 ? "text-primary" : "text-destructive"}`}>
            {netCashFlow >= 0 ? "+" : ""}{money(netCashFlow)}
          </p>
          <p className="text-[11px] text-spotify-muted mt-1">รายรับหักรายจ่ายจริง</p>
        </div>

        {/* Income */}
        <div className="card-spotify p-5 border border-white/5 bg-card/70 hover:bg-card transition-all">
          <div className="flex items-center justify-between">
            <span className="text-spotify-label">Income</span>
            <ArrowUpRight className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-black mt-2 text-primary tabular-nums">
            +{money(income)}
          </p>
          <p className="text-[11px] text-spotify-muted mt-1">
            {monthTransactions.filter((t) => t.type === "income").length} รายการ
          </p>
        </div>

        {/* Paid Expenses */}
        <div className="card-spotify p-5 border border-white/5 bg-card/70 hover:bg-card transition-all">
          <div className="flex items-center justify-between">
            <span className="text-spotify-label">Paid Expenses</span>
            <ArrowDownRight className="h-4 w-4 text-destructive" />
          </div>
          <p className="text-2xl font-black mt-2 text-white tabular-nums">
            -{money(paidExpenses)}
          </p>
          <p className="text-[11px] text-spotify-muted mt-1">
            อัตราการออม {savingsRate}%
          </p>
        </div>

        {/* Pending Expenses */}
        <div className="card-spotify p-5 border border-white/5 bg-card/70 hover:bg-card transition-all">
          <div className="flex items-center justify-between">
            <span className="text-spotify-label">Pending</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <p className={`text-2xl font-black mt-2 tabular-nums ${pendingExpenses > 0 ? "text-amber-400" : "text-white"}`}>
            {money(pendingExpenses)}
          </p>
          <p className="text-[11px] text-spotify-muted mt-1">
            {actionablePending.length} บิลรอชำระ
          </p>
        </div>

        {/* Active Investments */}
        <div className="card-spotify p-5 border border-white/5 bg-card/70 hover:bg-card transition-all">
          <div className="flex items-center justify-between">
            <span className="text-spotify-label">Open Capital</span>
            <TrendingUp className="h-4 w-4 text-sky-400" />
          </div>
          <p className="text-2xl font-black mt-2 text-white tabular-nums">
            {money(openCapitalThb)}
          </p>
          <p className="text-[11px] text-spotify-muted mt-1">
            {openInvestments.length} รายการถือครอง
            {estimatedUnrealizedPnlThb !== 0 && (
              <span className={estimatedUnrealizedPnlThb >= 0 ? " text-emerald-400 ml-1" : " text-rose-400 ml-1"}>
                ({estimatedUnrealizedPnlThb >= 0 ? "+" : ""}{money(estimatedUnrealizedPnlThb)})
              </span>
            )}
          </p>
        </div>

        {/* Realized PnL */}
        <div className="card-spotify p-5 border border-white/5 bg-card/70 hover:bg-card transition-all">
          <div className="flex items-center justify-between">
            <span className="text-spotify-label">Realized PnL</span>
            <PiggyBank className="h-4 w-4 text-spotify-muted" />
          </div>
          <p className={`text-2xl font-black mt-2 tabular-nums ${closedInvestmentPnl >= 0 ? "text-primary" : "text-destructive"}`}>
            {closedInvestmentPnl >= 0 ? "+" : ""}{lockedMoney(closedInvestmentPnl)}
          </p>
          <p className="text-[11px] text-spotify-muted mt-1">กำไร/ขาดทุนที่ปิดดีลแล้ว · ยอดบันทึก THB</p>
        </div>
      </div>

      {/* Middle Row: Cash Flow Chart + Actionable Pending Bills */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Daily Cash Flow Bar Chart */}
        <div className="xl:col-span-2">
          <MyWealthCashFlowChart rows={dailySummary.map(([date, row]) => ({ date, ...row }))} />
        </div>

        {/* Actionable Pending Bills Box */}
        <div className="card-spotify p-6 space-y-4 border border-white/5 bg-card/50">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <h2 className="font-bold text-white text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                รายการรอจ่าย (Pending)
              </h2>
              <p className="text-xs text-spotify-muted mt-0.5">คลิก &quot;จ่ายแล้ว&quot; เพื่อบันทึกการชำระได้ทันที</p>
            </div>
            <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/20">
              {actionablePending.length}
            </span>
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {actionablePending.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-secondary/50 p-3 hover:bg-secondary transition-all">
                <div className="min-w-0">
                  <p className="font-bold text-sm text-white truncate">
                    {item.description || item.merchant_or_payer || "ค่าใช้จ่ายรอชำระ"}
                  </p>
                  <p className="text-xs text-spotify-muted mt-0.5">
                    {formatDateDDMMYYYY(item.transaction_date)} {item.merchant_or_payer ? `· ${item.merchant_or_payer}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-bold text-sm text-destructive tabular-nums">
                    -{money(Number(item.amount_thb))}
                  </span>
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() => handleMarkPaid(item.id)}
                    variant="pill" className="h-7 px-3 text-xs"
                    title="บันทึกว่าจ่ายเงินแล้ว"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" /> จ่ายแล้ว
                  </Button>
                </div>
              </div>
            ))}
            {actionablePending.length === 0 && (
              <div className="py-12 text-center text-spotify-muted">
                <ReceiptText className="w-8 h-8 mx-auto text-spotify-muted/50 mb-2" />
                <p className="text-sm font-medium">ไม่มีรายการรอจ่ายในเดือนนี้</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Category Breakdown Progress Bars & Daily Summary Ledger */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Category Breakdown (Copilot / Monarch style) */}
        <section className="card-spotify p-6 space-y-4 border border-white/5 bg-card/50">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <h2 className="font-bold text-white text-base">สัดส่วนค่าใช้จ่ายตามหมวดหมู่</h2>
              <p className="text-xs text-spotify-muted mt-0.5">รวม {money(paidExpenses)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCategoryManager(true)}
                className="h-7 px-2 text-xs text-spotify-muted hover:text-white hover:bg-white/5"
              >
                <FolderCog className="w-3.5 h-3.5 mr-1 text-primary" /> จัดการหมวดหมู่
              </Button>
              <span className="text-xs text-spotify-muted font-bold">{categoryBreakdown.length} หมวด</span>
            </div>
          </div>

          <div className="space-y-3.5">
            {categoryBreakdown.map((cat) => {
              const pct = paidExpenses > 0 ? Math.round((cat.amount / paidExpenses) * 100) : 0
              return (
                <div key={cat.name} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium text-white">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                      <span className="text-xs text-spotify-muted font-normal">({pct}%)</span>
                    </span>
                    <span className="font-bold text-white tabular-nums">{money(cat.amount)}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: cat.color }}
                    />
                  </div>
                </div>
              )
            })}
            {categoryBreakdown.length === 0 && (
              <p className="text-spotify-muted text-sm py-8 text-center">ยังไม่มีข้อมูลค่าใช้จ่ายในเดือนนี้</p>
            )}
          </div>
        </section>

        {/* Daily Summary Ledger */}
        <section className="card-spotify p-6 space-y-4 border border-white/5 bg-card/50">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <h2 className="font-bold text-white text-base">บันทึกรายวัน (Daily Activity)</h2>
              <p className="text-xs text-spotify-muted mt-0.5">การเคลื่อนไหวของเงินเข้า-ออกในแต่ละวัน</p>
            </div>
            <span className="text-xs text-spotify-muted font-bold">{dailySummary.length} วันที่มีรายการ</span>
          </div>

          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {dailySummary.map(([date, row]) => {
              const dayNet = row.income - row.expenses
              return (
                <div key={date} className="grid gap-2 border-b border-white/5 pb-2.5 pt-1 text-xs md:grid-cols-[100px_1fr_auto] items-center">
                  <span className="font-bold text-white tabular-nums">{formatDateDDMMYYYY(date)}</span>
                  <span className="text-spotify-muted">
                    {row.income > 0 && <span className="text-primary mr-2">+รับ {money(row.income)}</span>}
                    {row.expenses > 0 && <span className="text-destructive mr-2">-จ่าย {money(row.expenses)}</span>}
                  </span>
                  <span className={`font-black tabular-nums text-right ${dayNet > 0 ? "text-primary" : dayNet < 0 ? "text-destructive" : "text-white"}`}>
                    {dayNet > 0 ? "+" : ""}{money(dayNet)}
                  </span>
                </div>
              )
            })}
            {dailySummary.length === 0 && (
              <p className="text-spotify-muted text-sm py-8 text-center">ไม่มีรายการรับ-จ่ายในเดือนที่เลือก</p>
            )}
          </div>
        </section>
      </div>

      <CategoryManagerDialog
        open={showCategoryManager}
        onOpenChange={setShowCategoryManager}
      />
    </div>
  )
}

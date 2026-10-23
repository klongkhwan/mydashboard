const { calculateClosedInvestmentPnl } = require('./my-wealth-calculations.js')

function bangkokDate(date = new Date()) {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
}

function lastNMonthKeys(todayYmd, n = 6) {
  const [yearStr, monthStr] = todayYmd.slice(0, 7).split('-')
  let year = parseInt(yearStr, 10)
  let month = parseInt(monthStr, 10)
  const results = []
  for (let i = n - 1; i >= 0; i--) {
    let m = month - i
    let y = year
    while (m <= 0) {
      m += 12
      y -= 1
    }
    const mm = String(m).padStart(2, '0')
    results.push(`${y}-${mm}`)
  }
  return results
}

function isMonthMatch(date, monthKey) {
  return typeof date === 'string' && date.startsWith(`${monthKey}-`)
}

function summarizeMonth(monthKey, { transactions = [], investments = [] }) {
  const monthTransactions = transactions.filter((t) => isMonthMatch(t.transaction_date, monthKey))

  const income = monthTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount_thb || 0), 0)

  const paidExpenses = monthTransactions
    .filter((t) => t.type === 'expense' && t.payment_status === 'paid')
    .reduce((sum, t) => sum + Number(t.amount_thb || 0), 0)

  const pendingExpenses = monthTransactions
    .filter((t) => t.type === 'expense' && t.payment_status === 'pending')
    .reduce((sum, t) => sum + Number(t.amount_thb || 0), 0)

  const investmentOutflow = investments
    .filter((inv) => isMonthMatch(inv.opened_at, monthKey))
    .reduce((sum, inv) => sum + Number(inv.opened_amount_thb || 0) + Number(inv.entry_fee_thb || 0), 0)

  const investmentInflow = investments
    .filter((inv) => inv.status === 'closed' && isMonthMatch(inv.closed_at, monthKey))
    .reduce((sum, inv) => sum + Number(inv.closed_amount_thb || 0) - Number(inv.exit_fee_thb || 0), 0)

  const realizedPnl = investments
    .filter((inv) => inv.status === 'closed' && isMonthMatch(inv.closed_at, monthKey))
    .reduce(
      (sum, inv) => sum + calculateClosedInvestmentPnl(inv).pnlThb,
      0
    )

  // Net Cash Flow: Income minus paid expenses (standard personal finance)
  const net = income - paidExpenses

  return {
    income,
    paidExpenses,
    pendingExpenses,
    investmentOutflow,
    investmentInflow,
    realizedPnl,
    net,
  }
}

function percentChange(current, previous) {
  if (previous === 0 || previous == null || isNaN(previous)) {
    return null
  }
  return ((current - previous) / Math.abs(previous)) * 100
}

function monthlySubscriptionCost(subscriptions = []) {
  return subscriptions
    .filter((sub) => sub && sub.status === 'active')
    .reduce((sum, sub) => {
      let price = Number(sub.price) || 0
      if (sub.billing_cycle === 'yearly') price = price / 12
      else if (sub.billing_cycle === 'weekly') price = price * 4
      return sum + price
    }, 0)
}

function diffInDays(targetDateStr, baseDateStr) {
  const target = new Date(`${targetDateStr}T00:00:00Z`)
  const base = new Date(`${baseDateStr}T00:00:00Z`)
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((target.getTime() - base.getTime()) / msPerDay)
}

function upcomingSubscriptions(subscriptions = [], todayYmd = bangkokDate(), withinDays = 14) {
  return subscriptions
    .filter((sub) => sub && sub.status === 'active' && sub.next_billing_date)
    .map((sub) => {
      const daysLeft = diffInDays(sub.next_billing_date, todayYmd)
      return {
        id: sub.id,
        name: sub.name,
        type: sub.type,
        price: Number(sub.price) || 0,
        billing_cycle: sub.billing_cycle,
        next_billing_date: sub.next_billing_date,
        payment_method: sub.payment_method,
        daysLeft,
      }
    })
    .filter((sub) => sub.daysLeft <= withinDays)
    .sort((a, b) => a.daysLeft - b.daysLeft)
}

function buildDashboardSummary({
  transactions = [],
  investments = [],
  pendingExpenses = [],
  subscriptions = [],
  today = bangkokDate(),
} = {}) {
  const monthKeys = lastNMonthKeys(today, 6)
  const currentMonthKey = today.slice(0, 7)
  const previousMonthKey = monthKeys[monthKeys.length - 2] || ''

  const months = monthKeys.map((key) => ({
    month: key,
    ...summarizeMonth(key, { transactions, investments }),
  }))

  const current = months[months.length - 1] || summarizeMonth(currentMonthKey, { transactions, investments })
  const previous = months[months.length - 2] || summarizeMonth(previousMonthKey, { transactions, investments })

  const deltas = {
    incomePercent: percentChange(current.income, previous.income),
    incomeDiff: current.income - previous.income,
    paidExpensesPercent: percentChange(current.paidExpenses, previous.paidExpenses),
    paidExpensesDiff: current.paidExpenses - previous.paidExpenses,
    netPercent: percentChange(current.net, previous.net),
    netDiff: current.net - previous.net,
    realizedPnlDiff: current.realizedPnl - previous.realizedPnl,
  }

  const sortedPending = [...pendingExpenses].sort((a, b) =>
    (a.transaction_date || '').localeCompare(b.transaction_date || '')
  )
  const totalPendingAmount = sortedPending.reduce((sum, item) => sum + (Number(item.amount_thb) || 0), 0)

  const monthlyCost = monthlySubscriptionCost(subscriptions)
  const upcoming = upcomingSubscriptions(subscriptions, today, 14)

  const sortedRecent = [...transactions]
    .sort((a, b) => {
      const dDiff = (b.transaction_date || '').localeCompare(a.transaction_date || '')
      if (dDiff !== 0) return dDiff
      return (b.created_at || '').localeCompare(a.created_at || '')
    })
    .slice(0, 8)

  return {
    today,
    currentMonthKey,
    previousMonthKey,
    months,
    current,
    previous,
    deltas,
    subscriptions: {
      monthlyCost,
      upcoming,
    },
    pending: {
      total: totalPendingAmount,
      count: sortedPending.length,
      items: sortedPending.slice(0, 6),
    },
    recent: sortedRecent,
  }
}

module.exports = {
  bangkokDate,
  lastNMonthKeys,
  summarizeMonth,
  percentChange,
  monthlySubscriptionCost,
  diffInDays,
  upcomingSubscriptions,
  buildDashboardSummary,
}

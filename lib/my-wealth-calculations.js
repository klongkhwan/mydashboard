function isMonthMatch(date, month) {
  return typeof date === 'string' && date.startsWith(`${month}-`)
}

function createDay(date) {
  return {
    date,
    income: 0,
    paidExpenses: 0,
    pendingExpenses: 0,
    investmentOutflow: 0,
    investmentInflow: 0,
    net: 0,
  }
}

function buildDailyCashFlow(events, month) {
  const days = new Map()

  for (const event of events) {
    if (!isMonthMatch(event.date, month)) continue

    const day = days.get(event.date) || createDay(event.date)

    if (event.kind === 'income') {
      day.income += event.amountThb
    } else if (event.kind === 'expense') {
      if (event.paymentStatus === 'pending') {
        day.pendingExpenses += event.amountThb
      } else {
        day.paidExpenses += event.amountThb
      }
    } else if (event.kind === 'investment_open') {
      day.investmentOutflow += event.openedAmountThb + (event.entryFeeThb || 0)
    } else if (event.kind === 'investment_close') {
      day.investmentInflow += event.closedAmountThb - (event.exitFeeThb || 0)
    }

    // Net Cash Flow: Income minus paid expenses (standard personal finance)
    day.net = day.income - day.paidExpenses
    days.set(event.date, day)
  }

  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date))
}

function calculateInvestmentPnl({
  quantity,
  entryPrice,
  exitPrice,
  entryFeeThb = 0,
  exitFeeThb = 0,
}) {
  return (quantity * exitPrice - exitFeeThb) - (quantity * entryPrice + entryFeeThb)
}

function filterTransactionsByTab(transactions, tab) {
  if (tab === 'income') {
    return transactions.filter((t) => t.type === 'income')
  }
  if (tab === 'expenses') {
    return transactions.filter((t) => t.type === 'expense' && t.payment_status === 'paid')
  }
  if (tab === 'pending') {
    return transactions.filter((t) => t.type === 'expense' && t.payment_status === 'pending')
  }
  return transactions
}

module.exports = {
  buildDailyCashFlow,
  calculateInvestmentPnl,
  filterTransactionsByTab,
}

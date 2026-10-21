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

function resolveQuotePrice(quotePrice, isUsdQuote, investmentType, usdThbRate) {
  if (!isUsdQuote && investmentType !== 'thai_stock') {
    return quotePrice * (usdThbRate > 0 ? usdThbRate : 34.0)
  }
  return quotePrice
}

function calculateOpenPositionCapitalThb({ quoteAsset, openedAmountThb, depositAmount, quantity, entryPrice, usdThbRate }) {
  const isUsd = quoteAsset === 'USD' || quoteAsset === 'USDT'
  const rate = usdThbRate > 0 ? usdThbRate : 34.0
  const qty = Number(quantity || 0)
  const price = Number(entryPrice || 0)
  const calcUsd = qty > 0 && price > 0 ? qty * price : 0
  const raw = Number(openedAmountThb || 0)
  const deposit = Number(depositAmount || 0)
  if (isUsd) {
    if (deposit > 0) return deposit * rate
    if (calcUsd > 0) return calcUsd * rate
    return raw
  }
  return calcUsd > 0 ? calcUsd : raw
}

module.exports = {
  buildDailyCashFlow,
  calculateInvestmentPnl,
  filterTransactionsByTab,
  resolveQuotePrice,
  calculateOpenPositionCapitalThb,
}

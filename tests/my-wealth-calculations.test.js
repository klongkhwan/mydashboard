const test = require('node:test')
const assert = require('node:assert/strict')
const {
  buildDailyCashFlow,
  calculateInvestmentPnl,
  filterTransactionsByTab,
  resolveQuotePrice,
  calculateOpenPositionCapitalThb,
} = require('../lib/my-wealth-calculations.js')

test('buildDailyCashFlow excludes pending expenses from net cash movement', () => {
  const result = buildDailyCashFlow([
    { kind: 'income', date: '2026-08-01', amountThb: 30000 },
    { kind: 'expense', date: '2026-08-01', amountThb: 250, paymentStatus: 'paid' },
    { kind: 'expense', date: '2026-08-01', amountThb: 500, paymentStatus: 'pending' },
  ], '2026-08')

  assert.deepEqual(result, [{
    date: '2026-08-01',
    income: 30000,
    paidExpenses: 250,
    pendingExpenses: 500,
    investmentOutflow: 0,
    investmentInflow: 0,
    net: 29750,
  }])
})

test('buildDailyCashFlow combines income, expenses, and investment cash events', () => {
  const result = buildDailyCashFlow([
    { kind: 'income', date: '2026-08-30', amountThb: 30000 },
    { kind: 'expense', date: '2026-08-30', amountThb: 250, paymentStatus: 'paid' },
    { kind: 'investment_open', date: '2026-08-30', openedAmountThb: 5000, entryFeeThb: 10 },
    { kind: 'investment_close', date: '2026-08-30', closedAmountThb: 6000, exitFeeThb: 10 },
  ], '2026-08')

  assert.equal(result[0].investmentOutflow, 5010)
  assert.equal(result[0].investmentInflow, 5990)
  assert.equal(result[0].net, 29750)
})

test('calculateInvestmentPnl uses entry and exit prices plus both fees', () => {
  assert.equal(calculateInvestmentPnl({
    quantity: 2,
    entryPrice: 100,
    exitPrice: 120,
    entryFeeThb: 10,
    exitFeeThb: 5,
  }), 25)
})

test('filterTransactionsByTab separates all, income, paid expenses, and pending expenses', () => {
  const sample = [
    { id: '1', type: 'income', amount_thb: 5000 },
    { id: '2', type: 'expense', payment_status: 'paid', amount_thb: 200 },
    { id: '3', type: 'expense', payment_status: 'pending', amount_thb: 800 },
  ]
  assert.equal(filterTransactionsByTab(sample, 'all').length, 3)
  assert.deepEqual(filterTransactionsByTab(sample, 'income'), [sample[0]])
  assert.deepEqual(filterTransactionsByTab(sample, 'expenses'), [sample[1]])
  assert.deepEqual(filterTransactionsByTab(sample, 'pending'), [sample[2]])
})

test('resolveQuotePrice does not multiply Thai stock price by USD rate', () => {
  // PTT.BK is already in THB
  const thaiStockPrice = resolveQuotePrice(33.0, false, 'thai_stock', 34.0)
  assert.equal(thaiStockPrice, 33.0)

  // Crypto in USD held in THB position is converted to THB
  const cryptoPrice = resolveQuotePrice(68000, false, 'crypto_holding', 34.0)
  assert.equal(cryptoPrice, 68000 * 34.0)

  // USD position stays in USD
  const usdPrice = resolveQuotePrice(230.0, true, 'foreign_stock', 34.0)
  assert.equal(usdPrice, 230.0)
})

test('calculateOpenPositionCapitalThb handles foreign investment without quantity and price', () => {
  // Foreign investment with 34,000 THB entered, without quantity/price
  const capital = calculateOpenPositionCapitalThb({
    quoteAsset: 'USD',
    openedAmountThb: 34000,
    depositAmount: 0,
    quantity: 0,
    entryPrice: 0,
    usdThbRate: 34.0,
  })
  // Must be 34,000 THB, NOT 34,000 * 34 = 1,156,000 THB
  assert.equal(capital, 34000)
})

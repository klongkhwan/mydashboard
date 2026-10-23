const test = require('node:test')
const assert = require('node:assert/strict')
const {
  buildDailyCashFlow,
  calculateInvestmentPnl,
  filterTransactionsByTab,
  resolveQuotePrice,
  calculateOpenPositionCapitalThb,
  calculateClosedInvestmentPnl,
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

test('closed SOL uses the buy and sell prices even when stored cash amounts disagree', () => {
  const result = calculateClosedInvestmentPnl({
    quote_asset: 'USDT',
    quantity: '31.294',
    entry_price: '103.56',
    exit_price: '104.875',
    opened_amount_thb: 3240.81,
    closed_amount_thb: 110800,
  }, 33.76)

  assert.equal(result.pnlNative.toFixed(2), '41.15')
  assert.equal(result.pnlPct.toFixed(2), '1.27')
  assert.equal(result.pnlThb.toFixed(2), '1389.29')
})

test('closed USD positions deduct both THB fees even without recorded cash proceeds', () => {
  const result = calculateClosedInvestmentPnl({
    quote_asset: 'USD', quantity: 2, entry_price: 100, exit_price: 120,
    opened_amount_thb: 6800, closed_amount_thb: 0,
    entry_fee_thb: 34, exit_fee_thb: 68,
  }, 34)

  assert.equal(result.pnlNative, 37)
  assert.equal(result.pnlThb, 1258)
  assert.equal(result.pnlPct, 18.5)
})

test('closed THB price losses do not get multiplied by the USD rate', () => {
  const result = calculateClosedInvestmentPnl({
    quote_asset: 'THB', quantity: 10, entry_price: 100, exit_price: 90,
    opened_amount_thb: 1000, closed_amount_thb: 900,
    entry_fee_thb: 5, exit_fee_thb: 5,
  }, 34)

  assert.deepEqual(result, { pnlNative: -110, pnlThb: -110, pnlPct: -11 })
})

test('closed positions without an exit price use cash proceeds and the displayed entry cost', () => {
  const result = calculateClosedInvestmentPnl({
    quote_asset: 'USD', quantity: 2, entry_price: 100,
    opened_amount_thb: 6800, closed_amount_thb: 8160,
  }, 34)

  assert.equal(result.pnlNative, 40)
  assert.equal(result.pnlPct, 20)
})

test('cash-only and dual asset settlements keep cash-based realized profit', () => {
  for (const fields of [{}, { investment_type: 'dual_asset', quantity: 2, entry_price: 100, exit_price: 120 }]) {
    const result = calculateClosedInvestmentPnl({
      quote_asset: 'USD', opened_amount_thb: 3400, closed_amount_thb: 3740,
      entry_fee_thb: 34, exit_fee_thb: 34, ...fields,
    }, 34)
    assert.deepEqual(result, { pnlNative: null, pnlThb: 272, pnlPct: 8 })
  }
})

test('closed gains and fees remain fixed when the live exchange rate changes', () => {
  const closed = {
    quote_asset: 'USDT', quantity: 2, entry_price: 100, exit_price: 120,
    opened_amount_thb: 6800, closed_amount_thb: 8160,
    entry_fee_thb: 34, exit_fee_thb: 68,
  }
  // The second argument models the previous caller passing a fresh market rate.
  const before = calculateClosedInvestmentPnl(closed, 30)
  const after = calculateClosedInvestmentPnl(closed, 40)
  assert.deepEqual(after, before)
  assert.deepEqual(after, { pnlNative: 37, pnlThb: 1258, pnlPct: 18.5 })
})

test('cash-only closed records without a historical USD basis show recorded THB profit', () => {
  const result = calculateClosedInvestmentPnl({
    quote_asset: 'USD', opened_amount_thb: 3400, closed_amount_thb: 3740,
    entry_fee_thb: 34, exit_fee_thb: 34,
  }, 40)
  assert.deepEqual(result, { pnlNative: null, pnlThb: 272, pnlPct: 8 })
})

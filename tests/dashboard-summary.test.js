const test = require('node:test')
const assert = require('node:assert/strict')
const {
  bangkokDate,
  lastNMonthKeys,
  summarizeMonth,
  percentChange,
  monthlySubscriptionCost,
  upcomingSubscriptions,
  buildDashboardSummary,
} = require('../lib/dashboard-summary.js')

test('bangkokDate formats UTC timestamp to Asia/Bangkok YYYY-MM-DD', () => {
  // 17:30 UTC on 2026-10-11 is 00:30 on 2026-10-12 in Bangkok (+7)
  const result = bangkokDate('2026-10-11T17:30:00Z')
  assert.equal(result, '2026-10-12')
})

test('lastNMonthKeys generates 6 consecutive month keys with year rollover', () => {
  const result = lastNMonthKeys('2026-02-15', 6)
  assert.deepEqual(result, ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02'])
})

test('summarizeMonth excludes pending expenses and calculates net and realized PnL correctly', () => {
  const transactions = [
    { type: 'income', transaction_date: '2026-10-01', amount_thb: 50000, payment_status: 'paid' },
    { type: 'expense', transaction_date: '2026-10-02', amount_thb: 20000, payment_status: 'paid' },
    { type: 'expense', transaction_date: '2026-10-03', amount_thb: 5000, payment_status: 'pending' },
    // Transaction in another month
    { type: 'income', transaction_date: '2026-09-30', amount_thb: 30000, payment_status: 'paid' },
  ]

  const investments = [
    {
      status: 'open',
      opened_at: '2026-10-05',
      opened_amount_thb: 10000,
      entry_fee_thb: 50,
    },
    {
      status: 'closed',
      opened_at: '2026-09-10',
      opened_amount_thb: 8000,
      entry_fee_thb: 40,
      closed_at: '2026-10-10',
      closed_amount_thb: 12000,
      exit_fee_thb: 60,
    },
  ]

  const summary = summarizeMonth('2026-10', { transactions, investments })

  assert.equal(summary.income, 50000)
  assert.equal(summary.paidExpenses, 20000)
  assert.equal(summary.pendingExpenses, 5000)
  assert.equal(summary.investmentOutflow, 10050)
  assert.equal(summary.investmentInflow, 11940)
  // Net = 50000 - 20000 - 10050 + 11940 = 31890
  assert.equal(summary.net, 31890)
  // Realized PnL = (12000 - 60) - (8000 + 40) = 11940 - 8040 = 3900
  assert.equal(summary.realizedPnl, 3900)
})

test('percentChange handles 0 or null previous values and computes delta', () => {
  assert.equal(percentChange(100, 0), null)
  assert.equal(percentChange(100, null), null)
  assert.equal(percentChange(120, 100), 20)
  assert.equal(percentChange(80, 100), -20)
})

test('monthlySubscriptionCost calculates equivalent monthly cost for active subscriptions', () => {
  const subscriptions = [
    { status: 'active', price: 300, billing_cycle: 'monthly' },
    { status: 'active', price: 1200, billing_cycle: 'yearly' }, // 100/mo
    { status: 'active', price: 50, billing_cycle: 'weekly' },    // 200/mo
    { status: 'canceled', price: 500, billing_cycle: 'monthly' },
    { status: 'paused', price: 200, billing_cycle: 'monthly' },
  ]

  const cost = monthlySubscriptionCost(subscriptions)
  assert.equal(cost, 300 + 100 + 200)
})

test('upcomingSubscriptions filters within 14 days (including overdue) and sorts by daysLeft', () => {
  const today = '2026-10-12'
  const subscriptions = [
    { id: '1', name: 'Overdue', status: 'active', price: 100, billing_cycle: 'monthly', next_billing_date: '2026-10-10' }, // -2 days
    { id: '2', name: 'In 3 days', status: 'active', price: 200, billing_cycle: 'monthly', next_billing_date: '2026-10-15' }, // 3 days
    { id: '3', name: 'In 14 days', status: 'active', price: 300, billing_cycle: 'monthly', next_billing_date: '2026-10-26' }, // 14 days
    { id: '4', name: 'Too far', status: 'active', price: 400, billing_cycle: 'monthly', next_billing_date: '2026-11-01' }, // 20 days
    { id: '5', name: 'Canceled', status: 'canceled', price: 500, billing_cycle: 'monthly', next_billing_date: '2026-10-13' },
  ]

  const upcoming = upcomingSubscriptions(subscriptions, today, 14)
  assert.equal(upcoming.length, 3)
  assert.equal(upcoming[0].name, 'Overdue')
  assert.equal(upcoming[0].daysLeft, -2)
  assert.equal(upcoming[1].name, 'In 3 days')
  assert.equal(upcoming[1].daysLeft, 3)
  assert.equal(upcoming[2].name, 'In 14 days')
  assert.equal(upcoming[2].daysLeft, 14)
})

test('buildDashboardSummary creates complete 6-month overview and sub-structures', () => {
  const today = '2026-10-12'
  const summary = buildDashboardSummary({
    transactions: [
      { id: 't1', type: 'income', transaction_date: '2026-10-05', amount_thb: 20000, payment_status: 'paid', created_at: '2026-10-05T08:00:00Z' },
      { id: 't2', type: 'income', transaction_date: '2026-09-05', amount_thb: 15000, payment_status: 'paid', created_at: '2026-09-05T08:00:00Z' },
    ],
    investments: [],
    pendingExpenses: [
      { id: 'p1', type: 'expense', transaction_date: '2026-10-15', amount_thb: 1500, payment_status: 'pending' },
    ],
    subscriptions: [
      { id: 's1', name: 'Sub 1', status: 'active', price: 299, billing_cycle: 'monthly', next_billing_date: '2026-10-18' },
    ],
    today,
  })

  assert.equal(summary.months.length, 6)
  assert.equal(summary.current.income, 20000)
  assert.equal(summary.previous.income, 15000)
  assert.equal(summary.pending.total, 1500)
  assert.equal(summary.pending.count, 1)
  assert.equal(summary.subscriptions.upcoming.length, 1)
  assert.equal(summary.recent.length, 2)
  assert.equal(summary.recent[0].id, 't1')
})

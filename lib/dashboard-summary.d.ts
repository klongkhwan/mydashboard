export interface MonthSummary {
  month: string
  income: number
  paidExpenses: number
  pendingExpenses: number
  investmentOutflow: number
  investmentInflow: number
  realizedPnl: number
  net: number
}

export interface SummaryDeltas {
  incomePercent: number | null
  incomeDiff: number
  paidExpensesPercent: number | null
  paidExpensesDiff: number
  netPercent: number | null
  netDiff: number
  realizedPnlDiff: number
}

export interface UpcomingSubscription {
  id: string
  name: string
  type?: string
  price: number
  billing_cycle: 'monthly' | 'yearly' | 'weekly'
  next_billing_date: string
  payment_method?: string
  daysLeft: number
}

export interface SubscriptionsSummary {
  monthlyCost: number
  upcoming: UpcomingSubscription[]
}

export interface PendingExpenseItem {
  id: string
  transaction_date: string
  amount_thb: number
  merchant_or_payer?: string | null
  description?: string | null
  wealth_categories?: { name: string; color?: string | null } | null
}

export interface PendingSummary {
  total: number
  count: number
  items: PendingExpenseItem[]
}

export interface RecentTransactionItem {
  id: string
  type: 'income' | 'expense'
  transaction_date: string
  amount_thb: number
  payment_status: 'paid' | 'pending'
  merchant_or_payer?: string | null
  description?: string | null
  created_at: string
  wealth_categories?: { name: string; color?: string | null } | null
}

export interface DashboardSummary {
  today: string
  currentMonthKey: string
  previousMonthKey: string
  months: MonthSummary[]
  current: MonthSummary
  previous: MonthSummary
  deltas: SummaryDeltas
  subscriptions: SubscriptionsSummary
  pending: PendingSummary
  recent: RecentTransactionItem[]
}

export function bangkokDate(date?: Date | string | number): string
export function lastNMonthKeys(todayYmd: string, n?: number): string[]
export function summarizeMonth(monthKey: string, data: { transactions?: unknown[]; investments?: unknown[] }): MonthSummary
export function percentChange(current: number, previous: number | null | undefined): number | null
export function monthlySubscriptionCost(subscriptions?: unknown[]): number
export function diffInDays(targetDateStr: string, baseDateStr: string): number
export function upcomingSubscriptions(subscriptions?: unknown[], todayYmd?: string, withinDays?: number): UpcomingSubscription[]
export function buildDashboardSummary(params?: {
  transactions?: unknown[]
  investments?: unknown[]
  pendingExpenses?: unknown[]
  subscriptions?: unknown[]
  today?: string
}): DashboardSummary

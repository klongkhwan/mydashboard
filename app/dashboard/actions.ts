"use server"

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import {
  bangkokDate,
  lastNMonthKeys,
  buildDashboardSummary,
  DashboardSummary,
} from "@/lib/dashboard-summary"

export interface DashboardDataResult {
  userName: string
  generatedAt: string
  summary: DashboardSummary
  errors: {
    wealth?: string
    subscriptions?: string
  }
}

export async function getDashboardData(): Promise<DashboardDataResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const today = bangkokDate()
  const monthKeys = lastNMonthKeys(today, 6)
  const since = `${monthKeys[0]}-01`

  const errors: { wealth?: string; subscriptions?: string } = {}

  // Fetch profile
  const profilePromise = supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single()

  // Fetch wealth data (transactions, investments opened, investments closed, pending expenses)
  const wealthTransactionsPromise = supabase
    .from("wealth_transactions")
    .select(
      "id, type, transaction_date, amount_thb, payment_status, merchant_or_payer, description, created_at, wealth_categories(name, color)"
    )
    .eq("user_id", user.id)
    .gte("transaction_date", since)
    .order("transaction_date", { ascending: false })

  const investmentsOpenedPromise = supabase
    .from("wealth_investments")
    .select("*")
    .eq("user_id", user.id)
    .gte("opened_at", since)

  const investmentsClosedPromise = supabase
    .from("wealth_investments")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "closed")
    .gte("closed_at", since)

  const pendingExpensesPromise = supabase
    .from("wealth_transactions")
    .select(
      "id, transaction_date, amount_thb, merchant_or_payer, description, created_at, wealth_categories(name, color)"
    )
    .eq("user_id", user.id)
    .eq("type", "expense")
    .eq("payment_status", "pending")
    .order("transaction_date", { ascending: true })

  // Fetch subscriptions
  const subscriptionsPromise = supabase
    .from("subscriptions")
    .select("id, name, type, price, billing_cycle, next_billing_date, payment_method, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("next_billing_date", { ascending: true })

  const [
    profileRes,
    txRes,
    invOpenedRes,
    invClosedRes,
    pendingRes,
    subsRes,
  ] = await Promise.all([
    profilePromise,
    wealthTransactionsPromise,
    investmentsOpenedPromise,
    investmentsClosedPromise,
    pendingExpensesPromise,
    subscriptionsPromise,
  ])

  // Process user display name
  const userName =
    profileRes.data?.full_name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "User"

  // Process wealth data
  let transactions: any[] = []
  let investments: any[] = []
  let pendingExpenses: any[] = []

  if (txRes.error) {
    errors.wealth = txRes.error.message
  } else {
    transactions = txRes.data || []
  }

  const investmentMap = new Map<string, any>()
  if (invOpenedRes.data) {
    for (const inv of invOpenedRes.data) {
      investmentMap.set(inv.id, inv)
    }
  }
  if (invClosedRes.data) {
    for (const inv of invClosedRes.data) {
      investmentMap.set(inv.id, inv)
    }
  }
  investments = Array.from(investmentMap.values())

  if (pendingRes.error) {
    if (!errors.wealth) errors.wealth = pendingRes.error.message
  } else {
    pendingExpenses = pendingRes.data || []
  }

  // Process subscriptions
  let subscriptions: any[] = []
  if (subsRes.error) {
    errors.subscriptions = subsRes.error.message
  } else {
    subscriptions = subsRes.data || []
  }

  const summary = buildDashboardSummary({
    transactions,
    investments,
    pendingExpenses,
    subscriptions,
    today,
  })

  // Format generatedAt in Thai locale
  const now = new Date()
  const generatedAt = now.toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  return {
    userName,
    generatedAt,
    summary,
    errors,
  }
}

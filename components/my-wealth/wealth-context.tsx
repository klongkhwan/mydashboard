"use client"

import React, { createContext, useContext, useState, useEffect, useTransition, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { fetchLiveInvestmentQuotes } from "@/app/dashboard/my-wealth/actions"
import { useCryptoPricesPolling } from "@/hooks/use-crypto-prices-polling"

export interface WealthCategory {
  id: string
  name: string
  type: "income" | "expense"
  color?: string | null
  sort_order?: number
  is_active: boolean
}

export interface WealthTransaction {
  id: string
  user_id?: string
  type: "income" | "expense"
  transaction_date: string
  amount_thb: number | string
  category_id: string
  merchant_or_payer?: string | null
  description?: string | null
  note?: string | null
  payment_status: "paid" | "pending"
  wealth_categories?: {
    name?: string | null
    type?: string | null
    color?: string | null
  } | null
}

export interface WealthInvestment {
  id: string
  user_id?: string
  platform: "dime" | "bybit" | "binance_th"
  investment_type: "thai_stock" | "foreign_stock" | "spot_trade" | "futures_trade" | "crypto_holding" | "dual_asset"
  asset_symbol: string
  quote_asset?: string | null
  opened_amount_thb: number | string
  opened_at: string
  quantity?: number | string | null
  entry_price?: number | string | null
  entry_fee_thb?: number | string | null
  note?: string | null
  status: "open" | "closed" | "cancelled"
  exit_price?: number | string | null
  closed_amount_thb?: number | string | null
  exit_fee_thb?: number | string | null
  closed_at?: string | null
  dual_strategy?: "buy_low" | "sell_high" | null
  deposit_asset?: string | null
  deposit_amount?: number | string | null
  target_price?: number | string | null
  apr_percent?: number | string | null
  term_days?: number | string | null
  settlement_date?: string | null
  settlement_asset?: string | null
  settlement_amount?: number | string | null
  interest_amount?: number | string | null
}

interface WealthContextType {
  categories: WealthCategory[]
  transactions: WealthTransaction[]
  investments: WealthInvestment[]
  quotes: Record<string, { symbol: string; price: number; source: string }>
  usdThbRate: number
  quotesLoading: boolean
  lastUpdated: string
  displayCurrency: "THB" | "USD"
  setDisplayCurrency: (currency: "THB" | "USD") => void
  formatMoney: (amountThb: number) => string
  selectedMonth: string
  setSelectedMonth: (month: string) => void
  refreshData: () => void
  isPending: boolean
  startTransition: React.TransitionStartFunction
}

const WealthContext = createContext<WealthContextType | null>(null)

export function WealthProvider({
  children,
  initialData,
}: {
  children: React.ReactNode
  initialData: {
    categories: WealthCategory[]
    transactions: WealthTransaction[]
    investments: WealthInvestment[]
  }
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [categories, setCategories] = useState<WealthCategory[]>(initialData.categories)
  const [transactions, setTransactions] = useState<WealthTransaction[]>(initialData.transactions)
  const [investments, setInvestments] = useState<WealthInvestment[]>(initialData.investments)
  const [quotes, setQuotes] = useState<Record<string, { symbol: string; price: number; source: string }>>({})
  const [usdThbRate, setUsdThbRate] = useState<number>(34.0)
  const [quotesLoading, setQuotesLoading] = useState<boolean>(true)
  const [lastUpdated, setLastUpdated] = useState<string>("")
  const [displayCurrency, setDisplayCurrencyState] = useState<"THB" | "USD">("THB")

  const getBangkokTime = () => {
    return new Date().toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  }

  useEffect(() => {
    setLastUpdated(getBangkokTime())
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem("superlboard_currency")
      if (saved === "USD" || saved === "THB") {
        setDisplayCurrencyState(saved)
      }
    } catch {}
  }, [])

  const setDisplayCurrency = useCallback((currency: "THB" | "USD") => {
    setDisplayCurrencyState(currency)
    try {
      localStorage.setItem("superlboard_currency", currency)
    } catch {}
  }, [])

  const formatMoney = useCallback(
    (amountThb: number) => {
      if (displayCurrency === "USD") {
        const rate = usdThbRate > 0 ? usdThbRate : 34.0
        const amountUsd = amountThb / rate
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amountUsd)
      }
      return new Intl.NumberFormat("th-TH", {
        style: "currency",
        currency: "THB",
        maximumFractionDigits: 0,
      }).format(amountThb)
    },
    [displayCurrency, usdThbRate]
  )

  // Current month in YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return new Date().toISOString().slice(0, 7)
  })

  // Synchronize state when initialData updates (e.g. after server revalidation)
  useEffect(() => {
    setCategories(initialData.categories)
    setTransactions(initialData.transactions)
    setInvestments(initialData.investments)
    setLastUpdated(getBangkokTime())
  }, [initialData])

  // Non-blocking fetch for live quotes & exchange rate
  useEffect(() => {
    let mounted = true
    const openSymbols = initialData.investments
      .filter((inv) => inv.status === "open")
      .map((inv) => ({ symbol: inv.asset_symbol, investmentType: inv.investment_type }))

    setQuotesLoading(true)
    fetchLiveInvestmentQuotes(openSymbols)
      .then((res) => {
        if (mounted) {
          if (res.quotes) setQuotes(res.quotes)
          if (res.usdThbRate) setUsdThbRate(res.usdThbRate)
          setLastUpdated(getBangkokTime())
          setQuotesLoading(false)
        }
      })
      .catch(() => {
        if (mounted) {
          setLastUpdated(getBangkokTime())
          setQuotesLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [initialData.investments])

  const openCryptoSymbols = useMemo(() => {
    return initialData.investments
      .filter((inv) => inv.status === "open" && inv.investment_type !== "thai_stock" && inv.investment_type !== "foreign_stock")
      .map((inv) => inv.asset_symbol)
  }, [initialData.investments])

  const { prices: liveCryptoPrices } = useCryptoPricesPolling(openCryptoSymbols)

  const effectiveQuotes = useMemo(() => {
    const combined = { ...quotes }
    for (const [key, val] of Object.entries(liveCryptoPrices)) {
      if (val && typeof val.price === "number" && val.price > 0) {
        const entry = { symbol: key, price: val.price, source: "binance_ws" }
        combined[key] = entry
        const base = key.replace(/(USDT|BUSD|USDC)$/, "")
        if (base && base !== key) {
          combined[base] = entry
        }
      }
    }
    return combined
  }, [quotes, liveCryptoPrices])

  const refreshData = useCallback(() => {
    startTransition(() => {
      router.refresh()
      setLastUpdated(getBangkokTime())
    })
  }, [router])

  return (
    <WealthContext.Provider
      value={{
        categories,
        transactions,
        investments,
        quotes: effectiveQuotes,
        usdThbRate,
        quotesLoading,
        lastUpdated,
        displayCurrency,
        setDisplayCurrency,
        formatMoney,
        selectedMonth,
        setSelectedMonth,
        refreshData,
        isPending,
        startTransition,
      }}
    >
      {children}
    </WealthContext.Provider>
  )
}

export function useWealth() {
  const context = useContext(WealthContext)
  if (!context) {
    throw new Error("useWealth must be used within a WealthProvider")
  }
  return context
}

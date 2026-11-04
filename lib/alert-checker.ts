import { createClient } from "@/utils/supabase/server"
import { sendPriceAlertEmail } from "@/lib/email-service"
import type { PriceAlert } from "@/app/dashboard/investment/chart/alert-actions"

/**
 * Checks all active price alerts stored in profiles.chart_settings against live Binance prices.
 * Zero extra tables required — uses existing profiles.chart_settings JSONB.
 */
export async function checkActivePriceAlerts() {
  try {
    const supabase = await createClient()

    // 1. Fetch profiles containing chart_settings
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, email, chart_settings")

    if (error || !profiles || profiles.length === 0) {
      return { checkedCount: 0, triggeredCount: 0, triggeredAlerts: [] }
    }

    // 2. Extract active alerts
    interface AlertItem {
      userId: string
      userEmail: string
      chartSettings: any
      alert: PriceAlert
    }

    const activeList: AlertItem[] = []
    for (const p of profiles) {
      const settings = p.chart_settings
      if (settings && Array.isArray(settings.priceAlerts)) {
        for (const a of settings.priceAlerts) {
          if (a.status === "active") {
            activeList.push({
              userId: p.id,
              userEmail: a.email || p.email,
              chartSettings: settings,
              alert: a,
            })
          }
        }
      }
    }

    if (activeList.length === 0) {
      return { checkedCount: 0, triggeredCount: 0, triggeredAlerts: [] }
    }

    // 3. Batch fetch prices from Binance for unique symbols
    const uniqueSymbols = Array.from(new Set(activeList.map((i) => i.alert.symbol.trim().toUpperCase())))
    let pricesMap: Record<string, number> = {}

    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(JSON.stringify(uniqueSymbols))}`
      )
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          data.forEach((item: any) => {
            if (item.symbol && item.price) {
              pricesMap[item.symbol] = parseFloat(item.price)
            }
          })
        }
      }
    } catch (binanceErr) {
      console.error("Binance ticker fetch failed in alert checker:", binanceErr)
    }

    // 4. Evaluate each alert against current market price
    let triggeredCount = 0
    const triggeredList: any[] = []
    const profilesToUpdate = new Map<string, any>()

    for (const item of activeList) {
      const currentPrice = pricesMap[item.alert.symbol]
      if (!currentPrice || currentPrice <= 0) continue

      const target = Number(item.alert.target_price)
      let isTriggered = false

      if (item.alert.condition === "crosses_above" || item.alert.condition === "greater_than") {
        if (currentPrice >= target) isTriggered = true
      } else if (item.alert.condition === "crosses_below" || item.alert.condition === "less_than") {
        if (currentPrice <= target) isTriggered = true
      }

      if (isTriggered) {
        triggeredCount++
        triggeredList.push({
          id: item.alert.id,
          symbol: item.alert.symbol,
          target,
          currentPrice,
          email: item.alert.email || item.userEmail,
        })

        // Mark alert as triggered in the profile's chart_settings
        const settings = profilesToUpdate.get(item.userId) || item.chartSettings
        const updatedAlerts = (settings.priceAlerts || []).map((a: PriceAlert) =>
          a.id === item.alert.id
            ? { ...a, status: "triggered", triggered_at: new Date().toISOString() }
            : a
        )

        const nextSettings = { ...settings, priceAlerts: updatedAlerts }
        profilesToUpdate.set(item.userId, nextSettings)

        // Dispatch Email
        await sendPriceAlertEmail({
          to: item.alert.email || item.userEmail,
          symbol: item.alert.symbol,
          targetPrice: target,
          currentPrice,
          condition: item.alert.condition,
          note: item.alert.note,
        })
      }
    }

    // 5. Save updated chart_settings back to Supabase
    for (const [userId, nextSettings] of profilesToUpdate.entries()) {
      await supabase
        .from("profiles")
        .update({
          chart_settings: nextSettings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
    }

    return {
      checkedCount: activeList.length,
      triggeredCount,
      triggeredAlerts: triggeredList,
    }
  } catch (err: any) {
    console.error("Error in checkActivePriceAlerts:", err)
    return { checkedCount: 0, triggeredCount: 0, triggeredAlerts: [], error: err?.message }
  }
}

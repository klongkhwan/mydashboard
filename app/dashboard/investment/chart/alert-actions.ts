"use server"

import { createClient } from "@/utils/supabase/server"
import { sendPriceAlertEmail } from "@/lib/email-service"

export interface PriceAlert {
  id: string
  user_id?: string
  symbol: string
  target_price: number
  condition: "crosses_above" | "crosses_below" | "greater_than" | "less_than"
  status: "active" | "triggered" | "paused"
  email: string
  note?: string
  last_price_at_creation?: number
  triggered_at?: string
  created_at?: string
  updated_at?: string
}

export interface CreateAlertInput {
  symbol: string
  target_price: number
  condition: "crosses_above" | "crosses_below" | "greater_than" | "less_than"
  email: string
  note?: string
  last_price_at_creation?: number
}

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

/**
 * Get current user's email
 */
export async function getUserEmail(): Promise<string> {
  try {
    const { supabase, user } = await getAuthenticatedUser()
    if (!user) return ""
    if (user.email) return user.email

    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single()

    return profile?.email || ""
  } catch {
    return ""
  }
}

/**
 * Helper to fetch user's chart_settings from profiles (or user_settings fallback)
 */
async function getUserChartSettings(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("chart_settings")
    .eq("id", userId)
    .single()

  if (profile?.chart_settings && typeof profile.chart_settings === "object") {
    return { table: "profiles", settings: profile.chart_settings }
  }

  const { data: userSettings } = await supabase
    .from("user_settings")
    .select("chart_settings")
    .eq("user_id", userId)
    .single()

  if (userSettings?.chart_settings && typeof userSettings.chart_settings === "object") {
    return { table: "user_settings", settings: userSettings.chart_settings }
  }

  return { table: "profiles", settings: {} }
}

/**
 * Helper to save user's chart_settings
 */
async function saveUserChartSettings(supabase: any, userId: string, table: string, settings: any) {
  if (table === "user_settings") {
    await supabase
      .from("user_settings")
      .upsert({
        user_id: userId,
        chart_settings: settings,
        updated_at: new Date().toISOString(),
      })
  } else {
    await supabase
      .from("profiles")
      .update({
        chart_settings: settings,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
  }
}

/**
 * Fetch all price alerts for the current user (from profiles.chart_settings.priceAlerts)
 */
export async function getPriceAlerts(): Promise<PriceAlert[]> {
  try {
    const { supabase, user } = await getAuthenticatedUser()
    if (!user) return []

    const { settings } = await getUserChartSettings(supabase, user.id)
    if (Array.isArray(settings.priceAlerts)) {
      return settings.priceAlerts
    }

    return []
  } catch (err) {
    console.error("Error fetching price alerts:", err)
    return []
  }
}

/**
 * Create a new price alert (saved directly into profiles.chart_settings.priceAlerts)
 */
export async function createPriceAlert(input: CreateAlertInput): Promise<{
  success: boolean
  alert?: PriceAlert
  error?: string
}> {
  try {
    const { supabase, user } = await getAuthenticatedUser()
    if (!user) return { success: false, error: "กรุณาเข้าสู่ระบบก่อนตั้งแจ้งเตือน" }

    if (!input.symbol) return { success: false, error: "ระบุชื่อเหรียญ (Symbol)" }
    if (!input.target_price || isNaN(input.target_price) || input.target_price <= 0) {
      return { success: false, error: "ระบุราคาเป้าหมายให้ถูกต้อง" }
    }
    if (!input.email || !input.email.includes("@")) {
      return { success: false, error: "ระบุอีเมลผู้รับให้ถูกต้อง" }
    }

    const cleanSymbol = input.symbol.trim().toUpperCase()
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    const newAlert: PriceAlert = {
      id: alertId,
      user_id: user.id,
      symbol: cleanSymbol,
      target_price: Number(input.target_price),
      condition: input.condition || "crosses_above",
      status: "active",
      email: input.email.trim(),
      note: input.note?.trim() || undefined,
      last_price_at_creation: input.last_price_at_creation ? Number(input.last_price_at_creation) : undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { table, settings } = await getUserChartSettings(supabase, user.id)
    const existingAlerts: PriceAlert[] = Array.isArray(settings.priceAlerts) ? settings.priceAlerts : []
    const updatedAlerts = [newAlert, ...existingAlerts]

    await saveUserChartSettings(supabase, user.id, table, {
      ...settings,
      priceAlerts: updatedAlerts,
    })

    return { success: true, alert: newAlert }
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to create price alert" }
  }
}

/**
 * Delete a price alert
 */
export async function deletePriceAlert(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user } = await getAuthenticatedUser()
    if (!user) return { success: false, error: "Not authenticated" }

    const { table, settings } = await getUserChartSettings(supabase, user.id)
    if (Array.isArray(settings.priceAlerts)) {
      const filtered = settings.priceAlerts.filter((a: PriceAlert) => a.id !== id)
      await saveUserChartSettings(supabase, user.id, table, {
        ...settings,
        priceAlerts: filtered,
      })
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to delete alert" }
  }
}

/**
 * Toggle an alert status (active <-> paused)
 */
export async function togglePriceAlertStatus(
  id: string,
  newStatus: "active" | "paused"
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user } = await getAuthenticatedUser()
    if (!user) return { success: false, error: "Not authenticated" }

    const { table, settings } = await getUserChartSettings(supabase, user.id)
    if (Array.isArray(settings.priceAlerts)) {
      const updated = settings.priceAlerts.map((a: PriceAlert) =>
        a.id === id ? { ...a, status: newStatus, updated_at: new Date().toISOString() } : a
      )
      await saveUserChartSettings(supabase, user.id, table, {
        ...settings,
        priceAlerts: updated,
      })
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update alert" }
  }
}

/**
 * Send a test price alert email immediately
 */
export async function testSendPriceAlertEmail(
  email: string,
  symbol: string,
  targetPrice: number
): Promise<{ success: boolean; error?: string; simulated?: boolean }> {
  try {
    if (!email || !email.includes("@")) {
      return { success: false, error: "รูปแบบอีเมลไม่ถูกต้อง" }
    }

    const res = await sendPriceAlertEmail({
      to: email,
      symbol: symbol || "BTCUSDT",
      targetPrice: targetPrice || 90000,
      currentPrice: targetPrice || 90000,
      condition: "crosses_above",
      note: "ทดสอบการส่งอีเมลแจ้งเตือนราคาจากระบบ SuperlBoard",
    })

    return res
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to dispatch test email" }
  }
}

/**
 * Check and trigger active alerts for a symbol given its latest live price.
 */
export async function checkAndTriggerPriceAlerts(
  symbol: string,
  currentPrice: number
): Promise<{
  triggeredAlerts: PriceAlert[]
}> {
  try {
    const { supabase, user } = await getAuthenticatedUser()
    if (!user || !symbol || !currentPrice || currentPrice <= 0) {
      return { triggeredAlerts: [] }
    }

    const cleanSymbol = symbol.trim().toUpperCase()
    const { table, settings } = await getUserChartSettings(supabase, user.id)
    const allAlerts: PriceAlert[] = Array.isArray(settings.priceAlerts) ? settings.priceAlerts : []

    const activeAlerts = allAlerts.filter(
      (a) => a.status === "active" && a.symbol === cleanSymbol
    )

    if (activeAlerts.length === 0) return { triggeredAlerts: [] }

    const triggeredList: PriceAlert[] = []
    const updatedAlerts = allAlerts.map((alert) => {
      if (alert.status !== "active" || alert.symbol !== cleanSymbol) return alert

      let isTriggered = false
      if (alert.condition === "crosses_above" || alert.condition === "greater_than") {
        if (currentPrice >= alert.target_price) isTriggered = true
      } else if (alert.condition === "crosses_below" || alert.condition === "less_than") {
        if (currentPrice <= alert.target_price) isTriggered = true
      }

      if (isTriggered) {
        triggeredList.push(alert)
        return {
          ...alert,
          status: "triggered" as const,
          triggered_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      }
      return alert
    })

    if (triggeredList.length > 0) {
      // 1. Save updated alerts to Supabase
      await saveUserChartSettings(supabase, user.id, table, {
        ...settings,
        priceAlerts: updatedAlerts,
      })

      // 2. Dispatch Emails
      for (const alert of triggeredList) {
        await sendPriceAlertEmail({
          to: alert.email,
          symbol: alert.symbol,
          targetPrice: alert.target_price,
          currentPrice,
          condition: alert.condition,
          note: alert.note,
        })
      }
    }

    return { triggeredAlerts: triggeredList }
  } catch (err) {
    console.error("Error checking price alerts:", err)
    return { triggeredAlerts: [] }
  }
}

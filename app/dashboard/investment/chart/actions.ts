"use server"

import { createClient } from "@/utils/supabase/server"

export interface ChartSettings {
  symbol?: string
  interval?: string
  indicators?: {
    ema9?: boolean
    ema21?: boolean
    ema50?: boolean
    ema200?: boolean
    bb?: boolean
  }
}

/**
 * Saves chart preferences to Supabase (profiles or user_settings table).
 */
export async function saveChartSettings(settings: ChartSettings) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Not authenticated" }

    // 1. Try updating profiles
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        chart_settings: settings,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (!profileError) {
      return { success: true }
    }

    // 2. Fallback to user_settings table
    const { error: settingsError } = await supabase
      .from("user_settings")
      .upsert({
        user_id: user.id,
        chart_settings: settings,
        updated_at: new Date().toISOString(),
      })

    if (!settingsError) {
      return { success: true }
    }

    return { success: false, error: profileError.message || settingsError.message }
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to save chart settings" }
  }
}

/**
 * Retrieves saved chart preferences from Supabase.
 */
export async function getChartSettings(): Promise<ChartSettings | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // 1. Try profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("chart_settings")
      .eq("id", user.id)
      .single()

    if (profile?.chart_settings && Object.keys(profile.chart_settings).length > 0) {
      return profile.chart_settings as ChartSettings
    }

    // 2. Try user_settings table
    const { data: userSettings } = await supabase
      .from("user_settings")
      .select("chart_settings")
      .eq("user_id", user.id)
      .single()

    if (userSettings?.chart_settings) {
      return userSettings.chart_settings as ChartSettings
    }

    return null
  } catch {
    return null
  }
}

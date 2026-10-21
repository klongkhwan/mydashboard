"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { categorySchema, investmentSchema, transactionSchema, updateCategorySchema, workoutSchema } from "./schema"

async function clientForUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  return { supabase, user }
}

export async function getMyWealthData() {
  const { supabase, user } = await clientForUser()
  const [categories, transactions, investments] = await Promise.all([
    supabase.from("wealth_categories").select("*").eq("user_id", user.id).order("sort_order"),
    supabase.from("wealth_transactions").select("*, wealth_categories(name, type, color)").eq("user_id", user.id).order("transaction_date", { ascending: false }),
    supabase.from("wealth_investments").select("*").eq("user_id", user.id).order("opened_at", { ascending: false }),
  ])
  if (categories.error || transactions.error || investments.error) {
    throw new Error("ไม่สามารถโหลดข้อมูล My Wealth ได้ กรุณาลองใหม่อีกครั้ง")
  }
  return { categories: categories.data || [], transactions: transactions.data || [], investments: investments.data || [] }
}

export async function createWealthCategory(input: unknown) {
  const value = categorySchema.parse(input)
  const { supabase, user } = await clientForUser()
  const { data, error } = await supabase
    .from("wealth_categories")
    .insert({ ...value, user_id: user.id })
    .select()
    .single()
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/my-wealth", "layout")
  return data
}

export async function createWealthTransaction(input: unknown) {
  const value = transactionSchema.parse(input)
  const { supabase, user } = await clientForUser()
  const { data: category, error: categoryError } = await supabase.from("wealth_categories").select("id, type").eq("id", value.category_id).eq("user_id", user.id).single()
  if (categoryError || !category || category.type !== value.type) throw new Error("หมวดหมู่ไม่ถูกต้อง")
  const { error } = await supabase.from("wealth_transactions").insert({ ...value, user_id: user.id, payment_status: value.type === "income" ? "paid" : value.payment_status })
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/my-wealth", "layout")
}

export async function createWealthInvestment(input: unknown) {
  const value = investmentSchema.parse(input)
  const { supabase, user } = await clientForUser()
  const { error } = await supabase.from("wealth_investments").insert({ ...value, user_id: user.id })
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/my-wealth", "layout")
}

export async function markWealthExpensePaid(id: string, paidDate?: string) {
  const { supabase, user } = await clientForUser()
  const updateData: { payment_status: "paid"; transaction_date?: string } = { payment_status: "paid" }
  if (paidDate) {
    updateData.transaction_date = paidDate
  }
  const { error } = await supabase.from("wealth_transactions")
    .update(updateData)
    .eq("id", id).eq("user_id", user.id).eq("type", "expense")
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/my-wealth", "layout")
}

export async function closeWealthInvestment(input: { id: string; closed_amount_thb: number; closed_at: string; exit_fee_thb?: number; exit_price?: number; settlement_asset?: string; settlement_amount?: number; interest_amount?: number }) {
  if (!input.id || !input.closed_at || !(input.closed_amount_thb > 0)) throw new Error("กรุณากรอกยอดรับกลับและวันที่ปิด")
  if (input.exit_fee_thb !== undefined && input.exit_fee_thb < 0) throw new Error("ค่าธรรมเนียมต้องไม่ติดลบ")
  const { supabase, user } = await clientForUser()
  const { error } = await supabase.from("wealth_investments").update({
    status: "closed",
    closed_amount_thb: input.closed_amount_thb,
    closed_at: input.closed_at,
    exit_fee_thb: input.exit_fee_thb || 0,
    exit_price: input.exit_price,
    settlement_asset: input.settlement_asset || null,
    settlement_amount: input.settlement_amount || null,
    interest_amount: input.interest_amount || null,
  }).eq("id", input.id).eq("user_id", user.id).eq("status", "open")
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/my-wealth", "layout")
}

export async function cancelWealthInvestment(id: string) {
  const { supabase, user } = await clientForUser()
  const { error } = await supabase.from("wealth_investments").update({ status: "cancelled" })
    .eq("id", id).eq("user_id", user.id).eq("status", "open")
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/my-wealth", "layout")
}
export async function deleteWealthTransaction(id: string) {
  const { supabase, user } = await clientForUser()
  const { error } = await supabase.from("wealth_transactions").delete().eq("id", id).eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/my-wealth", "layout")
}

export async function deleteWealthInvestment(id: string) {
  const { supabase, user } = await clientForUser()
  const { error } = await supabase.from("wealth_investments").delete().eq("id", id).eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/my-wealth", "layout")
}
export async function renameWealthCategory(id: string, name: string) {
  const value = categorySchema.pick({ name: true }).parse({ name })
  const { supabase, user } = await clientForUser()
  const { error } = await supabase.from("wealth_categories").update({ name: value.name }).eq("id", id).eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/my-wealth", "layout")
}

export async function archiveWealthCategory(id: string) {
  const { supabase, user } = await clientForUser()
  const { error } = await supabase.from("wealth_categories").update({ is_active: false }).eq("id", id).eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/my-wealth", "layout")
}

export async function updateWealthCategory(id: string, input: unknown) {
  const value = updateCategorySchema.parse(input)
  const { supabase, user } = await clientForUser()
  const { error } = await supabase.from("wealth_categories").update(value).eq("id", id).eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/my-wealth", "layout")
}

export async function deleteWealthCategory(id: string) {
  const { supabase, user } = await clientForUser()
  const { count, error: countError } = await supabase
    .from("wealth_transactions")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id)
    .eq("user_id", user.id)

  if (countError) throw new Error(countError.message)
  if (count && count > 0) {
    throw new Error("ไม่สามารถลบหมวดหมู่นี้ได้เนื่องจากมีรายการใช้งานอยู่ กรุณาเลือก 'ปิดใช้งาน' แทน")
  }

  const { error } = await supabase.from("wealth_categories").delete().eq("id", id).eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/my-wealth", "layout")
}

export async function updateWealthTransaction(id: string, input: unknown) {
  const value = transactionSchema.parse(input)
  const { supabase, user } = await clientForUser()
  const { data: category, error: categoryError } = await supabase.from("wealth_categories").select("id, type").eq("id", value.category_id).eq("user_id", user.id).single()
  if (categoryError || !category || category.type !== value.type) throw new Error("หมวดหมู่ไม่ถูกต้อง")
  const { error } = await supabase.from("wealth_transactions").update({
    ...value,
    payment_status: value.type === "income" ? "paid" : value.payment_status,
  }).eq("id", id).eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/my-wealth", "layout")
}

export async function updateWealthInvestment(id: string, input: unknown) {
  const value = investmentSchema.parse(input)
  const { supabase, user } = await clientForUser()
  const { error } = await supabase.from("wealth_investments").update(value).eq("id", id).eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/my-wealth", "layout")
}

export async function fetchLiveInvestmentQuotes(items: Array<{ symbol: string; investmentType?: string }>) {
  const { getBatchAssetQuotes, getUsdThbRate } = await import("@/lib/market-quotes")
  const [quotes, usdThbRate] = await Promise.all([
    getBatchAssetQuotes(items),
    getUsdThbRate(),
  ])
  return { quotes, usdThbRate }
}

export async function fetchExchangeRate() {
  const { getUsdThbRate } = await import("@/lib/market-quotes")
  return await getUsdThbRate()
}

export async function getMyWorkouts() {
  const { supabase, user } = await clientForUser()
  const { data, error } = await supabase
    .from("wealth_workouts")
    .select("*")
    .eq("user_id", user.id)
    .order("workout_date", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) {
    console.error("getMyWorkouts error:", error)
    throw new Error("ไม่สามารถโหลดข้อมูลประวัติการออกกำลังกายได้ กรุณาลองใหม่อีกครั้ง")
  }
  return data || []
}

export async function createWealthWorkout(input: unknown) {
  const value = workoutSchema.parse(input)
  const { supabase, user } = await clientForUser()

  // Calculate total volume (sum of weight * reps for completed sets)
  const total_volume_kg = value.exercises.reduce((exTotal, ex) => {
    return exTotal + ex.sets.reduce((setTotal, s) => {
      return setTotal + (s.completed ? (s.weight_kg * s.reps) : 0)
    }, 0)
  }, 0)

  // 1. Guard against accidental rapid double-submissions (<10 seconds window with same date & title)
  const tenSecondsAgo = new Date(Date.now() - 10000).toISOString()
  const { data: recentDuplicate } = await supabase
    .from("wealth_workouts")
    .select("*")
    .eq("user_id", user.id)
    .eq("workout_date", value.workout_date)
    .eq("title", value.title)
    .gte("created_at", tenSecondsAgo)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (recentDuplicate) {
    return recentDuplicate
  }

  // 2. Normal insert
  const { data, error } = await supabase
    .from("wealth_workouts")
    .insert({
      ...value,
      user_id: user.id,
      total_volume_kg,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/my-wealth/workouts")
  revalidatePath("/dashboard/my-wealth", "layout")
  return data
}

export async function updateWealthWorkout(id: string, input: unknown) {
  const value = workoutSchema.parse(input)
  const { supabase, user } = await clientForUser()

  const total_volume_kg = value.exercises.reduce((exTotal, ex) => {
    return exTotal + ex.sets.reduce((setTotal, s) => {
      return setTotal + (s.completed ? s.weight_kg * s.reps : 0)
    }, 0)
  }, 0)

  const { data, error } = await supabase
    .from("wealth_workouts")
    .update({
      ...value,
      total_volume_kg,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/my-wealth/workouts")
  revalidatePath("/dashboard/my-wealth", "layout")
  return data
}

export async function deleteWealthWorkout(id: string) {
  const { supabase, user } = await clientForUser()
  const { error } = await supabase
    .from("wealth_workouts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/my-wealth/workouts")
  revalidatePath("/dashboard/my-wealth", "layout")
}


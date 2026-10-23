"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/utils/supabase/server"
import type { GrowthLog } from "@/lib/personal-growth"
import { growthLogSchema } from "./schema"

const growthLogIdSchema = z.string().uuid("รหัสกิจกรรมไม่ถูกต้อง")

async function clientForUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  if (error) throw new Error("ไม่สามารถตรวจสอบผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง")
  return { supabase, user }
}

export async function getMyGrowthLogs(): Promise<GrowthLog[]> {
  const { supabase, user } = await clientForUser()
  const logs: GrowthLog[] = []
  const pageSize = 1000
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("wealth_growth_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("activity_date", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + pageSize - 1)
    if (error) throw new Error("ไม่สามารถโหลดข้อมูลการพัฒนาตัวเองได้ กรุณาลองใหม่อีกครั้ง")
    logs.push(...(data || []))
    if (!data || data.length < pageSize) return logs
  }
}

export async function createGrowthLog(input: unknown): Promise<GrowthLog> {
  const value = growthLogSchema.parse(input)
  const { supabase, user } = await clientForUser()
  const { data, error } = await supabase
    .from("wealth_growth_logs")
    .insert({ ...value, user_id: user.id })
    .select()
    .single()
  if (error) throw new Error(error.message)
  if (!data) throw new Error("ไม่สามารถบันทึกกิจกรรมได้ กรุณาลองใหม่อีกครั้ง")
  revalidatePath("/dashboard/my-wealth/growth")
  return data
}

export async function updateGrowthLog(id: string, input: unknown): Promise<GrowthLog> {
  const logId = growthLogIdSchema.parse(id)
  const value = growthLogSchema.parse(input)
  const { supabase, user } = await clientForUser()
  const { data, error } = await supabase
    .from("wealth_growth_logs")
    .update(value)
    .eq("id", logId)
    .eq("user_id", user.id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  if (!data) throw new Error("ไม่พบกิจกรรมที่ต้องการแก้ไข")
  revalidatePath("/dashboard/my-wealth/growth")
  return data
}

export async function deleteGrowthLog(id: string): Promise<void> {
  const logId = growthLogIdSchema.parse(id)
  const { supabase, user } = await clientForUser()
  const { data, error } = await supabase
    .from("wealth_growth_logs")
    .delete()
    .eq("id", logId)
    .eq("user_id", user.id)
    .select("id")
    .single()
  if (error) throw new Error(error.message)
  if (!data) throw new Error("ไม่พบกิจกรรมที่ต้องการลบ")
  revalidatePath("/dashboard/my-wealth/growth")
}

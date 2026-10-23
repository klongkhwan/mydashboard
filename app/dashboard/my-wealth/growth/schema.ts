import { z } from "zod"
import { getGrowthToday, isGrowthDate } from "@/lib/personal-growth"

export const growthLogSchema = z.object({
  activity_date: z.string()
    .refine(isGrowthDate, "กรุณาระบุวันที่ให้ถูกต้อง")
    .refine(value => value <= getGrowthToday(), "ไม่สามารถบันทึกวันในอนาคตได้"),
  category: z.enum(["reading", "podcast", "course", "practice", "other"]),
  title: z.string().trim().min(1, "กรุณาระบุสิ่งที่ทำ").max(200, "ชื่อกิจกรรมต้องไม่เกิน 200 ตัวอักษร"),
  duration_minutes: z.preprocess(
    value => value == null || (typeof value === "string" && !value.trim())
      ? null
      : typeof value === "string" ? Number(value) : value,
    z.number().int("เวลาต้องเป็นจำนวนนาทีเต็ม").positive("เวลาต้องมากกว่า 0 นาที").max(1440, "เวลาต้องไม่เกิน 1,440 นาที").nullable(),
  ),
  notes: z.preprocess(
    value => value == null ? null : value,
    z.string().trim().max(2000, "สิ่งที่ได้เรียนรู้ต้องไม่เกิน 2,000 ตัวอักษร").transform(value => value || null).nullable(),
  ),
})

export type GrowthLogInput = z.infer<typeof growthLogSchema>

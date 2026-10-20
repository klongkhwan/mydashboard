import { z } from "zod"

export const categorySchema = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชื่อหมวด"),
  type: z.enum(["income", "expense"]),
  color: z.string().optional(),
})

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชื่อหมวด").optional(),
  color: z.string().optional(),
  is_active: z.boolean().optional(),
})

export const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  transaction_date: z.string().min(1),
  amount_thb: z.coerce.number().positive("จำนวนเงินต้องมากกว่า 0"),
  category_id: z.string().uuid(),
  merchant_or_payer: z.string().trim().optional(),
  description: z.string().trim().optional(),
  note: z.string().trim().optional(),
  payment_status: z.enum(["paid", "pending"]).default("paid"),
})

export const investmentSchema = z.object({
  platform: z.enum(["dime", "bybit", "binance_th"]),
  investment_type: z.enum(["thai_stock", "foreign_stock", "spot_trade", "futures_trade", "crypto_holding", "dual_asset"]),
  asset_symbol: z.string().trim().min(1),
  quote_asset: z.string().trim().optional(),
  opened_amount_thb: z.coerce.number().positive(),
  opened_at: z.string().min(1),
  quantity: z.coerce.number().positive().optional(),
  entry_price: z.coerce.number().positive().optional(),
  entry_fee_thb: z.coerce.number().min(0).default(0),
  note: z.string().trim().optional(),
  dual_strategy: z.enum(["buy_low", "sell_high"]).optional(),
  deposit_asset: z.string().trim().optional(),
  deposit_amount: z.coerce.number().positive().optional(),
  target_price: z.coerce.number().positive().optional(),
  apr_percent: z.coerce.number().min(0).optional(),
  term_days: z.coerce.number().int().positive().optional(),
  settlement_date: z.string().optional(),
})

export type CategoryInput = z.infer<typeof categorySchema>
export type TransactionInput = z.infer<typeof transactionSchema>
export type InvestmentInput = z.infer<typeof investmentSchema>

export const workoutSetSchema = z.object({
  set_number: z.number().int().positive(),
  weight_kg: z.coerce.number().min(0, "น้ำหนักต้องไม่ติดลบ").default(0),
  reps: z.coerce.number().int().min(0, "จำนวนครั้งต้องไม่ติดลบ").default(0),
  completed: z.boolean().default(true),
})

export const workoutExerciseSchema = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชื่อท่าออกกำลังกาย"),
  muscle_group: z.enum(["chest", "back", "legs", "shoulders", "arms", "core", "cardio", "other"]).default("other"),
  sets: z.array(workoutSetSchema).min(1, "ต้องมีอย่างน้อย 1 เซ็ต"),
})

export const workoutSchema = z.object({
  workout_date: z.string().min(1, "กรุณาระบุวันที่"),
  title: z.string().trim().min(1, "กรุณากรอกชื่อเซสชัน เช่น Push Day, Leg Day"),
  duration_minutes: z.coerce.number().int().min(0).default(0),
  notes: z.string().trim().optional(),
  exercises: z.array(workoutExerciseSchema).min(1, "ต้องมีอย่างน้อย 1 ท่า"),
})

export type WorkoutSetInput = z.infer<typeof workoutSetSchema>
export type WorkoutExerciseInput = z.infer<typeof workoutExerciseSchema>
export type WorkoutInput = z.infer<typeof workoutSchema>


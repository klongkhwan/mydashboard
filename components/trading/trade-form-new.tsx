"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { createTrade, updateTrade, getTradeById } from "@/lib/trading"
import { TradeForm as ITradeForm, Trade, Market, TradeDirection, TradeStatus, AccountType, EmotionType } from "@/types/trading"
import { toast } from "sonner"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { toZonedTime } from "date-fns-tz"

const tradeFormSchema = z.object({
  entry_date: z.string().min(1, "กรุณาระบุวันที่เข้าเทรด"),
  symbol: z.string().min(1, "กรุณาระบุสัญลักษณ์"),
  market: z.enum(["spot", "futures", "margin"]),
  direction: z.enum(["buy", "sell"]),
  position_size: z.string().optional(),
  leverage: z.string().optional(),
  timeframe: z.string().optional(),
  entry_price: z.string().min(1, "กรุณาระบุราคาเข้า"),
  capital_amount: z.string().min(1, "กรุณาระบุขนาดทุน"),
  entry_emotion: z.enum(["greedy", "fearful", "confident", "anxious", "neutral", "excited", "disappointed", "calm"]).optional(),
  entry_reason: z.string().min(1, "กรุณาระบุเหตุผลที่เข้าเทรด"),
  exit_price: z.string().optional(),
  exit_date: z.string().optional(),
  exit_emotion: z.enum(["greedy", "fearful", "confident", "anxious", "neutral", "excited", "disappointed", "calm"]).optional(),
  exit_reason: z.string().optional(),
  learning_note: z.string().optional(),
  status: z.enum(["open", "closed", "cancelled"]).default("open"),
})

interface TradeFormProps {
  onTradeCreated?: () => void
  onTradeUpdated?: () => void
  onCancel?: () => void
  tradeId?: string // For edit mode
}

// Helper function to get current Thai time formatted for datetime-local input
const getThaiTimeForInput = (): string => {
  const thaiTime = toZonedTime(new Date(), 'Asia/Bangkok')
  return format(thaiTime, "yyyy-MM-dd'T'HH:mm")
}

// Component to display Thai date/time preview
const ThaiDateTimeDisplay = ({ value, label }: { value: string; label: string }) => {
  if (!value) return null

  // Parse datetime-local value directly (no timezone conversion)
  const [datePart, timePart] = value.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)

  // Format Thai time directly without creating Date object
  const buddhistYear = year + 543
  const thaiMonths = [
    "", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ]

  const formatThaiTime = (hour: number, minute: number): string => {
    if (hour === 0 && minute === 0) return "เที่ยงคืน"
    if (hour === 12 && minute === 0) return "เที่ยง"

    let displayHour = hour
    let period = ""

    if (hour === 0) {
      return "เที่ยงคืน"
    } else if (hour < 6) {
      displayHour = hour
      period = "โมง"
    } else if (hour < 12) {
      displayHour = hour
      period = "โมง"
    } else if (hour === 12) {
      displayHour = 12
      period = "โมง"
    } else {
      // Afternoon/Evening (13:00-23:59)
      displayHour = hour - 12
      period = "โมงครึ่ง"
    }

    // Handle midnight case (24:00 format becomes 0:00)
    if (displayHour === 0) displayHour = 12

    const minuteStr = minute > 0 ? `.${minute.toString().padStart(2, '0')}` : ""
    return `${displayHour}${minuteStr} ${period}`
  }

  const timeStr = formatThaiTime(hour, minute)
  const thaiDisplay = `${day}/${thaiMonths[month]}/${buddhistYear} ${timeStr}`

  return (
    <div className="mt-2 p-2 bg-blue-900/20 border border-blue-600/30 rounded text-sm">
      <span className="text-blue-400 font-medium">{label}: </span>
      <span className="text-white">{thaiDisplay}</span>
    </div>
  )
}

export function TradeFormNew({ onTradeCreated, onTradeUpdated, onCancel, tradeId }: TradeFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditMode = !!tradeId

  const form = useForm<z.infer<typeof tradeFormSchema>>({
    resolver: async (data, context, options) => {
      // Manual validation first
      const errors: Record<string, any> = {}

      // Check basic required fields
      if (!data.entry_date || data.entry_date.trim() === "") {
        errors.entry_date = { message: "กรุณาระบุวันที่เข้าเทรด" }
      }
      if (!data.symbol || data.symbol.trim() === "") {
        errors.symbol = { message: "กรุณาระบุสัญลักษณ์" }
      }
      if (!data.entry_price || data.entry_price.trim() === "") {
        errors.entry_price = { message: "กรุณาระบุราคาเข้า" }
      }
      if (!data.capital_amount || data.capital_amount.trim() === "") {
        errors.capital_amount = { message: "กรุณาระบุขนาดทุน" }
      }
      if (!data.entry_reason || data.entry_reason.trim() === "") {
        errors.entry_reason = { message: "กรุณาระบุเหตุผลที่เข้าเทรด" }
      }

      // Check exit fields if status is closed or cancelled
      if (data.status === "closed") {
        if (!data.exit_price || data.exit_price.trim() === "") {
          errors.exit_price = { message: "กรุณาระบุราคาออก" }
        }
        if (!data.exit_date || data.exit_date.trim() === "") {
          errors.exit_date = { message: "กรุณาระบุวันเวลาปิดออเดอร์" }
        }
        if (!data.exit_reason || data.exit_reason.trim() === "") {
          errors.exit_reason = { message: "กรุณาระบุเหตุผลที่ขาย" }
        }
      } else if (data.status === "cancelled") {
        // For cancelled orders, exit_date is required but exit_reason is optional
        if (!data.exit_date || data.exit_date.trim() === "") {
          errors.exit_date = { message: "กรุณาระบุวันเวลาที่ยกเลิก" }
        }
      }

      // If there are manual validation errors, return them
      if (Object.keys(errors).length > 0) {
        return {
          values: {},
          errors: errors
        }
      }

      // If no manual errors, use Zod schema
      return zodResolver(tradeFormSchema)(data, context, options)
    },
    defaultValues: {
      entry_date: getThaiTimeForInput(),
      market: "spot",
      direction: "buy",
      status: "open",
    },
  })

  const watchMarket = form.watch("market")
  const watchStatus = form.watch("status")
  const watchDirection = form.watch("direction")
  const watchEntryDate = form.watch("entry_date")
  const watchExitDate = form.watch("exit_date")

  // Load trade data for edit mode
  useEffect(() => {
    if (isEditMode && tradeId) {
      loadTradeData()
    }
  }, [isEditMode, tradeId])

  const loadTradeData = async () => {
    try {
      if (!tradeId) return
      setIsLoading(true)
      const trade = await getTradeById(tradeId)

      // Convert trade data to form format - handle Thai timezone conversion
      const thaiEntryTime = toZonedTime(new Date(trade.entry_date), 'Asia/Bangkok')
      const formData = {
        entry_date: format(thaiEntryTime, "yyyy-MM-dd'T'HH:mm"),
        symbol: trade.symbol,
        market: trade.market,
        direction: trade.direction || "buy",
        position_size: trade.position_size?.toString() || "",
        leverage: trade.leverage?.toString() || "",
        timeframe: trade.timeframe || "",
        entry_price: trade.entry_price.toString(),
        capital_amount: trade.capital_amount.toString(),
        entry_emotion: trade.entry_emotion || undefined,
        entry_reason: trade.entry_reason || "",
        exit_price: trade.exit_price?.toString() || "",
        exit_date: trade.exit_date ? format(toZonedTime(new Date(trade.exit_date), 'Asia/Bangkok'), "yyyy-MM-dd'T'HH:mm") : "",
        exit_emotion: trade.exit_emotion || undefined,
        exit_reason: trade.exit_reason || "",
        learning_note: trade.learning_note || "",
        status: trade.status,
      }

      form.reset(formData)
    } catch (error) {
      console.error("Error loading trade data:", error)
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลการเทรด")
    } finally {
      setIsLoading(false)
    }
  }

  const marketOptions: { value: Market; label: string }[] = [
    { value: "spot", label: "Spot" },
    { value: "futures", label: "Futures" },
    { value: "margin", label: "Margin" },
  ]

  const directionOptions: { value: TradeDirection; label: string; color: string }[] = [
    { value: "buy", label: "Buy (ซื้อ)", color: "text-green-400" },
    { value: "sell", label: "Sell (ขาย)", color: "text-red-400" },
  ]

  const statusOptions: { value: TradeStatus; label: string }[] = [
    { value: "open", label: "เปิด" },
    { value: "closed", label: "ปิดแล้ว" },
    { value: "cancelled", label: "ยกเลิก" },
  ]

  const emotionOptions: { value: EmotionType; label: string }[] = [
    { value: "greedy", label: "โลภ" },
    { value: "fearful", label: "กลัว" },
    { value: "confident", label: "มั่นใจ" },
    { value: "anxious", label: "กังวล" },
    { value: "neutral", label: "เป็นกลาง" },
    { value: "excited", label: "ตื่นเต้น" },
    { value: "disappointed", label: "ผิดหวัง" },
    { value: "calm", label: "สงบ" },
  ]

  const timeframeOptions = [
    "1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"
  ]



  // Convert datetime-local strings to proper ISO format for database
  const convertToISOString = (dateTimeString: string) => {
    if (!dateTimeString) return undefined

    // Parse datetime-local (Thai time) and convert to UTC ISO string
    const [datePart, timePart] = dateTimeString.split('T')
    const [year, month, day] = datePart.split('-').map(Number)
    const [hour, minute] = timePart.split(':').map(Number)

    // Create Date object for Thai time (UTC+7)
    // We'll create it as if it's in UTC first, then adjust
    const thaiTimeAsUTC = new Date(Date.UTC(year, month - 1, day, hour, minute))

    // Convert Thai time to UTC by subtracting 7 hours
    const utcTimeInMs = thaiTimeAsUTC.getTime() - (7 * 60 * 60 * 1000)
    const utcDate = new Date(utcTimeInMs)

    return utcDate.toISOString().replace('.000', '')
  }

  const onSubmit = async (values: z.infer<typeof tradeFormSchema>) => {
    console.log("Form submitted with values:", values)

    setIsSubmitting(true)
    try {
      // Use a simple user_id for now since we're using code-based auth
      // In a real implementation, you might want to create a proper user mapping
      const userId = "authenticated-user"

      // Calculate profit/loss if trade is closed
      let profitLoss = undefined
      let profitLossPercent = undefined

      if (values.status === "closed" && values.exit_price && values.entry_price) {
        const entryPrice = parseFloat(values.entry_price)
        const exitPrice = parseFloat(values.exit_price)
        const capitalAmount = parseFloat(values.capital_amount)

        if (watchMarket === "futures" || watchMarket === "margin") {
          const positionSize = parseFloat(values.position_size || "1")

          // Calculate profit/loss based on direction
          if (values.direction === "buy") {
            // Long position: profit when price goes up
            profitLoss = (exitPrice - entryPrice) * positionSize
          } else {
            // Short position: profit when price goes down
            profitLoss = (entryPrice - exitPrice) * positionSize
          }
          profitLossPercent = (profitLoss / capitalAmount) * 100
        } else {
          // For spot trading
          const quantity = capitalAmount / entryPrice
          if (values.direction === "buy") {
            profitLoss = (exitPrice - entryPrice) * quantity
          } else {
            profitLoss = (entryPrice - exitPrice) * quantity
          }
          profitLossPercent = (profitLoss / capitalAmount) * 100
        }
      }

      const tradeData: ITradeForm = {
        ...values,
        // Add calculated profit/loss values
        profit_loss: profitLoss,
        profit_loss_percent: profitLossPercent,
        // Convert datetime fields to proper ISO format
        entry_date: convertToISOString(values.entry_date) || values.entry_date,
        exit_date: values.exit_date ? (convertToISOString(values.exit_date) || values.exit_date) : undefined,
        // Convert empty strings to undefined for optional numeric fields
        exit_price: values.exit_price || undefined,
        position_size: values.position_size || undefined,
        leverage: values.leverage || undefined,
      }

      if (isEditMode) {
        console.log("Updating trade with data:", tradeData)
        await updateTrade(tradeId!, tradeData)
        console.log("Trade updated successfully")
        toast.success("อัพเดทการเทรดสำเร็จ!")
        onTradeUpdated?.()
      } else {
        console.log("Creating trade with data:", tradeData)
        await createTrade(tradeData)
        console.log("Trade created successfully")
        toast.success("บันทึกการเทรดสำเร็จ!")
        form.reset()
        onTradeCreated?.()
      }
    } catch (error) {
      console.error("Error creating trade:", error)
      toast.error("เกิดข้อผิดพลาดในการบันทึกการเทรด: " + (error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
        <span className="text-sm">กำลังโหลดข้อมูล...</span>
      </div>
    )
  }

  return (
    <div className="w-full h-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col gap-6">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* Left Column: Trade Setup (Sticky on Desktop) */}
            <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-0">
              <div className="bg-card rounded-lg border border-border p-5 space-y-4 shadow-sm">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-[#39FF14] shadow-[0_0_8px_#39FF14]"></span>
                  ตั้งค่าการเทรด
                </h3>

                {/* Symbol & Date */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="symbol"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">สัญลักษณ์</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="เช่น BTC/USD"
                            {...field}
                            className="font-semibold bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-[#39FF14] focus:ring-2 focus:ring-[#39FF14]/20 !bg-background"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="entry_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">วันเวลาเข้าเทรด</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                            className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-[#39FF14] focus:ring-2 focus:ring-[#39FF14]/20 !bg-background"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="market"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-muted-foreground">ตลาด</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9 bg-background border-border text-foreground focus:border-[#39FF14] focus:ring-2 focus:ring-[#39FF14]/20">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {marketOptions.map((m) => (
                              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="direction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-muted-foreground">ทิศทาง</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9 bg-background border-border text-foreground focus:border-[#39FF14] focus:ring-2 focus:ring-[#39FF14]/20">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {directionOptions.map((d) => (
                              <SelectItem key={d.value} value={d.value}>
                                <span className={d.color}>{d.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="timeframe"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-muted-foreground">TF</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} value={field.value || "none"}>
                          <FormControl>
                            <SelectTrigger className="h-9 bg-background border-border text-foreground focus:border-[#39FF14] focus:ring-2 focus:ring-[#39FF14]/20">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">ไม่ระบุ</SelectItem>
                            {timeframeOptions.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-muted-foreground">สถานะ</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9 bg-background border-border text-foreground focus:border-[#39FF14] focus:ring-2 focus:ring-[#39FF14]/20">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {statusOptions.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Advanced Fields (Futures) */}
                {(watchMarket === "futures" || watchMarket === "margin") && (
                  <div className="pt-4 border-t border-border grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="leverage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-muted-foreground">Leverage</FormLabel>
                          <FormControl>
                            <Input type="number" step="1" placeholder="10" {...field} className="h-9 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-[#39FF14] focus:ring-2 focus:ring-[#39FF14]/20 !bg-background" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="position_size"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-muted-foreground">Size</FormLabel>
                          <FormControl>
                            <Input type="number" step="any" placeholder="1.0" {...field} className="h-9" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>


            </div>

            {/* Right Column: Details Tabs */}
            <div className="lg:col-span-8 space-y-4">
              <Tabs defaultValue="entry" className="w-full">
                <TabsList className="w-full grid grid-cols-3 bg-muted p-1 rounded-lg">
                  <TabsTrigger value="entry">ข้อมูลเข้าเทรด</TabsTrigger>
                  <TabsTrigger value="exit" disabled={watchStatus === 'open'}>ปิดออเดอร์</TabsTrigger>
                  <TabsTrigger value="note">จดบันทึก</TabsTrigger>
                </TabsList>

                <TabsContent value="entry" className="space-y-4 mt-4">
                  <div className="bg-card border border-border rounded-lg p-5 space-y-4 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="entry_price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">ราคาเข้า</FormLabel>
                            <FormControl>
                              <Input type="number" step="any" placeholder="0.00" {...field} className="font-mono bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-[#39FF14] focus:ring-2 focus:ring-[#39FF14]/20 !bg-background" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="capital_amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">จำนวนเงินลงทุน</FormLabel>
                            <FormControl>
                              <Input type="number" step="any" placeholder="1000.00" {...field} className="font-mono bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-[#39FF14] focus:ring-2 focus:ring-[#39FF14]/20 !bg-background" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="entry_emotion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">อารมณ์ตอนเข้า</FormLabel>
                          <Select onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} value={field.value || "none"}>
                            <FormControl>
                              <SelectTrigger className="bg-background border-border text-foreground focus:border-[#39FF14] focus:ring-2 focus:ring-[#39FF14]/20">
                                <SelectValue placeholder="เลือกอารมณ์..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">ไม่ระบุ</SelectItem>
                              {emotionOptions.map((e) => (
                                <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="entry_reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">เหตุผลการเข้าเทรด</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="วิเคราะห์กราฟ, ข่าว, หรือสัญญาณที่ทำให้ตัดสินใจเดิมพัน..."
                              className="min-h-[150px] bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-[#39FF14] focus:ring-2 focus:ring-[#39FF14]/20 resize-none leading-relaxed !bg-background"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="exit" className="space-y-4 mt-4">
                  <div className="bg-card border border-border rounded-lg p-5 space-y-4 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="exit_price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">ราคาที่ปิด</FormLabel>
                            <FormControl>
                              <Input type="number" step="any" placeholder="0.00" {...field} className="font-mono bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-[#39FF14] focus:ring-2 focus:ring-[#39FF14]/20 !bg-background" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="exit_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">เวลาปิด</FormLabel>
                            <FormControl>
                              <Input type="datetime-local" {...field} className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-[#39FF14] focus:ring-2 focus:ring-[#39FF14]/20 !bg-background" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="exit_emotion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">อารมณ์ตอนปิด</FormLabel>
                          <Select onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} value={field.value || "none"}>
                            <FormControl>
                              <SelectTrigger className="bg-background border-border text-foreground focus:border-[#39FF14] focus:ring-2 focus:ring-[#39FF14]/20"><SelectValue placeholder="เลือก..." /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">ไม่ระบุ</SelectItem>
                              {emotionOptions.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="exit_reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">เหตุผลการปิดออเดอร์</FormLabel>
                          <FormControl>
                            <Textarea placeholder="ทำไมถึงปิด? ถึงเป้า? ชน SL? หรือเปลี่ยนใจ..." className="min-h-[120px] bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-[#39FF14] focus:ring-2 focus:ring-[#39FF14]/20 resize-none !bg-background" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="note" className="space-y-4 mt-4">
                  {/* Learning Note */}
                  <div className="bg-card rounded-lg border border-border p-5 space-y-4">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#39FF14] shadow-[0_0_8px_#39FF14]"></span>
                      สิ่งที่ได้เรียนรู้
                    </h3>

                    <FormField
                      control={form.control}
                      name="learning_note"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              placeholder="บันทึกสิ่งที่คุณได้เรียนรู้จากการเทรดครั้งนี้...&#10;&#10;🎯 อะไรที่ทำได้ดี?&#10;❌ อะไรที่ควรปรับปรุง?&#10;📚 บทเรียนที่ได้รับ?"
                              className="min-h-[200px] bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-[#39FF14] focus:ring-2 focus:ring-[#39FF14]/20 resize-none p-4 leading-relaxed !bg-background"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>

          </div>

          {/* Sticky Footer Actions */}
          <div className="sticky bottom-0 left-0 right-0 mt-auto bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border p-4 flex gap-3 justify-end z-20 -mx-6 -mb-6 px-6 pb-6">
            <Button type="button" variant="outline" onClick={onCancel || (() => form.reset())} disabled={isSubmitting} className="w-full sm:w-auto min-w-[100px]">
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto min-w-[100px] bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30">
              {isSubmitting ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin">⏳</span>
                  กำลังบันทึก...
                </>
              ) : (
                "บันทึก"
              )}
            </Button>
          </div>

        </form>
      </Form>
    </div>
  )
}
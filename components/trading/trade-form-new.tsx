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
  account_name: z.string().optional(),
  account_type: z.enum(["demo", "live"]).optional(),
  currency: z.string().optional(),
})

interface TradeFormProps {
  onTradeCreated?: () => void
  onTradeUpdated?: () => void
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

export function TradeFormNew({ onTradeCreated, onTradeUpdated, tradeId }: TradeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
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
      currency: "USD",
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
        account_name: trade.account_name || "",
        account_type: trade.account_type || undefined,
        currency: trade.currency || "USD",
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

  const accountTypes: { value: AccountType; label: string }[] = [
    { value: "demo", label: "Demo (ทดลอง)" },
    { value: "live", label: "Live (จริง)" },
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
    <div className="space-y-5 w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 w-full">
          {/* Basic Information */}
          <div className="bg-gray-800 rounded-lg border border-gray-600 p-5 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              ข้อมูลพื้นฐาน
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="entry_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-300">วันเวลาเข้าเทรด</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        className="bg-gray-700 border-gray-600 text-gray-100 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="symbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-300">สัญลักษณ์</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="BTC/USD"
                        {...field}
                        className="bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4 sm:col-span-2">
                <FormField
                  control={form.control}
                  name="direction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-300">ทิศทา</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-gray-700 border-gray-600 text-gray-100 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          {directionOptions.map((direction) => (
                            <SelectItem key={direction.value} value={direction.value} className="text-gray-100">
                              <span className={direction.color}>{direction.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="market"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-300">ตลาด</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-gray-700 border-gray-600 text-gray-100 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          {marketOptions.map((market) => (
                            <SelectItem key={market.value} value={market.value} className="text-gray-100">
                              {market.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="timeframe"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-300">Timeframe</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} value={field.value || "none"}>
                      <FormControl>
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-gray-100 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="none" className="text-gray-100">ไม่ระบุ</SelectItem>
                        {timeframeOptions.map((timeframe) => (
                          <SelectItem key={timeframe} value={timeframe} className="text-gray-100">
                            {timeframe}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Market-specific fields */}
            {(watchMarket === "futures" || watchMarket === "margin") && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-700">
                <FormField
                  control={form.control}
                  name="position_size"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-purple-300">Position Size</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="1.0"
                          {...field}
                          className="bg-gray-800 border-purple-600/50 text-gray-100 placeholder-gray-500 focus:border-purple-500 focus:ring-purple-500/20"
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-purple-400">
                        ขนาดตำแหน่ง (contracts/lots)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="leverage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-purple-300">Leverage</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="10.0"
                          {...field}
                          className="bg-gray-800 border-purple-600/50 text-gray-100 placeholder-gray-500 focus:border-purple-500 focus:ring-purple-500/20"
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-purple-400">
                        เลเวอเรจ (เช่น 10x = 10)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* Entry and Exit Details - Tabs */}
          <div className="bg-gray-800 rounded-lg border border-gray-600 p-5">
            <Tabs defaultValue="entry" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-700 border border-gray-600">
                <TabsTrigger value="entry" className="data-[state=active]:bg-gray-800 data-[state=active]:text-green-400 text-gray-300 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  รายละเอียดการเข้าเทรด
                </TabsTrigger>
                <TabsTrigger value="exit" className="data-[state=active]:bg-gray-800 data-[state=active]:text-red-400 text-gray-300 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  รายละเอียดการปิดออเดอร์
                </TabsTrigger>
              </TabsList>

              <TabsContent value="entry" className="space-y-4 mt-6">
                <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="entry_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-300">ราคาเข้า (Entry)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            placeholder="0.00"
                            {...field}
                            className="bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-green-500 focus:ring-green-500/20"
                          />
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
                        <FormLabel className="text-sm font-medium text-gray-300">ขนาดทุน</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            placeholder="1000.00"
                            {...field}
                            className="bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-green-500 focus:ring-green-500/20"
                          />
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
                        <FormLabel className="text-sm font-medium text-gray-300">อารมณ์ตอนเข้าเทรด</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} value={field.value || "none"}>
                          <FormControl>
                            <SelectTrigger className="bg-gray-700 border-gray-600 text-gray-100 focus:border-green-500 focus:ring-green-500/20">
                              <SelectValue placeholder="เลือกอารมณ์..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            <SelectItem value="none" className="text-gray-100">ไม่ระบุ</SelectItem>
                            {emotionOptions.map((emotion) => (
                              <SelectItem key={emotion.value} value={emotion.value} className="text-gray-100">
                                {emotion.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="entry_reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-300">เหตุผลที่เข้าเทรด</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="บอกเหตุผลที่คุณตัดสินใจเข้าเทรด..."
                            className="min-h-[120px] bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-green-500 focus:ring-green-500/20 resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="exit" className="space-y-4 mt-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-300">สถานะ</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-gray-700 border-gray-600 text-gray-100 focus:border-red-500 focus:ring-red-500/20">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            {statusOptions.map((status) => (
                              <SelectItem key={status.value} value={status.value} className="text-gray-100">
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Exit fields - only show when status is "closed" or "cancelled" */}
                  {(watchStatus === "closed" || watchStatus === "cancelled") && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="exit_price"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-300">
                                ราคาออก (Exit) {watchStatus === "closed" && <span className="text-red-400">*</span>}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="any"
                                  placeholder="0.00"
                                  {...field}
                                  className="bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-red-500 focus:ring-red-500/20"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="exit_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-300">
                                วันเวลาปิดออเดอร์ {watchStatus === "closed" && <span className="text-red-400">*</span>}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="datetime-local"
                                  {...field}
                                  className="bg-gray-700 border-gray-600 text-gray-100 focus:border-red-500 focus:ring-red-500/20"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="exit_emotion"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-300">อารมณ์ตอนขาย</FormLabel>
                            <Select onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} value={field.value || "none"}>
                              <FormControl>
                                <SelectTrigger className="bg-gray-700 border-gray-600 text-gray-100 focus:border-red-500 focus:ring-red-500/20">
                                  <SelectValue placeholder="เลือกอารมณ์..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-gray-800 border-gray-700">
                                <SelectItem value="none" className="text-gray-100">ไม่ระบุ</SelectItem>
                                {emotionOptions.map((emotion) => (
                                  <SelectItem key={emotion.value} value={emotion.value} className="text-gray-100">
                                    {emotion.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {watchStatus === "closed" && (
                        <FormField
                          control={form.control}
                          name="exit_reason"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-300">
                                เหตุผลที่ขาย <span className="text-red-400">*</span>
                              </FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="บอกเหตุผลที่คุณตัดสินใจปิดออเดอร์..."
                                  className="min-h-[120px] bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-red-500 focus:ring-red-500/20 resize-none"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {watchStatus === "cancelled" && (
                        <FormField
                          control={form.control}
                          name="exit_reason"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-300">เหตุผลที่ยกเลิก</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="บอกเหตุผลที่คุณตัดสินใจยกเลิกออเดอร์..."
                                  className="min-h-[120px] bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-red-500 focus:ring-red-500/20 resize-none"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </>
                  )}

                  </div>
              </TabsContent>

              {/* Hidden validation-only form section for fields that need validation regardless of tab visibility */}
              <div className="hidden">
                <FormField
                  control={form.control}
                  name="exit_price"
                  render={() => <></>}
                />
                <FormField
                  control={form.control}
                  name="exit_date"
                  render={() => <></>}
                />
                <FormField
                  control={form.control}
                  name="exit_reason"
                  render={() => <></>}
                />
              </div>
            </Tabs>
          </div>

          {/* Learning Note */}
          <div className="bg-gray-800 rounded-lg border border-gray-600 p-5 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
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
                      className="min-h-[120px] bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-purple-500 focus:ring-purple-500/20 resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Account Info */}
          <div className="bg-gray-800 rounded-lg border border-gray-600 p-5 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
              ข้อมูลบัญชี
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="account_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-300">ชื่อบัญชี</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="บัญชีหลัก"
                        {...field}
                        className="bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-gray-500 focus:ring-gray-500/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="account_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-300">ประเภทบัญชี</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} value={field.value || "none"}>
                      <FormControl>
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-gray-100 focus:border-gray-500 focus:ring-gray-500/20">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="none" className="text-gray-100">ไม่ระบุ</SelectItem>
                        {accountTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value} className="text-gray-100">
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-300">สกุลเงิน</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="USD"
                        {...field}
                        className="bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-gray-500 focus:ring-gray-500/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              className="border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white min-w-[140px] shadow-lg shadow-purple-500/25"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {isEditMode ? "กำลังอัพเดท..." : "กำลังบันทึก..."}
                </span>
              ) : (
                isEditMode ? "อัพเดทการเทรด" : "บันทึกการเทรด"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
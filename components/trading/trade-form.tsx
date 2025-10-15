"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { createTrade } from "@/lib/trading"
import { TradeForm as ITradeForm, Market, TradeStatus, AccountType, EmotionType, TradeDirection } from "@/types/trading"
import { toast } from "sonner"
import { format } from "date-fns"

const tradeFormSchema = z.object({
  entry_date: z.string().min(1, "กรุณาระบุวันที่เข้าเทรด"),
  symbol: z.string().min(1, "กรุณาระบุสัญลักษณ์"),
  market: z.enum(["spot", "futures", "margin"]),
  direction: z.enum(["buy", "sell"]).default("buy"),
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
}

// Helper function to get current Thai time formatted for datetime-local input
const getThaiTimeForInput = (): string => {
  // Get current local time and format for datetime-local input
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

// Helper function to convert time to Thai readable format
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


// Component to display Thai date/time preview
const ThaiDateTimeDisplay = ({ value, label }: { value: string; label: string }) => {
  if (!value) return null

  // Parse datetime-local value as local time and convert to Thai timezone
  const [datePart, timePart] = value.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)

  // Create Date object in local timezone (should be Thai time)
  const localDate = new Date(year, month - 1, day, hour, minute)

  // Format Thai time
  const buddhistYear = localDate.getFullYear() + 543
  const localMonth = localDate.getMonth() + 1
  const localDay = localDate.getDate()
  const localHour = localDate.getHours()
  const localMinute = localDate.getMinutes()

  const thaiMonths = [
    "", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ]

  const timeStr = formatThaiTime(localHour, localMinute)
  const thaiDisplay = `${localDay}/${thaiMonths[localMonth]}/${buddhistYear} ${timeStr}`

  return (
    <div className="mt-2 p-2 bg-blue-900/20 border border-blue-600/30 rounded text-sm">
      <span className="text-blue-400 font-medium">{label}: </span>
      <span className="text-white">{thaiDisplay}</span>
    </div>
  )
}

export function TradeForm({ onTradeCreated }: TradeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof tradeFormSchema>>({
    resolver: zodResolver(tradeFormSchema),
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
  const watchEntryDate = form.watch("entry_date")
  const watchExitDate = form.watch("exit_date")

  const marketOptions: { value: Market; label: string }[] = [
    { value: "spot", label: "สปอต" },
    { value: "futures", label: "ฟิวเจอร์ส" },
    { value: "margin", label: "มาร์จิน" },
  ]

  const directionOptions: { value: TradeDirection; label: string; color: string }[] = [
    { value: "buy", label: "ซื้อ (Long)", color: "text-green-400" },
    { value: "sell", label: "ขาย (Short)", color: "text-red-400" },
  ]

  const statusOptions: { value: TradeStatus; label: string }[] = [
    { value: "open", label: "เปิด" },
    { value: "closed", label: "ปิดแล้ว" },
    { value: "cancelled", label: "ยกเลิก" },
  ]

  const emotionOptions: { value: EmotionType; label: string; color: string }[] = [
    { value: "greedy", label: "โลภ", color: "text-green-600" },
    { value: "fearful", label: "กลัว", color: "text-red-600" },
    { value: "confident", label: "มั่นใจ", color: "text-blue-600" },
    { value: "anxious", label: "กังวล", color: "text-orange-600" },
    { value: "neutral", label: "เป็นกลาง", color: "text-gray-600" },
    { value: "excited", label: "ตื่นเต้น", color: "text-purple-600" },
    { value: "disappointed", label: "ผิดหวัง", color: "text-indigo-600" },
    { value: "calm", label: "สงบ", color: "text-teal-600" },
  ]

  const timeframeOptions = [
    "1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"
  ]

  const accountTypes: { value: AccountType; label: string }[] = [
    { value: "demo", label: "บัญชีทดลอง" },
    { value: "live", label: "บัญชีจริง" },
  ]

  const onSubmit = async (values: z.infer<typeof tradeFormSchema>) => {
    setIsSubmitting(true)
    try {
      // Calculate profit/loss if trade is closed
      let profitLoss = undefined
      let profitLossPercent = undefined

      if (values.status === "closed" && values.exit_price && values.entry_price) {
        const entryPrice = parseFloat(values.entry_price)
        const exitPrice = parseFloat(values.exit_price)
        const capitalAmount = parseFloat(values.capital_amount)

        if (watchMarket === "futures" || watchMarket === "margin") {
          const positionSize = parseFloat(values.position_size || "1")
          profitLoss = (exitPrice - entryPrice) * positionSize
          profitLossPercent = (profitLoss / capitalAmount) * 100
        } else {
          // For spot trading
          const quantity = capitalAmount / entryPrice
          profitLoss = (exitPrice - entryPrice) * quantity
          profitLossPercent = (profitLoss / capitalAmount) * 100
        }

        // Adjust profit/loss based on direction
        if (values.direction === "sell") {
          profitLoss = -profitLoss
          profitLossPercent = -profitLossPercent
        }
      }

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

      const tradeData: ITradeForm = {
        ...values,
        direction: values.direction || "buy",
        entry_date: convertToISOString(values.entry_date) || values.entry_date,
        exit_date: values.exit_date ? (convertToISOString(values.exit_date) || values.exit_date) : undefined,
      }

      await createTrade(tradeData)
      toast.success("บันทึกการเทรดสำเร็จ!")
      form.reset()
      onTradeCreated?.()
    } catch (error) {
      console.error("Error creating trade:", error)
      toast.error("เกิดข้อผิดพลาดในการบันทึกการเทรด")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 h-full">
        {/* Header Section */}
        <div className="text-center pb-6 border-b border-gray-800">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/25">
              <span className="text-white text-2xl">📈</span>
            </div>
            <h2 className="text-3xl font-bold text-transparent bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text">
              บันทึกการเทรดใหม่
            </h2>
          </div>
          <p className="text-gray-400">บันทึกรายละเอียดการเทรดของคุณเพื่อติดตามผลงาน</p>
        </div>

        {/* Main Content - Responsive Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 min-h-0">
          {/* Left Column - Basic Info & Entry */}
          <div className="xl:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <span className="text-white text-sm">📊</span>
                </div>
                <h3 className="text-xl font-semibold text-white">ข้อมูลพื้นฐาน</h3>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormField
                    control={form.control}
                    name="entry_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-300">📅 วันที่และเวลาเข้าเทรด</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                            className="bg-gray-700 border-gray-600 text-gray-100 focus:border-blue-500 focus:ring-blue-500/20"
                          />
                        </FormControl>
                        <FormDescription className="text-xs text-gray-400">
                          เลือกวันที่และเวลาตามเวลาประเทศไทย (GMT+7)
                        </FormDescription>
                        {watchEntryDate && (
                          <ThaiDateTimeDisplay value={watchEntryDate} label="วันที่เข้าเทรด" />
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="symbol"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-300">💱 สัญลักษณ์</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="BTC/USD"
                            {...field}
                            className="bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500/20"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <FormField
                    control={form.control}
                    name="market"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-300">🏪 ตลาด</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-gray-700 border-gray-600 text-gray-100 focus:border-blue-500 focus:ring-blue-500/20">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            {marketOptions.map((market) => (
                              <SelectItem key={market.value} value={market.value}>
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                  <span className="text-gray-100">{market.label}</span>
                                </div>
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
                    name="direction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-300">📈 ทิศทาง</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-gray-700 border-gray-600 text-gray-100 focus:border-blue-500 focus:ring-blue-500/20">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            {directionOptions.map((direction) => (
                              <SelectItem key={direction.value} value={direction.value}>
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
                    name="timeframe"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-300">⏱️ Timeframe</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} value={field.value || "none"}>
                          <FormControl>
                            <SelectTrigger className="bg-gray-700 border-gray-600 text-gray-100 focus:border-blue-500 focus:ring-blue-500/20">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            <SelectItem value="none">📅 ไม่ระบุ</SelectItem>
                            {timeframeOptions.map((timeframe) => (
                              <SelectItem key={timeframe} value={timeframe}>
                                <span className="text-gray-100">⏱️ {timeframe}</span>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5 p-5 bg-gray-900 rounded-lg border border-purple-600/30">
                    <FormField
                      control={form.control}
                      name="position_size"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-purple-300">📦 Position Size</FormLabel>
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
                          <FormLabel className="text-sm font-medium text-purple-300">⚡ Leverage</FormLabel>
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
            </div>

            {/* Entry Details */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/25">
                  <span className="text-white text-sm">📥</span>
                </div>
                <h3 className="text-xl font-semibold text-white">รายละเอียดการเข้าเทรด</h3>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormField
                    control={form.control}
                    name="entry_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-300">🎯 ราคาเข้า (Entry)</FormLabel>
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
                        <FormLabel className="text-sm font-medium text-gray-300">💰 ขนาดทุน</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            placeholder="1000.00"
                            {...field}
                            className="bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-green-500 focus:ring-green-500/20"
                          />
                        </FormControl>
                        <FormDescription className="text-xs text-green-400">
                          จำนวนเงินที่ลงทุน (USD)
                        </FormDescription>
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
                      <FormLabel className="text-sm font-medium text-gray-300">😊 อารมณ์ตอนเข้าเทรด</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger className="bg-gray-700 border-gray-600 text-gray-100 focus:border-green-500 focus:ring-green-500/20">
                            <SelectValue placeholder="เลือกอารมณ์..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="none">🤔 ไม่ระบุ</SelectItem>
                          {emotionOptions.map((emotion) => (
                            <SelectItem key={emotion.value} value={emotion.value}>
                              <span className={emotion.color}>{emotion.label}</span>
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
                      <FormLabel className="text-sm font-medium text-gray-300">📝 เหตุผลที่เข้าเทรด</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="บอกเหตุผลที่คุณตัดสินใจเข้าเทรด..."
                          className="min-h-[100px] bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-green-500 focus:ring-green-500/20 resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Right Column - Exit & Status */}
          <div className="space-y-6">
            {/* Exit Details */}
            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/25">
                  <span className="text-white text-sm">📤</span>
                </div>
                <h3 className="text-lg font-semibold text-white">รายละเอียดการปิดออเดอร์</h3>
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-300">📊 สถานะ</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-gray-700 border-gray-600 text-gray-100 focus:border-orange-500 focus:ring-orange-500/20">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          {statusOptions.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              <div className="flex items-center gap-2">
                                {status.value === 'open' && '🔵'}
                                {status.value === 'closed' && '🟢'}
                                {status.value === 'cancelled' && '🔴'}
                                <span className="text-gray-100">{status.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(watchStatus === "closed" || watchStatus === "cancelled") && (
                  <>
                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control}
                        name="exit_price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-300">🎯 ราคาออก (Exit)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="any"
                                placeholder="0.00"
                                {...field}
                                className="bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-orange-500 focus:ring-orange-500/20"
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
                            <FormLabel className="text-sm font-medium text-gray-300">📅 วันที่และเวลาปิดออเดอร์</FormLabel>
                            <FormControl>
                              <Input
                                type="datetime-local"
                                {...field}
                                className="bg-gray-700 border-gray-600 text-gray-100 focus:border-orange-500 focus:ring-orange-500/20"
                              />
                            </FormControl>
                            <FormDescription className="text-xs text-gray-400">
                              เลือกวันที่และเวลาตามเวลาประเทศไทย (GMT+7)
                            </FormDescription>
                            {watchExitDate && (
                              <ThaiDateTimeDisplay value={watchExitDate} label="วันที่ปิดออเดอร์" />
                            )}
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
                          <FormLabel className="text-sm font-medium text-gray-300">😌 อารมณ์ตอนขาย</FormLabel>
                          <Select onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} value={field.value || "none"}>
                            <FormControl>
                              <SelectTrigger className="bg-gray-700 border-gray-600 text-gray-100 focus:border-orange-500 focus:ring-orange-500/20">
                                <SelectValue placeholder="เลือกอารมณ์..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-gray-800 border-gray-700">
                              <SelectItem value="none">🤔 ไม่ระบุ</SelectItem>
                              {emotionOptions.map((emotion) => (
                                <SelectItem key={emotion.value} value={emotion.value}>
                                  <span className={emotion.color}>{emotion.label}</span>
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
                      name="exit_reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-300">📝 เหตุผลที่ขาย</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="บอกเหตุผลที่คุณตัดสินใจปิดออเดอร์..."
                              className="min-h-[100px] bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-orange-500 focus:ring-orange-500/20 resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Learning Note */}
            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/25">
                  <span className="text-white text-sm">💡</span>
                </div>
                <h3 className="text-lg font-semibold text-white">สิ่งที่ได้เรียนรู้</h3>
              </div>

              <FormField
                control={form.control}
                name="learning_note"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="บันทึกสิ่งที่คุณได้เรียนรู้จากการเทรดครั้งนี้...&#10;&#10;🎯 อะไรที่ทำได้ดี?&#10;❌ อะไรที่ควรปรับปรุง?&#10;📚 บทเรียนที่ได้รับ?"
                        className="min-h-[150px] bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-purple-500 focus:ring-purple-500/20 resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Account Info */}
            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-gradient-to-r from-gray-600 to-gray-700 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">👤</span>
                </div>
                <h3 className="text-lg font-semibold text-white">ข้อมูลบัญชี</h3>
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="account_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-300">🏦 ชื่อบัญชี</FormLabel>
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
                      <FormLabel className="text-sm font-medium text-gray-300">🎮 ประเภทบัญชี</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger className="bg-gray-700 border-gray-600 text-gray-100 focus:border-gray-500 focus:ring-gray-500/20">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="none">🤔 ไม่ระบุ</SelectItem>
                          {accountTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                {type.value === 'demo' && '🎮'}
                                {type.value === 'live' && '💰'}
                                <span className="text-gray-100">{type.label}</span>
                              </div>
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
                      <FormLabel className="text-sm font-medium text-gray-300">💵 สกุลเงิน</FormLabel>
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
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex sm:justify-between items-center gap-4 pt-6 border-t border-gray-800 bg-gray-900 -mx-6 px-6 -mb-8 rounded-b-xl sticky bottom-0">
          <div className="text-sm text-gray-500">
            💡 เคล็ดลับ: บันทึกทุกการเทรดเพื่อวิเคราะห์และปรับปรุงกลยุทธ์
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              className="border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white w-full sm:w-auto"
            >
              🔄 ล้างฟอร์ม
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white min-w-[140px] w-full sm:w-auto shadow-lg shadow-purple-500/25"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  กำลังบันทึก...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  💾 บันทึกการเทรด
                </span>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}
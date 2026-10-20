"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { createWealthCategory, createWealthInvestment, createWealthTransaction } from "@/app/dashboard/my-wealth/actions"
import { useWealth } from "./wealth-context"

const CATEGORY_COLORS = [
  "#1ed760", // Green
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#6366f1", // Indigo
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#f43f5e", // Rose
  "#f59e0b", // Amber
  "#06b6d4", // Cyan
  "#64748b", // Slate
]

export function MyWealthQuickActions({
  categories: propCategories,
  allowedModes = ["income", "expense", "investment", "category"],
  defaultMode,
}: {
  categories?: any[]
  allowedModes?: Array<"income" | "expense" | "investment" | "category">
  defaultMode?: "income" | "expense" | "investment" | "category"
}) {
  const { categories: contextCategories, usdThbRate, refreshData } = useWealth()
  const categories = propCategories || contextCategories

  const [mode, setMode] = useState<"income" | "expense" | "investment" | "category" | null>(null)
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [investmentType, setInvestmentType] = useState("thai_stock")
  const [quoteAsset, setQuoteAsset] = useState("USD")
  const [foreignAmount, setForeignAmount] = useState("")
  const [thbAmount, setThbAmount] = useState("")
  const [selectedColor, setSelectedColor] = useState(CATEGORY_COLORS[0])
  const [txCurrency, setTxCurrency] = useState<"THB" | "USD">("THB")
  const [txAmount, setTxAmount] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState("")
  const [inlineCategoryOpen, setInlineCategoryOpen] = useState(false)
  const [inlineCategoryName, setInlineCategoryName] = useState("")
  const [inlineCategoryColor, setInlineCategoryColor] = useState(CATEGORY_COLORS[0])

  const rate = usdThbRate || 34.0
  const activeCategories = categories.filter((category) => category.is_active)

  const handleTypeChange = (type: string) => {
    setInvestmentType(type)
    if (type === "foreign_stock" && quoteAsset === "THB") {
      setQuoteAsset("USD")
    }
  }

  const handleForeignAmountChange = (val: string) => {
    setForeignAmount(val)
    const num = parseFloat(val)
    if (!isNaN(num) && num > 0) {
      setThbAmount((Math.round(num * rate * 100) / 100).toFixed(2))
    } else {
      setThbAmount("")
    }
  }

  const handleCreateInlineCategory = async (type: "income" | "expense") => {
    if (!inlineCategoryName.trim()) return
    try {
      const created = await createWealthCategory({
        name: inlineCategoryName.trim(),
        type,
        color: inlineCategoryColor,
      })
      if (created && created.id) {
        setSelectedCategoryId(created.id)
      }
      setInlineCategoryOpen(false)
      setInlineCategoryName("")
      refreshData()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to create category")
    }
  }

  function submitTransaction(formData: FormData, type: "income" | "expense") {
    setMessage(null)
    startTransition(async () => {
      try {
        const rawAmount = parseFloat(String(formData.get("amount") || txAmount))
        const finalThb = txCurrency === "USD" ? Math.round(rawAmount * rate * 100) / 100 : rawAmount
        const originalNote = formData.get("note") ? String(formData.get("note")).trim() : ""
        const finalNote = txCurrency === "USD" ? `[USD: $${rawAmount.toFixed(2)}] ${originalNote}`.trim() : (originalNote || undefined)

        await createWealthTransaction({
          type,
          transaction_date: formData.get("transaction_date"),
          amount_thb: finalThb,
          category_id: formData.get("category_id"),
          merchant_or_payer: formData.get("merchant_or_payer"),
          description: formData.get("description"),
          note: finalNote,
          payment_status: type === "expense" ? formData.get("payment_status") : "paid",
        })
        setMode(null)
        setTxAmount("")
        refreshData()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to record transaction")
      }
    })
  }

  function submitInvestment(formData: FormData) {
    setMessage(null)
    startTransition(async () => {
      try {
        const rawForeign = foreignAmount ? parseFloat(foreignAmount) : undefined
        await createWealthInvestment({
          platform: formData.get("platform"),
          investment_type: formData.get("investment_type"),
          asset_symbol: formData.get("asset_symbol"),
          quote_asset: quoteAsset,
          opened_amount_thb: formData.get("opened_amount_thb"),
          opened_at: formData.get("opened_at"),
          quantity: formData.get("quantity") || undefined,
          entry_price: formData.get("entry_price") || undefined,
          entry_fee_thb: formData.get("entry_fee_thb") || 0,
          note: formData.get("note"),
          dual_strategy: formData.get("dual_strategy") || undefined,
          deposit_asset: formData.get("deposit_asset") || undefined,
          deposit_amount: rawForeign || (formData.get("deposit_amount") ? parseFloat(String(formData.get("deposit_amount"))) : undefined),
          target_price: formData.get("target_price") || undefined,
          apr_percent: formData.get("apr_percent") || undefined,
          term_days: formData.get("term_days") || undefined,
          settlement_date: formData.get("settlement_date") || undefined,
        })
        setMode(null)
        setForeignAmount("")
        setThbAmount("")
        refreshData()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to record investment")
      }
    })
  }

  const today = new Date().toISOString().slice(0, 10)

  function submitCategory(formData: FormData) {
    setMessage(null)
    startTransition(async () => {
      try {
        await createWealthCategory({
          name: formData.get("name"),
          type: formData.get("type"),
          color: selectedColor,
        })
        setMode(null)
        refreshData()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to create category")
      }
    })
  }

  const categoryType = mode === "income" ? "income" : "expense"

  const dialogTitle =
    mode === "income"
      ? "บันทึกรายรับ (Add Income)"
      : mode === "expense"
      ? "บันทึกรายจ่าย (Add Expense)"
      : mode === "investment"
      ? "บันทึกการลงทุน (Add Investment)"
      : "สร้างหมวดหมู่ใหม่ (Add Category)"

  const dialogDescription =
    mode === "income"
      ? "บันทึกเงินเดือน รายได้จากการขาย หรือรายรับอื่นๆ"
      : mode === "expense"
      ? "บันทึกค่าใช้จ่าย ทั้งที่ชำระแล้วและรายการรอจ่าย"
      : mode === "investment"
      ? "บันทึกพอร์ต Dime, Bybit หรือ Binance TH"
      : "สร้างหมวดหมู่เพื่อจัดระเบียบกระแสเงินสดของคุณ"

  const fieldClass =
    "h-9 rounded-lg border border-white/10 bg-[#181818] px-3 text-xs text-white shadow-inner outline-none transition placeholder:text-white/35 hover:border-white/20 focus:border-primary focus:ring-1 focus:ring-primary/20"
  const footerClass = "p-3.5 border-t border-white/10 bg-[#181818]/90 shrink-0 flex items-center justify-end gap-2"

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {allowedModes.includes("income") && allowedModes.includes("expense") ? (
          <Button
            className="btn-pill-primary text-xs"
            onClick={() => {
              setMode(defaultMode || "expense")
              setSelectedCategoryId("")
            }}
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Transaction
          </Button>
        ) : (
          <>
            {allowedModes.includes("income") && (
              <Button className="btn-pill-primary text-xs" onClick={() => setMode("income")}>
                <Plus className="w-4 h-4 mr-1.5" /> Add Income
              </Button>
            )}
            {allowedModes.includes("expense") && (
              <Button className="btn-pill-primary text-xs" onClick={() => setMode("expense")}>
                <Plus className="w-4 h-4 mr-1.5" /> Add Expense
              </Button>
            )}
          </>
        )}
        {allowedModes.includes("investment") && (
          <Button className="btn-pill-primary text-xs" onClick={() => setMode("investment")}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Investment
          </Button>
        )}
        {allowedModes.includes("category") && (
          <Button className="btn-pill bg-[#1f1f1f] hover:bg-[#2a2a2a] text-white text-xs border border-white/10" onClick={() => setMode("category")}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Category
          </Button>
        )}
      </div>
      {message && <p className="text-xs text-rose-400">{message}</p>}

      <Dialog open={mode !== null} onOpenChange={(open) => !open && setMode(null)}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-hidden p-0 bg-[#121212] border border-white/10 text-white shadow-heavy flex flex-col">
          <DialogHeader className="p-5 pb-3 border-b border-white/10 shrink-0">
            <DialogTitle className="text-lg font-bold">{dialogTitle}</DialogTitle>
            <DialogDescription className="text-spotify-muted text-xs">{dialogDescription}</DialogDescription>
          </DialogHeader>

          {(mode === "income" || mode === "expense") && (
            <form action={(formData) => submitTransaction(formData, mode)} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto px-5 py-4 flex-1 space-y-4">
                {/* Type Switcher inside Modal */}
                <div className="flex items-center gap-1 rounded-xl bg-[#181818] p-1 border border-white/5 w-fit">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("expense")
                      setSelectedCategoryId("")
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      mode === "expense"
                        ? "bg-[#f3727f]/20 text-[#f3727f] border border-[#f3727f]/30"
                        : "text-spotify-muted hover:text-white"
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("income")
                      setSelectedCategoryId("")
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      mode === "income"
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "text-spotify-muted hover:text-white"
                    }`}
                  >
                    Income
                  </button>
                </div>

                <div className="grid gap-3.5 md:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-spotify-muted font-bold">วันที่ทำรายการ</label>
                    <DatePicker name="transaction_date" required defaultValue={today} className={fieldClass} />
                  </div>

                  {/* Amount with Currency Switcher (THB vs USD/USDT) */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-spotify-muted font-bold">จำนวนเงิน</label>
                      <div className="flex items-center rounded-lg border border-white/10 bg-[#1f1f1f] p-0.5">
                        <button
                          type="button"
                          onClick={() => setTxCurrency("THB")}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            txCurrency === "THB" ? "bg-primary text-black" : "text-spotify-muted hover:text-white"
                          }`}
                        >
                          THB
                        </button>
                        <button
                          type="button"
                          onClick={() => setTxCurrency("USD")}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            txCurrency === "USD" ? "bg-primary text-black" : "text-spotify-muted hover:text-white"
                          }`}
                        >
                          USD
                        </button>
                      </div>
                    </div>
                    <input
                      type="number"
                      name="amount"
                      required
                      min="0.01"
                      step="0.01"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      placeholder={txCurrency === "USD" ? "$ 0.00" : "฿ 0.00"}
                      className={fieldClass}
                    />
                    {txCurrency === "USD" && parseFloat(txAmount) > 0 && (
                      <span className="text-[11px] text-spotify-muted">
                        1 USD ≈ ฿{rate.toFixed(2)} THB (≈ ฿{(parseFloat(txAmount) * rate).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                      </span>
                    )}
                  </div>

                  {/* Category Selection with Inline Category Creator */}
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-spotify-muted font-bold">หมวดหมู่</label>
                      <button
                        type="button"
                        onClick={() => setInlineCategoryOpen(!inlineCategoryOpen)}
                        className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        {inlineCategoryOpen ? "Close form" : "Add new category"}
                      </button>
                    </div>

                    {inlineCategoryOpen && (
                      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2.5 animate-in fade-in-50 duration-200">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="ชื่อหมวดหมู่ใหม่ เช่น ค่าน้ำมัน, ค่ากาแฟ"
                            value={inlineCategoryName}
                            onChange={(e) => setInlineCategoryName(e.target.value)}
                            className="spotify-input h-8 text-xs flex-1"
                            autoFocus
                          />
                          <Button
                            type="button"
                            size="sm"
                            disabled={!inlineCategoryName.trim()}
                            onClick={() => handleCreateInlineCategory(mode)}
                            className="btn-pill-primary h-8 px-3 text-xs"
                          >
                            Create
                          </Button>
                        </div>
                        <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                          <span className="text-[10px] text-spotify-muted">สีหมวด:</span>
                          {CATEGORY_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setInlineCategoryColor(c)}
                              className={`w-4 h-4 rounded-full transition-transform ${
                                inlineCategoryColor === c ? "ring-2 ring-white scale-110" : "opacity-75"
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <Select
                      name="category_id"
                      value={selectedCategoryId || undefined}
                      onValueChange={setSelectedCategoryId}
                      required
                    >
                      <SelectTrigger className={fieldClass}>
                        <SelectValue placeholder="เลือกหมวดหมู่" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1f1f1f] border-white/10 text-white">
                        {activeCategories
                          .filter((category) => category.type === (mode === "income" ? "income" : "expense"))
                          .map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color || "#1ed760" }} />
                                <span>{category.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-xs text-spotify-muted font-bold">
                      {mode === "income" ? "ผู้จ่าย / แหล่งที่มา" : "ร้านค้า / ผู้รับเงิน"}
                    </label>
                    <input name="merchant_or_payer" placeholder={mode === "income" ? "เช่น บริษัท, ลูกค้า" : "เช่น ซูเปอร์มาร์เก็ต, ค่าไฟ"} className={fieldClass} />
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-xs text-spotify-muted font-bold">รายละเอียดรายการ</label>
                    <input name="description" placeholder="ระบุรายละเอียดสั้นๆ" className={fieldClass} />
                  </div>

                  {mode === "expense" && (
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-xs text-spotify-muted font-bold">สถานะการชำระเงิน</label>
                      <Select name="payment_status" defaultValue="paid">
                        <SelectTrigger className={fieldClass}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1f1f1f] border-white/10 text-white">
                          <SelectItem value="paid">จ่ายแล้ว (Paid)</SelectItem>
                          <SelectItem value="pending">รอจ่าย / ยังไม่ได้ชำระ (Pending)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-xs text-spotify-muted font-bold">บันทึกเพิ่มเติม (ถ้ามี)</label>
                    <input name="note" placeholder="โน้ตช่วยจำ" className={fieldClass} />
                  </div>
                </div>
              </div>

              <DialogFooter className={footerClass}>
                <Button type="button" variant="ghost" className="btn-pill text-spotify-muted hover:text-white" onClick={() => setMode(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="btn-pill-primary" disabled={pending}>
                  {pending ? "Saving..." : "Add Transaction"}
                </Button>
              </DialogFooter>
            </form>
          )}

          {mode === "category" && (
            <form action={submitCategory} className="grid gap-4 pt-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-spotify-muted font-bold">ชื่อหมวดหมู่</label>
                <input name="name" required placeholder="เช่น ค่าอาหาร, ค่าน้ำมัน" className={fieldClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-spotify-muted font-bold">ประเภท</label>
                <Select name="type" defaultValue="expense">
                  <SelectTrigger className={fieldClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1f1f1f] border-white/10 text-white">
                    <SelectItem value="income">รายรับ (Income)</SelectItem>
                    <SelectItem value="expense">รายจ่าย (Expense)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs text-spotify-muted font-bold">สีหมวดหมู่</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {CATEGORY_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${selectedColor === c ? "ring-2 ring-white scale-110" : "opacity-80 hover:opacity-100"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <DialogFooter className={`md:col-span-2 ${footerClass}`}>
                <Button type="button" variant="ghost" className="btn-pill text-spotify-muted hover:text-white" onClick={() => setMode(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="btn-pill-primary" disabled={pending}>
                  {pending ? "Creating..." : "Create Category"}
                </Button>
              </DialogFooter>
            </form>
          )}

          {mode === "investment" && (
            <form action={submitInvestment} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto px-5 py-3.5 flex-1">
                <div className="grid gap-2.5 md:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-spotify-muted font-bold">แพลตฟอร์ม</label>
                    <Select name="platform" defaultValue="dime">
                      <SelectTrigger className={fieldClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1f1f1f] border-white/10 text-white">
                        <SelectItem value="dime">Dime</SelectItem>
                        <SelectItem value="bybit">Bybit</SelectItem>
                        <SelectItem value="binance_th">Binance TH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-spotify-muted font-bold">ประเภทการลงทุน</label>
                    <Select name="investment_type" value={investmentType} onValueChange={handleTypeChange}>
                      <SelectTrigger className={fieldClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1f1f1f] border-white/10 text-white">
                        <SelectItem value="thai_stock">Thai Stock</SelectItem>
                        <SelectItem value="foreign_stock">Global Stock</SelectItem>
                        <SelectItem value="spot_trade">Spot Trade</SelectItem>
                        <SelectItem value="futures_trade">Futures Trade</SelectItem>
                        <SelectItem value="crypto_holding">Crypto</SelectItem>
                        <SelectItem value="dual_asset">Dual Investment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Symbol & Currency Switcher side-by-side */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-spotify-muted font-bold">สัญลักษณ์</label>
                    <input name="asset_symbol" required placeholder="เช่น PTT, AAPL, NVDA, BTC, ETH" className={fieldClass} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-spotify-muted font-bold">สกุลเงิน (Currency)</label>
                    <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#181818] p-1 h-9">
                      {[
                        { key: "THB", label: "THB" },
                        { key: "USD", label: "USD" },
                      ].map((curr) => {
                        const isSelected = curr.key === "THB" ? quoteAsset === "THB" : (quoteAsset === "USD" || quoteAsset === "USDT")
                        return (
                          <button
                            key={curr.key}
                            type="button"
                            onClick={() => setQuoteAsset(curr.key)}
                            className={`flex-1 rounded-md py-1 text-xs font-bold transition-all ${
                              isSelected
                                ? "bg-primary text-black shadow-play"
                                : "text-spotify-muted hover:text-white"
                            }`}
                          >
                            {curr.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Investment Amount & Opened Date */}
                  {quoteAsset !== "THB" ? (
                    <>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] text-spotify-muted font-bold">ยอดเงินลงทุน ({quoteAsset})</label>
                          <span className="text-[10px] text-spotify-muted">
                            1 {quoteAsset} ≈ ฿{rate.toFixed(2)}
                          </span>
                        </div>
                        <input
                          type="number"
                          step="any"
                          min="0.00000001"
                          placeholder={`0.00 ${quoteAsset}`}
                          value={foreignAmount}
                          onChange={(e) => handleForeignAmountChange(e.target.value)}
                          className={fieldClass}
                        />
                        <input type="hidden" name="opened_amount_thb" value={thbAmount} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-spotify-muted font-bold">วันที่เปิดรายการ</label>
                        <DatePicker name="opened_at" required defaultValue={today} className={fieldClass} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-spotify-muted font-bold">ยอดเงินลงทุน (บาท)</label>
                        <input type="number" name="opened_amount_thb" required min="0.01" step="0.01" placeholder="฿ 0.00" className={fieldClass} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-spotify-muted font-bold">วันที่เปิดรายการ</label>
                        <DatePicker name="opened_at" required defaultValue={today} className={fieldClass} />
                      </div>
                    </>
                  )}

                  {/* Quantity & Entry Price */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-spotify-muted font-bold">จำนวนที่ซื้อ (ถ้ามี)</label>
                    <input type="number" name="quantity" min="0" step="any" placeholder="เช่น 10 หุ้น หรือ 0.05 BTC" className={fieldClass} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-spotify-muted font-bold">ราคาเข้าต่อหน่วย ({quoteAsset})</label>
                    <input type="number" name="entry_price" min="0" step="any" placeholder="ราคาเข้า" className={fieldClass} />
                  </div>

                  {/* Entry Fee & Note */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-spotify-muted font-bold">ค่าธรรมเนียมเข้า (บาท)</label>
                    <input type="number" name="entry_fee_thb" min="0" step="0.01" defaultValue="0" placeholder="฿ 0.00" className={fieldClass} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-spotify-muted font-bold">บันทึกช่วยจำ (Optional)</label>
                    <input name="note" placeholder="หมายเหตุเพิ่มเติม" className={fieldClass} />
                  </div>

                  {/* Dual Asset Specific Fields */}
                  {investmentType === "dual_asset" && (
                    <>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-spotify-muted font-bold">กลยุทธ์ Dual Investment</label>
                        <Select name="dual_strategy" defaultValue="buy_low">
                          <SelectTrigger className={fieldClass}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1f1f1f] border-white/10 text-white">
                            <SelectItem value="buy_low">Buy Low</SelectItem>
                            <SelectItem value="sell_high">Sell High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-spotify-muted font-bold">เหรียญที่ฝาก</label>
                        <input name="deposit_asset" required placeholder="เช่น USDT, BTC" className={fieldClass} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-spotify-muted font-bold">จำนวนที่ฝาก</label>
                        <input type="number" name="deposit_amount" required min="0.00000001" step="any" placeholder="0.00" className={fieldClass} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-spotify-muted font-bold">ราคาเป้าหมาย</label>
                        <input type="number" name="target_price" required min="0.00000001" step="any" placeholder="Target Price" className={fieldClass} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-spotify-muted font-bold">ผลตอบแทน APR %</label>
                        <input type="number" name="apr_percent" required min="0" step="0.0001" placeholder="APR %" className={fieldClass} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-spotify-muted font-bold">ระยะเวลา (วัน)</label>
                        <input type="number" name="term_days" required min="1" step="1" placeholder="จำนวนวัน" className={fieldClass} />
                      </div>
                      <div className="flex flex-col gap-1 md:col-span-2">
                        <label className="text-[11px] text-spotify-muted font-bold">วันครบกำหนด</label>
                        <DatePicker name="settlement_date" required className={fieldClass} />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <DialogFooter className={footerClass}>
                <Button type="button" variant="ghost" className="btn-pill text-spotify-muted hover:text-white" onClick={() => setMode(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="btn-pill-primary" disabled={pending}>
                  {pending ? "Saving..." : "Add Investment"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

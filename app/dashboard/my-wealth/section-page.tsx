"use client"

import { useState, useMemo, useTransition } from "react"
import {
  Landmark,
  ReceiptText,
  WalletCards,
  FolderCog,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  Search,
  Check,
  TrendingUp,
  XCircle,
  Sparkles,
} from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"
import { PageHeader } from "@/components/ui/page-header"
import { ReusableDataTable } from "@/components/ui/reusable-data-table"
import { WealthApiStatus } from "@/components/my-wealth/wealth-status"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { DatePicker } from "@/components/ui/date-picker"
import { formatDateDDMMYYYY } from "@/components/dashboard/format"
import { MyWealthQuickActions } from "@/components/my-wealth/quick-actions"
import { useWealth, WealthTransaction, WealthInvestment, WealthCategory } from "@/components/my-wealth/wealth-context"
import {
  markWealthExpensePaid,
  deleteWealthTransaction,
  updateWealthTransaction,
  closeWealthInvestment,
  cancelWealthInvestment,
  deleteWealthInvestment,
  updateWealthInvestment,
  updateWealthCategory,
  deleteWealthCategory,
} from "./actions"

type Section = "investments" | "income" | "expenses" | "categories"

const sectionConfig = {
  investments: {
    title: "Investments",
    eyebrow: "Portfolio activity",
    description: "บันทึกและติดตามดีลของ Dime, Bybit และ Binance TH พร้อมคำนวณกำไร/ขาดทุนแบบเรียลไทม์",
    mode: "investment" as const,
    icon: Landmark,
  },
  income: {
    title: "Income",
    eyebrow: "Cash in",
    description: "บันทึกเงินเดือน รายได้จากการขาย และรายรับอื่น ๆ ในที่เดียว",
    mode: "income" as const,
    icon: WalletCards,
  },
  expenses: {
    title: "Expenses",
    eyebrow: "Cash out",
    description: "เห็นทุกค่าใช้จ่าย ทั้งที่ชำระแล้วและรายการที่รอจ่าย พร้อมกดจ่ายได้ทันที",
    mode: "expense" as const,
    icon: ReceiptText,
  },
  categories: {
    title: "Categories",
    eyebrow: "Organize",
    description: "จัดหมวดหมู่ กำหนดสี และเปิด/ปิดใช้งานหมวดการเงินเพื่อสรุปภาพรวมให้เข้าใจง่าย",
    mode: "category" as const,
    icon: FolderCog,
  },
}

const CATEGORY_COLORS = [
  "#1ed760",
  "#10b981",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f59e0b",
  "#06b6d4",
  "#64748b",
]

function getInvestmentTypeBadge(type: string) {
  switch (type) {
    case "crypto_holding":
      return {
        label: "CRYPTO",
        className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      }
    case "spot_trade":
      return {
        label: "SPOT",
        className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      }
    case "futures_trade":
      return {
        label: "FUTURES",
        className: "bg-purple-500/15 text-purple-400 border-purple-500/30",
      }
    case "foreign_stock":
      return {
        label: "GLOBAL STOCK",
        className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
      }
    case "thai_stock":
      return {
        label: "THAI STOCK",
        className: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
      }
    case "dual_asset":
      return {
        label: "DUAL ASSET",
        className: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
      }
    default:
      return {
        label: type?.replace("_", " ")?.toUpperCase() || "ASSET",
        className: "bg-white/5 text-[#b3b3b3] border-white/10",
      }
  }
}

function getPlatformBadge(platform: string) {
  const p = platform?.toLowerCase()
  if (p === "dime") {
    return {
      label: "Dime!",
      className: "bg-[#00D09C]/10 text-[#00D09C] border-[#00D09C]/30",
      dotColor: "#00D09C",
    }
  }
  if (p === "bybit") {
    return {
      label: "Bybit",
      className: "bg-[#181a20] text-zinc-100 border-zinc-700/80 shadow-sm",
      dotColor: "#F7A600",
    }
  }
  if (p === "binance_th" || p === "binance") {
    return {
      label: p === "binance_th" ? "Binance TH" : "Binance",
      className: "bg-[#F0B90B]/10 text-[#FCD535] border-[#F0B90B]/30",
      dotColor: "#F0B90B",
    }
  }
  return {
    label: platform?.toUpperCase() || "-",
    className: "bg-[#1f1f1f] text-white border-white/10",
    dotColor: "#888888",
  }
}

export function MyWealthSectionPage({ section }: { section: Section }) {
  const { toast } = useToast()
  const config = sectionConfig[section]
  const { categories, transactions, investments, quotes, usdThbRate, displayCurrency, setDisplayCurrency, formatMoney, refreshData } = useWealth()

  const money = formatMoney

  const [pending, startTransition] = useTransition()
  const [searchQuery, setSearchQuery] = useState("")
  const [filterMonth, setFilterMonth] = useState("all")
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterPlatform, setFilterPlatform] = useState("all")
  const [filterType, setFilterType] = useState("all")

  // Modals state
  const [editTx, setEditTx] = useState<WealthTransaction | null>(null)
  const [deleteTxId, setDeleteTxId] = useState<string | null>(null)

  const [editInv, setEditInv] = useState<WealthInvestment | null>(null)
  const [closeInv, setCloseInv] = useState<WealthInvestment | null>(null)
  const [deleteInvId, setDeleteInvId] = useState<string | null>(null)

  const [editCat, setEditCat] = useState<WealthCategory | null>(null)
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null)

  // Handlers for Transactions
  const handleSaveTransaction = async (formData: FormData) => {
    if (!editTx) return
    startTransition(async () => {
      try {
        await updateWealthTransaction(editTx.id, {
          type: editTx.type,
          transaction_date: formData.get("transaction_date"),
          amount_thb: formData.get("amount_thb"),
          category_id: formData.get("category_id"),
          merchant_or_payer: formData.get("merchant_or_payer"),
          description: formData.get("description"),
          note: formData.get("note") || undefined,
          payment_status: editTx.type === "expense" ? formData.get("payment_status") : "paid",
        })
        toast({ title: "สำเร็จ", description: "แก้ไขรายการเรียบร้อยแล้ว" })
        setEditTx(null)
        refreshData()
      } catch (err) {
        toast({ title: "เกิดข้อผิดพลาด", description: err instanceof Error ? err.message : "บันทึกไม่สำเร็จ", variant: "destructive" })
      }
    })
  }

  const handleDeleteTransaction = async () => {
    if (!deleteTxId) return
    startTransition(async () => {
      try {
        await deleteWealthTransaction(deleteTxId)
        toast({ title: "สำเร็จ", description: "ลบรายการเรียบร้อยแล้ว" })
        setDeleteTxId(null)
        refreshData()
      } catch (err) {
        toast({ title: "เกิดข้อผิดพลาด", description: err instanceof Error ? err.message : "ลบไม่สำเร็จ", variant: "destructive" })
      }
    })
  }

  const handleMarkPaid = async (id: string) => {
    startTransition(async () => {
      try {
        await markWealthExpensePaid(id)
        toast({ title: "สำเร็จ", description: "บันทึกว่าจ่ายเงินแล้ว" })
        refreshData()
      } catch (err) {
        toast({ title: "เกิดข้อผิดพลาด", description: err instanceof Error ? err.message : "อัปเดตไม่สำเร็จ", variant: "destructive" })
      }
    })
  }

  // Handlers for Investments
  const handleSaveInvestment = async (formData: FormData) => {
    if (!editInv) return
    const quote = String(formData.get("quote_asset") || "THB")
    const isUsd = quote === "USD" || quote === "USDT"
    const rate = usdThbRate > 0 ? usdThbRate : 34.0
    const rawOpened = Number(formData.get("opened_amount") || formData.get("opened_amount_thb") || 0)
    const rawFee = Number(formData.get("entry_fee") || formData.get("entry_fee_thb") || 0)
    const opened_amount_thb = isUsd ? Math.round(rawOpened * rate * 100) / 100 : rawOpened
    const entry_fee_thb = isUsd ? Math.round(rawFee * rate * 100) / 100 : rawFee

    startTransition(async () => {
      try {
        await updateWealthInvestment(editInv.id, {
          platform: formData.get("platform"),
          investment_type: formData.get("investment_type"),
          asset_symbol: formData.get("asset_symbol"),
          quote_asset: quote,
          opened_amount_thb,
          opened_at: formData.get("opened_at"),
          quantity: formData.get("quantity") || undefined,
          entry_price: formData.get("entry_price") || undefined,
          entry_fee_thb,
          deposit_amount: isUsd ? rawOpened : (formData.get("deposit_amount") || undefined),
          note: formData.get("note") || undefined,
          dual_strategy: formData.get("dual_strategy") || undefined,
          deposit_asset: formData.get("deposit_asset") || undefined,
          target_price: formData.get("target_price") || undefined,
          apr_percent: formData.get("apr_percent") || undefined,
          term_days: formData.get("term_days") || undefined,
          settlement_date: formData.get("settlement_date") || undefined,
        })
        toast({ title: "สำเร็จ", description: "แก้ไขรายการลงทุนเรียบร้อยแล้ว" })
        setEditInv(null)
        refreshData()
      } catch (err) {
        toast({ title: "เกิดข้อผิดพลาด", description: err instanceof Error ? err.message : "บันทึกไม่สำเร็จ", variant: "destructive" })
      }
    })
  }

  const handleCloseInvestment = async (formData: FormData) => {
    if (!closeInv) return
    const isUsd = closeInv.quote_asset === "USD" || closeInv.quote_asset === "USDT"
    const rate = usdThbRate > 0 ? usdThbRate : 34.0
    const rawClosed = Number(formData.get("closed_amount") || formData.get("closed_amount_thb") || 0)
    const rawExitFee = Number(formData.get("exit_fee") || formData.get("exit_fee_thb") || 0)
    const closed_amount_thb = isUsd ? Math.round(rawClosed * rate * 100) / 100 : rawClosed
    const exit_fee_thb = isUsd ? Math.round(rawExitFee * rate * 100) / 100 : rawExitFee

    startTransition(async () => {
      try {
        await closeWealthInvestment({
          id: closeInv.id,
          closed_amount_thb,
          closed_at: String(formData.get("closed_at")),
          exit_fee_thb,
          exit_price: formData.get("exit_price") ? Number(formData.get("exit_price")) : undefined,
          settlement_asset: formData.get("settlement_asset") ? String(formData.get("settlement_asset")) : undefined,
          settlement_amount: formData.get("settlement_amount") ? Number(formData.get("settlement_amount")) : undefined,
          interest_amount: formData.get("interest_amount") ? Number(formData.get("interest_amount")) : undefined,
        })
        toast({ title: "สำเร็จ", description: "ปิดดีลการลงทุนเรียบร้อยแล้ว" })
        setCloseInv(null)
        refreshData()
      } catch (err) {
        toast({ title: "เกิดข้อผิดพลาด", description: err instanceof Error ? err.message : "ปิดดีลไม่สำเร็จ", variant: "destructive" })
      }
    })
  }

  const handleCancelInvestment = async (id: string) => {
    startTransition(async () => {
      try {
        await cancelWealthInvestment(id)
        toast({ title: "สำเร็จ", description: "ยกเลิกรายการลงทุนแล้ว" })
        refreshData()
      } catch (err) {
        toast({ title: "เกิดข้อผิดพลาด", description: err instanceof Error ? err.message : "ยกเลิกไม่สำเร็จ", variant: "destructive" })
      }
    })
  }

  const handleDeleteInvestment = async () => {
    if (!deleteInvId) return
    startTransition(async () => {
      try {
        await deleteWealthInvestment(deleteInvId)
        toast({ title: "สำเร็จ", description: "ลบรายการลงทุนเรียบร้อยแล้ว" })
        setDeleteInvId(null)
        refreshData()
      } catch (err) {
        toast({ title: "เกิดข้อผิดพลาด", description: err instanceof Error ? err.message : "ลบไม่สำเร็จ", variant: "destructive" })
      }
    })
  }

  // Handlers for Categories
  const handleSaveCategory = async (formData: FormData) => {
    if (!editCat) return
    startTransition(async () => {
      try {
        await updateWealthCategory(editCat.id, {
          name: String(formData.get("name")),
          color: String(formData.get("color")),
          is_active: formData.get("is_active") === "true",
        })
        toast({ title: "สำเร็จ", description: "แก้ไขหมวดหมู่เรียบร้อยแล้ว" })
        setEditCat(null)
        refreshData()
      } catch (err) {
        toast({ title: "เกิดข้อผิดพลาด", description: err instanceof Error ? err.message : "บันทึกไม่สำเร็จ", variant: "destructive" })
      }
    })
  }

  const handleDeleteCategory = async () => {
    if (!deleteCatId) return
    startTransition(async () => {
      try {
        await deleteWealthCategory(deleteCatId)
        toast({ title: "สำเร็จ", description: "ลบหมวดหมู่เรียบร้อยแล้ว" })
        setDeleteCatId(null)
        refreshData()
      } catch (err) {
        toast({ title: "ไม่สามารถลบได้", description: err instanceof Error ? err.message : "ลบไม่สำเร็จ", variant: "destructive" })
      }
    })
  }

  // 1. Filtered Data for Investments
  const filteredInvestments = useMemo(() => {
    return investments.filter((item) => {
      const matchSearch =
        searchQuery === "" ||
        item.asset_symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.note && item.note.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchMonth = filterMonth === "all" || item.opened_at.startsWith(filterMonth)
      const matchPlatform = filterPlatform === "all" || item.platform === filterPlatform
      const matchType = filterType === "all" || item.investment_type === filterType
      const matchStatus = filterStatus === "all" || item.status === filterStatus
      return matchSearch && matchMonth && matchPlatform && matchType && matchStatus
    })
  }, [investments, searchQuery, filterMonth, filterPlatform, filterType, filterStatus])

  // 2. Filtered Data for Income
  const filteredIncome = useMemo(() => {
    return transactions.filter((item) => {
      if (item.type !== "income") return false
      const matchSearch =
        searchQuery === "" ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.merchant_or_payer && item.merchant_or_payer.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.note && item.note.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchMonth = filterMonth === "all" || item.transaction_date.startsWith(filterMonth)
      const matchCategory = filterCategory === "all" || item.category_id === filterCategory
      return matchSearch && matchMonth && matchCategory
    })
  }, [transactions, searchQuery, filterMonth, filterCategory])

  // 3. Filtered Data for Expenses
  const filteredExpenses = useMemo(() => {
    return transactions.filter((item) => {
      if (item.type !== "expense") return false
      const matchSearch =
        searchQuery === "" ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.merchant_or_payer && item.merchant_or_payer.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.note && item.note.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchMonth = filterMonth === "all" || item.transaction_date.startsWith(filterMonth)
      const matchCategory = filterCategory === "all" || item.category_id === filterCategory
      const matchStatus = filterStatus === "all" || item.payment_status === filterStatus
      return matchSearch && matchMonth && matchCategory && matchStatus
    })
  }, [transactions, searchQuery, filterMonth, filterCategory, filterStatus])

  // 4. Filtered Data for Categories
  const filteredCategories = useMemo(() => {
    return categories.filter((item) => {
      const matchSearch = searchQuery === "" || item.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchType = filterType === "all" || item.type === filterType
      const matchStatus = filterStatus === "all" || (filterStatus === "active" ? item.is_active : !item.is_active)
      return matchSearch && matchType && matchStatus
    })
  }, [categories, searchQuery, filterType, filterStatus])

  // Columns for Investments
  const investmentColumns = useMemo<ColumnDef<WealthInvestment>[]>(() => [
    {
      accessorKey: "asset_symbol",
      header: "สินทรัพย์ / ประเภท",
      cell: ({ row }) => {
        const item = row.original
        const cleanBaseAsset = item.asset_symbol?.replace(/USDT$|THB$/i, "")?.toUpperCase() || ""
        const typeBadge = getInvestmentTypeBadge(item.investment_type)

        return (
          <div className="flex flex-col gap-1 py-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">{item.asset_symbol}</span>
              <Badge className={`text-[10px] font-bold tracking-wider uppercase border px-2 py-0.5 ${typeBadge.className}`}>
                {typeBadge.label}
              </Badge>
              {item.dual_strategy && (
                <Badge
                  className={`text-[10px] font-bold uppercase border px-2 py-0.5 ${
                    item.dual_strategy === "buy_low"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                      : "bg-rose-500/10 text-rose-400 border-rose-500/25"
                  }`}
                >
                  {item.dual_strategy === "buy_low" ? "BUY LOW" : "SELL HIGH"}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-[#b3b3b3]">
              {item.quantity && <span>{Number(item.quantity).toLocaleString()} {cleanBaseAsset}</span>}
              {item.quantity && <span>·</span>}
              <span>เปิด: {formatDateDDMMYYYY(item.opened_at)}</span>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "platform",
      header: "แพลตฟอร์ม",
      cell: ({ row }) => {
        const pConfig = getPlatformBadge(row.original.platform)
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold border ${pConfig.className}`}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: pConfig.dotColor }} />
            <span>{pConfig.label}</span>
          </span>
        )
      },
    },
    {
      accessorKey: "opened_amount_thb",
      header: () => <div className="text-right">เงินลงทุน</div>,
      cell: ({ row }) => {
        const item = row.original
        const isUsdQuote = item.quote_asset === "USD" || item.quote_asset === "USDT"
        const rate = usdThbRate > 0 ? usdThbRate : 34.0
        const prefix = isUsdQuote ? "$" : "฿"

        // Determine native currency amount vs THB based on item's selected currency
        const qty = Number(item.quantity || 0)
        const price = Number(item.entry_price || 0)
        const calculatedUsd = qty > 0 && price > 0 ? qty * price : 0
        const rawOpened = Number(item.opened_amount_thb || 0)
        const deposit = Number(item.deposit_amount || 0)

        let primaryDisplay = ""
        let entryText = ""

        if (isUsdQuote) {
          // Item was selected as USD
          const usdVal = (qty > 0 && price > 0)
            ? calculatedUsd
            : deposit > 0
              ? deposit
              : (rawOpened > 0 ? (rawOpened <= calculatedUsd * 1.5 ? calculatedUsd : rawOpened) : calculatedUsd)
          const thbVal = usdVal * rate
          primaryDisplay = `$${usdVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          entryText = price > 0 ? `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} (≈ ฿${Math.round(thbVal).toLocaleString("th-TH")})` : `≈ ฿${Math.round(thbVal).toLocaleString("th-TH")}`
        } else {
          // Item was selected as THB
          const thbVal = (qty > 0 && price > 0) ? qty * price : (rawOpened > 0 ? rawOpened : 0)
          const usdVal = thbVal / rate
          primaryDisplay = `฿${Math.round(thbVal).toLocaleString("th-TH")}`
          entryText = price > 0 ? `฿${price.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} (≈ $${usdVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : `≈ $${usdVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }

        return (
          <div className="text-right py-1">
            <p className="font-bold text-white tabular-nums">{primaryDisplay}</p>
            <p className="text-[11px] text-[#b3b3b3] tabular-nums">{entryText}</p>
          </div>
        )
      },
    },
    {
      id: "change",
      header: () => <div className="text-right pr-6">การเปลี่ยนแปลง</div>,
      cell: ({ row }) => {
        const item = row.original
        const quote = quotes[item.asset_symbol?.toUpperCase()]
        const isUsdQuote = item.quote_asset === "USD" || item.quote_asset === "USDT"
        const rate = usdThbRate > 0 ? usdThbRate : 34.0
        const prefix = isUsdQuote ? "$" : "฿"

        const qty = Number(item.quantity || 0)
        const price = Number(item.entry_price || 0)
        const calculatedUsd = qty > 0 && price > 0 ? qty * price : 0
        const rawOpened = Number(item.opened_amount_thb || 0)
        const deposit = Number(item.deposit_amount || 0)
        const capitalNative = (qty > 0 && price > 0)
          ? (isUsdQuote ? calculatedUsd : qty * price)
          : isUsdQuote
            ? (deposit > 0 ? deposit : (calculatedUsd > 0 && rawOpened <= calculatedUsd * 1.5) ? calculatedUsd : (rawOpened > 0 ? rawOpened : calculatedUsd))
            : (rawOpened > 0 ? rawOpened : (calculatedUsd > 0 ? calculatedUsd : 0))

        if (item.status === "closed") {
          const rawClosed = Number(item.closed_amount_thb || 0)
          const rawExitFee = Number(item.exit_fee_thb || 0)
          const rawEntryFee = Number(item.entry_fee_thb || 0)
          const pnlThb = rawClosed - rawExitFee - rawOpened - rawEntryFee
          const pnlNative = (qty > 0 && item.exit_price && price > 0 && rawClosed === 0)
            ? (Number(item.exit_price) - price) * qty
            : isUsdQuote ? pnlThb / rate : pnlThb
          const pnlPct = capitalNative > 0 ? (pnlNative / capitalNative) * 100 : 0
          const isProfit = pnlNative >= 0
          const exitPriceStr = item.exit_price ? `${prefix}${Number(item.exit_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : ""

          return (
            <div className="text-right py-1 pr-6">
              <span className={`inline-block font-bold tabular-nums ${isProfit ? "text-emerald-400" : "text-rose-400"}`}>
                {isProfit ? "+" : "-"}{prefix}{Math.abs(pnlNative).toLocaleString(isUsdQuote ? "en-US" : "th-TH", { minimumFractionDigits: isUsdQuote ? 2 : 0, maximumFractionDigits: 2 })}
              </span>
              <p className="text-[11px] tabular-nums">
                {exitPriceStr && <span className="text-[#b3b3b3]">{exitPriceStr} </span>}
                <span className={isProfit ? "text-emerald-400" : "text-rose-400"}>
                  ({isProfit ? "+" : ""}{pnlPct.toFixed(2)}%)
                </span>
              </p>
            </div>
          )
        }

        if (item.status === "open") {
          let currentPrice = quote ? quote.price : null
          if (currentPrice && !isUsdQuote && quote.source !== "fallback") {
            currentPrice = currentPrice * rate
          }
          const hasQuote = currentPrice !== null && price > 0
          if (!hasQuote) {
            return (
              <div className="text-right py-1 pr-6 text-[#b3b3b3] text-[11px]">
                <span>รอราคาตลาด</span>
              </div>
            )
          }

          const pnlPct = ((currentPrice! - price) / price) * 100
          const diffNative = (qty > 0 && price > 0)
            ? (currentPrice! - price) * qty
            : capitalNative * (pnlPct / 100)
          const isProfit = diffNative >= 0
          const currentPriceFormatted = `${prefix}${currentPrice!.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`

          return (
            <div className="text-right py-1 pr-6">
              <span className={`inline-block font-bold tabular-nums ${isProfit ? "text-emerald-400" : "text-rose-400"}`}>
                {isProfit ? "+" : "-"}{prefix}{Math.abs(diffNative).toLocaleString(isUsdQuote ? "en-US" : "th-TH", { minimumFractionDigits: isUsdQuote ? 2 : 0, maximumFractionDigits: 2 })}
              </span>
              <p className="text-[11px] tabular-nums">
                <span className="text-[#b3b3b3]">{currentPriceFormatted} </span>
                <span className={isProfit ? "text-emerald-400" : "text-rose-400"}>
                  ({isProfit ? "+" : ""}{pnlPct.toFixed(2)}%)
                </span>
              </p>
            </div>
          )
        }

        return <div className="text-right py-1 pr-6 text-spotify-muted text-xs">-</div>
      },
    },
    {
      accessorKey: "status",
      header: () => <div className="text-center px-6 min-w-[100px]">สถานะ</div>,
      cell: ({ row }) => {
        const item = row.original
        if (item.status === "closed") {
          return (
            <div className="flex justify-center px-6 min-w-[100px]">
              <Badge className="bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] font-bold uppercase tracking-wide">
                Closed
              </Badge>
            </div>
          )
        }
        if (item.status === "cancelled") {
          return (
            <div className="flex justify-center px-6 min-w-[100px]">
              <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold uppercase tracking-wide">
                Cancelled
              </Badge>
            </div>
          )
        }
        return (
          <div className="flex justify-center px-6 min-w-[100px]">
            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wide">
              Active
            </Badge>
          </div>
        )
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right pl-6">จัดการ</div>,
      cell: ({ row }) => {
        const item = row.original
        return (
          <div className="flex items-center justify-end gap-1 pl-6">
            {item.status === "open" && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10 font-bold"
                  onClick={() => setCloseInv(item)}
                  title="ปิดดีล / รับเงินกลับ"
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1" /> ปิดดีล
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-spotify-muted hover:text-white"
                  onClick={() => setEditInv(item)}
                  title="แก้ไขข้อมูล"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-spotify-muted hover:text-amber-400"
                  onClick={() => handleCancelInvestment(item.id)}
                  title="ยกเลิกรายการ"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-spotify-muted hover:text-[#f3727f]"
              onClick={() => setDeleteInvId(item.id)}
              title="ลบรายการ"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    },
  ], [quotes, usdThbRate, displayCurrency, formatMoney])

  // Columns for Income & Expenses
  const transactionColumns = useMemo<ColumnDef<WealthTransaction>[]>(() => [
    {
      accessorKey: "transaction_date",
      header: "วันที่",
      cell: ({ row }) => <span className="text-spotify-muted font-bold text-xs tabular-nums">{formatDateDDMMYYYY(row.original.transaction_date)}</span>,
    },
    {
      accessorKey: "description",
      header: "รายละเอียด / ผู้จ่าย / ร้านค้า",
      cell: ({ row }) => {
        const item = row.original
        // Clean out any [USD: $...] tag from note when showing
        const cleanNote = item.note ? item.note.replace(/\[USD:\s*\$?[\d.]+\]\s*/g, "").trim() : null
        return (
          <div className="py-1">
            <p className="font-bold text-white text-sm">
              {item.description || item.merchant_or_payer || "ไม่มีรายละเอียด"}
            </p>
            {item.merchant_or_payer && item.description && (
              <p className="text-xs text-spotify-muted">{item.merchant_or_payer}</p>
            )}
            {cleanNote && <p className="text-[11px] text-spotify-muted italic mt-0.5">{cleanNote}</p>}
          </div>
        )
      },
    },
    {
      accessorKey: "category_id",
      header: "หมวดหมู่",
      cell: ({ row }) => {
        const item = row.original
        const cat = categories.find((c) => c.id === item.category_id) || item.wealth_categories
        const name = cat?.name || "ไม่ระบุหมวด"
        const color = cat?.color || "#1ed760"
        return (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold border border-white/5 bg-white/5"
            style={{ color }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            {name}
          </span>
        )
      },
    },
    ...(section === "expenses"
      ? [
          {
            accessorKey: "payment_status",
            header: "สถานะ",
            cell: ({ row }: { row: any }) => {
              const status = row.original.payment_status
              return status === "paid" ? (
                <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold">
                  จ่ายแล้ว
                </Badge>
              ) : (
                <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                  รอจ่าย
                </Badge>
              )
            },
          },
        ]
      : []),
    {
      accessorKey: "amount_thb",
      header: () => <div className="text-right">จำนวนเงิน</div>,
      cell: ({ row }) => {
        const item = row.original
        const isIncome = item.type === "income"
        const rate = usdThbRate > 0 ? usdThbRate : 34.0
        const thbVal = Number(item.amount_thb)

        // Check if item was entered as USD e.g. [USD: $10.00]
        const usdMatch = item.note?.match(/\[USD:\s*\$?([\d.]+)\]/)
        const isUsd = Boolean(usdMatch)
        const usdVal = isUsd ? parseFloat(usdMatch![1]) : thbVal / rate

        const prefixSign = isIncome ? "+" : "-"
        const primaryText = isUsd
          ? `${prefixSign}$${usdVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : `${prefixSign}฿${Math.round(thbVal).toLocaleString("th-TH")}`
        const secondaryText = isUsd
          ? `≈ ฿${Math.round(thbVal).toLocaleString("th-TH")}`
          : `≈ $${usdVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

        return (
          <div className="text-right">
            <span className={`font-black text-sm tabular-nums ${isIncome ? "text-primary" : "text-white"}`}>
              {primaryText}
            </span>
            <p className="text-[11px] text-spotify-muted tabular-nums">{secondaryText}</p>
          </div>
        )
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">จัดการ</div>,
      cell: ({ row }) => {
        const item = row.original
        return (
          <div className="flex items-center justify-end gap-1">
            {item.type === "expense" && item.payment_status === "pending" && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10 font-bold"
                onClick={() => handleMarkPaid(item.id)}
                title="บันทึกว่าจ่ายเงินแล้ว"
              >
                <Check className="h-3.5 w-3.5 mr-1" /> จ่ายแล้ว
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-spotify-muted hover:text-white"
              onClick={() => setEditTx(item)}
              title="แก้ไข"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-spotify-muted hover:text-[#f3727f]"
              onClick={() => setDeleteTxId(item.id)}
              title="ลบ"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    },
  ], [categories, section, usdThbRate, displayCurrency, formatMoney])

  // Columns for Categories
  const categoryColumns = useMemo<ColumnDef<WealthCategory>[]>(() => [
    {
      accessorKey: "name",
      header: "ชื่อหมวดหมู่",
      cell: ({ row }) => {
        const cat = row.original
        const color = cat.color || "#1ed760"
        return (
          <div className="flex items-center gap-2.5 py-1">
            <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: color }} />
            <span className="font-bold text-white text-sm">{cat.name}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "type",
      header: "ประเภท",
      cell: ({ row }) => (
        <Badge
          className={
            row.original.type === "income"
              ? "bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold"
              : "bg-white/10 text-white border border-white/10 text-[10px] font-bold"
          }
        >
          {row.original.type === "income" ? "รายรับ (Income)" : "รายจ่าย (Expense)"}
        </Badge>
      ),
    },
    {
      id: "stats",
      header: "รายการที่ใช้งาน / ยอดเงินรวม",
      cell: ({ row }) => {
        const cat = row.original
        const matchingTx = transactions.filter((t) => t.category_id === cat.id)
        const totalAmount = matchingTx.reduce((sum, t) => sum + Number(t.amount_thb), 0)
        return (
          <span className="text-xs text-spotify-muted font-medium">
            {matchingTx.length} รายการ · <span className="text-white font-bold tabular-nums">{money(totalAmount)}</span>
          </span>
        )
      },
    },
    {
      accessorKey: "is_active",
      header: "สถานะ",
      cell: ({ row }) => (
        <Badge
          className={
            row.original.is_active
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold"
              : "bg-white/5 text-spotify-muted border border-white/10 text-[10px] font-bold"
          }
        >
          {row.original.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">จัดการ</div>,
      cell: ({ row }) => {
        const cat = row.original
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-spotify-muted hover:text-white"
              onClick={() => setEditCat(cat)}
              title="แก้ไขชื่อและสี"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-spotify-muted hover:text-[#f3727f]"
              onClick={() => setDeleteCatId(cat.id)}
              title="ลบหมวดหมู่"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    },
  ], [transactions])

  // Top KPI Metrics for this Section
  const kpiSection = useMemo(() => {
    const rate = usdThbRate > 0 ? usdThbRate : 34.0
    if (section === "investments") {
      const open = investments.filter((i) => i.status === "open")
      const closed = investments.filter((i) => i.status === "closed")
      const openCapital = open.reduce((sum, item) => {
        const isUsd = item.quote_asset === "USD" || item.quote_asset === "USDT"
        const qty = Number(item.quantity || 0)
        const price = Number(item.entry_price || 0)
        const calcUsd = qty > 0 && price > 0 ? qty * price : 0
        const raw = Number(item.opened_amount_thb || 0)
        const deposit = Number(item.deposit_amount || 0)
        if (isUsd) {
          const usdVal = deposit > 0 ? deposit : (calcUsd > 0 && raw <= calcUsd * 1.5) ? calcUsd : (raw > 0 ? raw : calcUsd)
          return sum + (usdVal * rate)
        }
        return sum + raw
      }, 0)
      const realizedPnl = closed.reduce(
        (sum, i) =>
          sum +
          Number(i.closed_amount_thb || 0) -
          Number(i.exit_fee_thb || 0) -
          Number(i.opened_amount_thb || 0) -
          Number(i.entry_fee_thb || 0),
        0
      )
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card-spotify p-5 border border-white/5 bg-[#181818]/60">
            <span className="text-spotify-label">Open Capital (เงินต้นที่เปิดอยู่)</span>
            <p className="text-2xl font-black mt-2 text-white tabular-nums">{money(openCapital)}</p>
            <p className="text-[11px] text-spotify-muted mt-1">{open.length} ดีลที่กำลังถือครอง</p>
          </div>
          <div className="card-spotify p-5 border border-white/5 bg-[#181818]/60">
            <span className="text-spotify-label">Realized P&L (ปิดดีลแล้ว)</span>
            <p className={`text-2xl font-black mt-2 tabular-nums ${realizedPnl >= 0 ? "text-primary" : "text-[#f3727f]"}`}>
              {realizedPnl >= 0 ? "+" : ""}{money(realizedPnl)}
            </p>
            <p className="text-[11px] text-spotify-muted mt-1">{closed.length} ดีลที่ปิดทำกำไร/ขาดทุน</p>
          </div>
          <div className="card-spotify p-5 border border-white/5 bg-[#181818]/60">
            <span className="text-spotify-label">อัตราแลกเปลี่ยนปัจจุบัน</span>
            <p className="text-2xl font-black mt-2 text-sky-400 tabular-nums">฿{rate.toFixed(2)}</p>
            <p className="text-[11px] text-spotify-muted mt-1">1 USD = ฿{rate.toFixed(2)} THB</p>
          </div>
          <div className="card-spotify p-5 border border-white/5 bg-[#181818]/60">
            <span className="text-spotify-label">แพลตฟอร์มที่เชื่อมต่อ</span>
            <p className="text-2xl font-black mt-2 text-white tabular-nums">3 แพลตฟอร์ม</p>
            <p className="text-[11px] text-spotify-muted mt-1">Dime · Bybit · Binance TH</p>
          </div>
        </div>
      )
    }

    if (section === "income") {
      const incomeTx = transactions.filter((t) => t.type === "income")
      const totalIncome = incomeTx.reduce((sum, t) => sum + Number(t.amount_thb), 0)
      return (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card-spotify p-5 border border-white/5 bg-[#181818]/60">
            <span className="text-spotify-label">รายรับสะสมทั้งหมด</span>
            <p className="text-2xl font-black mt-2 text-primary tabular-nums">+{money(totalIncome)}</p>
            <p className="text-[11px] text-spotify-muted mt-1">{incomeTx.length} รายการรับ</p>
          </div>
          <div className="card-spotify p-5 border border-white/5 bg-[#181818]/60">
            <span className="text-spotify-label">เฉลี่ยต่อรายการ</span>
            <p className="text-2xl font-black mt-2 text-white tabular-nums">
              {money(incomeTx.length > 0 ? totalIncome / incomeTx.length : 0)}
            </p>
            <p className="text-[11px] text-spotify-muted mt-1">ยอดเงินเฉลี่ย</p>
          </div>
          <div className="card-spotify p-5 border border-white/5 bg-[#181818]/60">
            <span className="text-spotify-label">หมวดหมู่รายรับ</span>
            <p className="text-2xl font-black mt-2 text-white tabular-nums">
              {categories.filter((c) => c.type === "income" && c.is_active).length} หมวด
            </p>
            <p className="text-[11px] text-spotify-muted mt-1">ที่เปิดใช้งานอยู่</p>
          </div>
        </div>
      )
    }

    if (section === "expenses") {
      const expenseTx = transactions.filter((t) => t.type === "expense")
      const paid = expenseTx.filter((t) => t.payment_status === "paid")
      const pendingList = expenseTx.filter((t) => t.payment_status === "pending")
      const totalPaid = paid.reduce((sum, t) => sum + Number(t.amount_thb), 0)
      const totalPending = pendingList.reduce((sum, t) => sum + Number(t.amount_thb), 0)
      return (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card-spotify p-5 border border-white/5 bg-[#181818]/60">
            <span className="text-spotify-label">จ่ายแล้ว (Paid Expenses)</span>
            <p className="text-2xl font-black mt-2 text-white tabular-nums">-{money(totalPaid)}</p>
            <p className="text-[11px] text-spotify-muted mt-1">{paid.length} รายการที่ชำระเรียบร้อย</p>
          </div>
          <div className="card-spotify p-5 border border-white/5 bg-[#181818]/60">
            <span className="text-spotify-label">รอจ่าย (Pending Expenses)</span>
            <p className={`text-2xl font-black mt-2 tabular-nums ${totalPending > 0 ? "text-amber-400" : "text-white"}`}>
              {money(totalPending)}
            </p>
            <p className="text-[11px] text-spotify-muted mt-1">{pendingList.length} บิลที่ต้องชำระ</p>
          </div>
          <div className="card-spotify p-5 border border-white/5 bg-[#181818]/60">
            <span className="text-spotify-label">ยอดรวมค่าใช้จ่ายทั้งหมด</span>
            <p className="text-2xl font-black mt-2 text-[#f3727f] tabular-nums">-{money(totalPaid + totalPending)}</p>
            <p className="text-[11px] text-spotify-muted mt-1">{expenseTx.length} รายการทั้งหมด</p>
          </div>
        </div>
      )
    }

    if (section === "categories") {
      const activeIncome = categories.filter((c) => c.type === "income" && c.is_active).length
      const activeExpense = categories.filter((c) => c.type === "expense" && c.is_active).length
      const inactive = categories.filter((c) => !c.is_active).length
      return (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card-spotify p-5 border border-white/5 bg-[#181818]/60">
            <span className="text-spotify-label">หมวดหมู่รายรับ</span>
            <p className="text-2xl font-black mt-2 text-primary tabular-nums">{activeIncome} หมวด</p>
            <p className="text-[11px] text-spotify-muted mt-1">เปิดใช้งาน</p>
          </div>
          <div className="card-spotify p-5 border border-white/5 bg-[#181818]/60">
            <span className="text-spotify-label">หมวดหมู่รายจ่าย</span>
            <p className="text-2xl font-black mt-2 text-white tabular-nums">{activeExpense} หมวด</p>
            <p className="text-[11px] text-spotify-muted mt-1">เปิดใช้งาน</p>
          </div>
          <div className="card-spotify p-5 border border-white/5 bg-[#181818]/60">
            <span className="text-spotify-label">ปิดใช้งาน (Archived)</span>
            <p className="text-2xl font-black mt-2 text-spotify-muted tabular-nums">{inactive} หมวด</p>
            <p className="text-[11px] text-spotify-muted mt-1">สามารถเปิดกลับมาได้</p>
          </div>
        </div>
      )
    }

    return null
  }, [section, investments, transactions, categories, usdThbRate, displayCurrency, formatMoney])

  const fieldClass =
    "h-9 rounded-lg border border-white/10 bg-[#181818] px-3 text-xs text-white shadow-inner outline-none transition placeholder:text-white/35 hover:border-white/20 focus:border-primary focus:ring-1 focus:ring-primary/20"

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`My Wealth · ${config.eyebrow}`}
        title={config.title}
        description={config.description}
        action={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <WealthApiStatus showRate={section === "investments"} />
            {section === "investments" && (
              <div className="flex items-center rounded-xl border border-white/10 bg-[#121212]/90 p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setDisplayCurrency("THB")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-black transition-all ${
                    displayCurrency === "THB" ? "bg-primary text-black shadow-play" : "text-spotify-muted hover:text-white"
                  }`}
                >
                  THB
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayCurrency("USD")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-black transition-all ${
                    displayCurrency === "USD" ? "bg-primary text-black shadow-play" : "text-spotify-muted hover:text-white"
                  }`}
                >
                  USD
                </button>
              </div>
            )}
            <MyWealthQuickActions allowedModes={[config.mode]} />
          </div>
        }
      />

      {/* KPI Cards Row */}
      {kpiSection}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-[#181818]/50 p-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-spotify-muted" />
          <input
            type="text"
            placeholder={`ค้นหาใน ${config.title}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="spotify-input pl-9 h-9 text-xs w-full"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month Filter (for investments, income, expenses) */}
          {section !== "categories" && (
            <input
              type="month"
              value={filterMonth === "all" ? "" : filterMonth}
              onChange={(e) => setFilterMonth(e.target.value || "all")}
              placeholder="ทุกลำดับเดือน"
              className="spotify-input h-9 py-1 px-3 text-xs w-36"
            />
          )}

          {/* Investments Filters */}
          {section === "investments" && (
            <>
              <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                <SelectTrigger className="h-9 w-28 bg-[#1f1f1f] border-white/10 text-xs text-white">
                  <SelectValue placeholder="แพลตฟอร์ม" />
                </SelectTrigger>
                <SelectContent className="bg-[#1f1f1f] border-white/10 text-white">
                  <SelectItem value="all">ทุกแพลตฟอร์ม</SelectItem>
                  <SelectItem value="dime">Dime</SelectItem>
                  <SelectItem value="bybit">Bybit</SelectItem>
                  <SelectItem value="binance_th">Binance TH</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 w-28 bg-[#1f1f1f] border-white/10 text-xs text-white">
                  <SelectValue placeholder="สถานะ" />
                </SelectTrigger>
                <SelectContent className="bg-[#1f1f1f] border-white/10 text-white">
                  <SelectItem value="all">ทุกสถานะ</SelectItem>
                  <SelectItem value="open">Active</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}

          {/* Expenses Filters */}
          {section === "expenses" && (
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9 w-28 bg-[#1f1f1f] border-white/10 text-xs text-white">
                <SelectValue placeholder="สถานะ" />
              </SelectTrigger>
              <SelectContent className="bg-[#1f1f1f] border-white/10 text-white">
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="paid">จ่ายแล้ว</SelectItem>
                <SelectItem value="pending">รอจ่าย</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Category Filter for Income / Expenses */}
          {(section === "income" || section === "expenses") && (
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-9 w-32 bg-[#1f1f1f] border-white/10 text-xs text-white">
                <SelectValue placeholder="หมวดหมู่" />
              </SelectTrigger>
              <SelectContent className="bg-[#1f1f1f] border-white/10 text-white">
                <SelectItem value="all">ทุกหมวดหมู่</SelectItem>
                {categories
                  .filter((c) => c.type === (section === "income" ? "income" : "expense"))
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}

          {/* Categories Filters */}
          {section === "categories" && (
            <>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-9 w-28 bg-[#1f1f1f] border-white/10 text-xs text-white">
                  <SelectValue placeholder="ประเภท" />
                </SelectTrigger>
                <SelectContent className="bg-[#1f1f1f] border-white/10 text-white">
                  <SelectItem value="all">ทุกประเภท</SelectItem>
                  <SelectItem value="income">รายรับ</SelectItem>
                  <SelectItem value="expense">รายจ่าย</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 w-28 bg-[#1f1f1f] border-white/10 text-xs text-white">
                  <SelectValue placeholder="สถานะ" />
                </SelectTrigger>
                <SelectContent className="bg-[#1f1f1f] border-white/10 text-white">
                  <SelectItem value="all">ทุกสถานะ</SelectItem>
                  <SelectItem value="active">เปิดใช้งาน</SelectItem>
                  <SelectItem value="inactive">ปิดใช้งาน</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}

          {(searchQuery || filterMonth !== "all" || filterCategory !== "all" || filterStatus !== "all" || filterPlatform !== "all" || filterType !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("")
                setFilterMonth("all")
                setFilterCategory("all")
                setFilterStatus("all")
                setFilterPlatform("all")
                setFilterType("all")
              }}
              className="h-9 px-2.5 text-xs text-spotify-muted hover:text-white"
            >
              ล้างตัวกรอง
            </Button>
          )}
        </div>
      </div>

      {/* Main ReusableDataTable */}
      {section === "investments" && (
        <ReusableDataTable
          columns={investmentColumns}
          data={filteredInvestments}
          manualPagination={false}
          pageSize={10}
        />
      )}

      {section === "income" && (
        <ReusableDataTable
          columns={transactionColumns}
          data={filteredIncome}
          manualPagination={false}
          pageSize={10}
        />
      )}

      {section === "expenses" && (
        <ReusableDataTable
          columns={transactionColumns}
          data={filteredExpenses}
          manualPagination={false}
          pageSize={10}
        />
      )}

      {section === "categories" && (
        <ReusableDataTable
          columns={categoryColumns}
          data={filteredCategories}
          manualPagination={false}
          pageSize={10}
        />
      )}

      {/* MODAL: Edit Transaction */}
      <Dialog open={!!editTx} onOpenChange={(open) => !open && setEditTx(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto p-6 bg-[#121212] border border-white/10 text-white">
          <DialogHeader className="border-b border-white/10 pb-4">
            <DialogTitle className="text-xl font-bold">
              แก้ไข{editTx?.type === "income" ? "รายรับ" : "รายจ่าย"}
            </DialogTitle>
            <DialogDescription className="text-spotify-muted text-xs">
              แก้ไขข้อมูลและกดบันทึก
            </DialogDescription>
          </DialogHeader>
          {editTx && (
            <form action={handleSaveTransaction} className="grid gap-4 pt-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-spotify-muted font-bold">วันที่</label>
                <DatePicker name="transaction_date" required defaultValue={editTx.transaction_date} className={fieldClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-spotify-muted font-bold">จำนวนเงิน (บาท)</label>
                <input type="number" name="amount_thb" required min="0.01" step="0.01" defaultValue={String(editTx.amount_thb)} className={fieldClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-spotify-muted font-bold">หมวดหมู่</label>
                <Select name="category_id" defaultValue={editTx.category_id}>
                  <SelectTrigger className={fieldClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1f1f1f] border-white/10 text-white">
                    {categories
                      .filter((c) => c.type === editTx.type)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-spotify-muted font-bold">
                  {editTx.type === "income" ? "ผู้จ่าย / แหล่งที่มา" : "ร้านค้า / ผู้รับเงิน"}
                </label>
                <input name="merchant_or_payer" defaultValue={editTx.merchant_or_payer || ""} className={fieldClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-spotify-muted font-bold">รายละเอียด</label>
                <input name="description" defaultValue={editTx.description || ""} className={fieldClass} />
              </div>
              {editTx.type === "expense" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-spotify-muted font-bold">สถานะ</label>
                  <Select name="payment_status" defaultValue={editTx.payment_status}>
                    <SelectTrigger className={fieldClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1f1f1f] border-white/10 text-white">
                      <SelectItem value="paid">จ่ายแล้ว (Paid)</SelectItem>
                      <SelectItem value="pending">รอจ่าย (Pending)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-spotify-muted font-bold">บันทึกช่วยจำ</label>
                <input name="note" defaultValue={editTx.note || ""} className={fieldClass} />
              </div>
              <DialogFooter className="mt-4 border-t border-white/10 pt-4">
                <Button type="button" variant="ghost" onClick={() => setEditTx(null)}>
                  ยกเลิก
                </Button>
                <Button type="submit" className="btn-pill-primary" disabled={pending}>
                  {pending ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL: Close Investment Deal */}
      <Dialog open={!!closeInv} onOpenChange={(open) => !open && setCloseInv(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto p-6 bg-[#121212] border border-white/10 text-white">
          <DialogHeader className="border-b border-white/10 pb-4">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              ปิดดีลการลงทุน · {closeInv?.asset_symbol}
            </DialogTitle>
            <DialogDescription className="text-spotify-muted text-xs">
              บันทึกยอดเงินที่รับกลับจากการปิดโพซิชันนี้เพื่อคำนวณกำไร/ขาดทุน
            </DialogDescription>
          </DialogHeader>
          {closeInv && (() => {
            const isUsd = closeInv.quote_asset === "USD" || closeInv.quote_asset === "USDT"
            const rate = usdThbRate > 0 ? usdThbRate : 34.0
            const qty = Number(closeInv.quantity || 0)
            const price = Number(closeInv.entry_price || 0)
            const calculatedUsd = qty > 0 && price > 0 ? qty * price : 0
            const rawOpened = Number(closeInv.opened_amount_thb || 0)
            const deposit = Number(closeInv.deposit_amount || 0)
            const invUsd = deposit > 0 ? deposit : (calculatedUsd > 0 && rawOpened <= calculatedUsd * 1.5) ? calculatedUsd : (rawOpened > 0 ? rawOpened : calculatedUsd)
            const invThb = isUsd ? invUsd * rate : rawOpened
            const currencyCode = isUsd ? "USD" : "THB"
            const currencySymbol = isUsd ? "$" : "฿"

            return (
              <form action={handleCloseInvestment} className="grid gap-4 pt-4">
                <div className="rounded-lg bg-white/5 p-3 text-xs text-spotify-muted space-y-1">
                  <p>
                    เงินต้นที่ลงทุน:{" "}
                    <span className="text-white font-bold">
                      {isUsd
                        ? `$${invUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (≈ ฿${Math.round(invThb).toLocaleString("th-TH")})`
                        : `฿${Math.round(invThb).toLocaleString("th-TH")}`}
                    </span>
                  </p>
                  <p>
                    แพลตฟอร์ม: <span className="text-white font-bold uppercase">{closeInv.platform}</span> ({currencyCode})
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-spotify-muted font-bold">ยอดเงินรับกลับ ({currencyCode}) *</label>
                  <input
                    type="number"
                    name="closed_amount"
                    required
                    min="0.01"
                    step="any"
                    placeholder={`${currencySymbol} 0.00`}
                    className={fieldClass}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-spotify-muted font-bold">วันที่ปิดดีล *</label>
                  <DatePicker
                    name="closed_at"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className={fieldClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-spotify-muted font-bold">ค่าธรรมเนียมปิด ({currencyCode})</label>
                    <input type="number" name="exit_fee" min="0" step="any" defaultValue="0" className={fieldClass} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-spotify-muted font-bold">ราคาออก ({currencyCode})</label>
                    <input type="number" name="exit_price" min="0" step="any" placeholder="ราคาขาย" className={fieldClass} />
                  </div>
                </div>

                {closeInv.investment_type === "dual_asset" && (
                  <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-spotify-muted">เหรียญที่ได้</label>
                      <input name="settlement_asset" placeholder="เช่น USDT" className={fieldClass} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-spotify-muted">จำนวนที่ได้</label>
                      <input type="number" name="settlement_amount" step="any" className={fieldClass} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-spotify-muted">ดอกเบี้ย</label>
                      <input type="number" name="interest_amount" step="any" className={fieldClass} />
                    </div>
                  </div>
                )}

                <DialogFooter className="mt-4 border-t border-white/10 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setCloseInv(null)}>
                    ยกเลิก
                  </Button>
                  <Button type="submit" className="btn-pill-primary" disabled={pending}>
                    {pending ? "กำลังบันทึก..." : "ยืนยันการปิดดีล"}
                  </Button>
                </DialogFooter>
              </form>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* MODAL: Edit Investment */}
      <Dialog open={!!editInv} onOpenChange={(open) => !open && setEditInv(null)}>
        <DialogContent className="max-h-[88vh] max-w-lg overflow-hidden p-0 bg-[#121212] border border-white/10 text-white flex flex-col">
          <DialogHeader className="p-5 pb-3 border-b border-white/10 shrink-0">
            <DialogTitle className="text-lg font-bold">แก้ไขการลงทุน · {editInv?.asset_symbol}</DialogTitle>
            <DialogDescription className="text-spotify-muted text-xs">
              แก้ไขข้อมูลการลงทุน
            </DialogDescription>
          </DialogHeader>
          {editInv && (() => {
            const isUsd = editInv.quote_asset === "USD" || editInv.quote_asset === "USDT"
            const qty = Number(editInv.quantity || 0)
            const price = Number(editInv.entry_price || 0)
            const calculatedUsd = qty > 0 && price > 0 ? qty * price : 0
            const rawOpened = Number(editInv.opened_amount_thb || 0)
            const deposit = Number(editInv.deposit_amount || 0)
            const editVal = isUsd
              ? (deposit > 0 ? deposit : (calculatedUsd > 0 && rawOpened <= calculatedUsd * 1.5) ? calculatedUsd : (rawOpened > 0 ? rawOpened : calculatedUsd))
              : rawOpened
            const curr = isUsd ? "USD" : "THB"

            return (
              <form action={handleSaveInvestment} className="flex flex-col flex-1 overflow-hidden">
                <div className="overflow-y-auto px-5 py-3.5 flex-1">
                  <div className="grid gap-2.5 md:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-spotify-muted font-bold">แพลตฟอร์ม</label>
                      <Select name="platform" defaultValue={editInv.platform}>
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
                      <label className="text-[11px] text-spotify-muted font-bold">ประเภท</label>
                      <Select name="investment_type" defaultValue={editInv.investment_type}>
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
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-spotify-muted font-bold">สัญลักษณ์</label>
                      <input name="asset_symbol" required defaultValue={editInv.asset_symbol} className={fieldClass} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-spotify-muted font-bold">สกุลเงิน (Currency)</label>
                      <Select name="quote_asset" defaultValue={editInv.quote_asset === "USDT" ? "USD" : (editInv.quote_asset || "THB")}>
                        <SelectTrigger className={fieldClass}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1f1f1f] border-white/10 text-white">
                          <SelectItem value="THB">THB</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-spotify-muted font-bold">เงินลงทุน ({curr})</label>
                      <input type="number" name="opened_amount" required min="0.01" step="any" defaultValue={String(editVal)} className={fieldClass} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-spotify-muted font-bold">วันที่เปิด</label>
                      <DatePicker name="opened_at" required defaultValue={editInv.opened_at} className={fieldClass} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-spotify-muted font-bold">จำนวน</label>
                      <input type="number" name="quantity" step="any" defaultValue={String(editInv.quantity || "")} className={fieldClass} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-spotify-muted font-bold">ราคาเข้า</label>
                      <input type="number" name="entry_price" step="any" defaultValue={String(editInv.entry_price || "")} className={fieldClass} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-spotify-muted font-bold">ค่าธรรมเนียม ({curr})</label>
                      <input type="number" name="entry_fee" min="0" step="any" defaultValue={String(editInv.entry_fee_thb || 0)} className={fieldClass} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-spotify-muted font-bold">บันทึก</label>
                      <input name="note" defaultValue={editInv.note || ""} className={fieldClass} />
                    </div>
                  </div>
                </div>
                <DialogFooter className="p-3.5 border-t border-white/10 bg-[#181818]/90 shrink-0 flex items-center justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setEditInv(null)}>
                    ยกเลิก
                  </Button>
                  <Button type="submit" className="btn-pill-primary" disabled={pending}>
                    {pending ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                  </Button>
                </DialogFooter>
              </form>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* MODAL: Edit Category */}
      <Dialog open={!!editCat} onOpenChange={(open) => !open && setEditCat(null)}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto p-6 bg-[#121212] border border-white/10 text-white">
          <DialogHeader className="border-b border-white/10 pb-4">
            <DialogTitle className="text-xl font-bold">แก้ไขหมวดหมู่</DialogTitle>
            <DialogDescription className="text-spotify-muted text-xs">
              เปลี่ยนชื่อ สี หรือเปิด/ปิดการใช้งานหมวดนี้
            </DialogDescription>
          </DialogHeader>
          {editCat && (
            <form action={handleSaveCategory} className="grid gap-4 pt-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-spotify-muted font-bold">ชื่อหมวดหมู่</label>
                <input name="name" required defaultValue={editCat.name} className={fieldClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-spotify-muted font-bold">สถานะการใช้งาน</label>
                <Select name="is_active" defaultValue={editCat.is_active ? "true" : "false"}>
                  <SelectTrigger className={fieldClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1f1f1f] border-white/10 text-white">
                    <SelectItem value="true">เปิดใช้งาน (Active)</SelectItem>
                    <SelectItem value="false">ปิดใช้งาน (Archived)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-spotify-muted font-bold">สีหมวดหมู่</label>
                <input type="hidden" name="color" id="cat-color-input" defaultValue={editCat.color || CATEGORY_COLORS[0]} />
                <div className="flex flex-wrap gap-2 pt-1">
                  {CATEGORY_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        const el = document.getElementById("cat-color-input") as HTMLInputElement
                        if (el) el.value = c
                        setEditCat({ ...editCat, color: c })
                      }}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        (editCat.color || CATEGORY_COLORS[0]) === c ? "ring-2 ring-white scale-110" : "opacity-80 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <DialogFooter className="mt-4 border-t border-white/10 pt-4">
                <Button type="button" variant="ghost" onClick={() => setEditCat(null)}>
                  ยกเลิก
                </Button>
                <Button type="submit" className="btn-pill-primary" disabled={pending}>
                  {pending ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* CONFIRM: Delete Transaction Dialog */}
      <Dialog open={!!deleteTxId} onOpenChange={(open) => !open && setDeleteTxId(null)}>
        <DialogContent className="sm:max-w-sm bg-[#121212] border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>ลบรายการนี้?</DialogTitle>
            <DialogDescription className="text-spotify-muted">
              การดำเนินการนี้ไม่สามารถย้อนกลับได้ ข้อมูลรายการนี้จะถูกลบออกจากระบบ
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setDeleteTxId(null)}>
              ยกเลิก
            </Button>
            <Button variant="destructive" onClick={handleDeleteTransaction} disabled={pending}>
              {pending ? "กำลังลบ..." : "ลบรายการ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM: Delete Investment Dialog */}
      <Dialog open={!!deleteInvId} onOpenChange={(open) => !open && setDeleteInvId(null)}>
        <DialogContent className="sm:max-w-sm bg-[#121212] border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>ลบรายการลงทุนนี้?</DialogTitle>
            <DialogDescription className="text-spotify-muted">
              การดำเนินการนี้ไม่สามารถย้อนกลับได้ ข้อมูลการลงทุนนี้จะถูกลบออกจากระบบ
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setDeleteInvId(null)}>
              ยกเลิก
            </Button>
            <Button variant="destructive" onClick={handleDeleteInvestment} disabled={pending}>
              {pending ? "กำลังลบ..." : "ลบรายการลงทุน"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM: Delete Category Dialog */}
      <Dialog open={!!deleteCatId} onOpenChange={(open) => !open && setDeleteCatId(null)}>
        <DialogContent className="sm:max-w-sm bg-[#121212] border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>ลบหมวดหมู่นี้?</DialogTitle>
            <DialogDescription className="text-spotify-muted">
              หากมีรายการที่ใช้หมวดนี้อยู่ ระบบจะไม่อนุญาตให้ลบเพื่อป้องกันข้อมูลประวัติเสียหาย
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setDeleteCatId(null)}>
              ยกเลิก
            </Button>
            <Button variant="destructive" onClick={handleDeleteCategory} disabled={pending}>
              {pending ? "กำลังลบ..." : "ลบหมวดหมู่"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

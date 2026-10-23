"use client"

import { useState, useMemo, useTransition } from "react"
import { useSearchParams } from "next/navigation"
import {
  WalletCards,
  Search,
  Check,
  Edit,
  Trash2,
  FolderCog,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Wallet,
} from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"
import { PageHeader } from "@/components/ui/page-header"
import { ReusableDataTable } from "@/components/ui/reusable-data-table"
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
import { CategoryManagerDialog } from "@/components/my-wealth/category-manager-dialog"
import { useWealth, WealthTransaction } from "@/components/my-wealth/wealth-context"
import {
  markWealthExpensePaid,
  deleteWealthTransaction,
  updateWealthTransaction,
} from "@/app/dashboard/my-wealth/actions"

export function TransactionsView({
  initialFilter = "all",
  initialManageCategories = false,
}: {
  initialFilter?: "all" | "income" | "expenses" | "pending"
  initialManageCategories?: boolean
}) {
  const searchParams = useSearchParams()
  const urlFilter = searchParams?.get("filter") || searchParams?.get("type")
  const defaultTab =
    urlFilter === "income"
      ? "income"
      : urlFilter === "expense" || urlFilter === "expenses"
      ? "expenses"
      : urlFilter === "pending"
      ? "pending"
      : initialFilter

  const { toast } = useToast()
  const { categories, transactions, usdThbRate, displayCurrency, formatMoney, refreshData } = useWealth()
  const money = formatMoney
  const [pending, startTransition] = useTransition()

  // State
  const [activeTab, setActiveTab] = useState<"all" | "income" | "expenses" | "pending">(defaultTab)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterMonth, setFilterMonth] = useState("all")
  const [filterCategory, setFilterCategory] = useState("all")
  const [showCategoryManager, setShowCategoryManager] = useState(initialManageCategories)

  // Modals
  const [editTx, setEditTx] = useState<WealthTransaction | null>(null)
  const [editCurrency, setEditCurrency] = useState<"THB" | "USD">("THB")
  const [editAmount, setEditAmount] = useState<string>("")
  const [deleteTxId, setDeleteTxId] = useState<string | null>(null)

  const rate = usdThbRate > 0 ? usdThbRate : 34.0
  const today = new Date().toISOString().slice(0, 10)

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((item) => {
      // Tab filter
      if (activeTab === "income" && item.type !== "income") return false
      if (activeTab === "expenses" && (item.type !== "expense" || item.payment_status !== "paid")) return false
      if (activeTab === "pending" && (item.type !== "expense" || item.payment_status !== "pending")) return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchDesc = item.description?.toLowerCase().includes(q)
        const matchMerchant = item.merchant_or_payer?.toLowerCase().includes(q)
        const matchNote = item.note?.toLowerCase().includes(q)
        const matchAmount = String(item.amount_thb).includes(q)
        const cat = categories.find((c) => c.id === item.category_id)
        const matchCat = cat?.name?.toLowerCase().includes(q)
        if (!matchDesc && !matchMerchant && !matchNote && !matchAmount && !matchCat) return false
      }

      // Month filter
      if (filterMonth !== "all" && !item.transaction_date.startsWith(filterMonth)) {
        return false
      }

      // Category filter
      if (filterCategory !== "all" && item.category_id !== filterCategory) {
        return false
      }

      return true
    })
  }, [transactions, activeTab, searchQuery, filterMonth, filterCategory, categories])

  // Summary KPIs for current month / filter
  const currentMonthTransactions = useMemo(() => {
    return transactions.filter((item) => {
      if (filterMonth === "all") return true
      return item.transaction_date.startsWith(filterMonth)
    })
  }, [transactions, filterMonth])

  const totalIncome = useMemo(
    () => currentMonthTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + Number(t.amount_thb), 0),
    [currentMonthTransactions]
  )

  const totalPaidExpenses = useMemo(
    () =>
      currentMonthTransactions
        .filter((t) => t.type === "expense" && t.payment_status === "paid")
        .reduce((sum, t) => sum + Number(t.amount_thb), 0),
    [currentMonthTransactions]
  )

  const totalPendingExpenses = useMemo(
    () =>
      currentMonthTransactions
        .filter((t) => t.type === "expense" && t.payment_status === "pending")
        .reduce((sum, t) => sum + Number(t.amount_thb), 0),
    [currentMonthTransactions]
  )

  const netCash = totalIncome - totalPaidExpenses
  const pendingCount = transactions.filter((t) => t.type === "expense" && t.payment_status === "pending").length

  // Handlers
  const handleStartEdit = (tx: WealthTransaction) => {
    setEditTx(tx)
    const usdMatch = tx.note?.match(/\[USD:\s*\$?([\d.]+)\]/)
    if (usdMatch) {
      setEditCurrency("USD")
      setEditAmount(usdMatch[1])
    } else {
      setEditCurrency("THB")
      setEditAmount(String(tx.amount_thb))
    }
  }

  const handleSaveTransaction = async (formData: FormData) => {
    if (!editTx) return
    startTransition(async () => {
      try {
        const rawAmount = parseFloat(editAmount || String(formData.get("amount") || editTx.amount_thb))
        const finalThb = editCurrency === "USD" ? Math.round(rawAmount * rate * 100) / 100 : rawAmount
        const originalNote = formData.get("note") ? String(formData.get("note")).replace(/\[USD:\s*\$?[\d.]+\]\s*/g, "").trim() : ""
        const finalNote = editCurrency === "USD" ? `[USD: $${rawAmount.toFixed(2)}] ${originalNote}`.trim() : (originalNote || undefined)

        await updateWealthTransaction(editTx.id, {
          type: editTx.type,
          transaction_date: formData.get("transaction_date"),
          amount_thb: finalThb,
          category_id: formData.get("category_id"),
          merchant_or_payer: formData.get("merchant_or_payer"),
          description: formData.get("description"),
          note: finalNote,
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
        await markWealthExpensePaid(id, today)
        toast({ title: "สำเร็จ", description: "บันทึกว่าจ่ายเงินแล้ว ณ วันนี้" })
        refreshData()
      } catch (err) {
        toast({ title: "เกิดข้อผิดพลาด", description: err instanceof Error ? err.message : "อัปเดตไม่สำเร็จ", variant: "destructive" })
      }
    })
  }

  // Table Columns
  const columns = useMemo<ColumnDef<WealthTransaction>[]>(
    () => [
      {
        accessorKey: "transaction_date",
        header: "วันที่",
        cell: ({ row }) => (
          <span className="text-spotify-muted font-bold text-xs tabular-nums whitespace-nowrap">
            {formatDateDDMMYYYY(row.original.transaction_date)}
          </span>
        ),
      },
      {
        accessorKey: "type",
        header: "ประเภท",
        cell: ({ row }) => {
          const item = row.original
          if (item.type === "income") {
            return (
              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                <ArrowUpRight className="w-3 h-3 mr-0.5" /> รายรับ
              </Badge>
            )
          }
          if (item.payment_status === "pending") {
            return (
              <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                <Clock className="w-3 h-3 mr-0.5" /> รอจ่าย
              </Badge>
            )
          }
          return (
            <Badge className="bg-destructive/10 text-destructive border border-destructive/20 text-[10px] font-bold">
              <ArrowDownRight className="w-3 h-3 mr-0.5" /> จ่ายแล้ว
            </Badge>
          )
        },
      },
      {
        accessorKey: "description",
        header: "รายละเอียด / ผู้จ่าย / ร้านค้า",
        cell: ({ row }) => {
          const item = row.original
          const cleanNote = item.note ? item.note.replace(/\[USD:\s*\$?[\d.]+\]\s*/g, "").trim() : null
          return (
            <div className="py-1 max-w-[240px] sm:max-w-[320px] whitespace-normal break-words">
              <p className="font-bold text-white text-sm">
                {item.description || item.merchant_or_payer || "ไม่มีรายละเอียด"}
              </p>
              {item.merchant_or_payer && item.description && (
                <p className="text-xs text-spotify-muted mt-0.5">{item.merchant_or_payer}</p>
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
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold border border-white/5 bg-white/5 whitespace-nowrap"
              style={{ color }}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              {name}
            </span>
          )
        },
      },
      {
        accessorKey: "amount_thb",
        header: () => <div className="text-right">จำนวนเงิน</div>,
        cell: ({ row }) => {
          const item = row.original
          const isIncome = item.type === "income"
          const thbVal = Number(item.amount_thb)

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
            <div className="text-right whitespace-nowrap">
              <span
                className={`font-black text-sm tabular-nums ${
                  isIncome
                    ? "text-primary"
                    : item.payment_status === "pending"
                    ? "text-amber-400"
                    : "text-white"
                }`}
              >
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
            <div className="flex items-center justify-end gap-1 whitespace-nowrap">
              {item.type === "expense" && item.payment_status === "pending" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10 font-bold"
                  onClick={() => handleMarkPaid(item.id)}
                  title="บันทึกว่าจ่ายเงินแล้ว ณ วันนี้"
                >
                  <Check className="h-3.5 w-3.5 mr-1" /> จ่ายแล้ว
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-spotify-muted hover:text-white"
                onClick={() => handleStartEdit(item)}
                title="แก้ไข"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-spotify-muted hover:text-destructive"
                onClick={() => setDeleteTxId(item.id)}
                title="ลบรายการ"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )
        },
      },
    ],
    [categories, rate]
  )

  const fieldClass =
    "h-9 rounded-lg border border-white/10 bg-card px-3 text-xs text-white shadow-inner outline-none transition placeholder:text-white/35 hover:border-white/20 focus:border-primary focus:ring-1 focus:ring-primary/20"

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Personal Finance · Cash Flow"
        title="Income & Expense (รายรับ - รายจ่าย)"
        description="บันทึกและตรวจสอบกระแสเงินสด ทั้งรายรับ รายจ่ายจริง และรายการรอชำระในบัญชีเดียว"
        action={
          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCategoryManager(true)}
              className="h-9 rounded-full border-white/10 bg-secondary text-xs font-bold text-white hover:bg-white/10"
            >
              <FolderCog className="w-3.5 h-3.5 mr-1.5 text-primary" /> จัดการหมวดหมู่
            </Button>
            <MyWealthQuickActions
              allowedModes={["income", "expense"]}
              defaultMode={activeTab === "income" ? "income" : "expense"}
            />
          </div>
        }
      />

      {/* 4 Summary Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-spotify p-5 border border-white/5 bg-card/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-spotify-label">Net Cash Flow</span>
            <Wallet className="h-4 w-4 text-spotify-muted" />
          </div>
          <p className={`text-2xl font-black mt-2 tabular-nums ${netCash >= 0 ? "text-primary" : "text-destructive"}`}>
            {netCash >= 0 ? "+" : ""}{money(netCash)}
          </p>
          <p className="text-[11px] text-spotify-muted mt-1">รายรับหักรายจ่ายจริง</p>
        </div>

        <div className="card-spotify p-5 border border-white/5 bg-card/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-spotify-label">Income (รายรับ)</span>
            <ArrowUpRight className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-black mt-2 text-primary tabular-nums">+{money(totalIncome)}</p>
          <p className="text-[11px] text-spotify-muted mt-1">
            {currentMonthTransactions.filter((t) => t.type === "income").length} รายการรับ
          </p>
        </div>

        <div className="card-spotify p-5 border border-white/5 bg-card/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-spotify-label">Paid Expenses (จ่ายแล้ว)</span>
            <ArrowDownRight className="h-4 w-4 text-destructive" />
          </div>
          <p className="text-2xl font-black mt-2 text-white tabular-nums">-{money(totalPaidExpenses)}</p>
          <p className="text-[11px] text-spotify-muted mt-1">
            {currentMonthTransactions.filter((t) => t.type === "expense" && t.payment_status === "paid").length} รายการที่ชำระแล้ว
          </p>
        </div>

        <div className="card-spotify p-5 border border-white/5 bg-card/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-spotify-label">Pending (รอชำระ)</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <p className={`text-2xl font-black mt-2 tabular-nums ${totalPendingExpenses > 0 ? "text-amber-400" : "text-white"}`}>
            {money(totalPendingExpenses)}
          </p>
          <p className="text-[11px] text-spotify-muted mt-1">
            {currentMonthTransactions.filter((t) => t.type === "expense" && t.payment_status === "pending").length} บิลที่ค้างจ่าย
          </p>
        </div>
      </div>

      {/* Primary Tab Switcher: All / Income / Paid Expenses / Pending */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-white/5 bg-card/50 p-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "all" ? "bg-white text-black shadow-sm" : "text-spotify-muted hover:text-white"
            }`}
          >
            ทั้งหมด ({transactions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("income")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "income" ? "bg-primary text-black shadow-play" : "text-spotify-muted hover:text-white"
            }`}
          >
            รายรับ ({transactions.filter((t) => t.type === "income").length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("expenses")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "expenses" ? "bg-white text-black shadow-sm" : "text-spotify-muted hover:text-white"
            }`}
          >
            จ่ายแล้ว ({transactions.filter((t) => t.type === "expense" && t.payment_status === "paid").length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "pending"
                ? "bg-amber-500 text-black font-black"
                : "text-spotify-muted hover:text-white"
            }`}
          >
            <span>รอจ่าย</span>
            {pendingCount > 0 && (
              <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] text-amber-400 font-black border border-amber-500/30">
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* Search & Month Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-56 min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-spotify-muted" />
            <input
              type="text"
              placeholder="ค้นหา..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="spotify-input pl-8 h-8 text-xs w-full"
            />
          </div>

          <input
            type="month"
            value={filterMonth === "all" ? "" : filterMonth}
            onChange={(e) => setFilterMonth(e.target.value || "all")}
            className="spotify-input h-8 py-1 px-2.5 text-xs w-32"
          />

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-8 w-28 bg-secondary border-white/10 text-xs text-white">
              <SelectValue placeholder="หมวดหมู่" />
            </SelectTrigger>
            <SelectContent className="bg-secondary border-white/10 text-white">
              <SelectItem value="all">ทุกหมวดหมู่</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(searchQuery || filterMonth !== "all" || filterCategory !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("")
                setFilterMonth("all")
                setFilterCategory("all")
              }}
              className="h-8 px-2 text-xs text-spotify-muted hover:text-white"
            >
              ล้าง
            </Button>
          )}
        </div>
      </div>

      {/* Main Unified DataTable */}
      <ReusableDataTable
        columns={columns}
        data={filteredTransactions}
        manualPagination={false}
        pageSize={15}
      />

      {/* Category Manager Modal */}
      <CategoryManagerDialog
        open={showCategoryManager}
        onOpenChange={setShowCategoryManager}
      />

      {/* MODAL: Edit Transaction */}
      <Dialog open={!!editTx} onOpenChange={(open) => !open && setEditTx(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto p-6 bg-background border border-white/10 text-white">
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

              {/* Amount with USD / THB toggle */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-spotify-muted font-bold">จำนวนเงิน</label>
                  <div className="flex items-center rounded-lg border border-white/10 bg-secondary p-0.5">
                    <button
                      type="button"
                      onClick={() => setEditCurrency("THB")}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        editCurrency === "THB" ? "bg-primary text-black" : "text-spotify-muted hover:text-white"
                      }`}
                    >
                      THB
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditCurrency("USD")}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        editCurrency === "USD" ? "bg-primary text-black" : "text-spotify-muted hover:text-white"
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
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className={fieldClass}
                />
                {editCurrency === "USD" && parseFloat(editAmount) > 0 && (
                  <span className="text-[11px] text-spotify-muted">
                    1 USD ≈ ฿{rate.toFixed(2)} THB (≈ ฿{(parseFloat(editAmount) * rate).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-spotify-muted font-bold">หมวดหมู่</label>
                <Select name="category_id" defaultValue={editTx.category_id}>
                  <SelectTrigger className={fieldClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-secondary border-white/10 text-white">
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
                    <SelectContent className="bg-secondary border-white/10 text-white">
                      <SelectItem value="paid">จ่ายแล้ว (Paid)</SelectItem>
                      <SelectItem value="pending">รอจ่าย (Pending)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-spotify-muted font-bold">บันทึกช่วยจำ</label>
                <input
                  name="note"
                  defaultValue={editTx.note ? editTx.note.replace(/\[USD:\s*\$?[\d.]+\]\s*/g, "").trim() : ""}
                  className={fieldClass}
                />
              </div>

              <DialogFooter className="mt-4 border-t border-white/10 pt-4">
                <Button type="button" variant="ghost" onClick={() => setEditTx(null)}>
                  ยกเลิก
                </Button>
                <Button type="submit" variant="pill" className="" disabled={pending}>
                  {pending ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL: Delete Transaction */}
      <Dialog open={!!deleteTxId} onOpenChange={(open) => !open && setDeleteTxId(null)}>
        <DialogContent className="max-w-sm p-6 bg-background border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">ยืนยันการลบรายการ?</DialogTitle>
            <DialogDescription className="text-spotify-muted text-xs">
              การลบรายการนี้จะไม่สามารถกู้คืนได้ คุณแน่ใจหรือไม่?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDeleteTxId(null)}>
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={handleDeleteTransaction}
              className="bg-destructive hover:bg-destructive/80 text-black font-bold"
            >
              {pending ? "กำลังลบ..." : "ลบรายการ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

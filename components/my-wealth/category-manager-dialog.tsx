"use client"

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { FolderCog, Plus, Edit2, Trash2, Check, Archive, RotateCcw } from "lucide-react"
import { useWealth, WealthCategory } from "./wealth-context"
import { createWealthCategory, updateWealthCategory, deleteWealthCategory } from "@/app/dashboard/my-wealth/actions"

const CATEGORY_COLORS = [
  "#1ed760", // Spotify Green
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

interface CategoryManagerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultType?: "income" | "expense"
}

export function CategoryManagerDialog({
  open,
  onOpenChange,
  defaultType = "expense",
}: CategoryManagerDialogProps) {
  const { toast } = useToast()
  const { categories, transactions, refreshData } = useWealth()
  const [pending, startTransition] = useTransition()

  // Tab filter: income vs expense
  const [activeTab, setActiveTab] = useState<"all" | "income" | "expense">(defaultType)

  // Creation form state
  const [isCreating, setIsCreating] = useState(false)
  const [newCatName, setNewCatName] = useState("")
  const [newCatType, setNewCatType] = useState<"income" | "expense">(defaultType)
  const [newCatColor, setNewCatColor] = useState(CATEGORY_COLORS[0])

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState("")

  const filteredCategories = categories.filter((c) => {
    if (activeTab === "all") return true
    return c.type === activeTab
  })

  const getUsageCount = (catId: string) => {
    return transactions.filter((t) => t.category_id === catId).length
  }

  const handleCreate = () => {
    if (!newCatName.trim()) {
      toast({ title: "ข้อผิดพลาด", description: "กรุณาระบุชื่อหมวดหมู่", variant: "destructive" })
      return
    }
    startTransition(async () => {
      try {
        await createWealthCategory({
          name: newCatName.trim(),
          type: newCatType,
          color: newCatColor,
        })
        toast({ title: "สำเร็จ", description: `สร้างหมวดหมู่ "${newCatName.trim()}" เรียบร้อยแล้ว` })
        setNewCatName("")
        setIsCreating(false)
        refreshData()
      } catch (err) {
        toast({ title: "สร้างไม่สำเร็จ", description: err instanceof Error ? err.message : "เกิดข้อผิดพลาด", variant: "destructive" })
      }
    })
  }

  const handleStartEdit = (cat: WealthCategory) => {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditColor(cat.color || CATEGORY_COLORS[0])
  }

  const handleSaveEdit = (catId: string) => {
    if (!editName.trim()) return
    startTransition(async () => {
      try {
        await updateWealthCategory(catId, {
          name: editName.trim(),
          color: editColor,
        })
        toast({ title: "สำเร็จ", description: "บันทึกการแก้ไขแล้ว" })
        setEditingId(null)
        refreshData()
      } catch (err) {
        toast({ title: "บันทึกไม่สำเร็จ", description: err instanceof Error ? err.message : "เกิดข้อผิดพลาด", variant: "destructive" })
      }
    })
  }

  const handleToggleArchive = (cat: WealthCategory) => {
    startTransition(async () => {
      try {
        await updateWealthCategory(cat.id, {
          is_active: !cat.is_active,
        })
        toast({
          title: "สำเร็จ",
          description: cat.is_active ? `ซ่อนหมวดหมู่ "${cat.name}" แล้ว` : `เปิดใช้งานหมวดหมู่ "${cat.name}" แล้ว`,
        })
        refreshData()
      } catch (err) {
        toast({ title: "ดำเนินการไม่สำเร็จ", description: err instanceof Error ? err.message : "เกิดข้อผิดพลาด", variant: "destructive" })
      }
    })
  }

  const handleDelete = (cat: WealthCategory) => {
    const count = getUsageCount(cat.id)
    if (count > 0) {
      toast({
        title: "ไม่สามารถลบได้",
        description: `หมวดหมู่นี้มี ${count} รายการใช้งานอยู่ กรุณาเลือก "ซ่อน/ปิดใช้งาน" แทน`,
        variant: "destructive",
      })
      return
    }

    startTransition(async () => {
      try {
        await deleteWealthCategory(cat.id)
        toast({ title: "สำเร็จ", description: `ลบหมวดหมู่ "${cat.name}" เรียบร้อยแล้ว` })
        refreshData()
      } catch (err) {
        toast({ title: "ลบไม่สำเร็จ", description: err instanceof Error ? err.message : "เกิดข้อผิดพลาด", variant: "destructive" })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-hidden p-0 bg-background border border-white/10 text-white shadow-heavy flex flex-col">
        <DialogHeader className="p-5 pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <FolderCog className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">จัดการหมวดหมู่ (Categories)</DialogTitle>
                <DialogDescription className="text-spotify-muted text-xs">
                  กำหนดหมวดหมู่และสีเพื่อจัดระเบียบรายรับ-รายจ่ายของคุณ
                </DialogDescription>
              </div>
            </div>
            {!isCreating && (
              <Button
                size="sm"
                onClick={() => {
                  setIsCreating(true)
                  setNewCatType(activeTab === "all" ? "expense" : activeTab)
                }}
                variant="pill" className="h-8 px-3 text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Category
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Tab switchers: All / Income / Expense */}
        <div className="px-5 pt-3 pb-2 border-b border-white/5 flex items-center justify-between bg-card/60 shrink-0">
          <div className="flex items-center gap-1 rounded-lg bg-background p-1 border border-white/5">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                activeTab === "all" ? "bg-white text-black" : "text-spotify-muted hover:text-white"
              }`}
            >
              ทั้งหมด ({categories.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("expense")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                activeTab === "expense" ? "bg-white text-black" : "text-spotify-muted hover:text-white"
              }`}
            >
              รายจ่าย ({categories.filter((c) => c.type === "expense").length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("income")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                activeTab === "income" ? "bg-white text-black" : "text-spotify-muted hover:text-white"
              }`}
            >
              รายรับ ({categories.filter((c) => c.type === "income").length})
            </button>
          </div>
        </div>

        {/* Scrollable list */}
        <div className="overflow-y-auto p-5 space-y-3 flex-1">
          {/* Create new category expandable box */}
          {isCreating && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3 animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Create New Category</span>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-spotify-muted hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-[1fr_auto]">
                <input
                  type="text"
                  placeholder="ชื่อหมวดหมู่ เช่น ค่าอาหาร, ค่าผ่อนบ้าน"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="spotify-input h-9 text-xs"
                  autoFocus
                />
                <div className="flex items-center gap-1 bg-card rounded-lg p-1 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setNewCatType("expense")}
                    className={`px-2 py-1 text-[11px] font-bold rounded ${
                      newCatType === "expense" ? "bg-rose-500/20 text-rose-300" : "text-spotify-muted"
                    }`}
                  >
                    รายจ่าย
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCatType("income")}
                    className={`px-2 py-1 text-[11px] font-bold rounded ${
                      newCatType === "income" ? "bg-emerald-500/20 text-emerald-300" : "text-spotify-muted"
                    }`}
                  >
                    รายรับ
                  </button>
                </div>
              </div>

              {/* Color picker */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-[11px] text-spotify-muted">เลือกสี:</span>
                {CATEGORY_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewCatColor(c)}
                    className={`w-5 h-5 rounded-full transition-transform ${
                      newCatColor === c ? "ring-2 ring-white scale-110" : "opacity-75 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  size="sm"
                  disabled={pending || !newCatName.trim()}
                  onClick={handleCreate}
                  variant="pill" className="h-8 px-4 text-xs"
                >
                  {pending ? "Creating..." : "Create Category"}
                </Button>
              </div>
            </div>
          )}

          {/* List items */}
          <div className="space-y-2">
            {filteredCategories.map((cat) => {
              const usageCount = getUsageCount(cat.id)
              const isEditing = editingId === cat.id

              if (isEditing) {
                return (
                  <div
                    key={cat.id}
                    className="flex flex-col gap-2 rounded-lg border border-primary/40 bg-secondary p-3"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="spotify-input h-8 text-xs flex-1"
                      />
                      <Button
                        size="sm"
                        disabled={pending}
                        onClick={() => handleSaveEdit(cat.id)}
                        variant="pill" className="h-8 px-3 text-xs"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" /> บันทึก
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                        className="h-8 px-2 text-xs text-spotify-muted hover:text-white"
                      >
                        ยกเลิก
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <span className="text-[11px] text-spotify-muted">สี:</span>
                      {CATEGORY_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditColor(c)}
                          className={`w-4 h-4 rounded-full transition-transform ${
                            editColor === c ? "ring-2 ring-white scale-110" : "opacity-75 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={cat.id}
                  className={`flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors ${
                    cat.is_active
                      ? "border-white/5 bg-card/70 hover:bg-card"
                      : "border-white/5 bg-[#141414] opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: cat.color || "#1ed760" }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white truncate">{cat.name}</span>
                        <Badge
                          className={`text-[9px] font-bold px-1.5 py-0 border ${
                            cat.type === "income"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-white/5 text-zinc-300 border-white/10"
                          }`}
                        >
                          {cat.type === "income" ? "รายรับ" : "รายจ่าย"}
                        </Badge>
                        {!cat.is_active && (
                          <span className="text-[10px] text-spotify-muted border border-white/10 rounded px-1">
                            ซ่อนอยู่
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-spotify-muted mt-0.5">
                        {usageCount > 0 ? `${usageCount} รายการที่ใช้งานอยู่` : "ยังไม่มีรายการใช้งาน"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-spotify-muted hover:text-white"
                      onClick={() => handleStartEdit(cat)}
                      title="แก้ไขชื่อและสี"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-spotify-muted hover:text-amber-400"
                      onClick={() => handleToggleArchive(cat)}
                      title={cat.is_active ? "ซ่อน/ปิดใช้งาน" : "เปิดใช้งานอีกครั้ง"}
                    >
                      {cat.is_active ? <Archive className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    </Button>
                    {usageCount === 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-spotify-muted hover:text-destructive"
                        onClick={() => handleDelete(cat)}
                        title="ลบหมวดหมู่นี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}

            {filteredCategories.length === 0 && (
              <div className="py-12 text-center text-spotify-muted text-xs">
                ไม่มีหมวดหมู่ในประเภทที่เลือก
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-white/10 bg-card/90 shrink-0 flex items-center justify-between text-xs text-spotify-muted">
          <span>* หมวดหมู่ที่มีประวัติบันทึกเงินจะไม่สามารถลบได้ แต่สามารถกดซ่อนได้</span>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs text-white hover:bg-white/10"
          >
            ปิด
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

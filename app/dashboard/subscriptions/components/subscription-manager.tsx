"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { SubscriptionDialog } from "./subscription-dialog"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { formatDateDDMMYYYY } from "@/components/dashboard/format"
import { Edit, Trash2, CreditCard, RefreshCw, History, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Modal } from "@/components/ui/modal"
import { ModernPageLoading } from "@/components/ui/modern-loader"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

import { ReusableDataTable } from "@/components/ui/reusable-data-table"
import { type ColumnDef, type Row } from "@tanstack/react-table"

interface Subscription {
    id: string
    name: string
    type?: string
    price: number
    billing_cycle: "monthly" | "yearly" | "weekly"
    next_billing_date: string
    start_date?: string
    status: "active" | "canceled" | "paused" | "completed"
    payment_method?: string
    notes?: string
}

export function SubscriptionManager() {
    const { toast } = useToast()
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
    const [loading, setLoading] = useState(true)
    const [historyOpen, setHistoryOpen] = useState(false)
    const [renewSub, setRenewSub] = useState<Subscription | null>(null)
    const [deleteSubId, setDeleteSubId] = useState<string | null>(null)
    const [actionLoading, setActionLoading] = useState(false)

    // Pagination states
    const [mainPage, setMainPage] = useState(1)
    const [mainPageSize, setMainPageSize] = useState(10)
    const [historyPage, setHistoryPage] = useState(1)
    const [historyPageSize, setHistoryPageSize] = useState(5)

    // Fetch subscriptions from API
    const fetchSubscriptions = useCallback(async () => {
        try {
            const res = await fetch('/api/subscriptions')
            if (!res.ok) throw new Error('Failed to fetch')
            const data = await res.json()
            setSubscriptions(data)
        } catch {
            toast({ title: "Error", description: "Failed to load subscriptions", variant: "destructive" })
        } finally {
            setLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        fetchSubscriptions()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const billingCycleLabels: Record<string, string> = {
        weekly: "รายสัปดาห์",
        monthly: "รายเดือน",
        yearly: "รายปี",
    }

    const statusLabels: Record<string, string> = {
        active: "ใช้งาน",
        canceled: "ยกเลิก",
        paused: "หยุดชั่วคราว",
        completed: "จบครบ",
    }

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'active':
            case 'completed':
                return 'bg-primary text-black hover:bg-primary/90'
            case 'canceled':
                return 'bg-destructive text-white hover:bg-destructive/90'
            case 'paused':
                return 'bg-[#282828] text-[#b3b3b3] hover:bg-[#333333]'
            default:
                return 'bg-[#181818] text-white'
        }
    }

    const activeSubscriptions = subscriptions.filter(s => s.status === 'active')
    const historySubscriptions = subscriptions.filter(s => s.status === 'canceled' || s.status === 'completed')

    // Paginated data
    const paginatedActive = useMemo(() => {
        const start = (mainPage - 1) * mainPageSize
        return activeSubscriptions.slice(start, start + mainPageSize)
    }, [activeSubscriptions, mainPage, mainPageSize])

    const paginatedHistory = useMemo(() => {
        const start = (historyPage - 1) * historyPageSize
        return historySubscriptions.slice(start, start + historyPageSize)
    }, [historySubscriptions, historyPage, historyPageSize])

    const totalMainPages = Math.ceil(activeSubscriptions.length / mainPageSize)
    const totalHistoryPages = Math.ceil(historySubscriptions.length / historyPageSize)

    const totalMonthlyCost = activeSubscriptions.reduce((acc, sub) => {
        let monthlyPrice = Number(sub.price)
        if (sub.billing_cycle === 'yearly') monthlyPrice = monthlyPrice / 12
        if (sub.billing_cycle === 'weekly') monthlyPrice = monthlyPrice * 4
        return acc + monthlyPrice
    }, 0)

    const totalPastCost = historySubscriptions.reduce((acc, sub) => {
        let monthlyPrice = Number(sub.price)
        if (sub.billing_cycle === 'yearly') monthlyPrice = monthlyPrice / 12
        if (sub.billing_cycle === 'weekly') monthlyPrice = monthlyPrice * 4
        return acc + monthlyPrice
    }, 0)

    const handleDeleteConfirm = async () => {
        if (!deleteSubId) return
        setActionLoading(true)
        try {
            const res = await fetch(`/api/subscriptions/${deleteSubId}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete')
            toast({ title: "ลบแล้ว", description: "Subscription ถูกลบเรียบร้อย" })
            await fetchSubscriptions()
        } catch (error) {
            toast({ title: "Error", description: "Something went wrong", variant: "destructive" })
        } finally {
            setActionLoading(false)
            setDeleteSubId(null)
        }
    }

    const handleRenewConfirm = async () => {
        if (!renewSub) return
        setActionLoading(true)

        const formatDate = (date: Date) => {
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            return `${year}-${month}-${day}`
        }

        const newStartDate = new Date()
        const newBillingDate = new Date()

        switch (renewSub.billing_cycle) {
            case "weekly":
                newBillingDate.setDate(newBillingDate.getDate() + 7)
                break
            case "monthly":
                newBillingDate.setMonth(newBillingDate.getMonth() + 1)
                break
            case "yearly":
                newBillingDate.setFullYear(newBillingDate.getFullYear() + 1)
                break
        }

        try {
            const res = await fetch(`/api/subscriptions/${renewSub.id}/renew`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    start_date: formatDate(newStartDate),
                    next_billing_date: formatDate(newBillingDate),
                }),
            })
            if (!res.ok) throw new Error('Failed to renew')
            toast({ title: "ต่ออายุแล้ว", description: "Subscription ถูกต่ออายุเรียบร้อย" })
            await fetchSubscriptions()
        } catch (error) {
            toast({ title: "Error", description: "Something went wrong", variant: "destructive" })
        } finally {
            setActionLoading(false)
            setRenewSub(null)
        }
    }

    const activeColumns = useMemo<ColumnDef<Subscription>[]>(() => [
        {
            accessorKey: "name",
            header: "ชื่อบริการ",
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#282828] flex items-center justify-center flex-shrink-0 group-hover:shadow-play transition-all">
                        <CreditCard className="w-4 h-4 text-[#b3b3b3] group-hover:text-primary transition-colors" />
                    </div>
                    <span className="font-bold text-white group-hover:text-primary transition-colors">{row.original.name}</span>
                </div>
            )
        },
        {
            accessorKey: "type",
            header: "ประเภท",
            cell: ({ row }) => <span className="text-spotify-muted group-hover:text-white">{row.original.type}</span>
        },
        {
            accessorKey: "price",
            header: "ราคา",
            cell: ({ row }) => <span className="font-bold text-white tabular-nums">฿{Number(row.original.price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
        },
        {
            accessorKey: "billing_cycle",
            header: "รอบการชำระ",
            cell: ({ row }) => <span className="text-spotify-muted">{billingCycleLabels[row.original.billing_cycle]}</span>
        },
        {
            accessorKey: "payment_method",
            header: "วิธีชำระเงิน",
            cell: ({ row }) => <span className="text-spotify-muted">{row.original.payment_method || "-"}</span>
        },
        {
            accessorKey: "start_date",
            header: "วันเริ่ม",
            cell: ({ row }) => <span className="text-spotify-muted">{row.original.start_date ? formatDateDDMMYYYY(row.original.start_date) : "-"}</span>
        },
        {
            accessorKey: "next_billing_date",
            header: "วันครบ",
            cell: ({ row }) => (
                <span className={cn("tabular-nums font-bold", getDueDateWarning(row.original.next_billing_date) || "text-spotify-muted")}>
                    {formatDateDDMMYYYY(row.original.next_billing_date)}
                </span>
            )
        },
        {
            accessorKey: "status",
            header: "สถานะ",
            cell: ({ row }) => (
                <Badge className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider", getStatusBadgeClass(row.original.status))}>
                    {statusLabels[row.original.status]}
                </Badge>
            )
        },
        {
            id: "actions",
            header: () => <div className="text-right">จัดการ</div>,
            cell: ({ row }) => (
                <div className="flex justify-end gap-1 transition-opacity">
                    <SubscriptionDialog
                        subscription={row.original}
                        onSuccess={fetchSubscriptions}
                        trigger={
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#b3b3b3] hover:text-white" title="แก้ไข">
                                <Edit className="h-4 w-4" />
                            </Button>
                        }
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-[#b3b3b3] hover:text-primary"
                        title="ต่ออายุ"
                        onClick={() => setRenewSub(row.original)}
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-[#b3b3b3] hover:text-destructive"
                        title="ลบ"
                        onClick={() => setDeleteSubId(row.original.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            )
        }
    ], [fetchSubscriptions])

    const historyColumns = useMemo<ColumnDef<Subscription>[]>(() => [
        {
            accessorKey: "name",
            header: "ชื่อบริการ",
            cell: ({ row }) => <span className="font-bold text-white">{row.original.name}</span>
        },
        {
            accessorKey: "type",
            header: "ประเภท",
            cell: ({ row }) => <span className="text-spotify-muted">{row.original.type}</span>
        },
        {
            accessorKey: "price",
            header: "ราคา",
            cell: ({ row }) => <span className="tabular-nums">฿{Number(row.original.price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
        },
        {
            accessorKey: "payment_method",
            header: "วิธีชำระเงิน",
            cell: ({ row }) => <span className="text-spotify-muted">{row.original.payment_method || "-"}</span>
        },
        {
            accessorKey: "start_date",
            header: "วันเริ่ม",
            cell: ({ row }) => <span className="text-spotify-muted">{row.original.start_date ? formatDateDDMMYYYY(row.original.start_date) : "-"}</span>
        },
        {
            accessorKey: "next_billing_date",
            header: "วันครบ",
            cell: ({ row }) => <span className="text-spotify-muted">{formatDateDDMMYYYY(row.original.next_billing_date)}</span>
        },
        {
            accessorKey: "status",
            header: "สถานะ",
            cell: ({ row }) => (
                <Badge className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider", getStatusBadgeClass(row.original.status))}>
                    {row.original.status === 'completed' ? (
                        <><CheckCircle className="h-3 w-3 mr-1" /> {statusLabels[row.original.status]}</>
                    ) : (
                        statusLabels[row.original.status]
                    )}
                </Badge>
            )
        }
    ], [])

    const getDueDateWarning = (nextBillingDate: string) => {
        const today = new Date()
        const dueDate = new Date(nextBillingDate)
        const diffTime = dueDate.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays <= 7) {
            return 'text-[#f3727f] font-bold'
        } else if (diffDays <= 14) {
            return 'text-[#ffa42b] font-bold'
        }
        return ''
    }


    return (
        <>
            <div className="space-y-8">
                <div className="grid gap-6 md:grid-cols-3">
                    <Card className="card-spotify border-none shadow-none bg-[#181818] p-2 hover:bg-[#282828] transition-all group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                            <CardTitle className="text-spotify-label">Subscriptions ที่ใช้งาน</CardTitle>
                            <CreditCard className="h-4 w-4 text-[#b3b3b3] group-hover:text-primary transition-colors" />
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <div className="text-3xl font-bold text-white">
                                {loading ? <span className="inline-block h-8 w-12 rounded bg-white/10 animate-pulse" /> : activeSubscriptions.length}
                            </div>
                            <p className="text-spotify-muted mt-1">รายการที่กำลัง active</p>
                        </CardContent>
                    </Card>
                    <Card className="card-spotify border-none shadow-none bg-[#181818] p-2 hover:bg-[#282828] transition-all group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                            <CardTitle className="text-spotify-label">ค่าใช้จ่ายรายเดือน</CardTitle>
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <span className="text-xs font-bold">฿</span>
                            </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <div className="text-3xl font-bold text-primary">
                                {loading ? <span className="inline-block h-8 w-28 rounded bg-white/10 animate-pulse" /> : `฿${totalMonthlyCost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            </div>
                            <p className="text-spotify-muted mt-1">ประมาณการต่อเดือน</p>
                        </CardContent>
                    </Card>
                    <Card className="card-spotify border-none shadow-none bg-[#181818] p-2 hover:bg-[#282828] transition-all group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                            <CardTitle className="text-spotify-label">ค่าใช้จ่ายที่ผ่านไปแล้ว</CardTitle>
                            <History className="h-4 w-4 text-[#b3b3b3] group-hover:text-white transition-colors" />
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <div className="text-3xl font-bold text-[#b3b3b3]">
                                {loading ? <span className="inline-block h-8 w-28 rounded bg-white/10 animate-pulse" /> : `฿${totalPastCost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            </div>
                            <p className="text-spotify-muted mt-1">จาก {historySubscriptions.length} รายการที่จบไปแล้ว</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex justify-end items-center gap-3">
                    <Button
                        variant="ghost"
                        onClick={() => setHistoryOpen(true)}
                        className="btn-pill bg-[#1f1f1f] hover:bg-[#2a2a2a] text-white"
                    >
                        <History className="h-4 w-4 mr-2" />
                        ประวัติ
                    </Button>
                    <SubscriptionDialog onSuccess={fetchSubscriptions} />
                </div>

                <ReusableDataTable
                    columns={activeColumns}
                    data={activeSubscriptions}
                    loading={loading}
                    page={mainPage}
                    pageSize={mainPageSize}
                    onPageChange={setMainPage}
                    onPageSizeChange={setMainPageSize}
                    manualPagination={false}
                />

                {/* History Modal */}
                <Modal
                    open={historyOpen}
                    onOpenChange={setHistoryOpen}
                    title="ประวัติ Subscription"
                    description="แสดงรายการ Subscription ที่ยกเลิกหรือจบครบแล้ว"
                    size="xl"
                    variant="default"
                    showSaveButton={false}
                    showCancelButton={false}
                    footer={
                        <div className="flex justify-end w-full">
                            <Button variant="ghost" onClick={() => setHistoryOpen(false)} className="btn-pill bg-white text-black hover:bg-white/90">
                                ปิดหน้าต่าง
                            </Button>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        <ReusableDataTable
                            columns={historyColumns}
                            data={historySubscriptions}
                            loading={loading}
                            page={historyPage}
                            pageSize={historyPageSize}
                            onPageChange={setHistoryPage}
                            onPageSizeChange={setHistoryPageSize}
                            manualPagination={false}
                        />
                    </div>
                </Modal>
            </div>

            {/* Renew Confirmation Dialog */}
            <Dialog open={!!renewSub} onOpenChange={(open) => !open && setRenewSub(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>ต่ออายุ Subscription?</DialogTitle>
                        <DialogDescription>
                            รายการเดิมจะเปลี่ยนสถานะเป็น &quot;จบครบ&quot; และระบบจะสร้าง subscription ใหม่จากวันที่วันนี้
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRenewSub(null)} disabled={actionLoading}>
                            ยกเลิก
                        </Button>
                        <Button onClick={handleRenewConfirm} disabled={actionLoading}>
                            {actionLoading ? "กำลังดำเนินการ..." : "ต่ออายุ"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteSubId} onOpenChange={(open) => !open && setDeleteSubId(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>ลบ Subscription?</DialogTitle>
                        <DialogDescription>
                            การดำเนินการนี้ไม่สามารถย้อนกลับได้ ข้อมูลจะถูกลบออกจากระบบถาวร
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteSubId(null)} disabled={actionLoading}>
                            ยกเลิก
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteConfirm} disabled={actionLoading}>
                            {actionLoading ? "กำลังลบ..." : "ลบ"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

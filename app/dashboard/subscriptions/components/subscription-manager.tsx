"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { SubscriptionDialog } from "./subscription-dialog"
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
import { Edit, Trash2, CreditCard, RefreshCw, History, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Modal } from "@/components/ui/modal"
import { Loading, PageLoading } from "@/components/ui/loading"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

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
    const [historyPage, setHistoryPage] = useState(1)
    const MAIN_PAGE_SIZE = 10
    const HISTORY_PAGE_SIZE = 5

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

    const activeSubscriptions = subscriptions.filter(s => s.status === 'active')
    const historySubscriptions = subscriptions.filter(s => s.status === 'canceled' || s.status === 'completed')

    // Paginated data
    const paginatedActive = useMemo(() => {
        const start = (mainPage - 1) * MAIN_PAGE_SIZE
        return activeSubscriptions.slice(start, start + MAIN_PAGE_SIZE)
    }, [activeSubscriptions, mainPage])

    const paginatedHistory = useMemo(() => {
        const start = (historyPage - 1) * HISTORY_PAGE_SIZE
        return historySubscriptions.slice(start, start + HISTORY_PAGE_SIZE)
    }, [historySubscriptions, historyPage])

    const totalMainPages = Math.ceil(activeSubscriptions.length / MAIN_PAGE_SIZE)
    const totalHistoryPages = Math.ceil(historySubscriptions.length / HISTORY_PAGE_SIZE)

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
                return 'bg-green-500 hover:bg-green-600'
            case 'canceled':
                return 'bg-red-500 hover:bg-red-600'
            default:
                return ''
        }
    }

    const getDueDateWarning = (nextBillingDate: string) => {
        const today = new Date()
        const dueDate = new Date(nextBillingDate)
        const diffTime = dueDate.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays <= 7) {
            return 'text-red-500 font-semibold'
        } else if (diffDays <= 14) {
            return 'text-yellow-500 font-semibold'
        }
        return ''
    }

    if (loading) {
        return <PageLoading />
    }

    return (
        <>
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Subscriptions ที่ใช้งาน</CardTitle>
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{activeSubscriptions.length}</div>
                            <p className="text-xs text-muted-foreground">
                                รายการที่กำลัง active
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">ค่าใช้จ่ายรายเดือน</CardTitle>
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-[#39FF14]">฿{totalMonthlyCost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            <p className="text-xs text-muted-foreground">
                                ประมาณการต่อเดือน
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">ค่าใช้จ่ายที่ผ่านไปแล้ว</CardTitle>
                            <History className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-[#8C8C8C]">฿{totalPastCost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            <p className="text-xs text-muted-foreground">
                                จาก {historySubscriptions.length} รายการที่จบไปแล้ว
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex justify-end items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setHistoryOpen(true)}
                        className="gap-2"
                    >
                        <History className="h-4 w-4" />
                        ประวัติ
                    </Button>
                    <SubscriptionDialog onSuccess={fetchSubscriptions} />
                </div>

                {/* Active Subscriptions Table */}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ชื่อบริการ</TableHead>
                                <TableHead>ประเภท</TableHead>
                                <TableHead>ราคา</TableHead>
                                <TableHead>รอบการชำระ</TableHead>
                                <TableHead>วิธีชำระเงิน</TableHead>
                                <TableHead>วันเริ่ม</TableHead>
                                <TableHead>วันครบ</TableHead>
                                <TableHead>สถานะ</TableHead>
                                <TableHead className="text-right">จัดการ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedActive.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-24 text-center">
                                        ยังไม่มี subscription ที่ใช้งาน
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedActive.map((sub) => (
                                    <TableRow key={sub.id}>
                                        <TableCell className="font-medium">{sub.name}</TableCell>
                                        <TableCell>{sub.type}</TableCell>
                                        <TableCell>฿{Number(sub.price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</TableCell>
                                        <TableCell>{billingCycleLabels[sub.billing_cycle]}</TableCell>
                                        <TableCell>{sub.payment_method || "-"}</TableCell>
                                        <TableCell>
                                            {sub.start_date ? format(new Date(sub.start_date), "d MMM yyyy") : "-"}
                                        </TableCell>
                                        <TableCell className={getDueDateWarning(sub.next_billing_date)}>
                                            {format(new Date(sub.next_billing_date), "d MMM yyyy")}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getStatusBadgeClass(sub.status)}>
                                                {statusLabels[sub.status]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                {/* Edit */}
                                                <SubscriptionDialog
                                                    subscription={sub}
                                                    onSuccess={fetchSubscriptions}
                                                    trigger={
                                                        <Button variant="ghost" size="icon" title="แก้ไข">
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    }
                                                />

                                                {/* Renew */}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-green-500 hover:text-green-400"
                                                    title="ต่ออายุ"
                                                    onClick={() => setRenewSub(sub)}
                                                >
                                                    <RefreshCw className="h-4 w-4" />
                                                </Button>

                                                {/* Delete */}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive/80"
                                                    title="ลบ"
                                                    onClick={() => setDeleteSubId(sub.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination for main table */}
                {totalMainPages > 1 && (
                    <div className="flex items-center justify-between px-2">
                        <div className="text-sm text-muted-foreground">
                            หน้า {mainPage} จาก {totalMainPages} ({activeSubscriptions.length} รายการ)
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setMainPage(p => Math.max(1, p - 1))}
                                disabled={mainPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setMainPage(p => Math.min(totalMainPages, p + 1))}
                                disabled={mainPage === totalMainPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}

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
                        <div className="flex items-center justify-between w-full">
                            {totalHistoryPages > 1 ? (
                                <>
                                    <div className="text-sm text-muted-foreground">
                                        หน้า {historyPage} จาก {totalHistoryPages}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                            disabled={historyPage === 1}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                                            disabled={historyPage === totalHistoryPages}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                        <Button variant="outline" onClick={() => setHistoryOpen(false)}>
                                            ปิด
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <Button variant="outline" onClick={() => setHistoryOpen(false)} className="ml-auto">
                                    ปิด
                                </Button>
                            )}
                        </div>
                    }
                >
                    {historySubscriptions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            ยังไม่มีประวัติ
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ชื่อบริการ</TableHead>
                                        <TableHead>ประเภท</TableHead>
                                        <TableHead>ราคา</TableHead>
                                        <TableHead>วิธีชำระเงิน</TableHead>
                                        <TableHead>วันเริ่ม</TableHead>
                                        <TableHead>วันครบ</TableHead>
                                        <TableHead>สถานะ</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedHistory.map((sub) => (
                                        <TableRow key={sub.id}>
                                            <TableCell className="font-medium">{sub.name}</TableCell>
                                            <TableCell>{sub.type}</TableCell>
                                            <TableCell>฿{Number(sub.price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</TableCell>
                                            <TableCell>{sub.payment_method || "-"}</TableCell>
                                            <TableCell>
                                                {sub.start_date ? format(new Date(sub.start_date), "d MMM yyyy") : "-"}
                                            </TableCell>
                                            <TableCell>
                                                {format(new Date(sub.next_billing_date), "d MMM yyyy")}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={getStatusBadgeClass(sub.status)}>
                                                    {sub.status === 'completed' ? (
                                                        <><CheckCircle className="h-3 w-3 mr-1" /> {statusLabels[sub.status]}</>
                                                    ) : (
                                                        statusLabels[sub.status]
                                                    )}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </Modal>
            </div>

            {/* Renew Confirmation Dialog */}
            <Dialog open={!!renewSub} onOpenChange={(open) => !open && setRenewSub(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>ต่ออายุ Subscription?</DialogTitle>
                        <DialogDescription>
                            รายการเดิมจะเปลี่ยนสถานะเป็น "จบครบ" และระบบจะสร้าง subscription ใหม่จากวันที่วันนี้
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

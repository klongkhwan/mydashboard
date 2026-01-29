"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { MemoryLogDialog } from "./memory-log-dialog"
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
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { Edit, Trash2, MapPin, Calendar, BookHeart, ChevronLeft, ChevronRight, Image as ImageIcon, Eye, X, ZoomIn } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { ModernPageLoading } from "@/components/ui/modern-loader"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { MemoryLog } from "../schema"

export function MemoryLogManager() {
    const { toast } = useToast()
    const [memoryLogs, setMemoryLogs] = useState<MemoryLog[]>([])
    const [loading, setLoading] = useState(true)
    const [deleteLogId, setDeleteLogId] = useState<string | null>(null)
    const [actionLoading, setActionLoading] = useState(false)
    const [viewLog, setViewLog] = useState<MemoryLog | null>(null)
    const [lightboxImage, setLightboxImage] = useState<string | null>(null)

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1)
    const PAGE_SIZE = 10

    // Fetch memory logs from API
    const fetchMemoryLogs = useCallback(async () => {
        try {
            const res = await fetch('/api/memories')
            if (!res.ok) throw new Error('Failed to fetch')
            const data = await res.json()
            setMemoryLogs(data)
        } catch {
            toast({ title: "Error", description: "Failed to load memories", variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }, [toast])

    useEffect(() => {
        fetchMemoryLogs()
    }, [fetchMemoryLogs])

    // Paginated data
    const paginatedLogs = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE
        return memoryLogs.slice(start, start + PAGE_SIZE)
    }, [memoryLogs, currentPage])

    const totalPages = Math.ceil(memoryLogs.length / PAGE_SIZE)

    // Stats
    const totalPhotos = memoryLogs.reduce((acc, log) => acc + (log.memory_photos?.length || 0), 0)
    const uniqueLocations = new Set(memoryLogs.map(log => log.location).filter(Boolean)).size
    const latestMemory = memoryLogs[0]

    const handleDeleteConfirm = async () => {
        if (!deleteLogId) return
        setActionLoading(true)
        try {
            const res = await fetch(`/api/memories/${deleteLogId}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete')
            toast({ title: "ลบแล้ว", description: "ลบความทรงจำเรียบร้อย" })
            await fetchMemoryLogs()
        } catch {
            toast({ title: "Error", description: "Something went wrong", variant: "destructive" })
        } finally {
            setActionLoading(false)
            setDeleteLogId(null)
        }
    }

    if (loading) {
        return <ModernPageLoading />
    }

    return (
        <>
            <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">ความทรงจำทั้งหมด</CardTitle>
                            <BookHeart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{memoryLogs.length}</div>
                            <p className="text-xs text-muted-foreground">
                                รายการที่บันทึกไว้
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">รูปภาพ</CardTitle>
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-500">{totalPhotos}</div>
                            <p className="text-xs text-muted-foreground">
                                รูปภาพทั้งหมด
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">สถานที่</CardTitle>
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-500">{uniqueLocations}</div>
                            <p className="text-xs text-muted-foreground">
                                สถานที่ที่บันทึกไว้
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">ล่าสุด</CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-lg font-bold truncate">
                                {latestMemory ? latestMemory.title : "-"}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {latestMemory ? format(new Date(latestMemory.date), "d MMM yyyy", { locale: th }) : "ยังไม่มีบันทึก"}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Action Button */}
                <div className="flex justify-end items-center gap-2">
                    <MemoryLogDialog onSuccess={fetchMemoryLogs} />
                </div>

                {/* Memory Logs Table */}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>หัวข้อ</TableHead>
                                <TableHead>วันที่</TableHead>
                                <TableHead>สถานที่</TableHead>
                                <TableHead>อารมณ์</TableHead>
                                <TableHead>รูปภาพ</TableHead>
                                <TableHead className="text-right">จัดการ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <BookHeart className="h-8 w-8 text-muted-foreground" />
                                            <span className="text-muted-foreground">ยังไม่มีความทรงจำ</span>
                                            <MemoryLogDialog onSuccess={fetchMemoryLogs} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedLogs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="font-medium">{log.title}</TableCell>
                                        <TableCell>
                                            {format(new Date(log.date), "d MMM yyyy", { locale: th })}
                                        </TableCell>
                                        <TableCell>
                                            {log.location ? (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    {log.location}
                                                </span>
                                            ) : "-"}
                                        </TableCell>
                                        <TableCell>{log.mood || "-"}</TableCell>
                                        <TableCell>
                                            {log.memory_photos?.length > 0 ? (
                                                <span className="flex items-center gap-1">
                                                    <ImageIcon className="h-3 w-3" />
                                                    {log.memory_photos.length}
                                                </span>
                                            ) : "-"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                {/* View */}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="ดูรายละเอียด"
                                                    onClick={() => setViewLog(log)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>

                                                {/* Edit */}
                                                <MemoryLogDialog
                                                    memoryLog={log}
                                                    onSuccess={fetchMemoryLogs}
                                                    trigger={
                                                        <Button variant="ghost" size="icon" title="แก้ไข">
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    }
                                                />

                                                {/* Delete */}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive/80"
                                                    title="ลบ"
                                                    onClick={() => setDeleteLogId(log.id)}
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

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-2">
                        <div className="text-sm text-muted-foreground">
                            หน้า {currentPage} จาก {totalPages} ({memoryLogs.length} รายการ)
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* View Detail Dialog */}
            <Dialog open={!!viewLog} onOpenChange={(open) => !open && setViewLog(null)}>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl">{viewLog?.title}</DialogTitle>
                        <DialogDescription className="flex items-center gap-4 text-base">
                            <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {viewLog && format(new Date(viewLog.date), "วันdddd ที่ d MMMM yyyy", { locale: th })}
                            </span>
                            {viewLog?.location && (
                                <span className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {viewLog.location}
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {viewLog && (
                        <div className="space-y-6 py-4">
                            {/* Mood */}
                            {viewLog.mood && (
                                <div className="bg-muted/50 rounded-lg p-4">
                                    <span className="text-sm text-muted-foreground block mb-1">อารมณ์/ความรู้สึก</span>
                                    <p className="text-lg">{viewLog.mood}</p>
                                </div>
                            )}

                            {/* Description */}
                            {viewLog.description && (
                                <div className="bg-muted/30 rounded-lg p-4 border">
                                    <span className="text-sm text-muted-foreground block mb-2">รายละเอียด</span>
                                    <p className="whitespace-pre-wrap text-base leading-relaxed">{viewLog.description}</p>
                                </div>
                            )}

                            {/* Photos Gallery */}
                            {viewLog.memory_photos?.length > 0 && (
                                <div>
                                    <span className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                                        <ImageIcon className="h-4 w-4" />
                                        รูปภาพ ({viewLog.memory_photos.length})
                                        <span className="text-xs text-muted-foreground/70">- คลิกเพื่อขยาย</span>
                                    </span>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {viewLog.memory_photos.map((photo) => (
                                            <div
                                                key={photo.id}
                                                className="relative group cursor-pointer"
                                                onClick={() => setLightboxImage(photo.photo_url)}
                                            >
                                                <div className="aspect-square rounded-lg overflow-hidden bg-muted relative">
                                                    {/* Loading placeholder */}
                                                    <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
                                                        <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                                                    </div>
                                                    <img
                                                        src={photo.photo_url}
                                                        alt="Memory photo"
                                                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300 relative z-10"
                                                        loading="lazy"
                                                        onLoad={(e) => {
                                                            const target = e.target as HTMLImageElement
                                                            target.style.opacity = "1"
                                                        }}
                                                        style={{ opacity: 0, transition: "opacity 0.3s ease-in-out" }}
                                                    />
                                                </div>
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center z-20">
                                                    <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewLog(null)}>
                            ปิด
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Image Lightbox */}
            <Dialog open={!!lightboxImage} onOpenChange={(open) => !open && setLightboxImage(null)}>
                <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto bg-transparent border-none shadow-none p-0 flex items-center justify-center focus:outline-none">
                    <DialogTitle className="sr-only">Image View</DialogTitle>
                    <DialogDescription className="sr-only">Full size image view</DialogDescription>
                    <div className="relative">
                        <button
                            className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-50 backdrop-blur-sm"
                            onClick={() => setLightboxImage(null)}
                        >
                            <X className="h-6 w-6" />
                        </button>
                        <img
                            src={lightboxImage || undefined}
                            alt="Full size photo"
                            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteLogId} onOpenChange={(open) => !open && setDeleteLogId(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>ลบความทรงจำ?</DialogTitle>
                        <DialogDescription>
                            การดำเนินการนี้ไม่สามารถย้อนกลับได้ ข้อมูลและรูปภาพทั้งหมดจะถูกลบออกจากระบบถาวร
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteLogId(null)} disabled={actionLoading}>
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


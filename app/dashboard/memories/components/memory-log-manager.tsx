"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { MemoryLogDialog } from "./memory-log-dialog"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ReusableDataTable } from "@/components/ui/reusable-data-table"
import { type ColumnDef, type Row } from "@tanstack/react-table"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { Edit, Trash2, MapPin, Calendar, BookHeart, ChevronLeft, ChevronRight, Image as ImageIcon, Eye, X, ZoomIn, Video, FileAudio } from "lucide-react"
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
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import { MemoryLog, getMediaType } from "../schema"

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
    const totalMedia = memoryLogs.reduce((acc, log) => acc + (log.memory_photos?.length || 0), 0)
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

    const columns = useMemo<ColumnDef<MemoryLog>[]>(() => [
        {
            accessorKey: "title",
            header: "หัวข้อ",
            cell: ({ row }: { row: Row<MemoryLog> }) => (
                <div className="font-bold text-white group-hover:text-primary transition-colors py-2 pl-6">
                    {row.original.title}
                </div>
            )
        },
        {
            accessorKey: "date",
            header: "วันที่",
            cell: ({ row }: { row: Row<MemoryLog> }) => (
                <div className="text-spotify-muted group-hover:text-white tabular-nums">
                    {format(new Date(row.original.date), "d MMM yyyy", { locale: th })}
                </div>
            )
        },
        {
            accessorKey: "location",
            header: "สถานที่",
            cell: ({ row }: { row: Row<MemoryLog> }) => (
                <div className="text-spotify-muted group-hover:text-white">
                    {row.original.location ? (
                        <span className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-primary" />
                            {row.original.location}
                        </span>
                    ) : "-"}
                </div>
            )
        },
        {
            accessorKey: "mood",
            header: "อารมณ์",
            cell: ({ row }: { row: Row<MemoryLog> }) => (
                <div>
                    {row.original.mood ? (
                        <Badge className="bg-[#282828] text-[#b3b3b3] border-none text-[10px] font-bold uppercase px-2 py-0.5">
                            {row.original.mood}
                        </Badge>
                    ) : "-"}
                </div>
            )
        },
        {
            accessorKey: "media",
            header: "สื่อแนบ",
            cell: ({ row }: { row: Row<MemoryLog> }) => (
                <div className="text-spotify-muted font-bold tabular-nums">
                    {row.original.memory_photos?.length > 0 ? (
                        <span className="flex items-center gap-1.5">
                            <ImageIcon className="h-4 w-4" />
                            {row.original.memory_photos.length}
                        </span>
                    ) : "-"}
                </div>
            )
        },
        {
            id: "actions",
            header: () => <div className="text-right pr-6">จัดการ</div>,
            cell: ({ row }: { row: Row<MemoryLog> }) => (
                <div className="flex justify-end gap-1 transition-opacity pr-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-[#b3b3b3] hover:text-white"
                        title="ดูรายละเอียด"
                        onClick={() => setViewLog(row.original)}
                    >
                        <Eye className="h-4 w-4" />
                    </Button>

                    <MemoryLogDialog
                        memoryLog={row.original}
                        onSuccess={fetchMemoryLogs}
                        trigger={
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#b3b3b3] hover:text-white" title="แก้ไข">
                                <Edit className="h-4 w-4" />
                            </Button>
                        }
                    />

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-[#b3b3b3] hover:text-destructive"
                        title="ลบ"
                        onClick={() => setDeleteLogId(row.original.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            )
        }
    ], [fetchMemoryLogs])

    if (loading) {
        return <ModernPageLoading />
    }

    return (
        <>
            <div className="space-y-8">
                {/* Stats Cards */}
                <div className="grid gap-6 md:grid-cols-4">
                    <Card className="card-spotify border-none shadow-none bg-[#181818] p-2 hover:bg-[#282828] transition-all group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                            <CardTitle className="text-spotify-label">ความทรงจำทั้งหมด</CardTitle>
                            <BookHeart className="h-4 w-4 text-[#b3b3b3] group-hover:text-primary transition-colors" />
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <div className="text-3xl font-bold text-white">{memoryLogs.length}</div>
                            <p className="text-spotify-muted mt-1">รายการที่บันทึกไว้</p>
                        </CardContent>
                    </Card>
                    <Card className="card-spotify border-none shadow-none bg-[#181818] p-2 hover:bg-[#282828] transition-all group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                            <CardTitle className="text-spotify-label">สื่อแนบ</CardTitle>
                            <ImageIcon className="h-4 w-4 text-[#b3b3b3] group-hover:text-white transition-colors" />
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <div className="text-3xl font-bold text-white">{totalMedia}</div>
                            <p className="text-spotify-muted mt-1">รูป/วิดีโอ/เสียง</p>
                        </CardContent>
                    </Card>
                    <Card className="card-spotify border-none shadow-none bg-[#181818] p-2 hover:bg-[#282828] transition-all group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                            <CardTitle className="text-spotify-label">สถานที่</CardTitle>
                            <MapPin className="h-4 w-4 text-[#b3b3b3] group-hover:text-primary transition-colors" />
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <div className="text-3xl font-bold text-white">{uniqueLocations}</div>
                            <p className="text-spotify-muted mt-1">พิกัดความทรงจำ</p>
                        </CardContent>
                    </Card>
                    <Card className="card-spotify border-none shadow-none bg-[#181818] p-2 hover:bg-[#282828] transition-all group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                            <CardTitle className="text-spotify-label">ล่าสุด</CardTitle>
                            <Calendar className="h-4 w-4 text-[#b3b3b3] group-hover:text-white transition-colors" />
                        </CardHeader>
                        <CardContent className="px-4 pb-4 min-w-0">
                            <div className="text-[15px] font-bold text-white truncate">
                                {latestMemory ? latestMemory.title : "-"}
                            </div>
                            <p className="text-spotify-muted mt-1">
                                {latestMemory ? format(new Date(latestMemory.date), "d MMM yyyy", { locale: th }) : "ยังไม่มีบันทึก"}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Action Button */}
                <div className="flex justify-end items-center gap-3">
                    <MemoryLogDialog onSuccess={fetchMemoryLogs} />
                </div>

                {/* Memory Logs Table using ReusableDataTable */}
                <ReusableDataTable
                    columns={columns}
                    data={memoryLogs}
                    page={currentPage}
                    pageSize={PAGE_SIZE}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={() => {}} // Could add logic if needed
                    manualPagination={false} // Frontend pagination for now
                />
            </div>

            {/* View Detail Dialog */}
            <Dialog open={!!viewLog} onOpenChange={(open) => !open && setViewLog(null)}>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="border-b border-white/5 pb-6">
                        <DialogTitle className="text-3xl font-black tracking-tighter">{viewLog?.title}</DialogTitle>
                        <div className="flex flex-wrap items-center gap-4 mt-4">
                            <span className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
                                <Calendar className="h-4 w-4" />
                                {viewLog && format(new Date(viewLog.date), "EEEE d MMMM yyyy", { locale: th })}
                            </span>
                            {viewLog?.location && (
                                <span className="flex items-center gap-2 text-[#b3b3b3] font-bold text-sm uppercase tracking-wider">
                                    <MapPin className="h-4 w-4" />
                                    {viewLog.location}
                                </span>
                            )}
                        </div>
                    </DialogHeader>

                    {viewLog && (
                        <div className="space-y-8 py-6">
                            {/* Mood */}
                            {viewLog.mood && (
                                <div className="bg-[#121212] rounded-lg p-6 shadow-inset">
                                    <span className="text-spotify-label mb-2 block">อารมณ์และความรู้สึก</span>
                                    <p className="text-xl font-bold text-white">{viewLog.mood}</p>
                                </div>
                            )}

                            {/* Description */}
                            {viewLog.description && (
                                <div className="space-y-3">
                                    <span className="text-spotify-label">บันทึกรายละเอียด</span>
                                    <p className="whitespace-pre-wrap text-lg font-medium text-[#b3b3b3] leading-relaxed italic border-l-2 border-primary/40 pl-4">
                                        {viewLog.description}
                                    </p>

                                </div>
                            )}

                            {/* Media Gallery */}
                            {viewLog.memory_photos?.length > 0 && (
                                <div className="space-y-4">
                                    <span className="text-spotify-label flex items-center gap-2">
                                        <ImageIcon className="h-4 w-4" />
                                        คอลเลกชันสื่อ ({viewLog.memory_photos.length})
                                    </span>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {viewLog.memory_photos.map((photo) => {
                                            const type = getMediaType(photo.photo_url)

                                            // Video
                                            if (type === 'video') {
                                                return (
                                                    <div key={photo.id} className="aspect-square rounded-lg bg-black overflow-hidden relative group hover:shadow-play transition-all">
                                                        <video
                                                            src={photo.photo_url}
                                                            controls
                                                            className="w-full h-full object-cover"
                                                            preload="metadata"
                                                        />
                                                    </div>
                                                )
                                            }

                                            // Audio
                                            if (type === 'audio') {
                                                return (
                                                    <div key={photo.id} className="aspect-square rounded-lg bg-[#282828] flex flex-col items-center justify-center p-4 relative group hover:bg-[#333333] transition-all">
                                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                                            <FileAudio className="h-6 w-6 text-primary" />
                                                        </div>
                                                        <audio src={photo.photo_url} controls className="w-full" />
                                                    </div>
                                                )
                                            }

                                            // Image
                                            return (
                                                <div
                                                    key={photo.id}
                                                    className="relative group cursor-pointer aspect-square rounded-lg overflow-hidden bg-[#282828]"
                                                    onClick={() => setLightboxImage(photo.photo_url)}
                                                >
                                                    <img
                                                        src={photo.photo_url}
                                                        alt="Memory"
                                                        className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                                                        loading="lazy"
                                                        referrerPolicy="no-referrer"
                                                    />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                                                        <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-all transform scale-50 group-hover:scale-100" />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="border-t border-white/5 pt-6">
                        <Button variant="ghost" onClick={() => setViewLog(null)} className="btn-pill bg-white text-black hover:bg-white/90">
                            ปิดหน้าต่าง
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
                            การดำเนินการนี้ไม่สามารถย้อนกลับได้ ข้อมูลและไฟล์แนบทั้งหมดจะถูกลบออกจากระบบถาวร
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


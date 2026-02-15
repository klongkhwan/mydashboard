"use client"

import { useState, useRef, type ReactNode } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { memoryLogSchema, type MemoryLogFormValues, type MemoryLog, type MemoryPhoto, getMediaType } from "../schema"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Upload, X, Image as ImageIcon, Loader2, Video, FileAudio } from "lucide-react"

interface MemoryLogDialogProps {
    memoryLog?: MemoryLog
    onSuccess: () => void
    trigger?: ReactNode
}

export function MemoryLogDialog({ memoryLog, onSuccess, trigger }: MemoryLogDialogProps) {
    const { toast } = useToast()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [photos, setPhotos] = useState<MemoryPhoto[]>(memoryLog?.memory_photos || [])
    const [uploadingPhotos, setUploadingPhotos] = useState(false)
    const [pendingFiles, setPendingFiles] = useState<File[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)

    const isEdit = !!memoryLog

    const form = useForm<MemoryLogFormValues>({
        resolver: zodResolver(memoryLogSchema),
        defaultValues: {
            title: memoryLog?.title || "",
            date: memoryLog?.date ? new Date(memoryLog.date) : undefined,
            location: memoryLog?.location || "",
            description: memoryLog?.description || "",
            mood: memoryLog?.mood || "",
        },
    })

    const onSubmit = async (values: MemoryLogFormValues) => {
        setLoading(true)
        try {
            const url = isEdit ? `/api/memories/${memoryLog.id}` : "/api/memories"
            const method = isEdit ? "PUT" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...values,
                    date: format(values.date, "yyyy-MM-dd"),
                }),
            })

            if (!res.ok) {
                throw new Error("Failed to save")
            }

            const savedLog = await res.json()

            // Upload pending photos for new logs
            if (!isEdit && pendingFiles.length > 0) {
                await uploadPhotos(savedLog.id, pendingFiles)
            }

            toast({
                title: isEdit ? "บันทึกแล้ว" : "เพิ่มแล้ว",
                description: isEdit ? "อัปเดตความทรงจำเรียบร้อย" : "บันทึกความทรงจำใหม่เรียบร้อย",
            })

            setOpen(false)
            form.reset()
            setPhotos([])
            setPendingFiles([])
            onSuccess()
        } catch {
            toast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถบันทึกข้อมูลได้",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const uploadPhotos = async (logId: string, files: File[]) => {
        for (const file of files) {
            const formData = new FormData()
            formData.append("file", file)

            await fetch(`/api/memories/${logId}/photos`, {
                method: "POST",
                body: formData,
            })
        }
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return

        if (isEdit && memoryLog) {
            // Upload immediately for existing logs
            setUploadingPhotos(true)
            try {
                for (const file of files) {
                    const formData = new FormData()
                    formData.append("file", file)

                    const res = await fetch(`/api/memories/${memoryLog.id}/photos`, {
                        method: "POST",
                        body: formData,
                    })

                    if (res.ok) {
                        const newPhoto = await res.json()
                        setPhotos(prev => [...prev, newPhoto])
                    }
                }
                toast({ title: "อัปโหลดสำเร็จ", description: "เพิ่มไฟล์เรียบร้อย" })
            } catch {
                toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถอัปโหลดไฟล์ได้", variant: "destructive" })
            } finally {
                setUploadingPhotos(false)
            }
        } else {
            // Queue for upload after save for new logs
            setPendingFiles(prev => [...prev, ...files])
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    const handleDeletePhoto = async (photoId: string) => {
        if (!memoryLog) return

        try {
            const res = await fetch(`/api/memories/${memoryLog.id}/photos/${photoId}`, {
                method: "DELETE",
            })

            if (res.ok) {
                setPhotos(prev => prev.filter(p => p.id !== photoId))
                toast({ title: "ลบแล้ว", description: "ลบไฟล์เรียบร้อย" })
            }
        } catch {
            toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถลบไฟล์ได้", variant: "destructive" })
        }
    }

    const removePendingFile = (index: number) => {
        setPendingFiles(prev => prev.filter((_, i) => i !== index))
    }

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen)
        if (isOpen && memoryLog) {
            form.reset({
                title: memoryLog.title,
                date: new Date(memoryLog.date),
                location: memoryLog.location || "",
                description: memoryLog.description || "",
                mood: memoryLog.mood || "",
            })
            setPhotos(memoryLog.memory_photos || [])
        } else if (!isOpen) {
            form.reset()
            setPhotos([])
            setPendingFiles([])
        }
    }

    const renderPreview = (file: File) => {
        if (file.type.startsWith('video/')) {
            return (
                <div className="w-full h-full flex items-center justify-center bg-black text-white">
                    <Video className="h-8 w-8" />
                </div>
            )
        }
        if (file.type.startsWith('audio/')) {
            return (
                <div className="w-full h-full flex items-center justify-center bg-orange-100 text-orange-600">
                    <FileAudio className="h-8 w-8" />
                </div>
            )
        }
        return (
            <img
                src={URL.createObjectURL(file)}
                alt="Pending"
                className="object-cover w-full h-full"
            />
        )
    }

    const renderExistingMedia = (photo: MemoryPhoto) => {
        const type = getMediaType(photo.photo_url)
        if (type === 'video') {
            return (
                <div className="w-full h-full flex items-center justify-center bg-black text-white">
                    <Video className="h-8 w-8" />
                </div>
            )
        }
        if (type === 'audio') {
            return (
                <div className="w-full h-full flex items-center justify-center bg-orange-100 text-orange-600">
                    <FileAudio className="h-8 w-8" />
                </div>
            )
        }
        return (
            <img
                src={photo.photo_url}
                alt="Memory media"
                className="object-cover w-full h-full"
            />
        )
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        เพิ่มความทรงจำ
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "แก้ไขความทรงจำ" : "เพิ่มความทรงจำใหม่"}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? "แก้ไขรายละเอียดความทรงจำ" : "บันทึกความทรงจำพิเศษของคุณ"}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>หัวข้อ *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="เช่น วันเกิดปีนี้" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>วันที่ *</FormLabel>
                                        <FormControl>
                                            <DatePicker
                                                value={field.value}
                                                onChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="location"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>สถานที่</FormLabel>
                                        <FormControl>
                                            <Input placeholder="เช่น บ้าน, ที่ทำงาน" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="mood"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>อารมณ์/ความรู้สึก</FormLabel>
                                    <FormControl>
                                        <Input placeholder="เช่น มีความสุขมาก! 🎉" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>รายละเอียด</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="บันทึกเรื่องราวความทรงจำ..."
                                            className="min-h-[100px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Media Upload Section */}
                        <div className="space-y-3">
                            <FormLabel>รูปภาพ / วิดีโอ / เสียง</FormLabel>

                            {/* Upload Area */}
                            <div
                                className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*,video/*,audio/*"
                                    multiple
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />
                                {uploadingPhotos ? (
                                    <div className="flex items-center justify-center gap-2 py-2">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span className="text-sm text-muted-foreground">กำลังอัปโหลด...</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 py-2">
                                        <Upload className="h-8 w-8 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">
                                            คลิกหรือลากไฟล์มาวางที่นี่
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            รองรับ รูปภาพ, วิดีโอ, เสียง (สูงสุด 50MB)
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Pending Files Preview (New Log) */}
                            {pendingFiles.length > 0 && (
                                <div className="grid grid-cols-4 gap-2">
                                    {pendingFiles.map((file, index) => (
                                        <div key={index} className="relative group">
                                            <div className="aspect-square rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                                                {renderPreview(file)}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removePendingFile(index)}
                                                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Existing Media (Edit Mode) */}
                            {photos.length > 0 && (
                                <div className="grid grid-cols-4 gap-2">
                                    {photos.map((photo) => (
                                        <div key={photo.id} className="relative group">
                                            <div className="aspect-square rounded-lg bg-muted overflow-hidden">
                                                {renderExistingMedia(photo)}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleDeletePhoto(photo.id)}
                                                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {photos.length === 0 && pendingFiles.length === 0 && (
                                <div className="text-sm text-muted-foreground text-center py-2">
                                    <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    ยังไม่มีไฟล์แนบ
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                ยกเลิก
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? "กำลังบันทึก..." : isEdit ? "บันทึก" : "เพิ่ม"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

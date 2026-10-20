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
                    <Button className="btn-pill-primary">
                        <Plus className="h-4 w-4 mr-2" />
                        เพิ่มความทรงจำ
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">{isEdit ? "แก้ไขความทรงจำ" : "เพิ่มความทรงจำใหม่"}</DialogTitle>
                    <DialogDescription className="text-spotify-muted">
                        {isEdit ? "แก้ไขรายละเอียดความทรงจำ" : "บันทึกความทรงจำพิเศษของคุณ"}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-spotify-label">หัวข้อ *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="เช่น วันเกิดปีนี้" className="spotify-input" {...field} />
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
                                        <FormLabel className="text-spotify-label">วันที่ *</FormLabel>
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
                                        <FormLabel className="text-spotify-label">สถานที่</FormLabel>
                                        <FormControl>
                                            <Input placeholder="เช่น บ้าน, ที่ทำงาน" className="spotify-input" {...field} />
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
                                    <FormLabel className="text-spotify-label">อารมณ์/ความรู้สึก</FormLabel>
                                    <FormControl>
                                        <Input placeholder="เช่น มีความสุขมาก! 🎉" className="spotify-input" {...field} />
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
                                    <FormLabel className="text-spotify-label">รายละเอียด</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="บันทึกเรื่องราวความทรงจำ..."
                                            className="bg-[#121212] border-none rounded-xl p-4 font-medium text-white shadow-inset min-h-[120px] focus:ring-1 focus:ring-white/20"
                                            style={{ resize: 'none' }}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Media Upload Section */}
                        <div className="space-y-4">
                            <FormLabel className="text-spotify-label">รูปภาพ / วิดีโอ / เสียง</FormLabel>

                            {/* Upload Area */}
                            <div
                                className="border-2 border-dashed border-white/5 rounded-xl p-8 text-center cursor-pointer hover:bg-white/5 hover:border-primary/50 transition-all group shadow-inset bg-[#121212]/50"
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
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <Loader2 className="h-10 w-10 text-primary animate-spin" />
                                        <span className="text-sm font-bold text-primary uppercase tracking-widest">Uploading...</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-[#282828] flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Upload className="h-6 w-6 text-[#b3b3b3] group-hover:text-primary transition-colors" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-white uppercase tracking-wider">เลือกไฟล์ หรือ ลากมาวาง</p>
                                            <p className="text-[10px] font-bold text-[#b3b3b3] uppercase tracking-[0.1em]">
                                                Support: Image, Video, Audio (Max 50MB)
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Pending Files Preview (New Log) */}
                            {pendingFiles.length > 0 && (
                                <div className="grid grid-cols-4 gap-3">
                                    {pendingFiles.map((file, index) => (
                                        <div key={index} className="relative group aspect-square rounded-lg overflow-hidden bg-[#282828] shadow-heavy">
                                            {renderPreview(file)}
                                            <button
                                                type="button"
                                                onClick={() => removePendingFile(index)}
                                                className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-destructive text-white rounded-full p-1.5 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all z-20"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Existing Media (Edit Mode) */}
                            {photos.length > 0 && (
                                <div className="grid grid-cols-4 gap-3">
                                    {photos.map((photo) => (
                                        <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden bg-[#282828] shadow-heavy">
                                            {renderExistingMedia(photo)}
                                            <button
                                                type="button"
                                                onClick={() => handleDeletePhoto(photo.id)}
                                                className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-destructive text-white rounded-full p-1.5 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all z-20"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <DialogFooter className="gap-3 pt-4 border-t border-white/5">
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-[#b3b3b3] hover:text-white">
                                ยกเลิก
                            </Button>
                            <Button type="submit" disabled={loading} className="btn-pill-primary min-w-[100px]">
                                {loading ? "กำลังบันทึก..." : isEdit ? "บันทึก" : "เพิ่มความทรงจำ"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

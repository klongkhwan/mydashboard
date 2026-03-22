"use client"

import React, { useState, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { VideoPlayer, Timeline, VideoFileList, MergeQueue } from '@/components/video-editor'
import { VideoFile, formatTime, parseTime } from '@/types/video-editor'
import {
    FolderSearch,
    Scissors,
    Layers,
    Play,
    Download,
    Loader2,
    Film,
    Zap,
    HardDrive,
    Clock,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── SSE stream reader ────────────────────────────────────────────────────────
async function readSSEStream(
    response: Response,
    onEvent: (event: Record<string, unknown>) => void
) {
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                try { onEvent(JSON.parse(line.slice(6))) } catch { /* ignore */ }
            }
        }
    }
}

export default function EditClipPage() {
    // ─── State ────────────────────────────────────────────────────────────────
    const [directoryPath, setDirectoryPath] = useState('')
    const [isScanning, setIsScanning] = useState(false)
    const [isLoadingInfo, setIsLoadingInfo] = useState(false)
    const [videoFiles, setVideoFiles] = useState<VideoFile[]>([])
    const [isDragOver, setIsDragOver] = useState(false)

    const [selectedFile, setSelectedFile] = useState<VideoFile | null>(null)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [seekTo, setSeekTo] = useState<number | undefined>(undefined)

    const [startTime, setStartTime] = useState(0)
    const [endTime, setEndTime] = useState(0)
    const [startTimeInput, setStartTimeInput] = useState('00:00:00')
    const [endTimeInput, setEndTimeInput] = useState('00:00:00')
    const [outputName, setOutputName] = useState('')
    const [isCutting, setIsCutting] = useState(false)

    const [selectedForMerge, setSelectedForMerge] = useState<string[]>([])
    const [mergeOutputName, setMergeOutputName] = useState('')
    const [isMerging, setIsMerging] = useState(false)

    const [progress, setProgress] = useState(0)

    // ─── Load real video info + thumbnails ────────────────────────────────────
    const loadVideoInfo = useCallback(async (filesToLoad: VideoFile[]) => {
        if (filesToLoad.length === 0) return
        setIsLoadingInfo(true)
        const batchSize = 3
        for (let i = 0; i < filesToLoad.length; i += batchSize) {
            const batch = filesToLoad.slice(i, i + batchSize)
            const results = await Promise.allSettled(
                batch.map(async (f) => {
                    const res = await fetch('/api/video/info', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ path: f.path }),
                    })
                    return { path: f.path, data: await res.json() }
                })
            )
            setVideoFiles((prev) => {
                const updated = [...prev]
                for (const result of results) {
                    if (result.status === 'fulfilled' && result.value.data.success) {
                        const { path: filePath, data } = result.value
                        const idx = updated.findIndex((f) => f.path === filePath)
                        if (idx >= 0) {
                            updated[idx] = {
                                ...updated[idx],
                                duration: data.duration,
                                width: data.width,
                                height: data.height,
                                codec: data.codec,
                                thumbnail: `/api/video/thumbnail?path=${encodeURIComponent(filePath)}`,
                            }
                        }
                    }
                }
                return updated
            })
        }
        setIsLoadingInfo(false)
    }, [])

    // ─── Scan directory ───────────────────────────────────────────────────────
    const handleScan = async () => {
        if (!directoryPath.trim()) {
            toast.error('กรุณาระบุ Path ของโฟลเดอร์')
            return
        }

        setIsScanning(true)
        let scannedFiles: VideoFile[] = []
        try {
            const res = await fetch('/api/video/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: directoryPath }),
            })
            const data = await res.json()
            if (data.success) {
                scannedFiles = data.files
                setVideoFiles(data.files)
                toast.success(`พบ ${data.files.length} ไฟล์วิดีโอ`)
            } else {
                toast.error(data.error || 'สแกนไม่สำเร็จ')
            }
        } catch {
            toast.error('เกิดข้อผิดพลาดในการสแกน')
        } finally {
            setIsScanning(false)
        }
        if (scannedFiles.length > 0) {
            loadVideoInfo(scannedFiles)
        }
    }

    // ─── OS Drag & Drop upload ────────────────────────────────────────────────
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        if (e.dataTransfer.types.includes('Files')) setIsDragOver(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false)
    }, [])

    const handleDrop = useCallback(
        async (e: React.DragEvent) => {
            e.preventDefault()
            setIsDragOver(false)

            const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm', '.m4v', '.mpeg', '.mpg', '.3gp']
            const dropped = Array.from(e.dataTransfer.files).filter((f) => {
                const ext = '.' + (f.name.split('.').pop() ?? '').toLowerCase()
                return videoExts.includes(ext)
            })

            if (dropped.length === 0) {
                toast.error('ไม่พบไฟล์วิดีโอ รองรับ: mp4, mov, avi, mkv, wmv, flv, webm')
                return
            }

            toast.info(`กำลังอัปโหลด ${dropped.length} ไฟล์...`)
            const uploaded: VideoFile[] = []

            for (const file of dropped) {
                const formData = new FormData()
                formData.append('file', file)
                try {
                    const res = await fetch('/api/video/upload', { method: 'POST', body: formData })
                    const data = await res.json()
                    if (data.success) {
                        uploaded.push({ name: data.name, path: data.path, size: data.size, duration: 0 })
                    }
                } catch {
                    /* skip failed file */
                }
            }

            if (uploaded.length > 0) {
                setVideoFiles((prev) => [...prev, ...uploaded])
                toast.success(`อัปโหลดสำเร็จ ${uploaded.length} ไฟล์`)
                loadVideoInfo(uploaded)
            }
        },
        [loadVideoInfo]
    )

    // ─── File select ──────────────────────────────────────────────────────────
    const handleFileSelect = useCallback((file: VideoFile) => {
        setSelectedFile(file)
        setCurrentTime(0)
        setStartTime(0)
        setEndTime(file.duration)
        setStartTimeInput('00:00:00')
        setEndTimeInput(formatTime(file.duration))
        setOutputName(`${file.name.replace(/\.[^/.]+$/, '')}_cut`)
    }, [])

    // ─── Merge queue management ───────────────────────────────────────────────
    const handleMergeSelect = useCallback((path: string, checked: boolean) => {
        setSelectedForMerge((prev) =>
            checked ? [...prev, path] : prev.filter((p) => p !== path)
        )
    }, [])

    const handleMergeRemove = useCallback((path: string) => {
        setSelectedForMerge((prev) => prev.filter((p) => p !== path))
    }, [])

    const handleMergeReorder = useCallback((fromIndex: number, toIndex: number) => {
        setSelectedForMerge((prev) => {
            const newList = [...prev]
            const [removed] = newList.splice(fromIndex, 1)
            newList.splice(toIndex, 0, removed)
            return newList
        })
    }, [])

    // ─── Video player callbacks ───────────────────────────────────────────────
    const handleTimeUpdate = useCallback((time: number, dur: number) => {
        setCurrentTime(time)
        setDuration(dur)
    }, [])

    const handleLoadedMetadata = useCallback((dur: number) => {
        setDuration(dur)
        setEndTime(dur)
        setEndTimeInput(formatTime(dur))
    }, [])

    const handleSeek = useCallback((time: number) => {
        setSeekTo(time)
        setCurrentTime(time)
        setTimeout(() => setSeekTo(undefined), 100)
    }, [])

    // ─── Timeline callbacks ───────────────────────────────────────────────────
    const handleStartTimeChange = useCallback((time: number) => {
        setStartTime(time)
        setStartTimeInput(formatTime(time))
    }, [])

    const handleEndTimeChange = useCallback((time: number) => {
        setEndTime(time)
        setEndTimeInput(formatTime(time))
    }, [])

    const handleStartTimeInputChange = (value: string) => {
        setStartTimeInput(value)
        const seconds = parseTime(value)
        if (seconds >= 0 && seconds < endTime) setStartTime(seconds)
    }

    const handleEndTimeInputChange = (value: string) => {
        setEndTimeInput(value)
        const seconds = parseTime(value)
        if (seconds > startTime && seconds <= duration) setEndTime(seconds)
    }

    // ─── Cut (SSE) ────────────────────────────────────────────────────────────
    const handleCut = async () => {
        if (!selectedFile) {
            toast.error('กรุณาเลือกวิดีโอที่ต้องการตัด')
            return
        }
        setIsCutting(true)
        setProgress(0)
        try {
            const res = await fetch('/api/video/cut', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    inputPath: selectedFile.path,
                    startTime: startTimeInput,
                    endTime: endTimeInput,
                    outputName: outputName || 'output',
                }),
            })
            if (!res.body) throw new Error('No response body')
            await readSSEStream(res, (event) => {
                if (typeof event.progress === 'number') setProgress(event.progress)
                if (event.done) {
                    if (event.outputFile) {
                        toast.success('ตัดวิดีโอสำเร็จ!', {
                            description: `บันทึกที่: ${event.outputFile}`,
                            duration: 8000,
                        })
                    } else if (event.error) {
                        toast.error(event.error as string)
                    }
                }
            })
        } catch {
            toast.error('เกิดข้อผิดพลาดในการตัดวิดีโอ')
        } finally {
            setIsCutting(false)
            setTimeout(() => setProgress(0), 2000)
        }
    }

    // ─── Merge (SSE) ─────────────────────────────────────────────────────────
    const mergeQueueFiles = videoFiles
        .filter((f) => selectedForMerge.includes(f.path))
        .sort((a, b) => selectedForMerge.indexOf(a.path) - selectedForMerge.indexOf(b.path))

    const handleMerge = async () => {
        if (selectedForMerge.length < 2) {
            toast.error('กรุณาเลือกอย่างน้อย 2 ไฟล์เพื่อรวม')
            return
        }
        setIsMerging(true)
        setProgress(0)
        const totalDuration = mergeQueueFiles.reduce((sum, f) => sum + f.duration, 0)
        try {
            const res = await fetch('/api/video/merge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    files: selectedForMerge,
                    outputName: mergeOutputName || 'merged_output',
                    totalDuration,
                }),
            })
            if (!res.body) throw new Error('No response body')
            await readSSEStream(res, (event) => {
                if (typeof event.progress === 'number') setProgress(event.progress)
                if (event.done) {
                    if (event.outputFile) {
                        toast.success('รวมวิดีโอสำเร็จ!', {
                            description: `บันทึกที่: ${event.outputFile}`,
                            duration: 8000,
                        })
                        setSelectedForMerge([])
                    } else if (event.error) {
                        toast.error(event.error as string)
                    }
                }
            })
        } catch {
            toast.error('เกิดข้อผิดพลาดในการรวมวิดีโอ')
        } finally {
            setIsMerging(false)
            setTimeout(() => setProgress(0), 2000)
        }
    }

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div
            className="p-6 space-y-6 relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* OS file drop overlay */}
            {isDragOver && (
                <div className="absolute inset-0 z-50 m-2 rounded-2xl border-2 border-dashed border-primary bg-primary/5 backdrop-blur-sm flex flex-col items-center justify-center gap-3 pointer-events-none">
                    <div className="p-4 rounded-full bg-primary/10 border border-primary/30">
                        <Film className="w-10 h-10 text-primary" />
                    </div>
                    <p className="text-lg font-semibold text-primary">วางไฟล์วิดีโอที่นี่</p>
                    <p className="text-sm text-muted-foreground">รองรับ mp4, mov, avi, mkv, wmv, flv, webm</p>
                </div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30">
                            <Film className="w-6 h-6 text-primary" />
                        </div>
                        Video Editor Tool
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        ตัดต่อวิดีโอแบบ Lossless ไม่เสียคุณภาพ • Stream Copy with FFmpeg
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground bg-card px-3 py-1.5 rounded-lg border border-border">
                        <Zap className="w-3 h-3 text-primary" />
                        No Re-encoding
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground bg-card px-3 py-1.5 rounded-lg border border-border">
                        <HardDrive className="w-3 h-3 text-accent" />
                        100% Quality
                    </div>
                </div>
            </div>

            {/* Directory Scanner */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <FolderSearch className="w-4 h-4 text-primary" />
                        Scan Directory
                    </CardTitle>
                    <CardDescription>
                        กรอก Path ของโฟลเดอร์ที่เก็บไฟล์วิดีโอในเครื่อง หรือลากไฟล์วิดีโอจาก Windows Explorer มาวางที่หน้านี้ได้เลย
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-3">
                        <Input
                            placeholder="C:\Videos หรือ D:\Movies"
                            value={directoryPath}
                            onChange={(e) => setDirectoryPath(e.target.value)}
                            className="flex-1"
                            onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                        />
                        <Button onClick={handleScan} disabled={isScanning}>
                            {isScanning ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Scanning...
                                </>
                            ) : (
                                <>
                                    <FolderSearch className="w-4 h-4" />
                                    Scan
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Info loading indicator */}
            {isLoadingInfo && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    <span>กำลังโหลดข้อมูลวิดีโอ (duration, thumbnail)...</span>
                </div>
            )}

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Video File List */}
                <div className="lg:col-span-1">
                    <VideoFileList
                        files={videoFiles}
                        selectedFile={selectedFile}
                        selectedForMerge={selectedForMerge}
                        onFileSelect={handleFileSelect}
                        onMergeSelect={handleMergeSelect}
                        isLoading={isScanning}
                    />
                </div>

                {/* Video Player & Controls */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Video Player */}
                    <VideoPlayer
                        src={selectedFile ? `/api/video/stream?path=${encodeURIComponent(selectedFile.path)}` : null}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        seekTo={seekTo}
                    />

                    {/* Timeline */}
                    {selectedFile && (
                        <Card>
                            <CardContent className="pt-4">
                                <Timeline
                                    duration={duration}
                                    currentTime={currentTime}
                                    startTime={startTime}
                                    endTime={endTime}
                                    onStartTimeChange={handleStartTimeChange}
                                    onEndTimeChange={handleEndTimeChange}
                                    onSeek={handleSeek}
                                />
                            </CardContent>
                        </Card>
                    )}

                    {/* Tabs: Cut / Merge */}
                    <Tabs defaultValue="cut" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="cut" className="flex items-center gap-2">
                                <Scissors className="w-4 h-4" />
                                Cut Video
                            </TabsTrigger>
                            <TabsTrigger value="merge" className="flex items-center gap-2">
                                <Layers className="w-4 h-4" />
                                Merge Videos
                            </TabsTrigger>
                        </TabsList>

                        {/* Cut Tab */}
                        <TabsContent value="cut">
                            <Card>
                                <CardContent className="pt-6 space-y-4">
                                    {/* Time Inputs */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm text-muted-foreground flex items-center gap-2">
                                                <Play className="w-3 h-3 text-primary" />
                                                Start Time
                                            </label>
                                            <Input
                                                value={startTimeInput}
                                                onChange={(e) => handleStartTimeInputChange(e.target.value)}
                                                placeholder="00:00:00"
                                                className="font-mono"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm text-muted-foreground flex items-center gap-2">
                                                <Clock className="w-3 h-3 text-accent" />
                                                End Time
                                            </label>
                                            <Input
                                                value={endTimeInput}
                                                onChange={(e) => handleEndTimeInputChange(e.target.value)}
                                                placeholder="00:00:00"
                                                className="font-mono"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm text-muted-foreground">Duration</label>
                                            <div className="h-9 px-3 flex items-center rounded-md border border-primary/30 bg-primary/10 text-primary font-mono font-semibold">
                                                {formatTime(endTime - startTime)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Output Name */}
                                    <div className="space-y-2">
                                        <label className="text-sm text-muted-foreground flex items-center gap-2">
                                            <Download className="w-3 h-3" />
                                            Output Filename
                                        </label>
                                        <Input
                                            value={outputName}
                                            onChange={(e) => setOutputName(e.target.value)}
                                            placeholder="output_filename"
                                        />
                                    </div>

                                    {/* Progress */}
                                    {isCutting && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Processing...</span>
                                                <span className="text-primary font-mono">{progress}%</span>
                                            </div>
                                            <Progress value={progress} />
                                        </div>
                                    )}

                                    {/* Cut Button */}
                                    <Button
                                        className="w-full"
                                        size="lg"
                                        onClick={handleCut}
                                        disabled={!selectedFile || isCutting}
                                    >
                                        {isCutting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Cutting...
                                            </>
                                        ) : (
                                            <>
                                                <Scissors className="w-4 h-4" />
                                                Cut Video - Lossless
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Merge Tab */}
                        <TabsContent value="merge">
                            <Card>
                                <CardContent className="pt-6 space-y-4">
                                    {/* Merge Queue */}
                                    <MergeQueue
                                        files={mergeQueueFiles}
                                        onRemove={handleMergeRemove}
                                        onReorder={handleMergeReorder}
                                    />

                                    {/* Output Name */}
                                    <div className="space-y-2">
                                        <label className="text-sm text-muted-foreground flex items-center gap-2">
                                            <Download className="w-3 h-3" />
                                            Output Filename
                                        </label>
                                        <Input
                                            value={mergeOutputName}
                                            onChange={(e) => setMergeOutputName(e.target.value)}
                                            placeholder="merged_output"
                                        />
                                    </div>

                                    {/* Progress */}
                                    {isMerging && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Merging...</span>
                                                <span className="text-primary font-mono">{progress}%</span>
                                            </div>
                                            <Progress value={progress} />
                                        </div>
                                    )}

                                    {/* Merge Button */}
                                    <Button
                                        className="w-full"
                                        size="lg"
                                        onClick={handleMerge}
                                        disabled={selectedForMerge.length < 2 || isMerging}
                                    >
                                        {isMerging ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Merging...
                                            </>
                                        ) : (
                                            <>
                                                <Layers className="w-4 h-4" />
                                                Merge Videos - Lossless
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}

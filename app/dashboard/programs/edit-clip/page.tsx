'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    BadgeInfo,
    CheckCircle2,
    CirclePlay,
    Clapperboard,
    Download,
    Film,
    Gauge,
    Loader2,
    Pause,
    Play,
    Redo2,
    Repeat,
    Undo2,
    Upload,
    Volume1,
    Volume2,
    VolumeX,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
    clamp,
    formatBytes,
    shortTime,
    timelineMarkers,
    uploadMedia,
    validateTrimRange,
} from '@/components/video-editor/edit-clip-utils'
import type { EditorProject, EditorSnapshot, ExportResult, UploadState } from '@/components/video-editor/edit-clip.types'

const PLAYBACK_RATES = [0.5, 1, 1.5, 2]
const MAX_VIDEO_BYTES = 500 * 1024 * 1024
const VIDEO_PATTERN = /\.(mp4|mov|webm|m4v)$/i

const isTypingTarget = (target: EventTarget | null) => {
    const el = target as HTMLElement | null
    if (!el) return false
    return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable
}

export default function EditClipPage() {
    // ------------------------------------------------------------- source state
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [uploadedPath, setUploadedPath] = useState<string | null>(null)
    const [uploadState, setUploadState] = useState<UploadState>('idle')
    const [metadataStatus, setMetadataStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
    const [uploadProgress, setUploadProgress] = useState(0)
    const [videoUrl, setVideoUrl] = useState<string | null>(null)
    const [dragActive, setDragActive] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)

    // ----------------------------------------------------------- project state
    const [trimStart, setTrimStart] = useState(0)
    const [trimEnd, setTrimEnd] = useState(0)
    const [volume, setVolume] = useState(80)
    const [originalMuted, setOriginalMuted] = useState(false)
    const [aspectRatio, setAspectRatio] = useState<'9:16' | '1:1' | '16:9'>('9:16')
    const [quality, setQuality] = useState<'720p' | '1080p'>('720p')
    const [outputName, setOutputName] = useState('tiktok_edit')

    // ---------------------------------------------------------- playback state
    const [duration, setDuration] = useState(0)
    const [currentTime, setCurrentTime] = useState(0)
    const [playing, setPlaying] = useState(false)
    const [playbackRate, setPlaybackRate] = useState(1)
    const [loopTrim, setLoopTrim] = useState(true)

    // ------------------------------------------------------------ export state
    const [exporting, setExporting] = useState(false)
    const [progress, setProgress] = useState(0)
    const [exportResult, setExportResult] = useState<ExportResult | null>(null)
    const [exportJobId, setExportJobId] = useState<string | null>(null)
    const [exportError, setExportError] = useState<string | null>(null)

    // ------------------------------------------------------- input edit states
    const [trimStartInput, setTrimStartInput] = useState('0.0')
    const [trimEndInput, setTrimEndInput] = useState('0.0')
    const [isEditingStart, setIsEditingStart] = useState(false)
    const [isEditingEnd, setIsEditingEnd] = useState(false)

    // ------------------------------------------------------------ history refs
    const historyRef = useRef<EditorSnapshot[]>([])
    const futureRef = useRef<EditorSnapshot[]>([])
    const [historyCount, setHistoryCount] = useState(0)
    const [futureCount, setFutureCount] = useState(0)
    const pendingBeforeSnapshot = useRef<EditorSnapshot | null>(null)
    const uploadAbortControllerRef = useRef<AbortController | null>(null)
    const activeSourceTokenRef = useRef<string>('')

    const trimStartRef = useRef(trimStart)
    const trimEndRef = useRef(trimEnd)
    const volumeRef = useRef(volume)
    const originalMutedRef = useRef(originalMuted)
    const aspectRatioRef = useRef(aspectRatio)
    const outputNameRef = useRef(outputName)
    const durationRef = useRef(duration)

    useEffect(() => {
        trimStartRef.current = trimStart
        trimEndRef.current = trimEnd
        volumeRef.current = volume
        originalMutedRef.current = originalMuted
        aspectRatioRef.current = aspectRatio
        outputNameRef.current = outputName
        durationRef.current = duration
    }, [aspectRatio, duration, originalMuted, outputName, trimEnd, trimStart, volume])

    // Sync input displays with numerical state when not actively typing
    useEffect(() => {
        if (!isEditingStart) {
            setTrimStartInput(trimStart.toFixed(1))
        }
    }, [trimStart, isEditingStart])

    useEffect(() => {
        if (!isEditingEnd) {
            setTrimEndInput(trimEnd.toFixed(1))
        }
    }, [trimEnd, isEditingEnd])

    // -------------------------------------------------------------- validation
    const trimValidation = useMemo(() => {
        return validateTrimRange(trimStart, trimEnd, duration)
    }, [duration, trimEnd, trimStart])

    const clipLength = Math.max(0, trimEnd - trimStart)
    const readyToExport =
        uploadState === 'ready' &&
        Boolean(uploadedPath) &&
        metadataStatus === 'ready' &&
        duration > 0 &&
        trimValidation.valid

    // ------------------------------------------------------- undo / redo logic
    const getLatestSnapshot = useCallback(
        (): EditorSnapshot => ({
            trimStart: trimStartRef.current,
            trimEnd: trimEndRef.current,
            volume: volumeRef.current,
            originalMuted: originalMutedRef.current,
            aspectRatio: aspectRatioRef.current,
            outputName: outputNameRef.current,
        }),
        []
    )

    const startTransaction = useCallback(() => {
        if (!pendingBeforeSnapshot.current) {
            pendingBeforeSnapshot.current = getLatestSnapshot()
        }
    }, [getLatestSnapshot])

    const commitTransaction = useCallback(() => {
        if (pendingBeforeSnapshot.current) {
            const before = pendingBeforeSnapshot.current
            const current = getLatestSnapshot()
            if (
                before.trimStart !== current.trimStart ||
                before.trimEnd !== current.trimEnd ||
                before.volume !== current.volume ||
                before.originalMuted !== current.originalMuted ||
                before.aspectRatio !== current.aspectRatio ||
                before.outputName !== current.outputName
            ) {
                historyRef.current.push(before)
                if (historyRef.current.length > 30) historyRef.current.shift()
                futureRef.current = []
                setHistoryCount(historyRef.current.length)
                setFutureCount(0)
            }
            pendingBeforeSnapshot.current = null
        }
    }, [getLatestSnapshot])

    const commitTransactionRef = useRef(commitTransaction)
    commitTransactionRef.current = commitTransaction

    const recordAtomicChange = useCallback(
        (updater: () => void) => {
            const before = getLatestSnapshot()
            updater()
            historyRef.current.push(before)
            if (historyRef.current.length > 30) historyRef.current.shift()
            futureRef.current = []
            setHistoryCount(historyRef.current.length)
            setFutureCount(0)
        },
        [getLatestSnapshot]
    )

    const restoreSnapshot = useCallback((state: EditorSnapshot) => {
        trimStartRef.current = state.trimStart
        trimEndRef.current = state.trimEnd
        volumeRef.current = state.volume
        originalMutedRef.current = state.originalMuted
        aspectRatioRef.current = state.aspectRatio
        outputNameRef.current = state.outputName

        setTrimStart(state.trimStart)
        setTrimEnd(state.trimEnd)
        setVolume(state.volume)
        setOriginalMuted(state.originalMuted)
        setAspectRatio(state.aspectRatio)
        setOutputName(state.outputName)
    }, [])

    const undo = useCallback(() => {
        const previous = historyRef.current.pop()
        if (!previous) return toast.error('ไม่มีอะไรให้ย้อนกลับ')
        futureRef.current.push(getLatestSnapshot())
        restoreSnapshot(previous)
        setHistoryCount(historyRef.current.length)
        setFutureCount(futureRef.current.length)
        toast.success('ย้อนกลับ (Undo)')
    }, [getLatestSnapshot, restoreSnapshot])

    const redo = useCallback(() => {
        const next = futureRef.current.pop()
        if (!next) return toast.error('ไม่มีอะไรให้ทำซ้ำ')
        historyRef.current.push(getLatestSnapshot())
        restoreSnapshot(next)
        setHistoryCount(historyRef.current.length)
        setFutureCount(futureRef.current.length)
        toast.success('ทำซ้ำ (Redo)')
    }, [getLatestSnapshot, restoreSnapshot])

    // ------------------------------------------------------ upload & source
    const clearVideoUrl = useCallback(() => {
        setVideoUrl((prev) => {
            if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
            return null
        })
    }, [])

    const onPickFiles = useCallback(
        async (picked: FileList | File[] | null) => {
            if (!picked) return
            const files = Array.from(picked)
            if (!files.length) return
            const file = files.find((f) => VIDEO_PATTERN.test(f.name))
            if (!file) {
                toast.error('รองรับเฉพาะ MP4, MOV, WebM')
                return
            }
            if (file.size > MAX_VIDEO_BYTES) {
                toast.error(`ไฟล์ใหญ่เกิน 500MB (${formatBytes(file.size)})`)
                return
            }

            // Abort running upload
            uploadAbortControllerRef.current?.abort()
            const abortController = new AbortController()
            uploadAbortControllerRef.current = abortController
            const sourceToken = `${Date.now()}_${Math.random()}`
            activeSourceTokenRef.current = sourceToken

            // Reset project state & history for the new source immediately
            setSelectedFile(file)
            setUploadedPath(null)
            setExportResult(null)
            setExportError(null)
            setMetadataStatus('loading')

            // Reset time and trim immediately so previous file's duration/trim is never used
            setDuration(0)
            durationRef.current = 0
            setTrimStart(0)
            trimStartRef.current = 0
            setTrimEnd(0)
            trimEndRef.current = 0
            setCurrentTime(0)
            setTrimStartInput('0.0')
            setTrimEndInput('0.0')

            historyRef.current = []
            futureRef.current = []
            setHistoryCount(0)
            setFutureCount(0)
            pendingBeforeSnapshot.current = null

            const url = URL.createObjectURL(file)
            clearVideoUrl()
            setVideoUrl(url)
            setUploadState('uploading')
            setUploadProgress(0)

            try {
                const uploaded = await uploadMedia(file, {
                    kind: 'video',
                    fileName: file.name,
                    onProgress: setUploadProgress,
                    signal: abortController.signal,
                })
                if (activeSourceTokenRef.current !== sourceToken) return
                setUploadedPath(uploaded.path)
                setUploadState('ready')
                toast.success('อัปโหลดไฟล์สำเร็จ — พร้อม export')
            } catch (error: any) {
                if (error?.name === 'AbortError' || activeSourceTokenRef.current !== sourceToken) {
                    return
                }
                setUploadState('error')
                toast.error(error instanceof Error ? error.message : 'อัปโหลดไฟล์ไม่สำเร็จ')
            }
        },
        [clearVideoUrl]
    )

    const onDrop = useCallback(
        (event: React.DragEvent<HTMLLabelElement>) => {
            event.preventDefault()
            setDragActive(false)
            void onPickFiles(event.dataTransfer?.files ?? null)
        },
        [onPickFiles]
    )

    useEffect(() => () => clearVideoUrl(), [clearVideoUrl])

    // ------------------------------------------------------------- playback
    const seek = useCallback(
        (time: number) => {
            if (!videoRef.current) return
            videoRef.current.currentTime = clamp(time, 0, duration || 0)
            setCurrentTime(videoRef.current.currentTime)
        },
        [duration]
    )

    const togglePlay = useCallback(async () => {
        const video = videoRef.current
        if (!video) return
        if (video.paused) {
            if (trimEnd > trimStart && (video.currentTime < trimStart || video.currentTime >= trimEnd - 0.05)) {
                video.currentTime = trimStart
            }
            await video.play()
        } else {
            video.pause()
        }
    }, [trimEnd, trimStart])

    const handleLoadedMetadata = () => {
        const video = videoRef.current
        const dur = video?.duration || 0
        if (!Number.isFinite(dur) || dur <= 0) {
            setMetadataStatus('error')
            toast.error('ไม่สามารถอ่านความยาวของวิดีโอได้')
            return
        }
        setDuration(dur)
        durationRef.current = dur
        if (video) {
            video.volume = originalMutedRef.current ? 0 : volumeRef.current / 100
            video.playbackRate = playbackRate
        }
        // When a new file is loaded, reset trim to the entire video [0, dur]
        setTrimStart(0)
        setTrimEnd(dur)
        trimStartRef.current = 0
        trimEndRef.current = dur
        setTrimStartInput('0.0')
        setTrimEndInput(dur.toFixed(1))
        setCurrentTime(0)
        setMetadataStatus('ready')
    }

    const handleTimeUpdate = () => {
        const video = videoRef.current
        if (!video) return
        if (loopTrim && trimEnd > trimStart && video.currentTime >= trimEnd - 0.03) {
            video.currentTime = trimStart
            setCurrentTime(trimStart)
            return
        }
        if (!loopTrim && trimEnd > trimStart && video.currentTime >= trimEnd) {
            video.pause()
            setPlaying(false)
            video.currentTime = trimEnd
            setCurrentTime(trimEnd)
            return
        }
        setCurrentTime(video.currentTime)
    }

    const handleSourceError = () => {
        setMetadataStatus('error')
        toast.error('เบราว์เซอร์เล่นไฟล์นี้ไม่ได้ — ไม่สามารถอ่าน metadata สำหรับกำหนดช่วงได้ กรุณาใช้ MP4 หรือ WebM')
    }

    useEffect(() => {
        if (videoRef.current) videoRef.current.volume = originalMuted ? 0 : volume / 100
    }, [volume, originalMuted, videoUrl])

    useEffect(() => {
        if (videoRef.current) videoRef.current.playbackRate = playbackRate
    }, [playbackRate, videoUrl])

    // ----------------------------------------------------------- trim handlers
    const applyTrimStart = (value: number) => {
        const clamped = clamp(value, 0, Math.max(0, trimEndRef.current - 0.1))
        trimStartRef.current = clamped
        setTrimStart(clamped)
    }

    const applyTrimEnd = (value: number) => {
        const clamped = clamp(value, trimStartRef.current + 0.1, durationRef.current || value)
        trimEndRef.current = clamped
        setTrimEnd(clamped)
    }

    const handleCommitTrimStart = () => {
        setIsEditingStart(false)
        const val = parseFloat(trimStartInput)
        if (isNaN(val) || val < 0) {
            toast.error('เวลาเริ่มต้นต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0')
            setTrimStartInput(trimStart.toFixed(1))
            return
        }
        if (val >= trimEnd) {
            toast.error('เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด')
            setTrimStartInput(trimStart.toFixed(1))
            return
        }
        if (val !== trimStart) {
            recordAtomicChange(() => {
                applyTrimStart(val)
            })
        }
    }

    const handleCommitTrimEnd = () => {
        setIsEditingEnd(false)
        const val = parseFloat(trimEndInput)
        if (isNaN(val) || val <= trimStart) {
            toast.error('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น')
            setTrimEndInput(trimEnd.toFixed(1))
            return
        }
        if (duration > 0 && val > duration) {
            toast.error(`เวลาสิ้นสุดต้องไม่เกินความยาววิดีโอ (${duration.toFixed(1)}s)`)
            setTrimEndInput(trimEnd.toFixed(1))
            return
        }
        if (val !== trimEnd) {
            recordAtomicChange(() => {
                applyTrimEnd(val)
            })
        }
    }

    // Pointer Drag Handle with Pointer Capture
    const startPointerDrag = (which: 'start' | 'end') => (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        startTransaction()

        const timeline = document.getElementById('edit-clip-timeline')
        if (!timeline) return

        const handlePointerMove = (ev: PointerEvent) => {
            const rect = timeline.getBoundingClientRect()
            if (rect.width <= 0) return
            const time = clamp(
                ((ev.clientX - rect.left) / rect.width) * (durationRef.current || 1),
                0,
                durationRef.current || 0
            )
            if (which === 'start') {
                applyTrimStart(time)
            } else {
                applyTrimEnd(time)
            }
        }

        const handlePointerUp = () => {
            window.removeEventListener('pointermove', handlePointerMove)
            window.removeEventListener('pointerup', handlePointerUp)
            commitTransactionRef.current()
        }

        window.addEventListener('pointermove', handlePointerMove)
        window.addEventListener('pointerup', handlePointerUp)
    }

    const onHandleKeyDown = (which: 'start' | 'end') => (e: React.KeyboardEvent) => {
        const step = e.shiftKey ? 1.0 : 0.1
        if (e.key === 'ArrowLeft') {
            e.preventDefault()
            recordAtomicChange(() => {
                if (which === 'start') applyTrimStart(trimStart - step)
                else applyTrimEnd(trimEnd - step)
            })
        } else if (e.key === 'ArrowRight') {
            e.preventDefault()
            recordAtomicChange(() => {
                if (which === 'start') applyTrimStart(trimStart + step)
                else applyTrimEnd(trimEnd + step)
            })
        } else if (e.key === 'Home') {
            e.preventDefault()
            recordAtomicChange(() => {
                if (which === 'start') applyTrimStart(0)
                else applyTrimEnd(trimStart + 0.1)
            })
        } else if (e.key === 'End') {
            e.preventDefault()
            recordAtomicChange(() => {
                if (which === 'start') applyTrimStart(trimEnd - 0.1)
                else applyTrimEnd(duration)
            })
        }
    }

    // Track click
    const onTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect()
        if (rect.width > 0) {
            seek(((e.clientX - rect.left) / rect.width) * (duration || 1))
        }
    }

    // ------------------------------------------------------------- shortcuts
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (isTypingTarget(e.target)) return
            const ctrl = e.ctrlKey || e.metaKey
            if (ctrl && e.key.toLowerCase() === 'z') {
                e.preventDefault()
                if (e.shiftKey) redo()
                else undo()
                return
            }
            if (ctrl && e.key.toLowerCase() === 'y') {
                e.preventDefault()
                redo()
                return
            }
            if (ctrl) return

            if (e.code === 'Space') {
                e.preventDefault()
                void togglePlay()
            }
            if (e.key === '[') {
                recordAtomicChange(() => applyTrimStart(currentTime))
            }
            if (e.key === ']') {
                recordAtomicChange(() => applyTrimEnd(currentTime))
            }
            if (e.key === 'ArrowLeft') seek(currentTime - 1)
            if (e.key === 'ArrowRight') seek(currentTime + 1)
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [currentTime, duration, recordAtomicChange, redo, seek, togglePlay, undo])

    // ---------------------------------------------------------------- export
    const exportSettings = useMemo(
        () => ({
            videoId: uploadedPath ?? '',
            trimStart,
            trimEnd,
            effects: {
                filter: 'None',
                brightness: 0,
                contrast: 0,
                saturation: 0,
                transition: 'None',
                background: { mode: 'Black', color: '#000000' },
            },
            subtitles: [],
            burnSubtitles: false,
            audio: {
                originalVolume: volume,
                originalMuted,
                bgmVolume: 0,
                voiceoverRecording: false,
                voiceoverUrl: null,
                musicUrl: null,
                musicName: null,
            },
            format: {
                aspectRatio,
                durationLimit: 'unlimited',
                thumbnailTime: currentTime,
                watermark: { enabled: false, text: '', position: 'bottom-right', opacity: 0 },
                quality,
            },
            outputName: outputName.trim() || 'clip_export',
        }),
        [aspectRatio, currentTime, originalMuted, outputName, quality, trimEnd, trimStart, uploadedPath, volume]
    )

    const handleExport = async () => {
        if (!readyToExport) {
            return toast.error(
                uploadState === 'uploading'
                    ? 'กำลังอัปโหลด — กรุณารอสักครู่'
                    : 'อัปโหลดวิดีโอและเลือกช่วงเวลาที่ถูกต้องก่อน export'
            )
        }
        if (exporting) return

        setExporting(true)
        setExportResult(null)
        setExportError(null)
        setProgress(1)

        try {
            const res = await fetch('/api/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(exportSettings),
            })

            if (res.status === 401) {
                throw new Error('Session หมดอายุ กรุณาเข้าสู่ระบบใหม่')
            }

            const contentType = res.headers.get('Content-Type') || ''
            if (!res.ok) {
                let errorMsg = `Server error (${res.status})`
                if (contentType.includes('application/json')) {
                    const errJson = await res.json().catch(() => null)
                    if (errJson?.error) errorMsg = errJson.error
                } else {
                    const errText = await res.text().catch(() => '')
                    if (errText) errorMsg = errText.slice(0, 200)
                }
                throw new Error(errorMsg)
            }

            const jobId = res.headers.get('X-Job-Id')
            if (jobId) setExportJobId(jobId)
            if (!res.body) throw new Error('ไม่พบข้อมูลการตอบกลับจากเซิร์ฟเวอร์')

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let terminalReceived = false
            let exportErrorMsg: string | null = null

            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                buffer += decoder.decode(value, { stream: true })
                const parts = buffer.split('\n\n')
                buffer = parts.pop() ?? ''
                for (const part of parts) {
                    const line = part.split('\n').find((l) => l.startsWith('data: '))
                    if (!line) continue
                    const evt = JSON.parse(line.slice(6))
                    if (typeof evt.progress === 'number') {
                        setProgress(evt.progress)
                    }
                    if (Array.isArray(evt.warnings)) {
                        evt.warnings.forEach((warning: string) => toast.warning(warning))
                    }
                    if (evt.done) {
                        terminalReceived = true
                        if (evt.status === 'error' || evt.error) {
                            exportErrorMsg = evt.error || 'การ export ล้มเหลว'
                        } else if (evt.outputFile && evt.downloadUrl) {
                            setExportResult({ outputFile: evt.outputFile, downloadUrl: evt.downloadUrl })
                            toast.success('Export เสร็จสมบูรณ์', { description: evt.outputName || 'วิดีโอพร้อมดาวน์โหลด' })
                        }
                    }
                }
            }

            if (!terminalReceived) {
                throw new Error('การเชื่อมต่อขาดหายระหว่าง export กรุณาลองใหม่อีกครั้ง')
            }
            if (exportErrorMsg) {
                throw new Error(exportErrorMsg)
            }
            setProgress(100)
        } catch (error) {
            setProgress(0)
            const msg = error instanceof Error ? error.message : 'Export ไม่สำเร็จ'
            setExportError(msg)
            toast.error(msg)
        } finally {
            setExporting(false)
        }
    }

    const pct = (time: number) => (duration ? clamp((time / duration) * 100, 0, 100) : 0)

    return (
        <div className="min-h-screen bg-background text-white">
            <div className="border-b border-white/5 bg-sidebar">
                <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 py-5">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                            <Clapperboard className="h-4 w-4 text-primary" />
                            Programs · Clip Editor
                        </div>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">Video Clip Editor</h1>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-spotify-muted">
                        <BadgeInfo className="h-4 w-4 text-primary" />
                        {exportJobId ? `Job ${exportJobId.slice(0, 8)}` : 'Milestone A: โหมด 1 ช่วงคลิป'}
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-[1600px] px-6 py-6">
                <div className="grid min-h-[calc(100vh-140px)] grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
                    {/* ------------------------------------------------ left */}
                    <aside className="space-y-6">
                        <Card className="border-white/10 bg-white/5 text-white">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Upload className="h-4 w-4 text-[#fe2c55]" />
                                    Upload
                                </CardTitle>
                                <CardDescription className="text-white/50">MP4, MOV, WebM — สูงสุด 500MB</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <label
                                    onDragOver={(e) => {
                                        e.preventDefault()
                                        setDragActive(true)
                                    }}
                                    onDragLeave={() => setDragActive(false)}
                                    onDrop={onDrop}
                                    className={cn(
                                        'flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-8 text-center transition',
                                        dragActive
                                            ? 'border-[#fe2c55] bg-[#fe2c55]/10'
                                            : 'border-white/15 bg-black/20 hover:border-[#fe2c55]/60 hover:bg-[#fe2c55]/5'
                                    )}
                                >
                                    <input
                                        type="file"
                                        accept="video/mp4,video/quicktime,video/webm"
                                        className="hidden"
                                        onChange={(e) => void onPickFiles(e.target.files)}
                                    />
                                    <Film className="h-10 w-10 text-[#fe2c55]" />
                                    <span className="mt-3 font-medium">ลากไฟล์มาวาง หรือคลิกเพื่อเลือก</span>
                                    <span className="mt-1 text-xs text-white/45">ไฟล์จะถูกอัปโหลดเพื่อใช้ตอน export</span>
                                </label>

                                {uploadState === 'uploading' && (
                                    <div className="space-y-2">
                                        <Progress value={uploadProgress} />
                                        <div className="text-xs text-white/55">กำลังอัปโหลด {uploadProgress}%</div>
                                    </div>
                                )}

                                {selectedFile ? (
                                    <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm">
                                        <div className="font-medium truncate">{selectedFile.name}</div>
                                        <div className="mt-1 text-white/60">{formatBytes(selectedFile.size)}</div>
                                        <div className="mt-3 rounded-lg bg-white/5 p-2 text-xs text-white/55">
                                            ความยาว: {shortTime(duration)}
                                        </div>
                                        <div
                                            className={cn(
                                                'mt-2 rounded-lg p-2 text-xs',
                                                uploadState === 'ready' && metadataStatus === 'ready' && 'bg-emerald-500/10 text-emerald-300',
                                                (uploadState === 'uploading' || (uploadState === 'ready' && metadataStatus === 'loading')) &&
                                                    'bg-white/5 text-white/55',
                                                (uploadState === 'error' || metadataStatus === 'error') && 'bg-red-500/10 text-red-300'
                                            )}
                                        >
                                            {uploadState === 'ready' &&
                                                metadataStatus === 'ready' &&
                                                '✓ อัปโหลดและโหลดข้อมูลวิดีโอสำเร็จ · พร้อม export'}
                                            {uploadState === 'uploading' && `กำลังอัปโหลด… ${uploadProgress}%`}
                                            {uploadState === 'ready' &&
                                                metadataStatus === 'loading' &&
                                                'กำลังโหลดข้อมูลวิดีโอ (Metadata)…'}
                                            {uploadState === 'error' && 'อัปโหลดไม่สำเร็จ — export ยังใช้ไม่ได้'}
                                            {metadataStatus === 'error' &&
                                                'เบราว์เซอร์อ่านข้อมูลวิดีโอไม่สำเร็จ — export ยังใช้ไม่ได้'}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/55">
                                        ยังไม่มีไฟล์ที่เลือก
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-white/10 bg-white/5 text-white">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">คำแนะนำการใช้งาน</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-xs text-white/60">
                                <div>1. เลือกหรือลากไฟล์วิดีโอมาวาง</div>
                                <div>2. กำหนดช่วง Trim ด้วยที่จับหรือพิมพ์เวลา</div>
                                <div>3. เล่นพรีวิวเพื่อตรวจดูช่วงที่เลือก</div>
                                <div>4. เลือกอัตราส่วนและกด Export</div>
                            </CardContent>
                        </Card>
                    </aside>

                    {/* ------------------------------------------------ main */}
                    <main className="space-y-6 overflow-hidden xl:overflow-auto">
                        <Card className="border-white/10 bg-white/5 text-white">
                            <CardContent className="space-y-4 p-4 md:p-6">
                                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black p-4 shadow-2xl md:p-8">
                                    <div
                                        className="relative mx-auto h-full max-h-[52vh] rounded-[2rem] border border-white/15 bg-black p-3"
                                        style={{
                                            aspectRatio: aspectRatio.replace(':', ' / '),
                                        }}
                                    >
                                        <div className="relative z-10 h-full overflow-hidden rounded-[1.25rem] border border-white/10 bg-black">
                                            <div className="h-full w-full">
                                                {videoUrl ? (
                                                    <video
                                                        key={videoUrl}
                                                        ref={videoRef}
                                                        src={videoUrl}
                                                        onLoadedMetadata={handleLoadedMetadata}
                                                        onTimeUpdate={handleTimeUpdate}
                                                        onPlay={() => setPlaying(true)}
                                                        onPause={() => setPlaying(false)}
                                                        onEnded={() => setPlaying(false)}
                                                        onError={handleSourceError}
                                                        className="h-full w-full object-contain"
                                                        muted={originalMuted}
                                                        playsInline
                                                    />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center text-center text-white/45">
                                                        <div>
                                                            <CirclePlay className="mx-auto h-14 w-14 text-[#fe2c55]" />
                                                            <p className="mt-3 text-sm">Preview player</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4">
                                                <div className="rounded-full bg-black/60 px-3 py-1 text-[11px] text-white/80 backdrop-blur">
                                                    {aspectRatio} · {quality} · ช่วง {shortTime(trimStart)} - {shortTime(trimEnd)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                        onClick={() => void togglePlay()}
                                        variant="secondary"
                                        className="bg-white/10 text-white hover:bg-white/15"
                                    >
                                        {playing ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                                        {playing ? 'Pause' : 'Play'}
                                    </Button>
                                    <Button
                                        onClick={() => seek(currentTime - 1)}
                                        variant="secondary"
                                        className="bg-white/10 text-white hover:bg-white/15"
                                    >
                                        <ArrowLeft className="mr-2 h-4 w-4" />-1s
                                    </Button>
                                    <Button
                                        onClick={() => seek(currentTime + 1)}
                                        variant="secondary"
                                        className="bg-white/10 text-white hover:bg-white/15"
                                    >
                                        <ArrowRight className="mr-2 h-4 w-4" />+1s
                                    </Button>
                                    <Button
                                        onClick={() => setLoopTrim((v) => !v)}
                                        variant="secondary"
                                        className={cn(
                                            'bg-white/10 text-white hover:bg-white/15',
                                            loopTrim && 'bg-[#fe2c55]/20 text-[#fe2c55]'
                                        )}
                                    >
                                        <Repeat className="mr-2 h-4 w-4" />
                                        วนช่วงที่เลือก
                                    </Button>
                                    <Button
                                        onClick={() =>
                                            setPlaybackRate(
                                                PLAYBACK_RATES[(PLAYBACK_RATES.indexOf(playbackRate) + 1) % PLAYBACK_RATES.length]
                                            )
                                        }
                                        variant="secondary"
                                        className="bg-white/10 text-white hover:bg-white/15"
                                        title="ความเร็วพรีวิวเท่านั้น ไม่มีผลกับไฟล์ที่ export"
                                    >
                                        <Gauge className="mr-2 h-4 w-4" />
                                        {playbackRate}x
                                    </Button>
                                    <div className="ml-auto flex items-center gap-2 text-sm text-white/70">
                                        <button
                                            onClick={() => recordAtomicChange(() => setOriginalMuted(!originalMuted))}
                                            className="p-1 hover:text-white"
                                            title={originalMuted ? 'เปิดเสียง' : 'ปิดเสียง'}
                                        >
                                            {originalMuted ? <VolumeX className="h-4 w-4 text-[#fe2c55]" /> : <Volume1 className="h-4 w-4" />}
                                        </button>
                                        <Slider
                                            value={[originalMuted ? 0 : volume]}
                                            min={0}
                                            max={100}
                                            step={1}
                                            onPointerDown={startTransaction}
                                            onValueChange={(v) => {
                                                if (originalMuted) setOriginalMuted(false)
                                                setVolume(v[0])
                                            }}
                                            onValueCommit={commitTransaction}
                                            className="w-28"
                                        />
                                        <Volume2 className="h-4 w-4" />
                                        <span className="w-9 text-right text-xs text-white/50">{originalMuted ? 'Muted' : `${volume}%`}</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm text-white/60">
                                        <span>{shortTime(currentTime)}</span>
                                        <span>{shortTime(duration)}</span>
                                    </div>
                                    <div className="relative h-4 cursor-pointer rounded-full bg-white/10" onClick={onTrackClick}>
                                        <div
                                            className="absolute inset-y-0 rounded-full bg-yellow-400/40"
                                            style={{ left: `${pct(trimStart)}%`, width: `${Math.max(0, pct(trimEnd) - pct(trimStart))}%` }}
                                        />
                                        <div className="absolute inset-y-0 left-0 rounded-full bg-[#fe2c55]/70" style={{ width: `${pct(currentTime)}%` }} />
                                        <div
                                            className="absolute -top-1 h-6 w-1 rounded-full bg-white shadow-lg"
                                            style={{ left: `calc(${pct(currentTime)}% - 2px)` }}
                                        />
                                    </div>
                                    <div className="relative h-8 text-[10px] text-white/40">
                                        {timelineMarkers(duration).map((marker) => (
                                            <div key={marker} className="absolute top-0 -translate-x-1/2" style={{ left: `${pct(marker)}%` }}>
                                                <div className="mx-auto h-2 w-px bg-white/25" />
                                                <div className="mt-1">{shortTime(marker)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-white/10 bg-white/5 text-white">
                            <CardContent className="space-y-5 p-4 md:p-6">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm font-medium text-white">กำหนดช่วงตัดต่อ (Trim)</div>
                                    <div className="text-xs text-white/50">ส่งออกเฉพาะช่วงที่เลือก</div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label className="text-white/60">Trim Start (วินาที)</Label>
                                        <Input
                                            value={trimStartInput}
                                            onFocus={() => setIsEditingStart(true)}
                                            onChange={(e) => setTrimStartInput(e.target.value)}
                                            onBlur={handleCommitTrimStart}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleCommitTrimStart()
                                            }}
                                            className="border-white/10 bg-black/30 font-mono text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-white/60">Trim End (วินาที)</Label>
                                        <Input
                                            value={trimEndInput}
                                            onFocus={() => setIsEditingEnd(true)}
                                            onChange={(e) => setTrimEndInput(e.target.value)}
                                            onBlur={handleCommitTrimEnd}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleCommitTrimEnd()
                                            }}
                                            className="border-white/10 bg-black/30 font-mono text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-white/60">ความยาวช่วงที่เลือก</Label>
                                        <Input
                                            value={shortTime(clipLength)}
                                            readOnly
                                            className="border-white/10 bg-black/30 font-mono text-[#fe2c55]"
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm text-white/60">
                                            <span>Trim Start Slider</span>
                                            <span>{shortTime(trimStart)}</span>
                                        </div>
                                        <Slider
                                            value={[trimStart]}
                                            min={0}
                                            max={duration || 100}
                                            step={0.1}
                                            onPointerDown={startTransaction}
                                            onValueChange={(v) => applyTrimStart(v[0])}
                                            onValueCommit={commitTransaction}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm text-white/60">
                                            <span>Trim End Slider</span>
                                            <span>{shortTime(trimEnd)}</span>
                                        </div>
                                        <Slider
                                            value={[trimEnd]}
                                            min={0}
                                            max={duration || 100}
                                            step={0.1}
                                            onPointerDown={startTransaction}
                                            onValueChange={(v) => applyTrimEnd(v[0])}
                                            onValueCommit={commitTransaction}
                                        />
                                    </div>
                                </div>

                                {/* Timeline Track with Pointer Capture & pointer-events-none label */}
                                <div id="edit-clip-timeline" className="relative h-10 rounded-full bg-white/10">
                                    <div
                                        className="absolute inset-y-0 rounded-full bg-yellow-400/40"
                                        style={{ left: `${pct(trimStart)}%`, width: `${Math.max(0, pct(trimEnd) - pct(trimStart))}%` }}
                                    />
                                    <div className="absolute inset-y-0 w-0.5 bg-[#fe2c55]" style={{ left: `${pct(currentTime)}%` }} />

                                    {/* Start Handle */}
                                    <div
                                        onPointerDown={startPointerDrag('start')}
                                        onKeyDown={onHandleKeyDown('start')}
                                        role="slider"
                                        aria-label="Trim start"
                                        aria-valuenow={trimStart}
                                        tabIndex={0}
                                        className="absolute top-[-4px] z-20 h-12 w-3 cursor-ew-resize rounded-full bg-white shadow-lg focus:outline-none focus:ring-2 focus:ring-[#fe2c55]"
                                        style={{ left: `calc(${pct(trimStart)}% - 6px)` }}
                                    />

                                    {/* End Handle */}
                                    <div
                                        onPointerDown={startPointerDrag('end')}
                                        onKeyDown={onHandleKeyDown('end')}
                                        role="slider"
                                        aria-label="Trim end"
                                        aria-valuenow={trimEnd}
                                        tabIndex={0}
                                        className="absolute top-[-4px] z-20 h-12 w-3 cursor-ew-resize rounded-full bg-white shadow-lg focus:outline-none focus:ring-2 focus:ring-[#fe2c55]"
                                        style={{ left: `calc(${pct(trimEnd)}% - 6px)` }}
                                    />

                                    {/* Informational Text: pointer-events-none prevents blocking pointer events */}
                                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] text-white/45">
                                        ลากที่จับซ้าย-ขวาเพื่อกำหนดช่วงคลิป
                                    </div>
                                </div>

                                {!trimValidation.valid && (
                                    <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        <span>{trimValidation.error}</span>
                                    </div>
                                )}

                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <Button
                                        variant="secondary"
                                        onClick={undo}
                                        disabled={historyCount === 0}
                                        className="bg-white/10 text-white hover:bg-white/15 disabled:opacity-30"
                                    >
                                        <Undo2 className="mr-2 h-4 w-4" />
                                        Undo
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={redo}
                                        disabled={futureCount === 0}
                                        className="bg-white/10 text-white hover:bg-white/15 disabled:opacity-30"
                                    >
                                        <Redo2 className="mr-2 h-4 w-4" />
                                        Redo
                                    </Button>
                                    <div className="ml-auto rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/50">
                                        Space เล่น · [ ] กำหนดช่วง · ← → เลื่อน · Ctrl+Z/Y
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </main>

                    {/* ----------------------------------------------- right */}
                    <aside className="space-y-6">
                        <Card className="border-white/10 bg-white/5 text-white">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">ตั้งค่าคลิป (Settings)</CardTitle>
                                <CardDescription className="text-white/50">Format & Audio</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="format">
                                    <TabsList className="grid grid-cols-2 bg-black/30">
                                        <TabsTrigger value="format">Format</TabsTrigger>
                                        <TabsTrigger value="audio">Audio</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="format" className="mt-4 space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-white/60">สัดส่วนวิดีโอ (Aspect Ratio)</Label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {(['9:16', '1:1', '16:9'] as const).map((ratio) => (
                                                    <button
                                                        key={ratio}
                                                        onClick={() => recordAtomicChange(() => setAspectRatio(ratio))}
                                                        className={cn(
                                                            'rounded-xl border px-2 py-3 text-sm font-medium transition',
                                                            aspectRatio === ratio
                                                                ? 'border-[#fe2c55] bg-[#fe2c55]/10 text-white'
                                                                : 'border-white/10 bg-black/20 text-white/70 hover:bg-white/5'
                                                        )}
                                                    >
                                                        {ratio}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-white/60">ความละเอียดในการ Export</Label>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                {(['720p', '1080p'] as const).map((q) => (
                                                    <button
                                                        key={q}
                                                        onClick={() => setQuality(q)}
                                                        className={cn(
                                                            'rounded-lg border px-2 py-2 transition',
                                                            quality === q
                                                                ? 'border-[#fe2c55] bg-[#fe2c55]/10 text-white'
                                                                : 'border-white/10 bg-black/20 text-white/70 hover:bg-white/5'
                                                        )}
                                                    >
                                                        {q} {q === '720p' ? '(แนะนำ: รวดเร็ว)' : ''}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="audio" className="mt-4 space-y-4">
                                        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3">
                                            <span className="text-sm">ปิดเสียงต้นฉบับ (Mute)</span>
                                            <button
                                                onClick={() => recordAtomicChange(() => setOriginalMuted(!originalMuted))}
                                                className={cn(
                                                    'rounded-full px-3 py-1 text-xs font-medium transition',
                                                    originalMuted ? 'bg-[#fe2c55] text-white' : 'bg-white/10 text-white'
                                                )}
                                            >
                                                {originalMuted ? 'Muted' : 'On'}
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm text-white/60">
                                                <span>ระดับเสียงวิดีโอ</span>
                                                <span>{originalMuted ? '0%' : `${volume}%`}</span>
                                            </div>
                                            <Slider
                                                value={[originalMuted ? 0 : volume]}
                                                min={0}
                                                max={100}
                                                step={1}
                                                onPointerDown={startTransaction}
                                                onValueChange={(v) => {
                                                    if (originalMuted) setOriginalMuted(false)
                                                    setVolume(v[0])
                                                }}
                                                onValueCommit={commitTransaction}
                                            />
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>

                        <Card className="border-white/10 bg-white/5 text-white">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Export MP4</CardTitle>
                                <CardDescription className="text-white/50">ส่งออกวิดีโอตามช่วงที่กำหนด</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {exporting && (
                                    <div className="space-y-1">
                                        <Progress value={progress} />
                                        <div className="text-xs text-white/55">กำลังประมวลผล {progress}%</div>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <Label className="text-xs text-white/60">ชื่อไฟล์ผลลัพธ์</Label>
                                    <Input
                                        value={outputName}
                                        onChange={(e) => setOutputName(e.target.value)}
                                        className="border-white/10 bg-black/30 text-white"
                                        placeholder="ชื่อไฟล์ผลลัพธ์"
                                    />
                                </div>

                                {exportError && (
                                    <div className="space-y-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                                        <div className="flex items-center gap-2 font-medium">
                                            <AlertCircle className="h-4 w-4 shrink-0" />
                                            <span>Export ล้มเหลว</span>
                                        </div>
                                        <p className="text-[11px] text-red-300/80">{exportError}</p>
                                        <Button
                                            onClick={() => void handleExport()}
                                            variant="secondary"
                                            size="sm"
                                            className="w-full bg-red-500/20 text-red-100 hover:bg-red-500/30"
                                        >
                                            ลองใหม่อีกครั้ง
                                        </Button>
                                    </div>
                                )}

                                <Button
                                    onClick={() => void handleExport()}
                                    disabled={exporting || !readyToExport}
                                    className="w-full bg-[#fe2c55] text-white hover:bg-[#fe2c55]/90 disabled:opacity-40"
                                >
                                    {exporting ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Download className="mr-2 h-4 w-4" />
                                    )}
                                    {exporting ? 'กำลัง Export…' : 'Export MP4'}
                                </Button>

                                {!readyToExport && (
                                    <p className="text-[11px] text-white/45">
                                        {uploadState === 'uploading'
                                            ? 'กำลังอัปโหลดไฟล์วิดีโอ…'
                                            : uploadState !== 'ready'
                                            ? 'ต้องอัปโหลดวิดีโอให้เสร็จก่อนจึงจะ export ได้'
                                            : metadataStatus === 'loading'
                                            ? 'กำลังอ่านข้อมูลความยาววิดีโอ…'
                                            : metadataStatus === 'error'
                                            ? 'ไม่สามารถอ่านความยาววิดีโอได้ กรุณาใช้ไฟล์ที่เบราว์เซอร์รองรับ'
                                            : !trimValidation.valid
                                            ? trimValidation.error
                                            : 'วิดีโอยังไม่พร้อม'}
                                    </p>
                                )}

                                {exportResult && (
                                    <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                                        <div className="flex items-center gap-1 font-medium">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                            <span>ส่งออกวิดีโอสำเร็จ</span>
                                        </div>
                                        <a
                                            href={exportResult.downloadUrl}
                                            download
                                            className="flex items-center justify-center rounded-lg bg-emerald-500/20 px-3 py-2 font-medium text-emerald-100 hover:bg-emerald-500/30"
                                        >
                                            <Download className="mr-2 h-4 w-4" />
                                            ดาวน์โหลดไฟล์ MP4
                                        </a>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </aside>
                </div>
            </div>
        </div>
    )
}


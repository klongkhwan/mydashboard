'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
    ArrowLeft,
    ArrowRight,
    BadgeInfo,
    ChevronRight,
    CirclePlay,
    Clapperboard,
    Download,
    Film,
    Gauge,
    Loader2,
    Mic,
    Music,
    Pause,
    Play,
    Plus,
    Redo2,
    Repeat,
    Save,
    Scissors,
    Share2,
    Sparkles,
    SquareSplitHorizontal,
    Trash2,
    Undo2,
    Upload,
    Volume1,
    Volume2,
    X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { clamp, formatBytes, shortTime, timelineMarkers, uploadMedia } from '@/components/video-editor/edit-clip-utils'
import { createInitialEditClipStore } from '@/components/video-editor/edit-clip-store'
import type {
    ClipSegment,
    DraftProject,
    EditorSnapshot,
    ExportResult,
    FilterPreset,
    Subtitle,
    UploadState,
    UploadedMedia,
} from '@/components/video-editor/edit-clip.types'

const FILTERS: FilterPreset[] = [
    { name: 'None', css: 'none' },
    { name: 'Vivid', css: 'saturate(1.8) contrast(1.1)' },
    { name: 'Matte', css: 'saturate(0.9) contrast(0.95) brightness(1.05)' },
    { name: 'B&W', css: 'grayscale(1)' },
    { name: 'Warm', css: 'sepia(0.25) saturate(1.2) hue-rotate(-8deg)' },
    { name: 'Cool', css: 'saturate(1.1) hue-rotate(12deg)' },
    { name: 'Fade', css: 'contrast(0.95) brightness(1.08) saturate(0.9)' },
    { name: 'Cinematic', css: 'contrast(1.15) saturate(1.15) brightness(0.96)' },
    { name: 'Vintage', css: 'sepia(0.35) contrast(0.95) saturate(0.8)' },
    { name: 'Neon', css: 'saturate(2) contrast(1.2) hue-rotate(25deg)' },
]

const TRANSITIONS = ['None', 'Fade', 'Slide left', 'Slide right', 'Zoom in']
const PLAYBACK_RATES = [0.5, 1, 1.5, 2]
const MAX_VIDEO_BYTES = 500 * 1024 * 1024
const VIDEO_PATTERN = /\.(mp4|mov|webm|m4v)$/i
const AUDIO_PATTERN = /\.(mp3|wav|m4a|aac|ogg)$/i
const DRAFT_KEY = 'edit-clip-draft'
const DRAFT_LIST_KEY = 'edit-clip-drafts'

type StoredDraft = DraftProject & { draft?: Record<string, any> }

const isTypingTarget = (target: EventTarget | null) => {
    const el = target as HTMLElement | null
    if (!el) return false
    return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable
}

export default function EditClipPage() {
    const initialStore = useMemo(() => createInitialEditClipStore(), [])
    const [projects, setProjects] = useState<DraftProject[]>(initialStore.projects)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [restoredSource, setRestoredSource] = useState<string | null>(null)
    const [uploadedPath, setUploadedPath] = useState<string | null>(null)
    const [uploadState, setUploadState] = useState<UploadState>('idle')
    const [uploadProgress, setUploadProgress] = useState(0)
    const [videoUrl, setVideoUrl] = useState<string | null>(null)
    const [dragActive, setDragActive] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)

    const [duration, setDuration] = useState(0)
    const [currentTime, setCurrentTime] = useState(0)
    const [playing, setPlaying] = useState(false)
    const [playbackRate, setPlaybackRate] = useState(1)
    const [volume, setVolume] = useState(80)
    const [trimStart, setTrimStart] = useState(0)
    const [trimEnd, setTrimEnd] = useState(0)
    const [loopTrim, setLoopTrim] = useState(true)
    const [activeTab, setActiveTab] = useState<'effects' | 'text' | 'audio' | 'format'>('effects')
    const [filter, setFilter] = useState('None')
    const [brightness, setBrightness] = useState(0)
    const [contrast, setContrast] = useState(0)
    const [saturation, setSaturation] = useState(0)
    const [transition, setTransition] = useState('None')
    const [backgroundMode, setBackgroundMode] = useState<'Blur' | 'Color' | 'Black'>('Blur')
    const [backgroundColor, setBackgroundColor] = useState('#000000')
    const [aspectRatio, setAspectRatio] = useState<'9:16' | '1:1' | '16:9'>('9:16')
    const [durationLimit, setDurationLimit] = useState('60')
    const [quality, setQuality] = useState<'720p' | '1080p' | 'original'>('1080p')
    const [outputName, setOutputName] = useState('tiktok_edit')
    const [watermark, setWatermark] = useState(true)
    const [watermarkText, setWatermarkText] = useState('superlboard.app')
    const [watermarkOpacity, setWatermarkOpacity] = useState(55)
    const [subtitleText, setSubtitleText] = useState('')
    const [captionIdeas, setCaptionIdeas] = useState<string[]>(initialStore.captionIdeas)
    const [hashtagIdeas, setHashtagIdeas] = useState<string[]>(initialStore.hashtagIdeas)
    const [highlightRange, setHighlightRange] = useState<{ start: number; end: number } | null>(initialStore.highlightRange)
    const [subtitles, setSubtitles] = useState<Subtitle[]>(initialStore.subtitles)
    const [activeSubtitleId, setActiveSubtitleId] = useState<string | null>('s1')
    const [originalMuted, setOriginalMuted] = useState(false)
    const [bgmVolume, setBgmVolume] = useState(30)
    const [voiceoverTime, setVoiceoverTime] = useState(0)
    const [voiceoverBlobUrl, setVoiceoverBlobUrl] = useState<string | null>(null)
    const [voiceoverStatus, setVoiceoverStatus] = useState<'idle' | 'recording' | 'uploading' | 'ready'>('idle')
    const [voiceMedia, setVoiceMedia] = useState<UploadedMedia | null>(null)
    const [musicBlobUrl, setMusicBlobUrl] = useState<string | null>(null)
    const [musicMedia, setMusicMedia] = useState<UploadedMedia | null>(null)
    const [autosave, setAutosave] = useState('ยังไม่ได้บันทึก')
    const [loadedFromShare, setLoadedFromShare] = useState(false)
    const [exporting, setExporting] = useState(false)
    const [progress, setProgress] = useState(0)
    const [exportResult, setExportResult] = useState<ExportResult | null>(null)
    const [segments, setSegments] = useState<ClipSegment[]>(initialStore.segments)
    const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(initialStore.segments[0]?.id ?? null)
    const [exportJobId, setExportJobId] = useState<string | null>(null)
    const [isTranscribing, setIsTranscribing] = useState(false)

    const historyRef = useRef<EditorSnapshot[]>([])
    const futureRef = useRef<EditorSnapshot[]>([])
    const voiceoverRecording = voiceoverStatus === 'recording'

    const currentSnapshot = useCallback(
        (): EditorSnapshot => ({ trimStart, trimEnd, filter, brightness, contrast, saturation, transition, subtitles, segments, outputName }),
        [brightness, contrast, filter, outputName, saturation, segments, subtitles, transition, trimEnd, trimStart]
    )

    const snapshotState = useCallback(() => {
        historyRef.current.push(currentSnapshot())
        if (historyRef.current.length > 30) historyRef.current.shift()
        futureRef.current = []
    }, [currentSnapshot])

    const restoreSnapshot = useCallback((state: EditorSnapshot) => {
        setTrimStart(state.trimStart)
        setTrimEnd(state.trimEnd)
        setFilter(state.filter)
        setBrightness(state.brightness)
        setContrast(state.contrast)
        setSaturation(state.saturation)
        setTransition(state.transition)
        setSubtitles(state.subtitles)
        setSegments(state.segments)
        setOutputName(state.outputName)
    }, [])

    const undo = useCallback(() => {
        const previous = historyRef.current.pop()
        if (!previous) return toast.error('ไม่มีอะไรให้ย้อนกลับ')
        futureRef.current.push(currentSnapshot())
        restoreSnapshot(previous)
        toast.success('Undo')
    }, [currentSnapshot, restoreSnapshot])

    const redo = useCallback(() => {
        const next = futureRef.current.pop()
        if (!next) return toast.error('ไม่มีอะไรให้ทำซ้ำ')
        historyRef.current.push(currentSnapshot())
        restoreSnapshot(next)
        toast.success('Redo')
    }, [currentSnapshot, restoreSnapshot])

    const filterCss = useMemo(() => {
        const preset = FILTERS.find((f) => f.name === filter)?.css ?? 'none'
        return `${preset} brightness(${1 + brightness / 100}) contrast(${1 + contrast / 100}) saturate(${1 + saturation / 100})`
    }, [brightness, contrast, saturation, filter])

    const selectedFileInfo = useMemo(() => {
        if (selectedFile) return { name: selectedFile.name, size: formatBytes(selectedFile.size) }
        // a draft restores the clip straight from the server, without a File object
        if (restoredSource) return { name: restoredSource, size: 'ไฟล์จาก draft' }
        return null
    }, [restoredSource, selectedFile])

    const clipLength = Math.max(0, trimEnd - trimStart)
    const selectedSubtitle = subtitles.find((s) => s.id === activeSubtitleId) ?? null
    const readyToExport = uploadState === 'ready' && Boolean(uploadedPath)

    const exportSettings = useMemo(
        () => ({
            videoId: uploadedPath ?? '',
            trimStart,
            trimEnd,
            effects: {
                filter,
                brightness,
                contrast,
                saturation,
                transition,
                background: { mode: backgroundMode, color: backgroundColor },
            },
            subtitles,
            burnSubtitles: true,
            audio: {
                originalVolume: volume,
                originalMuted,
                bgmVolume,
                voiceoverRecording,
                voiceoverUrl: voiceMedia?.path ?? null,
                musicUrl: musicMedia?.path ?? null,
                musicName: musicMedia?.name ?? null,
            },
            format: {
                aspectRatio,
                durationLimit,
                thumbnailTime: currentTime,
                watermark: { enabled: watermark, text: watermarkText, position: 'bottom-right', opacity: watermarkOpacity },
                quality,
            },
            outputName,
        }),
        [
            aspectRatio, backgroundColor, backgroundMode, bgmVolume, brightness, contrast, currentTime, durationLimit,
            filter, musicMedia, originalMuted, outputName, quality, saturation, subtitles, transition, trimEnd,
            trimStart, uploadedPath, voiceMedia, voiceoverRecording, volume, watermark, watermarkOpacity, watermarkText,
        ]
    )

    const exportSettingsRef = useRef(exportSettings)
    useEffect(() => {
        exportSettingsRef.current = exportSettings
    }, [exportSettings])

    // ---------------------------------------------------------------- upload

    const clearVideoUrl = useCallback(() => {
        setVideoUrl((prev) => {
            // a restored draft plays through /api/video/stream, which is not an object URL
            if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
            return null
        })
    }, [])

    /** Plays a clip that already lives on the server (draft restore) instead of a local File. */
    const restoreSource = useCallback(
        (videoId: string) => {
            clearVideoUrl()
            setSelectedFile(null)
            setRestoredSource(videoId.split(/[\\/]/).pop() ?? 'video')
            setUploadedPath(videoId)
            setVideoUrl(`/api/video/stream?path=${encodeURIComponent(videoId)}`)
            setUploadState('ready')
            setExportResult(null)
        },
        [clearVideoUrl]
    )

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

            setSelectedFile(file)
            setRestoredSource(null)
            setUploadedPath(null)
            setExportResult(null)
            const url = URL.createObjectURL(file)
            clearVideoUrl()
            setVideoUrl(url)
            setUploadState('uploading')
            setUploadProgress(0)

            try {
                const uploaded = await uploadMedia(file, { kind: 'video', fileName: file.name, onProgress: setUploadProgress })
                setUploadedPath(uploaded.path)
                setUploadState('ready')
                toast.success('อัปโหลดไฟล์สำเร็จ — พร้อม export')
            } catch (error) {
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

    // ------------------------------------------------------------- lifecycle

    useEffect(() => () => clearVideoUrl(), [clearVideoUrl])

    useEffect(() => {
        return () => {
            if (voiceoverBlobUrl) URL.revokeObjectURL(voiceoverBlobUrl)
        }
    }, [voiceoverBlobUrl])

    useEffect(() => {
        return () => {
            if (musicBlobUrl) URL.revokeObjectURL(musicBlobUrl)
        }
    }, [musicBlobUrl])

    // autosave actually writes the draft instead of only relabelling the header
    useEffect(() => {
        const timer = window.setInterval(() => {
            if (!exportSettingsRef.current.videoId && !exportSettingsRef.current.subtitles.length) return
            localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...exportSettingsRef.current, savedAt: new Date().toISOString() }))
            setAutosave(`บันทึกอัตโนมัติ ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`)
        }, 30000)
        return () => window.clearInterval(timer)
    }, [])

    useEffect(() => {
        if (videoRef.current) videoRef.current.volume = volume / 100
    }, [volume, videoUrl])

    useEffect(() => {
        if (videoRef.current) videoRef.current.playbackRate = playbackRate
    }, [playbackRate, videoUrl])

    // -------------------------------------------------------------- playback

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
            if (trimEnd > trimStart && (video.currentTime < trimStart || video.currentTime >= trimEnd - 0.02)) {
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
        setDuration(dur)
        if (video) {
            video.volume = volume / 100
            video.playbackRate = playbackRate
        }
        // a restored draft/share link already carries a trim range — clamp it
        // to the real duration instead of throwing it away
        setTrimStart((prev) => clamp(prev, 0, Math.max(0, dur - 0.1)))
        setTrimEnd((prev) => (prev > 0 ? clamp(prev, 0.1, dur) : dur))
        setSegments((prev) => (prev.some((segment) => segment.end > 0) ? prev : [{ id: 'seg-1', start: 0, end: dur }]))
    }

    const handleSourceError = () => {
        if (restoredSource) {
            // the file the draft points at is gone from tmp/ — export would fail too
            setUploadState('error')
            toast.error('เปิดไฟล์ของ draft ไม่ได้ — อาจถูกลบไปแล้ว กรุณาเลือกไฟล์ใหม่')
            return
        }
        // a local file the browser cannot decode may still be exportable by FFmpeg
        toast.warning('เบราว์เซอร์เล่นไฟล์นี้ไม่ได้ — พรีวิวอาจไม่ขึ้น แต่ยัง export ได้')
    }

    const handleTimeUpdate = () => {
        const video = videoRef.current
        if (!video) return
        if (loopTrim && trimEnd > trimStart && video.currentTime >= trimEnd - 0.02) {
            video.currentTime = trimStart
            setCurrentTime(trimStart)
            return
        }
        setCurrentTime(video.currentTime)
    }

    // --------------------------------------------------------------- editing

    const applyTrimStart = (value: number) => setTrimStart(clamp(value, 0, Math.max(0, trimEnd - 0.1)))
    const applyTrimEnd = (value: number) => setTrimEnd(clamp(value, trimStart + 0.1, duration || value))

    const addSubtitle = () => {
        if (!subtitleText.trim()) return
        snapshotState()
        const id = crypto.randomUUID()
        setSubtitles((prev) =>
            [...prev, { id, startTime: currentTime, endTime: Math.min(currentTime + 2, duration || currentTime + 2), text: subtitleText.trim() }].sort(
                (a, b) => a.startTime - b.startTime
            )
        )
        setSubtitleText('')
        setActiveSubtitleId(id)
    }

    const updateSubtitle = (id: string, patch: Partial<Subtitle>) => {
        setSubtitles((prev) => prev.map((sub) => (sub.id === id ? { ...sub, ...patch } : sub)))
    }

    const removeSubtitle = useCallback((id: string) => {
        snapshotState()
        setSubtitles((prev) => prev.filter((sub) => sub.id !== id))
        setActiveSubtitleId((prev) => (prev === id ? null : prev))
    }, [snapshotState])

    const selectSegment = (segment: ClipSegment) => {
        setSelectedSegmentId(segment.id)
        setTrimStart(segment.start)
        setTrimEnd(Math.max(segment.start + 0.1, segment.end))
        seek(segment.start)
    }

    const splitAtCurrentTime = useCallback(() => {
        const index = segments.findIndex((s) => currentTime > s.start + 0.05 && currentTime < s.end - 0.05)
        if (index < 0) return toast.error('ตำแหน่งนี้แบ่งไม่ได้ — เลื่อนหัวอ่านเข้าไปในช่วงคลิปก่อน')
        snapshotState()
        const segment = segments[index]
        const right: ClipSegment = { id: crypto.randomUUID(), start: currentTime, end: segment.end }
        setSegments([...segments.slice(0, index), { ...segment, end: currentTime }, right, ...segments.slice(index + 1)])
        setSelectedSegmentId(right.id)
        setTrimStart(right.start)
        setTrimEnd(right.end)
        toast.success('แบ่งคลิปแล้ว')
    }, [currentTime, segments, snapshotState])

    const deleteSelectedSegment = () => {
        if (segments.length <= 1) return toast.error('ต้องเหลืออย่างน้อย 1 ช่วง')
        snapshotState()
        const next = segments.filter((s) => s.id !== selectedSegmentId)
        setSegments(next)
        const fallback = next[0]
        setSelectedSegmentId(fallback?.id ?? null)
        if (fallback) {
            setTrimStart(fallback.start)
            setTrimEnd(fallback.end)
        }
        toast.success('ลบช่วงแล้ว')
    }

    const addSegmentFromPlayhead = () => {
        const end = duration || trimEnd
        if (end - currentTime < 0.2) return toast.error('ช่วงสั้นเกินไป')
        snapshotState()
        const next: ClipSegment = { id: crypto.randomUUID(), start: currentTime, end }
        setSegments((prev) => [...prev, next].sort((a, b) => a.start - b.start))
        setSelectedSegmentId(next.id)
        setTrimStart(next.start)
        setTrimEnd(next.end)
        toast.success('เพิ่มช่วงแล้ว')
    }

    const findBestMoments = () => {
        if (!duration) return toast.error('เลือกวิดีโอก่อน')
        snapshotState()
        const end = Math.min(duration, 8)
        setHighlightRange({ start: 0.5, end: Math.max(1, end - 0.5) })
        setTrimStart(0.5)
        setTrimEnd(Math.max(1, end - 0.5))
        toast.success('ตั้งช่วงไฮไลต์ให้แล้ว')
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
            if (e.key === '[') applyTrimStart(currentTime)
            if (e.key === ']') applyTrimEnd(currentTime)
            if (e.key === 'ArrowLeft') seek(currentTime - 1)
            if (e.key === 'ArrowRight') seek(currentTime + 1)
            if (e.key.toLowerCase() === 's') splitAtCurrentTime()
            if (e.key === 'Delete' && activeSubtitleId) removeSubtitle(activeSubtitleId)
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSubtitleId, currentTime, duration, redo, removeSubtitle, seek, splitAtCurrentTime, togglePlay, trimEnd, trimStart, undo])

    // ------------------------------------------------------------------- AI

    const generateCaptions = async () => {
        if (!readyToExport) return toast.error('อัปโหลดวิดีโอให้เสร็จก่อน')
        setIsTranscribing(true)
        try {
            const res = await fetch('/api/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoUrl: uploadedPath, language: 'th' }),
            })
            const data = await res.json()
            if (!data.success) throw new Error(data.error || 'transcribe failed')
            snapshotState()
            setSubtitles(data.subtitles)
            setActiveSubtitleId(data.subtitles?.[0]?.id ?? null)
            setCaptionIdeas(['เปิดด้วยประโยคที่ดึงดูด', 'ชวนดูต่อด้วยคำถาม', 'ปิดท้ายด้วย CTA'])
            setHashtagIdeas(['#tiktok', '#videoedit', '#shortform', '#contentcreator'])
            setHighlightRange({ start: data.subtitles?.[0]?.startTime ?? 0, end: data.subtitles?.[0]?.endTime ?? 2 })
            toast.success('สร้างคำบรรยายแล้ว')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'สร้างคำบรรยายไม่สำเร็จ')
        } finally {
            setIsTranscribing(false)
        }
    }

    const suggestCaptions = () => {
        setCaptionIdeas(['ตัดให้ไว ดูจบในไม่กี่วินาที', 'ไฮไลต์ที่ใช่ ทำให้คนหยุดดู', 'ฟีเจอร์ใหม่ที่ช่วยเพิ่มยอดดู'])
        setHashtagIdeas(['#tiktokedit', '#videoclip', '#contentcreator', '#reels', '#shortform'])
        toast.success('แนะนำแคปชั่นและแฮชแท็กแล้ว')
    }

    // ------------------------------------------------------------------ audio

    const voiceoverRecorderRef = useRef<MediaRecorder | null>(null)
    const voiceoverTimerRef = useRef<number | null>(null)
    const voiceoverStreamRef = useRef<MediaStream | null>(null)

    const releaseRecorder = () => {
        if (voiceoverTimerRef.current) window.clearInterval(voiceoverTimerRef.current)
        voiceoverTimerRef.current = null
        voiceoverStreamRef.current?.getTracks().forEach((track) => track.stop())
        voiceoverStreamRef.current = null
    }

    const stopVoiceover = () => {
        if (voiceoverRecorderRef.current && voiceoverRecorderRef.current.state !== 'inactive') {
            voiceoverRecorderRef.current.stop()
        }
        releaseRecorder()
    }

    const startVoiceover = async () => {
        if (voiceoverStatus === 'recording') return stopVoiceover()
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            voiceoverStreamRef.current = stream
            const recorder = new MediaRecorder(stream)
            voiceoverRecorderRef.current = recorder
            const chunks: BlobPart[] = []
            recorder.ondataavailable = (event) => chunks.push(event.data)
            recorder.onstop = async () => {
                releaseRecorder()
                const blob = new Blob(chunks, { type: 'audio/webm' })
                const url = URL.createObjectURL(blob)
                setVoiceoverBlobUrl((prev) => {
                    if (prev) URL.revokeObjectURL(prev)
                    return url
                })
                setVoiceoverStatus('uploading')
                try {
                    const uploaded = await uploadMedia(blob, { kind: 'audio', fileName: `voiceover-${Date.now()}.webm` })
                    setVoiceMedia(uploaded)
                    setVoiceoverStatus('ready')
                    toast.success('อัดเสียงและอัปโหลดแล้ว')
                } catch {
                    setVoiceoverStatus('ready')
                    toast.error('อัดเสียงแล้ว แต่อัปโหลดไม่สำเร็จ — export จะไม่มีเสียงพากย์')
                }
            }
            recorder.start()
            setVoiceoverStatus('recording')
            setVoiceoverTime(0)
            voiceoverTimerRef.current = window.setInterval(() => setVoiceoverTime((t) => t + 1), 1000)
            toast.success('เริ่มอัดเสียง')
        } catch {
            releaseRecorder()
            setVoiceoverStatus('idle')
            toast.error('ไม่สามารถเริ่มอัดเสียงได้ — ตรวจสอบสิทธิ์ไมโครโฟน')
        }
    }

    const resetVoiceover = () => {
        stopVoiceover()
        if (voiceoverBlobUrl) URL.revokeObjectURL(voiceoverBlobUrl)
        voiceoverRecorderRef.current = null
        setVoiceoverBlobUrl(null)
        setVoiceMedia(null)
        setVoiceoverStatus('idle')
        setVoiceoverTime(0)
        toast.success('ลบเสียงพากย์แล้ว')
    }

    const onPickMusic = async (file: File | null) => {
        if (!file) return
        if (!AUDIO_PATTERN.test(file.name)) {
            toast.error('รองรับไฟล์เสียง mp3, wav, m4a, aac, ogg')
            return
        }
        if (musicBlobUrl) URL.revokeObjectURL(musicBlobUrl)
        setMusicBlobUrl(URL.createObjectURL(file))
        setMusicMedia(null)
        try {
            const uploaded = await uploadMedia(file, { kind: 'audio', fileName: file.name })
            setMusicMedia(uploaded)
            toast.success('โหลดเพลงพื้นหลังแล้ว')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'อัปโหลดเพลงไม่สำเร็จ')
        }
    }

    const clearMusic = () => {
        if (musicBlobUrl) URL.revokeObjectURL(musicBlobUrl)
        setMusicBlobUrl(null)
        setMusicMedia(null)
        toast.success('ลบเพลงพื้นหลังแล้ว')
    }

    // ------------------------------------------------------------------ draft

    const persistDraftList = (list: StoredDraft[]) => {
        localStorage.setItem(DRAFT_LIST_KEY, JSON.stringify(list))
        setProjects(list.map(({ draft: _draft, ...item }) => item))
    }

    const readDraftList = (): StoredDraft[] => {
        try {
            const parsed = JSON.parse(localStorage.getItem(DRAFT_LIST_KEY) || '[]')
            return Array.isArray(parsed) ? parsed : []
        } catch {
            return []
        }
    }

    const saveDraft = () => {
        const draft = { ...exportSettings, savedAt: new Date().toISOString() }
        const entry: StoredDraft = {
            id: crypto.randomUUID(),
            name: outputName || 'Untitled Draft',
            updatedAt: 'ตอนนี้',
            duration: shortTime(clipLength || duration),
            draft,
        }
        const nextList = [entry, ...readDraftList().filter((item) => item.name !== entry.name)].slice(0, 10)
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
        persistDraftList(nextList)
        setAutosave('บันทึก draft แล้ว')
        toast.success('บันทึก draft แล้ว')
    }

    const applyDraft = (draft: Record<string, any>) => {
        if (typeof draft.videoId === 'string' && draft.videoId) restoreSource(draft.videoId)
        if (draft.outputName) setOutputName(draft.outputName)
        if (draft.trimStart !== undefined) setTrimStart(draft.trimStart)
        if (draft.trimEnd !== undefined) setTrimEnd(draft.trimEnd)
        // share links written before the payload was nested kept these at the top level
        if (draft.filter) setFilter(draft.filter)
        if (draft.aspectRatio) setAspectRatio(draft.aspectRatio)
        if (draft.backgroundMode) setBackgroundMode(draft.backgroundMode)
        if (draft.backgroundColor) setBackgroundColor(draft.backgroundColor)
        if (draft.watermarkText) setWatermarkText(draft.watermarkText)
        if (draft.watermark !== undefined && typeof draft.watermark === 'boolean') setWatermark(draft.watermark)
        if (draft.effects?.filter) setFilter(draft.effects.filter)
        if (draft.effects?.brightness !== undefined) setBrightness(draft.effects.brightness)
        if (draft.effects?.contrast !== undefined) setContrast(draft.effects.contrast)
        if (draft.effects?.saturation !== undefined) setSaturation(draft.effects.saturation)
        if (draft.effects?.transition) setTransition(draft.effects.transition)
        if (draft.effects?.background?.mode) setBackgroundMode(draft.effects.background.mode)
        if (draft.effects?.background?.color) setBackgroundColor(draft.effects.background.color)
        if (draft.audio?.originalMuted !== undefined) setOriginalMuted(draft.audio.originalMuted)
        if (draft.audio?.bgmVolume !== undefined) setBgmVolume(draft.audio.bgmVolume)
        if (Array.isArray(draft.subtitles)) setSubtitles(draft.subtitles)
        if (Array.isArray(draft.segments)) setSegments(draft.segments)
        if (draft.format?.aspectRatio) setAspectRatio(draft.format.aspectRatio)
        if (draft.format?.quality) setQuality(draft.format.quality)
        if (draft.format?.durationLimit) setDurationLimit(draft.format.durationLimit)
        if (draft.format?.watermark?.text) setWatermarkText(draft.format.watermark.text)
        if (draft.format?.watermark?.enabled !== undefined) setWatermark(draft.format.watermark.enabled)
        if (draft.format?.watermark?.opacity !== undefined) setWatermarkOpacity(draft.format.watermark.opacity)
    }

    const loadDraft = (projectId: string, name: string) => {
        const item = readDraftList().find((p) => p.id === projectId)
        if (!item?.draft) return toast.error('ไม่พบข้อมูล draft')
        snapshotState()
        applyDraft(item.draft)
        toast.success(`โหลด draft: ${name}`)
    }

    const renameDraft = (projectId: string) => {
        const current = projects.find((item) => item.id === projectId)?.name || ''
        const nextName = window.prompt('เปลี่ยนชื่อ draft', current)?.trim()
        if (!nextName) return
        const nextList = readDraftList().map((item) => (item.id === projectId ? { ...item, name: nextName, updatedAt: 'ตอนนี้' } : item))
        persistDraftList(nextList)
        toast.success('เปลี่ยนชื่อแล้ว')
    }

    const deleteDraft = (projectId: string) => {
        persistDraftList(readDraftList().filter((item) => item.id !== projectId))
        toast.success('ลบ draft แล้ว')
    }

    const shareLink = async () => {
        const payload = {
            outputName,
            trimStart,
            trimEnd,
            effects: { filter, brightness, contrast, saturation, transition, background: { mode: backgroundMode, color: backgroundColor } },
            format: { aspectRatio, quality, durationLimit, watermark: { enabled: watermark, text: watermarkText, opacity: watermarkOpacity } },
            subtitles,
            segments,
        }
        try {
            const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(payload)))))
            const url = `${window.location.origin}${window.location.pathname}?share=${encoded}`
            if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url)
            else window.prompt('คัดลอกลิงก์', url)
            setLoadedFromShare(true)
            window.setTimeout(() => setLoadedFromShare(false), 1500)
            toast.success('คัดลอกลิงก์แล้ว')
        } catch {
            toast.error('ไม่สามารถคัดลอกลิงก์ได้')
        }
    }

    // restore share link + saved draft exactly once on mount
    useEffect(() => {
        const share = new URLSearchParams(window.location.search).get('share')
        if (share) {
            try {
                applyDraft(JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(share))))))
                setLoadedFromShare(true)
                window.setTimeout(() => setLoadedFromShare(false), 2500)
                toast.success('โหลดโปรเจกต์จากลิงก์แล้ว')
            } catch {
                toast.error('ลิงก์ที่แชร์ไม่ถูกต้อง')
            }
        } else {
            try {
                const saved = localStorage.getItem(DRAFT_KEY)
                if (saved) applyDraft(JSON.parse(saved))
            } catch {
                // ignore invalid draft
            }
        }
        setProjects(readDraftList().map(({ draft: _draft, ...item }) => item))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // ------------------------------------------------------------------ export

    const handleExport = async () => {
        if (!readyToExport) {
            return toast.error(uploadState === 'uploading' ? 'กำลังอัปโหลด — รอสักครู่' : 'อัปโหลดวิดีโอก่อน export')
        }
        if (exporting) return
        setExporting(true)
        setExportResult(null)
        setProgress(1)
        try {
            const res = await fetch('/api/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(exportSettings),
            })
            const jobId = res.headers.get('X-Job-Id')
            if (jobId) setExportJobId(jobId)
            if (!res.body) throw new Error('No response body')

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let failed = false
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
                    if (typeof evt.progress === 'number') setProgress(evt.progress)
                    if (Array.isArray(evt.warnings)) evt.warnings.forEach((warning: string) => toast.warning(warning))
                    if (evt.done) {
                        if (evt.error) {
                            failed = true
                            toast.error(evt.error)
                        } else if (evt.outputFile) {
                            setExportResult({ outputFile: evt.outputFile, downloadUrl: evt.downloadUrl })
                            toast.success('Export เสร็จแล้ว', { description: evt.outputFile })
                        }
                    }
                }
            }
            setProgress(failed ? 0 : 100)
        } catch (error) {
            setProgress(0)
            toast.error(error instanceof Error ? error.message : 'Export ไม่สำเร็จ')
        } finally {
            setExporting(false)
        }
    }

    // --------------------------------------------------------------- timeline

    const onTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect()
        seek(((e.clientX - rect.left) / rect.width) * (duration || 1))
    }

    // drag handlers need live values, not the ones captured at mousedown
    const trimStartRef = useRef(trimStart)
    const trimEndRef = useRef(trimEnd)
    useEffect(() => {
        trimStartRef.current = trimStart
        trimEndRef.current = trimEnd
    }, [trimEnd, trimStart])

    const startDragHandle = (which: 'start' | 'end') => (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault()
        snapshotState()
        const timeline = document.getElementById('edit-clip-timeline')
        if (!timeline) return
        const move = (ev: MouseEvent) => {
            const rect = timeline.getBoundingClientRect()
            const time = clamp(((ev.clientX - rect.left) / rect.width) * (duration || 1), 0, duration || 0)
            if (which === 'start') setTrimStart(clamp(time, 0, Math.max(0, trimEndRef.current - 0.1)))
            else setTrimEnd(clamp(time, trimStartRef.current + 0.1, duration || time))
        }
        const up = () => {
            window.removeEventListener('mousemove', move)
            window.removeEventListener('mouseup', up)
        }
        window.addEventListener('mousemove', move)
        window.addEventListener('mouseup', up)
    }

    const transitionStyle = useMemo(() => {
        switch (transition) {
            case 'Fade':
                return { opacity: 0.96, transform: 'scale(0.995)', transition: 'all 180ms ease' }
            case 'Slide left':
                return { transform: 'translateX(-4px)', transition: 'all 180ms ease' }
            case 'Slide right':
                return { transform: 'translateX(4px)', transition: 'all 180ms ease' }
            case 'Zoom in':
                return { transform: 'scale(1.015)', transition: 'all 180ms ease' }
            default:
                return { transition: 'all 180ms ease' }
        }
    }, [transition])

    const pct = (time: number) => (duration ? clamp((time / duration) * 100, 0, 100) : 0)

    return (
        <div className="min-h-screen bg-[#0f0f0f] text-white">
            <div className="border-b border-white/10 bg-black/30 backdrop-blur-xl">
                <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 py-4">
                    <div>
                        <div className="flex items-center gap-3 text-sm text-white/60">
                            <Clapperboard className="h-4 w-4 text-[#fe2c55]" />
                            /programs/edit-clip
                        </div>
                        <h1 className="mt-1 text-2xl font-semibold tracking-tight">TikTok Clip Editor</h1>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/60">
                        <BadgeInfo className="h-4 w-4" />
                        {autosave}
                        {loadedFromShare ? ' · โหลดจากลิงก์แชร์' : ''}
                        {exportJobId ? ` · Job ${exportJobId.slice(0, 8)}` : ''}
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

                                {selectedFileInfo ? (
                                    <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm">
                                        <div className="font-medium">{selectedFileInfo.name}</div>
                                        <div className="mt-1 text-white/60">{selectedFileInfo.size}</div>
                                        <div className="mt-3 rounded-lg bg-white/5 p-2 text-xs text-white/55">
                                            ความยาว: {shortTime(duration)}
                                        </div>
                                        <div
                                            className={cn(
                                                'mt-2 rounded-lg p-2 text-xs',
                                                uploadState === 'ready' && 'bg-emerald-500/10 text-emerald-300',
                                                uploadState === 'uploading' && 'bg-white/5 text-white/55',
                                                uploadState === 'error' && 'bg-red-500/10 text-red-300'
                                            )}
                                        >
                                            {uploadState === 'ready' && 'อัปโหลดแล้ว · พร้อม export'}
                                            {uploadState === 'uploading' && 'กำลังอัปโหลด…'}
                                            {uploadState === 'error' && 'อัปโหลดไม่สำเร็จ — export ยังใช้ไม่ได้'}
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
                            <CardHeader>
                                <CardTitle className="text-base">Project Drafts</CardTitle>
                                <CardDescription className="text-white/50">รายการงานที่บันทึกไว้</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {projects.length === 0 ? (
                                    <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/55">
                                        ยังไม่มี draft ที่บันทึกไว้
                                    </div>
                                ) : (
                                    projects.map((project) => (
                                        <div
                                            key={project.id}
                                            className="rounded-xl border border-white/10 bg-black/20 p-3 transition hover:border-white/20 hover:bg-white/5"
                                        >
                                            <button onClick={() => loadDraft(project.id, project.name)} className="w-full text-left">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="font-medium">{project.name}</div>
                                                    <ChevronRight className="h-4 w-4 text-white/40" />
                                                </div>
                                                <div className="mt-1 text-xs text-white/45">
                                                    {project.updatedAt} · {project.duration}
                                                </div>
                                            </button>
                                            <div className="mt-3 flex gap-2">
                                                <Button
                                                    onClick={() => renameDraft(project.id)}
                                                    variant="secondary"
                                                    className="flex-1 bg-white/10 text-white hover:bg-white/15"
                                                >
                                                    Rename
                                                </Button>
                                                <Button
                                                    onClick={() => deleteDraft(project.id)}
                                                    variant="secondary"
                                                    className="bg-white/10 text-white hover:bg-white/15"
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </aside>

                    {/* ------------------------------------------------ main */}
                    <main className="space-y-6 overflow-hidden xl:overflow-auto">
                        <Card className="border-white/10 bg-white/5 text-white">
                            <CardContent className="space-y-4 p-4 md:p-6">
                                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black p-4 shadow-2xl md:p-8">
                                    <div
                                        className="relative mx-auto h-full max-h-[52vh] rounded-[2rem] border border-white/15 bg-black/70 p-3"
                                        style={{
                                            aspectRatio: aspectRatio.replace(':', ' / '),
                                            backgroundColor: backgroundMode === 'Color' ? backgroundColor : undefined,
                                        }}
                                    >
                                        <div
                                            className={cn(
                                                'absolute inset-3 rounded-[1.5rem]',
                                                backgroundMode === 'Blur' && 'backdrop-blur-xl',
                                                backgroundMode === 'Black' && 'bg-black/30'
                                            )}
                                        />
                                        <div className="relative z-10 h-full overflow-hidden rounded-[1.25rem] border border-white/10 bg-black">
                                            <div className="h-full w-full" style={transitionStyle}>
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
                                                        style={{ filter: filterCss }}
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
                                                <div className="rounded-full bg-black/45 px-3 py-1 text-[11px] text-white/80 backdrop-blur">
                                                    {aspectRatio} · {quality} · {transition}
                                                </div>
                                            </div>
                                            {watermark && watermarkText && (
                                                <div
                                                    className="pointer-events-none absolute bottom-4 right-4 rounded-full bg-black/40 px-3 py-1 text-xs text-white"
                                                    style={{ opacity: watermarkOpacity / 100 }}
                                                >
                                                    {watermarkText}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <Button onClick={() => void togglePlay()} variant="secondary" className="bg-white/10 text-white hover:bg-white/15">
                                        {playing ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                                        {playing ? 'Pause' : 'Play'}
                                    </Button>
                                    <Button onClick={() => seek(currentTime - 1)} variant="secondary" className="bg-white/10 text-white hover:bg-white/15">
                                        <ArrowLeft className="mr-2 h-4 w-4" />-1s
                                    </Button>
                                    <Button onClick={() => seek(currentTime + 1)} variant="secondary" className="bg-white/10 text-white hover:bg-white/15">
                                        <ArrowRight className="mr-2 h-4 w-4" />+1s
                                    </Button>
                                    <Button
                                        onClick={() => setLoopTrim((v) => !v)}
                                        variant="secondary"
                                        className={cn('bg-white/10 text-white hover:bg-white/15', loopTrim && 'bg-[#fe2c55]/20 text-[#fe2c55]')}
                                    >
                                        <Repeat className="mr-2 h-4 w-4" />
                                        วนช่วงที่ตัด
                                    </Button>
                                    <Button
                                        onClick={() => setPlaybackRate(PLAYBACK_RATES[(PLAYBACK_RATES.indexOf(playbackRate) + 1) % PLAYBACK_RATES.length])}
                                        variant="secondary"
                                        className="bg-white/10 text-white hover:bg-white/15"
                                        title="ความเร็วพรีวิวเท่านั้น ไม่มีผลกับไฟล์ที่ export"
                                    >
                                        <Gauge className="mr-2 h-4 w-4" />
                                        พรีวิว {playbackRate}x
                                    </Button>
                                    <div className="ml-auto flex items-center gap-2 text-sm text-white/70">
                                        <Volume1 className="h-4 w-4" />
                                        <Slider value={[volume]} min={0} max={100} step={1} onValueChange={(v) => setVolume(v[0])} className="w-32" />
                                        <Volume2 className="h-4 w-4" />
                                        <span className="w-9 text-right text-xs text-white/50">{volume}%</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm text-white/60">
                                        <span>{shortTime(currentTime)}</span>
                                        <span>{shortTime(duration)}</span>
                                    </div>
                                    <div className="relative h-4 cursor-pointer rounded-full bg-white/10" onClick={onTrackClick}>
                                        <div className="absolute inset-y-0 rounded-full bg-yellow-400/40" style={{ left: `${pct(trimStart)}%`, width: `${pct(trimEnd) - pct(trimStart)}%` }} />
                                        <div className="absolute inset-y-0 left-0 rounded-full bg-[#fe2c55]/70" style={{ width: `${pct(currentTime)}%` }} />
                                        <div className="absolute -top-1 h-6 w-1 rounded-full bg-white shadow-lg" style={{ left: `calc(${pct(currentTime)}% - 2px)` }} />
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
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label className="text-white/60">Trim Start</Label>
                                        <Input value={shortTime(trimStart)} readOnly className="border-white/10 bg-black/30 font-mono text-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-white/60">Trim End</Label>
                                        <Input value={shortTime(trimEnd)} readOnly className="border-white/10 bg-black/30 font-mono text-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-white/60">Duration</Label>
                                        <Input value={shortTime(clipLength)} readOnly className="border-white/10 bg-black/30 font-mono text-[#fe2c55]" />
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm text-white/60">
                                            <span>Trim Start</span>
                                            <span>{shortTime(trimStart)}</span>
                                        </div>
                                        <Slider
                                            value={[trimStart]}
                                            min={0}
                                            max={duration || 100}
                                            step={0.1}
                                            onValueChange={(v) => applyTrimStart(v[0])}
                                            onValueCommit={snapshotState}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm text-white/60">
                                            <span>Trim End</span>
                                            <span>{shortTime(trimEnd)}</span>
                                        </div>
                                        <Slider
                                            value={[trimEnd]}
                                            min={0}
                                            max={duration || 100}
                                            step={0.1}
                                            onValueChange={(v) => applyTrimEnd(v[0])}
                                            onValueCommit={snapshotState}
                                        />
                                    </div>
                                </div>

                                <div id="edit-clip-timeline" className="relative h-10 rounded-full bg-white/10">
                                    <div className="absolute inset-y-0 rounded-full bg-yellow-400/40" style={{ left: `${pct(trimStart)}%`, width: `${pct(trimEnd) - pct(trimStart)}%` }} />
                                    <div className="absolute inset-y-0 w-0.5 bg-[#fe2c55]" style={{ left: `${pct(currentTime)}%` }} />
                                    <div
                                        onMouseDown={startDragHandle('start')}
                                        role="slider"
                                        aria-label="Trim start"
                                        aria-valuenow={trimStart}
                                        tabIndex={0}
                                        className="absolute top-[-4px] h-12 w-2 cursor-ew-resize rounded-full bg-white shadow-lg"
                                        style={{ left: `calc(${pct(trimStart)}% - 1px)` }}
                                    />
                                    <div
                                        onMouseDown={startDragHandle('end')}
                                        role="slider"
                                        aria-label="Trim end"
                                        aria-valuenow={trimEnd}
                                        tabIndex={0}
                                        className="absolute top-[-4px] h-12 w-2 cursor-ew-resize rounded-full bg-white shadow-lg"
                                        style={{ left: `calc(${pct(trimEnd)}% - 1px)` }}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white/45">
                                        ลากที่จับเพื่อกำหนดช่วง
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs text-white/45">
                                        <span>ช่วงคลิป ({segments.length})</span>
                                        <span>คลิกเพื่อเลือกช่วงที่จะ export</span>
                                    </div>
                                    <div className="relative h-10 overflow-hidden rounded-xl bg-black/30">
                                        {segments.map((segment) => (
                                            <button
                                                key={segment.id}
                                                onClick={() => selectSegment(segment)}
                                                className={cn(
                                                    'absolute inset-y-1 rounded-lg border text-[10px] transition',
                                                    selectedSegmentId === segment.id
                                                        ? 'border-[#fe2c55] bg-[#fe2c55]/25 text-white'
                                                        : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                                                )}
                                                style={{ left: `${pct(segment.start)}%`, width: `${Math.max(pct(segment.end) - pct(segment.start), 3)}%` }}
                                            >
                                                {shortTime(segment.start)}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/55">
                                        {highlightRange
                                            ? `ไฮไลต์: ${shortTime(highlightRange.start)} → ${shortTime(highlightRange.end)}`
                                            : 'ยังไม่ได้วิเคราะห์ช่วงไฮไลต์'}
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <Button variant="secondary" onClick={splitAtCurrentTime} className="bg-white/10 text-white hover:bg-white/15">
                                        <SquareSplitHorizontal className="mr-2 h-4 w-4" />
                                        แบ่ง (S)
                                    </Button>
                                    <Button variant="secondary" onClick={deleteSelectedSegment} className="bg-white/10 text-white hover:bg-white/15">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        ลบช่วง
                                    </Button>
                                    <Button variant="secondary" onClick={addSegmentFromPlayhead} className="bg-white/10 text-white hover:bg-white/15">
                                        <Plus className="mr-2 h-4 w-4" />
                                        เพิ่มช่วง
                                    </Button>
                                    <Button variant="secondary" onClick={undo} className="bg-white/10 text-white hover:bg-white/15">
                                        <Undo2 className="mr-2 h-4 w-4" />
                                        Undo
                                    </Button>
                                    <Button variant="secondary" onClick={redo} className="bg-white/10 text-white hover:bg-white/15">
                                        <Redo2 className="mr-2 h-4 w-4" />
                                        Redo
                                    </Button>
                                    <div className="ml-auto rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/50">
                                        Space เล่น · [ ] ตัด · ←→ เลื่อน · Ctrl+Z/Y
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </main>

                    {/* ----------------------------------------------- right */}
                    <aside className="space-y-6">
                        <Card className="border-white/10 bg-white/5 text-white">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Inspector</CardTitle>
                                <CardDescription className="text-white/50">Effects · Text · Audio · Format</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                                    <TabsList className="grid grid-cols-4 bg-black/30">
                                        <TabsTrigger value="effects">Effects</TabsTrigger>
                                        <TabsTrigger value="text">Text</TabsTrigger>
                                        <TabsTrigger value="audio">Audio</TabsTrigger>
                                        <TabsTrigger value="format">Format</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="effects" className="mt-4 space-y-4">
                                        <div className="grid grid-cols-2 gap-2">
                                            {FILTERS.map((item) => (
                                                <button
                                                    key={item.name}
                                                    onClick={() => {
                                                        snapshotState()
                                                        setFilter(item.name)
                                                    }}
                                                    className={cn(
                                                        'rounded-xl border px-3 py-2 text-left text-sm transition',
                                                        filter === item.name
                                                            ? 'border-[#fe2c55] bg-[#fe2c55]/10 text-white'
                                                            : 'border-white/10 bg-black/20 text-white/70 hover:bg-white/5'
                                                    )}
                                                >
                                                    {item.name}
                                                </button>
                                            ))}
                                        </div>

                                        {(
                                            [
                                                ['Brightness', brightness, setBrightness],
                                                ['Contrast', contrast, setContrast],
                                                ['Saturation', saturation, setSaturation],
                                            ] as [string, number, React.Dispatch<React.SetStateAction<number>>][]
                                        ).map(([label, value, setter]) => (
                                            <div key={label} className="space-y-2">
                                                <div className="flex items-center justify-between text-sm text-white/60">
                                                    <span>{label}</span>
                                                    <span>{value}</span>
                                                </div>
                                                <Slider
                                                    value={[value]}
                                                    min={-100}
                                                    max={100}
                                                    step={1}
                                                    onValueChange={(v) => setter(v[0])}
                                                    onValueCommit={snapshotState}
                                                />
                                            </div>
                                        ))}

                                        <div className="space-y-2">
                                            <Label className="text-white/60">Transition</Label>
                                            <select
                                                value={transition}
                                                onChange={(e) => {
                                                    snapshotState()
                                                    setTransition(e.target.value)
                                                }}
                                                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                                            >
                                                {TRANSITIONS.map((opt) => (
                                                    <option key={opt}>{opt}</option>
                                                ))}
                                            </select>
                                            {['Slide left', 'Slide right'].includes(transition) && (
                                                <p className="text-[11px] text-white/40">
                                                    Slide เป็นเอฟเฟกต์พรีวิวเท่านั้น ไฟล์ที่ export จะไม่มีการเลื่อน
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-white/60">Background</Label>
                                            <div className="grid grid-cols-3 gap-2 text-xs">
                                                {(['Blur', 'Color', 'Black'] as const).map((mode) => (
                                                    <button
                                                        key={mode}
                                                        onClick={() => setBackgroundMode(mode)}
                                                        className={cn(
                                                            'rounded-lg border px-2 py-2',
                                                            backgroundMode === mode ? 'border-[#fe2c55] bg-[#fe2c55]/10' : 'border-white/10 bg-black/20'
                                                        )}
                                                    >
                                                        {mode}
                                                    </button>
                                                ))}
                                            </div>
                                            {backgroundMode === 'Color' && (
                                                <Input
                                                    type="color"
                                                    value={backgroundColor}
                                                    onChange={(e) => setBackgroundColor(e.target.value)}
                                                    className="h-10 border-white/10 bg-black/30 p-1"
                                                />
                                            )}
                                            <p className="text-[11px] text-white/40">ใช้เติมพื้นที่ว่างเมื่อสัดส่วนวิดีโอไม่ตรงกับที่เลือก</p>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="text" className="mt-4 space-y-4">
                                        <Button
                                            onClick={generateCaptions}
                                            disabled={isTranscribing || !readyToExport}
                                            className="w-full bg-[#fe2c55] text-white hover:bg-[#fe2c55]/90"
                                        >
                                            {isTranscribing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                            Generate Captions (AI)
                                        </Button>
                                        <p className="-mt-2 text-[11px] text-amber-300/80">
                                            ยังเป็นตัวอย่าง — คืนคำบรรยายชุดเดิมทุกครั้ง ยังไม่ได้ถอดเสียงจากคลิปจริง
                                        </p>
                                        <Button onClick={suggestCaptions} variant="secondary" className="w-full bg-white/10 text-white hover:bg-white/15">
                                            แนะนำแคปชั่น & แฮชแท็ก
                                        </Button>
                                        <Button onClick={findBestMoments} variant="secondary" className="w-full bg-white/10 text-white hover:bg-white/15">
                                            หาช่วงที่น่าสนใจ
                                        </Button>

                                        <div className="space-y-2">
                                            <Label className="text-white/60">เพิ่มคำบรรยายเอง</Label>
                                            <Input
                                                value={subtitleText}
                                                onChange={(e) => setSubtitleText(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') addSubtitle()
                                                }}
                                                placeholder="พิมพ์ข้อความคำบรรยาย"
                                                className="border-white/10 bg-black/30 text-white"
                                            />
                                            <Button onClick={addSubtitle} variant="secondary" className="w-full bg-white/10 text-white hover:bg-white/15">
                                                + เพิ่มที่ {shortTime(currentTime)}
                                            </Button>
                                        </div>

                                        {captionIdeas.length > 0 && (
                                            <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
                                                <div className="text-xs font-semibold uppercase tracking-wide text-white/45">Caption ideas</div>
                                                {captionIdeas.map((item) => (
                                                    <div key={item} className="rounded-lg bg-white/5 px-3 py-2 text-sm text-white/80">
                                                        {item}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {hashtagIdeas.length > 0 && (
                                            <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
                                                <div className="text-xs font-semibold uppercase tracking-wide text-white/45">Hashtags</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {hashtagIdeas.map((tag) => (
                                                        <span key={tag} className="rounded-full bg-[#fe2c55]/10 px-3 py-1 text-xs text-[#fe2c55]">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            {subtitles.map((sub) => (
                                                <div
                                                    key={sub.id}
                                                    className={cn(
                                                        'rounded-xl border p-3 transition',
                                                        activeSubtitleId === sub.id ? 'border-[#fe2c55] bg-[#fe2c55]/10' : 'border-white/10 bg-black/20'
                                                    )}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <button onClick={() => setActiveSubtitleId(sub.id)} className="flex-1 text-left">
                                                            <div className="text-xs text-white/45">
                                                                [{sub.startTime.toFixed(1)} → {sub.endTime.toFixed(1)}]
                                                            </div>
                                                            <div className="mt-1 text-sm">{sub.text}</div>
                                                        </button>
                                                        <button
                                                            onClick={() => removeSubtitle(sub.id)}
                                                            aria-label="ลบคำบรรยาย"
                                                            className="rounded-lg p-1 text-white/40 hover:bg-white/10 hover:text-white"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>

                                                    {activeSubtitleId === sub.id && (
                                                        <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                                                            <Input
                                                                value={sub.text}
                                                                onChange={(e) => updateSubtitle(sub.id, { text: e.target.value })}
                                                                onFocus={snapshotState}
                                                                className="border-white/10 bg-black/30 text-white"
                                                            />
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <Label className="text-[11px] text-white/45">เริ่ม (วินาที)</Label>
                                                                    <Input
                                                                        type="number"
                                                                        step={0.1}
                                                                        value={sub.startTime.toFixed(1)}
                                                                        onChange={(e) => updateSubtitle(sub.id, { startTime: Number(e.target.value) })}
                                                                        className="border-white/10 bg-black/30 text-white"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <Label className="text-[11px] text-white/45">จบ (วินาที)</Label>
                                                                    <Input
                                                                        type="number"
                                                                        step={0.1}
                                                                        value={sub.endTime.toFixed(1)}
                                                                        onChange={(e) => updateSubtitle(sub.id, { endTime: Number(e.target.value) })}
                                                                        className="border-white/10 bg-black/30 text-white"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <Button
                                                                onClick={() => seek(sub.startTime)}
                                                                variant="secondary"
                                                                className="w-full bg-white/10 text-white hover:bg-white/15"
                                                            >
                                                                ไปที่ตำแหน่งนี้
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="audio" className="mt-4 space-y-4">
                                        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3">
                                            <span className="text-sm">ปิดเสียงต้นฉบับ</span>
                                            <button
                                                onClick={() => setOriginalMuted((v) => !v)}
                                                className={cn('rounded-full px-3 py-1 text-xs', originalMuted ? 'bg-[#fe2c55] text-white' : 'bg-white/10 text-white')}
                                            >
                                                {originalMuted ? 'Muted' : 'On'}
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm text-white/60">
                                                <span>ระดับเพลงพื้นหลัง</span>
                                                <span>{bgmVolume}%</span>
                                            </div>
                                            <Slider value={[bgmVolume]} min={0} max={100} step={1} onValueChange={(v) => setBgmVolume(v[0])} />
                                        </div>

                                        <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/20 px-3 py-3 text-sm text-white/70 transition hover:bg-white/5">
                                            <input
                                                type="file"
                                                accept="audio/*"
                                                className="hidden"
                                                onChange={(e) => void onPickMusic(e.target.files?.[0] ?? null)}
                                            />
                                            <Music className="mr-2 h-4 w-4" />
                                            อัปโหลดเพลงพื้นหลัง
                                        </label>

                                        {musicBlobUrl && (
                                            <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
                                                <div className="text-xs text-white/55">
                                                    {musicMedia?.name ?? 'กำลังอัปโหลด…'}
                                                    {musicMedia ? ' · พร้อมใช้ตอน export' : ''}
                                                </div>
                                                <audio controls src={musicBlobUrl} className="w-full" />
                                                <Button onClick={clearMusic} variant="secondary" className="w-full bg-white/10 text-white hover:bg-white/15">
                                                    ลบเพลง
                                                </Button>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-2">
                                            <Button
                                                onClick={() => void startVoiceover()}
                                                variant="secondary"
                                                className={cn('bg-white/10 text-white hover:bg-white/15', voiceoverRecording && 'bg-[#fe2c55] hover:bg-[#fe2c55]/90')}
                                            >
                                                <Mic className="mr-2 h-4 w-4" />
                                                {voiceoverRecording ? 'กำลังอัด…' : 'อัดเสียงพากย์'}
                                            </Button>
                                            <Button onClick={stopVoiceover} disabled={!voiceoverRecording} variant="secondary" className="bg-white/10 text-white hover:bg-white/15">
                                                หยุด
                                            </Button>
                                        </div>

                                        <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/55">
                                            สถานะ: {voiceoverStatus}
                                            {voiceoverTime > 0 ? ` · ${voiceoverTime}s` : ''}
                                            {voiceMedia ? ` · ${voiceMedia.name}` : ''}
                                        </div>

                                        {voiceoverBlobUrl && (
                                            <>
                                                <audio controls src={voiceoverBlobUrl} className="w-full" />
                                                <Button onClick={resetVoiceover} variant="secondary" className="w-full bg-white/10 text-white hover:bg-white/15">
                                                    ลบเสียงพากย์
                                                </Button>
                                            </>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="format" className="mt-4 space-y-4">
                                        <div className="grid grid-cols-3 gap-2">
                                            {(['9:16', '1:1', '16:9'] as const).map((ratio) => (
                                                <button
                                                    key={ratio}
                                                    onClick={() => setAspectRatio(ratio)}
                                                    className={cn(
                                                        'rounded-xl border px-2 py-3 text-sm',
                                                        aspectRatio === ratio ? 'border-[#fe2c55] bg-[#fe2c55]/10' : 'border-white/10 bg-black/20'
                                                    )}
                                                >
                                                    {ratio}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-white/60">จำกัดความยาว</Label>
                                            <select
                                                value={durationLimit}
                                                onChange={(e) => setDurationLimit(e.target.value)}
                                                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                                            >
                                                <option value="15">15s max</option>
                                                <option value="30">30s max</option>
                                                <option value="60">60s max</option>
                                                <option value="180">3 min max</option>
                                                <option value="unlimited">ไม่จำกัด</option>
                                            </select>
                                            {durationLimit !== 'unlimited' && clipLength > Number(durationLimit) && (
                                                <p className="text-[11px] text-amber-300">
                                                    ช่วงที่เลือกยาว {shortTime(clipLength)} — จะถูกตัดเหลือ {durationLimit}s ตอน export
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-white/60">คุณภาพ</Label>
                                            <div className="grid grid-cols-3 gap-2 text-xs">
                                                {(['720p', '1080p', 'original'] as const).map((q) => (
                                                    <button
                                                        key={q}
                                                        onClick={() => setQuality(q)}
                                                        className={cn(
                                                            'rounded-lg border px-2 py-2',
                                                            quality === q ? 'border-[#fe2c55] bg-[#fe2c55]/10' : 'border-white/10 bg-black/20'
                                                        )}
                                                    >
                                                        {q}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-white/60">ลายน้ำ</Label>
                                            <Input
                                                value={watermarkText}
                                                onChange={(e) => setWatermarkText(e.target.value)}
                                                className="border-white/10 bg-black/30 text-white"
                                            />
                                            <label className="flex items-center gap-3 text-sm text-white/70">
                                                <input type="checkbox" checked={watermark} onChange={(e) => setWatermark(e.target.checked)} />
                                                เปิดใช้งาน
                                            </label>
                                            <div className="flex items-center gap-2 text-sm text-white/60">
                                                <span>ความทึบ</span>
                                                <Slider value={[watermarkOpacity]} min={20} max={80} step={1} onValueChange={(v) => setWatermarkOpacity(v[0])} />
                                                <span className="w-8 text-right text-xs">{watermarkOpacity}</span>
                                            </div>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>

                        <Card className="border-white/10 bg-white/5 text-white">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Export</CardTitle>
                                <CardDescription className="text-white/50">ตั้งชื่อไฟล์ บันทึก draft และ export</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {exporting && (
                                    <div className="space-y-1">
                                        <Progress value={progress} />
                                        <div className="text-xs text-white/55">กำลัง export {progress}%</div>
                                    </div>
                                )}

                                <Input
                                    value={outputName}
                                    onChange={(e) => setOutputName(e.target.value)}
                                    className="border-white/10 bg-black/30 text-white"
                                    placeholder="ชื่อไฟล์ผลลัพธ์"
                                />

                                <Button onClick={saveDraft} variant="secondary" className="w-full bg-white/10 text-white hover:bg-white/15">
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Draft
                                </Button>

                                <Button
                                    onClick={() => void handleExport()}
                                    disabled={exporting || !readyToExport}
                                    className="w-full bg-[#fe2c55] text-white hover:bg-[#fe2c55]/90 disabled:opacity-40"
                                >
                                    {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                    Export
                                </Button>

                                {!readyToExport && (
                                    <p className="text-[11px] text-white/45">
                                        {uploadState === 'uploading' ? 'กำลังอัปโหลดไฟล์…' : 'ต้องอัปโหลดวิดีโอให้เสร็จก่อนจึงจะ export ได้'}
                                    </p>
                                )}

                                {exportResult && (
                                    <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                                        <div className="break-all">{exportResult.outputFile}</div>
                                        <a
                                            href={exportResult.downloadUrl}
                                            download
                                            className="flex items-center justify-center rounded-lg bg-emerald-500/20 px-3 py-2 font-medium text-emerald-100 hover:bg-emerald-500/30"
                                        >
                                            <Download className="mr-2 h-4 w-4" />
                                            ดาวน์โหลดไฟล์
                                        </a>
                                    </div>
                                )}

                                <Button onClick={() => void shareLink()} variant="outline" className="w-full border-white/10 bg-black/20 text-white hover:bg-white/5">
                                    <Share2 className="mr-2 h-4 w-4" />
                                    คัดลอกลิงก์แชร์
                                </Button>

                                <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/55">
                                    <div className="flex items-center gap-2 text-white/70">
                                        <Scissors className="h-4 w-4 text-[#fe2c55]" />
                                        Payload preview
                                    </div>
                                    <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap break-words text-[10px] text-white/40">
                                        {JSON.stringify(exportSettings, null, 2)}
                                    </pre>
                                </div>
                            </CardContent>
                        </Card>
                    </aside>
                </div>
            </div>
        </div>
    )
}

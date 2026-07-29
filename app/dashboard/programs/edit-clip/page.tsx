'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
    ArrowLeft,
    ArrowRight,
    AudioLines,
    BadgeInfo,
    ChevronRight,
    CirclePlay,
    Clapperboard,
    Download,
    Film,
    ImagePlus,
    Loader2,
    Mic,
    Pause,
    Play,
    Plus,
    Redo2,
    Scissors,
    Save,
    Share2,
    Sparkles,
    SquareSplitHorizontal,
    Trash2,
    Undo2,
    Upload,
    Volume1,
    Volume2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { shortTime, timelineMarkers } from '@/components/video-editor/edit-clip-utils'
import { createInitialEditClipStore } from '@/components/video-editor/edit-clip-store'
import type { ClipSegment, DraftProject, FilterPreset, Subtitle } from '@/components/video-editor/edit-clip.types'

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

export default function EditClipPage() {
    const initialStore = createInitialEditClipStore()
    const [projects, setProjects] = useState<DraftProject[]>(initialStore.projects)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [uploadedPath, setUploadedPath] = useState<string | null>(null)
    const [videoUrl, setVideoUrl] = useState<string | null>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const [duration, setDuration] = useState(0)
    const [currentTime, setCurrentTime] = useState(0)
    const [playing, setPlaying] = useState(false)
    const [volume, setVolume] = useState(80)
    const [trimStart, setTrimStart] = useState(0)
    const [trimEnd, setTrimEnd] = useState(0)
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
    const [voiceoverRecording, setVoiceoverRecording] = useState(false)
    const [voiceoverTime, setVoiceoverTime] = useState(0)
    const [voiceoverBlobUrl, setVoiceoverBlobUrl] = useState<string | null>(null)
    const [voiceoverStatus, setVoiceoverStatus] = useState<'idle' | 'recording' | 'ready'>('idle')
    const [voiceoverName, setVoiceoverName] = useState('voiceover.webm')
    const [musicBlobUrl, setMusicBlobUrl] = useState<string | null>(null)
    const [musicName, setMusicName] = useState('background-music.mp3')
    const [autosave, setAutosave] = useState('Saved just now')
    const [loadedFromShare, setLoadedFromShare] = useState(false)
    const [exporting, setExporting] = useState(false)
    const [progress, setProgress] = useState(0)
    const [segments, setSegments] = useState<ClipSegment[]>(initialStore.segments)
    const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(initialStore.segments[0]?.id ?? null)
    const [exportJobId, setExportJobId] = useState<string | null>(null)
    const [isTranscribing, setIsTranscribing] = useState(false)
    const historyRef = useRef<Array<{
        trimStart: number
        trimEnd: number
        filter: string
        subtitles: Subtitle[]
        segments: ClipSegment[]
        outputName: string
    }>>([])
    const futureRef = useRef<Array<{
        trimStart: number
        trimEnd: number
        filter: string
        subtitles: Subtitle[]
        segments: ClipSegment[]
        outputName: string
    }>>([])

    const snapshotState = useCallback(() => {
        historyRef.current.push({ trimStart, trimEnd, filter, subtitles, segments, outputName })
        if (historyRef.current.length > 20) historyRef.current.shift()
        futureRef.current = []
    }, [filter, outputName, segments, subtitles, trimEnd, trimStart])

    const restoreSnapshot = useCallback((state: {
        trimStart: number
        trimEnd: number
        filter: string
        subtitles: Subtitle[]
        segments: ClipSegment[]
        outputName: string
    }) => {
        setTrimStart(state.trimStart)
        setTrimEnd(state.trimEnd)
        setFilter(state.filter)
        setSubtitles(state.subtitles)
        setSegments(state.segments)
        setOutputName(state.outputName)
    }, [])

    const filterCss = useMemo(() => {
        const preset = FILTERS.find((f) => f.name === filter)?.css ?? 'none'
        return `${preset} brightness(${1 + brightness / 100}) contrast(${1 + contrast / 100}) saturate(${1 + saturation / 100})`
    }, [brightness, contrast, saturation, filter])

    const selectedFileInfo = useMemo(() => {
        if (!selectedFile) return null
        return { name: selectedFile.name, size: `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB` }
    }, [selectedFile])

    const clipLength = trimEnd - trimStart
    const selectedSubtitle = subtitles.find((s) => s.id === activeSubtitleId) ?? null
    const exportSettings = useMemo(
        () => ({
            videoId: uploadedPath || videoUrl || '',
            trimStart,
            trimEnd,
            effects: { filter, brightness, contrast, saturation, transition, background: { mode: backgroundMode, color: backgroundColor } },
            subtitles,
            burnSubtitles: true,
            audio: { originalVolume: volume, originalMuted, bgmVolume, voiceoverRecording, voiceoverUrl: voiceoverBlobUrl, musicUrl: musicBlobUrl, musicName },
            format: { aspectRatio, durationLimit, thumbnailTime: currentTime, watermark: { enabled: watermark, text: watermarkText, position: 'bottom-right', opacity: watermarkOpacity }, quality },
            outputName,
        }),
        [aspectRatio, backgroundColor, backgroundMode, bgmVolume, brightness, contrast, currentTime, durationLimit, filter, musicBlobUrl, musicName, originalMuted, outputName, quality, saturation, subtitles, trimEnd, trimStart, transition, uploadedPath, videoUrl, volume, voiceoverBlobUrl, voiceoverRecording, watermark, watermarkOpacity, watermarkText]
    )

    const clearVideoUrl = useCallback(() => {
        setVideoUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev)
            return null
        })
    }, [])

    const onPickFiles = useCallback(async (picked: FileList | null) => {
        if (!picked?.length) return
        const file = Array.from(picked).find((f) => /\.(mp4|mov|webm)$/i.test(f.name))
        if (!file) {
            toast.error('รองรับเฉพาะ MP4, MOV, WebM')
            return
        }
        setSelectedFile(file)
        setUploadedPath(null)
        const url = URL.createObjectURL(file)
        clearVideoUrl()
        setVideoUrl(url)
        toast.success('โหลดไฟล์วิดีโอแล้ว')

        try {
            const formData = new FormData()
            formData.append('file', file)
            const res = await fetch('/api/video/upload', { method: 'POST', body: formData })
            const data = await res.json()
            if (data.success) {
                setUploadedPath(data.path)
                toast.success('อัปโหลดไฟล์สำเร็จ')
            }
        } catch {
            toast.error('อัปโหลดไฟล์ไม่สำเร็จ')
        }
    }, [clearVideoUrl])

    useEffect(() => () => clearVideoUrl(), [clearVideoUrl])
    useEffect(() => {
        return () => {
            if (voiceoverBlobUrl) URL.revokeObjectURL(voiceoverBlobUrl)
        }
    }, [voiceoverBlobUrl])
    useEffect(() => { const t = window.setInterval(() => setAutosave('Autosaved draft'), 30000); return () => window.clearInterval(t) }, [])

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') { e.preventDefault(); void togglePlay() }
            if (e.key === '[') setTrimStart(Math.max(0, currentTime))
            if (e.key === ']') setTrimEnd(Math.max(currentTime, trimStart + 0.1))
            if (e.key === 'Delete' && selectedSubtitle) {
                setSubtitles((prev) => prev.filter((s) => s.id !== selectedSubtitle.id))
                setActiveSubtitleId(null)
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [currentTime, selectedSubtitle, trimStart])

    const handleLoadedMetadata = () => {
        const dur = videoRef.current?.duration || 0
        setDuration(dur)
        setTrimStart(0)
        setTrimEnd(dur)
        setSegments([{ id: 'seg-1', start: 0, end: dur }])
    }
    const handleTimeUpdate = () => setCurrentTime(videoRef.current?.currentTime || 0)
    const togglePlay = async () => {
        if (!videoRef.current) return
        if (videoRef.current.paused) { await videoRef.current.play(); setPlaying(true) } else { videoRef.current.pause(); setPlaying(false) }
    }
    const seek = (time: number) => {
        if (!videoRef.current) return
        videoRef.current.currentTime = Math.max(0, Math.min(duration, time))
        setCurrentTime(videoRef.current.currentTime)
    }

    const addSubtitle = () => {
        if (!subtitleText.trim()) return
        snapshotState()
        const id = crypto.randomUUID()
        setSubtitles((prev) => [...prev, { id, startTime: currentTime, endTime: Math.min(currentTime + 2, duration || currentTime + 2), text: subtitleText }])
        setSubtitleText('')
        setActiveSubtitleId(id)
    }

    const generateCaptions = async () => {
        if (!selectedFile) return toast.error('เลือกวิดีโอก่อน')
        setIsTranscribing(true)
        try {
            const res = await fetch('/api/transcribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoUrl: uploadedPath || videoUrl, language: 'th' }) })
            const data = await res.json()
            if (!data.success) throw new Error(data.error || 'transcribe failed')
            snapshotState()
            setSubtitles(data.subtitles)
            setActiveSubtitleId(data.subtitles?.[0]?.id ?? null)
            setCaptionIdeas(['เปิดด้วยประโยคที่ดึงดูด', 'ชวนดูต่อด้วยคำถาม', 'ปิดท้ายด้วย CTA'])
            setHashtagIdeas(['#tiktok', '#videoedit', '#shortform', '#contentcreator'])
            setHighlightRange({ start: data.subtitles?.[0]?.startTime ?? 0, end: data.subtitles?.[0]?.endTime ?? 2 })
            toast.success('Generated captions ready')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Caption generation failed')
        } finally {
            setIsTranscribing(false)
        }
    }

    const suggestCaptions = async () => {
        setCaptionIdeas([
            'ตัดให้ไว ดูจบในไม่กี่วินาที',
            'ไฮไลต์ที่ใช่ ทำให้คนหยุดดู',
            'ฟีเจอร์ใหม่ที่ช่วยเพิ่มยอดดู',
        ])
        setHashtagIdeas(['#tiktokedit', '#videoclip', '#contentcreator', '#reels', '#shortform'])
        toast.success('Suggested captions & hashtags ready')
    }

    const voiceoverRecorderRef = useRef<MediaRecorder | null>(null)
    const voiceoverTimerRef = useRef<number | null>(null)
    const voiceoverStreamRef = useRef<MediaStream | null>(null)

    const stopVoiceover = () => {
        if (voiceoverTimerRef.current) window.clearInterval(voiceoverTimerRef.current)
        voiceoverTimerRef.current = null
        voiceoverStreamRef.current?.getTracks().forEach((track) => track.stop())
        voiceoverStreamRef.current = null
        setVoiceoverRecording(false)
        setVoiceoverStatus((current) => (current === 'recording' ? 'ready' : current))
        if (voiceoverRecorderRef.current && voiceoverRecorderRef.current.state !== 'inactive') {
            voiceoverRecorderRef.current.stop()
        }
    }

    const startVoiceover = async () => {
        try {
            if (voiceoverStatus === 'recording') return stopVoiceover()
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            voiceoverStreamRef.current = stream
            const recorder = new MediaRecorder(stream)
            voiceoverRecorderRef.current = recorder
            const chunks: BlobPart[] = []
            recorder.ondataavailable = (event) => chunks.push(event.data)
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' })
                const url = URL.createObjectURL(blob)
                setVoiceoverBlobUrl((prev) => {
                    if (prev) URL.revokeObjectURL(prev)
                    return url
                })
                setVoiceoverName(`voiceover-${Date.now()}.webm`)
                setVoiceoverStatus('ready')
                if (voiceoverTimerRef.current) window.clearInterval(voiceoverTimerRef.current)
                voiceoverTimerRef.current = null
                voiceoverStreamRef.current?.getTracks().forEach((track) => track.stop())
                voiceoverStreamRef.current = null
                setVoiceoverRecording(false)
                toast.success('Voiceover recorded')
            }
            recorder.start()
            setVoiceoverStatus('recording')
            setVoiceoverRecording(true)
            setVoiceoverTime(0)
            toast.success('Voiceover recording started')
            voiceoverTimerRef.current = window.setInterval(() => setVoiceoverTime((t) => t + 1), 1000)
        } catch {
            toast.error('ไม่สามารถเริ่มอัดเสียงได้')
        }
    }

    const resetVoiceover = () => {
        if (voiceoverBlobUrl) URL.revokeObjectURL(voiceoverBlobUrl)
        voiceoverRecorderRef.current = null
        if (voiceoverTimerRef.current) window.clearInterval(voiceoverTimerRef.current)
        voiceoverTimerRef.current = null
        voiceoverStreamRef.current?.getTracks().forEach((track) => track.stop())
        voiceoverStreamRef.current = null
        setVoiceoverBlobUrl(null)
        setVoiceoverStatus('idle')
        setVoiceoverName('voiceover.webm')
        setVoiceoverTime(0)
        toast.success('Voiceover cleared')
    }

    const onPickMusic = async (file: File | null) => {
        if (!file) return
        if (!/\.(mp3|wav|m4a|aac|ogg)$/i.test(file.name)) {
            toast.error('รองรับไฟล์เสียง mp3, wav, m4a, aac, ogg')
            return
        }
        if (musicBlobUrl) URL.revokeObjectURL(musicBlobUrl)
        setMusicBlobUrl(URL.createObjectURL(file))
        setMusicName(file.name)
        toast.success('โหลดเพลงพื้นหลังแล้ว')
    }

    const clearMusic = () => {
        if (musicBlobUrl) URL.revokeObjectURL(musicBlobUrl)
        setMusicBlobUrl(null)
        setMusicName('background-music.mp3')
        toast.success('Music cleared')
    }

    const choosePresetTrack = () => {
        const demoTrack = new Blob(['demo music'], { type: 'audio/mpeg' })
        if (musicBlobUrl) URL.revokeObjectURL(musicBlobUrl)
        setMusicBlobUrl(URL.createObjectURL(demoTrack))
        setMusicName('preset-lofi-demo.mp3')
        toast.success('Loaded preset track')
    }

    const reRecordVoiceover = () => {
        resetVoiceover()
        void startVoiceover()
    }

    const shareLink = async () => {
        const payload = { outputName, trimStart, trimEnd, filter, aspectRatio, backgroundMode, backgroundColor, watermarkText, watermark, subtitles, segments }
        try {
            const encoded = encodeURIComponent(btoa(JSON.stringify(payload)))
            const url = `${window.location.origin}${window.location.pathname}?share=${encoded}`
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(url)
            } else {
                window.prompt('Copy share link', url)
            }
            setLoadedFromShare(true)
            resetShareIndicator()
            toast.success('Share link copied')
        } catch {
            toast.error('ไม่สามารถคัดลอกลิงก์ได้')
        }
    }

    const findBestMoments = () => {
        const end = Math.min(duration || 8, 8)
        setHighlightRange({ start: 0.5, end: end - 0.5 })
        setTrimStart(0.5)
        setTrimEnd(end - 0.5)
        toast.success('Best moments highlighted')
    }

    const persistDraftList = (list: Array<DraftProject & { draft: unknown }>) => {
        localStorage.setItem('edit-clip-drafts', JSON.stringify(list))
        setProjects(list.map(({ draft: _draft, ...item }) => item))
    }

    const resetShareIndicator = () => {
        window.setTimeout(() => setLoadedFromShare(false), 1500)
    }

    const saveDraft = () => {
        const draft = { ...exportSettings, savedAt: new Date().toISOString() }
        const draftListKey = 'edit-clip-drafts'
        const existing = JSON.parse(localStorage.getItem(draftListKey) || '[]') as Array<DraftProject & { draft: unknown }>
        const nextEntry = {
            id: crypto.randomUUID(),
            name: outputName || 'Untitled Draft',
            updatedAt: 'ตอนนี้',
            duration: shortTime(clipLength || duration),
            draft,
        }
        const nextList = [nextEntry, ...existing.filter((item) => item.name !== nextEntry.name)].slice(0, 10)
        localStorage.setItem('edit-clip-draft', JSON.stringify(draft))
        persistDraftList(nextList)
        setAutosave('Draft saved')
        toast.success('Draft saved')
    }

    const renameDraft = (projectId: string) => {
        const nextName = window.prompt('Rename draft', projects.find((item) => item.id === projectId)?.name || '')?.trim()
        if (!nextName) return
        const list = JSON.parse(localStorage.getItem('edit-clip-drafts') || '[]') as Array<DraftProject & { draft: unknown }>
        const nextList = list.map((item) => (item.id === projectId ? { ...item, name: nextName, updatedAt: 'ตอนนี้' } : item))
        persistDraftList(nextList)
        const active = nextList.find((item) => item.id === projectId)
        if (active) setOutputName(active.name)
        toast.success('Draft renamed')
    }

    const deleteDraft = (projectId: string) => {
        const list = JSON.parse(localStorage.getItem('edit-clip-drafts') || '[]') as Array<DraftProject & { draft: unknown }>
        const nextList = list.filter((item) => item.id !== projectId)
        persistDraftList(nextList)
        toast.success('Draft deleted')
    }

    useEffect(() => {
        const share = new URLSearchParams(window.location.search).get('share')
        if (share) {
            try {
                const parsed = JSON.parse(atob(decodeURIComponent(share)))
                if (parsed.outputName) setOutputName(parsed.outputName)
                if (parsed.trimStart !== undefined) setTrimStart(parsed.trimStart)
                if (parsed.trimEnd !== undefined) setTrimEnd(parsed.trimEnd)
                if (parsed.filter) setFilter(parsed.filter)
                if (parsed.aspectRatio) setAspectRatio(parsed.aspectRatio)
                if (parsed.backgroundMode) setBackgroundMode(parsed.backgroundMode)
                if (parsed.backgroundColor) setBackgroundColor(parsed.backgroundColor)
                if (parsed.watermarkText) setWatermarkText(parsed.watermarkText)
                if (parsed.watermark !== undefined) setWatermark(parsed.watermark)
                if (Array.isArray(parsed.subtitles)) setSubtitles(parsed.subtitles)
                if (Array.isArray(parsed.segments)) setSegments(parsed.segments)
                setLoadedFromShare(true)
                resetShareIndicator()
                toast.success('Loaded shared project')
            } catch {
                toast.error('Invalid share data')
            }
        }
        const draftListKey = 'edit-clip-drafts'
        const savedList = localStorage.getItem(draftListKey)
        if (savedList) {
            try {
                const parsedList = JSON.parse(savedList) as Array<DraftProject>
                setProjects(parsedList)
            } catch {
                // ignore invalid list
            }
        }
    }, [resetShareIndicator])
    useEffect(() => {
        const saved = localStorage.getItem('edit-clip-draft')
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                if (parsed.outputName) setOutputName(parsed.outputName)
                if (parsed.trimStart !== undefined) setTrimStart(parsed.trimStart)
                if (parsed.trimEnd !== undefined) setTrimEnd(parsed.trimEnd)
                if (parsed.effects?.filter) setFilter(parsed.effects.filter)
                if (parsed.effects?.background?.mode) setBackgroundMode(parsed.effects.background.mode)
                if (parsed.effects?.background?.color) setBackgroundColor(parsed.effects.background.color)
                if (parsed.audio?.originalMuted !== undefined) setOriginalMuted(parsed.audio.originalMuted)
                if (parsed.audio?.bgmVolume !== undefined) setBgmVolume(parsed.audio.bgmVolume)
            } catch {
                // ignore invalid draft
            }
        }
    }, [])

    const splitAtCurrentTime = () => {
        snapshotState()
        setSegments((prev) => {
            const idx = prev.findIndex((s) => currentTime >= s.start && currentTime <= s.end)
            if (idx < 0) return prev
            const seg = prev[idx]
            const left = { ...seg, end: currentTime }
            const right = { id: crypto.randomUUID(), start: currentTime, end: seg.end }
            setSelectedSegmentId(right.id)
            return [...prev.slice(0, idx), left, right, ...prev.slice(idx + 1)]
        })
        toast.success('Split applied')
    }
    const deleteSelectedSegment = () => {
        snapshotState()
        setSegments((prev) => {
            if (!selectedSegmentId) return prev.filter((s) => !(currentTime >= s.start && currentTime <= s.end))
            const next = prev.filter((s) => s.id !== selectedSegmentId)
            setSelectedSegmentId(next[0]?.id ?? null)
            return next.length ? next : [{ id: crypto.randomUUID(), start: 0, end: Math.max(duration, 5) }]
        })
        toast.success('Segment removed')
    }
    const addClip = () => {
        snapshotState()
        setSegments((prev) => {
            const start = prev.length ? Math.max(...prev.map((s) => s.end)) : 0
            const next = { id: crypto.randomUUID(), start, end: start + Math.max(3, Math.min(8, duration || 5)) }
            setSelectedSegmentId(next.id)
            return [...prev, next]
        })
        toast.success('Clip added')
    }
    const undo = () => {
        const prev = historyRef.current.pop()
        if (!prev) return toast.error('Nothing to undo')
        futureRef.current.push({ trimStart, trimEnd, filter, subtitles, segments, outputName })
        restoreSnapshot(prev)
        toast.success('Undone')
    }
    const redo = () => {
        const next = futureRef.current.pop()
        if (!next) return toast.error('Nothing to redo')
        historyRef.current.push({ trimStart, trimEnd, filter, subtitles, segments, outputName })
        restoreSnapshot(next)
        toast.success('Redone')
    }

    const handleExport = async () => {
        if (!selectedFile) return toast.error('เลือกไฟล์ก่อน export')
        setExporting(true)
        setProgress(10)
        try {
            const audioPayload = {
                originalVolume: volume,
                originalMuted,
                bgmVolume,
                voiceoverRecording,
                voiceoverUrl: voiceoverBlobUrl,
                musicUrl: musicBlobUrl,
                musicName,
            }
            const res = await fetch('/api/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoId: uploadedPath || videoUrl,
                    trimStart,
                    trimEnd,
                    effects: exportSettings.effects,
                    subtitles,
                    burnSubtitles: true,
                    audio: audioPayload,
                    format: exportSettings.format,
                    outputName,
                }),
            })
            const jobId = res.headers.get('X-Job-Id')
            if (jobId) setExportJobId(jobId)
            if (!res.body) throw new Error('No response body')
            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
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
                    if (evt.done) {
                        if (evt.outputFile) toast.success('Export ready', { description: evt.outputFile })
                        if (evt.error) toast.error(evt.error)
                    }
                }
            }
            setProgress(100)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Export failed')
        } finally {
            setExporting(false)
        }
    }

    const onTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const time = ((e.clientX - rect.left) / rect.width) * (duration || 1)
        seek(time)
    }

    const startDragHandle = (which: 'start' | 'end') => (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault()
        const move = (ev: MouseEvent) => {
            const timeline = document.getElementById('edit-clip-timeline')
            if (!timeline) return
            const rect = timeline.getBoundingClientRect()
            const time = Math.max(0, Math.min(duration || 0, ((ev.clientX - rect.left) / rect.width) * (duration || 1)))
            if (which === 'start') setTrimStart(Math.min(time, trimEnd - 0.1))
            else setTrimEnd(Math.max(time, trimStart + 0.1))
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

    const backgroundStyle = backgroundMode === 'Color' ? { backgroundColor } : undefined

    return (
        <div className="min-h-screen bg-[#0f0f0f] text-white">
            <div className="border-b border-white/10 bg-black/30 backdrop-blur-xl">
                <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 py-4">
                    <div>
                        <div className="flex items-center gap-3 text-sm text-white/60"><Clapperboard className="h-4 w-4 text-[#fe2c55]" />/programs/edit-clip</div>
                        <h1 className="mt-1 text-2xl font-semibold tracking-tight">TikTok Clip Editor</h1>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/60"><BadgeInfo className="h-4 w-4" />{autosave}{loadedFromShare ? ' · Loaded from share link' : ''}{exportJobId ? ` · Job ${exportJobId.slice(0, 8)}` : ''}</div>
                </div>
            </div>
            <div className="mx-auto max-w-[1600px] px-6 py-6">
                <div className="grid min-h-[calc(100vh-140px)] grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)_300px]">
                    <aside className="space-y-6">
                        <Card className="border-white/10 bg-white/5 text-white">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base"><Upload className="h-4 w-4 text-[#fe2c55]" />Upload</CardTitle>
                                <CardDescription className="text-white/50">MP4, MOV, WebM — max 500MB</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/20 px-4 py-8 text-center transition hover:border-[#fe2c55]/60 hover:bg-[#fe2c55]/5">
                                    <input ref={inputRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={(e) => onPickFiles(e.target.files)} />
                                    <Film className="h-10 w-10 text-[#fe2c55]" />
                                    <span className="mt-3 font-medium">Drag & drop หรือคลิกเพื่อเลือกไฟล์</span>
                                    <span className="mt-1 text-xs text-white/45">รองรับการเริ่มงานแบบเร็วสุด</span>
                                </label>
                                {selectedFileInfo ? <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm"><div className="font-medium">{selectedFileInfo.name}</div><div className="mt-1 text-white/60">{selectedFileInfo.size}</div><div className="mt-3 rounded-lg bg-white/5 p-2 text-xs text-white/55">Duration: {shortTime(duration)}</div></div> : <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/55">ยังไม่มีไฟล์ที่เลือก</div>}
                            </CardContent>
                        </Card>
                        <Card className="border-white/10 bg-white/5 text-white">
                            <CardHeader><CardTitle className="text-base">Project Drafts</CardTitle><CardDescription className="text-white/50">รายการงานที่บันทึกไว้</CardDescription></CardHeader>
                            <CardContent className="space-y-3">{projects.length === 0 ? <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/55">ยังไม่มี draft ที่บันทึกไว้</div> : projects.map((project) => <div key={project.id} className="rounded-xl border border-white/10 bg-black/20 p-3 transition hover:border-white/20 hover:bg-white/5"><button onClick={() => {
                                const savedList = JSON.parse(localStorage.getItem('edit-clip-drafts') || '[]') as Array<DraftProject & { draft?: any }>
                                const item = savedList.find((p) => p.id === project.id)
                                if (!item?.draft) return toast.error('No draft data found')
                                const draft = item.draft
                                if (draft.outputName) setOutputName(draft.outputName)
                                if (draft.trimStart !== undefined) setTrimStart(draft.trimStart)
                                if (draft.trimEnd !== undefined) setTrimEnd(draft.trimEnd)
                                if (draft.effects?.filter) setFilter(draft.effects.filter)
                                if (draft.effects?.background?.mode) setBackgroundMode(draft.effects.background.mode)
                                if (draft.effects?.background?.color) setBackgroundColor(draft.effects.background.color)
                                if (draft.audio?.originalMuted !== undefined) setOriginalMuted(draft.audio.originalMuted)
                                if (draft.audio?.bgmVolume !== undefined) setBgmVolume(draft.audio.bgmVolume)
                                if (Array.isArray(draft.subtitles)) setSubtitles(draft.subtitles)
                                if (Array.isArray(draft.segments)) setSegments(draft.segments)
                                if (draft.watermarkText) setWatermarkText(draft.watermarkText)
                                if (draft.watermark !== undefined) setWatermark(draft.watermark)
                                if (draft.aspectRatio) setAspectRatio(draft.aspectRatio)
                                toast.success(`Loaded draft: ${project.name}`)
                            }} className="w-full text-left"><div className="flex items-center justify-between gap-2"><div className="font-medium">{project.name}</div><ChevronRight className="h-4 w-4 text-white/40" /></div><div className="mt-1 text-xs text-white/45">{project.updatedAt} · {project.duration}</div></button><div className="mt-3 flex gap-2"><Button onClick={() => renameDraft(project.id)} variant="secondary" className="flex-1 bg-white/10 text-white hover:bg-white/15">Rename</Button><Button onClick={() => deleteDraft(project.id)} variant="secondary" className="bg-white/10 text-white hover:bg-white/15">Delete</Button></div></div>)}</CardContent>
                        </Card>
                    </aside>
                    <main className="space-y-6 overflow-hidden xl:overflow-auto">
                        <Card className="border-white/10 bg-white/5 text-white"><CardContent className="space-y-4 p-4 md:p-6"><div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl"><div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" /><div className="flex aspect-[16/10] items-center justify-center p-4 md:p-8"><div className="relative h-full w-full max-w-[420px] rounded-[2rem] border border-white/15 bg-black/70 p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]" style={backgroundStyle}><div className={cn('absolute inset-3 rounded-[1.5rem]', backgroundMode === 'Blur' && 'backdrop-blur-xl', backgroundMode === 'Black' && 'bg-black/30', backgroundMode === 'Color' && 'bg-transparent')} /><div className="relative z-10 h-full overflow-hidden rounded-[1.25rem] border border-white/10 bg-black"><div className={cn('h-full w-full', transition === 'Fade' && 'opacity-95', transition === 'Zoom in' && 'scale-[1.01]', transition === 'Slide left' && '-translate-x-1', transition === 'Slide right' && 'translate-x-1')} style={transitionStyle}>{videoUrl ? <video ref={videoRef} src={videoUrl} onLoadedMetadata={handleLoadedMetadata} onTimeUpdate={handleTimeUpdate} className="h-full w-full object-cover" style={{ filter: filterCss, opacity: originalMuted ? 0.85 : 1 }} muted={originalMuted} /> : <div className="flex h-full items-center justify-center text-center text-white/45"><div><CirclePlay className="mx-auto h-14 w-14 text-[#fe2c55]" /><p className="mt-3 text-sm">Preview player</p></div></div>}</div><div className="pointer-events-none absolute inset-0 flex items-end justify-center p-4"><div className="rounded-full bg-black/45 px-3 py-1 text-[11px] text-white/80 backdrop-blur">Phone frame overlay · {aspectRatio} · {transition}</div></div>{watermark && <div className="pointer-events-none absolute bottom-4 right-4 rounded-full bg-black/40 px-3 py-1 text-xs text-white/80" style={{ opacity: watermarkOpacity / 100 }}>{watermarkText}</div>}</div></div></div></div><div className="flex flex-wrap items-center gap-2"><Button onClick={() => void togglePlay()} variant="secondary" className="bg-white/10 text-white hover:bg-white/15">{playing ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}{playing ? 'Pause' : 'Play'}</Button><Button onClick={() => seek(currentTime - 1)} variant="secondary" className="bg-white/10 text-white hover:bg-white/15"><ArrowLeft className="mr-2 h-4 w-4" />Step -1s</Button><Button onClick={() => seek(currentTime + 1)} variant="secondary" className="bg-white/10 text-white hover:bg-white/15"><ArrowRight className="mr-2 h-4 w-4" />Step +1s</Button><div className="ml-auto flex items-center gap-2 text-sm text-white/70"><Volume1 className="h-4 w-4" /><Slider value={[volume]} min={0} max={100} step={1} onValueChange={(v) => setVolume(v[0])} className="w-40" /><Volume2 className="h-4 w-4" /></div></div><div className="space-y-2"><div className="flex items-center justify-between text-sm text-white/60"><span>{shortTime(currentTime)}</span><span>{shortTime(duration)}</span></div><div className="relative h-4 cursor-pointer rounded-full bg-white/10" onClick={onTrackClick}><div className="absolute inset-y-0 left-0 rounded-full bg-[#fe2c55]" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} /><div className="absolute inset-y-0 rounded-full bg-yellow-400/40" style={{ left: `${duration ? (trimStart / duration) * 100 : 0}%`, width: `${duration ? ((trimEnd - trimStart) / duration) * 100 : 0}%` }} /><div className="absolute -top-1 h-6 w-1 rounded-full bg-white shadow-lg" style={{ left: `calc(${duration ? (currentTime / duration) * 100 : 0}% - 2px)` }} /></div></div><div className="space-y-2"><div className="flex items-center justify-between text-xs text-white/45"><span>Timeline markers</span><span>Current / Total</span></div><div className="relative h-8 text-[10px] text-white/40">{timelineMarkers(duration).map((marker) => <div key={marker} className="absolute top-0 -translate-x-1/2" style={{ left: `${duration ? (marker / duration) * 100 : 0}%` }}><div className="mx-auto h-2 w-px bg-white/25" /><div className="mt-1">{shortTime(marker)}</div></div>)}</div></div></CardContent></Card>
                        <Card className="border-white/10 bg-white/5 text-white"><CardContent className="space-y-5 p-4 md:p-6"><div className="grid gap-4 md:grid-cols-3"><div className="space-y-2"><Label className="text-white/60">Trim Start</Label><Input value={shortTime(trimStart)} readOnly className="border-white/10 bg-black/30 font-mono text-white" /></div><div className="space-y-2"><Label className="text-white/60">Trim End</Label><Input value={shortTime(trimEnd)} readOnly className="border-white/10 bg-black/30 font-mono text-white" /></div><div className="space-y-2"><Label className="text-white/60">Duration</Label><Input value={shortTime(clipLength)} readOnly className="border-white/10 bg-black/30 font-mono text-[#fe2c55]" /></div></div><div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><div className="flex items-center justify-between text-sm text-white/60"><span>Trim Start</span><span>{shortTime(trimStart)}</span></div><Slider value={[trimStart]} min={0} max={duration || 100} step={0.1} onValueChange={(v) => setTrimStart(Math.min(v[0], trimEnd - 0.1))} /></div><div className="space-y-2"><div className="flex items-center justify-between text-sm text-white/60"><span>Trim End</span><span>{shortTime(trimEnd)}</span></div><Slider value={[trimEnd]} min={0} max={duration || 100} step={0.1} onValueChange={(v) => setTrimEnd(Math.max(v[0], trimStart + 0.1))} /></div><div id="edit-clip-timeline" className="relative h-8 rounded-full bg-white/10"><div className="absolute inset-y-0 left-0 rounded-full bg-[#fe2c55]" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} /><div className="absolute inset-y-0 rounded-full bg-yellow-400/40" style={{ left: `${duration ? (trimStart / duration) * 100 : 0}%`, width: `${duration ? ((trimEnd - trimStart) / duration) * 100 : 0}%` }} /><div onMouseDown={startDragHandle('start')} className="absolute top-[-4px] h-10 w-2 cursor-ew-resize rounded-full bg-white shadow-lg" style={{ left: `calc(${duration ? (trimStart / duration) * 100 : 0}% - 1px)` }} /><div onMouseDown={startDragHandle('end')} className="absolute top-[-4px] h-10 w-2 cursor-ew-resize rounded-full bg-white shadow-lg" style={{ left: `calc(${duration ? (trimEnd / duration) * 100 : 0}% - 1px)` }} /><div className="absolute inset-0 flex items-center justify-center text-[10px] text-white/45">Drag handles to trim</div></div><div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/55">{highlightRange ? `Highlight: ${shortTime(highlightRange.start)} → ${shortTime(highlightRange.end)}` : 'No highlight detected yet'}</div></div><div className="flex flex-wrap items-center gap-2 text-sm"><Button variant="secondary" onClick={splitAtCurrentTime} className="bg-white/10 text-white hover:bg-white/15"><SquareSplitHorizontal className="mr-2 h-4 w-4" />Split</Button><Button variant="secondary" onClick={deleteSelectedSegment} className="bg-white/10 text-white hover:bg-white/15"><Trash2 className="mr-2 h-4 w-4" />Delete segment</Button><Button variant="secondary" onClick={addClip} className="bg-white/10 text-white hover:bg-white/15"><Plus className="mr-2 h-4 w-4" />Add clip</Button><Button variant="secondary" className="bg-white/10 text-white hover:bg-white/15"><Scissors className="mr-2 h-4 w-4" />Speed 1x</Button><Button variant="secondary" onClick={undo} className="bg-white/10 text-white hover:bg-white/15"><Undo2 className="mr-2 h-4 w-4" />Undo</Button><Button variant="secondary" onClick={redo} className="bg-white/10 text-white hover:bg-white/15"><Redo2 className="mr-2 h-4 w-4" />Redo</Button><div className="ml-auto rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/50">Shortcuts ready</div></div></CardContent></Card>
                    </main>
                    <aside className="space-y-6">
                        <Card className="border-white/10 bg-white/5 text-white"><CardHeader className="pb-3"><CardTitle className="text-base">Inspector</CardTitle><CardDescription className="text-white/50">Effects · Text · Audio · Format</CardDescription></CardHeader><CardContent><Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}><TabsList className="grid grid-cols-4 bg-black/30"><TabsTrigger value="effects">Effects</TabsTrigger><TabsTrigger value="text">Text</TabsTrigger><TabsTrigger value="audio">Audio</TabsTrigger><TabsTrigger value="format">Format</TabsTrigger></TabsList><TabsContent value="effects" className="mt-4 space-y-4"><div className="grid grid-cols-2 gap-2">{FILTERS.map((item) => <button key={item.name} onClick={() => setFilter(item.name)} className={cn('rounded-xl border px-3 py-2 text-left text-sm transition', filter === item.name ? 'border-[#fe2c55] bg-[#fe2c55]/10 text-white' : 'border-white/10 bg-black/20 text-white/70 hover:bg-white/5')}>{item.name}</button>)}</div>{([
                                    ['Brightness', brightness, setBrightness],
                                    ['Contrast', contrast, setContrast],
                                    ['Saturation', saturation, setSaturation]
                                ] as [string, number, React.Dispatch<React.SetStateAction<number>>][]).map(([label, value, setter]) => (
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
                                        />
                                    </div>
                                ))}<div className="space-y-2"><Label className="text-white/60">Transition</Label><select value={transition} onChange={(e) => setTransition(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white">{['None', 'Fade', 'Slide left', 'Slide right', 'Zoom in'].map((opt) => <option key={opt}>{opt}</option>)}</select></div><div className="space-y-2"><Label className="text-white/60">Background</Label><div className="grid grid-cols-3 gap-2 text-xs">{(['Blur', 'Color', 'Black'] as const).map((mode) => <button key={mode} onClick={() => setBackgroundMode(mode)} className={cn('rounded-lg border px-2 py-2', backgroundMode === mode ? 'border-[#fe2c55] bg-[#fe2c55]/10' : 'border-white/10 bg-black/20')}>{mode}</button>)}</div>{backgroundMode === 'Color' && <Input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="h-10 border-white/10 bg-black/30 p-1" />}</div></TabsContent><TabsContent value="text" className="mt-4 space-y-4"><Button onClick={generateCaptions} disabled={isTranscribing} className="w-full bg-[#fe2c55] text-white hover:bg-[#fe2c55]/90">{isTranscribing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Generate Captions (AI)</Button><Button onClick={suggestCaptions} variant="secondary" className="w-full bg-white/10 text-white hover:bg-white/15">Suggest Caption & Hashtags</Button><Button onClick={findBestMoments} variant="secondary" className="w-full bg-white/10 text-white hover:bg-white/15">Find Best Moments</Button><div className="space-y-2"><Label className="text-white/60">Add subtitle manually</Label><Input value={subtitleText} onChange={(e) => setSubtitleText(e.target.value)} placeholder="Type subtitle text" className="border-white/10 bg-black/30 text-white" /><Button onClick={addSubtitle} variant="secondary" className="w-full bg-white/10 text-white hover:bg-white/15">+ Add subtitle</Button></div>{captionIdeas.length > 0 && <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-xs font-semibold uppercase tracking-wide text-white/45">Caption ideas</div>{captionIdeas.map((item) => <div key={item} className="rounded-lg bg-white/5 px-3 py-2 text-sm text-white/80">{item}</div>)}</div>}{hashtagIdeas.length > 0 && <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-xs font-semibold uppercase tracking-wide text-white/45">Hashtags</div><div className="flex flex-wrap gap-2">{hashtagIdeas.map((tag) => <span key={tag} className="rounded-full bg-[#fe2c55]/10 px-3 py-1 text-xs text-[#fe2c55]">{tag}</span>)}</div></div>}<div className="space-y-2">{subtitles.map((sub) => <button key={sub.id} onClick={() => setActiveSubtitleId(sub.id)} className={cn('w-full rounded-xl border p-3 text-left', activeSubtitleId === sub.id ? 'border-[#fe2c55] bg-[#fe2c55]/10' : 'border-white/10 bg-black/20')}><div className="text-xs text-white/45">[{sub.startTime.toFixed(1)} → {sub.endTime.toFixed(1)}]</div><div className="mt-1 text-sm">{sub.text}</div></button>)}</div>{selectedSubtitle && <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/70">Selected subtitle: <span className="text-white">{selectedSubtitle.text}</span></div>}</TabsContent><TabsContent value="audio" className="mt-4 space-y-4"><div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3"><span className="text-sm">Original audio muted</span><button onClick={() => setOriginalMuted((v) => !v)} className={cn('rounded-full px-3 py-1 text-xs', originalMuted ? 'bg-[#fe2c55] text-white' : 'bg-white/10 text-white')}>{originalMuted ? 'Muted' : 'On'}</button></div><div className="space-y-2"><div className="flex items-center justify-between text-sm text-white/60"><span>BGM Volume</span><span>{bgmVolume}%</span></div><Slider value={[bgmVolume]} min={0} max={100} step={1} onValueChange={(v) => setBgmVolume(v[0])} /></div><Button onClick={choosePresetTrack} variant="secondary" className="w-full bg-white/10 text-white hover:bg-white/15"><AudioLines className="mr-2 h-4 w-4" />Choose preset track</Button><label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/20 px-3 py-3 text-sm text-white/70 transition hover:bg-white/5"><input type="file" accept="audio/*" className="hidden" onChange={(e) => void onPickMusic(e.target.files?.[0] ?? null)} /><ImagePlus className="mr-2 h-4 w-4" />Upload music</label><div className="grid grid-cols-2 gap-2"><Button onClick={startVoiceover} variant="secondary" className="bg-white/10 text-white hover:bg-white/15"><Mic className="mr-2 h-4 w-4" />Record voiceover</Button><Button onClick={stopVoiceover} variant="secondary" className="bg-white/10 text-white hover:bg-white/15">Stop</Button></div><div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/55">Voiceover status: {voiceoverStatus}{voiceoverTime > 0 ? ` · ${voiceoverTime}s` : ''}{voiceoverBlobUrl ? ' · ready to preview' : ''}</div>{voiceoverBlobUrl && <audio controls src={voiceoverBlobUrl} className="w-full" />}<div className="grid grid-cols-2 gap-2"><Button onClick={resetVoiceover} variant="secondary" className="bg-white/10 text-white hover:bg-white/15">Delete</Button><Button onClick={reRecordVoiceover} variant="secondary" className="bg-white/10 text-white hover:bg-white/15">Re-record</Button></div><div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/55">Filename: {voiceoverName}</div><div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/55">Music: {musicName}{musicBlobUrl ? ' · ready' : ''}</div><div className="flex gap-2"><Button onClick={clearMusic} variant="secondary" className="flex-1 bg-white/10 text-white hover:bg-white/15">Delete music</Button></div></TabsContent><TabsContent value="format" className="mt-4 space-y-4"><div className="grid grid-cols-3 gap-2">{(['9:16', '1:1', '16:9'] as const).map((ratio) => <button key={ratio} onClick={() => setAspectRatio(ratio)} className={cn('rounded-xl border px-2 py-3 text-sm', aspectRatio === ratio ? 'border-[#fe2c55] bg-[#fe2c55]/10' : 'border-white/10 bg-black/20')}>{ratio}</button>)}</div><div className="space-y-2"><Label className="text-white/60">Duration Limit</Label><select value={durationLimit} onChange={(e) => setDurationLimit(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"><option value="15">15s max</option><option value="30">30s max</option><option value="60">60s max</option><option value="180">3 min max</option><option value="unlimited">No limit</option></select></div><div className="space-y-2"><Label className="text-white/60">Quality</Label><div className="grid grid-cols-3 gap-2 text-xs">{(['720p', '1080p', 'original'] as const).map((q) => <button key={q} onClick={() => setQuality(q)} className={cn('rounded-lg border px-2 py-2', quality === q ? 'border-[#fe2c55] bg-[#fe2c55]/10' : 'border-white/10 bg-black/20')}>{q}</button>)}</div></div><div className="space-y-2"><Label className="text-white/60">Watermark</Label><Input value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} className="border-white/10 bg-black/30 text-white" /><div className="flex items-center gap-3 text-sm text-white/70"><input type="checkbox" checked={watermark} onChange={(e) => setWatermark(e.target.checked)} /> Enabled</div><div className="flex items-center gap-2 text-sm text-white/60"><span>Opacity</span><Slider value={[watermarkOpacity]} min={20} max={80} step={1} onValueChange={(v) => setWatermarkOpacity(v[0])} /></div></div></TabsContent></Tabs></CardContent></Card>
                        <Card className="border-white/10 bg-white/5 text-white"><CardHeader className="pb-3"><CardTitle className="text-base">Export</CardTitle><CardDescription className="text-white/50">Preview, save draft, and export settings</CardDescription></CardHeader><CardContent className="space-y-4">{exporting && <Progress value={progress} />}<Input value={outputName} onChange={(e) => setOutputName(e.target.value)} className="border-white/10 bg-black/30 text-white" placeholder="output name" /><div className="grid grid-cols-2 gap-2"><Button onClick={undo} variant="secondary" className="bg-white/10 text-white hover:bg-white/15"><Undo2 className="mr-2 h-4 w-4" />Undo</Button><Button onClick={redo} variant="secondary" className="bg-white/10 text-white hover:bg-white/15"><Redo2 className="mr-2 h-4 w-4" />Redo</Button></div><Button onClick={saveDraft} variant="secondary" className="w-full bg-white/10 text-white hover:bg-white/15"><Save className="mr-2 h-4 w-4" />Save Draft</Button><Button onClick={() => void handleExport()} className="w-full bg-[#fe2c55] text-white hover:bg-[#fe2c55]/90">{exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} Export</Button><Button onClick={() => void shareLink()} variant="outline" className="w-full border-white/10 bg-black/20 text-white hover:bg-white/5"><Share2 className="mr-2 h-4 w-4" />Share link</Button><div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/55"><div className="flex items-center gap-2 text-white/70"><Scissors className="h-4 w-4 text-[#fe2c55]" />Payload preview</div><pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap break-words text-[10px] text-white/40">{JSON.stringify(exportSettings, null, 2)}</pre></div></CardContent></Card>
                    </aside>
                </div>
            </div>
        </div>
    )
}

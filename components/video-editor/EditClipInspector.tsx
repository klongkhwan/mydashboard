'use client'

import React from 'react'
import { AudioLines, Download, ImagePlus, Loader2, Mic, Save, Scissors, Share2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { EditorAudio, EditorEffects, EditorFormat, Subtitle } from './edit-clip.types'

export function EditClipInspector(props: {
    activeTab: 'effects' | 'text' | 'audio' | 'format'
    setActiveTab: (tab: 'effects' | 'text' | 'audio' | 'format') => void
    filter: string
    setFilter: (value: string) => void
    brightness: number
    setBrightness: React.Dispatch<React.SetStateAction<number>>
    contrast: number
    setContrast: React.Dispatch<React.SetStateAction<number>>
    saturation: number
    setSaturation: React.Dispatch<React.SetStateAction<number>>
    transition: string
    setTransition: (value: string) => void
    backgroundMode: 'Blur' | 'Color' | 'Black'
    setBackgroundMode: (value: 'Blur' | 'Color' | 'Black') => void
    backgroundColor: string
    setBackgroundColor: (value: string) => void
    subtitleText: string
    setSubtitleText: (value: string) => void
    subtitles: Subtitle[]
    activeSubtitleId: string | null
    setActiveSubtitleId: (value: string) => void
    isTranscribing: boolean
    generateCaptions: () => void
    addSubtitle: () => void
    selectedSubtitle: Subtitle | null
    originalMuted: boolean
    setOriginalMuted: React.Dispatch<React.SetStateAction<boolean>>
    bgmVolume: number
    setBgmVolume: React.Dispatch<React.SetStateAction<number>>
    voiceoverRecording: boolean
    setVoiceoverRecording: React.Dispatch<React.SetStateAction<boolean>>
    aspectRatio: '9:16' | '1:1' | '16:9'
    setAspectRatio: (value: '9:16' | '1:1' | '16:9') => void
    durationLimit: string
    setDurationLimit: React.Dispatch<React.SetStateAction<string>>
    quality: '720p' | '1080p' | 'original'
    setQuality: React.Dispatch<React.SetStateAction<'720p' | '1080p' | 'original'>>
    watermark: boolean
    setWatermark: React.Dispatch<React.SetStateAction<boolean>>
    watermarkText: string
    setWatermarkText: React.Dispatch<React.SetStateAction<string>>
    watermarkOpacity: number
    setWatermarkOpacity: React.Dispatch<React.SetStateAction<number>>
    splitAtCurrentTime: () => void
    deleteSelectedSegment: () => void
    addClip: () => void
    undo: () => void
    redo: () => void
    exporting: boolean
    progress: number
    outputName: string
    setOutputName: React.Dispatch<React.SetStateAction<string>>
    saveDraft: () => void
    handleExport: () => void
    exportSettings: { effects: EditorEffects; audio: EditorAudio; format: EditorFormat }
}) {
    const { activeTab, setActiveTab } = props
    return <Card className="border-white/10 bg-white/5 text-white"><CardHeader className="pb-3"><CardTitle className="text-base">Inspector</CardTitle><CardDescription className="text-white/50">Effects · Text · Audio · Format</CardDescription></CardHeader><CardContent><Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}><TabsList className="grid grid-cols-4 bg-black/30"><TabsTrigger value="effects">Effects</TabsTrigger><TabsTrigger value="text">Text</TabsTrigger><TabsTrigger value="audio">Audio</TabsTrigger><TabsTrigger value="format">Format</TabsTrigger></TabsList><TabsContent value="effects" className="mt-4 space-y-3"><div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/55">Controls are managed in the main editor panel. Effects preview is live on the video canvas.</div></TabsContent><TabsContent value="text" className="mt-4 space-y-4"><Button onClick={props.generateCaptions} disabled={props.isTranscribing} className="w-full bg-[#fe2c55] text-white hover:bg-[#fe2c55]/90">{props.isTranscribing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Generate Captions (AI)</Button><div className="space-y-2"><Label className="text-white/60">Add subtitle manually</Label><Input value={props.subtitleText} onChange={(e) => props.setSubtitleText(e.target.value)} placeholder="Type subtitle text" className="border-white/10 bg-black/30 text-white" /><Button onClick={props.addSubtitle} variant="secondary" className="w-full bg-white/10 text-white hover:bg-white/15">+ Add subtitle</Button></div><div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/55">Subtitle list lives in the main view so it stays synced with timeline state.</div></TabsContent><TabsContent value="audio" className="mt-4 space-y-4"><Button variant="secondary" className="w-full bg-white/10 text-white hover:bg-white/15"><AudioLines className="mr-2 h-4 w-4" />Choose preset track</Button><Button onClick={() => props.setVoiceoverRecording((v) => !v)} variant="secondary" className="w-full bg-white/10 text-white hover:bg-white/15"><Mic className="mr-2 h-4 w-4" />{props.voiceoverRecording ? 'Recording...' : 'Record voiceover'}</Button><Button variant="secondary" className="w-full bg-white/10 text-white hover:bg-white/15"><ImagePlus className="mr-2 h-4 w-4" />Upload music</Button></TabsContent><TabsContent value="format" className="mt-4 space-y-4"><Button onClick={props.saveDraft} variant="secondary" className="w-full bg-white/10 text-white hover:bg-white/15"><Save className="mr-2 h-4 w-4" />Save Draft</Button><Button onClick={props.handleExport} className="w-full bg-[#fe2c55] text-white hover:bg-[#fe2c55]/90">{props.exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} Export</Button><Button variant="outline" className="w-full border-white/10 bg-black/20 text-white hover:bg-white/5"><Share2 className="mr-2 h-4 w-4" />Share link</Button><div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/55"><div className="flex items-center gap-2 text-white/70"><Scissors className="h-4 w-4 text-[#fe2c55]" />Payload preview</div><pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap break-words text-[10px] text-white/40">{JSON.stringify(props.exportSettings, null, 2)}</pre></div></TabsContent></Tabs></CardContent></Card>
}

export type DraftProject = { id: string; name: string; updatedAt: string; duration: string }
export type FilterPreset = { name: string; css: string }
export type Subtitle = { id: string; startTime: number; endTime: number; text: string }
export type ClipSegment = { id: string; start: number; end: number }

export type EditorEffects = {
    filter: string
    brightness: number
    contrast: number
    saturation: number
    transition: string
    background: { mode: 'Blur' | 'Color' | 'Black'; color: string }
}

export type EditorAudio = {
    originalVolume: number
    originalMuted: boolean
    bgmVolume: number
    voiceoverRecording: boolean
}

export type EditorFormat = {
    aspectRatio: '9:16' | '1:1' | '16:9'
    durationLimit: string
    thumbnailTime: number
    watermark: { enabled: boolean; text: string; position: string; opacity: number }
    quality: '720p' | '1080p' | 'original'
}

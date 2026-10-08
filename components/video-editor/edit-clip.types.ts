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

export type EditorProject = {
    trimStart: number
    trimEnd: number
    volume: number
    originalMuted: boolean
    aspectRatio: '9:16' | '1:1' | '16:9'
    outputName: string
    filter?: string
    brightness?: number
    contrast?: number
    saturation?: number
    transition?: string
    subtitles?: Subtitle[]
    segments?: ClipSegment[]
}

/** Everything undo/redo restores. Keep this in sync with the controls that call snapshotState(). */
export type EditorSnapshot = EditorProject

export type UploadState = 'idle' | 'uploading' | 'ready' | 'error'

export type UploadedMedia = { path: string; name: string; url: string; size: number }

export type ExportResult = { outputFile: string; downloadUrl: string }

// Video Editor Type Definitions

export interface VideoFile {
    name: string
    path: string
    size: number
    duration: number
    width?: number
    height?: number
    codec?: string
    thumbnail?: string
}

export interface CutOptions {
    inputPath: string
    startTime: string
    endTime: string
    outputPath?: string
}

export interface MergeOptions {
    files: string[]
    outputPath?: string
}

export interface VideoInfo {
    duration: number
    width: number
    height: number
    codec: string
    bitrate?: number
    fps?: number
}

export interface ScanResult {
    success: boolean
    files: VideoFile[]
    error?: string
}

export interface ProcessResult {
    success: boolean
    outputFile?: string
    error?: string
    progress?: number
}

export interface TimeRange {
    start: number // seconds
    end: number // seconds
}

// Format seconds to HH:MM:SS
export function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// Parse HH:MM:SS to seconds
export function parseTime(time: string): number {
    const parts = time.split(':').map(Number)
    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1]
    }
    return parts[0] || 0
}

// Format file size
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

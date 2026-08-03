import type { UploadedMedia } from './edit-clip.types'

export const shortTime = (seconds: number) => {
    const safe = Math.max(0, seconds)
    const m = Math.floor(safe / 60)
    const s = Math.floor(safe % 60)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export const timelineMarkers = (duration: number) => {
    if (!duration) return [0]
    const step = duration > 60 ? 10 : 5
    return Array.from({ length: Math.floor(duration / step) + 1 }, (_, i) => i * step)
}

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export const formatBytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`

/**
 * Uploads through XHR rather than fetch so the drop zone can show real upload
 * progress — a 400MB clip otherwise looks frozen for a minute.
 */
export function uploadMedia(
    file: Blob,
    options: { kind: 'video' | 'audio'; fileName: string; onProgress?: (percent: number) => void }
): Promise<UploadedMedia> {
    return new Promise((resolve, reject) => {
        const form = new FormData()
        form.append('file', file, options.fileName)
        form.append('kind', options.kind)

        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/video/upload')
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) options.onProgress?.(Math.round((event.loaded / event.total) * 100))
        }
        xhr.onload = () => {
            try {
                const data = JSON.parse(xhr.responseText)
                if (!data?.success) {
                    reject(new Error(data?.error || 'อัปโหลดไม่สำเร็จ'))
                    return
                }
                resolve(data as UploadedMedia)
            } catch {
                reject(new Error('อัปโหลดไม่สำเร็จ'))
            }
        }
        xhr.onerror = () => reject(new Error('อัปโหลดไม่สำเร็จ — ตรวจสอบการเชื่อมต่อ'))
        xhr.send(form)
    })
}

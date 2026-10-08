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

export function validateTrimRange(
    start: number,
    end: number,
    duration: number
): { valid: boolean; error?: string } {
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
        return { valid: false, error: 'ช่วงเวลาต้องเป็นตัวเลขที่ถูกต้อง' }
    }
    if (start < 0) {
        return { valid: false, error: 'เวลาเริ่มต้นต้องไม่ต่ำกว่า 0 วินาที' }
    }
    if (end <= start) {
        return { valid: false, error: 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น' }
    }
    if (duration > 0 && end > duration + 0.05) {
        return { valid: false, error: 'เวลาสิ้นสุดต้องไม่เกินความยาววิดีโอ' }
    }
    return { valid: true }
}

/**
 * Uploads through XHR rather than fetch so the drop zone can show real upload
 * progress — a 400MB clip otherwise looks frozen for a minute.
 */
export function uploadMedia(
    file: Blob,
    options: {
        kind: 'video' | 'audio'
        fileName: string
        onProgress?: (percent: number) => void
        signal?: AbortSignal
    }
): Promise<UploadedMedia> {
    return new Promise((resolve, reject) => {
        if (options.signal?.aborted) {
            reject(new DOMException('Upload aborted', 'AbortError'))
            return
        }

        const form = new FormData()
        form.append('file', file, options.fileName)
        form.append('kind', options.kind)

        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/video/upload')

        if (options.signal) {
            const onAbort = () => {
                xhr.abort()
                reject(new DOMException('Upload aborted', 'AbortError'))
            }
            options.signal.addEventListener('abort', onAbort, { once: true })
            xhr.onloadend = () => {
                options.signal?.removeEventListener('abort', onAbort)
            }
        }

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
        xhr.onabort = () => reject(new DOMException('Upload aborted', 'AbortError'))
        xhr.send(form)
    })
}

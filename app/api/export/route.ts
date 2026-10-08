import * as fs from 'fs'
import * as path from 'path'
import { spawn, spawnSync } from 'child_process'
import { EXPORT_DIR, ensureWatermarkFont, resolveFFmpegBinary, safeMediaPath } from '@/lib/media-paths'

type ExportRequest = {
    videoId?: string
    trimStart?: number
    trimEnd?: number
    effects?: {
        filter?: string
        brightness?: number
        contrast?: number
        saturation?: number
        transition?: string
        background?: { mode?: string; color?: string }
    }
    subtitles?: Array<{ id: string; startTime: number; endTime: number; text: string }>
    burnSubtitles?: boolean
    audio?: {
        originalVolume?: number
        originalMuted?: boolean
        bgmVolume?: number
        voiceoverRecording?: boolean
        voiceoverUrl?: string | null
        musicUrl?: string | null
        musicName?: string | null
    }
    format?: {
        aspectRatio?: '9:16' | '1:1' | '16:9'
        durationLimit?: string
        thumbnailTime?: number
        watermark?: { enabled?: boolean; text?: string; position?: string; opacity?: number }
        quality?: '720p' | '1080p' | 'original'
    }
    outputName?: string
}

type JobState = {
    status: 'queued' | 'processing' | 'done' | 'error'
    progress: number
    outputFile?: string
    downloadUrl?: string
    error?: string
    createdAt: number
}

const enc = new TextEncoder()
const jobs = new Map<string, JobState>()

function cleanupOldJobs() {
    const now = Date.now()
    for (const [id, job] of jobs.entries()) {
        if (now - job.createdAt > 30 * 60 * 1000) {
            jobs.delete(id)
        }
    }
}

function sse(data: object) {
    return enc.encode(`data: ${JSON.stringify(data)}\n\n`)
}

function formatSrtTime(seconds: number) {
    const totalMs = Math.max(0, Math.round(seconds * 1000))
    const ms = totalMs % 1000
    const totalSec = Math.floor(totalMs / 1000)
    const s = totalSec % 60
    const totalMin = Math.floor(totalSec / 60)
    const m = totalMin % 60
    const h = Math.floor(totalMin / 60)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`
}

function normalizeColor(color?: string) {
    return String(color || '#000000').replace('#', '0x')
}

function filterToFFmpeg(filter: string) {
    const map: Record<string, string> = {
        Vivid: 'eq=contrast=1.15:saturation=1.25',
        Matte: 'eq=contrast=0.95:saturation=0.9',
        'B&W': 'hue=s=0',
        Warm: 'eq=saturation=1.15,hue=h=10',
        Cool: 'eq=saturation=1.1,hue=h=-10',
        Fade: 'eq=contrast=0.9:saturation=0.85',
        Cinematic: 'eq=contrast=1.2:saturation=1.1',
        // there is no "sepia" filter in ffmpeg — it has to be a channel mix
        Vintage: 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131',
        Neon: 'eq=contrast=1.2:saturation=1.5',
    }
    return map[filter] || ''
}

function escapeDrawtext(text: string) {
    return text
        .replace(/\\/g, '\\\\')
        // a literal ' cannot be escaped inside a single-quoted filter argument
        .replace(/'/g, '’')
        .replace(/:/g, '\\:')
        .replace(/%/g, '\\%')
        .replace(/\r?\n/g, ' ')
}

function even(value: number) {
    return Math.max(2, Math.round(value / 2) * 2)
}

type Probe = { width: number; height: number; hasAudio: boolean; duration: number }

function probeInput(input: string): Probe {
    const fallback: Probe = { width: 0, height: 0, hasAudio: false, duration: 0 }
    try {
        const result = spawnSync(
            resolveFFmpegBinary('ffprobe'),
            ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', input],
            { encoding: 'utf8' }
        )
        if (result.status !== 0 || !result.stdout) return fallback
        const parsed = JSON.parse(result.stdout) as {
            streams?: Array<{ codec_type?: string; width?: number; height?: number }>
            format?: { duration?: string }
        }
        const video = parsed.streams?.find((stream) => stream.codec_type === 'video')
        return {
            width: Number(video?.width) || 0,
            height: Number(video?.height) || 0,
            hasAudio: Boolean(parsed.streams?.some((stream) => stream.codec_type === 'audio')),
            duration: Number(parsed.format?.duration) || 0,
        }
    } catch {
        return fallback
    }
}

function targetSize(aspectRatio: '9:16' | '1:1' | '16:9', quality: '720p' | '1080p' | 'original', probe: Probe) {
    const shortSide =
        quality === '720p' ? 720 : quality === '1080p' ? 1080 : even(Math.min(probe.width || 1080, probe.height || 1080))
    if (aspectRatio === '1:1') return { width: shortSide, height: shortSide }
    if (aspectRatio === '16:9') return { width: even((shortSide * 16) / 9), height: shortSide }
    return { width: shortSide, height: even((shortSide * 16) / 9) }
}

function watermarkPosition(position: string) {
    switch (position) {
        case 'top-left':
            return 'x=24:y=24'
        case 'top-right':
            return 'x=w-tw-24:y=24'
        case 'bottom-left':
            return 'x=24:y=h-th-24'
        case 'center':
            return 'x=(w-tw)/2:y=(h-th)/2'
        default:
            return 'x=w-tw-24:y=h-th-24'
    }
}

export async function POST(request: Request) {
    cleanupOldJobs()

    let body: ExportRequest
    try {
        body = await request.json()
    } catch {
        return Response.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 })
    }

    if (!body || typeof body !== 'object') {
        return Response.json({ success: false, error: 'Invalid request payload' }, { status: 400 })
    }

    if (!body.videoId || typeof body.videoId !== 'string') {
        return Response.json({ success: false, error: 'กรุณาระบุ videoId ที่ถูกต้อง' }, { status: 400 })
    }

    const inputPath = safeMediaPath(body.videoId)
    if (!inputPath) {
        return Response.json({ success: false, error: 'ไม่พบวิดีโอสำหรับ export — กรุณารออัปโหลดให้เสร็จก่อน' }, { status: 400 })
    }

    const probe = probeInput(inputPath)
    if (probe.duration <= 0 || probe.width <= 0 || probe.height <= 0) {
        return Response.json({ success: false, error: 'ไฟล์ที่ระบุไม่มีข้อมูลวิดีโอ (Video Stream)' }, { status: 400 })
    }

    const start = Number(body.trimStart ?? 0)
    let end = Number(body.trimEnd ?? probe.duration)

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
        return Response.json({ success: false, error: 'ช่วงเวลาที่ส่งมาต้องเป็นตัวเลขที่ถูกต้อง' }, { status: 400 })
    }
    if (start < 0) {
        return Response.json({ success: false, error: 'เวลาเริ่มต้นต้องไม่ต่ำกว่า 0 วินาที' }, { status: 400 })
    }
    if (start >= end) {
        return Response.json({ success: false, error: 'เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด' }, { status: 400 })
    }
    if (probe.duration > 0 && end > probe.duration + 0.1) {
        return Response.json(
            { success: false, error: `ช่วงเวลาสิ้นสุด (${end.toFixed(1)}s) เกินความยาวจริงของวิดีโอ (${probe.duration.toFixed(1)}s)` },
            { status: 400 }
        )
    }

    const durationLimit = body.format?.durationLimit
    if (durationLimit && durationLimit !== 'unlimited') {
        const limit = Number(durationLimit)
        if (Number.isFinite(limit) && limit > 0) end = Math.min(end, start + limit)
    }
    const clipDuration = end - start

    const musicPath = safeMediaPath(body.audio?.musicUrl)
    const voicePath = safeMediaPath(body.audio?.voiceoverUrl)

    const aspectRatio = body.format?.aspectRatio ?? '9:16'
    const quality = body.format?.quality ?? '720p'
    const { width, height } = targetSize(aspectRatio, quality, probe)
    const backgroundMode = body.effects?.background?.mode ?? 'Black'

    fs.mkdirSync(EXPORT_DIR, { recursive: true })
    const jobId = crypto.randomUUID()
    const diskFilename = `${jobId}.mp4`
    const outputPath = path.join(EXPORT_DIR, diskFilename)

    const outputName = body.outputName
        ? body.outputName.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80)
        : `clip_${Date.now()}`
    const downloadFilename = `${outputName || 'clip'}.mp4`
    const downloadUrl = `/api/video/stream?path=${encodeURIComponent(outputPath)}&download=1&filename=${encodeURIComponent(downloadFilename)}`

    jobs.set(jobId, { status: 'queued', progress: 0, createdAt: Date.now() })

    let childProcess: ReturnType<typeof spawn> | null = null
    let isClosed = false
    const subtitlePath = path.join(EXPORT_DIR, `${jobId}.srt`)
    const burnSubtitles = Boolean(body.burnSubtitles && (body.subtitles ?? []).length > 0)

    const cleanup = () => {
        if (burnSubtitles) fs.rm(subtitlePath, { force: true }, () => {})
    }

    const stream = new ReadableStream({
        start(controller) {
            const warnings: string[] = []
            const emit = (data: object) => {
                if (isClosed) return
                try {
                    controller.enqueue(sse(data))
                } catch {
                    isClosed = true
                }
            }
            const finish = (state: Omit<JobState, 'createdAt'>, extra: object = {}) => {
                if (isClosed) return
                isClosed = true
                const fullState: JobState = { ...state, createdAt: Date.now() }
                jobs.set(jobId, fullState)
                try {
                    controller.enqueue(sse({ jobId, done: true, warnings, ...fullState, ...extra }))
                    controller.close()
                } catch {
                    // Controller already closed
                }
            }

            // ---- subtitles: rebased onto the trimmed timeline -------------------
            if (burnSubtitles) {
                const visibleSubtitles = (body.subtitles ?? [])
                    .filter((sub) => sub.endTime > start && sub.startTime < end)
                    .map((sub) => ({
                        ...sub,
                        startTime: Math.max(0, sub.startTime - start),
                        endTime: Math.min(clipDuration, sub.endTime - start),
                    }))
                    .filter((sub) => sub.endTime > sub.startTime)
                if (visibleSubtitles.length) {
                    const srt = visibleSubtitles
                        .map((sub, idx) => `${idx + 1}\n${formatSrtTime(sub.startTime)} --> ${formatSrtTime(sub.endTime)}\n${sub.text}\n`)
                        .join('\n')
                    fs.writeFileSync(subtitlePath, srt, 'utf8')
                }
            }

            // ---- video graph ----------------------------------------------------
            const chains: string[] = []
            if (backgroundMode === 'Blur') {
                chains.push('[0:v]split=2[bgsrc][fgsrc]')
                chains.push(`[bgsrc]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},boxblur=20:2[bg]`)
                chains.push(`[fgsrc]scale=${width}:${height}:force_original_aspect_ratio=decrease[fg]`)
                chains.push('[bg][fg]overlay=(W-w)/2:(H-h)/2[base]')
            } else {
                const color = backgroundMode === 'Black' ? 'black' : normalizeColor(body.effects?.background?.color)
                chains.push(`[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:${color}[base]`)
            }

            const post: string[] = []
            const preset = body.effects?.filter && body.effects.filter !== 'None' ? filterToFFmpeg(body.effects.filter) : ''
            if (preset) post.push(preset)
            if (body.effects?.brightness || body.effects?.contrast || body.effects?.saturation) {
                post.push(
                    `eq=brightness=${(body.effects.brightness ?? 0) / 100}:contrast=${1 + (body.effects.contrast ?? 0) / 100}:saturation=${1 + (body.effects.saturation ?? 0) / 100}`
                )
            }
            if (body.effects?.transition === 'Fade') {
                const fade = Math.min(0.5, clipDuration / 4)
                post.push(`fade=t=in:st=0:d=${fade.toFixed(2)},fade=t=out:st=${Math.max(0, clipDuration - fade).toFixed(2)}:d=${fade.toFixed(2)}`)
            } else if (body.effects?.transition === 'Zoom in') {
                post.push(`zoompan=z='min(zoom+0.0015,1.15)':d=1:s=${width}x${height}:fps=30`)
            }
            if (burnSubtitles && fs.existsSync(subtitlePath)) {
                post.push(`subtitles=${path.relative(process.cwd(), subtitlePath).replace(/\\/g, '/')}`)
            }
            if (body.format?.watermark?.enabled && body.format.watermark.text) {
                const fontFile = ensureWatermarkFont()
                if (fontFile) {
                    const opacity = Math.min(1, Math.max(0.05, (body.format.watermark.opacity ?? 55) / 100))
                    post.push(
                        `drawtext=fontfile=${fontFile}:text='${escapeDrawtext(body.format.watermark.text)}':${watermarkPosition(body.format.watermark.position ?? 'bottom-right')}:fontsize=${Math.round(height / 40)}:fontcolor=white@${opacity}:box=1:boxcolor=black@0.35:boxborderw=16`
                    )
                } else {
                    warnings.push('ไม่พบฟอนต์สำหรับลายน้ำบนเครื่องนี้ — export โดยไม่มีลายน้ำ')
                }
            }
            chains.push(`[base]${post.length ? post.join(',') : 'null'}[vout]`)

            // ---- audio graph ----------------------------------------------------
            const audioInputs: string[] = []
            const audioChains: string[] = []
            const mixLabels: string[] = []
            const originalVolume = body.audio?.originalMuted ? 0 : (body.audio?.originalVolume ?? 100) / 100
            if (probe.hasAudio && originalVolume > 0) {
                audioChains.push(`[0:a]volume=${originalVolume.toFixed(2)}[orig]`)
                mixLabels.push('[orig]')
            }
            if (musicPath) {
                audioInputs.push(musicPath)
                audioChains.push(`[${audioInputs.length}:a]volume=${((body.audio?.bgmVolume ?? 30) / 100).toFixed(2)}[music]`)
                mixLabels.push('[music]')
            }
            if (voicePath) {
                audioInputs.push(voicePath)
                audioChains.push(`[${audioInputs.length}:a]volume=1.0[voice]`)
                mixLabels.push('[voice]')
            }
            if (body.audio?.musicUrl && !musicPath) warnings.push('ข้ามเพลงพื้นหลัง — ไฟล์ยังไม่ได้อัปโหลด')
            if (body.audio?.voiceoverUrl && !voicePath) warnings.push('ข้าม voiceover — ไฟล์ยังไม่ได้อัปโหลด')

            const hasAudioOut = mixLabels.length > 0
            if (mixLabels.length === 1) {
                audioChains[0] = audioChains[0].replace(/\[[a-z]+\]$/, '[aout]')
            } else if (mixLabels.length > 1) {
                audioChains.push(`${mixLabels.join('')}amix=inputs=${mixLabels.length}:duration=longest:dropout_transition=2[aout]`)
            }

            // ---- run ------------------------------------------------------------
            const args = ['-y', '-ss', String(start), '-to', String(end), '-i', inputPath]
            for (const audioInput of audioInputs) args.push('-i', audioInput)
            args.push('-filter_complex', [...chains, ...audioChains].join(';'))
            args.push('-map', '[vout]')
            if (hasAudioOut) args.push('-map', '[aout]', '-c:a', 'aac', '-b:a', '192k')
            else args.push('-an')
            args.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart')
            if (audioInputs.length) args.push('-shortest')
            args.push(outputPath)

            jobs.set(jobId, { status: 'processing', progress: 0, createdAt: Date.now() })
            emit({ jobId, progress: 1, status: 'processing' })

            childProcess = spawn(resolveFFmpegBinary('ffmpeg'), args, { cwd: process.cwd() })
            let stderrTail = ''

            childProcess.stderr?.on('data', (data: Buffer) => {
                if (isClosed) return
                const text = data.toString()
                stderrTail = (stderrTail + text).slice(-4000)
                const match = text.match(/time=(\d+):(\d+):(\d+\.\d+)/)
                if (match) {
                    const elapsed = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3])
                    const pct = Math.min(Math.max(Math.round((elapsed / clipDuration) * 100), 1), 99)
                    jobs.set(jobId, { status: 'processing', progress: pct, createdAt: Date.now() })
                    emit({ jobId, progress: pct, status: 'processing' })
                }
            })

            childProcess.on('close', (code) => {
                cleanup()
                if (isClosed) return
                if (code === 0) {
                    finish({
                        status: 'done',
                        progress: 100,
                        outputFile: outputPath,
                        downloadUrl,
                    })
                } else {
                    const reason = stderrTail.split('\n').filter(Boolean).slice(-2).join(' ')
                    finish({ status: 'error', progress: 0, error: `FFmpeg export failed${reason ? `: ${reason}` : ''}` })
                }
            })

            childProcess.on('error', () => {
                cleanup()
                if (isClosed) return
                finish({ status: 'error', progress: 0, error: 'ไม่สามารถเรียกใช้ FFmpeg ได้ — ตรวจสอบว่าติดตั้ง ffmpeg แล้ว' })
            })
        },
        cancel() {
            isClosed = true
            if (childProcess && !childProcess.killed) {
                try {
                    childProcess.kill('SIGTERM')
                } catch {
                    // process already dead
                }
            }
            cleanup()
        },
    })

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Job-Id': jobId,
        },
    })
}

export async function GET(request: Request) {
    const url = new URL(request.url)
    const jobId = url.searchParams.get('jobId')
    if (!jobId || !jobs.has(jobId)) {
        return Response.json({ success: false, error: 'ไม่พบ job ที่ระบุ' }, { status: 404 })
    }
    return Response.json({ success: true, job: { id: jobId, ...jobs.get(jobId) } })
}

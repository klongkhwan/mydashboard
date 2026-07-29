import { NextRequest } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import { spawn } from 'child_process'
import * as os from 'os'

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

const enc = new TextEncoder()
const jobs = new Map<string, { status: 'queued' | 'processing' | 'done' | 'error'; progress: number; outputFile?: string; error?: string }>()

function sse(data: object) {
    return enc.encode(`data: ${JSON.stringify(data)}\n\n`)
}

function getFFmpegPath(): string {
    if (os.platform() === 'win32') {
        const wingetPath = `${process.env.LOCALAPPDATA}\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0.1-full_build\\bin\\ffmpeg.exe`
        if (fs.existsSync(wingetPath)) return wingetPath
    }
    return 'ffmpeg'
}

function validateInputPath(videoId?: string) {
    if (!videoId) return null
    if (!fs.existsSync(videoId)) return null
    return videoId
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
        Vintage: 'sepia',
        Neon: 'eq=contrast=1.2:saturation=1.5',
    }
    return map[filter] || ''
}

function escapeDrawtext(text: string) {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/:/g, '\\:')
        .replace(/%/g, '\\%')
        .replace(/\n/g, ' ')
}

export async function POST(request: NextRequest) {
    let body: ExportRequest
    try {
        body = await request.json()
    } catch {
        return new Response(sse({ done: true, error: 'Invalid JSON' }), {
            headers: { 'Content-Type': 'text/event-stream' },
        })
    }

    const inputPath = validateInputPath(body.videoId)
    if (!inputPath) {
        return new Response(sse({ done: true, error: 'ไม่พบวิดีโอสำหรับ export' }), {
            headers: { 'Content-Type': 'text/event-stream' },
        })
    }

    const inputDir = path.dirname(inputPath)
    const ext = path.extname(inputPath) || '.mp4'
    const outputName = body.outputName ? body.outputName.replace(/[\\/:*?"<>|]/g, '_') : `export_${Date.now()}`
    const outputPath = path.join(inputDir, `${outputName}${ext}`)
    const jobId = crypto.randomUUID()
    jobs.set(jobId, { status: 'queued', progress: 0 })

    const stream = new ReadableStream({
        start(controller) {
            const ffmpeg = getFFmpegPath()
            const start = Math.max(0, body.trimStart ?? 0)
            const end = Math.max(start + 0.1, body.trimEnd ?? 0)
            const tempDir = path.join(process.cwd(), 'tmp', 'exports')
            fs.mkdirSync(tempDir, { recursive: true })
            const subtitlePath = path.join(tempDir, `${jobId}.srt`)
            const audioInputs: string[] = []
            if (body.audio?.musicUrl) audioInputs.push(body.audio.musicUrl)
            if (body.audio?.voiceoverUrl) audioInputs.push(body.audio.voiceoverUrl)
            const hasExtraAudio = audioInputs.length > 0
            const hasWatermark = Boolean(body.format?.watermark?.enabled && body.format.watermark.text)
            const aspectRatio = body.format?.aspectRatio ?? '9:16'
            const bgColor = body.effects?.background?.color ?? '#000000'

            if (body.burnSubtitles && body.subtitles?.length) {
                const srt = body.subtitles
                    .map((sub, idx) => `${idx + 1}\n${formatSrtTime(sub.startTime)} --> ${formatSrtTime(sub.endTime)}\n${sub.text}\n`)
                    .join('\n')
                fs.writeFileSync(subtitlePath, srt, 'utf8')
            }

            const args = ['-y', '-ss', String(start), '-to', String(end), '-i', inputPath]
            for (const audioInput of audioInputs) args.push('-i', audioInput)

            const filters: string[] = []
            if (aspectRatio === '9:16') filters.push('scale=1080:1920:force_original_aspect_ratio=decrease', 'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:' + normalizeColor(bgColor))
            if (aspectRatio === '1:1') filters.push('scale=1080:1080:force_original_aspect_ratio=decrease', 'pad=1080:1080:(ow-iw)/2:(oh-ih)/2:' + normalizeColor(bgColor))
            if (aspectRatio === '16:9') filters.push('scale=1920:1080:force_original_aspect_ratio=decrease', 'pad=1920:1080:(ow-iw)/2:(oh-ih)/2:' + normalizeColor(bgColor))
            if (body.effects?.filter && body.effects.filter !== 'None') filters.push(filterToFFmpeg(body.effects.filter))
            if (body.effects?.brightness || body.effects?.contrast || body.effects?.saturation) {
                filters.push(`eq=brightness=${(body.effects.brightness ?? 0) / 100}:contrast=${1 + (body.effects.contrast ?? 0) / 100}:saturation=${1 + (body.effects.saturation ?? 0) / 100}`)
            }
            if (body.burnSubtitles && body.subtitles?.length) filters.push(`subtitles=${subtitlePath.replace(/\\/g, '/')}`)
            if (hasWatermark) filters.push(`drawtext=text='${escapeDrawtext(String(body.format?.watermark?.text ?? ''))}':x=w-tw-24:y=h-th-24:fontsize=28:fontcolor=white@${(body.format?.watermark?.opacity ?? 100) / 100}:box=1:boxcolor=black@0.35:boxborderw=16`)
            if (body.effects?.background?.mode === 'Blur') filters.push('boxblur=10:1')
            if (body.effects?.transition && body.effects.transition !== 'None') {
                const transitionMap: Record<string, string> = {
                    Fade: 'fade=t=in:st=0:d=0.5,fade=t=out:st=0.5:d=0.5',
                    'Slide left': 'scale=iw*1.03:ih*1.03,crop=iw:ih:x=4:y=0',
                    'Slide right': 'scale=iw*1.03:ih*1.03,crop=iw:ih:x=0:y=0',
                    'Zoom in': 'zoompan=z=min(zoom+0.0015,1.5):d=1',
                }
                const transitionFilter = transitionMap[body.effects.transition]
                if (transitionFilter) filters.push(transitionFilter)
            }

            const hasExtraVideoFilter = filters.length > 0
            if (hasExtraVideoFilter) {
                args.push('-vf', filters.join(','))
            }

            if (hasExtraAudio) {
                const audioFilters: string[] = []
                const amixInputs: string[] = ['[0:a]']
                let inputIndex = 1
                if (body.audio?.musicUrl) {
                    audioFilters.push(`[${inputIndex}:a]volume=${body.audio?.bgmVolume ? body.audio.bgmVolume / 100 : 0.3}[music]`)
                    amixInputs.push('[music]')
                    inputIndex += 1
                }
                if (body.audio?.voiceoverUrl) {
                    audioFilters.push(`[${inputIndex}:a]volume=1.0[voice]`)
                    amixInputs.push('[voice]')
                }
                const amix = `${amixInputs.join('')}amix=inputs=${amixInputs.length}:duration=longest:dropout_transition=2[aout]`
                args.push('-filter_complex', [...audioFilters, amix].join(';'))
                args.push('-map', '0:v', '-map', '[aout]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac')
            } else {
                args.push('-map', '0:v', '-map', '0:a?', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac')
            }
            args.push(outputPath)

            jobs.set(jobId, { status: 'processing', progress: 0 })
            controller.enqueue(sse({ jobId, progress: 1, status: 'processing' }))

            const child = spawn(ffmpeg, args)

            child.stderr.on('data', (data: Buffer) => {
                const text = data.toString()
                const match = text.match(/time=(\d+):(\d+):(\d+\.\d+)/)
                if (match) {
                    const elapsed = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3])
                    const duration = end - start
                    const pct = Math.min(Math.max(Math.round((elapsed / duration) * 100), 1), 99)
                    jobs.set(jobId, { status: 'processing', progress: pct })
                    controller.enqueue(sse({ jobId, progress: pct, status: 'processing' }))
                }
            })

            child.on('close', (code) => {
                if (code === 0) {
                    jobs.set(jobId, { status: 'done', progress: 100, outputFile: outputPath })
                    controller.enqueue(sse({ jobId, progress: 100, status: 'done', done: true, outputFile: outputPath }))
                } else {
                    jobs.set(jobId, { status: 'error', progress: 100, error: 'FFmpeg export failed' })
                    controller.enqueue(sse({ jobId, done: true, status: 'error', error: 'FFmpeg export failed' }))
                }
                controller.close()
            })

            child.on('error', (err) => {
                jobs.set(jobId, { status: 'error', progress: 100, error: err.message })
                controller.enqueue(sse({ jobId, done: true, status: 'error', error: 'ไม่สามารถเรียกใช้ FFmpeg ได้' }))
                controller.close()
            })
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

export async function GET(request: NextRequest) {
    const jobId = request.nextUrl.searchParams.get('jobId')
    if (!jobId || !jobs.has(jobId)) {
        return Response.json({ success: false, error: 'ไม่พบ job ที่ระบุ' }, { status: 404 })
    }
    return Response.json({ success: true, job: { id: jobId, ...jobs.get(jobId) } })
}

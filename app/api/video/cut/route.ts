import { NextRequest } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import { spawn } from 'child_process'
import * as os from 'os'

function getFFmpegPath(): string {
    if (os.platform() === 'win32') {
        const wingetPath = `${process.env.LOCALAPPDATA}\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0.1-full_build\\bin\\ffmpeg.exe`
        if (fs.existsSync(wingetPath)) return wingetPath
    }
    return 'ffmpeg'
}

function parseTimeString(t: string): number {
    const parts = t.split(':').map(Number)
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
    if (parts.length === 2) return parts[0] * 60 + parts[1]
    return Number(t) || 0
}

const enc = new TextEncoder()
function sse(data: object) {
    return enc.encode(`data: ${JSON.stringify(data)}\n\n`)
}

export async function POST(request: NextRequest) {
    let body: { inputPath?: string; startTime?: string; endTime?: string; outputName?: string }
    try {
        body = await request.json()
    } catch {
        return new Response(enc.encode('data: {"done":true,"error":"Invalid JSON"}\n\n'), {
            headers: { 'Content-Type': 'text/event-stream' },
        })
    }

    const { inputPath, startTime, endTime, outputName } = body

    if (!inputPath || !startTime || !endTime) {
        return new Response(sse({ done: true, error: 'กรุณาระบุข้อมูลให้ครบถ้วน (inputPath, startTime, endTime)' }), {
            headers: { 'Content-Type': 'text/event-stream' },
        })
    }

    if (!fs.existsSync(inputPath)) {
        return new Response(sse({ done: true, error: 'ไม่พบไฟล์วิดีโอที่ระบุ' }), {
            headers: { 'Content-Type': 'text/event-stream' },
        })
    }

    const totalDuration = parseTimeString(endTime) - parseTimeString(startTime)
    const inputDir = path.dirname(inputPath)
    const inputExt = path.extname(inputPath)
    let outputFileName = outputName ? `${outputName}${inputExt}` : `output_cut${inputExt}`
    let outputPath = path.join(inputDir, outputFileName)

    if (fs.existsSync(outputPath)) {
        const ts = Date.now()
        outputFileName = outputName ? `${outputName}_${ts}${inputExt}` : `output_cut_${ts}${inputExt}`
        outputPath = path.join(inputDir, outputFileName)
    }

    const stream = new ReadableStream({
        start(controller) {
            const ffmpegPath = getFFmpegPath()
            const args = [
                '-y',
                '-ss', startTime,
                '-i', inputPath,
                '-to', endTime,
                '-c', 'copy',
                '-avoid_negative_ts', 'make_zero',
                outputPath,
            ]

            const ffmpeg = spawn(ffmpegPath, args)

            ffmpeg.stderr.on('data', (data: Buffer) => {
                const text = data.toString()
                // Parse "time=HH:MM:SS.ms" from FFmpeg progress lines
                const match = text.match(/time=(\d+):(\d+):(\d+\.\d+)/)
                if (match && totalDuration > 0) {
                    const elapsed =
                        parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3])
                    const pct = Math.min(Math.round((elapsed / totalDuration) * 100), 99)
                    controller.enqueue(sse({ progress: pct }))
                }
            })

            ffmpeg.on('close', (code: number | null) => {
                if (code === 0) {
                    controller.enqueue(
                        sse({ progress: 100, done: true, outputFile: outputPath, message: 'ตัดวิดีโอสำเร็จ (Lossless)' })
                    )
                } else {
                    controller.enqueue(sse({ done: true, error: 'FFmpeg ทำงานไม่สำเร็จ' }))
                }
                controller.close()
            })

            ffmpeg.on('error', () => {
                controller.enqueue(sse({ done: true, error: 'ไม่สามารถเรียกใช้ FFmpeg ได้ กรุณาติดตั้ง FFmpeg' }))
                controller.close()
            })
        },
    })

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    })
}

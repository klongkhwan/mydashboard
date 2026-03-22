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

const enc = new TextEncoder()
function sse(data: object) {
    return enc.encode(`data: ${JSON.stringify(data)}\n\n`)
}

export async function POST(request: NextRequest) {
    let body: { files?: string[]; outputName?: string; totalDuration?: number }
    try {
        body = await request.json()
    } catch {
        return new Response(sse({ done: true, error: 'Invalid JSON' }), {
            headers: { 'Content-Type': 'text/event-stream' },
        })
    }

    const { files, outputName, totalDuration = 0 } = body

    if (!files || !Array.isArray(files) || files.length < 2) {
        return new Response(sse({ done: true, error: 'กรุณาเลือกอย่างน้อย 2 ไฟล์เพื่อรวม' }), {
            headers: { 'Content-Type': 'text/event-stream' },
        })
    }

    for (const filePath of files) {
        if (!fs.existsSync(filePath)) {
            return new Response(sse({ done: true, error: `ไม่พบไฟล์: ${filePath}` }), {
                headers: { 'Content-Type': 'text/event-stream' },
            })
        }
    }

    const inputDir = path.dirname(files[0])
    const inputExt = path.extname(files[0])
    const timestamp = Date.now()
    const outputFileName = outputName ? `${outputName}${inputExt}` : `merged_${timestamp}${inputExt}`
    let outputPath = path.join(inputDir, outputFileName)
    if (fs.existsSync(outputPath)) {
        outputPath = path.join(
            inputDir,
            outputName ? `${outputName}_${timestamp}${inputExt}` : `merged_${timestamp}${inputExt}`
        )
    }

    const listFilePath = path.join(inputDir, `concat_list_${timestamp}.txt`)
    const listContent = files.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n')
    try {
        fs.writeFileSync(listFilePath, listContent, 'utf8')
    } catch {
        return new Response(sse({ done: true, error: 'ไม่สามารถสร้างไฟล์ชั่วคราวได้' }), {
            headers: { 'Content-Type': 'text/event-stream' },
        })
    }

    const stream = new ReadableStream({
        start(controller) {
            const ffmpegPath = getFFmpegPath()
            const args = [
                '-y',
                '-f', 'concat',
                '-safe', '0',
                '-i', listFilePath,
                '-c', 'copy',
                outputPath,
            ]

            const ffmpeg = spawn(ffmpegPath, args)

            ffmpeg.stderr.on('data', (data: Buffer) => {
                const text = data.toString()
                const match = text.match(/time=(\d+):(\d+):(\d+\.\d+)/)
                if (match && totalDuration > 0) {
                    const elapsed =
                        parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3])
                    const pct = Math.min(Math.round((elapsed / totalDuration) * 100), 99)
                    controller.enqueue(sse({ progress: pct }))
                }
            })

            ffmpeg.on('close', (code: number | null) => {
                try { fs.unlinkSync(listFilePath) } catch { /* ignore */ }
                if (code === 0) {
                    controller.enqueue(
                        sse({
                            progress: 100,
                            done: true,
                            outputFile: outputPath,
                            message: 'รวมวิดีโอสำเร็จ (Lossless)',
                            mergedCount: files.length,
                        })
                    )
                } else {
                    controller.enqueue(sse({ done: true, error: 'FFmpeg ทำงานไม่สำเร็จ' }))
                }
                controller.close()
            })

            ffmpeg.on('error', () => {
                try { fs.unlinkSync(listFilePath) } catch { /* ignore */ }
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

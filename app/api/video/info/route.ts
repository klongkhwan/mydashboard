import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import { spawn } from 'child_process'
import * as os from 'os'

function getFFprobePath(): string {
    if (os.platform() === 'win32') {
        const wingetPath = `${process.env.LOCALAPPDATA}\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0.1-full_build\\bin\\ffprobe.exe`
        if (fs.existsSync(wingetPath)) return wingetPath
    }
    return 'ffprobe'
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { path: filePath } = body

        if (!filePath) {
            return NextResponse.json({ success: false, error: 'กรุณาระบุ path ของไฟล์' }, { status: 400 })
        }

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ success: false, error: 'ไม่พบไฟล์ที่ระบุ' }, { status: 404 })
        }

        const ffprobe = getFFprobePath()
        const args = [
            '-v', 'error',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            filePath,
        ]

        const data = await new Promise<string>((resolve, reject) => {
            const child = spawn(ffprobe, args)
            let stdout = ''
            let stderr = ''
            child.stdout.on('data', (chunk) => (stdout += chunk.toString()))
            child.stderr.on('data', (chunk) => (stderr += chunk.toString()))
            child.on('error', reject)
            child.on('close', (code) => {
                if (code === 0) resolve(stdout)
                else reject(new Error(stderr || 'ffprobe failed'))
            })
        })

        const parsed = JSON.parse(data)
        const videoStream = parsed.streams?.find((s: { codec_type?: string }) => s.codec_type === 'video')
        const format = parsed.format ?? {}

        return NextResponse.json({
            success: true,
            duration: Number.parseFloat(format.duration || '0'),
            width: videoStream?.width || 0,
            height: videoStream?.height || 0,
            codec: videoStream?.codec_name || 'unknown',
            bitrate: Number.parseInt(format.bit_rate || '0', 10) || 0,
            fps: (() => {
                const rate = videoStream?.r_frame_rate || '0/1'
                const [a, b] = String(rate).split('/').map(Number)
                return b ? a / b : 0
            })(),
        })
    } catch (error) {
        console.error('Info error:', error)
        return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการอ่านข้อมูลวิดีโอ' }, { status: 500 })
    }
}

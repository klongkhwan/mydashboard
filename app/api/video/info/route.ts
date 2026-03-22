import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import { spawn } from 'child_process'

// Get FFprobe path - uses ffprobe-static if available, otherwise system ffprobe
function getFFprobePath(): string {
    try {
        // Try to use ffprobe-static if installed
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const ffprobeStatic = require('ffprobe-static')
        return ffprobeStatic.path
    } catch {
        // Fall back to system ffprobe
        return 'ffprobe'
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { path: filePath } = body

        if (!filePath) {
            return NextResponse.json(
                { success: false, error: 'กรุณาระบุ Path ของไฟล์วิดีโอ' },
                { status: 400 }
            )
        }

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return NextResponse.json(
                { success: false, error: 'ไม่พบไฟล์ที่ระบุ' },
                { status: 404 }
            )
        }

        const info = await getVideoInfo(filePath)
        return NextResponse.json(info)
    } catch (error) {
        console.error('Info error:', error)
        return NextResponse.json(
            { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลวิดีโอ' },
            { status: 500 }
        )
    }
}

interface VideoInfo {
    success: boolean
    duration: number
    width: number
    height: number
    codec: string
    bitrate: number
    fps: number
    error?: string
}

async function getVideoInfo(filePath: string): Promise<VideoInfo> {
    return new Promise((resolve) => {
        const ffprobePath = getFFprobePath()

        // FFprobe command to get video info in JSON format
        const args = [
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            filePath,
        ]

        const ffprobe = spawn(ffprobePath, args)

        let stdout = ''
        let stderr = ''

        ffprobe.stdout.on('data', (data) => {
            stdout += data.toString()
        })

        ffprobe.stderr.on('data', (data) => {
            stderr += data.toString()
        })

        ffprobe.on('close', (code) => {
            if (code === 0) {
                try {
                    const data = JSON.parse(stdout)

                    // Find video stream
                    const videoStream = data.streams?.find(
                        (s: Record<string, unknown>) => s.codec_type === 'video'
                    )

                    if (!videoStream) {
                        return resolve({
                            success: false,
                            duration: 0,
                            width: 0,
                            height: 0,
                            codec: '',
                            bitrate: 0,
                            fps: 0,
                            error: 'ไม่พบ video stream ในไฟล์',
                        })
                    }

                    // Parse FPS from r_frame_rate (e.g., "30/1" or "30000/1001")
                    let fps = 0
                    if (videoStream.r_frame_rate) {
                        const parts = videoStream.r_frame_rate.split('/')
                        if (parts.length === 2) {
                            fps = parseInt(parts[0]) / parseInt(parts[1])
                        } else {
                            fps = parseFloat(videoStream.r_frame_rate)
                        }
                    }

                    resolve({
                        success: true,
                        duration: parseFloat(data.format?.duration || videoStream.duration || 0),
                        width: parseInt(videoStream.width || 0),
                        height: parseInt(videoStream.height || 0),
                        codec: videoStream.codec_name || '',
                        bitrate: parseInt(data.format?.bit_rate || 0),
                        fps: Math.round(fps * 100) / 100,
                    })
                } catch (parseError) {
                    console.error('Parse error:', parseError)
                    resolve({
                        success: false,
                        duration: 0,
                        width: 0,
                        height: 0,
                        codec: '',
                        bitrate: 0,
                        fps: 0,
                        error: 'ไม่สามารถ parse ข้อมูลวิดีโอได้',
                    })
                }
            } else {
                console.error('FFprobe error:', stderr)
                resolve({
                    success: false,
                    duration: 0,
                    width: 0,
                    height: 0,
                    codec: '',
                    bitrate: 0,
                    fps: 0,
                    error: 'FFprobe ทำงานไม่สำเร็จ',
                })
            }
        })

        ffprobe.on('error', (err) => {
            console.error('FFprobe spawn error:', err)
            resolve({
                success: false,
                duration: 0,
                width: 0,
                height: 0,
                codec: '',
                bitrate: 0,
                fps: 0,
                error: 'ไม่สามารถเรียกใช้ FFprobe ได้',
            })
        })
    })
}

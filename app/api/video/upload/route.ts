import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import { AUDIO_DIR, VIDEO_DIR } from '@/lib/media-paths'

const VIDEO_EXTENSIONS = [
    '.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm', '.m4v', '.mpeg', '.mpg', '.3gp',
]

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.webm', '.flac']

const MAX_VIDEO_BYTES = 500 * 1024 * 1024
const MAX_AUDIO_BYTES = 50 * 1024 * 1024

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const kind = formData.get('kind') === 'audio' ? 'audio' : 'video'

        if (!file) {
            return NextResponse.json({ success: false, error: 'ไม่พบไฟล์ที่อัปโหลด' }, { status: 400 })
        }

        // Validate extension
        const ext = path.extname(file.name).toLowerCase()
        const allowed = kind === 'audio' ? AUDIO_EXTENSIONS : VIDEO_EXTENSIONS
        if (!allowed.includes(ext)) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        kind === 'audio'
                            ? 'ประเภทไฟล์ไม่รองรับ รองรับเฉพาะไฟล์เสียง (mp3, wav, m4a, aac, ogg ...)'
                            : 'ประเภทไฟล์ไม่รองรับ รองรับเฉพาะไฟล์วิดีโอ (mp4, mov, avi, mkv ...)',
                },
                { status: 400 }
            )
        }

        const maxBytes = kind === 'audio' ? MAX_AUDIO_BYTES : MAX_VIDEO_BYTES
        if (file.size > maxBytes) {
            return NextResponse.json(
                { success: false, error: `ไฟล์ใหญ่เกินกำหนด (สูงสุด ${Math.round(maxBytes / 1024 / 1024)}MB)` },
                { status: 413 }
            )
        }

        // Create upload directory
        const uploadDir = kind === 'audio' ? AUDIO_DIR : VIDEO_DIR
        fs.mkdirSync(uploadDir, { recursive: true })

        // Sanitize filename — strip path components and special chars
        const safeName = path.basename(file.name).replace(/[^a-zA-Z0-9._\-ก-๙]/g, '_')
        let outputPath = path.join(uploadDir, safeName)

        // Handle filename conflict
        if (fs.existsSync(outputPath)) {
            const base = safeName.slice(0, safeName.length - ext.length)
            outputPath = path.join(uploadDir, `${base}_${Date.now()}${ext}`)
        }

        // Write file
        const buffer = Buffer.from(await file.arrayBuffer())
        fs.writeFileSync(outputPath, buffer)

        const stats = fs.statSync(outputPath)

        return NextResponse.json({
            success: true,
            path: outputPath,
            name: path.basename(outputPath),
            size: stats.size,
            kind,
            url: `/api/video/stream?path=${encodeURIComponent(outputPath)}`,
        })
    } catch (error) {
        console.error('Upload error:', error)
        return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการอัปโหลด' }, { status: 500 })
    }
}

import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

const VIDEO_EXTENSIONS = [
    '.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm', '.m4v', '.mpeg', '.mpg', '.3gp',
]

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json({ success: false, error: 'ไม่พบไฟล์ที่อัปโหลด' }, { status: 400 })
        }

        // Validate extension
        const ext = path.extname(file.name).toLowerCase()
        if (!VIDEO_EXTENSIONS.includes(ext)) {
            return NextResponse.json(
                { success: false, error: 'ประเภทไฟล์ไม่รองรับ รองรับเฉพาะไฟล์วิดีโอ (mp4, mov, avi, mkv ...)' },
                { status: 400 }
            )
        }

        // Create upload directory
        const uploadDir = path.join(process.cwd(), 'tmp', 'videos')
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
        })
    } catch (error) {
        console.error('Upload error:', error)
        return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการอัปโหลด' }, { status: 500 })
    }
}

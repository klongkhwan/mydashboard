import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

// Supported video extensions
const VIDEO_EXTENSIONS = [
    '.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm', '.m4v', '.mpeg', '.mpg', '.3gp'
]

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { path: dirPath } = body

        if (!dirPath) {
            return NextResponse.json(
                { success: false, error: 'กรุณาระบุ Path ของโฟลเดอร์' },
                { status: 400 }
            )
        }

        // Check if directory exists
        if (!fs.existsSync(dirPath)) {
            return NextResponse.json(
                { success: false, error: 'ไม่พบโฟลเดอร์ที่ระบุ' },
                { status: 404 }
            )
        }

        // Check if it's actually a directory
        const stats = fs.statSync(dirPath)
        if (!stats.isDirectory()) {
            return NextResponse.json(
                { success: false, error: 'Path ที่ระบุไม่ใช่โฟลเดอร์' },
                { status: 400 }
            )
        }

        // Read directory
        const entries = fs.readdirSync(dirPath, { withFileTypes: true })

        // Filter video files
        const videoFiles = entries
            .filter((entry) => {
                if (!entry.isFile()) return false
                const ext = path.extname(entry.name).toLowerCase()
                return VIDEO_EXTENSIONS.includes(ext)
            })
            .map((entry) => {
                const fullPath = path.join(dirPath, entry.name)
                const fileStats = fs.statSync(fullPath)

                return {
                    name: entry.name,
                    path: fullPath,
                    size: fileStats.size,
                    duration: 0, // Would need FFprobe to get actual duration
                    createdAt: fileStats.birthtime,
                    modifiedAt: fileStats.mtime,
                }
            })
            .sort((a, b) => a.name.localeCompare(b.name))

        return NextResponse.json({
            success: true,
            files: videoFiles,
            count: videoFiles.length,
        })
    } catch (error) {
        console.error('Scan error:', error)
        return NextResponse.json(
            { success: false, error: 'เกิดข้อผิดพลาดในการสแกนโฟลเดอร์' },
            { status: 500 }
        )
    }
}

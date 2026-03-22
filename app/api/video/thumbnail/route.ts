import { NextRequest } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as crypto from 'crypto'
import { spawn } from 'child_process'

function getFFmpegPath(): string {
    if (os.platform() === 'win32') {
        const wingetPath = `${process.env.LOCALAPPDATA}\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0.1-full_build\\bin\\ffmpeg.exe`
        if (fs.existsSync(wingetPath)) return wingetPath
    }
    return 'ffmpeg'
}

async function generateThumbnail(inputPath: string, outputPath: string): Promise<boolean> {
    const tryGenerate = (seekSec: string): Promise<boolean> =>
        new Promise((resolve) => {
            const ffmpegPath = getFFmpegPath()
            const args = [
                '-y',
                '-ss', seekSec,
                '-i', inputPath,
                '-vframes', '1',
                '-q:v', '2',
                '-vf', 'scale=320:-1',
                outputPath,
            ]
            const proc = spawn(ffmpegPath, args)
            proc.on('close', (code) => resolve(code === 0 && fs.existsSync(outputPath)))
            proc.on('error', () => resolve(false))
        })

    // Try 1 second first, fall back to 0
    const ok = await tryGenerate('1')
    return ok || tryGenerate('0')
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('path')

    if (!filePath) {
        return new Response('Missing path parameter', { status: 400 })
    }

    // Resolve and validate (prevent path traversal)
    const normalizedPath = path.resolve(filePath)
    if (!fs.existsSync(normalizedPath) || !fs.statSync(normalizedPath).isFile()) {
        return new Response('File not found', { status: 404 })
    }

    // Cache directory
    const cacheDir = path.join(process.cwd(), 'tmp', 'thumbnails')
    fs.mkdirSync(cacheDir, { recursive: true })

    const hash = crypto.createHash('md5').update(normalizedPath).digest('hex')
    const thumbnailPath = path.join(cacheDir, `${hash}.jpg`)

    // Return cached thumbnail if it exists
    if (fs.existsSync(thumbnailPath)) {
        const data = fs.readFileSync(thumbnailPath)
        return new Response(data, {
            headers: {
                'Content-Type': 'image/jpeg',
                'Cache-Control': 'public, max-age=86400',
            },
        })
    }

    // Generate thumbnail
    const generated = await generateThumbnail(normalizedPath, thumbnailPath)
    if (!generated || !fs.existsSync(thumbnailPath)) {
        return new Response('Failed to generate thumbnail', { status: 500 })
    }

    const data = fs.readFileSync(thumbnailPath)
    return new Response(data, {
        headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=86400',
        },
    })
}

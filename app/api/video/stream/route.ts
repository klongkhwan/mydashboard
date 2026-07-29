import { NextRequest } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

export async function GET(request: NextRequest) {
    const filePath = request.nextUrl.searchParams.get('path')

    if (!filePath) {
        return new Response('Missing path', { status: 400 })
    }

    if (!fs.existsSync(filePath)) {
        return new Response('File not found', { status: 404 })
    }

    const stat = fs.statSync(filePath)
    const range = request.headers.get('range')

    const mime = (() => {
        const ext = path.extname(filePath).toLowerCase()
        if (ext === '.mov') return 'video/quicktime'
        if (ext === '.webm') return 'video/webm'
        return 'video/mp4'
    })()

    if (range) {
        const parts = range.replace(/bytes=/, '').split('-')
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1
        const chunksize = end - start + 1
        const file = fs.createReadStream(filePath, { start, end })

        return new Response(file as unknown as BodyInit, {
            status: 206,
            headers: {
                'Content-Range': `bytes ${start}-${end}/${stat.size}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': String(chunksize),
                'Content-Type': mime,
            },
        })
    }

    const file = fs.createReadStream(filePath)
    return new Response(file as unknown as BodyInit, {
        headers: {
            'Content-Length': String(stat.size),
            'Content-Type': mime,
        },
    })
}

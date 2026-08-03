import { NextRequest } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import { safeMediaPath } from '@/lib/media-paths'

const MIME_BY_EXT: Record<string, string> = {
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.mkv': 'video/x-matroska',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
}

export async function GET(request: NextRequest) {
    const requested = request.nextUrl.searchParams.get('path')

    if (!requested) {
        return new Response('Missing path', { status: 400 })
    }

    // Only files the app itself produced under tmp/ may be streamed — an
    // unchecked path here is an arbitrary file read of the whole machine.
    const filePath = safeMediaPath(requested)
    if (!filePath) {
        return new Response('File not found', { status: 404 })
    }

    const stat = fs.statSync(filePath)
    const range = request.headers.get('range')
    const mime = MIME_BY_EXT[path.extname(filePath).toLowerCase()] ?? 'video/mp4'

    const headers: Record<string, string> = { 'Content-Type': mime }
    if (request.nextUrl.searchParams.get('download')) {
        headers['Content-Disposition'] = `attachment; filename="${encodeURIComponent(path.basename(filePath))}"`
    }

    if (range) {
        const parts = range.replace(/bytes=/, '').split('-')
        const start = Math.min(Math.max(parseInt(parts[0], 10) || 0, 0), Math.max(stat.size - 1, 0))
        const end = Math.min(parts[1] ? parseInt(parts[1], 10) : stat.size - 1, stat.size - 1)
        const chunksize = end - start + 1
        const file = fs.createReadStream(filePath, { start, end })

        return new Response(file as unknown as BodyInit, {
            status: 206,
            headers: {
                ...headers,
                'Content-Range': `bytes ${start}-${end}/${stat.size}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': String(chunksize),
            },
        })
    }

    const file = fs.createReadStream(filePath)
    return new Response(file as unknown as BodyInit, {
        headers: {
            ...headers,
            'Accept-Ranges': 'bytes',
            'Content-Length': String(stat.size),
        },
    })
}

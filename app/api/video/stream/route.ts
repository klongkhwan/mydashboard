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
        const customName = request.nextUrl.searchParams.get('filename')
        const downloadName = customName ? path.basename(customName) : path.basename(filePath)
        headers['Content-Disposition'] = `attachment; filename="${encodeURIComponent(downloadName)}"`
    }

    // Unsupported/malformed ranges are ignored. Handle a single range,
    // including suffix requests such as bytes=-1024 used by media players.
    const match = range?.match(/^bytes=(\d*)-(\d*)$/)
    if (match && (match[1] || match[2])) {
        const suffixLength = match[1] ? null : Number(match[2])
        const start = suffixLength === null ? Number(match[1]) : Math.max(stat.size - suffixLength, 0)
        const requestedEnd = suffixLength === null && match[2] ? Number(match[2]) : stat.size - 1
        if (stat.size === 0 || start >= stat.size || requestedEnd < start || suffixLength === 0) {
            return new Response(null, {
                status: 416,
                headers: { ...headers, 'Content-Range': `bytes */${stat.size}`, 'Accept-Ranges': 'bytes' },
            })
        }
        const end = Math.min(requestedEnd, stat.size - 1)
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

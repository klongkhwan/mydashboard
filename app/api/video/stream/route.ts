import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const filePath = searchParams.get('path')

        if (!filePath) {
            return NextResponse.json(
                { error: 'Missing path parameter' },
                { status: 400 }
            )
        }

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return NextResponse.json(
                { error: 'File not found' },
                { status: 404 }
            )
        }

        // Get file stats
        const stat = fs.statSync(filePath)
        const fileSize = stat.size
        const range = request.headers.get('range')

        // Get content type based on extension
        const ext = path.extname(filePath).toLowerCase()
        const mimeTypes: { [key: string]: string } = {
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.ogg': 'video/ogg',
            '.mov': 'video/quicktime',
            '.avi': 'video/x-msvideo',
            '.mkv': 'video/x-matroska',
            '.wmv': 'video/x-ms-wmv',
            '.flv': 'video/x-flv',
            '.m4v': 'video/mp4',
        }
        const contentType = mimeTypes[ext] || 'video/mp4'

        // Handle range request for video seeking
        if (range) {
            const parts = range.replace(/bytes=/, '').split('-')
            const start = parseInt(parts[0], 10)
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
            const chunkSize = end - start + 1

            const stream = fs.createReadStream(filePath, { start, end })

            // Convert Node.js stream to Web ReadableStream
            const webStream = new ReadableStream({
                start(controller) {
                    stream.on('data', (chunk) => {
                        controller.enqueue(chunk)
                    })
                    stream.on('end', () => {
                        controller.close()
                    })
                    stream.on('error', (err) => {
                        controller.error(err)
                    })
                },
                cancel() {
                    stream.destroy()
                }
            })

            return new NextResponse(webStream, {
                status: 206,
                headers: {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunkSize.toString(),
                    'Content-Type': contentType,
                },
            })
        }

        // No range request - send entire file
        const stream = fs.createReadStream(filePath)

        const webStream = new ReadableStream({
            start(controller) {
                stream.on('data', (chunk) => {
                    controller.enqueue(chunk)
                })
                stream.on('end', () => {
                    controller.close()
                })
                stream.on('error', (err) => {
                    controller.error(err)
                })
            },
            cancel() {
                stream.destroy()
            }
        })

        return new NextResponse(webStream, {
            status: 200,
            headers: {
                'Content-Length': fileSize.toString(),
                'Content-Type': contentType,
                'Accept-Ranges': 'bytes',
            },
        })
    } catch (error) {
        console.error('Stream error:', error)
        return NextResponse.json(
            { error: 'Failed to stream video' },
            { status: 500 }
        )
    }
}

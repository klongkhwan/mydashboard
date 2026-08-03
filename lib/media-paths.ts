import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

export const MEDIA_ROOT = path.join(process.cwd(), 'tmp')
export const VIDEO_DIR = path.join(MEDIA_ROOT, 'videos')
export const AUDIO_DIR = path.join(MEDIA_ROOT, 'audio')
export const EXPORT_DIR = path.join(MEDIA_ROOT, 'exports')
export const FONT_DIR = path.join(MEDIA_ROOT, 'fonts')

/**
 * Paths coming from the client are only ever allowed to point inside tmp/.
 * Without this every route that takes a `path` param is an arbitrary file read.
 */
export function isInsideMediaRoot(candidate: string) {
    const resolved = path.resolve(candidate)
    const root = path.resolve(MEDIA_ROOT)
    const rel = path.relative(root, resolved)
    return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)
}

/** Resolves a media path from the client, or null if it escapes tmp/ or does not exist. */
export function safeMediaPath(candidate?: string | null) {
    if (!candidate) return null
    if (!isInsideMediaRoot(candidate)) return null
    const resolved = path.resolve(candidate)
    if (!fs.existsSync(resolved)) return null
    return resolved
}

function findWingetBinary(name: 'ffmpeg' | 'ffprobe') {
    const packages = path.join(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'WinGet', 'Packages')
    try {
        const pkg = fs.readdirSync(packages).find((entry) => entry.startsWith('Gyan.FFmpeg'))
        if (!pkg) return null
        const pkgDir = path.join(packages, pkg)
        const build = fs.readdirSync(pkgDir).find((entry) => entry.startsWith('ffmpeg-'))
        if (!build) return null
        const binary = path.join(pkgDir, build, 'bin', `${name}.exe`)
        return fs.existsSync(binary) ? binary : null
    } catch {
        return null
    }
}

/**
 * Resolution order: explicit env override → winget install (discovered, not hardcoded
 * to one version) → whatever is on PATH.
 */
export function resolveFFmpegBinary(name: 'ffmpeg' | 'ffprobe' = 'ffmpeg'): string {
    const override = name === 'ffmpeg' ? process.env.FFMPEG_PATH : process.env.FFPROBE_PATH
    if (override && fs.existsSync(override)) return override
    if (os.platform() === 'win32') {
        const found = findWingetBinary(name)
        if (found) return found
    }
    return name
}

const WATERMARK_FONT_CANDIDATES = [
    'C:/Windows/Fonts/tahoma.ttf', // Latin + Thai
    'C:/Windows/Fonts/leelawui.ttf',
    'C:/Windows/Fonts/arial.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/System/Library/Fonts/Supplemental/Arial.ttf',
]

/**
 * drawtext needs a font file, and quoting a Windows path (`C:/...`) inside a filter
 * graph is a minefield. Copy the font under tmp/ once so the filter can use a
 * relative, colon-free path instead.
 */
export function ensureWatermarkFont(): string | null {
    const target = path.join(FONT_DIR, 'watermark.ttf')
    if (fs.existsSync(target)) return path.relative(process.cwd(), target).replace(/\\/g, '/')
    const source = WATERMARK_FONT_CANDIDATES.find((candidate) => fs.existsSync(candidate))
    if (!source) return null
    fs.mkdirSync(FONT_DIR, { recursive: true })
    fs.copyFileSync(source, target)
    return path.relative(process.cwd(), target).replace(/\\/g, '/')
}

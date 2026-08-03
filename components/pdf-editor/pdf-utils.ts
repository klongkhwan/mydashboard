import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'
import type { PDFFont, PDFImage, PDFPage } from 'pdf-lib'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import JSZip from 'jszip'

import type {
    ImageFormat,
    PageRender,
    PageRotation,
    PageThumb,
    PdfOperation,
    PdfPageRef,
    PdfSource,
    Placement,
} from './pdf-editor.types'

export const THAI_FONT_URL = '/fonts/Sarabun-Regular.ttf'

/**
 * pdfjs แตะ DOM ตอน import จึงต้องโหลดแบบ dynamic ไม่ให้ทำงานตอน SSR
 * worker ถูกคัดลอกไว้ที่ public/pdf.worker.min.mjs เพื่อให้ path คงที่ทั้ง webpack และ turbopack
 */
let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null

export function getPdfjs() {
    if (!pdfjsPromise) {
        pdfjsPromise = import('pdfjs-dist').then((lib) => {
            lib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
            return lib
        })
    }
    return pdfjsPromise
}

export class EncryptedPdfError extends Error {
    constructor(public fileName: string) {
        super(`${fileName} ถูกล็อกด้วยรหัสผ่าน`)
        this.name = 'EncryptedPdfError'
    }
}

export type LoadedSource = {
    source: PdfSource
    pages: PdfPageRef[]
    /** ไบต์ต้นฉบับที่เก็บไว้ให้ pdf-lib ใช้ตอน export */
    bytes: ArrayBuffer
    doc: PDFDocumentProxy
}

export async function loadPdfSource(file: File): Promise<LoadedSource> {
    const pdfjs = await getPdfjs()
    const bytes = await file.arrayBuffer()

    let doc: PDFDocumentProxy
    try {
        // pdfjs ยึดกรรมสิทธิ์ buffer ที่ส่งเข้าไป (detach) จึงต้องให้สำเนา ไม่งั้น pdf-lib จะอ่านไบต์ต้นฉบับไม่ได้
        doc = await pdfjs.getDocument({ data: new Uint8Array(bytes.slice(0)) }).promise
    } catch (error) {
        if (error instanceof Error && error.name === 'PasswordException') {
            throw new EncryptedPdfError(file.name)
        }
        throw error
    }

    const sourceId = crypto.randomUUID()
    const source: PdfSource = { id: sourceId, name: file.name, size: file.size, pageCount: doc.numPages }
    const pages: PdfPageRef[] = Array.from({ length: doc.numPages }, (_, index) => ({
        id: crypto.randomUUID(),
        sourceId,
        sourceIndex: index,
        rotation: 0,
        placements: [],
    }))

    return { source, pages, bytes, doc }
}

/**
 * ฟอนต์ไทยสำหรับฝังลง PDF — pdf-lib เขียนภาษาไทยด้วยฟอนต์มาตรฐานไม่ได้
 * คืน null เมื่อไม่มีไฟล์ ผู้เรียกต้อง fallback ไป Helvetica (อังกฤษเท่านั้น)
 */
let thaiFontPromise: Promise<ArrayBuffer | null> | null = null

export function loadThaiFont(): Promise<ArrayBuffer | null> {
    if (!thaiFontPromise) {
        thaiFontPromise = fetch(THAI_FONT_URL)
            .then((res) => (res.ok ? res.arrayBuffer() : null))
            .catch(() => null)
    }
    return thaiFontPromise
}

export function hasThaiCharacters(text: string) {
    return /[฀-๿]/.test(text)
}

export async function renderThumbnail(doc: PDFDocumentProxy, pageIndex: number, targetWidth = 220): Promise<PageThumb> {
    const page = await doc.getPage(pageIndex + 1)
    try {
        const base = page.getViewport({ scale: 1 })
        const viewport = page.getViewport({ scale: targetWidth / base.width })
        const canvas = document.createElement('canvas')
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)
        // pdfjs เดิน render loop ด้วย requestAnimationFrame จึงหยุดค้างระหว่างที่แท็บถูกซ่อน แล้วไปต่อเมื่อกลับมา
        await page.render({ canvas, viewport }).promise
        return { url: canvas.toDataURL('image/jpeg', 0.72), width: canvas.width, height: canvas.height }
    } finally {
        page.cleanup()
    }
}

/**
 * ภาพหน้าความละเอียดสูงสำหรับหน้าจอวางของ — บังคับ rotation 0 เพื่อให้พิกัดบนจอ
 * ตรงกับพิกัดใน PDF แบบหนึ่งต่อหนึ่ง ไม่ต้องแปลงกลับตอน export
 */
export async function renderPageImage(doc: PDFDocumentProxy, pageIndex: number, targetWidth = 900): Promise<PageRender> {
    const page = await doc.getPage(pageIndex + 1)
    try {
        const upright = page.getViewport({ scale: 1, rotation: 0 })
        const viewport = page.getViewport({ scale: targetWidth / upright.width, rotation: 0 })
        const canvas = document.createElement('canvas')
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)
        await page.render({ canvas, viewport }).promise
        return {
            url: canvas.toDataURL('image/jpeg', 0.85),
            width: canvas.width,
            height: canvas.height,
            baseRotation: page.rotate,
            pointWidth: upright.width,
            pointHeight: upright.height,
        }
    } finally {
        page.cleanup()
    }
}

/** ปล่อย worker และหน่วยความจำของเอกสาร — pdfjs ให้ destroy อยู่บน loadingTask ไม่ใช่ตัว proxy */
export function destroyPdfDoc(doc: PDFDocumentProxy) {
    void doc.loadingTask.destroy()
}

export function applyOperation(pages: PdfPageRef[], op: PdfOperation): PdfPageRef[] {
    switch (op.kind) {
        case 'append':
            return [...pages, ...op.pages]

        case 'reorder': {
            const byId = new Map(pages.map((page) => [page.id, page]))
            const next = op.order.flatMap((id) => {
                const page = byId.get(id)
                return page ? [page] : []
            })
            // ถ้า order ไม่ครบทุกหน้าถือว่าไม่น่าเชื่อถือ ให้คงลำดับเดิมไว้ดีกว่าทำหน้าหาย
            return next.length === pages.length ? next : pages
        }

        case 'delete': {
            const removing = new Set(op.pageIds)
            return pages.filter((page) => !removing.has(page.id))
        }

        case 'duplicate': {
            const duplicating = new Set(op.pageIds)
            return pages.flatMap((page) =>
                duplicating.has(page.id)
                    ? [
                          page,
                          {
                              ...page,
                              id: crypto.randomUUID(),
                              // ของที่วางไว้ต้องได้ id ใหม่ ไม่งั้นแก้สำเนาแล้วไปโดนต้นฉบับด้วย
                              placements: page.placements.map((item) => ({ ...item, id: crypto.randomUUID() })),
                          },
                      ]
                    : [page]
            )
        }

        case 'addPlacement':
            return pages.map((page) =>
                page.id === op.pageId ? { ...page, placements: [...page.placements, op.placement] } : page
            )

        case 'updatePlacement':
            return pages.map((page) =>
                page.id === op.pageId
                    ? {
                          ...page,
                          placements: page.placements.map((item) =>
                              item.id === op.placementId ? ({ ...item, ...op.patch } as Placement) : item
                          ),
                      }
                    : page
            )

        case 'removePlacement':
            return pages.map((page) =>
                page.id === op.pageId
                    ? { ...page, placements: page.placements.filter((item) => item.id !== op.placementId) }
                    : page
            )

        case 'rotate': {
            const rotating = new Set(op.pageIds)
            return pages.map((page) =>
                rotating.has(page.id)
                    ? { ...page, rotation: (((page.rotation + op.degrees) % 360 + 360) % 360) as PageRotation }
                    : page
            )
        }
    }
}

function hexToRgb(hex: string) {
    const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
    if (!match) return rgb(0, 0, 0)
    const value = parseInt(match[1], 16)
    return rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255)
}

/** วาดของที่ผู้ใช้วางไว้ลงหน้า — พิกัดที่เก็บเป็นสัดส่วนนับจากมุมบนซ้าย ส่วน PDF นับจากมุมล่างซ้าย */
async function drawPlacements(
    out: PDFDocument,
    page: PDFPage,
    placements: Placement[],
    font: PDFFont | null,
    imageCache: Map<string, PDFImage>
) {
    const { width, height } = page.getSize()

    for (const item of placements) {
        if (item.kind === 'image') {
            let image = imageCache.get(item.dataUrl)
            if (!image) {
                image = item.dataUrl.startsWith('data:image/png')
                    ? await out.embedPng(item.dataUrl)
                    : await out.embedJpg(item.dataUrl)
                imageCache.set(item.dataUrl, image)
            }
            page.drawImage(image, {
                x: item.x * width,
                y: height - (item.y + item.h) * height,
                width: item.w * width,
                height: item.h * height,
            })
            continue
        }

        if (!font || !item.text) continue
        // drawText วางที่เส้น baseline ส่วนพิกัดที่เก็บไว้คือขอบบนของข้อความ
        const ascent = font.heightAtSize(item.fontSize, { descender: false })
        page.drawText(item.text, {
            x: item.x * width,
            y: height - item.y * height - ascent,
            size: item.fontSize,
            font,
            color: hexToRgb(item.color),
        })
    }
}

export type BuildOptions = { fontBytes?: ArrayBuffer | null }

/** ประกอบ PDF ใหม่จากลำดับหน้าปัจจุบัน — rotation ที่เก็บไว้เป็นค่าส่วนต่างจากการหมุนเดิมของหน้านั้น */
export async function buildPdf(
    pages: PdfPageRef[],
    bytesBySource: Map<string, ArrayBuffer>,
    options: BuildOptions = {}
): Promise<Uint8Array> {
    if (pages.length === 0) throw new Error('ไม่มีหน้าให้บันทึก')

    const out = await PDFDocument.create()
    const loaded = new Map<string, PDFDocument>()
    const imageCache = new Map<string, PDFImage>()

    let font: PDFFont | null = null
    const textItems = pages.flatMap((page) => page.placements.filter((item) => item.kind === 'text'))
    if (textItems.length > 0) {
        if (options.fontBytes) {
            const fontkit = (await import('@pdf-lib/fontkit')).default
            out.registerFontkit(fontkit)
            font = await out.embedFont(options.fontBytes, { subset: true })
        } else {
            font = await out.embedFont(StandardFonts.Helvetica)
        }
    }

    for (const ref of pages) {
        let source = loaded.get(ref.sourceId)
        if (!source) {
            const bytes = bytesBySource.get(ref.sourceId)
            if (!bytes) throw new Error('ไม่พบไฟล์ต้นทางของหน้าที่เลือก')
            source = await PDFDocument.load(bytes)
            loaded.set(ref.sourceId, source)
        }
        const [copied] = await out.copyPages(source, [ref.sourceIndex])
        await drawPlacements(out, copied, ref.placements, font, imageCache)
        if (ref.rotation !== 0) {
            copied.setRotation(degrees((copied.getRotation().angle + ref.rotation) % 360))
        }
        out.addPage(copied)
    }

    return out.save()
}

/** รวมรูปเป็น PDF หนึ่งไฟล์ หนึ่งรูปต่อหนึ่งหน้าขนาดเท่ารูป แล้วส่งต่อเข้าไปป์ไลน์เดิมได้เลย */
export async function pdfFromImages(files: File[]): Promise<{ bytes: Uint8Array; skipped: string[] }> {
    const out = await PDFDocument.create()
    const skipped: string[] = []

    for (const file of files) {
        const bytes = await file.arrayBuffer()
        try {
            const image = /\.png$/i.test(file.name) ? await out.embedPng(bytes) : await out.embedJpg(bytes)
            const page = out.addPage([image.width, image.height])
            page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
        } catch {
            skipped.push(file.name)
        }
    }

    if (out.getPageCount() === 0) throw new Error('ไม่มีรูปที่ใช้ได้ รองรับ JPG และ PNG')
    return { bytes: await out.save(), skipped }
}

/** ส่งออกหน้าเป็นรูป โดยวาดของที่ผู้ใช้วางไว้ทับลงบน canvas ให้ตรงกับไฟล์ PDF ที่ได้ */
export async function renderPageToImageBlob(
    doc: PDFDocumentProxy,
    ref: PdfPageRef,
    format: ImageFormat,
    scale = 2
): Promise<Blob> {
    const page = await doc.getPage(ref.sourceIndex + 1)
    try {
        const rotation = (page.rotate + ref.rotation) % 360
        const viewport = page.getViewport({ scale, rotation })
        const canvas = document.createElement('canvas')
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)
        await page.render({ canvas, viewport }).promise

        if (ref.placements.length > 0) {
            const context = canvas.getContext('2d')
            if (context) await drawPlacementsOnCanvas(context, canvas, ref.placements, rotation, scale)
        }

        return await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
                (blob) => (blob ? resolve(blob) : reject(new Error('สร้างรูปไม่สำเร็จ'))),
                format === 'png' ? 'image/png' : 'image/jpeg',
                0.92
            )
        })
    } finally {
        page.cleanup()
    }
}

/**
 * ของที่วางไว้เก็บพิกัดบนหน้าที่ยังไม่หมุน จึงต้องหมุน context ให้ตรงกับ canvas ที่หมุนแล้ว
 * ผลลัพธ์จะได้เหมือนไฟล์ PDF ที่ viewer หมุนทั้งหน้าพร้อมของที่วางอยู่
 */
async function drawPlacementsOnCanvas(
    context: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    placements: Placement[],
    rotation: number,
    scale: number
) {
    const swapped = rotation === 90 || rotation === 270
    const pageWidth = swapped ? canvas.height : canvas.width
    const pageHeight = swapped ? canvas.width : canvas.height

    context.save()
    if (rotation === 90) {
        context.translate(canvas.width, 0)
        context.rotate(Math.PI / 2)
    } else if (rotation === 180) {
        context.translate(canvas.width, canvas.height)
        context.rotate(Math.PI)
    } else if (rotation === 270) {
        context.translate(0, canvas.height)
        context.rotate(-Math.PI / 2)
    }

    for (const item of placements) {
        if (item.kind === 'image') {
            const image = new Image()
            image.src = item.dataUrl
            await image.decode().catch(() => undefined)
            context.drawImage(image, item.x * pageWidth, item.y * pageHeight, item.w * pageWidth, item.h * pageHeight)
            continue
        }
        context.fillStyle = item.color
        context.textBaseline = 'top'
        context.font = `${item.fontSize * scale}px "Sarabun", "Noto Sans Thai", sans-serif`
        context.fillText(item.text, item.x * pageWidth, item.y * pageHeight)
    }

    context.restore()
}

export async function buildZip(
    groups: Array<{ name: string; pages: PdfPageRef[] }>,
    bytesBySource: Map<string, ArrayBuffer>,
    options: BuildOptions = {}
): Promise<Blob> {
    const zip = new JSZip()
    for (const group of groups) {
        const bytes = await buildPdf(group.pages, bytesBySource, options)
        zip.file(group.name, bytes)
    }
    return zip.generateAsync({ type: 'blob' })
}

export async function zipBlobs(entries: Array<{ name: string; blob: Blob }>): Promise<Blob> {
    const zip = new JSZip()
    for (const entry of entries) zip.file(entry.name, entry.blob)
    return zip.generateAsync({ type: 'blob' })
}

export function downloadBlob(data: Blob | Uint8Array, fileName: string) {
    const blob = data instanceof Blob ? data : new Blob([data as BlobPart], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
}

/** แปลง "1-3, 5, 8-" เป็น index ฐาน 0 โดยตัดค่าที่เกินจำนวนหน้าทิ้ง */
export function parsePageRanges(input: string, pageCount: number): number[] {
    const indexes = new Set<number>()

    for (const chunk of input.split(',')) {
        const part = chunk.trim()
        if (!part) continue

        const match = part.match(/^(\d+)\s*(-)?\s*(\d+)?$/)
        if (!match) continue

        const start = Number(match[1])
        const isRange = Boolean(match[2])
        const end = match[3] ? Number(match[3]) : isRange ? pageCount : start
        if (!start || start > end) continue

        for (let page = Math.max(1, start); page <= Math.min(pageCount, end); page += 1) {
            indexes.add(page - 1)
        }
    }

    return [...indexes].sort((a, b) => a - b)
}

export function chunkPages<T>(pages: T[], size: number): T[][] {
    if (size < 1) return [pages]
    const chunks: T[][] = []
    for (let index = 0; index < pages.length; index += size) {
        chunks.push(pages.slice(index, index + size))
    }
    return chunks
}

/** thumbnail ผูกกับหน้าต้นฉบับ ไม่ใช่ตัว PdfPageRef เพื่อให้หน้าที่ทำสำเนาใช้ภาพเดิมได้ทันที */
export function thumbKey(page: Pick<PdfPageRef, 'sourceId' | 'sourceIndex'>) {
    return `${page.sourceId}:${page.sourceIndex}`
}

export function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function stripPdfExtension(name: string) {
    return name.replace(/\.pdf$/i, '')
}

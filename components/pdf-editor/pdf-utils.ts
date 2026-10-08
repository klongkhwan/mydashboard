import {
    PDFButton,
    PDFCheckBox,
    PDFDocument,
    PDFDropdown,
    PDFOptionList,
    PDFRadioGroup,
    PDFSignature,
    PDFTextField,
    StandardFonts,
    clip,
    degrees,
    popGraphicsState,
    pushGraphicsState,
    rectangle,
    rgb,
} from 'pdf-lib'
import type { PDFFont, PDFField, PDFImage, PDFPage } from 'pdf-lib'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import JSZip from 'jszip'

import type {
    ImageFormat,
    PageRender,
    PageCrop,
    PageRotation,
    PageThumb,
    PdfOperation,
    PdfFormField,
    PdfFormValue,
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
let canvasFontPromise: Promise<void> | null = null

export function loadThaiFont(): Promise<ArrayBuffer | null> {
    if (!thaiFontPromise) {
        thaiFontPromise = fetch(THAI_FONT_URL)
            .then((res) => (res.ok ? res.arrayBuffer() : null))
            .catch(() => null)
            .then((bytes) => { if (!bytes) thaiFontPromise = null; return bytes })
    }
    return thaiFontPromise
}

export function hasThaiCharacters(text: string) {
    return /[฀-๿]/.test(text)
}

function describeFormField(field: PDFField): PdfFormField {
    const base = { name: field.getName(), readOnly: field.isReadOnly(), required: field.isRequired() }
    if (field instanceof PDFTextField) {
        return { ...base, kind: 'text', value: field.getText() ?? '', multiline: field.isMultiline(), maxLength: field.getMaxLength() }
    }
    if (field instanceof PDFCheckBox) return { ...base, kind: 'checkbox', value: field.isChecked() }
    if (field instanceof PDFDropdown) {
        const selected = field.getSelected()
        return { ...base, kind: 'dropdown', value: field.isMultiselect() ? selected : selected[0] ?? '', options: field.getOptions(), multiple: field.isMultiselect() }
    }
    if (field instanceof PDFRadioGroup) {
        return { ...base, kind: 'radio', value: field.getSelected() ?? '', options: field.getOptions() }
    }
    if (field instanceof PDFOptionList) {
        return { ...base, kind: 'optionList', value: field.getSelected(), options: field.getOptions(), multiple: field.isMultiselect() }
    }
    if (field instanceof PDFButton) return { ...base, kind: 'button', value: null }
    if (field instanceof PDFSignature) return { ...base, kind: 'signature', value: null }
    return { ...base, kind: 'unknown', value: null }
}

export async function inspectPdfForm(bytes: ArrayBuffer): Promise<PdfFormField[]> {
    const doc = await PDFDocument.load(bytes)
    return doc.getForm().getFields().map(describeFormField)
}

export type BuildFormOptions = {
    fontBytes?: ArrayBuffer | null
    flatten?: boolean
}

export async function buildFormPdf(
    bytes: ArrayBuffer,
    values: Record<string, PdfFormValue>,
    options: BuildFormOptions = {}
): Promise<Uint8Array> {
    const doc = await PDFDocument.load(bytes)
    const form = doc.getForm()
    let font: PDFFont | undefined
    if (options.fontBytes) {
        const fontkit = (await import('@pdf-lib/fontkit')).default
        doc.registerFontkit(fontkit)
        font = await doc.embedFont(options.fontBytes, { subset: true })
    }

    for (const field of form.getFields()) {
        const value = values[field.getName()]
        if (value === undefined || field.isReadOnly()) continue
        if (field instanceof PDFTextField) {
            if (typeof value !== 'string') throw new Error(`ค่าของฟอร์ม ${field.getName()} ต้องเป็นข้อความ`)
            field.setText(value)
        } else if (field instanceof PDFCheckBox) {
            if (typeof value !== 'boolean') throw new Error(`ค่าของฟอร์ม ${field.getName()} ต้องเป็น checkbox`)
            if (value) field.check()
            else field.uncheck()
        } else if (field instanceof PDFDropdown) {
            const selections = Array.isArray(value) ? value : [value]
            if (!selections.every((selection) => typeof selection === 'string')) {
                throw new Error(`ค่าของฟอร์ม ${field.getName()} ไม่ถูกต้อง`)
            }
            if (!field.isMultiselect() && selections.length > 1) {
                throw new Error(`ค่าของฟอร์ม ${field.getName()} เลือกได้เพียงรายการเดียว`)
            }
            if (selections.length && selections[0]) field.select(field.isMultiselect() ? selections : selections[0])
            else field.clear()
        } else if (field instanceof PDFRadioGroup) {
            if (typeof value !== 'string') throw new Error(`ค่าของฟอร์ม ${field.getName()} ต้องเป็นตัวเลือกเดียว`)
            if (value) field.select(value)
            else field.clear()
        } else if (field instanceof PDFOptionList) {
            const selections = Array.isArray(value) ? value : [value]
            if (!selections.every((selection) => typeof selection === 'string')) {
                throw new Error(`ค่าของฟอร์ม ${field.getName()} ไม่ถูกต้อง`)
            }
            if (!field.isMultiselect() && selections.length > 1) {
                throw new Error(`ค่าของฟอร์ม ${field.getName()} เลือกได้เพียงรายการเดียว`)
            }
            if (selections.length && selections[0]) field.select(field.isMultiselect() ? selections : selections[0])
            else field.clear()
        }
    }

    form.updateFieldAppearances(font)
    if (options.flatten) form.flatten()
    return doc.save()
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
            return next.length === pages.length && new Set(op.order).size === pages.length ? next : pages
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

        case 'setCrop': {
            const targets = new Set(op.pageIds)
            return pages.map((page) => targets.has(page.id) ? {
                ...page,
                crop: op.crop ?? undefined,
                placements: page.placements.map((item) => item.kind === 'text' && item.dynamic === 'pageNumber' ? { ...item, ...pageNumberPosition(op.crop ?? undefined) } : item),
            } : page)
        }

        case 'batch':
            return op.operations.reduce((current, nested) => applyOperation(current, nested), pages)

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

function graphemeUnits(text: string) {
    const units: string[] = []
    for (const character of Array.from(text)) {
        if (units.length > 0 && /\p{Mark}/u.test(character)) units[units.length - 1] += character
        else units.push(character)
    }
    return units
}

/** แบ่งข้อความตามความกว้างเดียวกันทั้ง PDF และ canvas โดยรักษาบรรทัดที่ผู้ใช้กด Enter ไว้ */
export function wrapTextLines(text: string, maxWidth: number | undefined, measure: (value: string) => number) {
    const paragraphs = text.split(/\r?\n/)
    if (!maxWidth || maxWidth <= 0) return paragraphs

    const lines: string[] = []
    for (const paragraph of paragraphs) {
        if (!paragraph) {
            lines.push('')
            continue
        }

        const tokens = paragraph.includes(' ')
            ? paragraph.split(/(\s+)/).flatMap((token) => (measure(token) > maxWidth ? graphemeUnits(token) : [token]))
            : graphemeUnits(paragraph)
        let current = ''

        for (const token of tokens) {
            const candidate = current + token
            if (current && measure(candidate) > maxWidth) {
                lines.push(current.trimEnd())
                current = token.trimStart()
            } else {
                current = candidate
            }

            while (current.length > 1 && measure(current) > maxWidth) {
                const units = graphemeUnits(current)
                let splitAt = units.length
                while (splitAt > 1 && measure(units.slice(0, splitAt).join('')) > maxWidth) splitAt -= 1
                const prefix = units.slice(0, splitAt).join('')
                lines.push(prefix)
                current = units.slice(splitAt).join('')
            }
        }
        lines.push(current.trimEnd())
    }
    return lines
}

/** วาดของที่ผู้ใช้วางไว้ลงหน้า — พิกัดที่เก็บเป็นสัดส่วนนับจากมุมบนซ้าย ส่วน PDF นับจากมุมล่างซ้าย */
async function drawPlacements(
    out: PDFDocument,
    page: PDFPage,
    placements: Placement[],
    font: PDFFont | null,
    imageCache: Map<string, PDFImage>
) {
    const { x: originX, y: originY, width, height } = page.getCropBox()

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
                x: originX + item.x * width,
                y: originY + height - (item.y + item.h) * height,
                width: item.w * width,
                height: item.h * height,
            })
            continue
        }

        if (item.kind === 'highlight') {
            page.drawRectangle({
                x: originX + item.x * width,
                y: originY + height - (item.y + item.h) * height,
                width: item.w * width,
                height: item.h * height,
                color: hexToRgb(item.color),
                opacity: item.opacity,
            })
            continue
        }

        if (item.kind === 'line') {
            page.drawLine({
                start: { x: originX + item.x * width, y: originY + height - (item.y + item.h / 2) * height },
                end: { x: originX + (item.x + item.w) * width, y: originY + height - (item.y + item.h / 2) * height },
                color: hexToRgb(item.color),
                thickness: item.strokeWidth,
                opacity: item.opacity,
            })
            continue
        }

        if (item.kind === 'note') {
            page.drawRectangle({
                x: originX + item.x * width,
                y: originY + height - (item.y + item.h) * height,
                width: item.w * width,
                height: item.h * height,
                color: rgb(1, 0.94, 0.55),
                borderColor: rgb(0.72, 0.58, 0.1),
                borderWidth: 0.8,
                opacity: 0.92,
            })
        }
        if (!font || !item.text) continue
        // drawText วางที่เส้น baseline ส่วนพิกัดที่เก็บไว้คือขอบบนของข้อความ
        const ascent = font.heightAtSize(item.fontSize, { descender: false })
        const align = item.kind === 'text' ? item.align : undefined
        const lineHeight = item.kind === 'text' ? item.lineHeight ?? item.fontSize * 1.25 : item.fontSize * 1.25
        const boxLeft = originX + item.x * width
        const boxWidth = item.kind === 'text' && item.w ? item.w * width : item.kind === 'note' ? item.w * width : undefined
        const padding = item.kind === 'note' ? 0.012 * width : 0
        const availableWidth = boxWidth === undefined ? undefined : Math.max(1, boxWidth - padding * 2)
        const lines = wrapTextLines(item.text, availableWidth, (value) => font.widthOfTextAtSize(value, item.fontSize))
        const textAngle = item.kind === 'text' ? (-(item.rotate ?? 0) * Math.PI) / 180 : 0
        const cos = Math.cos(textAngle)
        const sin = Math.sin(textAngle)
        const anchorX =
            item.kind === 'note'
                ? boxLeft + padding
                : boxWidth !== undefined
                  ? boxLeft + (align === 'center' ? boxWidth / 2 : align === 'right' ? boxWidth : 0)
                  : boxLeft
        const anchorY = originY + height - item.y * height
        const noteClip = item.kind === 'note'
        if (noteClip) {
            page.pushOperators(
                pushGraphicsState(),
                rectangle(originX + item.x * width, originY + height - (item.y + item.h) * height, item.w * width, item.h * height),
                clip(),
            )
        }
        lines.forEach((line, index) => {
            const textWidth = font.widthOfTextAtSize(line, item.fontSize)
            const offsetX =
                item.kind === 'note'
                    ? 0
                    : boxWidth !== undefined
                      ? align === 'center'
                          ? -textWidth / 2
                          : align === 'right'
                            ? -textWidth
                            : 0
                      : 0
            // drawText ใช้จุดเริ่มต้นเป็น baseline ขณะที่ preview หมุนรอบขอบบน
            // จึงรวมระยะ ascent ไว้ในเวกเตอร์เดียวก่อนหมุน เพื่อให้จุดหมุนตรงกัน
            const offsetY = -(index * lineHeight + ascent)
            page.drawText(line, {
                x: anchorX + offsetX * cos - offsetY * sin,
                y: anchorY + offsetX * sin + offsetY * cos,
                size: item.fontSize,
                font,
                color: hexToRgb(item.color),
                opacity: item.kind === 'note' ? 1 : item.opacity ?? 1,
                rotate: degrees(item.kind === 'text' ? -(item.rotate ?? 0) : 0),
            })
        })
        if (noteClip) page.pushOperators(popGraphicsState())
    }
}

export type BuildOptions = {
    fontBytes?: ArrayBuffer | null
    signal?: AbortSignal
    onProgress?: (done: number, total: number) => void
}

function throwIfAborted(signal?: AbortSignal) {
    if (signal?.aborted) throw new DOMException('ยกเลิกแล้ว', 'AbortError')
}

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
    const textItems = pages.flatMap((page) => page.placements.filter((item) => item.kind === 'text' || item.kind === 'note'))
    if (textItems.length > 0) {
        if (options.fontBytes) {
            const fontkit = (await import('@pdf-lib/fontkit')).default
            out.registerFontkit(fontkit)
            font = await out.embedFont(options.fontBytes, { subset: true })
        } else {
            font = await out.embedFont(StandardFonts.Helvetica)
        }
    }

    for (const [index, ref] of pages.entries()) {
        throwIfAborted(options.signal)
        let source = loaded.get(ref.sourceId)
        if (!source) {
            const bytes = bytesBySource.get(ref.sourceId)
            if (!bytes) throw new Error('ไม่พบไฟล์ต้นทางของหน้าที่เลือก')
            source = await PDFDocument.load(bytes)
            loaded.set(ref.sourceId, source)
        }
        const [copied] = await out.copyPages(source, [ref.sourceIndex])
        await drawPlacements(out, copied, ref.placements, font, imageCache)
        if (ref.crop) {
            const box = copied.getCropBox()
            const left = Math.min(0.95, Math.max(0, ref.crop.left))
            const right = Math.min(0.95, Math.max(0, ref.crop.right))
            const top = Math.min(0.95, Math.max(0, ref.crop.top))
            const bottom = Math.min(0.95, Math.max(0, ref.crop.bottom))
            if (left + right < 1 && top + bottom < 1) {
                copied.setCropBox(
                    box.x + left * box.width,
                    box.y + bottom * box.height,
                    (1 - left - right) * box.width,
                    (1 - top - bottom) * box.height
                )
            }
        }
        if (ref.rotation !== 0) {
            copied.setRotation(degrees((copied.getRotation().angle + ref.rotation) % 360))
        }
        out.addPage(copied)
        options.onProgress?.(index + 1, pages.length)
        throwIfAborted(options.signal)
    }

    return out.save()
}

export type CompressOptions = BuildOptions & { quality?: 'high' | 'balanced' | 'small' }

/**
 * สร้าง PDF ฉบับเล็กโดย rasterize แต่ละหน้า เหมาะกับเอกสารสแกนและไฟล์ที่ไม่ต้องค้นหาข้อความ
 * ผลลัพธ์จะไม่มี text layer จึงต้องให้ผู้ใช้เห็นคำเตือนก่อนเลือกโหมดนี้
 */
export async function buildCompressedPdf(
    pages: PdfPageRef[],
    docsBySource: Map<string, PDFDocumentProxy>,
    options: CompressOptions = {}
): Promise<Uint8Array> {
    if (pages.length === 0) throw new Error('ไม่มีหน้าให้บีบอัด')
    const out = await PDFDocument.create()
    const scale = options.quality === 'small' ? 1.1 : options.quality === 'high' ? 2.2 : 1.5
    const jpegQuality = options.quality === 'small' ? 0.62 : options.quality === 'high' ? 0.88 : 0.76

    for (const [index, ref] of pages.entries()) {
        throwIfAborted(options.signal)
        const doc = docsBySource.get(ref.sourceId)
        if (!doc) throw new Error('ไม่พบไฟล์ต้นทางของหน้าที่เลือก')
        const page = await doc.getPage(ref.sourceIndex + 1)
        try {
            const rotation = (page.rotate + ref.rotation) % 360
            const viewport = page.getViewport({ scale, rotation })
            const canvas = document.createElement('canvas')
            canvas.width = Math.ceil(viewport.width)
            canvas.height = Math.ceil(viewport.height)
            await page.render({ canvas, viewport }).promise
            const context = canvas.getContext('2d')
            if (context && ref.placements.length > 0) await drawPlacementsOnCanvas(context, canvas, ref.placements, rotation, scale)
            const croppedCanvas = cropRenderedCanvas(canvas, page, ref, scale, rotation)
            const blob = await new Promise<Blob>((resolve, reject) => {
                croppedCanvas.toBlob((value) => (value ? resolve(value) : reject(new Error('สร้างภาพบีบอัดไม่สำเร็จ'))), 'image/jpeg', jpegQuality)
            })
            const image = await out.embedJpg(await blob.arrayBuffer())
            const outputWidth = croppedCanvas.width / scale
            const outputHeight = croppedCanvas.height / scale
            const outputPage = out.addPage([outputWidth, outputHeight])
            outputPage.drawImage(image, { x: 0, y: 0, width: outputWidth, height: outputHeight })
            canvas.width = 0
            canvas.height = 0
        options.onProgress?.(index + 1, pages.length)
        throwIfAborted(options.signal)
        } finally {
            page.cleanup()
        }
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

export async function pdfFromBlankPage(size: 'a4' | 'a3' | 'letter' = 'a4', landscape = false) {
    const dimensions: Record<typeof size, [number, number]> = {
        a4: [595.28, 841.89],
        a3: [841.89, 1190.55],
        letter: [612, 792],
    }
    const [width, height] = dimensions[size]
    const out = await PDFDocument.create()
    out.addPage(landscape ? [height, width] : [width, height])
    return out.save()
}

/** ส่งออกหน้าเป็นรูป โดยวาดของที่ผู้ใช้วางไว้ทับลงบน canvas ให้ตรงกับไฟล์ PDF ที่ได้ */
export async function renderPageToImageBlob(
    doc: PDFDocumentProxy,
    ref: PdfPageRef,
    format: ImageFormat,
    scale = 2,
    quality = 0.92
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

        const outputCanvas = cropRenderedCanvas(canvas, page, ref, scale, rotation)

        return await new Promise<Blob>((resolve, reject) => {
            outputCanvas.toBlob(
                (blob) => (blob ? resolve(blob) : reject(new Error('สร้างรูปไม่สำเร็จ'))),
                format === 'png' ? 'image/png' : 'image/jpeg',
                quality
            )
        })
    } finally {
        page.cleanup()
    }
}

function cropRenderedCanvas(
    canvas: HTMLCanvasElement,
    page: PDFPageProxy,
    ref: PdfPageRef,
    scale: number,
    rotation: number
) {
    if (!ref.crop) return canvas
    const source = page.getViewport({ scale, rotation: 0 })
    const left = Math.min(0.95, Math.max(0, ref.crop.left))
    const right = Math.min(0.95, Math.max(0, ref.crop.right))
    const top = Math.min(0.95, Math.max(0, ref.crop.top))
    const bottom = Math.min(0.95, Math.max(0, ref.crop.bottom))
    if (left + right >= 1 || top + bottom >= 1) return canvas

    const cropX = left * source.width
    const cropY = top * source.height
    const cropWidth = (1 - left - right) * source.width
    const cropHeight = (1 - top - bottom) * source.height
    let x = cropX
    let y = cropY
    let width = cropWidth
    let height = cropHeight
    if (rotation === 90) {
        x = source.height - cropY - cropHeight
        y = cropX
        width = cropHeight
        height = cropWidth
    } else if (rotation === 180) {
        x = source.width - cropX - cropWidth
        y = source.height - cropY - cropHeight
    } else if (rotation === 270) {
        x = cropY
        y = source.width - cropX - cropWidth
        width = cropHeight
        height = cropWidth
    }
    const result = document.createElement('canvas')
    result.width = Math.max(1, Math.round(width))
    result.height = Math.max(1, Math.round(height))
    const context = result.getContext('2d')
    context?.drawImage(canvas, x, y, width, height, 0, 0, result.width, result.height)
    return result
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
    if (placements.some((item) => item.kind === 'text' || item.kind === 'note')) {
        if (!canvasFontPromise) {
            canvasFontPromise = new FontFace('SarabunPdfExport', "url('/fonts/Sarabun-Regular.ttf')").load()
                .then((font) => { document.fonts.add(font) })
                .catch((error) => { canvasFontPromise = null; throw error })
        }
        await canvasFontPromise
    }
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
            await image.decode()
            context.drawImage(image, item.x * pageWidth, item.y * pageHeight, item.w * pageWidth, item.h * pageHeight)
            continue
        }

        if (item.kind === 'highlight') {
            context.save()
            context.globalAlpha = item.opacity
            context.fillStyle = item.color
            context.fillRect(item.x * pageWidth, item.y * pageHeight, item.w * pageWidth, item.h * pageHeight)
            context.restore()
            continue
        }

        if (item.kind === 'line') {
            context.save()
            context.globalAlpha = item.opacity
            context.strokeStyle = item.color
            context.lineWidth = item.strokeWidth * scale
            context.beginPath()
            const lineY = (item.y + item.h / 2) * pageHeight
            context.moveTo(item.x * pageWidth, lineY)
            context.lineTo((item.x + item.w) * pageWidth, lineY)
            context.stroke()
            context.restore()
            continue
        }

        if (item.kind === 'note') {
            context.save()
            context.fillStyle = 'rgba(255, 240, 140, 0.92)'
            context.strokeStyle = 'rgba(180, 140, 20, 0.9)'
            context.lineWidth = Math.max(1, scale)
            context.fillRect(item.x * pageWidth, item.y * pageHeight, item.w * pageWidth, item.h * pageHeight)
            context.strokeRect(item.x * pageWidth, item.y * pageHeight, item.w * pageWidth, item.h * pageHeight)
            context.beginPath()
            context.rect(item.x * pageWidth, item.y * pageHeight, item.w * pageWidth, item.h * pageHeight)
            context.clip()
            context.fillStyle = item.color
            context.textBaseline = 'top'
            context.font = `${item.fontSize * scale}px "SarabunPdfExport", sans-serif`
            const lineHeight = item.fontSize * scale * 1.25
            const maxWidth = Math.max(1, item.w * pageWidth - 0.024 * pageWidth)
            const lines = wrapTextLines(item.text, maxWidth, (value) => context.measureText(value).width)
            lines.forEach((line, index) => {
                context.fillText(line, (item.x + 0.012) * pageWidth, (item.y + 0.012) * pageHeight + index * lineHeight)
            })
            context.restore()
            continue
        }

        const hasBox = item.w !== undefined && item.w > 0
        const boxWidth = item.w ?? 0
        const align = hasBox ? item.align ?? 'left' : 'left'
        const anchorX = hasBox
            ? item.x * pageWidth + (align === 'center' ? (boxWidth * pageWidth) / 2 : align === 'right' ? boxWidth * pageWidth : 0)
            : item.x * pageWidth
        context.save()
        context.fillStyle = item.color
        context.globalAlpha = item.opacity ?? 1
        context.textBaseline = 'top'
        context.font = `${item.fontSize * scale}px "SarabunPdfExport", sans-serif`
        context.textAlign = align
        context.translate(anchorX, item.y * pageHeight)
        if (item.rotate) context.rotate((item.rotate * Math.PI) / 180)
        const lineHeight = (item.lineHeight ?? item.fontSize * 1.25) * scale
        const maxWidth = hasBox ? boxWidth * pageWidth : undefined
        const lines = wrapTextLines(item.text, maxWidth, (value) => context.measureText(value).width)
        lines.forEach((line, index) => context.fillText(line, 0, index * lineHeight))
        context.restore()
    }

    context.restore()
}

export async function buildZip(
    groups: Array<{ name: string; pages: PdfPageRef[] }>,
    bytesBySource: Map<string, ArrayBuffer>,
    options: BuildOptions = {}
): Promise<Blob> {
    const zip = new JSZip()
    const total = groups.reduce((sum, group) => sum + group.pages.length, 0)
    let completed = 0
    for (const group of groups) {
        throwIfAborted(options.signal)
        const bytes = await buildPdf(group.pages, bytesBySource, { ...options, onProgress: (done) => options.onProgress?.(completed + done, total) })
        zip.file(group.name, bytes)
        completed += group.pages.length
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    throwIfAborted(options.signal)
    return blob
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
    setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

/** Validate every range before exporting, so a typo never silently drops pages. */
export function parsePageRanges(input: string, pageCount: number): number[] {
    if (!Number.isInteger(pageCount) || pageCount < 1) throw new Error('เอกสารยังไม่มีหน้า')
    if (!input.trim()) throw new Error('กรุณาระบุช่วงหน้า')
    const indexes = new Set<number>()

    for (const chunk of input.split(',')) {
        const part = chunk.trim()
        const match = part.match(/^(\d+)(?:\s*-\s*(\d*))?$/)
        if (!match) throw new Error(`ช่วงหน้า “${part}” ไม่ถูกต้อง เช่น 1-3, 5, 8-`)

        const start = Number(match[1])
        const end = match[2] === undefined ? start : match[2] === '' ? pageCount : Number(match[2])
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || start > end || end > pageCount) {
            throw new Error(`ช่วงหน้า “${part}” ต้องอยู่ระหว่าง 1–${pageCount} และเรียงจากน้อยไปมาก`)
        }

        for (let page = Math.max(1, start); page <= Math.min(pageCount, end); page += 1) {
            indexes.add(page - 1)
        }
    }

    return [...indexes].sort((a, b) => a - b)
}

export function chunkPages<T>(pages: T[], size: number): T[][] {
    if (!Number.isSafeInteger(size) || size < 1) throw new Error('จำนวนหน้าต่อไฟล์ต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป')
    const chunks: T[][] = []
    for (let index = 0; index < pages.length; index += size) {
        chunks.push(pages.slice(index, index + size))
    }
    return chunks
}

export function pageNumberPosition(crop?: PageCrop) {
    const left = crop?.left ?? 0
    const top = crop?.top ?? 0
    const width = 1 - left - (crop?.right ?? 0)
    const height = 1 - top - (crop?.bottom ?? 0)
    return { x: left + 0.4 * width, y: top + 0.92 * height, w: 0.2 * width }
}

/** Move a selected block to a one-based position in the final document. */
export function movePagesToPosition(pages: PdfPageRef[], pageIds: Set<string>, position: number): PdfPageRef[] {
    const chosen = pages.filter((page) => pageIds.has(page.id))
    if (!chosen.length) throw new Error('เลือกหน้าที่ต้องการย้ายก่อน')
    const remaining = pages.filter((page) => !pageIds.has(page.id))
    if (!Number.isSafeInteger(position) || position < 1 || position > remaining.length + 1) {
        throw new Error(`ตำแหน่งเริ่มต้นต้องอยู่ระหว่าง 1–${remaining.length + 1}`)
    }
    return [...remaining.slice(0, position - 1), ...chosen, ...remaining.slice(position - 1)]
}

/** Include edits in the cache key: a thumbnail must reflect the exported page. */
export function thumbKey(page: PdfPageRef) {
    const content = JSON.stringify([page.rotation, page.crop, page.placements.map((item) => ({ ...item, id: undefined }))])
    let hash = 2166136261
    for (let index = 0; index < content.length; index += 1) hash = Math.imul(hash ^ content.charCodeAt(index), 16777619)
    return `${page.sourceId}:${page.sourceIndex}:${hash >>> 0}`
}

export function planPdfSplit(
    pages: PdfPageRef[],
    mode: 'ranges' | 'each' | 'every' | 'selection',
    range: string,
    size: string,
    selectedIds: Set<string>,
    outputName: string,
): { groups: Array<{ name: string; pages: PdfPageRef[] }>; error: string | null } {
    const base = stripPdfExtension(outputName.trim() || 'document')
    if (!pages.length) return { groups: [], error: null }
    try {
        let groups: Array<{ name: string; pages: PdfPageRef[] }>
        if (mode === 'each') groups = pages.map((page, index) => ({ name: `${base}-page-${index + 1}.pdf`, pages: [page] }))
        else if (mode === 'every') groups = chunkPages(pages, Number(size)).map((part, index) => ({ name: `${base}-part-${index + 1}.pdf`, pages: part }))
        else if (mode === 'selection') {
            const chosen = pages.filter((page) => selectedIds.has(page.id))
            if (!chosen.length) throw new Error('เลือกอย่างน้อย 1 หน้าก่อนแยกไฟล์')
            groups = [{ name: `${base}-extract.pdf`, pages: chosen }]
        } else {
            groups = range.split(',').map((part, index) => ({
                name: `${base}-part-${index + 1}.pdf`,
                pages: parsePageRanges(part, pages.length).map((pageIndex) => pages[pageIndex]),
            }))
        }
        return { groups, error: null }
    } catch (error) {
        return { groups: [], error: error instanceof Error ? error.message : 'ช่วงหน้าไม่ถูกต้อง' }
    }
}

export async function renderEditedThumbnail(doc: PDFDocumentProxy, ref: PdfPageRef, bytes: ArrayBuffer): Promise<PageThumb> {
    if (!ref.rotation && !ref.crop && !ref.placements.length) return renderThumbnail(doc, ref.sourceIndex)
    const fontBytes = ref.placements.some((item) => item.kind === 'text' || item.kind === 'note') ? await loadThaiFont() : null
    const output = await buildPdf([ref], new Map([[ref.sourceId, bytes]]), { fontBytes })
    const pdfjs = await getPdfjs()
    const edited = await pdfjs.getDocument({ data: output }).promise
    try {
        return await renderThumbnail(edited, 0)
    } finally {
        destroyPdfDoc(edited)
    }
}

export function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function stripPdfExtension(name: string) {
    return name.replace(/\.pdf$/i, '')
}

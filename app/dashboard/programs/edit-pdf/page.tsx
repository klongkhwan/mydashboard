'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import {
    AlertTriangle,
    ArrowLeft,
    Check,
    CheckSquare,
    ClipboardList,
    CircleX,
    Copy,
    Download,
    Eye,
    FileImage,
    FileSignature,
    FileText,
    Layers,
    Loader2,
    Lock,
    Minimize2,
    Plus,
    Redo2,
    RotateCcw,
    RotateCw,
    Scissors,
    Square,
    Save,
    Trash2,
    Undo2,
    X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { PdfDropzone, PdfPageEditor, PdfPageGrid, PdfToolCard } from '@/components/pdf-editor'
import { PdfOutputPreview, type PdfOutput } from '@/components/pdf-editor/PdfOutputPreview'

import {
    EncryptedPdfError,
    applyOperation,
    buildPdf,
    buildCompressedPdf,
    buildZip,
    planPdfSplit,
    destroyPdfDoc,
    downloadBlob,
    formatBytes,
    hasThaiCharacters,
    buildFormPdf,
    inspectPdfForm,
    loadPdfSource,
    loadThaiFont,
    parsePageRanges,
    movePagesToPosition,
    pageNumberPosition,
    pdfFromBlankPage,
    pdfFromImages,
    renderPageImage,
    renderPageToImageBlob,
    renderEditedThumbnail,
    stripPdfExtension,
    thumbKey,
    zipBlobs,
} from '@/components/pdf-editor/pdf-utils'
import { clearPdfDraft, hasPdfDraftContent, loadPdfDraft, savePdfDraft, type PdfDraft } from '@/components/pdf-editor/pdf-draft-store'
import type {
    ImageFormat,
    CompressionQuality,
    ImageScale,
    PageRender,
    PageThumb,
    PageCrop,
    PdfOperation,
    PdfFormField,
    PdfFormValue,
    PdfPageRef,
    PdfSource,
    PdfTool,
    Placement,
    SplitMode,
} from '@/components/pdf-editor/pdf-editor.types'

const LARGE_FILE_BYTES = 50 * 1024 * 1024
const HISTORY_LIMIT = 30

const TOOLS: Array<{
    id: PdfTool
    icon: typeof Layers
    title: string
    description: string
}> = [
    { id: 'merge', icon: Layers, title: 'รวมไฟล์', description: 'รวมหลาย PDF เป็นไฟล์เดียว จัดลำดับได้ตามต้องการ' },
    { id: 'organize', icon: FileText, title: 'จัดหน้า', description: 'ลบ สลับลำดับ หมุน และทำสำเนาหน้าในเอกสาร' },
    { id: 'split', icon: Scissors, title: 'แยกไฟล์', description: 'แยกตามช่วงหน้า หรือดึงเฉพาะหน้าที่เลือกออกมา' },
    { id: 'edit', icon: FileSignature, title: 'เซ็นชื่อ / ใส่ข้อความ', description: 'เซ็นชื่อ วางข้อความหรือรูปลงบนหน้าที่ต้องการ' },
    { id: 'convert', icon: FileImage, title: 'รูป ↔ PDF', description: 'รวมรูปเป็น PDF และส่งออกหน้า PDF เป็นรูปภาพ' },
    { id: 'compress', icon: Minimize2, title: 'บีบอัด PDF', description: 'ลดขนาดไฟล์สำหรับเอกสารสแกน พร้อมเลือกคุณภาพได้' },
    { id: 'form', icon: ClipboardList, title: 'กรอกฟอร์ม PDF', description: 'กรอกช่องข้อความและตัวเลือกใน AcroForm แล้วบันทึกไฟล์' },
]

const IMAGE_PATTERN = /\.(png|jpe?g)$/i

type HistoryEntry = {
    pages: PdfPageRef[]
    sources: PdfSource[]
}

type TaskState = {
    kind: 'idle' | 'loading' | 'exporting'
    label: string
    done: number
    total: number
}

function syncDynamicPageNumbers(pages: PdfPageRef[]) {
    return pages.map((page, index) => ({
        ...page,
        placements: page.placements.map((item) =>
            item.kind === 'text' && item.dynamic === 'pageNumber'
                ? { ...item, text: `${index + 1} / ${pages.length}` }
                : item
        ),
    }))
}

function isUntouchedFormDocument(source: PdfSource, pages: PdfPageRef[]) {
    return (
        pages.length === source.pageCount &&
        pages.every(
            (page, index) =>
                page.sourceId === source.id &&
                page.sourceIndex === index &&
                page.rotation === 0 &&
                !page.crop &&
                page.placements.length === 0
        )
    )
}

export default function EditPDFPage() {
    const [tool, setTool] = useState<PdfTool | null>(null)
    const [sources, setSources] = useState<PdfSource[]>([])
    const [pages, setPages] = useState<PdfPageRef[]>([])
    const [thumbs, setThumbs] = useState<Record<string, PageThumb>>({})
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(false)
    const [exporting, setExporting] = useState(false)
    const [outputName, setOutputName] = useState('document')
    const [splitMode, setSplitMode] = useState<SplitMode>('ranges')
    const [rangeText, setRangeText] = useState('1-')
    const [everySize, setEverySize] = useState('2')
    const [editingPageId, setEditingPageId] = useState<string | null>(null)
    const [pageRender, setPageRender] = useState<PageRender | null>(null)
    const [imageFormat, setImageFormat] = useState<ImageFormat>('png')
    const [exportAsImages, setExportAsImages] = useState(false)
    const [imageScale, setImageScale] = useState<ImageScale>(2)
    const [compressionQuality, setCompressionQuality] = useState<CompressionQuality>('balanced')
    const [formFields, setFormFields] = useState<PdfFormField[]>([])
    const [formFlatten, setFormFlatten] = useState(false)
    const [selectionRangeText, setSelectionRangeText] = useState('')
    const [watermarkText, setWatermarkText] = useState('ฉบับร่าง')
    const [watermarkOpacity, setWatermarkOpacity] = useState('0.25')
    const [blankPageSize, setBlankPageSize] = useState<'a4' | 'a3' | 'letter'>('a4')
    const [blankPageLandscape, setBlankPageLandscape] = useState(false)
    const [cropPreset, setCropPreset] = useState('0.05')
    const [task, setTask] = useState<TaskState>({ kind: 'idle', label: '', done: 0, total: 0 })
    const [draftStatus, setDraftStatus] = useState<'idle' | 'checking' | 'saving' | 'saved' | 'error'>('idle')
    const [draftAvailable, setDraftAvailable] = useState<PdfDraft | null>(null)
    const [historyState, setHistoryState] = useState({ past: 0, future: 0 })
    const [movePosition, setMovePosition] = useState('1')
    const [hasChanges, setHasChanges] = useState(false)
    const [visiblePageIds, setVisiblePageIds] = useState<string[]>([])
    const [previewOutput, setPreviewOutput] = useState<PdfOutput | null>(null)
    const [lastOutput, setLastOutput] = useState<PdfOutput | null>(null)

    // pagesRef สะท้อนสถานะล่าสุดเสมอ ทำให้ dispatch หลายครั้งติดกันไม่อ่านค่าเก่า
    const pagesRef = useRef<PdfPageRef[]>([])
    const historyRef = useRef<HistoryEntry[]>([])
    const futureRef = useRef<HistoryEntry[]>([])
    const docsRef = useRef<Map<string, PDFDocumentProxy>>(new Map())
    const bytesRef = useRef<Map<string, ArrayBuffer>>(new Map())
    const sourcesRef = useRef<PdfSource[]>([])
    const lastSelectedRef = useRef<string | null>(null)
    const abortRef = useRef<AbortController | null>(null)
    const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const restoringDraftRef = useRef(false)
    const persistDraftNowRef = useRef<(() => Promise<void>) | null>(null)
    const thumbCacheRef = useRef<Record<string, PageThumb>>({})

    const sourceNames = useMemo(
        () => Object.fromEntries(sources.map((source) => [source.id, source.name])),
        [sources]
    )

    const canUndo = historyState.past > 0
    const canRedo = historyState.future > 0

    const commit = useCallback((next: PdfPageRef[]) => {
        const synced = syncDynamicPageNumbers(next)
        pagesRef.current = synced
        setPages(synced)
        setSelected((prev) => {
            const alive = new Set(synced.map((page) => page.id))
            return new Set([...prev].filter((id) => alive.has(id)))
        })
    }, [])

    const commitSources = useCallback((next: PdfSource[]) => {
        sourcesRef.current = next
        setSources(next)
    }, [])

    const markHistoryChanged = useCallback(() => {
        setHistoryState({ past: historyRef.current.length, future: futureRef.current.length })
        setHasChanges(true)
    }, [])

    /** ทุกการแก้ไขหน้าเดินผ่านที่นี่ที่เดียว undo/redo จึงครอบคลุมทุกคำสั่งโดยอัตโนมัติ */
    const dispatch = useCallback(
        (op: PdfOperation, nextSources: PdfSource[] = sourcesRef.current) => {
            historyRef.current.push({ pages: pagesRef.current, sources: sourcesRef.current })
            if (historyRef.current.length > HISTORY_LIMIT) historyRef.current.shift()
            futureRef.current = []
            const nextPages = applyOperation(pagesRef.current, op)
            commit(nextPages)
            commitSources(nextSources)
            markHistoryChanged()
            if (nextPages.length === 0) {
                setDraftAvailable(null)
                setDraftStatus('idle')
                void clearPdfDraft().catch(() => setDraftStatus('error'))
            }
        },
        [commit, commitSources, markHistoryChanged]
    )

    const undo = useCallback(() => {
        const previous = historyRef.current.pop()
        if (!previous) {
            toast.error('ไม่มีอะไรให้ย้อนกลับ')
            return
        }
        futureRef.current.push({ pages: pagesRef.current, sources: sourcesRef.current })
        commit(previous.pages)
        commitSources(previous.sources)
        setHistoryState({ past: historyRef.current.length, future: futureRef.current.length })
        setHasChanges(true)
    }, [commit, commitSources])

    const redo = useCallback(() => {
        const next = futureRef.current.pop()
        if (!next) {
            toast.error('ไม่มีอะไรให้ทำซ้ำ')
            return
        }
        historyRef.current.push({ pages: pagesRef.current, sources: sourcesRef.current })
        commit(next.pages)
        commitSources(next.sources)
        setHistoryState({ past: historyRef.current.length, future: futureRef.current.length })
        setHasChanges(true)
    }, [commit, commitSources])

    const renderThumbsFor = useCallback(async (doc: PDFDocumentProxy, refs: PdfPageRef[], signal?: AbortSignal) => {
        for (const ref of refs) {
            if (signal?.aborted) return
            const key = thumbKey(ref)
            if (thumbCacheRef.current[key]) continue
            try {
                const bytes = bytesRef.current.get(ref.sourceId)
                if (!bytes) continue
                const thumb = await renderEditedThumbnail(doc, ref, bytes)
                if (signal?.aborted) return
                thumbCacheRef.current[key] = thumb
                const cachedKeys = Object.keys(thumbCacheRef.current)
                for (const staleKey of cachedKeys.slice(0, Math.max(0, cachedKeys.length - 120))) delete thumbCacheRef.current[staleKey]
                setThumbs({ ...thumbCacheRef.current })
            } catch (error) {
                // หน้าที่เรนเดอร์ไม่ได้จะแสดงเป็น placeholder แต่ยังแก้ไขและ export ได้ตามปกติ
                console.warn('render thumbnail failed', ref.sourceIndex, error)
            }
        }
    }, [])

    useEffect(() => {
        if (editingPageId) return
        const controller = new AbortController()
        const timer = setTimeout(() => { void (async () => {
            for (const ref of pages.filter((page) => visiblePageIds.includes(page.id))) {
                const doc = docsRef.current.get(ref.sourceId)
                if (doc) await renderThumbsFor(doc, [ref], controller.signal)
                if (controller.signal.aborted) break
            }
        })() }, 180)
        return () => { clearTimeout(timer); controller.abort() }
    }, [pages, visiblePageIds, renderThumbsFor, editingPageId])

    const addFiles = useCallback(
        async (incoming: File[]) => {
            abortRef.current?.abort()
            const controller = new AbortController()
            abortRef.current = controller
            setLoading(true)
            setTask({ kind: 'loading', label: 'กำลังเปิดไฟล์', done: 0, total: incoming.length })
            try {
                // รูปถูกประกอบเป็น PDF ก่อน แล้วไหลเข้าไปป์ไลน์เดียวกับไฟล์ PDF ปกติ
                const images = incoming.filter((file) => IMAGE_PATTERN.test(file.name))
                const files = incoming.filter((file) => !IMAGE_PATTERN.test(file.name))

                if (images.length > 0) {
                    try {
                        const { bytes, skipped } = await pdfFromImages(images)
                        if (skipped.length) toast.error(`ใช้รูปไม่ได้ ${skipped.length} ไฟล์`)
                        const name = images.length === 1 ? images[0].name.replace(IMAGE_PATTERN, '.pdf') : 'images.pdf'
                        files.push(new File([bytes as BlobPart], name, { type: 'application/pdf' }))
                    } catch (error) {
                        toast.error(error instanceof Error ? error.message : 'แปลงรูปเป็น PDF ไม่สำเร็จ')
                    }
                }

                if (tool === 'form' && (sourcesRef.current.length > 0 || files.length !== 1)) {
                    toast.error('โหมดกรอกฟอร์มรองรับครั้งละ 1 ไฟล์ PDF ที่มี AcroForm')
                    return
                }

                for (const file of files) {
                    if (controller.signal.aborted) throw new DOMException('ยกเลิกแล้ว', 'AbortError')
                    if (file.size > LARGE_FILE_BYTES) {
                        toast.warning(`${file.name} มีขนาด ${formatBytes(file.size)} อาจทำงานช้าในเบราว์เซอร์`)
                    }
                    try {
                        const loaded = await loadPdfSource(file)
                        if (controller.signal.aborted) {
                            destroyPdfDoc(loaded.doc)
                            throw new DOMException('ยกเลิกแล้ว', 'AbortError')
                        }
                        docsRef.current.set(loaded.source.id, loaded.doc)
                        bytesRef.current.set(loaded.source.id, loaded.bytes)
                        dispatch({ kind: 'append', pages: loaded.pages }, [...sourcesRef.current, loaded.source])
                        if (pagesRef.current.length === loaded.pages.length) {
                            setOutputName(stripPdfExtension(file.name))
                        }
                        toast.success(`เพิ่ม ${file.name} แล้ว (${loaded.source.pageCount} หน้า)`)
                        setTask((current) => (current.kind === 'loading' ? { ...current, done: current.done + 1, total: Math.max(current.total, files.length) } : current))
                    } catch (error) {
                        if (error instanceof DOMException && error.name === 'AbortError') throw error
                        if (error instanceof EncryptedPdfError) {
                            toast.error(`${file.name} ถูกล็อกด้วยรหัสผ่าน ยังเปิดไม่ได้ในเวอร์ชันนี้`)
                        } else {
                            toast.error(`เปิด ${file.name} ไม่สำเร็จ`)
                        }
                    }
                }
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') {
                    toast.info('ยกเลิกการเปิดไฟล์แล้ว')
                } else {
                    toast.error(error instanceof Error ? error.message : 'เปิดไฟล์ไม่สำเร็จ')
                }
            } finally {
                if (abortRef.current === controller) {
                    setLoading(false)
                    setTask({ kind: 'idle', label: '', done: 0, total: 0 })
                    abortRef.current = null
                }
            }
        },
        [dispatch, renderThumbsFor, tool]
    )

    const removeSource = useCallback(
        (sourceId: string) => {
            const remaining = pagesRef.current.filter((page) => page.sourceId === sourceId).map((page) => page.id)
            const nextSources = sourcesRef.current.filter((source) => source.id !== sourceId)
            if (remaining.length) dispatch({ kind: 'delete', pageIds: remaining }, nextSources)
            else commitSources(nextSources)
        },
        [commitSources, dispatch]
    )

    const updateFormValue = useCallback(
        (fieldName: string, value: PdfFormValue) => {
            const source = sourcesRef.current.find((candidate) => candidate.id === pagesRef.current[0]?.sourceId)
            if (!source) return
            const currentValue = source.formValues?.[fieldName]
            if (JSON.stringify(currentValue) === JSON.stringify(value)) return
            historyRef.current.push({ pages: pagesRef.current, sources: sourcesRef.current })
            if (historyRef.current.length > HISTORY_LIMIT) historyRef.current.shift()
            futureRef.current = []
            commitSources(
                sourcesRef.current.map((candidate) =>
                    candidate.id === source.id
                        ? { ...candidate, formValues: { ...(candidate.formValues ?? {}), [fieldName]: value } }
                        : candidate
                )
            )
            markHistoryChanged()
        },
        [commitSources, markHistoryChanged]
    )

    const resetFormValues = useCallback(() => {
        const source = sourcesRef.current.find((candidate) => candidate.id === pagesRef.current[0]?.sourceId)
        if (!source || !source.formValues || Object.keys(source.formValues).length === 0) {
            toast.info('ฟอร์มยังไม่มีค่าที่แก้ไข')
            return
        }
        historyRef.current.push({ pages: pagesRef.current, sources: sourcesRef.current })
        if (historyRef.current.length > HISTORY_LIMIT) historyRef.current.shift()
        futureRef.current = []
        commitSources(
            sourcesRef.current.map((candidate) => {
                if (candidate.id !== source.id) return candidate
                const { formValues: _formValues, ...withoutValues } = candidate
                return withoutValues
            })
        )
        markHistoryChanged()
        toast.success('รีเซ็ตค่าฟอร์มแล้ว')
    }, [commitSources, markHistoryChanged])

    const addBlankPage = useCallback(async () => {
        const controller = new AbortController()
        abortRef.current?.abort()
        abortRef.current = controller
        setLoading(true)
        setTask({ kind: 'loading', label: 'กำลังเพิ่มหน้าว่าง', done: 0, total: 1 })
        try {
            const bytes = await pdfFromBlankPage(blankPageSize, blankPageLandscape)
            if (controller.signal.aborted) throw new DOMException('ยกเลิกแล้ว', 'AbortError')
            const loaded = await loadPdfSource(new File([bytes as BlobPart], `blank-${blankPageSize}.pdf`, { type: 'application/pdf' }))
            if (controller.signal.aborted) {
                destroyPdfDoc(loaded.doc)
                throw new DOMException('ยกเลิกแล้ว', 'AbortError')
            }
            docsRef.current.set(loaded.source.id, loaded.doc)
            bytesRef.current.set(loaded.source.id, loaded.bytes)
            dispatch({ kind: 'append', pages: loaded.pages }, [...sourcesRef.current, loaded.source])
            void renderThumbsFor(loaded.doc, loaded.pages, controller.signal)
            toast.success('เพิ่มหน้าว่างแล้ว')
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') toast.info('ยกเลิกการเพิ่มหน้าว่างแล้ว')
            else toast.error(error instanceof Error ? error.message : 'เพิ่มหน้าว่างไม่สำเร็จ')
        } finally {
            setLoading(false)
            setTask({ kind: 'idle', label: '', done: 0, total: 0 })
            if (abortRef.current === controller) abortRef.current = null
        }
    }, [blankPageLandscape, blankPageSize, dispatch, renderThumbsFor])

    const selectPage = useCallback((pageId: string, additive: boolean) => {
        setSelected((prev) => {
            const next = new Set(prev)
            if (additive) {
                // ลากช่วง: เลือกตั้งแต่หน้าที่คลิกก่อนหน้าถึงหน้าปัจจุบัน
                const from = pagesRef.current.findIndex((page) => page.id === lastSelectedRef.current)
                const to = pagesRef.current.findIndex((page) => page.id === pageId)
                if (from !== -1 && to !== -1) {
                    const [start, end] = from < to ? [from, to] : [to, from]
                    for (let index = start; index <= end; index += 1) next.add(pagesRef.current[index].id)
                    return next
                }
            }
            if (next.has(pageId)) next.delete(pageId)
            else next.add(pageId)
            return next
        })
        lastSelectedRef.current = pageId
    }, [])

    const selectedIds = useMemo(() => [...selected], [selected])
    const targetIds = useCallback(
        () => (selectedIds.length ? selectedIds : pagesRef.current.map((page) => page.id)),
        [selectedIds]
    )

    const selectPageRange = useCallback(() => {
        try {
            const indexes = parsePageRanges(selectionRangeText, pagesRef.current.length)
            setSelected(new Set(indexes.map((index) => pagesRef.current[index].id)))
            toast.success(`เลือกแล้ว ${indexes.length} หน้า`)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'ช่วงหน้าไม่ถูกต้อง')
        }
    }, [selectionRangeText])

    const addWatermark = useCallback(() => {
        const text = watermarkText.trim()
        if (!text) {
            toast.error('ระบุข้อความลายน้ำก่อน')
            return
        }
        const ids = targetIds()
        dispatch({
            kind: 'batch',
            operations: ids.map((pageId) => ({
                kind: 'addPlacement' as const,
                pageId,
                placement: {
                    id: crypto.randomUUID(),
                    kind: 'text' as const,
                    x: 0.05,
                    y: 0.45,
                    w: 0.9,
                    text,
                    fontSize: 34,
                    color: '#666666',
                    opacity: Math.min(1, Math.max(0.05, Number(watermarkOpacity) || 0.25)),
                    align: 'center' as const,
                    rotate: -25,
                },
            })),
        })
        toast.success(`ใส่ลายน้ำแล้ว ${ids.length} หน้า`)
    }, [dispatch, targetIds, watermarkOpacity, watermarkText])

    const addPageNumbers = useCallback(() => {
        const ids = targetIds()
        const total = pagesRef.current.length
        dispatch({
            kind: 'batch',
            operations: ids.flatMap((pageId): PdfOperation[] => {
                const pageNumber = pagesRef.current.findIndex((page) => page.id === pageId) + 1
                const page = pagesRef.current.find((page) => page.id === pageId)
                const existing = page?.placements.filter((item) => item.kind === 'text' && item.dynamic === 'pageNumber') ?? []
                return [...existing.map((item): PdfOperation => ({ kind: 'removePlacement', pageId, placementId: item.id })), {
                    kind: 'addPlacement' as const,
                    pageId,
                    placement: {
                        id: crypto.randomUUID(),
                        kind: 'text' as const,
                        ...pageNumberPosition(page?.crop),
                        text: `${pageNumber} / ${total}`,
                        fontSize: 10,
                        color: '#666666',
                        align: 'center' as const,
                        dynamic: 'pageNumber' as const,
                    },
                }]
            }),
        })
        toast.success(`เพิ่มเลขหน้าแล้ว ${ids.length} หน้า`)
    }, [dispatch, targetIds])

    const applyCropPreset = useCallback(() => {
        const margin = Math.min(0.45, Math.max(0, Number(cropPreset) || 0))
        const crop: PageCrop | null = margin === 0 ? null : { top: margin, right: margin, bottom: margin, left: margin }
        const ids = targetIds()
        dispatch({ kind: 'setCrop', pageIds: ids, crop })
        toast.success(margin ? `ตัดขอบแล้ว ${ids.length} หน้า` : `รีเซ็ตการตัดขอบแล้ว ${ids.length} หน้า`)
    }, [cropPreset, dispatch, targetIds])

    const clearDocument = useCallback((force = false) => {
        if (!force && hasChanges && !window.confirm('มีการแก้ไขที่ยังไม่ได้ส่งออก ต้องการเริ่มเอกสารใหม่หรือไม่?')) return
        abortRef.current?.abort()
        if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
        docsRef.current.forEach(destroyPdfDoc)
        docsRef.current.clear()
        bytesRef.current.clear()
        historyRef.current = []
        futureRef.current = []
        pagesRef.current = []
        sourcesRef.current = []
        setPages([])
        setSources([])
        setOutputName('document')
        setSplitMode('ranges')
        setRangeText('1-')
        setEverySize('2')
        setImageFormat('png')
        setExportAsImages(false)
        setCompressionQuality('balanced')
        setImageScale(2)
        setFormFields([])
        setFormFlatten(false)
        setWatermarkText('ฉบับร่าง')
        setWatermarkOpacity('0.25')
        setCropPreset('0.05')
        setThumbs({})
        thumbCacheRef.current = {}
        setLastOutput(null)
        setPreviewOutput(null)
        setSelected(new Set())
        setEditingPageId(null)
        setPageRender(null)
        setTask({ kind: 'idle', label: '', done: 0, total: 0 })
        setHasChanges(false)
        setDraftStatus('idle')
        setHistoryState({ past: historyRef.current.length, future: futureRef.current.length })
        void clearPdfDraft().catch(() => undefined)
    }, [hasChanges])

    const persistDraftNow = useCallback(async () => {
        if (!pagesRef.current.length || restoringDraftRef.current) return
        const draftSources = sourcesRef.current.flatMap((source) => {
            const bytes = bytesRef.current.get(source.id)
            return bytes ? [{ ...source, bytes }] : []
        })
        setDraftStatus('saving')
        try {
            await savePdfDraft({
                tool,
                outputName,
                splitMode,
                rangeText,
                everySize,
                imageFormat,
                exportAsImages,
                compressionQuality,
                imageScale,
                formFlatten,
                sources: draftSources,
                pages: pagesRef.current,
            })
            setDraftStatus('saved')
        } catch {
            setDraftStatus('error')
        }
    }, [compressionQuality, everySize, exportAsImages, formFlatten, imageFormat, imageScale, outputName, rangeText, splitMode, tool])

    persistDraftNowRef.current = persistDraftNow

    useEffect(() => {
        return () => {
            if (pagesRef.current.length) void persistDraftNowRef.current?.()
        }
    }, [])

    const goBackToTools = useCallback(() => {
        void persistDraftNow()
        setEditingPageId(null)
        setTool(null)
    }, [persistDraftNow])

    const cancelTask = useCallback(() => {
        abortRef.current?.abort()
    }, [])

    const startNewDocument = useCallback(() => {
        if (draftAvailable && !pagesRef.current.length) {
            if (!window.confirm('ลบฉบับร่างที่บันทึกไว้และเริ่มเอกสารใหม่หรือไม่?')) return
            void clearPdfDraft().catch(() => undefined)
            setDraftAvailable(null)
            setDraftStatus('idle')
            return
        }
        if (hasChanges && !window.confirm('มีการแก้ไขที่ยังไม่ได้ส่งออก ต้องการเริ่มเอกสารใหม่หรือไม่?')) return
        clearDocument(true)
        setDraftAvailable(null)
        setTool(null)
    }, [clearDocument, draftAvailable, hasChanges])

    const editingIndex = pages.findIndex((page) => page.id === editingPageId)
    const editingPage = editingIndex === -1 ? null : pages[editingIndex]

    // เตรียมภาพความละเอียดสูงเมื่อเปิดหน้าใดหน้าหนึ่งเพื่อวางของ
    // ผูกกับหน้าต้นทางเท่านั้น การขยับของที่วางอยู่จึงไม่สั่งเรนเดอร์ใหม่
    const editingSourceId = editingPage?.sourceId
    const editingSourceIndex = editingPage?.sourceIndex

    useEffect(() => {
        if (!editingSourceId || editingSourceIndex === undefined) {
            setPageRender(null)
            return
        }
        const doc = docsRef.current.get(editingSourceId)
        if (!doc) return

        let cancelled = false
        setPageRender(null)
        renderPageImage(doc, editingSourceIndex)
            .then((result) => {
                if (!cancelled) setPageRender(result)
            })
            .catch(() => {
                if (!cancelled) toast.error('เตรียมภาพหน้านี้ไม่สำเร็จ')
            })

        return () => {
            cancelled = true
        }
    }, [editingSourceId, editingSourceIndex])

    useEffect(() => {
        const docs = docsRef.current
        return () => {
            abortRef.current?.abort()
            docs.forEach(destroyPdfDoc)
            docs.clear()
        }
    }, [])

    const restoreDraft = useCallback(async (draft: PdfDraft) => {
        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller
        restoringDraftRef.current = true
        setLoading(true)
        setTask({ kind: 'loading', label: 'กำลังกู้คืนฉบับร่าง', done: 0, total: draft.sources.length })
        const restoredDocIds: string[] = []
        try {
            const sourceIdMap = new Map<string, string>()
            const restoredSources: PdfSource[] = []

            for (const savedSource of draft.sources) {
                if (controller.signal.aborted) throw new DOMException('ยกเลิกแล้ว', 'AbortError')
                const file = new File([savedSource.bytes], savedSource.name, { type: 'application/pdf' })
                const loaded = await loadPdfSource(file)
                if (controller.signal.aborted) {
                    destroyPdfDoc(loaded.doc)
                    throw new DOMException('ยกเลิกแล้ว', 'AbortError')
                }
                docsRef.current.set(loaded.source.id, loaded.doc)
                bytesRef.current.set(loaded.source.id, loaded.bytes)
                restoredDocIds.push(loaded.source.id)
                sourceIdMap.set(savedSource.id, loaded.source.id)
                restoredSources.push({
                    ...loaded.source,
                    size: savedSource.size,
                    pageCount: savedSource.pageCount,
                    formValues: savedSource.formValues,
                })
                setTask((current) => ({ ...current, done: current.done + 1 }))
            }

            const restoredPages = syncDynamicPageNumbers(
                draft.pages
                .map((page) => {
                    const sourceId = sourceIdMap.get(page.sourceId)
                    return sourceId ? { ...page, sourceId, placements: page.placements.map((item) => ({ ...item })) } : null
                })
                .filter((page): page is PdfPageRef => Boolean(page))
            )

            pagesRef.current = restoredPages
            sourcesRef.current = restoredSources
            setPages(restoredPages)
            setSources(restoredSources)
            setSelected(new Set())
            setOutputName(draft.outputName || 'document')
            setSplitMode(draft.splitMode as SplitMode)
            setRangeText(draft.rangeText || '1-')
            setEverySize(draft.everySize || '2')
            setImageFormat(draft.imageFormat as ImageFormat)
            setExportAsImages(Boolean(draft.exportAsImages))
            setCompressionQuality((draft.compressionQuality as CompressionQuality) || 'balanced')
            setImageScale(([1, 2, 4] as ImageScale[]).includes(draft.imageScale as ImageScale) ? (draft.imageScale as ImageScale) : 2)
            setFormFlatten(Boolean(draft.formFlatten))
            setTool(draft.tool)
            historyRef.current = []
            futureRef.current = []
            setHistoryState({ past: historyRef.current.length, future: futureRef.current.length })
            setHasChanges(true)
            setDraftAvailable(null)
            setDraftStatus('saved')
            void Promise.all(
                restoredSources.map(async (source) => {
                    const doc = docsRef.current.get(source.id)
                    const refs = restoredPages.filter((page) => page.sourceId === source.id)
                    if (doc && refs.length) await renderThumbsFor(doc, refs.slice(0, 24))
                })
            )
            toast.success('กู้คืนงานที่บันทึกไว้แล้ว')
        } catch (error) {
            restoredDocIds.forEach((sourceId) => {
                const doc = docsRef.current.get(sourceId)
                if (doc) destroyPdfDoc(doc)
                docsRef.current.delete(sourceId)
                bytesRef.current.delete(sourceId)
            })
            if (error instanceof DOMException && error.name === 'AbortError') toast.info('ยกเลิกการกู้คืนฉบับร่างแล้ว')
            else toast.error(error instanceof Error ? error.message : 'กู้คืนฉบับร่างไม่สำเร็จ')
            setDraftStatus('error')
        } finally {
            restoringDraftRef.current = false
            setLoading(false)
            setTask({ kind: 'idle', label: '', done: 0, total: 0 })
            if (abortRef.current === controller) abortRef.current = null
        }
    }, [renderThumbsFor])

    useEffect(() => {
        let active = true
        setDraftStatus('checking')
        void loadPdfDraft()
            .then((draft) => {
                if (!active) return
                setDraftAvailable(hasPdfDraftContent(draft) ? draft : null)
                setDraftStatus('idle')
            })
            .catch(() => {
                if (active) setDraftStatus('error')
            })
        return () => {
            active = false
        }
    }, [])

    const formSourceId = tool === 'form' && sources.length === 1 ? sources[0].id : null

    useEffect(() => {
        let active = true
        setFormFields([])
        if (!formSourceId) return () => {
            active = false
        }
        const bytes = bytesRef.current.get(formSourceId)
        if (!bytes) return () => {
            active = false
        }
        void inspectPdfForm(bytes)
            .then((fields) => {
                if (active) setFormFields(fields)
            })
            .catch(() => {
                if (active) toast.error('อ่านช่องฟอร์ม PDF ไม่สำเร็จ')
            })
        return () => {
            active = false
        }
    }, [formSourceId])

    useEffect(() => {
        if (!pages.length || restoringDraftRef.current) return
        if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
        draftTimerRef.current = setTimeout(() => void persistDraftNow(), 700)
        return () => {
            if (draftTimerRef.current) {
                clearTimeout(draftTimerRef.current)
                draftTimerRef.current = null
            }
        }
    }, [pages, persistDraftNow, sources])

    useEffect(() => {
        const onBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!hasChanges || !pagesRef.current.length) return
            event.preventDefault()
            event.returnValue = ''
        }
        window.addEventListener('beforeunload', onBeforeUnload)
        return () => window.removeEventListener('beforeunload', onBeforeUnload)
    }, [hasChanges])

    useEffect(() => {
        const onPageHide = () => {
            if (pagesRef.current.length) void persistDraftNow()
        }
        window.addEventListener('pagehide', onPageHide)
        return () => window.removeEventListener('pagehide', onPageHide)
    }, [persistDraftNow])

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null
            if (target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)) return
            if (editingPageId || loading || exporting) return
            if (!pagesRef.current.length) return
            if (tool === 'form') return

            const ctrl = event.ctrlKey || event.metaKey
            if (ctrl && event.key.toLowerCase() === 'z') {
                event.preventDefault()
                if (event.shiftKey) redo()
                else undo()
            } else if (ctrl && event.key.toLowerCase() === 'y') {
                event.preventDefault()
                redo()
            } else if (ctrl && event.key.toLowerCase() === 'a') {
                event.preventDefault()
                setSelected(new Set(pagesRef.current.map((page) => page.id)))
            } else if (event.key === 'Delete' || event.key === 'Backspace') {
                const ids = [...selected]
                if (!ids.length) return
                event.preventDefault()
                dispatch({ kind: 'delete', pageIds: ids })
            }
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [dispatch, redo, selected, tool, undo, editingPageId, loading, exporting])

    const splitGroups = useCallback((): Array<{ name: string; pages: PdfPageRef[] }> => {
        const result = planPdfSplit(pagesRef.current, splitMode, rangeText, everySize, selected, outputName)
        if (result.error) throw new Error(result.error)
        return result.groups
    }, [everySize, outputName, rangeText, selected, splitMode])

    const handleExport = useCallback(async (previewOnly = false) => {
        if (loading || exporting) return
        if (!pagesRef.current.length) {
            toast.error('ยังไม่มีหน้าให้บันทึก')
            return
        }
        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller
        const exportPages = pagesRef.current.slice()
        setExporting(true)
        setTask({ kind: 'exporting', label: 'กำลังสร้างไฟล์', done: 0, total: exportPages.length })
        try {
            const ensureExportActive = () => {
                if (controller.signal.aborted) throw new DOMException('ยกเลิกแล้ว', 'AbortError')
            }
            const base = stripPdfExtension(outputName || 'document')
            const deliver = (data: Uint8Array | Blob, name: string, description?: string) => {
                const blob = data instanceof Blob ? data : new Blob([data.slice().buffer], { type: 'application/pdf' })
                const output = { blob, name, description }
                if (previewOnly) setPreviewOutput(output)
                else {
                    downloadBlob(blob, name)
                    setLastOutput(output)
                    if (tool !== 'split') setHasChanges(false)
                }
            }

            if (tool === 'form') {
                if (sourcesRef.current.length !== 1) throw new Error('โหมดกรอกฟอร์มรองรับไฟล์เดียวเท่านั้น')
                const source = sourcesRef.current[0]
                if (!isUntouchedFormDocument(source, exportPages)) {
                    throw new Error('โหมดกรอกฟอร์มต้องใช้เอกสารต้นฉบับที่ยังไม่ได้จัดหน้า หมุน ครอป หรือติดข้อความ')
                }
                const sourceBytes = bytesRef.current.get(source.id)
                if (!sourceBytes) throw new Error('ไม่พบไฟล์ต้นฉบับของฟอร์ม')
                const formTexts = Object.values(source.formValues ?? {}).filter((value): value is string => typeof value === 'string')
                // updateFieldAppearances อาจสร้าง appearance ใหม่ให้ทุก text field
                // จึงโหลดฟอนต์ไทยแม้ผู้ใช้จะแก้เฉพาะ checkbox เพื่อไม่ทำลายค่าไทยเดิม
                const fontBytes = await loadThaiFont()
                if (!fontBytes && formTexts.some(hasThaiCharacters)) {
                    throw new Error('โหลดฟอนต์ไทยไม่สำเร็จ กรุณาลองใหม่ก่อนส่งออก')
                }
                const formBytes = await buildFormPdf(sourceBytes, source.formValues ?? {}, { fontBytes, flatten: formFlatten })
                ensureExportActive()
                deliver(formBytes, `${base}-form.pdf`)
                if (!previewOnly) toast.success(formFlatten ? 'บันทึกฟอร์มแบบรวมเป็นหน้าแล้ว' : 'บันทึกฟอร์มที่กรอกแล้ว')
                return
            }

            const editedFormSources = sourcesRef.current.filter((source) => Object.keys(source.formValues ?? {}).length > 0)
            if (editedFormSources.length > 0) {
                throw new Error('มีค่าฟอร์มที่แก้ไว้ กรุณาบันทึกจากเมนูกรอกฟอร์มก่อนเปลี่ยนโหมด')
            }

            if (tool === 'compress') {
                const compressed = await buildCompressedPdf(exportPages, docsRef.current, {
                    quality: compressionQuality,
                    signal: controller.signal,
                    onProgress: (done, total) => setTask({ kind: 'exporting', label: 'กำลังบีบอัดไฟล์', done, total }),
                })
                ensureExportActive()
                const originalSize = sourcesRef.current.filter((source) => exportPages.some((page) => page.sourceId === source.id)).reduce((sum, source) => sum + source.size, 0)
                const difference = originalSize ? Math.round((1 - compressed.byteLength / originalSize) * 100) : 0
                const description = difference > 0 ? `เล็กลง ${difference}% จากไฟล์ต้นทาง` : 'ไฟล์นี้ไม่เล็กลง ลองระดับขนาดเล็ก หรือใช้ PDF ปกติ'
                deliver(compressed, `${base}-compressed.pdf`, description)
                if (!previewOnly) toast.success(`สร้างไฟล์แล้ว · ${description}`)
                return
            }

            if (tool === 'convert' && exportAsImages) {
                const extension = imageFormat === 'png' ? 'png' : 'jpg'
                const entries: Array<{ name: string; blob: Blob }> = []
                for (const [index, ref] of (previewOnly ? exportPages.slice(0, 1) : exportPages).entries()) {
                    if (controller.signal.aborted) throw new DOMException('ยกเลิกแล้ว', 'AbortError')
                    const doc = docsRef.current.get(ref.sourceId)
                    if (!doc) throw new Error(`ไม่พบไฟล์ต้นทางของหน้า ${index + 1}`)
                    entries.push({
                        name: `${base}-page-${index + 1}.${extension}`,
                        blob: await renderPageToImageBlob(doc, ref, imageFormat, imageScale, imageFormat === 'jpeg' ? 0.9 : 1),
                    })
                    setTask((current) => ({ ...current, done: index + 1, total: exportPages.length }))
                }
                if (!entries.length) throw new Error('สร้างรูปไม่สำเร็จ')
                ensureExportActive()
                if (entries.length === 1) {
                    deliver(entries[0].blob, entries[0].name, previewOnly && exportPages.length > 1 ? `ตัวอย่างรูปแรกจากทั้งหมด ${exportPages.length} รูป` : undefined)
                } else {
                    const zip = await zipBlobs(entries)
                    ensureExportActive()
                    deliver(zip, `${base}-images.zip`)
                }
                if (!previewOnly) toast.success(`ส่งออกเป็นรูปแล้ว ${entries.length} ไฟล์`)
                return
            }

            // ฝังฟอนต์ไทยเฉพาะตอนที่มีข้อความจริง ๆ เพื่อไม่ให้ไฟล์บวมโดยไม่จำเป็น
            const texts = exportPages.flatMap((page) =>
                page.placements
                    .filter((item) => item.kind === 'text' || item.kind === 'note')
                    .map((item) => item.text)
            )
            let fontBytes: ArrayBuffer | null = null
            if (texts.length > 0) {
                fontBytes = await loadThaiFont()
                if (!fontBytes && texts.some(hasThaiCharacters)) {
                    throw new Error('โหลดฟอนต์ไทยไม่สำเร็จ กรุณาลองใหม่ก่อนส่งออก')
                }
            }
            const options = {
                fontBytes,
                signal: controller.signal,
                onProgress: (done: number, total: number) => setTask({ kind: 'exporting', label: 'กำลังสร้างไฟล์', done, total }),
            }

            if (tool === 'split') {
                const formSources = []
                for (const source of sourcesRef.current) {
                    const bytes = bytesRef.current.get(source.id)
                    if (!bytes) continue
                    ensureExportActive()
                    const fields = await inspectPdfForm(bytes)
                    if (fields.length > 0) formSources.push(source.name)
                }
                if (formSources.length > 0) {
                    throw new Error('เอกสารมี AcroForm กรุณาใช้เมนูกรอกฟอร์มก่อนแยกไฟล์ เพื่อไม่ให้ช่องกรอกหาย')
                }
                const groups = splitGroups()
                if (!groups.length) {
                    toast.error(splitMode === 'selection' ? 'ยังไม่ได้เลือกหน้า' : 'ช่วงหน้าที่ระบุไม่ตรงกับหน้าใดเลย')
                    return
                }
                if (groups.length === 1 || previewOnly) {
                    const bytes = await buildPdf(groups[0].pages, bytesRef.current, options)
                    ensureExportActive()
                    deliver(bytes, groups[0].name, previewOnly && groups.length > 1 ? `ตัวอย่างไฟล์แรกจากทั้งหมด ${groups.length} ไฟล์` : undefined)
                    if (!previewOnly) toast.success(`บันทึกแล้ว ${groups[0].pages.length} หน้า`)
                    return
                }
                const zip = await buildZip(groups, bytesRef.current, options)
                ensureExportActive()
                deliver(zip, `${base}-split.zip`)
                toast.success(`แยกเป็น ${groups.length} ไฟล์แล้ว`)
                return
            }

            const formSources = []
            for (const source of sourcesRef.current) {
                const sourceBytes = bytesRef.current.get(source.id)
                if (!sourceBytes) continue
                ensureExportActive()
                const fields = await inspectPdfForm(sourceBytes)
                if (fields.length > 0) formSources.push(source.name)
            }
            if (formSources.length > 0) {
                throw new Error('เอกสารมี AcroForm กรุณาใช้เมนูกรอกฟอร์มก่อนส่งออก เพื่อไม่ให้ช่องกรอกหรือค่าที่กรอกหาย')
            }
            const bytes = await buildPdf(exportPages, bytesRef.current, options)
            ensureExportActive()
            deliver(bytes, `${base}.pdf`)
            if (!previewOnly) toast.success(`บันทึกแล้ว ${exportPages.length} หน้า`)
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') toast.info('ยกเลิกการสร้างไฟล์แล้ว')
            else toast.error(error instanceof Error ? error.message : 'บันทึกไฟล์ไม่สำเร็จ')
        } finally {
            setExporting(false)
            setTask({ kind: 'idle', label: '', done: 0, total: 0 })
            if (abortRef.current === controller) abortRef.current = null
        }
    }, [compressionQuality, exportAsImages, formFlatten, imageFormat, imageScale, outputName, splitGroups, splitMode, tool, loading, exporting])

    if (!tool) {
        return (
            <div className="mx-auto w-full max-w-[1600px] p-6 lg:p-8 space-y-8">
                <PageHeader
                    eyebrow="Programs & Tools"
                    title="Edit PDF"
                    description="เครื่องมือสำหรับแก้ไข รวมไฟล์ จัดหน้า และแปลงเอกสาร PDF อย่างปลอดภัยบนเครื่องของคุณ"
                />

                <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-8">
                    <div className="mb-5 space-y-2"><h2 className="text-xl font-semibold">เปิดไฟล์ แล้วเริ่มแก้ไขได้ทันที</h2><p className="text-sm text-muted-foreground">จัดหน้า เพิ่มข้อความ เซ็นชื่อ แล้วตรวจไฟล์ก่อนดาวน์โหลด · PDF และรูป JPG/PNG</p></div>
                    <PdfDropzone withImages busy={loading} onFiles={(files) => { setTool('organize'); void addFiles(files) }} hint="เลือกหลายไฟล์ได้ เอกสารของคุณจะรวมอยู่ในพื้นที่ทำงานเดียวกัน" />
                    <div className="mt-4 flex flex-wrap items-center gap-3"><span className="text-xs text-muted-foreground">หรือเริ่มเขียนเอกสารใหม่</span><Button variant="outline" size="sm" disabled={loading} onClick={() => { setTool('edit'); void addBlankPage() }} className="gap-2"><Plus className="h-4 w-4" />สร้าง PDF เปล่า A4</Button></div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-card p-4 text-sm text-muted-foreground">
                    <div className="rounded-full bg-primary/10 p-2 text-primary">
                        <Lock className="h-4 w-4 shrink-0" />
                    </div>
                    <span>ไฟล์ทั้งหมดถูกประมวลผลบนเบราว์เซอร์ในเครื่องของคุณโดยตรง ไม่มีการส่งไฟล์ขึ้นเซิร์ฟเวอร์ภายนอก</span>
                </div>

                {(draftAvailable || pages.length > 0) && (
                    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
                        <div className="rounded-full bg-primary/10 p-2 text-primary">
                            {draftAvailable ? <Save className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground">
                                {draftAvailable ? 'มีงานที่บันทึกไว้ในเครื่อง' : `${pages.length} หน้าอยู่ในเอกสารปัจจุบัน`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {draftAvailable
                                    ? `${draftAvailable.pages.length} หน้า · บันทึกเมื่อ ${new Date(draftAvailable.savedAt).toLocaleString('th-TH')}`
                                    : 'เลือกเครื่องมืออื่นต่อได้โดยไม่ต้องเปิดไฟล์ใหม่'}
                            </p>
                        </div>
                        {draftAvailable && (
                            <Button size="sm" onClick={() => void restoreDraft(draftAvailable)} className="gap-2">
                                <Save className="h-4 w-4" />
                                ทำงานต่อ
                            </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={startNewDocument} className="gap-2">
                            <Plus className="h-4 w-4" />
                            เริ่มเอกสารใหม่
                        </Button>
                    </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {TOOLS.map((item) => (
                        <PdfToolCard
                            key={item.id}
                            icon={item.icon}
                            title={item.title}
                            description={item.description}
                            onClick={() => setTool(item.id)}
                        />
                    ))}
                </div>
            </div>
        )
    }


    const activeTool = TOOLS.find((item) => item.id === tool)!
    const hasPages = pages.length > 0
    const splitPlan = planPdfSplit(pages, splitMode, rangeText, everySize, selected, outputName)
    const previewGroups = tool === 'split' && hasPages ? splitPlan.groups : []

    if (editingPage) {
        return (
            <>
            <PdfOutputPreview output={previewOutput} onClose={() => setPreviewOutput(null)} />
            <PdfPageEditor
                page={editingPage}
                render={pageRender}
                pageNumber={editingIndex + 1}
                totalPages={pages.length}
                canGoPrev={editingIndex > 0}
                canGoNext={editingIndex < pages.length - 1}
                onPrev={() => setEditingPageId(pages[editingIndex - 1]?.id ?? null)}
                onNext={() => setEditingPageId(pages[editingIndex + 1]?.id ?? null)}
                onJump={(pageNumber) => setEditingPageId(pages[pageNumber - 1]?.id ?? editingPageId)}
                onClose={() => setEditingPageId(null)}
                onUndo={undo}
                onRedo={redo}
                canUndo={canUndo && !exporting}
                canRedo={canRedo && !exporting}
                busy={exporting}
                onPreview={() => void handleExport(true)}
                onAdd={(placement: Placement) => dispatch({ kind: 'addPlacement', pageId: editingPage.id, placement })}
                onUpdate={(placementId, patch) =>
                    dispatch({ kind: 'updatePlacement', pageId: editingPage.id, placementId, patch })
                }
                onRemove={(placementId) => dispatch({ kind: 'removePlacement', pageId: editingPage.id, placementId })}
            />
            </>
        )
    }

    return (
        <div className="flex h-full flex-col">
            <PdfOutputPreview output={previewOutput} onClose={() => setPreviewOutput(null)} />
            <div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur sm:px-6">
                <Button variant="ghost" size="sm" onClick={goBackToTools} disabled={loading || exporting} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    เครื่องมือทั้งหมด
                </Button>
                <div className="flex items-center gap-2">
                    <activeTool.icon className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-foreground">{activeTool.title}</span>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <span className="hidden items-center gap-1 text-xs text-muted-foreground lg:flex" title="บันทึกอัตโนมัติในเครื่อง">
                        {draftStatus === 'saving' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : draftStatus === 'error' ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> : <Check className="h-3.5 w-3.5 text-emerald-500" />}
                        {draftStatus === 'saving' ? 'กำลังบันทึก' : draftStatus === 'error' ? 'บันทึกไม่สำเร็จ' : draftStatus === 'saved' ? 'บันทึกในเครื่องแล้ว' : 'บันทึกอัตโนมัติเมื่อแก้ไข'}
                    </span>
                    <Button variant="outline" size="sm" onClick={undo} disabled={!canUndo || loading || exporting} className="gap-2">
                        <Undo2 className="h-4 w-4" />
                        ย้อนกลับ
                    </Button>
                    <Button variant="outline" size="sm" onClick={redo} disabled={!canRedo || loading || exporting} className="gap-2">
                        <Redo2 className="h-4 w-4" />
                        ทำซ้ำ
                    </Button>
                    {task.kind !== 'idle' && (
                        <Button variant="ghost" size="sm" onClick={cancelTask} className="gap-2 text-muted-foreground">
                            <CircleX className="h-4 w-4" />
                            ยกเลิก
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => void handleExport(true)} disabled={!hasPages || exporting || loading || (tool === 'split' && !!splitPlan.error)} className="gap-2"><Eye className="h-4 w-4" />ตรวจไฟล์</Button>
                    <Button size="sm" onClick={() => void handleExport()} disabled={!hasPages || exporting || loading || (tool === 'split' && !!splitPlan.error)} className="gap-2">
                        {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        {tool === 'split'
                            ? 'แยกและดาวน์โหลด'
                            : tool === 'compress'
                              ? 'บีบอัดและดาวน์โหลด'
                              : tool === 'form'
                                ? 'บันทึกฟอร์ม'
                                : tool === 'convert' && exportAsImages
                                  ? 'ดาวน์โหลดเป็นรูป'
                                  : 'ดาวน์โหลด PDF'}
                    </Button>
                </div>
            </div>

            <nav aria-label="เครื่องมือ PDF" className="flex shrink-0 gap-2 overflow-x-auto border-b bg-muted/20 px-4 py-3 sm:px-6">
                {TOOLS.map((item) => <Button key={item.id} variant={tool === item.id ? 'default' : 'ghost'} size="sm" disabled={loading || exporting} onClick={() => setTool(item.id)} className="shrink-0 gap-2"><item.icon className="h-4 w-4" />{item.title}</Button>)}
            </nav>

            {lastOutput && <div className="mx-6 mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3"><Check className="h-5 w-5 text-emerald-500" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{lastOutput.name} · {formatBytes(lastOutput.blob.size)}</p><p className="text-xs text-muted-foreground">{lastOutput.description ?? 'สร้างไฟล์สำเร็จ ดาวน์โหลดซ้ำได้ · หากแก้ไขต่อ ให้สร้างไฟล์ใหม่'}</p></div><Button variant="outline" size="sm" onClick={() => downloadBlob(lastOutput.blob, lastOutput.name)}>ดาวน์โหลดซ้ำ</Button><Button variant="ghost" size="icon" aria-label="ปิดผลการส่งออก" onClick={() => setLastOutput(null)}><X className="h-4 w-4" /></Button></div>}

            {task.kind !== 'idle' && (
                <div className="border-b border-border bg-muted/20 px-6 py-2">
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{task.label}</span>
                        <span>{task.total > 0 ? `${Math.min(task.done, task.total)} / ${task.total}` : 'กำลังเตรียม…'}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                            className="h-full rounded-full bg-primary transition-[width]"
                            style={{ width: task.total > 0 ? `${Math.min(100, (task.done / task.total) * 100)}%` : '35%' }}
                        />
                    </div>
                </div>
            )}

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="min-w-0 overflow-y-auto">
                    {hasPages ? (
                        <>
                            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                <span>{pages.length} หน้า</span>
                                {selected.size > 0 && <span className="text-primary">· เลือกอยู่ {selected.size} หน้า</span>}
                                <span className="ml-auto text-xs">
                                    {tool === 'edit'
                                        ? 'คลิกไอคอนปากกาบนหน้าที่ต้องการ เพื่อเซ็นชื่อหรือวางข้อความ'
                                        : tool === 'form'
                                          ? 'โหมดนี้รักษาหน้าและ field เดิมไว้ ให้กรอกค่าจากแผงด้านขวาแล้วส่งออก'
                                        : 'ลากเพื่อสลับลำดับ · คลิกเพื่อเลือก · Shift+คลิก เลือกเป็นช่วง'}
                                </span>
                            </div>
                            <PdfPageGrid
                                pages={pages}
                                thumbs={thumbs}
                                selectedIds={selected}
                                sourceNames={sourceNames}
                                showSourceBadge={sources.length > 1}
                                readOnly={tool === 'form' || loading || exporting}
                                onVisiblePagesChange={setVisiblePageIds}
                                onSelect={selectPage}
                                onReorder={(order) => dispatch({ kind: 'reorder', order })}
                                onRotate={(pageId, degrees) => dispatch({ kind: 'rotate', pageIds: [pageId], degrees })}
                                onDuplicate={(pageId) => dispatch({ kind: 'duplicate', pageIds: [pageId] })}
                                onDelete={(pageId) => dispatch({ kind: 'delete', pageIds: [pageId] })}
                                onOpenEditor={setEditingPageId}
                            />
                        </>
                    ) : (
                        <div className="space-y-4">
                        <PdfDropzone
                            onFiles={addFiles}
                            busy={loading || exporting}
                            withImages={tool === 'convert'}
                            hint={
                                tool === 'convert'
                                    ? 'รูป JPG/PNG จะถูกรวมเป็น PDF ให้อัตโนมัติ หนึ่งรูปต่อหนึ่งหน้า'
                                    : tool === 'merge'
                                      ? 'เลือกได้หลายไฟล์พร้อมกัน แล้วลากจัดลำดับได้'
                                      : 'เลือกได้หลายไฟล์พร้อมกัน'
                            }
                        />
                        {tool !== 'form' && <Button variant="outline" disabled={loading || exporting} onClick={() => void addBlankPage()} className="gap-2"><Plus className="h-4 w-4" />เพิ่มหน้าว่าง A4</Button>}
                        </div>
                    )}
                </div>

                <aside inert={loading || exporting ? true : undefined} className="space-y-4 overflow-y-auto xl:border-l xl:border-border xl:pl-6">
                    <section className="space-y-2">
                        <h2 className="text-sm font-semibold text-foreground">ไฟล์ที่เปิดอยู่</h2>
                        {sources.length === 0 && <p className="text-sm text-muted-foreground">ยังไม่ได้เลือกไฟล์</p>}
                        {sources.map((source) => (
                            <div
                                key={source.id}
                                className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-2.5"
                            >
                                <FileText className="h-4 w-4 shrink-0 text-primary" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-foreground">{source.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {source.pageCount} หน้า · {formatBytes(source.size)}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeSource(source.id)}
                                    aria-label={`เอา ${source.name} ออก`}
                                    className="rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                        {tool !== 'form' || sources.length === 0 ? (
                            <PdfDropzone
                                onFiles={addFiles}
                                busy={loading || exporting}
                                compact
                                withImages={tool === 'convert'}
                                label={sources.length ? 'เพิ่มไฟล์อีก' : tool === 'convert' ? 'เลือก PDF หรือรูป' : 'เลือกไฟล์ PDF'}
                            />
                        ) : (
                            <p className="rounded-lg bg-muted/40 p-2.5 text-xs leading-relaxed text-muted-foreground">
                                โหมดนี้ล็อกโครงสร้างหน้าไว้ เพื่อรักษา field และ widget เดิมของฟอร์ม
                            </p>
                        )}
                    </section>

                    {hasPages && tool !== 'form' && (
                        <details open={tool === 'organize' || tool === 'merge'} className="space-y-2 rounded-xl border border-border bg-muted/10 p-3">
                            <summary className="cursor-pointer text-sm font-semibold text-foreground">
                                จัดการหน้า
                                <span className="ml-1 font-normal text-muted-foreground">
                                    ({selected.size ? `${selected.size} หน้าที่เลือก` : 'ทุกหน้า'})
                                </span>
                            </summary>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    onClick={() => setSelected(new Set(pages.map((page) => page.id)))}
                                >
                                    <CheckSquare className="h-4 w-4" />
                                    เลือกทั้งหมด
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    onClick={() => setSelected(new Set())}
                                    disabled={selected.size === 0}
                                >
                                    <Square className="h-4 w-4" />
                                    ล้างที่เลือก
                                </Button>
                                <div className="col-span-2 flex gap-2">
                                    <Input
                                        value={selectionRangeText}
                                        onChange={(event) => setSelectionRangeText(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') selectPageRange()
                                        }}
                                        placeholder="เลือกช่วง เช่น 1-3, 8"
                                        aria-label="เลือกช่วงหน้า"
                                    />
                                    <Button variant="outline" size="sm" onClick={selectPageRange} className="shrink-0">
                                        เลือกช่วง
                                    </Button>
                                </div>
                                <div className="col-span-2 space-y-2 rounded-lg border border-dashed border-border p-2.5">
                                    <Label htmlFor="pdf-move-position" className="text-xs text-muted-foreground">ย้ายหน้าที่เลือกไปตำแหน่งเริ่มต้น</Label>
                                    <div className="flex gap-2"><Input id="pdf-move-position" type="number" min={1} max={Math.max(1, pages.length - selected.size + 1)} value={movePosition} onChange={(event) => setMovePosition(event.target.value)} className="h-9" /><Button variant="outline" size="sm" disabled={!selected.size} onClick={() => {
                                        try { const reordered = movePagesToPosition(pagesRef.current, selected, Number(movePosition)); dispatch({ kind: 'reorder', order: reordered.map((page) => page.id) }); toast.success(`ย้าย ${selected.size} หน้าแล้ว`) }
                                        catch (error) { toast.error(error instanceof Error ? error.message : 'ย้ายหน้าไม่สำเร็จ') }
                                    }}>ย้ายหน้า</Button></div>
                                </div>
                                <div className="col-span-2 space-y-2 rounded-lg border border-dashed border-border p-2.5">
                                    <div className="flex gap-2">
                                        <select
                                            value={blankPageSize}
                                            onChange={(event) => setBlankPageSize(event.target.value as typeof blankPageSize)}
                                            className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm text-foreground"
                                            aria-label="ขนาดหน้าว่าง"
                                        >
                                            <option value="a4">A4</option>
                                            <option value="a3">A3</option>
                                            <option value="letter">Letter</option>
                                        </select>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setBlankPageLandscape((value) => !value)}
                                            className="shrink-0"
                                        >
                                            {blankPageLandscape ? 'แนวนอน' : 'แนวตั้ง'}
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => void addBlankPage()} className="shrink-0">
                                            เพิ่มหน้าว่าง
                                        </Button>
                                    </div>
                                </div>
                                <div className="col-span-2 flex items-center gap-2 rounded-lg border border-dashed border-border p-2.5">
                                    <select
                                        value={cropPreset}
                                        onChange={(event) => setCropPreset(event.target.value)}
                                        className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm text-foreground"
                                        aria-label="ระยะตัดขอบหน้า"
                                    >
                                        <option value="0">ไม่ตัดขอบ</option>
                                        <option value="0.03">ตัดขอบ 3%</option>
                                        <option value="0.05">ตัดขอบ 5%</option>
                                        <option value="0.1">ตัดขอบ 10%</option>
                                    </select>
                                    <Button variant="outline" size="sm" onClick={applyCropPreset} className="shrink-0">
                                        ใช้กับหน้า
                                    </Button>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    onClick={() => dispatch({ kind: 'rotate', pageIds: targetIds(), degrees: 270 })}
                                >
                                    <RotateCcw className="h-4 w-4" />
                                    หมุนซ้าย
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    onClick={() => dispatch({ kind: 'rotate', pageIds: targetIds(), degrees: 90 })}
                                >
                                    <RotateCw className="h-4 w-4" />
                                    หมุนขวา
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    onClick={() => dispatch({ kind: 'duplicate', pageIds: targetIds() })}
                                >
                                    <Copy className="h-4 w-4" />
                                    ทำสำเนา
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 text-destructive hover:text-destructive"
                                    onClick={() => dispatch({ kind: 'delete', pageIds: [...selected] })}
                                    disabled={selected.size === 0}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    ลบหน้า
                                </Button>
                            </div>
                        </details>
                    )}

                    {tool === 'split' && hasPages && (
                        <section className="space-y-3 border-t border-border pt-4">
                            <h2 className="text-sm font-semibold text-foreground">วิธีแยกไฟล์</h2>
                            <div className="space-y-1.5">
                                {(
                                    [
                                        ['ranges', 'ตามช่วงหน้า'],
                                        ['every', 'ทุก ๆ N หน้า'],
                                        ['each', 'แยกทุกหน้า'],
                                        ['selection', 'เฉพาะหน้าที่เลือก'],
                                    ] as Array<[SplitMode, string]>
                                ).map(([mode, label]) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => {
                                            setSplitMode(mode)
                                            setHasChanges(true)
                                        }}
                                        className={cn(
                                            'w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                                            splitMode === mode
                                                ? 'border-primary bg-primary/10 text-foreground'
                                                : 'border-border bg-muted/20 text-muted-foreground hover:border-primary/40'
                                        )}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {splitMode === 'ranges' && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="pdf-ranges" className="text-xs text-muted-foreground">
                                        ช่วงหน้า — คั่นด้วยจุลภาคเพื่อแยกเป็นหลายไฟล์ เช่น 1-3, 4-
                                    </Label>
                                    <Input
                                        id="pdf-ranges"
                                        value={rangeText}
                                        onChange={(event) => {
                                            setRangeText(event.target.value)
                                            setHasChanges(true)
                                        }}
                                        placeholder="1-3, 4-"
                                    />
                                </div>
                            )}

                            {splitMode === 'every' && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="pdf-every" className="text-xs text-muted-foreground">
                                        จำนวนหน้าต่อไฟล์
                                    </Label>
                                    <Input
                                        id="pdf-every"
                                        type="number"
                                        min={1}
                                        value={everySize}
                                        onChange={(event) => {
                                            setEverySize(event.target.value)
                                            setHasChanges(true)
                                        }}
                                    />
                                </div>
                            )}

                            {splitPlan.error && <p role="alert" className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">{splitPlan.error}</p>}
                            <p className="text-xs text-muted-foreground">
                                {previewGroups.length > 1
                                    ? `จะได้ ${previewGroups.length} ไฟล์ ดาวน์โหลดเป็น ZIP`
                                    : previewGroups.length === 1
                                      ? `จะได้ 1 ไฟล์ (${previewGroups[0].pages.length} หน้า)`
                                      : 'ยังไม่ตรงกับหน้าใดเลย'}
                            </p>
                        </section>
                    )}

                    {tool === 'convert' && hasPages && (
                        <section className="space-y-3 border-t border-border pt-4">
                            <h2 className="text-sm font-semibold text-foreground">รูปแบบผลลัพธ์</h2>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    variant={exportAsImages ? 'outline' : 'default'}
                                    size="sm"
                                    onClick={() => {
                                        setExportAsImages(false)
                                        setHasChanges(true)
                                    }}
                                >
                                    เป็น PDF
                                </Button>
                                <Button
                                    variant={exportAsImages ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => {
                                        setExportAsImages(true)
                                        setHasChanges(true)
                                    }}
                                >
                                    เป็นรูป
                                </Button>
                            </div>
                            {exportAsImages && (
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">ชนิดไฟล์รูป</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['png', 'jpeg'] as ImageFormat[]).map((format) => (
                                            <button
                                                key={format}
                                                type="button"
                                                onClick={() => {
                                                    setImageFormat(format)
                                                    setHasChanges(true)
                                                }}
                                                className={cn(
                                                    'rounded-lg border px-3 py-2 text-sm uppercase transition-colors',
                                                    imageFormat === format
                                                        ? 'border-primary bg-primary/10 text-foreground'
                                                        : 'border-border bg-muted/20 text-muted-foreground hover:border-primary/40'
                                                )}
                                            >
                                                {format === 'jpeg' ? 'JPG' : 'PNG'}
                                            </button>
                                        ))}
                                    </div>
                                    <Label className="text-xs text-muted-foreground">ความละเอียด</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(
                                            [
                                                [1, '72 DPI'],
                                                [2, '144 DPI'],
                                                [4, '288 DPI'],
                                            ] as Array<[ImageScale, string]>
                                        ).map(([scale, label]) => (
                                            <button
                                                key={scale}
                                                type="button"
                                                onClick={() => {
                                                    setImageScale(scale)
                                                    setHasChanges(true)
                                                }}
                                                className={cn(
                                                    'rounded-lg border px-2 py-2 text-xs transition-colors',
                                                    imageScale === scale
                                                        ? 'border-primary bg-primary/10 text-foreground'
                                                        : 'border-border bg-muted/20 text-muted-foreground hover:border-primary/40'
                                                )}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {pages.length > 1 ? `จะได้ ${pages.length} รูป ดาวน์โหลดเป็น ZIP` : 'จะได้ 1 รูป'}
                                    </p>
                                </div>
                            )}
                        </section>
                    )}

                    {tool === 'compress' && hasPages && (
                        <section className="space-y-3 border-t border-border pt-4">
                            <h2 className="text-sm font-semibold text-foreground">คุณภาพการบีบอัด</h2>
                            <div className="space-y-1.5">
                                {(
                                    [
                                        ['high', 'คุณภาพสูง', 'อ่านข้อความได้ชัด ไฟล์ลดลงน้อยกว่า'],
                                        ['balanced', 'สมดุล', 'เหมาะกับเอกสารสแกนทั่วไป'],
                                        ['small', 'ไฟล์เล็ก', 'ลดขนาดมากที่สุด ภาพอาจไม่คมเท่าเดิม'],
                                    ] as Array<[CompressionQuality, string, string]>
                                ).map(([quality, label, hint]) => (
                                    <button
                                        key={quality}
                                        type="button"
                                        onClick={() => {
                                            setCompressionQuality(quality)
                                            setHasChanges(true)
                                        }}
                                        className={cn(
                                            'w-full rounded-lg border px-3 py-2 text-left transition-colors',
                                            compressionQuality === quality
                                                ? 'border-primary bg-primary/10 text-foreground'
                                                : 'border-border bg-muted/20 text-muted-foreground hover:border-primary/40'
                                        )}
                                    >
                                        <span className="block text-sm">{label}</span>
                                        <span className="block text-xs text-muted-foreground">{hint}</span>
                                    </button>
                                ))}
                            </div>
                            <p className="rounded-lg bg-amber-500/10 p-2.5 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                                โหมดนี้แปลงแต่ละหน้าเป็นภาพ ข้อความในไฟล์ผลลัพธ์จะค้นหา คัดลอก หรือเลือกไม่ได้
                            </p>
                        </section>
                    )}

                    {tool === 'form' && hasPages && (
                        <section className="space-y-3 border-t border-border pt-4">
                            <div className="flex items-center justify-between gap-2">
                                <h2 className="text-sm font-semibold text-foreground">ช่องกรอกใน PDF</h2>
                                <Button variant="outline" size="sm" onClick={resetFormValues}>
                                    รีเซ็ตค่า
                                </Button>
                            </div>
                            {sources.length !== 1 && (
                                <p className="rounded-lg bg-amber-500/10 p-2.5 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                                    โหมดนี้รองรับเอกสารเดียวต่อครั้ง เพื่อรักษาโครงสร้างฟอร์มเดิม
                                </p>
                            )}
                            {sources.length === 1 && !isUntouchedFormDocument(sources[0], pages) && (
                                <p className="rounded-lg bg-amber-500/10 p-2.5 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                                    เอกสารนี้ถูกจัดหน้า/วางของไว้ก่อนแล้ว ต้องเปิดต้นฉบับใหม่ในโหมดนี้ก่อนจึงจะบันทึกฟอร์มได้
                                </p>
                            )}
                            {sources.length === 1 && formFields.length === 0 && (
                                <p className="rounded-lg bg-muted/40 p-2.5 text-xs leading-relaxed text-muted-foreground">
                                    ไม่พบ AcroForm ในไฟล์นี้ ไฟล์สแกนหรือช่องที่วาดเป็นภาพยังกรอกเป็นฟอร์มไม่ได้
                                </p>
                            )}
                            {formFields.map((field) => {
                                const current = sources[0]?.formValues?.[field.name] ?? field.value
                                const label = `${field.name}${field.required ? ' *' : ''}${field.readOnly ? ' (อ่านอย่างเดียว)' : ''}`
                                if (field.kind === 'text') {
                                    const value = typeof current === 'string' ? current : ''
                                    return (
                                        <div key={field.name} className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground">{label}</Label>
                                            {field.multiline ? (
                                                <Textarea
                                                    value={value}
                                                    disabled={field.readOnly}
                                                    maxLength={field.maxLength}
                                                    onChange={(event) => updateFormValue(field.name, event.target.value)}
                                                    rows={3}
                                                />
                                            ) : (
                                                <Input
                                                    value={value}
                                                    disabled={field.readOnly}
                                                    maxLength={field.maxLength}
                                                    onChange={(event) => updateFormValue(field.name, event.target.value)}
                                                />
                                            )}
                                        </div>
                                    )
                                }
                                if (field.kind === 'checkbox') {
                                    return (
                                        <label key={field.name} className="flex items-center gap-2 rounded-lg border border-border p-2.5 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(current)}
                                                disabled={field.readOnly}
                                                onChange={(event) => updateFormValue(field.name, event.target.checked)}
                                            />
                                            <span>{label}</span>
                                        </label>
                                    )
                                }
                                if (field.kind === 'dropdown' || field.kind === 'radio') {
                                    const multiple = field.kind === 'dropdown' && field.multiple === true
                                    const value = multiple
                                        ? Array.isArray(current)
                                            ? current
                                            : typeof current === 'string' && current
                                              ? [current]
                                              : []
                                        : typeof current === 'string'
                                          ? current
                                          : ''
                                    return (
                                        <div key={field.name} className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground">{label}</Label>
                                            <select
                                                multiple={multiple}
                                                value={value}
                                                disabled={field.readOnly}
                                                onChange={(event) =>
                                                    updateFormValue(
                                                        field.name,
                                                        multiple
                                                            ? Array.from(event.target.selectedOptions, (option) => option.value)
                                                            : event.target.value,
                                                    )
                                                }
                                                className={cn(
                                                    'w-full rounded-md border border-input bg-background px-3 text-sm',
                                                    multiple ? 'min-h-20 py-2' : 'h-9',
                                                )}
                                            >
                                                {!multiple && <option value="">เลือก…</option>}
                                                {(field.options ?? []).map((option, index) => <option key={`${field.name}-${index}`} value={option}>{option}</option>)}
                                            </select>
                                        </div>
                                    )
                                }
                                if (field.kind === 'optionList') {
                                    const multiple = field.multiple === true
                                    const values = Array.isArray(current) ? current : typeof current === 'string' && current ? [current] : []
                                    return (
                                        <div key={field.name} className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground">{label}</Label>
                                            <select
                                                multiple={multiple}
                                                value={multiple ? values : values[0] ?? ''}
                                                disabled={field.readOnly}
                                                onChange={(event) =>
                                                    updateFormValue(
                                                        field.name,
                                                        multiple
                                                            ? Array.from(event.target.selectedOptions, (option) => option.value)
                                                            : event.target.value,
                                                    )
                                                }
                                                className={cn(
                                                    'w-full rounded-md border border-input bg-background px-3 text-sm',
                                                    multiple ? 'min-h-20 py-2' : 'h-9',
                                                )}
                                            >
                                                {!multiple && <option value="">เลือก…</option>}
                                                {(field.options ?? []).map((option, index) => <option key={`${field.name}-${index}`} value={option}>{option}</option>)}
                                            </select>
                                        </div>
                                    )
                                }
                                return (
                                    <p key={field.name} className="rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground">
                                        {label}: ชนิดฟอร์มนี้ยังไม่รองรับการแก้ไข
                                    </p>
                                )
                            })}
                            {formFields.length > 0 && (
                                <label className="flex items-start gap-2 rounded-lg border border-dashed border-border p-2.5 text-xs text-muted-foreground">
                                    <input
                                        type="checkbox"
                                        checked={formFlatten}
                                        onChange={(event) => {
                                            setFormFlatten(event.target.checked)
                                            setHasChanges(true)
                                        }}
                                    />
                                    <span>รวมค่าลงหน้าเอกสารแบบถาวร (Flatten) และเอาช่องกรอกออกจากไฟล์ผลลัพธ์</span>
                                </label>
                            )}
                        </section>
                    )}

                    {hasPages && tool !== 'form' && (
                        <details className="space-y-3 rounded-xl border border-border bg-muted/10 p-3">
                            <summary className="cursor-pointer text-sm font-semibold text-foreground">ลายน้ำและเลขหน้า</summary>
                            <div className="space-y-1.5">
                                <Label htmlFor="pdf-watermark" className="text-xs text-muted-foreground">
                                    ข้อความลายน้ำ
                                </Label>
                                <Input
                                    id="pdf-watermark"
                                    value={watermarkText}
                                    onChange={(event) => {
                                        setWatermarkText(event.target.value)
                                        setHasChanges(true)
                                    }}
                                    placeholder="เช่น ฉบับร่าง"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="pdf-watermark-opacity" className="text-xs text-muted-foreground">
                                    ความโปร่งใส (0.05–1)
                                </Label>
                                <Input
                                    id="pdf-watermark-opacity"
                                    type="number"
                                    min={0.05}
                                    max={1}
                                    step={0.05}
                                    value={watermarkOpacity}
                                    onChange={(event) => setWatermarkOpacity(event.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Button variant="outline" size="sm" onClick={addWatermark}>
                                    ใส่ลายน้ำ
                                </Button>
                                <Button variant="outline" size="sm" onClick={addPageNumbers}>
                                    เพิ่มเลขหน้า
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                ใช้กับ {selected.size ? `${selected.size} หน้าที่เลือก` : 'ทุกหน้า'} และรวมเป็น Undo ครั้งเดียว
                            </p>
                        </details>
                    )}

                    <section className="space-y-1.5 border-t border-border pt-4">
                        <Label htmlFor="pdf-output" className="text-xs text-muted-foreground">
                            ชื่อไฟล์ผลลัพธ์
                        </Label>
                        <Input
                            id="pdf-output"
                            value={outputName}
                            onChange={(event) => {
                                setOutputName(event.target.value)
                                setHasChanges(true)
                            }}
                            placeholder="document"
                        />
                    </section>
                </aside>
            </div>
        </div>
    )
}

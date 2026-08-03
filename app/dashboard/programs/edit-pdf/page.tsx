'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import {
    ArrowLeft,
    CheckSquare,
    Copy,
    Download,
    FileImage,
    FileSignature,
    FileText,
    Layers,
    Loader2,
    Lock,
    Redo2,
    RotateCcw,
    RotateCw,
    Scissors,
    Square,
    Trash2,
    Type,
    Undo2,
    X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { PdfDropzone, PdfPageEditor, PdfPageGrid, PdfToolCard } from '@/components/pdf-editor'
import {
    EncryptedPdfError,
    applyOperation,
    buildPdf,
    buildZip,
    chunkPages,
    destroyPdfDoc,
    downloadBlob,
    formatBytes,
    hasThaiCharacters,
    loadPdfSource,
    loadThaiFont,
    parsePageRanges,
    pdfFromImages,
    renderPageImage,
    renderPageToImageBlob,
    renderThumbnail,
    stripPdfExtension,
    thumbKey,
    zipBlobs,
} from '@/components/pdf-editor/pdf-utils'
import type {
    ImageFormat,
    PageRender,
    PageThumb,
    PdfOperation,
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
]

const IMAGE_PATTERN = /\.(png|jpe?g)$/i

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
    const [rangeText, setRangeText] = useState('1-3, 4-')
    const [everySize, setEverySize] = useState('2')
    const [editingPageId, setEditingPageId] = useState<string | null>(null)
    const [pageRender, setPageRender] = useState<PageRender | null>(null)
    const [imageFormat, setImageFormat] = useState<ImageFormat>('png')
    const [exportAsImages, setExportAsImages] = useState(false)

    // pagesRef สะท้อนสถานะล่าสุดเสมอ ทำให้ dispatch หลายครั้งติดกันไม่อ่านค่าเก่า
    const pagesRef = useRef<PdfPageRef[]>([])
    const historyRef = useRef<PdfPageRef[][]>([])
    const futureRef = useRef<PdfPageRef[][]>([])
    const docsRef = useRef<Map<string, PDFDocumentProxy>>(new Map())
    const bytesRef = useRef<Map<string, ArrayBuffer>>(new Map())
    const lastSelectedRef = useRef<string | null>(null)

    const sourceNames = useMemo(
        () => Object.fromEntries(sources.map((source) => [source.id, source.name])),
        [sources]
    )

    const commit = useCallback((next: PdfPageRef[]) => {
        pagesRef.current = next
        setPages(next)
        setSelected((prev) => {
            const alive = new Set(next.map((page) => page.id))
            return new Set([...prev].filter((id) => alive.has(id)))
        })
    }, [])

    /** ทุกการแก้ไขหน้าเดินผ่านที่นี่ที่เดียว undo/redo จึงครอบคลุมทุกคำสั่งโดยอัตโนมัติ */
    const dispatch = useCallback(
        (op: PdfOperation) => {
            historyRef.current.push(pagesRef.current)
            if (historyRef.current.length > HISTORY_LIMIT) historyRef.current.shift()
            futureRef.current = []
            commit(applyOperation(pagesRef.current, op))
        },
        [commit]
    )

    const undo = useCallback(() => {
        const previous = historyRef.current.pop()
        if (!previous) {
            toast.error('ไม่มีอะไรให้ย้อนกลับ')
            return
        }
        futureRef.current.push(pagesRef.current)
        commit(previous)
    }, [commit])

    const redo = useCallback(() => {
        const next = futureRef.current.pop()
        if (!next) {
            toast.error('ไม่มีอะไรให้ทำซ้ำ')
            return
        }
        historyRef.current.push(pagesRef.current)
        commit(next)
    }, [commit])

    const renderThumbsFor = useCallback(async (doc: PDFDocumentProxy, refs: PdfPageRef[]) => {
        for (const ref of refs) {
            try {
                const thumb = await renderThumbnail(doc, ref.sourceIndex)
                setThumbs((prev) => ({ ...prev, [thumbKey(ref)]: thumb }))
            } catch (error) {
                // หน้าที่เรนเดอร์ไม่ได้จะแสดงเป็น placeholder แต่ยังแก้ไขและ export ได้ตามปกติ
                console.warn('render thumbnail failed', ref.sourceIndex, error)
            }
        }
    }, [])

    const addFiles = useCallback(
        async (incoming: File[]) => {
            setLoading(true)
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

                for (const file of files) {
                    if (file.size > LARGE_FILE_BYTES) {
                        toast.warning(`${file.name} มีขนาด ${formatBytes(file.size)} อาจทำงานช้าในเบราว์เซอร์`)
                    }
                    try {
                        const loaded = await loadPdfSource(file)
                        docsRef.current.set(loaded.source.id, loaded.doc)
                        bytesRef.current.set(loaded.source.id, loaded.bytes)
                        setSources((prev) => [...prev, loaded.source])
                        dispatch({ kind: 'append', pages: loaded.pages })
                        if (pagesRef.current.length === loaded.pages.length) {
                            setOutputName(stripPdfExtension(file.name))
                        }
                        void renderThumbsFor(loaded.doc, loaded.pages)
                        toast.success(`เพิ่ม ${file.name} แล้ว (${loaded.source.pageCount} หน้า)`)
                    } catch (error) {
                        if (error instanceof EncryptedPdfError) {
                            toast.error(`${file.name} ถูกล็อกด้วยรหัสผ่าน ยังเปิดไม่ได้ในเวอร์ชันนี้`)
                        } else {
                            toast.error(`เปิด ${file.name} ไม่สำเร็จ`)
                        }
                    }
                }
            } finally {
                setLoading(false)
            }
        },
        [dispatch, renderThumbsFor]
    )

    const removeSource = useCallback(
        (sourceId: string) => {
            const remaining = pagesRef.current.filter((page) => page.sourceId === sourceId).map((page) => page.id)
            if (remaining.length) dispatch({ kind: 'delete', pageIds: remaining })
            const doc = docsRef.current.get(sourceId)
            if (doc) destroyPdfDoc(doc)
            docsRef.current.delete(sourceId)
            bytesRef.current.delete(sourceId)
            setSources((prev) => prev.filter((source) => source.id !== sourceId))
        },
        [dispatch]
    )

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

    const reset = useCallback(() => {
        docsRef.current.forEach(destroyPdfDoc)
        docsRef.current.clear()
        bytesRef.current.clear()
        historyRef.current = []
        futureRef.current = []
        pagesRef.current = []
        setPages([])
        setSources([])
        setThumbs({})
        setSelected(new Set())
        setEditingPageId(null)
        setPageRender(null)
        setTool(null)
    }, [])

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
            docs.forEach(destroyPdfDoc)
            docs.clear()
        }
    }, [])

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null
            if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
            if (!pagesRef.current.length) return

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
    }, [dispatch, redo, selected, undo])

    const splitGroups = useCallback((): Array<{ name: string; pages: PdfPageRef[] }> => {
        const base = stripPdfExtension(outputName || 'document')
        const current = pagesRef.current

        switch (splitMode) {
            case 'each':
                return current.map((page, index) => ({ name: `${base}-page-${index + 1}.pdf`, pages: [page] }))

            case 'every': {
                const size = Math.max(1, Number(everySize) || 1)
                return chunkPages(current, size).map((chunk, index) => ({
                    name: `${base}-part-${index + 1}.pdf`,
                    pages: chunk,
                }))
            }

            case 'selection': {
                const chosen = current.filter((page) => selected.has(page.id))
                return chosen.length ? [{ name: `${base}-extract.pdf`, pages: chosen }] : []
            }

            case 'ranges':
            default:
                return rangeText
                    .split(',')
                    .map((part) => part.trim())
                    .filter(Boolean)
                    .map((part, index) => ({
                        name: `${base}-part-${index + 1}.pdf`,
                        pages: parsePageRanges(part, current.length).map((pageIndex) => current[pageIndex]),
                    }))
                    .filter((group) => group.pages.length > 0)
        }
    }, [everySize, outputName, rangeText, selected, splitMode])

    const handleExport = useCallback(async () => {
        if (!pagesRef.current.length) {
            toast.error('ยังไม่มีหน้าให้บันทึก')
            return
        }
        setExporting(true)
        try {
            const base = stripPdfExtension(outputName || 'document')

            if (tool === 'convert' && exportAsImages) {
                const extension = imageFormat === 'png' ? 'png' : 'jpg'
                const entries: Array<{ name: string; blob: Blob }> = []
                for (const [index, ref] of pagesRef.current.entries()) {
                    const doc = docsRef.current.get(ref.sourceId)
                    if (!doc) continue
                    entries.push({
                        name: `${base}-page-${index + 1}.${extension}`,
                        blob: await renderPageToImageBlob(doc, ref, imageFormat),
                    })
                }
                if (!entries.length) throw new Error('สร้างรูปไม่สำเร็จ')
                if (entries.length === 1) {
                    downloadBlob(entries[0].blob, entries[0].name)
                } else {
                    downloadBlob(await zipBlobs(entries), `${base}-images.zip`)
                }
                toast.success(`ส่งออกเป็นรูปแล้ว ${entries.length} ไฟล์`)
                return
            }

            // ฝังฟอนต์ไทยเฉพาะตอนที่มีข้อความจริง ๆ เพื่อไม่ให้ไฟล์บวมโดยไม่จำเป็น
            const texts = pagesRef.current.flatMap((page) =>
                page.placements.filter((item) => item.kind === 'text').map((item) => item.text)
            )
            let fontBytes: ArrayBuffer | null = null
            if (texts.length > 0) {
                fontBytes = await loadThaiFont()
                if (!fontBytes && texts.some(hasThaiCharacters)) {
                    toast.error('ไม่พบไฟล์ฟอนต์ไทย ข้อความภาษาไทยจะหายไปจากไฟล์ที่บันทึก')
                }
            }
            const options = { fontBytes }

            if (tool === 'split') {
                const groups = splitGroups()
                if (!groups.length) {
                    toast.error(splitMode === 'selection' ? 'ยังไม่ได้เลือกหน้า' : 'ช่วงหน้าที่ระบุไม่ตรงกับหน้าใดเลย')
                    return
                }
                if (groups.length === 1) {
                    downloadBlob(await buildPdf(groups[0].pages, bytesRef.current, options), groups[0].name)
                    toast.success(`บันทึกแล้ว ${groups[0].pages.length} หน้า`)
                    return
                }
                downloadBlob(await buildZip(groups, bytesRef.current, options), `${base}-split.zip`)
                toast.success(`แยกเป็น ${groups.length} ไฟล์แล้ว`)
                return
            }

            downloadBlob(await buildPdf(pagesRef.current, bytesRef.current, options), `${base}.pdf`)
            toast.success(`บันทึกแล้ว ${pagesRef.current.length} หน้า`)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'บันทึกไฟล์ไม่สำเร็จ')
        } finally {
            setExporting(false)
        }
    }, [exportAsImages, imageFormat, outputName, splitGroups, splitMode, tool])

    if (!tool) {
        return (
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-foreground">Edit PDF</h1>
                    <p className="text-sm text-muted-foreground">เครื่องมือสำหรับแก้ไขและจัดการไฟล์ PDF</p>
                </div>

                <div className="mb-6 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4 shrink-0 text-primary" />
                    ไฟล์ทั้งหมดถูกประมวลผลในเครื่องของคุณ ไม่มีการอัปโหลดขึ้นเซิร์ฟเวอร์
                </div>

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
    const previewGroups = tool === 'split' && hasPages ? splitGroups() : []

    if (editingPage) {
        return (
            <PdfPageEditor
                page={editingPage}
                render={pageRender}
                pageNumber={editingIndex + 1}
                totalPages={pages.length}
                canGoPrev={editingIndex > 0}
                canGoNext={editingIndex < pages.length - 1}
                onPrev={() => setEditingPageId(pages[editingIndex - 1]?.id ?? null)}
                onNext={() => setEditingPageId(pages[editingIndex + 1]?.id ?? null)}
                onClose={() => setEditingPageId(null)}
                onAdd={(placement: Placement) => dispatch({ kind: 'addPlacement', pageId: editingPage.id, placement })}
                onUpdate={(placementId, patch) =>
                    dispatch({ kind: 'updatePlacement', pageId: editingPage.id, placementId, patch })
                }
                onRemove={(placementId) => dispatch({ kind: 'removePlacement', pageId: editingPage.id, placementId })}
            />
        )
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex flex-wrap items-center gap-3 border-b border-border bg-card/50 px-6 py-4">
                <Button variant="ghost" size="sm" onClick={reset} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    เครื่องมือทั้งหมด
                </Button>
                <div className="flex items-center gap-2">
                    <activeTool.icon className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-foreground">{activeTool.title}</span>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={undo} disabled={!hasPages} className="gap-2">
                        <Undo2 className="h-4 w-4" />
                        ย้อนกลับ
                    </Button>
                    <Button variant="outline" size="sm" onClick={redo} disabled={!hasPages} className="gap-2">
                        <Redo2 className="h-4 w-4" />
                        ทำซ้ำ
                    </Button>
                    <Button size="sm" onClick={handleExport} disabled={!hasPages || exporting} className="gap-2">
                        {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        {tool === 'split'
                            ? 'แยกและดาวน์โหลด'
                            : tool === 'convert' && exportAsImages
                              ? 'ดาวน์โหลดเป็นรูป'
                              : 'ดาวน์โหลด PDF'}
                    </Button>
                </div>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-6 overflow-hidden p-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-w-0 overflow-y-auto">
                    {hasPages ? (
                        <>
                            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                <span>{pages.length} หน้า</span>
                                {selected.size > 0 && <span className="text-primary">· เลือกอยู่ {selected.size} หน้า</span>}
                                <span className="ml-auto text-xs">
                                    {tool === 'edit'
                                        ? 'คลิกไอคอนปากกาบนหน้าที่ต้องการ เพื่อเซ็นชื่อหรือวางข้อความ'
                                        : 'ลากเพื่อสลับลำดับ · คลิกเพื่อเลือก · Shift+คลิก เลือกเป็นช่วง'}
                                </span>
                            </div>
                            <PdfPageGrid
                                pages={pages}
                                thumbs={thumbs}
                                selectedIds={selected}
                                sourceNames={sourceNames}
                                showSourceBadge={sources.length > 1}
                                onSelect={selectPage}
                                onReorder={(order) => dispatch({ kind: 'reorder', order })}
                                onRotate={(pageId, degrees) => dispatch({ kind: 'rotate', pageIds: [pageId], degrees })}
                                onDuplicate={(pageId) => dispatch({ kind: 'duplicate', pageIds: [pageId] })}
                                onDelete={(pageId) => dispatch({ kind: 'delete', pageIds: [pageId] })}
                                onOpenEditor={setEditingPageId}
                            />
                        </>
                    ) : (
                        <PdfDropzone
                            onFiles={addFiles}
                            busy={loading}
                            withImages={tool === 'convert'}
                            hint={
                                tool === 'convert'
                                    ? 'รูป JPG/PNG จะถูกรวมเป็น PDF ให้อัตโนมัติ หนึ่งรูปต่อหนึ่งหน้า'
                                    : tool === 'merge'
                                      ? 'เลือกได้หลายไฟล์พร้อมกัน แล้วลากจัดลำดับได้'
                                      : 'เลือกได้หลายไฟล์พร้อมกัน'
                            }
                        />
                    )}
                </div>

                <aside className="space-y-4 overflow-y-auto xl:border-l xl:border-border xl:pl-6">
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
                        <PdfDropzone
                            onFiles={addFiles}
                            busy={loading}
                            compact
                            withImages={tool === 'convert'}
                            label={sources.length ? 'เพิ่มไฟล์อีก' : tool === 'convert' ? 'เลือก PDF หรือรูป' : 'เลือกไฟล์ PDF'}
                        />
                    </section>

                    {hasPages && (
                        <section className="space-y-2 border-t border-border pt-4">
                            <h2 className="text-sm font-semibold text-foreground">
                                จัดการหน้า
                                <span className="ml-1 font-normal text-muted-foreground">
                                    ({selected.size ? `${selected.size} หน้าที่เลือก` : 'ทุกหน้า'})
                                </span>
                            </h2>
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
                        </section>
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
                                        onClick={() => setSplitMode(mode)}
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
                                        onChange={(event) => setRangeText(event.target.value)}
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
                                        onChange={(event) => setEverySize(event.target.value)}
                                    />
                                </div>
                            )}

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
                                    onClick={() => setExportAsImages(false)}
                                >
                                    เป็น PDF
                                </Button>
                                <Button
                                    variant={exportAsImages ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setExportAsImages(true)}
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
                                                onClick={() => setImageFormat(format)}
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
                                    <p className="text-xs text-muted-foreground">
                                        {pages.length > 1 ? `จะได้ ${pages.length} รูป ดาวน์โหลดเป็น ZIP` : 'จะได้ 1 รูป'}
                                    </p>
                                </div>
                            )}
                        </section>
                    )}

                    <section className="space-y-1.5 border-t border-border pt-4">
                        <Label htmlFor="pdf-output" className="text-xs text-muted-foreground">
                            ชื่อไฟล์ผลลัพธ์
                        </Label>
                        <Input
                            id="pdf-output"
                            value={outputName}
                            onChange={(event) => setOutputName(event.target.value)}
                            placeholder="document"
                        />
                    </section>
                </aside>
            </div>
        </div>
    )
}

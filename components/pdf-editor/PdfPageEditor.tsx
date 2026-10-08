'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    Copy,
    Eye,
    Highlighter,
    ImagePlus,
    Loader2,
    Minus,
    PenLine,
    Plus,
    Scan,
    Slash,
    StickyNote,
    Trash2,
    Type,
    Undo2,
    Redo2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { SignaturePad } from './SignaturePad'
import { toast } from 'sonner'
import type { PageRender, PdfPageRef, Placement } from './pdf-editor.types'

const DEFAULT_FONT_SIZE = 16
const DEFAULT_COLOR = '#111111'
/** ความกว้างเริ่มต้นของรูป/ลายเซ็นเทียบกับความกว้างหน้า */
const DEFAULT_IMAGE_WIDTH = 0.28

interface PdfPageEditorProps {
    page: PdfPageRef
    render: PageRender | null
    pageNumber: number
    totalPages: number
    canGoPrev: boolean
    canGoNext: boolean
    onPrev: () => void
    onNext: () => void
    onJump: (pageNumber: number) => void
    onClose: () => void
    onAdd: (placement: Placement) => void
    onUpdate: (placementId: string, patch: Partial<Placement>) => void
    onRemove: (placementId: string) => void
    onUndo: () => void
    onRedo: () => void
    canUndo: boolean
    canRedo: boolean
    onPreview: () => void
    busy: boolean
}

type DragState = {
    id: string
    mode: 'move' | 'resize'
    pointerX: number
    pointerY: number
    origin: { x: number; y: number; w: number; h: number }
}

function isBoxPlacement(item: Placement): item is Extract<Placement, { w: number; h: number }> {
    return item.kind !== 'text'
}

export function PdfPageEditor({
    page,
    render,
    pageNumber,
    totalPages,
    canGoPrev,
    canGoNext,
    onPrev,
    onNext,
    onJump,
    onClose,
    onAdd,
    onUpdate,
    onRemove,
    onUndo, onRedo, canUndo, canRedo, onPreview, busy,
}: PdfPageEditorProps) {
    const surfaceRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const dragRef = useRef<DragState | null>(null)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [preview, setPreview] = useState<{ id: string; x: number; y: number; w?: number; h?: number } | null>(null)
    const [signatureOpen, setSignatureOpen] = useState(false)
    const [zoom, setZoom] = useState(1)
    const [jumpValue, setJumpValue] = useState(String(pageNumber))
    const [surfaceWidth, setSurfaceWidth] = useState(0)
    const [fitWidth, setFitWidth] = useState(0)
    const previewRef = useRef<typeof preview>(null)

    const selected = page.placements.find((item) => item.id === selectedId) ?? null
    const isRotated = page.rotation !== 0 || (render?.baseRotation ?? 0) !== 0
    // ข้อความเก็บขนาดเป็น pt ของหน้าจริง จึงต้องคูณอัตราส่วนก่อนแสดงบนจอ
    const screenScale = render ? (surfaceWidth || render.width) / render.pointWidth : 1

    useEffect(() => {
        const surface = surfaceRef.current
        if (!surface) return
        const observer = new ResizeObserver(([entry]) => setSurfaceWidth(entry.contentRect.width))
        observer.observe(surface)
        return () => observer.disconnect()
    }, [render])

    useEffect(() => {
        const container = containerRef.current
        if (!container || !render) return
        const observer = new ResizeObserver(([entry]) => setFitWidth(Math.min(entry.contentRect.width, render.width)))
        observer.observe(container)
        return () => observer.disconnect()
    }, [render])

    useEffect(() => setSelectedId(null), [page.id])
    useEffect(() => setJumpValue(String(pageNumber)), [pageNumber])

    const commitDrag = useCallback(() => {
        const drag = dragRef.current
        const current = previewRef.current
        dragRef.current = null
        previewRef.current = null
        setPreview(null)
        if (!drag || !current) return
        onUpdate(
            drag.id,
            drag.mode === 'move'
                ? { x: current.x, y: current.y }
                : ({ w: current.w, h: current.h } as Partial<Placement>)
        )
    }, [onUpdate])

    useEffect(() => {
        const onMove = (event: PointerEvent) => {
            const drag = dragRef.current
            const surface = surfaceRef.current
            if (!drag || !surface) return

            const rect = surface.getBoundingClientRect()
            const dx = (event.clientX - drag.pointerX) / rect.width
            const dy = (event.clientY - drag.pointerY) / rect.height

            if (drag.mode === 'move') {
                previewRef.current = {
                    id: drag.id,
                    x: clamp(drag.origin.x + dx, 0, Math.max(0, 1 - drag.origin.w)),
                    y: clamp(drag.origin.y + dy, 0, Math.max(0, 1 - drag.origin.h)),
                }
            } else {
                previewRef.current = {
                    id: drag.id,
                    x: drag.origin.x,
                    y: drag.origin.y,
                    w: clamp(drag.origin.w + dx, 0.03, 1 - drag.origin.x),
                    h: clamp(drag.origin.h + dy, 0.02, 1 - drag.origin.y),
                }
            }
            setPreview(previewRef.current)
        }

        const onUp = () => commitDrag()

        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
        window.addEventListener('pointercancel', onUp)
        return () => {
            window.removeEventListener('pointermove', onMove)
            window.removeEventListener('pointerup', onUp)
            window.removeEventListener('pointercancel', onUp)
        }
    }, [commitDrag])

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null
            if (busy || signatureOpen || target?.closest('[role="dialog"]') || target?.isContentEditable || (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
            const ctrl = event.ctrlKey || event.metaKey
            if (ctrl && event.key.toLowerCase() === 'z') {
                event.preventDefault(); if (event.shiftKey) { if (canRedo) onRedo() } else if (canUndo) onUndo()
            } else if (ctrl && event.key.toLowerCase() === 'y') {
                event.preventDefault(); if (canRedo) onRedo()
            } else if (event.key === 'Escape') setSelectedId(null)
            else if (selected && (event.key === 'Delete' || event.key === 'Backspace')) {
                event.preventDefault(); onRemove(selected.id); setSelectedId(null)
            } else if (selected && ctrl && event.key.toLowerCase() === 'd') {
                event.preventDefault()
                const copy = { ...selected, id: crypto.randomUUID(), x: Math.min(0.8, selected.x + 0.02), y: Math.min(0.8, selected.y + 0.02) }
                onAdd(copy); setSelectedId(copy.id)
            } else if (selected && render && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
                event.preventDefault()
                const step = event.shiftKey ? 10 : 1
                onUpdate(selected.id, {
                    x: clamp(selected.x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0) / render.pointWidth, 0, 1 - (selected.w ?? 0)),
                    y: clamp(selected.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0) / render.pointHeight, 0, 1 - (isBoxPlacement(selected) ? selected.h : 0)),
                })
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [selected, render, busy, signatureOpen, canUndo, canRedo, onUndo, onRedo, onRemove, onUpdate, onAdd])

    const startDrag = (event: React.PointerEvent, item: Placement, mode: 'move' | 'resize') => {
        event.preventDefault()
        event.stopPropagation()
        setSelectedId(item.id)
        dragRef.current = {
            id: item.id,
            mode,
            pointerX: event.clientX,
            pointerY: event.clientY,
            origin: {
                x: item.x,
                y: item.y,
                w: item.w ?? 0,
                h: isBoxPlacement(item) ? item.h : 0,
            },
        }
        previewRef.current = { id: item.id, x: item.x, y: item.y, w: isBoxPlacement(item) ? item.w : undefined, h: isBoxPlacement(item) ? item.h : undefined }
        setPreview(previewRef.current)
    }

    const addText = () => {
        const placement: Placement = {
            id: crypto.randomUUID(),
            kind: 'text',
            x: 0.1,
            y: 0.1,
            w: 0.6,
            text: 'ข้อความ',
            fontSize: DEFAULT_FONT_SIZE,
            color: DEFAULT_COLOR,
        }
        onAdd(placement)
        setSelectedId(placement.id)
    }

    const addHighlight = () => {
        const placement: Placement = {
            id: crypto.randomUUID(),
            kind: 'highlight',
            x: 0.12,
            y: 0.2,
            w: 0.46,
            h: 0.06,
            color: '#fde047',
            opacity: 0.42,
        }
        onAdd(placement)
        setSelectedId(placement.id)
    }

    const addLine = () => {
        const placement: Placement = {
            id: crypto.randomUUID(),
            kind: 'line',
            x: 0.12,
            y: 0.3,
            w: 0.46,
            h: 0.03,
            color: '#dc2626',
            opacity: 0.9,
            strokeWidth: 2,
        }
        onAdd(placement)
        setSelectedId(placement.id)
    }

    const addNote = () => {
        const placement: Placement = {
            id: crypto.randomUUID(),
            kind: 'note',
            x: 0.12,
            y: 0.38,
            w: 0.34,
            h: 0.16,
            text: 'หมายเหตุ',
            fontSize: 12,
            color: '#3f2f00',
        }
        onAdd(placement)
        setSelectedId(placement.id)
    }

    const addImage = (dataUrl: string, naturalRatio: number) => {
        if (!render) return
        const pageRatio = render.pointWidth / render.pointHeight
        const width = Math.min(DEFAULT_IMAGE_WIDTH, 0.8 * naturalRatio / pageRatio)
        const placement: Placement = {
            id: crypto.randomUUID(),
            kind: 'image',
            x: 0.1,
            y: 0.1,
            w: width,
            // คงสัดส่วนรูปเดิมโดยเทียบกับอัตราส่วนของหน้า
            h: (width / naturalRatio) * pageRatio,
            dataUrl,
        }
        onAdd(placement)
        setSelectedId(placement.id)
    }

    const onPickImage = (file: File | undefined) => {
        if (!file) return
        if (!['image/png', 'image/jpeg'].includes(file.type)) { toast.error('รองรับรูป JPG และ PNG เท่านั้น'); return }
        const reader = new FileReader()
        reader.onload = () => {
            const dataUrl = String(reader.result)
            const image = new Image()
            image.onload = () => addImage(dataUrl, image.naturalWidth / image.naturalHeight)
            image.onerror = () => toast.error('เปิดรูปไม่สำเร็จ กรุณาเลือกไฟล์รูปที่สมบูรณ์')
            image.src = dataUrl
        }
        reader.onerror = () => toast.error('อ่านรูปไม่สำเร็จ')
        reader.readAsDataURL(file)
    }

    const rectFor = (item: Placement) => {
        const live = preview?.id === item.id ? preview : null
        const x = live?.x ?? item.x
        const y = live?.y ?? item.y
        if (isBoxPlacement(item)) {
            return { x, y, w: live?.w ?? item.w, h: live?.h ?? item.h }
        }
        return { x, y, w: undefined, h: undefined }
    }

    return (
        <div className="flex h-full flex-col">
            <style>{`@font-face{font-family:'SarabunPdfPreview';src:url('/fonts/Sarabun-Regular.ttf') format('truetype');font-display:swap}`}</style>

            <div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur sm:px-6">
                <Button variant="ghost" size="sm" onClick={onClose} disabled={busy} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    กลับไปหน้ารวม
                </Button>
                <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" aria-label="หน้าก่อนหน้า" onClick={onPrev} disabled={!canGoPrev || busy}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="px-2 text-sm text-muted-foreground">
                        หน้า {pageNumber} / {totalPages}
                    </span>
                    <Input
                        value={jumpValue}
                        onChange={(event) => setJumpValue(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key !== 'Enter') return
                            const target = Math.min(totalPages, Math.max(1, Math.floor(Number(jumpValue)) || pageNumber))
                            setJumpValue(String(target))
                            onJump(target)
                        }}
                        aria-label="ไปยังหน้า"
                        className="h-8 w-14 px-2 text-center text-xs"
                        inputMode="numeric"
                    />
                    <Button variant="outline" size="icon" className="h-8 w-8" aria-label="หน้าถัดไป" onClick={onNext} disabled={!canGoNext || busy}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                {isRotated && (
                    <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                        หน้านี้ถูกหมุนอยู่ — แสดงแบบไม่หมุนเพื่อวางของ ของที่วางจะหมุนไปพร้อมหน้าตอนบันทึก
                    </span>
                )}
                <div className="ml-auto flex items-center gap-1">
                    <Button variant="outline" size="icon" aria-label="ย้อนกลับการแก้ไข" disabled={!canUndo || busy} onClick={onUndo}><Undo2 className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" aria-label="ทำซ้ำการแก้ไข" disabled={!canRedo || busy} onClick={onRedo}><Redo2 className="h-4 w-4" /></Button>
                    <Button size="sm" disabled={busy} onClick={onPreview} className="mr-2 gap-2">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}ตรวจไฟล์</Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setZoom((value) => Math.max(0.5, Math.round((value - 0.25) * 100) / 100))}
                        disabled={zoom <= 0.5}
                        aria-label="ลดขนาดเอกสาร"
                    >
                        <Minus className="h-4 w-4" />
                    </Button>
                    <span className="min-w-14 text-center text-xs tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setZoom((value) => Math.min(2.5, Math.round((value + 0.25) * 100) / 100))}
                        disabled={zoom >= 2.5}
                        aria-label="ขยายเอกสาร"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(1)} aria-label="พอดีความกว้าง">
                        <Scan className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div inert={busy ? true : undefined} className="grid min-h-0 flex-1 grid-cols-1 gap-6 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_300px]">
                <div ref={containerRef} className="min-w-0 overflow-auto">
                    {render ? (
                        <div
                            ref={surfaceRef}
                            onPointerDown={() => setSelectedId(null)}
                            className="relative mx-auto shrink-0 select-none shadow-lg transition-[width]"
                            style={{
                                width: (fitWidth || render.width) * zoom,
                            }}
                        >
                            <img src={render.url} alt={`หน้า ${pageNumber}`} className="block w-full" draggable={false} />

                            {page.placements.map((item) => {
                                const box = rectFor(item)
                                const isSelected = item.id === selectedId
                                return (
                                    <div
                                        key={item.id}
                                        onPointerDown={(event) => startDrag(event, item, 'move')}
                                        className={cn(
                                            'absolute cursor-move',
                                            isSelected ? 'outline outline-2 outline-primary' : 'hover:outline hover:outline-1 hover:outline-primary/50'
                                        )}
                                        style={{
                                            left: `${box.x * 100}%`,
                                            top: `${box.y * 100}%`,
                                            width: isBoxPlacement(item) ? `${(box.w ?? 0) * 100}%` : undefined,
                                            height: isBoxPlacement(item) ? `${(box.h ?? 0) * 100}%` : undefined,
                                            ...(item.kind === 'text' && item.w ? { width: `${item.w * 100}%` } : {}),
                                            ...(item.kind === 'text' && item.rotate
                                                ? {
                                                      transform: `rotate(${item.rotate}deg)`,
                                                      transformOrigin: `${item.w ? (item.align === 'right' ? '100%' : item.align === 'center' ? '50%' : '0%') : '0%'} 0%`,
                                                  }
                                                : {}),
                                        }}
                                    >
                                        {item.kind === 'image' ? (
                                            <img src={item.dataUrl} alt="" className="h-full w-full" draggable={false} />
                                        ) : item.kind === 'text' ? (
                                            <span
                                                className="block whitespace-pre-wrap"
                                                style={{
                                                    fontFamily: "'SarabunPdfPreview', sans-serif",
                                                    fontSize: item.fontSize * screenScale,
                                                    color: item.color,
                                                    opacity: item.opacity ?? 1,
                                                    textAlign: item.w ? item.align ?? 'left' : 'left',
                                                    lineHeight: `${(item.lineHeight ?? item.fontSize * 1.25) * screenScale}px`,
                                                    overflowWrap: 'anywhere',
                                                    whiteSpace: 'pre-wrap',
                                                }}
                                            >
                                                {item.text}
                                            </span>
                                        ) : item.kind === 'highlight' ? (
                                            <div className="h-full w-full" style={{ backgroundColor: item.color, opacity: item.opacity }} />
                                        ) : item.kind === 'line' ? (
                                            <div
                                                className="absolute left-0 top-1/2 w-full -translate-y-1/2"
                                                style={{ height: item.strokeWidth * screenScale, backgroundColor: item.color, opacity: item.opacity }}
                                            />
                                        ) : (
                                            <div
                                                className="h-full w-full overflow-hidden rounded-sm border border-amber-700/70 bg-yellow-200/90 p-1"
                                                style={{
                                                    fontFamily: "'SarabunPdfPreview', sans-serif",
                                                    fontSize: item.fontSize * screenScale,
                                                    lineHeight: `${item.fontSize * 1.25 * screenScale}px`,
                                                    color: item.color,
                                                    overflowWrap: 'anywhere',
                                                    whiteSpace: 'pre-wrap',
                                                }}
                                            >
                                                {item.text}
                                            </div>
                                        )}

                                        {isSelected && isBoxPlacement(item) && (
                                            <span
                                                onPointerDown={(event) => startDrag(event, item, 'resize')}
                                                className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-se-resize rounded-sm border border-background bg-primary"
                                            />
                                        )}
                                    </div>
                                )
                            })}
                            {page.crop && <div className="pointer-events-none absolute inset-0">
                                <div className="absolute inset-x-0 top-0 bg-slate-900/40" style={{ height: `${page.crop.top * 100}%` }} />
                                <div className="absolute inset-x-0 bottom-0 bg-slate-900/40" style={{ height: `${page.crop.bottom * 100}%` }} />
                                <div className="absolute left-0 bg-slate-900/40" style={{ top: `${page.crop.top * 100}%`, bottom: `${page.crop.bottom * 100}%`, width: `${page.crop.left * 100}%` }} />
                                <div className="absolute right-0 bg-slate-900/40" style={{ top: `${page.crop.top * 100}%`, bottom: `${page.crop.bottom * 100}%`, width: `${page.crop.right * 100}%` }} />
                                <div className="absolute border border-dashed border-primary/60" style={{ left: `${page.crop.left * 100}%`, top: `${page.crop.top * 100}%`, width: `${(1 - page.crop.left - page.crop.right) * 100}%`, height: `${(1 - page.crop.top - page.crop.bottom) * 100}%` }} />
                            </div>}
                        </div>
                    ) : (
                        <div className="flex h-64 items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            กำลังเตรียมหน้า…
                        </div>
                    )}
                </div>

                <aside className="space-y-4 overflow-y-auto xl:border-l xl:border-border xl:pl-6">
                    <section className="space-y-2">
                        <h2 className="text-sm font-semibold text-foreground">วางของลงหน้า</h2>
                        <p className="text-xs leading-relaxed text-muted-foreground">เพิ่มข้อความและรูปทับหน้าเดิม ข้อความต้นฉบับใน PDF จะคงอยู่</p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start gap-2"
                            onClick={addText}
                            disabled={!render}
                        >
                            <Type className="h-4 w-4" />
                            เพิ่มข้อความ
                        </Button>
                        <div className="grid grid-cols-3 gap-2">
                            <Button variant="outline" size="sm" className="gap-1 px-2" onClick={addHighlight} disabled={!render}>
                                <Highlighter className="h-3.5 w-3.5" />
                                ไฮไลต์
                            </Button>
                            <Button variant="outline" size="sm" className="gap-1 px-2" onClick={addLine} disabled={!render}>
                                <Slash className="h-3.5 w-3.5" />
                                ขีดเส้น
                            </Button>
                            <Button variant="outline" size="sm" className="gap-1 px-2" onClick={addNote} disabled={!render}>
                                <StickyNote className="h-3.5 w-3.5" />
                                โน้ต
                            </Button>
                        </div>
                        {/* ต้องรอภาพหน้าก่อน เพราะรูปใช้สัดส่วนของหน้าคำนวณความสูงให้ไม่ผิดส่วน */}
                        <label
                            className={cn(
                                'flex w-full items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm transition-colors',
                                render ? 'cursor-pointer hover:bg-muted' : 'cursor-not-allowed opacity-50'
                            )}
                        >
                            <ImagePlus className="h-4 w-4" />
                            เพิ่มรูป
                            <input
                                type="file"
                                accept="image/png,image/jpeg"
                                disabled={!render}
                                className="hidden"
                                onChange={(event) => {
                                    onPickImage(event.target.files?.[0])
                                    event.target.value = ''
                                }}
                            />
                        </label>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start gap-2"
                            onClick={() => setSignatureOpen(true)}
                            disabled={!render}
                        >
                            <PenLine className="h-4 w-4" />
                            เซ็นชื่อ
                        </Button>
                        <p className="text-xs text-muted-foreground">
                            {render ? 'ลากเพื่อย้าย · ลากมุมเพื่อปรับขนาด · ลูกศรขยับละเอียด · Delete ลบสิ่งที่เลือก' : 'รอภาพหน้าโหลดเสร็จก่อนวางของ'}
                        </p>
                    </section>

                    {selected && (
                        <section className="space-y-3 border-t border-border pt-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-foreground">
                                    {selected.kind === 'text'
                                        ? 'ข้อความที่เลือก'
                                        : selected.kind === 'image'
                                          ? 'รูปที่เลือก'
                                          : selected.kind === 'highlight'
                                            ? 'ไฮไลต์ที่เลือก'
                                            : selected.kind === 'line'
                                              ? 'เส้นที่เลือก'
                                              : 'โน้ตที่เลือก'}
                                </h2>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => {
                                        onRemove(selected.id)
                                        setSelectedId(null)
                                    }}
                                    aria-label="ลบของที่เลือก"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>

                            <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => { const copy = { ...selected, id: crypto.randomUUID(), x: Math.min(0.8, selected.x + 0.02), y: Math.min(0.8, selected.y + 0.02) }; onAdd(copy); setSelectedId(copy.id) }}><Copy className="h-4 w-4" />ทำสำเนา (Ctrl+D)</Button>
                            {selected.kind === 'text' && (
                                <>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="placement-text" className="text-xs text-muted-foreground">
                                            ข้อความ
                                        </Label>
                                        <Textarea
                                            id="placement-text"
                                            value={selected.text}
                                            onChange={(event) => onUpdate(selected.id, { text: event.target.value })}
                                            rows={3}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>ขนาดตัวอักษร</span>
                                            <span>{selected.fontSize} pt</span>
                                        </div>
                                        <Slider
                                            value={[selected.fontSize]}
                                            min={6}
                                            max={72}
                                            step={1}
                                            onValueChange={(value) => onUpdate(selected.id, { fontSize: value[0] })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground"><span>ความกว้างกล่องข้อความ</span><span>{Math.round((selected.w ?? 0.6) * 100)}%</span></div>
                                        <Slider value={[Math.round((selected.w ?? 0.6) * 100)]} min={3} max={Math.max(3, Math.floor((1 - selected.x) * 100))} step={1} onValueChange={(value) => onUpdate(selected.id, { w: value[0] / 100 })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="placement-color" className="text-xs text-muted-foreground">
                                            สี
                                        </Label>
                                        <Input
                                            id="placement-color"
                                            type="color"
                                            value={selected.color}
                                            onChange={(event) => onUpdate(selected.id, { color: event.target.value })}
                                            className="h-9 p-1"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <span className="text-xs text-muted-foreground">จัดแนว</span>
                                        <div className="grid grid-cols-3 gap-1">
                                            {(['left', 'center', 'right'] as const).map((align) => (
                                                <Button
                                                    key={align}
                                                    type="button"
                                                    variant={(selected.align ?? 'left') === align ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => onUpdate(selected.id, { align })}
                                                >
                                                    {align === 'left' ? 'ซ้าย' : align === 'center' ? 'กลาง' : 'ขวา'}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {selected.kind === 'image' && (
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>ความกว้าง</span>
                                        <span>{Math.round(selected.w * 100)}%</span>
                                    </div>
                                    <Slider
                                        value={[Math.round(selected.w * 100)]}
                                        min={3}
                                        max={100}
                                        step={1}
                                        onValueChange={(value) => {
                                            const ratio = selected.h / selected.w
                                            const nextWidth = Math.min(value[0] / 100, 1 - selected.x, (1 - selected.y) / ratio)
                                            onUpdate(selected.id, { w: nextWidth, h: nextWidth * ratio })
                                        }}
                                    />
                                </div>
                            )}

                            {selected.kind === 'note' && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="placement-note" className="text-xs text-muted-foreground">
                                        เนื้อหาโน้ต
                                    </Label>
                                    <Textarea
                                        id="placement-note"
                                        value={selected.text}
                                        onChange={(event) => onUpdate(selected.id, { text: event.target.value })}
                                        rows={3}
                                    />
                                </div>
                            )}

                            {(selected.kind === 'highlight' || selected.kind === 'line') && (
                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="placement-shape-color" className="text-xs text-muted-foreground">
                                            สี
                                        </Label>
                                        <Input
                                            id="placement-shape-color"
                                            type="color"
                                            value={selected.color}
                                            onChange={(event) => onUpdate(selected.id, { color: event.target.value })}
                                            className="h-9 p-1"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>ความโปร่งใส</span>
                                            <span>{Math.round(selected.opacity * 100)}%</span>
                                        </div>
                                        <Slider
                                            value={[Math.round(selected.opacity * 100)]}
                                            min={5}
                                            max={100}
                                            step={5}
                                            onValueChange={(value) => onUpdate(selected.id, { opacity: value[0] / 100 })}
                                        />
                                    </div>
                                </div>
                            )}
                        </section>
                    )}

                    {page.placements.length > 0 && (
                        <section className="space-y-2 border-t border-border pt-4">
                            <h2 className="text-sm font-semibold text-foreground">ของบนหน้านี้ ({page.placements.length})</h2>
                            {page.placements.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setSelectedId(item.id)}
                                    className={cn(
                                        'flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition-colors',
                                        item.id === selectedId ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/40'
                                    )}
                                >
                                    {item.kind === 'text' ? (
                                        <Type className="h-4 w-4 shrink-0" />
                                    ) : item.kind === 'image' ? (
                                        <ImagePlus className="h-4 w-4 shrink-0" />
                                    ) : item.kind === 'highlight' ? (
                                        <Highlighter className="h-4 w-4 shrink-0" />
                                    ) : item.kind === 'line' ? (
                                        <Slash className="h-4 w-4 shrink-0" />
                                    ) : (
                                        <StickyNote className="h-4 w-4 shrink-0" />
                                    )}
                                    <span className="truncate">
                                        {item.kind === 'text' || item.kind === 'note'
                                            ? item.text
                                            : item.kind === 'image'
                                              ? 'รูป / ลายเซ็น'
                                              : item.kind === 'highlight'
                                                ? 'ไฮไลต์'
                                                : 'เส้น'}
                                    </span>
                                </button>
                            ))}
                        </section>
                    )}
                </aside>
            </div>

            <Dialog open={signatureOpen} onOpenChange={setSignatureOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>เซ็นชื่อ</DialogTitle>
                        <DialogDescription>วาดลายเซ็น หรือเลือกลายเซ็นที่บันทึกไว้เพื่อวางลงบนหน้า PDF</DialogDescription>
                    </DialogHeader>
                    <SignaturePad
                        onUse={(dataUrl) => {
                            const image = new Image()
                            image.onload = () => addImage(dataUrl, image.naturalWidth / image.naturalHeight)
                            image.src = dataUrl
                            setSignatureOpen(false)
                        }}
                    />
                </DialogContent>
            </Dialog>
        </div>
    )
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max)
}
